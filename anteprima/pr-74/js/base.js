// Gli attrezzi di tutte le stanze: chiedere al server, costruire gli elementi, avvisare, festeggiare.
export const $ = (s, d = document) => d.querySelector(s)
export const $$ = (s, d = document) => [...d.querySelectorAll(s)]

// el('button', { class: 'x', testo: 'Ciao', onclick }, figli…): niente innerHTML, quindi niente testo che diventa codice
export function el (tag, attr = {}, ...figli) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attr)) {
    if (v == null || v === false) continue
    if (k === 'testo') e.textContent = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) { if (p.startsWith('--')) e.style.setProperty(p, x); else e.style[p] = x } // le variabili CSS vogliono setProperty
    else e.setAttribute(k, v === true ? '' : v)
  }
  for (const f of figli.flat()) if (f != null && f !== false) e.append(f.nodeType ? f : String(f))
  return e
}
export const svg = (d, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); if (cls) s.setAttribute('class', cls); s.innerHTML = d; return s }

export async function api (url, corpo) {
  const r = await fetch(url, corpo === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  const d = await r.json().catch(() => ({ errore: 'risposta illeggibile' }))
  // «manca:claude» / «manca:obsidian»: il programma non è sul computer; si apre il riquadro per installarlo,
  // e l'errore resta senza testo così nessuna notifica lo ripete
  if (/^manca:/.test(d?.errore ?? '')) { import('./manca.js').then(m => m.consiglia(d.errore.slice(6))); throw new Error('') }
  // la porta della Mirion del collaboratore si è chiusa (password rifatta, accesso tolto): si torna a «Entra in Mirion»
  if (r.status === 401 && d?.accesso && !document.querySelector('.finestra-attivazione')) { location.reload(); throw new Error('') }
  if (!r.ok || d?.errore) throw new Error(d?.errore ?? `errore ${r.status}`)
  return d
}

// lo stato condiviso fra le stanze (cosa c'è sul computer, il preset attivo)
export const STATO = { vault: '', claudeApi: false, claudeApiAttiva: false /* Claude via API messo da parte (Marco, 25-11: «lapi eliminala per ora»): true la riaccende */, app: { claude: true, obsidian: true }, preset: null }

// gli avvisi di questa apertura di Mirion, dal più nuovo: li rilegge il centro notifiche della scrivania (caselle-studio-notizie.js)
export const AVVISI = []
export function notifica (testo, { tipo = '', azione, durata = 4200, fonte = null, dove = null } = {}) {
  if (!testo) return // un errore già mostrato altrove (il riquadro di un programma che manca)
  AVVISI.unshift({ testo: String(testo), quando: new Date(), tipo }); AVVISI.length = Math.min(AVVISI.length, 30)
  // e nell'archivio delle notifiche (server/notifiche.mjs, 23-11), così la card Notifiche le ha tutte, anche dopo
  fetch('/api/notifiche', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ testo: String(testo), tipo, fonte: fonte ?? 'mirion', dove: dove ?? null }) }).catch(() => {})
  const n = el('div', { class: 'notifica ' + tipo }, el('span', { testo }), azione && el('button', { type: 'button', class: 'quieto', testo: azione.testo, onclick: () => { azione.fai(); via() } }))
  const via = () => { n.classList.add('via'); setTimeout(() => n.remove(), 400) }
  $('[data-notifiche]').append(n); setTimeout(via, durata)
}

// una piccola festa dove hai cliccato, quando chiudi qualcosa
export function festa (x, y) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colori = ['#8a6cef', '#c4b5fd', '#57e39b', '#ffb648', '#f4f4fc']
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 70
    const s = el('i', { class: 'scintilla', style: { left: x + 'px', top: y + 'px', background: colori[i % colori.length], '--dx': Math.cos(a) * r + 'px', '--dy': Math.sin(a) * r - 30 + 'px' } })
    s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', Math.sin(a) * r - 30 + 'px')
    document.body.append(s); setTimeout(() => s.remove(), 950)
  }
}

// le date come si dicono: «oggi», «domani», «ven 21», «3 giorni fa»
export const oggiISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
export function quando (iso) {
  const d = Math.round((new Date(iso + 'T12:00') - new Date(oggiISO() + 'T12:00')) / 864e5)
  if (d === 0) return 'oggi'
  if (d === 1) return 'domani'
  if (d === -1) return 'ieri'
  if (d < 0) return `${-d} giorni fa`
  if (d < 7) return new Date(iso + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
  return new Date(iso + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
export const piu = (iso, giorni) => new Date(new Date(iso + 'T12:00').getTime() + giorni * 864e5).toISOString().slice(0, 10)
export const nomeNota = rel => rel.split('/').pop().replace(/\.md$/, '')

// aprire le app: Claude (sul vault), Obsidian sulla nota, un accesso del preset
export const apri = {
  claude: testo => api('/api/apri', { app: 'claude', testo }),
  code: testo => api('/api/apri', { app: 'claude-code', testo }),
  obsidian: nota => api('/api/apri', { app: 'obsidian', nota }),
  accesso: id => api('/api/apri', { app: 'accesso', id }),
}
export function aClaudeCode (testo) {
  // se Claude non c'è, il server lo dice e si apre il riquadro per installarlo
  apri.code(testo).then(() => notifica('Claude si apre sul tuo cervello con la richiesta già scritta: conferma la cartella e premi invio.')).catch(e => notifica(e.message))
}
