import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ADMIN_USER_ID = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";
const APP_URL = (Deno.env.get("PIVNIK_SITE_URL") ?? "https://tasteapp-eosin.vercel.app").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

async function getCurrentUser(authHeader: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
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
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Auth users request failed (${response.status}): ${detail}`);
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

    if (body.action !== "invite") {
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
        message: "Tento e-mail už má rozpracovanou registraci. Pozvánku jsem z bezpečnostních důvodů neposlal.",
      });
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

    const inviteResponse = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        redirect_to: `${APP_URL}/auth/update-password`,
      }),
    });

    const invitePayload = await inviteResponse.json().catch(() => ({})) as {
      id?: string;
      msg?: string;
      message?: string;
      error_description?: string;
    };

    if (!inviteResponse.ok) {
      const detail =
        invitePayload.msg ??
        invitePayload.message ??
        invitePayload.error_description ??
        "Supabase pozvánku nepřijal.";

      return json(origin, {
        ok: false,
        message: `Pozvánku se nepodařilo odeslat. ${detail}`,
      });
    }

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
    console.error("admin-invitations", error);
    return json(origin, {
      ok: false,
      message: "Správu pozvánek se nepodařilo dokončit. Zkus to znovu.",
    }, 500);
  }
});
