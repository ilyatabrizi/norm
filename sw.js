// Offline shell. The card, the fonts, the logo and the two photographs are all
// static, so they are cached on install and served from there. HTML goes to the
// network first, so a redeploy is picked up on the next open.

const VERSION = "norm-v6";
// On localhost every request goes to the network first, so a reload always
// shows the file that was just edited. In production it is cache-first.
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js", "./js/boot.js", "./js/brand.js", "./js/config.js", "./js/data.js",
  "./js/icons.js", "./js/install.js", "./js/motion.js", "./js/presence.js",
  "./js/router.js", "./js/store.js", "./js/ui.js", "./js/util.js",
  "./js/views/account.js", "./js/views/bag.js", "./js/views/checkin.js",
  "./js/views/home.js", "./js/views/item.js", "./js/views/menu.js", "./js/views/order.js",
  "./assets/fonts/jakarta.woff2", "./assets/fonts/instrument-serif.woff2",
  "./assets/photos/street.webp", "./assets/photos/portrait.webp",
  "./assets/photos/street.jpg", "./assets/photos/portrait.jpg",
  "./assets/icons/icon-192.png", "./assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(CORE.map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  if (request.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(request); }
      catch { return (await caches.match("./index.html")) || Response.error(); }
    })());
    return;
  }

  if (DEV) {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) {
      // Refresh in the background so the next open is current.
      fetch(request).then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(request, res));
      }).catch(() => {});
      return hit;
    }
    try {
      const res = await fetch(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch { return Response.error(); }
  })());
});
