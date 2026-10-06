import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const allowedOrigins = new Set([
  "https://tasteapp-eosin.vercel.app",
  "http://localhost:3000",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin)
      ? origin
      : "https://tasteapp-eosin.vercel.app",
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

function serviceHeaders() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
}

type AuthUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown> | null;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(origin, { ok: false, message: "Nepodporovaná metoda." }, 405);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return json(origin, { ok: false, message: "Chybí serverová konfigurace." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(origin, { ok: false, message: "Chybí přihlášení." }, 401);
  }

  try {
    const userResponse = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: {
        apikey: ANON_KEY,
        Authorization: authHeader,
      },
    });

    if (!userResponse.ok) {
      return json(origin, { ok: false, message: "Přihlášení se nepodařilo ověřit." }, 401);
    }

    const user = await userResponse.json() as AuthUser;
    const currentMetadata = user.app_metadata ?? {};

    if (currentMetadata.must_change_password !== true) {
      return json(origin, { ok: true, changed: false });
    }

    const body = await req.json().catch(() => null);
    const password = body?.password;
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return json(origin, { ok: false, message: "Nové heslo musí mít 8 až 128 znaků." }, 400);
    }
    if (!user.email) {
      return json(origin, { ok: false, message: "Účet nemá e-mail pro ověření hesla." }, 400);
    }

    // Admin password updates do not reject an unchanged password. Verify the
    // candidate through Auth first; never infer a mismatch from a network error,
    // CAPTCHA, a rate limit or another Auth failure. No password is persisted here.
    const checkResponse = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });
    const check = await checkResponse.json().catch(() => ({}));
    if (checkResponse.ok) {
      // Discard only this verification session, never the caller's session.
      if (check.access_token) {
        await fetch(SUPABASE_URL + "/auth/v1/logout?scope=local", {
          method: "POST",
          headers: { apikey: ANON_KEY, Authorization: "Bearer " + check.access_token },
        });
      }
      const latestResponse = await fetch(SUPABASE_URL + "/auth/v1/user", {
        headers: { apikey: ANON_KEY, Authorization: authHeader },
      });
      if (!latestResponse.ok) {
        return json(origin, { ok: false, message: "Přihlášení se nepodařilo ověřit." }, 401);
      }
      const latest = await latestResponse.json() as AuthUser;
      // Another copy of this request may have completed while verification ran.
      if (latest.app_metadata?.must_change_password !== true) {
        return json(origin, { ok: true, changed: false });
      }
      return json(origin, { ok: false, message: "Nové heslo musí být jiné než současné heslo." }, 400);
    }
    if (check.error_code !== "invalid_credentials") {
      return json(origin, {
        ok: false,
        message: checkResponse.status === 429
          ? "Příliš mnoho pokusů. Zkus nastavení hesla za chvíli znovu."
          : "Heslo se nepodařilo bezpečně ověřit. Zkus to znovu.",
      }, checkResponse.status === 429 ? 429 : 503);
    }

    const nextMetadata = {
      ...currentMetadata,
      must_change_password: false,
    };

    const updateResponse = await fetch(
      SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(user.id),
      {
        method: "PUT",
        headers: serviceHeaders(),
        // Auth applies these fields in one transaction. A lost response is safe
        // to retry because /user above reads the current server metadata.
        body: JSON.stringify({ password, app_metadata: nextMetadata }),
      },
    );

    if (!updateResponse.ok) {
      const detail = await updateResponse.json().catch(() => ({}));
      if (updateResponse.status >= 400 && updateResponse.status < 500) {
        return json(origin, { ok: false, message: "Heslo nesplňuje požadavky. Zvol jiné heslo o alespoň 8 znacích." }, 400);
      }
      // Do not log Auth response bodies, which may contain user information.
      throw new Error("Auth update failed (" + updateResponse.status + "): " + (detail.error_code ?? "unknown"));
    }

    return json(origin, { ok: true, changed: true });
  } catch (error) {
    console.error("complete-initial-password", error);
    return json(origin, {
      ok: false,
      message: "Dokončení prvního nastavení hesla selhalo.",
    }, 500);
  }
});
