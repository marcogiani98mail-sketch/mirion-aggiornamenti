// Gli strumenti in alto a destra: le app del preset con la loro icona vera, a un clic (le app sul computer, i siti nel browser).
// Le icone sono in app/icone/<id>.png o .ico (scaricate da build/icone.mjs); se manca, la lettera con il colore del servizio.
import { $, el, apri, STATO, notifica } from './base.js'
import { MISURA } from './su-misura.js'
import { ic } from './icone.js'

// il colore di ogni servizio, per la lettera quando l'icona manca
const TINTE = ['#c4b5fd', '#a5b4fc', '#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#f0abfc', '#99f6e4']
export const tinta = s => TINTE[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTE.length]
export const iniziale = nome => nome.replace(/^(La |Il |Lo |L')/i, '').trim()[0]?.toUpperCase() ?? '·'

// l'icona di un accesso: prima il png, poi l'ico, poi la lettera
export function icona (a, classe = 'icona-app') {
  const box = el('b', { class: classe, style: { background: tinta(a.nome) }, 'aria-hidden': 'true' }, iniziale(a.nome))
  if (!a.id || a.id.startsWith('mio-')) return box
  const img = el('img', { src: `./icone/${a.id}.png`, alt: '' })
  img.addEventListener('load', () => { box.replaceChildren(img); box.classList.add('con-icona') })
  img.addEventListener('error', () => { if (img.src.endsWith('.png')) img.src = `./icone/${a.id}.ico` })
  return box
}

// Claude e Obsidian: se non ci sono, il server lo dice e si apre il riquadro per installarli (manca.js)
export function apriAccesso (a) {
  apri.accesso(a.id).catch(e => notifica(e.message, { tipo: 'sempre' }))
}

// quali stanno in alto a destra (Marco, 24-11: «fammi modificare quelle che voglio vedere»): quelle scelte in Lavoro → Personalizza
// (MISURA.d.dock, in ordine), se no le prime del preset come prima
export function nelDock () {
  const p = STATO.preset?.attivo, quanti = STATO.preset?.dock ?? 8, scelte = MISURA.d?.dock
  if (!Array.isArray(scelte)) return (p?.accessi ?? []).slice(0, quanti)
  return scelte.map(id => (p?.accessi ?? []).find(a => a.id === id)).filter(Boolean)
}
export function dock () {
  $('[data-dock]').replaceChildren(
    ...nelDock().map(a => el('button', { type: 'button', class: 'strumento', 'data-id': a.id, 'data-nome': a.nome, 'aria-label': `Apri ${a.nome}`, onclick: () => apriAccesso(a) }, icona(a, 'icona-strumento'))),
    el('a', { class: 'strumento altro', href: '#lavoro', 'data-nome': 'Tutti i tuoi accessi', 'aria-label': 'Tutti i tuoi accessi' }, ic('dots-three')))
}

// la disposizione arriva dopo l'avvio: quando c'è (o cambia), le estensioni scelte si ridisegnano
addEventListener('su-misura', () => dock())
