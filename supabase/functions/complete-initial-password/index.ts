import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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
  if (req.method !== "POST") {
    return json({ ok: false, message: "Nepodporovaná metoda." }, 405);
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ ok: false, message: "Chybí serverová konfigurace." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, message: "Chybí přihlášení." }, 401);
  }

  try {
    const userResponse = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: {
        apikey: ANON_KEY,
        Authorization: authHeader,
      },
    });

    if (!userResponse.ok) {
      return json({ ok: false, message: "Přihlášení se nepodařilo ověřit." }, 401);
    }

    const user = await userResponse.json() as AuthUser;
    const currentMetadata = user.app_metadata ?? {};

    if (currentMetadata.must_change_password !== true) {
      return json({ ok: true, changed: false });
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

    return json({ ok: true, changed: true });
  } catch (error) {
    console.error("complete-initial-password", error);
    return json({
      ok: false,
      message: "Dokončení prvního nastavení hesla selhalo.",
    }, 500);
  }
});
