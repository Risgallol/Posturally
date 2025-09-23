
const CACHE = "posturally-v2025-09-23";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./privacy.html",
  "./js/sensitivity.js"
];

self.addEventListener("activate", (e) => {
  const keep = [CACHE];
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (keep.includes(k) ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Always go network-first for HTML navigations
  const isHTML = req.mode === "navigate" ||
                 (req.destination === "document") ||
                 (url.pathname.endsWith(".html"));

  if (isHTML) {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // For same-origin assets: stale-while-revalidate
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
          return r;
        }).catch(()=>cached);
        return cached || net;
      })
    );
  }
});

