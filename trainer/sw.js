// il service worker di Mirion Trainer web app (telefono/crea-trainer-web.mjs), versione 201795827745
const CASSETTO = 'mirion-trainer-201795827745', FILE = ["./","trainer.html","index.html","app.js?v=201795827745","cruscotto.css?v=201795827745","trainer-telefono.css?v=201795827745","trainer-movimento.css?v=201795827745","mirion-trainer.svg","icona-180.png","icona-192.png","icona-512.png","manifest.webmanifest"];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CASSETTO).then((c) => c.addAll(FILE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CASSETTO) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CASSETTO);
    // la pagina: prima la rete (così arriva subito la versione nuova), senza rete la copia. Con la rete lenta (28-11-2026, Marco:
    // «Trainer molto più lenta che Fit») dopo 2,5 secondi si apre la copia e la pagina nuova resta per la volta dopo
    if (e.request.mode === 'navigate') {
      const rete = fetch(e.request).then((r) => { if (r.ok) { c.put('trainer.html', r.clone()); return r; } throw new Error(); });
      const scorta = rete.catch(() => c.match('trainer.html'));
      const lenta = new Promise((ok) => setTimeout(ok, 2500)).then(() => c.match('trainer.html'));
      return (await Promise.race([scorta, lenta.then((x) => x || scorta)])) || Response.error();
    }
    // il codice e i CSS con il codice della versione (?v=…): non cambiano mai, quindi dalla copia, senza aspettare la rete. Una
    // versione nuova ha indirizzi nuovi, che la pagina nuova chiede (27-11-2026: «Il mio Fit» mostrava il codice vecchio: era senza ?v)
    if (u.searchParams.has('v')) { const x = await c.match(e.request); if (x) return x; }
    // il resto prima dalla rete, la copia senza rete
    try { const r = await fetch(e.request); if (r.ok) { c.put(e.request, r.clone()); return r; } } catch { }
    return (await c.match(e.request)) || Response.error();
  })());
});
