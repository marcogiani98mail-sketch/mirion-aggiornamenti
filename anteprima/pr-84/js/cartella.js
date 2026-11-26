// La risposta del controllo di una cartella (server/cartella.mjs), uguale in tutti i moduli dove si scrive una cartella: la
// guida, la nuova area, la squadra nuova o collegata. Se il server dice «ferma», sotto il campo compare il riquadro: il
// problema (in rosso), oppure «non c'è ancora: la creo?» con «Sì, creala»; e se c'è un nome simile, «Usa …».
import { el } from './base.js'

// r: la risposta del server; box: dove scrivere; campo: l'input della cartella; riprova(crea): rimanda il modulo
export function fermaCartella (r, { box, campo, riprova }) {
  if (!r?.ferma) { box?.replaceChildren(); return false }
  const usa = r.suggerimento && el('button', { type: 'button', class: 'secondario piccolo', onclick: () => { campo.value = r.suggerimento; box.replaceChildren(); riprova(false) } }, `Usa «${r.suggerimento}»`)
  box.replaceChildren(el('div', { class: 'cartella-esito ' + (r.problema ? 'problema' : 'domanda'), role: 'alert' },
    el('p', { testo: r.problema ? r.problema[0].toUpperCase() + r.problema.slice(1) + (/[.?!]$/.test(r.problema) ? '' : '.') : r.chiedi }),
    r.avviso ? el('p', { class: 'sopra piccolo', testo: 'Attenzione: ' + r.avviso + '.' }) : null,
    el('div', { class: 'bottoni' },
      r.chiedi ? el('button', { type: 'button', class: 'primario piccolo', onclick: () => { box.replaceChildren(); riprova(true) } }, 'Sì, creala') : null,
      usa || null,
      el('button', { type: 'button', class: 'quieto piccolo', onclick: () => { box.replaceChildren(); campo.focus(); campo.select?.() } }, r.problema ? 'Correggo' : 'No, la cambio'))))
  box.querySelector('button')?.focus()
  return true
}
export const boxCartella = () => el('div', { class: 'cartella-box', 'aria-live': 'polite' })
