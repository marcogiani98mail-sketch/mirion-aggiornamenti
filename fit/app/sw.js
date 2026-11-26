// il service worker di Mirion Fit web app (telefono/crea-web.mjs), versione 11
const CASSETTO = 'mirion-fit-11', FILE = ["./","index.html","app.js","stile.css","piatto.css","icona.svg","icona.png","manifest.webmanifest"];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CASSETTO).then((c) => c.addAll(FILE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CASSETTO) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CASSETTO);
    const copia = await c.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
    if (copia) return copia;
    try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }
    catch { return (e.request.mode === 'navigate' && await c.match('index.html')) || Response.error(); }
  })());
});
