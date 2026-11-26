// Delion su misura (Marco, 20-11): le caselle si trascinano sempre, prese dove capita, senza un modo da accendere
// («deve essere intuitivo lo spostamento… basta trascinare la casella»). Il pulsante in alto apre il pannello per aggiungere
// e togliere caselle e stanze (pannello.js). La disposizione la tiene il server (dati di Delion, disposizione.json).
import { $, el, api, notifica } from './base.js'
import { ic } from './icone.js'

export const MISURA = { d: null }
// la scrivania che stai guardando: ognuna ha le sue caselle e le sue cartelle (Marco, 20-11: «fai creare più scrivanie»)
export const scrivania = () => MISURA.d?.scrivanie?.find(s => s.id === MISURA.d.attiva) ?? MISURA.d?.scrivanie?.[0]
let attesa = null

export async function carica () {
  try { MISURA.d = await api('/api/disposizione') } catch { MISURA.d = null }
  fermo = MISURA.d ? JSON.stringify(MISURA.d) : null
  return MISURA.d
}

// tornare indietro (Marco, 22-11: «dammi la possibilità di tornare indietro su quella che ho appena fatto, in caso la faccia per
// errore»): prima di ogni salvataggio la disposizione di prima va in una pila (al più PILA passi, finché Mirion resta aperta);
// «↶ Annulla» o Ctrl+Z la rimettono. Vale per tutto quello che è disposizione: caselle, colori, tema, cartelle, barra, Squadra.
const PILA = 40, storia = []
let fermo = null // la disposizione com'era all'ultimo salvataggio
export async function annulla () {
  clearTimeout(attesa)
  const prima = storia.pop()
  if (!prima) return notifica('Non c’è niente da annullare.')
  MISURA.d = JSON.parse(prima); fermo = prima; avvisa()
  try { MISURA.d = await api('/api/disposizione', MISURA.d); fermo = JSON.stringify(MISURA.d); avvisa(); notifica(storia.length ? `Annullato. Puoi tornare indietro ancora ${storia.length} ${storia.length === 1 ? 'volta' : 'volte'}.` : 'Annullato.') }
  catch (e) { notifica('Non riesco ad annullare: ' + e.message, { tipo: 'sempre' }) }
}
export const pulsanteAnnulla = () => el('button', { type: 'button', class: 'scrivania-libreria annulla-ultima', title: 'Torna a com’era prima dell’ultima modifica (Ctrl+Z)', onclick: annulla }, ic('arrow-counter-clockwise'), 'Annulla')
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z' || e.target.closest?.('input, textarea, select, [contenteditable], .excalidraw')) return
  if (document.body.dataset.stanza === 'lavagne') return // la lavagna ha il suo Ctrl+Z
  e.preventDefault(); annulla()
})

// ogni cambiamento si salva poco dopo, una volta sola anche se trascini tanto; il server rimanda la versione pulita
// La risposta prende il posto della copia locale solo se nel frattempo non hai cambiato altro (altrimenti vince il cambio nuovo)
// e solo se il server l'ha davvero cambiata (una cartella sciolta, un numero fuori misura): allora tutto si ridisegna.
// Se è uguale, la copia locale resta la stessa: i pulsanti già disegnati continuano a cambiare quella giusta
// (Marco, 20-11: una scheda della cartella, scelta, non si apriva, perché il pulsante cambiava la copia vecchia).
let giro = 0
// il confronto non bada all'ordine dei campi (il server li rimette in un ordine suo): conta solo cosa c'è scritto
const uguale = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x)
export function salva ({ subito = false } = {}) {
  clearTimeout(attesa)
  const mio = ++giro
  const manda = () => {
    const ora = JSON.stringify(MISURA.d)
    if (fermo && ora !== fermo) { storia.push(fermo); if (storia.length > PILA) storia.shift() } // com'era prima, per «Annulla»
    fermo = ora
    return api('/api/disposizione', MISURA.d).then(d => {
    if (mio !== giro) return
    const cambiata = uguale(d) !== uguale(MISURA.d)
    if (cambiata) { MISURA.d = d; fermo = JSON.stringify(d) }
    if (cambiata || subito) avvisa() // «subito»: chi ha cambiato vuole vedere tutto ridisegnato (il pannello, la barra)
  }).catch(e => notifica('La disposizione non si è salvata: ' + e.message, { tipo: 'sempre' }))
  }
  if (subito) return manda()
  attesa = setTimeout(manda, 300)
}

export async function rimettiComEra () {
  if (fermo) storia.push(fermo) // anche «Rimetti tutto com'era» si annulla
  MISURA.d = await api('/api/disposizione', { rimetti: true }); fermo = JSON.stringify(MISURA.d)
  avvisa(); notifica('Tutto com\'era all\'inizio.', { azione: { testo: 'Annulla', fai: annulla }, durata: 8000 })
}

// le parti che si ridisegnano quando la disposizione cambia (scrivania, barra, pannello)
export const avvisa = () => dispatchEvent(new CustomEvent('su-misura', { detail: MISURA }))
export const nuovoId = prefisso => `${prefisso}-${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 4)}`

// il pulsante in alto, accanto all'ora: apre il pannello
export function pulsante () {
  $('[data-orologio]').before(el('button', { type: 'button', class: 'personalizza', 'data-personalizza': '', title: 'Aggiungi o togli caselle e stanze',
    onclick: () => import('./pannello.js').then(m => m.pannello()) }, ic('sliders-horizontal'), el('span', { testo: 'Personalizza' })))
}

const sopra = (m, f) => { const r = f.getBoundingClientRect(); return m.clientX >= r.left && m.clientX <= r.right && m.clientY >= r.top && m.clientY <= r.bottom }
const alCentro = (m, f) => { const r = f.getBoundingClientRect(); return Math.abs(m.clientX - (r.left + r.width / 2)) < r.width * .22 && Math.abs(m.clientY - (r.top + r.height / 2)) < r.height * .3 }

// Trascinare per riordinare, in una lista o in una griglia: si prende la casella dove capita (restano fuori i campi dove si
// scrive e quello segnato data-non-trascinare). Un clic resta un clic: il viaggio comincia dopo 6 pixel.
// Con unisci(id, suId): lasciata al centro di un'altra casella, le due vanno insieme (una cartella).
// Con fuori(id): lasciata fuori dal contenitore, esce (una scheda tirata fuori dalla sua cartella). Tastiera: Alt + frecce.
// data-non-trascinare su un elemento dentro il contenitore lo lascia a chi ci sta dentro (le schede hanno il loro ordinabile).
// colonne: la griglia a colonne (la scrivania, 12): oltre all'ordine conta la colonna dove la lasci, e fatto riceve anche { id, colonna }
export function ordinabile (contenitore, { fatto, unisci = null, fuori = null, asse = 'libero', puoUnire = () => true, colonne = 0 }) {
  const figli = () => [...contenitore.children].filter(f => f.dataset.id)
  contenitore.addEventListener('pointerdown', e => {
    if (e.button !== 0) return
    let cosa = e.target // il figlio diretto del contenitore che contiene il punto preso (dentro può avere altri data-id)
    while (cosa && cosa.parentElement !== contenitore) cosa = cosa.parentElement
    const blocco = e.target.closest('[data-non-trascinare]')
    // data-maniglia: un punto dentro una parte data-non-trascinare da cui si trascina lo stesso (la tapparella delle cartelle)
    const maniglia = e.target.closest('[data-maniglia]'), mia = maniglia && contenitore.contains(maniglia) && !(blocco && maniglia.contains(blocco) && blocco !== maniglia)
    if (!cosa?.dataset?.id || (blocco && blocco !== contenitore && contenitore.contains(blocco) && !mia) || e.target.closest('input, select, textarea, [contenteditable]')) return
    // col dito (Marco, 23-11 sera: «sul telefono scrollando sposto i widget»): si sposta solo tenendo premuto mezzo secondo, come
    // nelle app; se il dito si muove prima, è lo scorrimento della pagina e la casella resta dov'è
    if (e.pointerType === 'touch') {
      let t = setTimeout(() => { t = null; via(); inizia(e, true) }, 450)
      const fine = m => { if (t && (!m.clientX || Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) > 8 || m.type !== 'pointermove')) { clearTimeout(t); t = null; via() } }
      const via = () => { removeEventListener('pointermove', fine); removeEventListener('pointerup', fine); removeEventListener('pointercancel', fine) }
      addEventListener('pointermove', fine); addEventListener('pointerup', fine); addEventListener('pointercancel', fine)
      return
    }
    inizia(e, false)
  })
  function inizia (e, dito) {
    let cosa = e.target
    while (cosa && cosa.parentElement !== contenitore) cosa = cosa.parentElement
    if (!cosa) return
    e.preventDefault?.()
    // col dito, durante lo spostamento la pagina non scorre
    const ferma = ev => ev.preventDefault()
    if (dito) { document.addEventListener('touchmove', ferma, { passive: false }); cosa.classList.add('presa'); navigator.vibrate?.(15) }
    const via = cosa.getBoundingClientRect(), dx = e.clientX - via.left, dy = e.clientY - via.top
    let fantasma = null, mosso = false, bersaglio = null, ultimo = null, posto = null
    // la colonna sotto il bordo sinistro della casella che porti, finché la griglia ha davvero più colonne (sul telefono no)
    const aColonna = sx => {
      if (!colonne || getComputedStyle(cosa).gridColumnEnd === '-1') return null
      const g = contenitore.getBoundingClientRect(), gap = parseFloat(getComputedStyle(contenitore).columnGap) || 0, passo = (g.width + gap) / colonne
      const larga = Math.min(colonne, parseInt(getComputedStyle(cosa).getPropertyValue('--larghezza')) || colonne)
      return Math.max(1, Math.min(colonne - larga + 1, Math.round((sx - g.left) / passo) + 1))
    }
    const segna = b => { if (bersaglio !== b) { bersaglio?.classList.remove('da-unire'); bersaglio = b; b?.classList.add('da-unire') } }
    const muovi = m => {
      if (!mosso && Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) < 6) return
      if (!fantasma) {
        fantasma = cosa.cloneNode(true)
        Object.assign(fantasma.style, { position: 'fixed', left: via.left + 'px', top: via.top + 'px', width: via.width + 'px', height: Math.min(via.height, 320) + 'px', overflow: 'hidden', pointerEvents: 'none', zIndex: 60 })
        fantasma.classList.add('fantasma'); document.body.append(fantasma); cosa.classList.add('in-viaggio'); document.body.classList.add('si-trascina')
      }
      mosso = true; ultimo = m
      fantasma.style.left = (asse === 'verticale' ? via.left : m.clientX - dx) + 'px'
      fantasma.style.top = (asse === 'orizzontale' ? via.top : m.clientY - dy) + 'px'
      const c = aColonna(m.clientX - dx)
      if (c && c !== posto) { posto = c; cosa.style.setProperty('--colonna', c) }
      const sotto = figli().find(f => f !== cosa && sopra(m, f))
      if (!sotto) return segna(null)
      if (unisci && alCentro(m, sotto) && puoUnire(cosa, sotto)) return segna(sotto) // al centro: si mettono insieme
      segna(null)
      // una casella larga (una fascia intera) si scavalca in alto o in basso, una stretta a sinistra o a destra
      const r = sotto.getBoundingClientRect(), largo = r.width > contenitore.clientWidth * .6
      const dopo = asse === 'verticale' || (asse === 'libero' && largo) ? m.clientY > r.top + r.height / 2 : m.clientX > r.left + r.width / 2
      sotto[dopo ? 'after' : 'before'](cosa)
    }
    const lascia = () => {
      removeEventListener('pointermove', muovi); removeEventListener('pointerup', lascia); removeEventListener('pointercancel', lascia)
      if (dito) { document.removeEventListener('touchmove', ferma); cosa.classList.remove('presa') }
      fantasma?.remove(); cosa.classList.remove('in-viaggio'); document.body.classList.remove('si-trascina')
      if (!mosso) return
      // il clic che arriva dopo un trascinamento non apre niente (nome diverso da «ferma» del dito: prima l'errore bloccava il rilascio col touch, analisi del 26-11)
      const fermaClic = ev => { ev.preventDefault(); ev.stopPropagation() }
      addEventListener('click', fermaClic, { capture: true, once: true }); setTimeout(() => removeEventListener('click', fermaClic, true), 0)
      const b = bersaglio; segna(null)
      if (fuori && ultimo && !sopra(ultimo, contenitore.parentElement ?? contenitore)) return fuori(cosa.dataset.id, ultimo)
      if (b) unisci(cosa.dataset.id, b.dataset.id); else fatto(figli().map(f => f.dataset.id), posto ? { id: cosa.dataset.id, colonna: posto } : null)
    }
    addEventListener('pointermove', muovi); addEventListener('pointerup', lascia); addEventListener('pointercancel', lascia)
  }
  contenitore.addEventListener('keydown', e => {
    if (!e.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    const cosa = e.target.closest('[data-id]')
    if (!cosa || cosa.parentElement !== contenitore) return
    e.preventDefault()
    const indietro = e.key === 'ArrowLeft' || e.key === 'ArrowUp', vicino = indietro ? cosa.previousElementSibling : cosa.nextElementSibling
    if (!vicino?.dataset.id) return
    vicino[indietro ? 'before' : 'after'](cosa); e.target.focus(); fatto(figli().map(f => f.dataset.id))
  })
}
