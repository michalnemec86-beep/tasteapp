import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const APP_URL = (Deno.env.get("PIVNIK_SITE_URL") ?? "https://tasteapp-eosin.vercel.app").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
}

function redirectError(message: string) {
  return Response.redirect(
    APP_URL + "/auth/error?error=" + encodeURIComponent(message),
    303,
  );
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

type InviteLinkRow = {
  id: string;
  email: string;
  auth_token_hash: string;
  auth_user_id: string | null;
  expires_at: string;
  revoked_at: string | null;
  open_count: number;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return redirectError("Pozvánku se nepodařilo ověřit kvůli serverové konfiguraci.");
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let token = "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      token = String(form.get("token") ?? "").trim();
    } else {
      const body = await req.json().catch(() => ({})) as { token?: string };
      token = (body.token ?? "").trim();
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return redirectError("Tato pozvánka není platná.");
    }

    const tokenHash = await sha256Hex(token);
    const lookupResponse = await fetch(
      SUPABASE_URL +
        "/rest/v1/admin_invite_links?select=id,email,auth_token_hash,auth_user_id,expires_at,revoked_at,open_count&token_hash=eq." +
        tokenHash +
        "&limit=1",
      {
        headers: serviceHeaders(),
      },
    );

    if (!lookupResponse.ok) {
      const detail = await lookupResponse.text();
      throw new Error("Invite lookup failed (" + lookupResponse.status + "): " + detail);
    }

    const rows = await lookupResponse.json() as InviteLinkRow[];
    const invite = rows[0];

    if (!invite) {
      return redirectError("Tato pozvánka neexistuje nebo už byla nahrazena.");
    }

    if (invite.revoked_at) {
      return redirectError("Tato pozvánka už byla nahrazena novější verzí.");
    }

    const expiresAt = Date.parse(invite.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return redirectError("Platnost této pozvánky vypršela. Požádej správce o nový QR kód.");
    }

    if (invite.auth_user_id) {
      const userResponse = await fetch(
        SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(invite.auth_user_id),
        { headers: serviceHeaders() },
      );

      if (userResponse.ok) {
        const user = await userResponse.json() as {
          email_confirmed_at?: string | null;
          confirmed_at?: string | null;
        };
        if (user.email_confirmed_at || user.confirmed_at) {
          return redirectError("Tato pozvánka už byla přijata.");
        }
      }
    }

    await fetch(
      SUPABASE_URL + "/rest/v1/admin_invite_links?id=eq." + encodeURIComponent(invite.id),
      {
        method: "PATCH",
        headers: serviceHeaders(),
        body: JSON.stringify({
          last_opened_at: new Date().toISOString(),
          open_count: Math.max(0, Number(invite.open_count) || 0) + 1,
        }),
      },
    );

    const confirmUrl =
      APP_URL +
      "/auth/confirm?token_hash=" +
      encodeURIComponent(invite.auth_token_hash) +
      "&type=invite&next=" +
      encodeURIComponent("/auth/update-password");

    return Response.redirect(confirmUrl, 303);
  } catch (error) {
    console.error("redeem-invitation", error);
    return redirectError("Pozvánku se nepodařilo ověřit. Zkus to prosím znovu.");
  }
});
