// Offline shell.
//
// The fonts, the logo and the photographs never change without changing name, so
// they are cached on install and served from there. **Everything the app is made
// of — the HTML, the CSS and every module — goes to the network first**, because
// a redeploy changes all three together and half a build is worse than an old
// one: v6 moved the bag into the tab bar, so a v5 app.js against a v6 shell looks
// for controls that are not there.
//
// Network-first costs one conditional request per file on a warm start and
// nothing at all offline, where the cache answers.

const VERSION = "norm-v8";
// On localhost every request goes to the network first, so a reload always
// shows the file that was just edited. In production it is cache-first.
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js", "./js/boot.js", "./js/brand.js", "./js/config.js", "./js/data.js",
  "./js/icons.js", "./js/install.js", "./js/motion.js", "./js/presence.js",
  "./js/router.js", "./js/rows.js", "./js/store.js", "./js/ui.js", "./js/util.js",
  "./js/views/account.js", "./js/views/bag.js", "./js/views/checkin.js",
  "./js/views/home.js", "./js/views/menu.js", "./js/views/order.js",
  "./assets/fonts/jakarta.woff2", "./assets/fonts/instrument-serif.woff2",
  "./assets/photos/hero.webp", "./assets/photos/street.webp",
  "./assets/photos/portrait.webp", "./assets/photos/hero.jpg",
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

  // `cache: "reload"` matters as much as the order does. A plain fetch() inside a
  // worker still reads the browser's own HTTP cache, and GitHub Pages serves HTML
  // with max-age=600 — so "network first" would quietly hand back a ten-minute-old
  // shell. This asks the server every time and revalidates properly.
  const fromNetwork = (req) => fetch(new Request(req, { cache: "reload" }));

  const networkFirst = async () => {
    try {
      const res = await fromNetwork(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch {
      const hit = (await caches.match(request))
        || (request.mode === "navigate" ? await caches.match("./index.html") : null);
      return hit || Response.error();
    }
  };

  // The shell and the code it runs. Never served from cache while a network exists.
  const path = new URL(request.url).pathname;
  if (request.mode === "navigate" || DEV || /\.(?:html|css|js|webmanifest)$/.test(path)) {
    e.respondWith(networkFirst());
    return;
  }

  // Fonts, photographs, icons: content that changes name when it changes at all.
  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    try {
      const res = await fetch(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch { return Response.error(); }
  })());
});
