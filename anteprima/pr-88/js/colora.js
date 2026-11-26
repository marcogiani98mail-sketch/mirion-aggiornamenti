// Il colore di una card che non è una casella della griglia (Marco, 26-11-2026: «Mirion Fit e Trainer non mi fa colorare la
// card»): le card di Mirion Trainer (clienti.js) hanno lo stesso ✦ delle caselle della scrivania, con gli stessi colori.
// Il colore si salva nella disposizione, in «carte» (server/disposizione.mjs), così resta dopo un aggiornamento.
import { el } from './base.js'
import { ic } from './icone.js'
import { MISURA, salva } from './su-misura.js'

const NOMI = { viola: 'Viola', blu: 'Blu', azzurro: 'Azzurro', verde: 'Verde', giallo: 'Giallo', arancio: 'Arancio', rosso: 'Rosso', rosa: 'Rosa', grigio: 'Grigio' }
const TINTE = { viola: '#8a6cef', blu: '#4f7cff', azzurro: '#38bdf8', verde: '#34d399', giallo: '#facc15', arancio: '#fb923c', rosso: '#f87171', rosa: '#f472b6', grigio: '#94a3b8' }

export function colorabile (carta, chiave) {
  const metti = c => { if (c) carta.dataset.colore = c; else delete carta.dataset.colore }
  metti(MISURA.d?.carte?.[chiave] ?? null)
  carta.classList.add('colorabile')
  const tasto = el('button', { type: 'button', class: 'colora-tasto', title: 'Colore', 'aria-label': 'Colore della card', onclick: e => {
    e.preventDefault(); e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect(), scelto = carta.dataset.colore ?? null
    const fai = c => {
      if (!MISURA.d) return
      MISURA.d.carte = { ...(MISURA.d.carte ?? {}) }
      if (c) MISURA.d.carte[chiave] = c; else delete MISURA.d.carte[chiave]
      metti(c); salva()
    }
    import('./menu.js').then(m => m.apriMenu(r.left - 160, r.bottom + 4, [
      ...Object.entries(NOMI).map(([c, nome]) => ({ testo: nome, segno: '●', colore: TINTE[c], scelta: scelto === c, fai: () => fai(c) })), '-',
      { testo: 'Nessun colore', scelta: !scelto, fai: () => fai(null) }], 'Il colore della card'))
  } }, ic('sparkle'))
  carta.append(tasto)
  return carta
}
