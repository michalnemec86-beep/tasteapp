export const APP_ORIGIN = "https://tasteapp-eosin.vercel.app";
export const PUSH_TITLE = "Pivník";
export const PUSH_BODY = "V Pivníku jsou novinky";

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
// Do not let a subscriber turn the privileged sender into an arbitrary HTTP client.
export function validSubscription(value: unknown): value is Subscription {
  if (!value || typeof value !== "object") return false;
  const s = value as Subscription;
  try {
    const url = new URL(s.endpoint);
    const allowed = ["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com"];
    return typeof s.endpoint === "string" && s.endpoint.length <= 4096 &&
      url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      allowed.includes(url.hostname) && url.pathname !== "/" &&
      typeof s.keys?.p256dh === "string" && typeof s.keys?.auth === "string" &&
      /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh) && /^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth);
  } catch { return false; }
}
export function validDeviceToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function equalSecret(a: string, b: string) {
  const [left, right] = await Promise.all([a, b].map(value => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
  const l = new Uint8Array(left), r = new Uint8Array(right);
  let different = 0;
  for (let i = 0; i < l.length; i++) different |= l[i] ^ r[i];
  return different === 0;
}
