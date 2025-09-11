
const CACHE = "posturally-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./privacy.html",
  "./js/script.js",
  "./js/onboarding.js",
  "./js/pip-overlay.js",
  "./js/pip-status.js",
  "./js/sensitivity.js",
  "./js/pip-compat.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (ASSETS.includes(url.pathname) || url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request))
    );
  }
});
