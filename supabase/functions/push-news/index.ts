import webpush from "npm:web-push@3.6.7";
import { APP_ORIGIN, PUSH_TITLE, PUSH_BODY, validDeviceToken, validSubscription, equalSecret } from "./shared.ts";

const base = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
const cors = { "Access-Control-Allow-Origin": APP_ORIGIN, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
type Config = { public_key: string; private_key: string; dispatch_token: string };
let cached: { value: Config; until: number } | null = null;
async function rpc(name: string, body = {}) {
  const result = await fetch(`${base}/rest/v1/rpc/${name}`, { method: "POST", headers: serviceHeaders, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
  if (!result.ok) throw new Error("Push database request failed");
  // PostgREST returns HTTP 204 with no body for RETURNS void. The write has
  // already succeeded; trying to parse JSON would falsely report a failure.
  if (result.status === 204) return null;
  const text = await result.text();
  return text ? JSON.parse(text) : null;
}
async function configuration(): Promise<Config> {
  if (cached && cached.until > Date.now()) return cached.value;
  const value = await rpc("push_news_configuration");
  if (!value?.public_key || !value?.private_key || !value?.dispatch_token) throw new Error("Push is not configured");
  cached = { value, until: Date.now() + 300_000 };
  return value;
}
function response(value: unknown, status = 200) { return Response.json(value, { status, headers: cors }); }

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return response({ ok: false }, 405);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return response({ ok: false }, 401);
  try {
    if (Number(request.headers.get("Content-Length")) > 8192) return response({ ok: false }, 413);
    const raw = await request.text();
    if (raw.length > 8192) return response({ ok: false }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return response({ ok: false }, 400); }
    if (!body || typeof body !== "object") return response({ ok: false }, 400);

    if (body.action === "dispatch") {
      const config = await configuration();
      if (!await equalSecret(authorization.slice(7), config.dispatch_token)) return response({ ok: false }, 401);
      const recipients = await rpc("claim_push_news");
      let sent = 0, failed = 0, expired = 0;
      // Daily reservation happens transactionally before network calls. A concurrent
      // job or ambiguous timeout cannot cause a second daily delivery.
      for (let offset = 0; offset < recipients.length; offset += 5) {
        await Promise.all(recipients.slice(offset, offset + 5).map(async (row: any) => {
          const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
          if (!validSubscription(subscription)) { failed++; return; }
          try {
            await webpush.sendNotification(subscription, JSON.stringify({ title: PUSH_TITLE, body: PUSH_BODY, token: row.device_token }), {
              vapidDetails: { subject: APP_ORIGIN, publicKey: config.public_key, privateKey: config.private_key },
              TTL: 3600, urgency: "normal", topic: "pivnik-news", timeout: 10_000,
            });
            await rpc("finish_push_news", { p_id: row.id, p_token: row.device_token, p_claimed_at: row.claimed_at, p_expired: false });
            sent++;
          } catch (error) {
            if ([404, 410].includes((error as { statusCode?: number }).statusCode ?? 0)) {
              await rpc("finish_push_news", { p_id: row.id, p_token: row.device_token, p_claimed_at: row.claimed_at, p_expired: true });
              expired++;
            } else { failed++; }
          }
        }));
      }
      console.log("Pivník push dispatch", { sent, failed, expired });
      return response({ ok: true, sent, failed, expired });
    }

    // User actions always resolve the account from a verified Auth response.
    const auth = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: authorization }, signal: AbortSignal.timeout(10_000) });
    if (!auth.ok) return response({ ok: false }, 401);
    const user = await auth.json();
    if (!user?.id) return response({ ok: false }, 401);
    if (body.action === "status") {
      const config = await configuration();
      const enabled = typeof body.endpoint === "string" && body.endpoint.length <= 4096
        ? await rpc("push_news_status", { p_user_id: user.id, p_endpoint: body.endpoint }) : false;
      return response({ ok: true, publicKey: config.public_key, enabled });
    }
    if (body.action === "subscribe") {
      if (!validSubscription(body.subscription) || !validDeviceToken(body.token)) return response({ ok: false }, 400);
      await rpc("register_push_news", { p_user_id: user.id, p_endpoint: body.subscription.endpoint, p_p256dh: body.subscription.keys.p256dh, p_auth: body.subscription.keys.auth, p_token: body.token });
      return response({ ok: true });
    }
    if (["disable", "touch"].includes(body.action) && typeof body.endpoint === "string" && body.endpoint.length <= 4096) {
      await rpc("manage_push_news", { p_user_id: user.id, p_endpoint: body.endpoint, p_disable: body.action === "disable" });
      return response({ ok: true });
    }
    return response({ ok: false }, 400);
  } catch {
    // Do not log endpoints, encryption keys, bearer tokens or provider error bodies.
    console.error("Pivník push request failed");
    return response({ ok: false, message: "Oznámení se nepodařilo nastavit. Zkus to znovu." }, 503);
  }
});
