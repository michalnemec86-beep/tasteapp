"use client";
import { createClient } from "@/lib/supabase/client";
import type { NavigationNews } from "./navigation-news";

const STORAGE_KEY = "pivnik-push-device";
export const PUSH_CHANGE = "pivnik-push-change";
type Device = { userId: string; token: string; endpoint: string };
function device(): Device | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return value && typeof value.userId === "string" && typeof value.token === "string" && typeof value.endpoint === "string" ? value : null;
  } catch { return null; }
}
export function supportsPush() {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
export function hasPushDevice(userId: string | null) {
  return Boolean(userId && device()?.userId === userId);
}
async function registration() {
  const registered = await navigator.serviceWorker.getRegistration("/");
  if (registered?.active) return registered;
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Aplikace ještě není připravená. Obnov ji a zkus to znovu.")), 10_000);
    })]);
  } finally { clearTimeout(timer!); }
}
export async function pushRequest(body: Record<string, unknown>) {
  const { data, error } = await createClient().functions.invoke("push-news", { body, signal: AbortSignal.timeout(10_000) });
  if (error || !data?.ok) throw new Error("Oznámení se nepodařilo nastavit. Zkus to znovu.");
  return data as { ok: true; publicKey?: string; enabled?: boolean };
}
async function workerToken(token: string | null) {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg?.active) return;
  const channel = new MessageChannel();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error("Nastavení telefonu se nepodařilo uložit.")); }, 5000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      if (event.data?.ok) resolve(); else reject(new Error("Nastavení telefonu se nepodařilo uložit."));
    };
    reg.active!.postMessage({ type: "pivnik-push-token", token }, [channel.port2]);
  });
}
export async function pushStatus() {
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  const status = await pushRequest({ action: "status", endpoint: sub?.endpoint });
  // Both the server subscription and this browser's explicit opt-in are required.
  return { ...status, enabled: Boolean(status.enabled && device()?.endpoint === sub?.endpoint) };
}
function serverKey(value: string) {
  const bytes = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bytes, letter => letter.charCodeAt(0));
}
export async function enablePush(userId: string, publicKey: string) {
  // The system prompt MUST be called before the first await, directly from a tap.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Oznámení nejsou povolená. Můžeš je povolit v nastavení telefonu.");
  // Renew even an expired provider endpoint, and detach any previous phone owner.
  await disablePush();
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey(publicKey) });
  const token = crypto.randomUUID();
  try {
    await workerToken(token);
    await pushRequest({ action: "subscribe", subscription: sub.toJSON(), token });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, token, endpoint: sub.endpoint }));
  } catch (error) {
    await workerToken(null).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
    throw error;
  }
  window.dispatchEvent(new Event(PUSH_CHANGE));
}
export async function clearAppBadge() {
  try { if (typeof navigator.clearAppBadge === "function") await navigator.clearAppBadge(); } catch { /* optional OS capability */ }
}
export async function disablePush(notifyServer = true) {
  const previous = device();
  // Clear local permission first, including any push already in flight.
  localStorage.removeItem(STORAGE_KEY);
  await workerToken(null).catch(() => undefined);
  await clearAppBadge();
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    if (notifyServer && previous) await pushRequest({ action: "disable", endpoint: previous.endpoint });
    const notifications = await reg?.getNotifications({ tag: "pivnik-news" });
    notifications?.forEach(notification => notification.close());
  }
  window.dispatchEvent(new Event(PUSH_CHANGE));
}
let lastTouch = 0;
let syncing: Promise<void> = Promise.resolve();
let syncGeneration = 0;
export function syncPushNews(userId: string | null, news: NavigationNews | null) {
  const generation = ++syncGeneration;
  // Serialize changes so a slow response cannot restore a previous account's badge.
  syncing = syncing.catch(() => undefined).then(async () => {
    if (generation !== syncGeneration) return;
    const current = device();
    if (!current) { if (!userId) await clearAppBadge(); return; }
    if (current.userId !== userId || typeof Notification === "undefined" || Notification.permission !== "granted") {
      await disablePush(false); return;
    }
    if (!news || news.userId !== userId) return;
    const hasNews = Object.values(news.counts).some(count => count > 0);
    try {
      if (hasNews && typeof navigator.setAppBadge === "function") await navigator.setAppBadge(1);
      else if (!hasNews) {
        await clearAppBadge();
        const reg = await navigator.serviceWorker.getRegistration("/");
        (await reg?.getNotifications({ tag: "pivnik-news" }))?.forEach(notification => notification.close());
      }
    } catch { /* Unsupported badges must not affect normal navigation. */ }
    if (document.visibilityState === "visible" && navigator.onLine && Date.now() - lastTouch >= 60_000) {
      lastTouch = Date.now();
      await pushRequest({ action: "touch", endpoint: current.endpoint }).catch(() => { lastTouch = 0; });
    }
  });
  return syncing;
}
