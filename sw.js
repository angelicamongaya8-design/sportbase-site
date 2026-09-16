/* service worker */

const CACHE = "sportbase-shell-v4";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* documents */
  const isDocument = req.mode === "navigate" || req.destination === "document" || url.pathname.endsWith(".html") || url.pathname.endsWith(".webmanifest");

  /* assets */
  const hit = isDocument
    ? fetch(req, { cache: "reload" })
    : fetch(req, { cache: "no-cache" });

  event.respondWith(
    hit
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./app.html") || caches.match("./index.html"))
      )
  );
});
