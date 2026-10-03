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

    const nextMetadata = {
      ...currentMetadata,
      must_change_password: false,
    };

    const updateResponse = await fetch(
      SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(user.id),
      {
        method: "PUT",
        headers: serviceHeaders(),
        body: JSON.stringify({ app_metadata: nextMetadata }),
      },
    );

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      throw new Error("Auth update failed (" + updateResponse.status + "): " + detail);
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
