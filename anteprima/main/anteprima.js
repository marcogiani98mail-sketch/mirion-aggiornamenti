// L'anteprima web di Mirion: al posto del server, le risposte registrate da anteprima/costruisci.mjs (dati di esempio-vault).
// Si legge, si gira fra le stanze, si aprono le finestre; quello che si salva non resta (lo dice un avviso, una volta).
(() => {
  const A = window.MIRION_ANTEPRIMA ?? { info: {}, risposte: {} }, R = A.risposte
  const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const trova = u => {
    if (u.pathname + u.search in R) return R[u.pathname + u.search]
    if (u.pathname in R) return R[u.pathname]
    const k = Object.keys(R).find(k => k.startsWith(u.pathname + '?')) // la stessa domanda con altri parametri
    return k ? R[k] : undefined
  }
  // l'avviso solo dopo un tuo clic o tasto (alcune stanze salvano da sole, aprendosi: lì non serve dirlo)
  let avvisato = false, tocco = 0
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, () => { tocco = Date.now() }, true)
  const avvisa = () => {
    if (avvisato || Date.now() - tocco > 3000) return; avvisato = true
    const d = document.createElement('div'); d.className = 'anteprima-avviso'
    d.textContent = 'Anteprima: qui le modifiche non si salvano.'
    document.body.append(d); setTimeout(() => d.remove(), 3500)
  }
  const vero = window.fetch.bind(window)
  window.fetch = async (input, init = {}) => {
    const u = new URL(typeof input === 'string' ? input : input.url, location.href)
    if (u.origin !== location.origin || !u.pathname.startsWith('/api/')) return vero(input, init)
    const metodo = (init.method ?? (typeof input === 'string' ? 'GET' : input.method) ?? 'GET').toUpperCase()
    if (metodo === 'GET') {
      const d = trova(u)
      if (d === undefined) return json({ errore: 'questa parte non c’è nell’anteprima' }, 404)
      return d?.__file ? vero(d.__file) : d?.__stato ? json(d.corpo, d.__stato) : json(d)
    }
    // «Invita un cliente»: il QR e il link di esempio registrati da costruisci.mjs
    if (u.pathname === '/api/clienti' && R['POST /api/clienti invita']?.qr) { let b = {}; try { b = JSON.parse(init.body ?? '{}') } catch { } if (String(b.azione).startsWith('invita')) return json(R['POST /api/clienti invita']) }
    if (u.pathname !== '/api/notifiche') avvisa()
    return json({ ok: true, anteprima: true })
  }
  // il canale dei cambi del vault: nell'anteprima non cambia niente
  window.EventSource = class { constructor () { this.readyState = 2 } close () {} addEventListener () {} }
  // il bollino «Anteprima», sempre visibile, con la versione e il ramo
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style')
    s.textContent = `.anteprima-bollino{position:fixed;left:12px;bottom:12px;z-index:2147483000;font:600 12px/1.2 system-ui,sans-serif;background:#b45309;color:#fff;padding:6px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;opacity:.92}
@media (max-width:760px){.anteprima-bollino{left:auto;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));font-size:11px;padding:4px 8px}}
.anteprima-avviso{position:fixed;left:50%;bottom:52px;transform:translateX(-50%);z-index:2147483000;font:500 14px/1.3 system-ui,sans-serif;background:#1f2937;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:calc(100vw - 32px)}`
    document.head.append(s)
    const b = document.createElement('div'); b.className = 'anteprima-bollino'
    b.textContent = ['Anteprima', A.info.versione && 'Mirion ' + A.info.versione, A.info.ramo, 'dati di esempio'].filter(Boolean).join(' · ')
    document.body.append(b)
  })
})()
