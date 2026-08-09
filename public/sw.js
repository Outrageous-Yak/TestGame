/* Lightweight, base-path-aware service worker for the Hex Layers PWA. */
const CACHE_NAME = "hex-layers-pwa-v1";

function scopeUrl(path = "") {
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([scopeUrl("./"), scopeUrl("manifest.webmanifest")]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const scope = new URL(self.registration.scope);

  // Never intercept requests outside this deployment's own scope.
  if (requestUrl.origin !== scope.origin || !requestUrl.pathname.startsWith(scope.pathname)) return;

  // Navigations are network-first so a newly deployed app is picked up immediately.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(scopeUrl("./"), copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(scopeUrl("./"))) || Response.error())
    );
    return;
  }

  // Same-origin static assets are cache-first; Vite's hashed assets naturally refresh on deploy.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || !response.ok || response.type !== "basic") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
