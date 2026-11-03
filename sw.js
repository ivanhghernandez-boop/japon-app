const CACHE = "japon-bcf3bf7459";
const GUARDADO = "japon-offline";          // no se borra al actualizar
const CORE = ["./","./index.html","./manifest.json",
  "./fuentes/zenkaku-400.woff2","./fuentes/zenkaku-500.woff2","./fuentes/zenkaku-700.woff2",
  "./fuentes/zenmincho-400.woff2","./fuentes/zenmincho-500.woff2",
  "./icon-180.png","./icon-512.png"];

// Uno por uno y tolerando fallos: con addAll, si un solo archivo falla
// (cosa normal con datos móviles flojos) la instalación entera se cae y no
// queda nada en caché.
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks
      .filter(k => k !== CACHE && k !== GUARDADO)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function guardar(req, res) {
  if (res && res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Todo lo de la app se sirve del caché primero y se revalida por detrás.
  // Así abre al instante y funciona sin señal, que es el caso del viaje.
  e.respondWith(
    caches.match(req).then(cacheada => {
      const red = fetch(req).then(res => guardar(req, res)).catch(() => null);
      if (cacheada) { e.waitUntil(red); return cacheada; }
      return red.then(res => res || caches.match("./index.html"));
    })
  );
});

// Descarga completa a petición de la página, para dejarla lista antes del viaje.
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.tipo !== "guardar" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const c = await caches.open(GUARDADO);
    let hechas = 0, fallos = 0;
    for (const u of d.urls) {
      try { if (!(await c.match(u))) await c.add(u); hechas++; }
      catch (_) { fallos++; }
      if (e.source) e.source.postMessage({tipo:"avance", hechas, fallos, total:d.urls.length});
    }
    if (e.source) e.source.postMessage({tipo:"listo", hechas, fallos, total:d.urls.length});
  })());
});
