/* Only public installation assets are stored. HTML, RSC, APIs, auth and writes always use the network. */
const CACHE_NAME = "pivnik-shell-v1";
const PUBLIC_ASSETS = ["/offline.html", "/offline.js", "/pwa-icon/180.png", "/pwa-icon/192.png", "/pwa-icon/512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith("pivnik-shell-") && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match("/offline.html")) || Response.error();
    }));
    return;
  }

  // Exact allowlist prevents a cache of account pages, tokens or personalized images.
  if (url.search || !PUBLIC_ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type !== "opaque") await cache.put(url.pathname, response.clone());
    return response;
  }));
});

// Only an opaque device consent token is stored here, never an account/page/session.
function pushToken(next) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pivnik-push", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("settings", next === undefined ? "readonly" : "readwrite");
      const store = transaction.objectStore("settings");
      const operation = next === undefined ? store.get("token") : next === null ? store.delete("token") : store.put(next, "token");
      let result;
      operation.onsuccess = () => { result = operation.result; };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  });
}
self.addEventListener("message", event => {
  if (event.data?.type !== "pivnik-push-token") return;
  try { if (new URL(event.source.url).origin !== self.location.origin) return; } catch { return; }
  const token = event.data.token;
  if (token !== null && (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token))) return;
  event.waitUntil(pushToken(token).then(() => event.ports[0]?.postMessage({ ok: true }), () => event.ports[0]?.postMessage({ ok: false })));
});
self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    // Do not resurrect a logged-out, disabled or replaced device subscription.
    if (!payload?.token || payload.token !== await pushToken()) return;
    await self.registration.showNotification("Pivník", {
      body: "V Pivníku jsou novinky", tag: "pivnik-news",
      icon: "/pwa-icon/192.png", badge: "/pwa-icon/192.png",
      data: { path: "/activity" },
    });
    // Android uses the pending notification. iOS can additionally badge its icon.
    try { if (typeof self.navigator?.setAppBadge === "function") await self.navigator.setAppBadge(1); } catch { /* optional */ }
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL("/activity", self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      const navigated = await client.navigate(target);
      if (navigated) { await navigated.focus(); return; }
    }
    await self.clients.openWindow(target);
  })());
});
