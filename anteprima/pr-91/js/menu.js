// Il menu del tasto destro (Marco, 20-11: «dai la possibilità di fare tasto destro e modificare, scegli tu le opzioni»).
// apriMenu(x, y, voci, titolo): un menu dove hai cliccato, dentro lo schermo. Una voce è { testo, fai, segno, pericolo,
// spenta, scelta, sotto: [voci] } oppure '-' per una riga di separazione. Tastiera: frecce, Invio, → apre il sottomenu,
// ← o Esc torna indietro. Si chiude con un clic fuori, Esc, la rotella o quando la finestra cambia misura.
import { el } from './base.js'
import { ic } from './icone.js'

// i segni delle voci diventano icone Phosphor (premium.css, icone.js); un segno senza icona resta com'è
const ICONE = { '⛶': 'corners-out', '−': 'minus', '+': 'plus', '↔': 'arrows-horizontal', '↕': 'arrows-vertical', '▣': 'folder-simple', '✎': 'pencil-simple', '⇱': 'arrow-square-out',
  '→': 'arrow-right', '←': 'arrow-left', '⧉': 'copy', '✕': 'x', '▸': 'arrow-up-right', '▦': 'squares-four', '◌': 'eye-slash', '●': 'eye', '⟷': 'sidebar-simple', '⤢': 'arrows-out', '⋯': 'dots-three', '✓': 'check' }
const segno = s => ICONE[s] ? ic(ICONE[s]) : (s ?? '')

let aperti = []

export function chiudiMenu () { aperti.forEach(m => m.remove()); aperti = []; removeEventListener('pointerdown', fuori, true) }
const fuori = e => { if (!aperti.some(m => m.contains(e.target))) chiudiMenu() }
addEventListener('resize', chiudiMenu)
addEventListener('wheel', e => { if (!aperti.some(m => m.contains(e.target))) chiudiMenu() }, { passive: true })
addEventListener('hashchange', chiudiMenu)

export function apriMenu (x, y, voci, titolo = '', livello = 0) {
  aperti.slice(livello).forEach(m => m.remove()); aperti = aperti.slice(0, livello)
  const menu = el('div', { class: 'menu-destro', role: 'menu', 'aria-label': titolo || 'Menu' }, titolo && livello === 0 ? el('p', { class: 'menu-titolo', testo: titolo }) : null)
  const pulsanti = []
  for (const v of voci.filter(Boolean)) {
    if (v === '-') { menu.append(el('hr', { role: 'separator' })); continue }
    if (v.etichetta) { menu.append(el('p', { class: 'menu-titolo menu-gruppo', testo: v.etichetta })); continue } // il titolo di un gruppo di voci
    const b = el('button', { type: 'button', role: v.scelta == null ? 'menuitem' : 'menuitemradio', 'aria-checked': v.scelta == null ? null : String(v.scelta), class: 'menu-voce' + (v.pericolo ? ' pericolo' : '') + (v.img ? ' con-img' : ''), disabled: v.spenta, style: v.colore ? { '--c': v.colore } : null,
      'aria-haspopup': v.sotto ? 'menu' : null },
      el('span', { class: 'menu-segno', 'aria-hidden': 'true' }, v.img ? el('img', { src: v.img, alt: '' }) : v.ico && !v.scelta ? ic(v.ico) : segno(v.scelta ? '✓' : v.segno)), el('span', { class: 'menu-testo', testo: v.testo }),
      v.sotto ? el('span', { class: 'menu-freccia', 'aria-hidden': 'true' }, ic('caret-right')) : v.img && v.scelta ? el('span', { class: 'menu-freccia', 'aria-hidden': 'true' }, ic('check')) : null)
    const apriSotto = () => { const r = b.getBoundingClientRect(); apriMenu(r.right - 4, r.top - 6, v.sotto, v.testo, livello + 1); aperti[livello + 1]?.querySelector('.menu-voce:not(:disabled)')?.focus() }
    b.addEventListener('click', e => { e.stopPropagation(); if (v.sotto) return apriSotto(); chiudiMenu(); v.fai?.() })
    b.addEventListener('pointerenter', () => { if (v.sotto) apriSotto(); else if (aperti.length > livello + 1) { aperti.slice(livello + 1).forEach(m => m.remove()); aperti = aperti.slice(0, livello + 1) } })
    b._apriSotto = v.sotto ? apriSotto : null
    pulsanti.push(b); menu.append(b)
  }
  menu.addEventListener('keydown', e => {
    const attivi = pulsanti.filter(p => !p.disabled), i = attivi.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); attivi[(i + 1) % attivi.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); attivi[(i - 1 + attivi.length) % attivi.length]?.focus() }
    else if (e.key === 'ArrowRight' && document.activeElement?._apriSotto) { e.preventDefault(); document.activeElement._apriSotto() }
    else if ((e.key === 'ArrowLeft' && livello > 0) || e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation()
      if (livello === 0) return chiudiMenu()
      menu.remove(); aperti = aperti.slice(0, livello); aperti[livello - 1]?.querySelector('[aria-haspopup]:focus, [aria-haspopup]')?.focus()
    } else if (e.key === 'Tab') { e.preventDefault(); chiudiMenu() }
  })
  document.body.append(menu); aperti.push(menu)
  // dentro lo schermo: se non ci sta a destra va a sinistra, se non ci sta sotto sale
  const r = menu.getBoundingClientRect(), L = innerWidth - 8, A = innerHeight - 8
  const padre = livello ? aperti[livello - 1].getBoundingClientRect() : null
  menu.style.left = Math.max(8, x + r.width > L ? (padre ? padre.left - r.width + 4 : L - r.width) : x) + 'px'
  menu.style.top = Math.max(8, y + r.height > A ? A - r.height : y) + 'px'
  if (livello === 0) { addEventListener('pointerdown', fuori, true); pulsanti.find(p => !p.disabled)?.focus({ preventScroll: true }) }
  return menu
}
