/* SportBase service worker.

   Its job is modest on purpose: make the browser treat this as an app so it
   can be installed, and keep a copy of what has been fetched so a dead
   signal at the venue does not mean a blank screen.

   Network first, always - a stale price or a stale free hour is worse than
   a slow page. Pages themselves are fetched with the HTTP cache bypassed,
   because GitHub Pages tells browsers to keep the HTML for ten minutes and
   a phone will happily show yesterday's build for as long as it is allowed
   to. The cache here is the offline fallback, never the first answer. */

const CACHE = "sportbase-shell-v3";

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

  /* A page, or the manifest that describes it, must be the current one. */
  const isDocument = req.mode === "navigate" || req.destination === "document" || url.pathname.endsWith(".html") || url.pathname.endsWith(".webmanifest");

  /* Everything else was fetched with the HTTP cache left alone, and GitHub
     Pages tells a browser it may keep an asset for ten minutes - so a
     screenshot replaced upstream kept showing the old one long after the
     page around it had changed. "no-cache" is not "no cache": it asks the
     server whether the copy is still current, and a 304 costs nothing. The
     document still gets "reload", which skips even that question. */
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
