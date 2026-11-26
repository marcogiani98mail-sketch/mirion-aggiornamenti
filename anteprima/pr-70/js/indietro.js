// Il tasto per tornare indietro (Marco, 20-11: «fai un tasto per tornare indietro»): in alto, accanto al nome dell'area,
// riporta alla stanza di prima (Scrivania, Task, Calendario…, anche con il giorno o la nota che avevi aperto). Funzionano
// anche Alt+← e il tasto «indietro» del mouse. Spento quando non c'è niente prima.
import { $, el } from './base.js'
import { ic } from './icone.js'

const storia = [] // gli indirizzi visti, dal primo all'ultimo
let tornando = false, tasto = null

const aggiorna = () => { if (tasto) { tasto.disabled = storia.length < 2; tasto.title = storia.length < 2 ? 'Niente prima' : 'Torna indietro (Alt+←)' } }

// da chiamare a ogni cambio di stanza
export function ricorda () {
  const qui = location.hash || '#scrivania'
  if (tornando) tornando = false
  else if (storia.at(-1) !== qui) storia.push(qui)
  if (storia.length > 100) storia.shift()
  aggiorna()
}

export function indietro () {
  if (storia.length < 2) return
  storia.pop(); tornando = true
  location.hash = storia.at(-1)
}

export function pulsanteIndietro () {
  tasto = el('button', { type: 'button', class: 'indietro', 'aria-label': 'Torna indietro', onclick: indietro }, ic('arrow-left'))
  ;($('[data-area]') ?? $('.marchio')).after(tasto)
  addEventListener('keydown', e => { if (e.altKey && e.key === 'ArrowLeft' && !e.target?.closest?.('input, textarea, [contenteditable]')) { e.preventDefault(); indietro() } })
  addEventListener('mouseup', e => { if (e.button === 3) { e.preventDefault(); indietro() } }) // il tasto «indietro» del mouse
  aggiorna()
}
