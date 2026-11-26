// Il visore delle immagini (Marco, 23-11: «le lavagne fammele vedere a schermo intero con zoom»): l'immagine su tutto lo schermo,
// lo zoom con la rotella (verso il punto dove sta il mouse), con + e −, «Adatta» e «100%»; si sposta trascinandola; Esc chiude.
// Lo usano le lavagne salvate (lavagne.js) e quelle mandate alla squadra (invio.js).
import { el } from './base.js'
import { ic } from './icone.js'

export function apriImmagine (src, titolo = 'Immagine') {
  let scala = 1, x = 0, y = 0, adatta = 1
  const img = el('img', { src, alt: titolo, draggable: false, class: 'visore-img' })
  const percento = el('span', { class: 'visore-percento', testo: '…' })
  const scena = el('div', { class: 'visore-scena' }, img)
  const applica = () => { img.style.transform = `translate(${x}px, ${y}px) scale(${scala})`; percento.textContent = Math.round(scala * 100) + '%' }
  const centra = s => { scala = s; const r = scena.getBoundingClientRect(); x = (r.width - img.naturalWidth * scala) / 2; y = (r.height - img.naturalHeight * scala) / 2; applica() }
  const calcolaAdatta = () => { const r = scena.getBoundingClientRect(); adatta = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight, 4) * 0.95 || 1 }
  // lo zoom intorno a un punto (quello del mouse, o il centro): il punto resta fermo sotto il mouse
  const zoom = (fattore, px, py) => {
    const r = scena.getBoundingClientRect(), cx = (px ?? r.width / 2), cy = (py ?? r.height / 2)
    const nuova = Math.min(12, Math.max(0.05, scala * fattore))
    x = cx - (cx - x) * (nuova / scala); y = cy - (cy - y) * (nuova / scala); scala = nuova; applica()
  }
  const fondo = el('div', { class: 'visore', role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo, tabindex: '-1' },
    el('div', { class: 'visore-barra' },
      el('b', { class: 'visore-titolo', testo: titolo }),
      el('span', { class: 'spazio' }),
      el('button', { type: 'button', class: 'quieto', title: 'Rimpicciolisci (−)', 'aria-label': 'Rimpicciolisci', onclick: () => zoom(1 / 1.25) }, ic('minus')),
      percento,
      el('button', { type: 'button', class: 'quieto', title: 'Ingrandisci (+)', 'aria-label': 'Ingrandisci', onclick: () => zoom(1.25) }, ic('plus')),
      el('button', { type: 'button', class: 'quieto', title: 'Tutta nello schermo (0)', onclick: () => centra(adatta) }, 'Adatta'),
      el('button', { type: 'button', class: 'quieto', title: 'Grandezza vera (1)', onclick: () => centra(1) }, '100%'),
      el('button', { type: 'button', class: 'quieto', title: 'Schermo intero (F)', onclick: () => document.fullscreenElement ? document.exitFullscreen() : fondo.requestFullscreen().catch(() => {}) }, ic('corners-out'), 'Schermo intero'),
      el('button', { type: 'button', class: 'quieto', title: 'Chiudi (Esc)', 'aria-label': 'Chiudi', onclick: () => chiudi() }, ic('x'))),
    scena,
    el('p', { class: 'visore-aiuto', testo: 'Rotella: zoom · trascina per spostarla · doppio clic: adatta o ingrandisci · Esc per chiudere' }))
  const chiudi = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); removeEventListener('resize', ridimensiona); fondo.remove() }
  const ridimensiona = () => { calcolaAdatta() }
  scena.addEventListener('wheel', e => { e.preventDefault(); const r = scena.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top) }, { passive: false })
  let presa = null
  scena.addEventListener('pointerdown', e => { presa = { px: e.clientX, py: e.clientY, x, y }; scena.setPointerCapture(e.pointerId); scena.classList.add('presa') })
  scena.addEventListener('pointermove', e => { if (!presa) return; x = presa.x + e.clientX - presa.px; y = presa.y + e.clientY - presa.py; applica() })
  scena.addEventListener('pointerup', () => { presa = null; scena.classList.remove('presa') })
  scena.addEventListener('dblclick', e => { const r = scena.getBoundingClientRect(); if (Math.abs(scala - adatta) < 0.01) zoom(2.5, e.clientX - r.left, e.clientY - r.top); else centra(adatta) })
  fondo.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.fullscreenElement) chiudi()
    else if (e.key === '+' || e.key === '=') zoom(1.25)
    else if (e.key === '-') zoom(1 / 1.25)
    else if (e.key === '0') centra(adatta)
    else if (e.key === '1') centra(1)
    else if (e.key.toLowerCase() === 'f') fondo.requestFullscreen?.().catch(() => {})
  })
  img.addEventListener('load', () => { calcolaAdatta(); centra(adatta) })
  addEventListener('resize', ridimensiona)
  document.body.append(fondo); fondo.focus()
  return fondo
}
