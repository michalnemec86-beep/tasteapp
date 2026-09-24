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
  app_metadata?: Record<string, unknown> | null;
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
    .filter((user) => {
      const confirmedAt = user.email_confirmed_at ?? user.confirmed_at ?? null;
      const manualPending =
        user.app_metadata?.registration_method === "admin_password" &&
        user.app_metadata?.must_change_password === true &&
        !user.last_sign_in_at;
      const qrPending = Boolean(user.invited_at) && !confirmedAt && !user.last_sign_in_at;
      return manualPending || qrPending;
    })
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      invitedAt: user.invited_at ?? null,
      confirmationSentAt: user.confirmation_sent_at ?? null,
      createdAt: user.created_at ?? null,
      registrationMethod:
        user.app_metadata?.registration_method === "admin_password"
          ? "admin_password"
          : "qr",
    }))
    .sort((a, b) => {
      const left = Date.parse(a.invitedAt ?? a.createdAt ?? "") || 0;
      const right = Date.parse(b.invitedAt ?? b.createdAt ?? "") || 0;
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

async function createPasswordAccount(email: string, password: string, existing: AuthUser | undefined) {
  const appMetadata = {
    ...(existing?.app_metadata ?? {}),
    must_change_password: true,
    registration_method: "admin_password",
  };

  let response: Response;
  if (existing) {
    response = await fetch(
      SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(existing.id),
      {
        method: "PUT",
        headers: serviceHeaders(),
        body: JSON.stringify({
          password,
          email_confirm: true,
          app_metadata: appMetadata,
        }),
      },
    );
  } else {
    response = await fetch(
      SUPABASE_URL + "/auth/v1/admin/users",
      {
        method: "POST",
        headers: serviceHeaders(),
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          app_metadata: appMetadata,
        }),
      },
    );
  }

  const payload = await response.json().catch(() => ({})) as GenerateLinkPayload;
  if (!response.ok || !payload.id) {
    const detail =
      payload.msg ??
      payload.message ??
      payload.error_description ??
      "Supabase účet nevytvořil.";
    throw new Error(detail);
  }

  await revokeExistingQrLinks(email);

  return {
    id: payload.id,
    email: payload.email ?? email,
  };
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
      password?: string;
      userId?: string;
    };

    if (body.action === "list") {
      const users = await listAuthUsers();
      return json(origin, { ok: true, invitations: invitationRows(users) });
    }

    if (body.action === "cancel") {
      const userId = (body.userId ?? "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(userId)) {
        return json(origin, { ok: false, message: "Neplatný identifikátor pozvánky." }, 400);
      }

      const users = await listAuthUsers();
      const target = users.find((user) => user.id === userId);

      if (!target) {
        return json(origin, { ok: true, message: "Pozvánka už neexistuje." });
      }

      const confirmedAt = target.email_confirmed_at ?? target.confirmed_at ?? null;
      const manualPending =
        target.app_metadata?.registration_method === "admin_password" &&
        target.app_metadata?.must_change_password === true &&
        !target.last_sign_in_at;
      const qrPending =
        Boolean(target.invited_at) &&
        !confirmedAt &&
        !target.last_sign_in_at;

      if (!manualPending && !qrPending) {
        return json(origin, {
          ok: false,
          message: "Tento účet už není čekající registrace. Přes správu registrací ho nelze zrušit.",
        }, 409);
      }

      const dataChecks = [
        ["tastings", "user_id"],
        ["user_achievements", "user_id"],
        ["catalog_events", "actor_user_id"],
        ["beer_versions", "created_by"],
        ["brewery_brands", "created_by"],
      ] as const;

      for (const [table, column] of dataChecks) {
        const checkResponse = await fetch(
          SUPABASE_URL +
            "/rest/v1/" + table +
            "?select=id&" + column + "=eq." + encodeURIComponent(target.id) +
            "&limit=1",
          { headers: serviceHeaders() },
        );

        if (!checkResponse.ok) {
          const detail = await checkResponse.text();
          throw new Error("Data safety check failed for " + table + " (" + checkResponse.status + "): " + detail);
        }

        const rows = await checkResponse.json() as Array<{ id?: unknown }>;
        if (rows.length > 0) {
          return json(origin, {
            ok: false,
            message: "Registraci nelze zrušit, protože už má navázaná data v Pivníku.",
          }, 409);
        }
      }

      const beerCheck = await fetch(
        SUPABASE_URL +
          "/rest/v1/beers?select=id&or=(created_by.eq." +
          encodeURIComponent(target.id) +
          ",catalog_confirmed_by.eq." +
          encodeURIComponent(target.id) +
          ")&limit=1",
        { headers: serviceHeaders() },
      );

      if (!beerCheck.ok) {
        const detail = await beerCheck.text();
        throw new Error("Data safety check failed for beers (" + beerCheck.status + "): " + detail);
      }

      const linkedBeers = await beerCheck.json() as Array<{ id?: unknown }>;
      if (linkedBeers.length > 0) {
        return json(origin, {
          ok: false,
          message: "Registraci nelze zrušit, protože už má navázaná katalogová data v Pivníku.",
        }, 409);
      }

      const deleteResponse = await fetch(
        SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(target.id),
        {
          method: "DELETE",
          headers: serviceHeaders(),
        },
      );

      if (!deleteResponse.ok) {
        const detail = await deleteResponse.text();
        throw new Error("Auth delete failed (" + deleteResponse.status + "): " + detail);
      }

      if (target.email) {
        try {
          await revokeExistingQrLinks(target.email.toLowerCase());
        } catch (revokeError) {
          console.error("cancel invitation QR cleanup", revokeError);
        }
      }

      return json(origin, {
        ok: true,
        message: "Pozvánka byla zrušena. Starý QR kód ani původní invite odkaz už nejsou platnou cestou k účtu.",
      });
    }

    if (body.action !== "qr" && body.action !== "create_account") {
      return json(origin, { ok: false, message: "Neplatná akce." }, 400);
    }

    const email = (body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(origin, { ok: false, message: "Zadej platnou e-mailovou adresu." }, 400);
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
      }, 409);
    }

    if (body.action === "qr") {
      if (existing && !existing.invited_at) {
        return json(origin, {
          ok: false,
          message: "Tento e-mail už má rozpracovanou registraci jiným způsobem. QR pozvánku jsem z bezpečnostních důvodů nevytvořil.",
        }, 409);
      }

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

    const password = body.password ?? "";
    if (password.length < 10 || password.length > 128) {
      return json(origin, {
        ok: false,
        message: "Dočasné heslo musí mít 10 až 128 znaků.",
      }, 400);
    }

    if (existing && !existing.invited_at) {
      return json(origin, {
        ok: false,
        message: "Tento e-mail už má rozpracovanou registraci jiným způsobem. Účet jsem nepřepsal.",
      }, 409);
    }

    try {
      const account = await createPasswordAccount(email, password, existing);
      return json(origin, {
        ok: true,
        message: existing
          ? "Čekající QR registrace byla převedena na účet s dočasným heslem."
          : "Účet byl vytvořen. Uživatel si při prvním přihlášení musí nastavit vlastní heslo.",
        account,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Supabase účet nevytvořil.";
      return json(origin, {
        ok: false,
        message: "Účet se nepodařilo vytvořit. " + detail,
      }, 400);
    }
  } catch (error) {
    console.error("admin-invitations", error);
    return json(origin, {
      ok: false,
      message: "Správu registrací se nepodařilo dokončit. Zkus to znovu.",
    }, 500);
  }
});
