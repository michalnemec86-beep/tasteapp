import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import QRCode from "npm:qrcode@1.5.4";

const ADMIN_USER_ID = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";
const APP_URL = (Deno.env.get("PIVNIK_SITE_URL") ?? "https://tasteapp-eosin.vercel.app").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const QR_TTL_MS = 30 * 60 * 1000;

const allowedOrigins = new Set([
  "https://tasteapp-eosin.vercel.app",
  "http://localhost:3000",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : "https://tasteapp-eosin.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
}

type AuthUser = {
  id: string;
  email?: string | null;
  invited_at?: string | null;
  confirmation_sent_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
};

type GenerateLinkPayload = AuthUser & {
  action_link?: string;
  hashed_token?: string;
  verification_type?: string;
  redirect_to?: string;
  msg?: string;
  message?: string;
  error_description?: string;
};

async function getCurrentUser(authHeader: string) {
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: {
      apikey: ANON_KEY,
      Authorization: authHeader,
    },
  });

  if (!response.ok) return null;
  return await response.json() as AuthUser;
}

async function listAuthUsers() {
  const users: AuthUser[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      SUPABASE_URL + "/auth/v1/admin/users?page=" + page + "&per_page=100",
      { headers: serviceHeaders() },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error("Auth users request failed (" + response.status + "): " + detail);
    }

    const payload = await response.json() as { users?: AuthUser[] };
    const pageUsers = Array.isArray(payload.users) ? payload.users : [];
    users.push(...pageUsers);

    if (pageUsers.length < 100) break;
  }

  return users;
}

function invitationRows(users: AuthUser[]) {
  return users
    .filter((user) => Boolean(user.invited_at))
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      invitedAt: user.invited_at ?? null,
      confirmationSentAt: user.confirmation_sent_at ?? null,
      confirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? null,
    }))
    .sort((a, b) => {
      const left = a.invitedAt ? Date.parse(a.invitedAt) : 0;
      const right = b.invitedAt ? Date.parse(b.invitedAt) : 0;
      return right - left;
    });
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function revokeExistingQrLinks(email: string) {
  const response = await fetch(
    SUPABASE_URL +
      "/rest/v1/admin_invite_links?email=eq." +
      encodeURIComponent(email) +
      "&revoked_at=is.null",
    {
      method: "PATCH",
      headers: serviceHeaders(),
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error("QR revoke failed (" + response.status + "): " + detail);
  }
}

async function createQrInvitation(email: string, createdBy: string) {
  const linkResponse = await fetch(SUPABASE_URL + "/auth/v1/admin/generate_link", {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      type: "invite",
      email,
      redirect_to: APP_URL + "/auth/update-password",
    }),
  });

  const linkPayload = await linkResponse.json().catch(() => ({})) as GenerateLinkPayload;

  if (!linkResponse.ok || !linkPayload.hashed_token) {
    const detail =
      linkPayload.msg ??
      linkPayload.message ??
      linkPayload.error_description ??
      "Supabase nevytvořil pozvánkový token.";
    throw new Error(detail);
  }

  await revokeExistingQrLinks(email);

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + QR_TTL_MS).toISOString();

  const insertResponse = await fetch(
    SUPABASE_URL + "/rest/v1/admin_invite_links",
    {
      method: "POST",
      headers: serviceHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify({
        email,
        token_hash: tokenHash,
        auth_token_hash: linkPayload.hashed_token,
        auth_user_id: linkPayload.id ?? null,
        created_by: createdBy,
        expires_at: expiresAt,
      }),
    },
  );

  const inserted = await insertResponse.json().catch(() => []) as Array<{ id?: string }>;
  if (!insertResponse.ok || !inserted[0]?.id) {
    const detail = Array.isArray(inserted) ? JSON.stringify(inserted) : String(inserted);
    throw new Error("Uložení QR pozvánky selhalo: " + detail);
  }

  const url = APP_URL + "/pozvanka/" + token;
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });

  return {
    id: inserted[0].id,
    email,
    url,
    qrSvg,
    expiresAt,
  };
}

async function sendEmailInvitation(email: string) {
  const inviteResponse = await fetch(SUPABASE_URL + "/auth/v1/invite", {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      email,
      redirect_to: APP_URL + "/auth/update-password",
    }),
  });

  const invitePayload = await inviteResponse.json().catch(() => ({})) as GenerateLinkPayload;
  if (!inviteResponse.ok) {
    const detail =
      invitePayload.msg ??
      invitePayload.message ??
      invitePayload.error_description ??
      "Supabase pozvánku nepřijal.";
    throw new Error(detail);
  }

  return invitePayload;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    if (origin && !allowedOrigins.has(origin)) {
      return new Response(null, { status: 403, headers: corsHeaders(origin) });
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(origin, { ok: false, message: "Nepodporovaná metoda." }, 405);
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json(origin, { ok: false, message: "Nepovolený původ požadavku." }, 403);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return json(origin, { ok: false, message: "Chybí serverová konfigurace." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(origin, { ok: false, message: "Chybí přihlášení." }, 401);
  }

  try {
    const currentUser = await getCurrentUser(authHeader);
    if (!currentUser || currentUser.id !== ADMIN_USER_ID) {
      return json(origin, { ok: false, message: "Tato funkce je dostupná pouze správci." }, 403);
    }

    const body = await req.json().catch(() => ({})) as {
      action?: string;
      email?: string;
    };

    if (body.action === "list") {
      const users = await listAuthUsers();
      return json(origin, { ok: true, invitations: invitationRows(users) });
    }

    if (body.action !== "invite" && body.action !== "qr") {
      return json(origin, { ok: false, message: "Neplatná akce." });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(origin, { ok: false, message: "Zadej platnou e-mailovou adresu." });
    }

    const users = await listAuthUsers();
    const existing = users.find(
      (user) => (user.email ?? "").toLowerCase() === email,
    );

    const confirmedAt = existing?.email_confirmed_at ?? existing?.confirmed_at ?? null;
    if (existing && confirmedAt) {
      return json(origin, {
        ok: false,
        message: "Tento e-mail už má aktivní účet v Pivníku.",
      });
    }

    if (existing && !existing.invited_at) {
      return json(origin, {
        ok: false,
        message: "Tento e-mail už má rozpracovanou registraci jiným způsobem. Pozvánku jsem z bezpečnostních důvodů nevytvořil.",
      });
    }

    if (body.action === "qr") {
      try {
        const invitation = await createQrInvitation(email, currentUser.id);
        return json(origin, {
          ok: true,
          message: existing
            ? "Vytvořil jsem nový QR kód. Předchozí QR pozvánka pro tento e-mail už neplatí."
            : "QR pozvánka je připravená.",
          invitation,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Neznámá chyba.";
        return json(origin, {
          ok: false,
          message: "QR pozvánku se nepodařilo vytvořit. " + detail,
        }, 400);
      }
    }

    if (existing?.confirmation_sent_at) {
      const sentAt = Date.parse(existing.confirmation_sent_at);
      if (Number.isFinite(sentAt) && Date.now() - sentAt < 60_000) {
        return json(origin, {
          ok: false,
          message: "Pozvánka byla odeslána před méně než minutou. Chvíli počkej a pak to zkus znovu.",
        });
      }
    }

    try {
      const invitePayload = await sendEmailInvitation(email);
      return json(origin, {
        ok: true,
        message: existing
          ? "Pozvánka byla odeslána znovu."
          : "Pozvánka byla odeslána.",
        invitation: {
          id: invitePayload.id ?? existing?.id ?? "",
          email,
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Supabase pozvánku nepřijal.";
      return json(origin, {
        ok: false,
        message: "Pozvánku se nepodařilo odeslat. " + detail,
      }, 400);
    }
  } catch (error) {
    console.error("admin-invitations", error);
    return json(origin, {
      ok: false,
      message: "Správu pozvánek se nepodařilo dokončit. Zkus to znovu.",
    }, 500);
  }
});
