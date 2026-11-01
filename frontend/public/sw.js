/* NutriMess service worker: offline shell + light caching.
 * - Page navigations: network first, offline.html fallback (pages are
 *   per-user and server-rendered, so they're never cached).
 * - /_next/static and /icons: cache first (content-hashed / immutable).
 * - Everything cross-origin (Supabase, FastAPI) and non-GET: untouched. */

const VERSION = "v1";
const SHELL_CACHE = `nutrimess-shell-${VERSION}`;
const STATIC_CACHE = `nutrimess-static-${VERSION}`;
const SHELL = ["/offline.html", "/icons/icon-192.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("nutrimess-") && ![SHELL_CACHE, STATIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
