// il service worker di Mirion Trainer web app (telefono/crea-trainer-web.mjs), versione 201795821784
const CASSETTO = 'mirion-trainer-201795821784', FILE = ["./","trainer.html","index.html","app.js?v=201795821784","cruscotto.css","trainer-telefono.css","mirion-trainer.svg","icona-180.png","icona-192.png","icona-512.png","manifest.webmanifest"];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CASSETTO).then((c) => c.addAll(FILE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CASSETTO) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CASSETTO);
    // la pagina: prima la rete (così arriva subito la versione nuova), senza rete la copia
    if (e.request.mode === 'navigate') { try { const r = await fetch(e.request); if (r.ok) return r; } catch { } return (await c.match('trainer.html')) || Response.error(); }
    // anche il codice prima dalla rete (27-11-2026: «Il mio Fit» mostrava ancora la pagina di mezzo col codice vecchio), la copia senza rete
    try { const r = await fetch(e.request); if (r.ok) { c.put(e.request, r.clone()); return r; } } catch { }
    return (await c.match(e.request)) || Response.error();
  })());
});
