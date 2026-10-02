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
