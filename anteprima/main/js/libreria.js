// La libreria (Marco, 20-11: «dai possibilità nell'area di lavoro di avere le scelte che non si utilizzano, metti una libreria»):
// sulla scrivania, «Libreria» apre le caselle che su questa scrivania non ci sono e le stanze tolte dalla barra a sinistra.
// Una casella si trascina sulla griglia, dove la lasci (prima della casella che c'è sotto), o si aggiunge in fondo con «Aggiungi».
// Togliere una casella (✕ o il tasto destro) la rimanda qui.
import { $, $$, el } from './base.js'
import { ic } from './icone.js'
import { MISURA, salva, scrivania } from './su-misura.js'
import { TITOLI } from './riquadri.js'

export const COSA = {
  adesso: 'la prossima cosa da fare, con Claude a un clic', giorni: 'i prossimi sette giorni', cervello: 'i numeri di oggi nel cervello', progetti: 'a che punto sono i progetti',
  scadute: 'le task per stato: scadute, da fare, in pausa, archiviate', accessi: 'i siti e le app del tuo lavoro, a un clic', cerca: 'le note per parola',
  diario: 'la nota di oggi, e una riga da scriverci', lavagne: 'la lavagna a schermo intero, e le ultime salvate', programmi: 'i programmi che abbiamo in giro e dove girano',
  'da-chiudere': 'le cose che il diario dice fatte, e quelle nascoste nelle note', gestionali: 'i programmi che costruiamo (Turni pulizie, Studio PT), aperti qui dentro',
  conti: 'incassato, da incassare e rinnovi', notifiche: 'quello che aspetta una mano, e tutte le notifiche', notizie: 'le notizie del tuo settore',
  'senza-data': 'le cose da fare senza una data',
}
let aperta = false

export function pulsanteLibreria (ridisegna) {
  const n = scrivania()?.riquadri.filter(r => r.nascosto).length ?? 0
  return el('button', { type: 'button', class: 'scrivania-libreria', 'aria-expanded': String(aperta), title: 'Le caselle che qui non usi',
    onclick: () => { aperta = !aperta; ridisegna() } }, ic('squares-four'), `Libreria${n ? ` (${n})` : ''}`)
}

// il cassetto della libreria, sopra la griglia
export function libreria (ridisegna) {
  if (!aperta || !MISURA.d) return null
  const sc = scrivania(), libere = sc.riquadri.filter(r => r.nascosto), nascoste = MISURA.d.stanze.nascoste
  const nomeStanza = id => $(`.stanze a[data-stanza="${id}"] span`)?.textContent ?? id
  return el('section', { class: 'libreria', 'aria-label': 'Libreria' },
    el('header', {}, el('h2', { testo: `Libreria di «${sc.nome}»` }), el('span', { class: 'sopra piccolo', testo: 'Trascina una casella sulla scrivania, dove la vuoi.' }),
      el('button', { type: 'button', class: 'quieto', 'aria-label': 'Chiudi la libreria', onclick: () => { aperta = false; ridisegna() } }, ic('x'))),
    libere.length ? el('ul', { class: 'libreria-caselle' }, ...libere.map(r => {
      const carta = el('li', { class: 'libreria-carta', 'data-libreria': r.id, tabindex: '-1' },
        el('b', { testo: TITOLI[r.id] }), el('small', { testo: COSA[r.id] ?? '' }),
        el('button', { type: 'button', class: 'secondario piccolo', onclick: () => { aggiungi(r.id, null); ridisegna() } }, ic('plus'), 'Aggiungi'))
      carta.addEventListener('pointerdown', e => { if (!e.target.closest('button') && e.button === 0) trascina(e, carta, r.id, ridisegna) })
      return carta
    })) : el('p', { class: 'vuoto', testo: 'Sono tutte sulla scrivania.' }),
    nascoste.length ? el('div', { class: 'libreria-stanze' }, el('span', { class: 'sopra piccolo', testo: 'Tolte dalla barra a sinistra:' }),
      ...nascoste.map(id => el('button', { type: 'button', class: 'secondario piccolo', title: 'Rimettila nella barra a sinistra',
        onclick: () => { MISURA.d.stanze.nascoste = nascoste.filter(x => x !== id); salva({ subito: true }) } }, ic('arrow-counter-clockwise'), nomeStanza(id)))) : null)
}

// una casella dalla libreria alla scrivania: prima di quella indicata (una casella o una cartella), o in fondo
export function aggiungi (id, primaDi) {
  const sc = scrivania(), r = sc.riquadri.find(x => x.id === id)
  if (!r) return
  Object.assign(r, { nascosto: false, gruppo: null, piccolo: false })
  const resto = sc.riquadri.filter(x => x !== r)
  let i = primaDi ? resto.findIndex(x => x.id === primaDi || x.gruppo === primaDi) : -1
  if (i < 0) i = resto.reduce((u, x, k) => !x.nascosto ? k + 1 : u, 0) // dopo l'ultima visibile
  sc.riquadri = [...resto.slice(0, i), r, ...resto.slice(i)]
  salva()
}

// trascinare una carta della libreria: la carta segue il dito; sulla griglia, la casella sotto si illumina
function trascina (e, carta, id, ridisegna) {
  e.preventDefault()
  const via = carta.getBoundingClientRect(), dx = e.clientX - via.left, dy = e.clientY - via.top
  let fantasma = null, sotto = null
  const segna = b => { if (sotto !== b) { sotto?.classList.remove('arriva-qui'); sotto = b; b?.classList.add('arriva-qui') } }
  const muovi = m => {
    if (!fantasma && Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) < 6) return
    if (!fantasma) { fantasma = carta.cloneNode(true); fantasma.classList.add('fantasma'); Object.assign(fantasma.style, { position: 'fixed', width: via.width + 'px', pointerEvents: 'none', zIndex: 60 }); document.body.append(fantasma); document.body.classList.add('si-trascina') }
    fantasma.style.left = m.clientX - dx + 'px'; fantasma.style.top = m.clientY - dy + 'px'
    segna($$('.griglia-riquadri > .riquadro').find(b => { const r = b.getBoundingClientRect(); return m.clientX >= r.left && m.clientX <= r.right && m.clientY >= r.top && m.clientY <= r.bottom }) ?? null)
  }
  const lascia = m => {
    removeEventListener('pointermove', muovi); removeEventListener('pointerup', lascia)
    document.body.classList.remove('si-trascina'); fantasma?.remove()
    const g = $('.griglia-riquadri')?.getBoundingClientRect(), dentro = g && m.clientX >= g.left && m.clientX <= g.right && m.clientY >= g.top - 20 && m.clientY <= g.bottom + 200
    const prima = sotto?.dataset.id ?? null; segna(null)
    if (fantasma && dentro) { aggiungi(id, prima); ridisegna() }
  }
  addEventListener('pointermove', muovi); addEventListener('pointerup', lascia)
}
