const CACHE = "japon-e9eaabbfc0";
const CORE = ["./","./index.html","./manifest.json",
  "./fuentes/zenkaku-400.woff2","./fuentes/zenkaku-500.woff2","./fuentes/zenkaku-700.woff2",
  "./fuentes/zenmincho-400.woff2","./fuentes/zenmincho-500.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const mismoOrigen = new URL(req.url).origin === location.origin;

  // Fuentes, fotos e iconos no cambian nunca: caché primero, sin tocar la red.
  const estatico = /\.(woff2|jpg|png|svg|webp)$/.test(new URL(req.url).pathname);
  if (estatico) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // La página: red primero, para que las actualizaciones lleguen solas.
  if (req.mode === "navigate" || mismoOrigen) {
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Cualquier otra cosa: caché primero.
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
      return res;
    }).catch(() => r))
  );
});
