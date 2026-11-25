// Le caselle della scrivania, come widget (Marco, 20-11). Si trascinano prese dove capita; lasciata al centro di un'altra,
// una casella fa con quella una cartella a schede. Passandoci sopra compaiono ⛶ schermo intero, − rimpicciolisci, ✕ togli;
// l'angolo in basso a destra allarga (a colonne su dodici, e in altezza; doppio clic: altezza automatica).
import { el } from './base.js'
import { ic } from './icone.js'
import { MISURA, salva, ordinabile, nuovoId, scrivania, avvisa } from './su-misura.js'

export const TITOLI = { adesso: 'Adesso', giorni: 'I prossimi giorni', cervello: 'Oggi nel cervello', progetti: 'I progetti', 'senza-data': 'Senza data',
  scadute: 'Task', accessi: 'Lavoro', cerca: 'Cerca', diario: 'Diario', conti: 'Conti', gestionali: 'I gestionali', 'studio-pt': 'Claudio', notizie: 'Notizie', lavagne: 'Lavagna', notifiche: 'Notifiche', versioni: 'Le versioni', programmi: 'I programmi', 'da-chiudere': 'Da chiudere e nascoste' }

// dove stanno le caselle che si disegnano: la scrivania, o un'altra stanza fatta a caselle (la Squadra: Marco, 22-11:
// «dammi la possibilità di personalizzare come nella scrivania anche queste parti»); la imposta griglia()
let F = { dove: () => scrivania(), titoli: TITOLI, scrivania: true }
const R = () => F.dove().riquadri, G = () => F.dove().gruppi
const riq = id => R()?.find(r => r.id === id)
const membri = g => R().filter(r => r.gruppo === g && !r.nascosto)
const gruppo = id => G().find(g => g.id === id)
let intero = null // la casella aperta a schermo intero, finché non la chiudi

// Lo spazio si riempie (Marco, 20-11: «se sposto due caselle piccole… vicino ad una grossa… non si copre lo spazio in più»):
// la griglia ha righe sottili (PASSO pixel) e ogni casella ne prende quante ne servono alla sua altezza, più lo SPAZIO fra le caselle.
// Così due caselle basse si mettono una sotto l'altra accanto a una alta, invece di aspettare che finisca la riga.
const PASSO = 4, SPAZIO = 16
let osserva = null
// Il contenuto in proporzione alla casella (Marco, 20-11: «le proporzioni… proporzionate alla grandezza della casella, come se fosse
// un sito che si deve visualizzare indipendentemente dalla riduzione»): testo, tasti e spazi crescono e calano con la larghezza
// con la radice quadrata, così il cambio è dolce (BASE pixel = grandezza normale), fra MINIMA e MASSIMA; sotto i 720 pixel il contenuto va anche in colonna (su-misura.css).
export const SCALA = { BASE: 1200, MINIMA: 0.8, MASSIMA: 1.1 }
const scala = l => Math.round(Math.min(SCALA.MASSIMA, Math.max(SCALA.MINIMA, Math.sqrt(l / SCALA.BASE))) * 50) / 50
const adatta = box => {
  const misura = box.getBoundingClientRect(), s = String(scala(misura.width))
  if (box.style.getPropertyValue('--scala') !== s) box.style.setProperty('--scala', s)
  if (!box.classList.contains('intero')) box.style.setProperty('--righe', Math.ceil((misura.height + SPAZIO) / PASSO))
}

// contenuti: id → funzione che costruisce il contenuto. Ridà la griglia ordinata e misurata.
// opz (per le altre stanze): dove (la disposizione delle sue caselle), titoli, vuoto (cosa dire se le ha tolte tutte);
// spazi: per le caselle che hanno una stanza tutta loro, dove porta il doppio clic (le altre si aprono a schermo intero)
export function griglia (contenuti, ridisegna, opz = {}) {
  F = opz.dove ? { dove: opz.dove, titoli: opz.titoli ?? {}, scrivania: false } : { dove: () => scrivania(), titoli: TITOLI, scrivania: true }
  F.spazi = opz.spazi ?? {}
  const g = el('div', { class: 'griglia-riquadri' }), fatti = new Set()
  for (const r of R()) {
    if (r.nascosto || !contenuti[r.id]) continue
    if (r.gruppo && membri(r.gruppo).length < 2) r.gruppo = null // una cartella rimasta con una casella sola si scioglie subito
    if (!r.gruppo) { g.append(scatola(r.id, [r], contenuti, ridisegna)); continue }
    if (fatti.has(r.gruppo)) continue
    fatti.add(r.gruppo); g.append(scatola(r.gruppo, membri(r.gruppo), contenuti, ridisegna))
  }
  if (!g.childElementCount && opz.vuoto) g.append(opz.vuoto)
  else if (!g.childElementCount) g.append(el('div', { class: 'vuoto riquadri-vuoto' }, el('p', { testo: 'Questa scrivania è vuota: le card sono fra le icone qui sopra. Un clic ne apre una, e «Sulla scrivania» la mette qui.' })))
  // ogni volta che una casella cambia altezza (contenuto, rimpicciolita, allargata) si ricontano le sue righe
  osserva?.disconnect()
  osserva = new ResizeObserver(voci => voci.forEach(v => adatta(v.target)))
  for (const box of g.querySelectorAll(':scope > .riquadro')) osserva.observe(box)
  ordinabile(g, { fatto: ids => { riordina(ids); salva() }, unisci: (a, b) => { unisci(a, b); salva(); ridisegna() } })
  return g
}

// il nuovo ordine: una cartella porta con sé le sue caselle; le nascoste restano in fondo
function riordina (ids) {
  const in_ordine = ids.flatMap(id => gruppo(id) ? membri(id) : [riq(id)]).filter(Boolean)
  F.dove().riquadri = [...in_ordine, ...R().filter(r => !in_ordine.includes(r))]
}

// a (casella o cartella) lasciata al centro di b: vanno nella stessa cartella, e si vede quella appena entrata
function unisci (a, b) {
  const chi = gruppo(a) ? membri(a) : [riq(a)]
  let dove = gruppo(b)?.id
  if (!dove) { dove = nuovoId('gruppo'); riq(b).gruppo = dove; G().push({ id: dove, nome: 'Cartella', scelto: b }) }
  const capo = membri(dove)[0]
  chi.forEach(r => { r.gruppo = dove; r.larghezza = capo.larghezza; r.altezza = capo.altezza; r.piccolo = false })
  gruppo(dove).scelto = chi[0].id
  const resto = R().filter(r => !chi.includes(r)), ultimo = resto.lastIndexOf(membri(dove).filter(r => !chi.includes(r)).at(-1))
  F.dove().riquadri = [...resto.slice(0, ultimo + 1), ...chi, ...resto.slice(ultimo + 1)]
}

// una scatola: una casella sola, o una cartella con le schede; le misure stanno sulla prima casella
function scatola (id, lista, contenuti, ridisegna) {
  // la pagina completa di una card: un indirizzo, o una funzione che lo dà al momento (Piatto: dal suo riepilogo, prodotto.js);
  // gli spazi di questa griglia, presi adesso: F cambia quando si disegna un'altra stanza a caselle
  const spazi = F.spazi, spazio = c => { const x = spazi[c]; return typeof x === 'function' ? x() : x }
  const capo = lista[0], cart = lista.length > 1 ? gruppo(id) : null, mostrata = cart ? riq(cart.scelto) ?? capo : capo
  const titolo = cart ? cart.nome : F.titoli[capo.id]
  const misure = campi => { lista.map(r => riq(r.id)).filter(Boolean).forEach(r => Object.assign(r, campi)); salva() }
  const box = el('div', { class: 'riquadro' + (capo.piccolo ? ' piccolo' : '') + (cart ? ' cartella' : '') + (intero === id ? ' intero' : ''), 'data-id': id, 'data-colore': capo.colore ?? null,
    // «Adesso» (Marco, 24-11 sera: «fai che la prima si adatti veramente, se la metto piccola c'è tantissimo spazio vuoto sotto»): è
    // alta quanto il suo contenuto, sempre; l'altezza tirata con l'angolo vale per le altre caselle
    style: { '--larghezza': capo.larghezza, height: capo.altezza && !capo.piccolo && intero !== id && id !== 'adesso' ? capo.altezza + 'px' : null }, 'data-non-trascinare': intero === id ? '' : null })
  const tasto = (segno, etichetta, fai) => el('button', { type: 'button', class: 'riquadro-tasto', 'aria-label': `${etichetta}: ${titolo}`, title: etichetta, onclick: fai }, ic(segno))
  const comandi = el('div', { class: 'riquadro-comandi', 'data-non-trascinare': '' },
    tasto('sparkle', 'Colore', e => colori(e.currentTarget, capo.colore, colore => { misure({ colore }); ridisegna() })),
    // ⛶ apre la pagina completa della card (Marco, 23-11: «tutto widget e apribile per la vera pagina, che deve essere completa»);
    // solo chi una pagina non ce l'ha si allarga a schermo intero
    spazio(mostrata.id) && intero !== id
      ? tasto('corners-out', 'Apri la pagina completa', () => { location.hash = spazio(mostrata.id) })
      : tasto(intero === id ? 'x' : 'corners-out', intero === id ? 'Chiudi lo schermo intero' : 'A schermo intero', () => { intero = intero === id ? null : id; ridisegna() }),
    intero !== id && tasto(capo.piccolo ? 'plus' : 'minus', capo.piccolo ? 'Riapri' : 'Rimpicciolisci', () => { misure({ piccolo: !capo.piccolo }); ridisegna() }),
    intero !== id && tasto('x', cart ? `Togli «${F.titoli[mostrata.id]}»${F.scrivania ? ' dalla scrivania' : ''}` : F.scrivania ? 'Togli dalla scrivania' : 'Togli', () => { const m = riq(mostrata.id); if (m) { m.nascosto = true; m.gruppo = null; salva(); ridisegna() } }))
  if (cart) box.append(schede(cart, lista, mostrata, ridisegna))
  else if (capo.piccolo) box.append(el('div', { class: 'riquadro-striscia', testo: titolo }))
  box.append(comandi, el('div', { class: 'riquadro-corpo', hidden: capo.piccolo }, capo.piccolo ? null : contenuti[mostrata.id]()))
  if (!capo.piccolo && intero !== id) box.append(angolo(box, misure))
  // il doppio clic apre lo spazio della casella (Marco, 22-11: «facendo il doppio clic su una card voglio che si crei uno spazio
  // dedicato alla propria card… il calendario se cliccato due volte potrebbe aprire il calendario… la stessa cosa con tutte le card»):
  // la sua stanza se ce l'ha, se no la casella a schermo intero; non scatta sui pulsanti, sui campi e sulle task
  box.addEventListener('dblclick', e => {
    if (e.target.closest('button, a, input, textarea, select, label, [contenteditable], .casella-riga, .riquadro-angolo, .cifra-posto, .schede-cartella')) return
    getSelection()?.removeAllRanges()
    const dove = spazio(mostrata.id)
    if (dove && intero !== id) { location.hash = dove; return }
    intero = intero === id ? null : id; ridisegna()
  })
  return box
}

// i colori di una casella: un menu vicino al pulsante; «Nessuno» torna come prima
const NOMI_COLORI = { viola: 'Viola', blu: 'Blu', azzurro: 'Azzurro', verde: 'Verde', giallo: 'Giallo', arancio: 'Arancio', rosso: 'Rosso', rosa: 'Rosa', grigio: 'Grigio' }
const TINTE = { viola: '#8a6cef', blu: '#4f7cff', azzurro: '#38bdf8', verde: '#34d399', giallo: '#facc15', arancio: '#fb923c', rosso: '#f87171', rosa: '#f472b6', grigio: '#94a3b8' } // le stesse di su-misura.css
function colori (vicino, scelto, fai) {
  const r = vicino.getBoundingClientRect()
  import('./menu.js').then(m => m.apriMenu(r.left - 160, r.bottom + 4, [
    ...Object.entries(NOMI_COLORI).map(([c, nome]) => ({ testo: nome, segno: '●', colore: TINTE[c], scelta: scelto === c, fai: () => fai(c) })), '-',
    { testo: 'Nessun colore', scelta: !scelto, fai: () => fai(null) }], 'Il colore della casella'))
}

// le schede di una cartella: un clic mostra quella casella; si trascinano per cambiare l'ordine, e trascinata fuori dalla
// cartella una scheda torna una casella sola (anche con ⇱); il nome della cartella si cambia scrivendoci sopra.
// I pulsanti cercano la cartella e le caselle per id al momento del clic, così cambiano sempre la copia giusta.
function schede (cart, lista, mostrata, ridisegna) {
  const id = cart.id
  const barra = el('div', { class: 'schede-cartella', role: 'tablist', 'aria-label': cart.nome, 'data-non-trascinare': '' },
    el('input', { class: 'nome-cartella', value: cart.nome, 'aria-label': 'Nome della cartella', size: Math.max(6, cart.nome.length), onchange: e => { const g = gruppo(id); if (g) { g.nome = e.target.value.trim() || 'Cartella'; salva() } } }),
    ...lista.map(r => el('span', { class: 'scheda-cartella', 'data-id': r.id },
      el('button', { type: 'button', role: 'tab', 'aria-selected': String(r === mostrata), testo: F.titoli[r.id], onclick: () => { const g = gruppo(id); if (g) { g.scelto = r.id; salva(); ridisegna() } } }),
      el('button', { type: 'button', class: 'fuori', title: 'Tira fuori dalla cartella', 'aria-label': `Tira fuori ${F.titoli[r.id]} dalla cartella`, onclick: () => { estrai(id, r.id); salva(); ridisegna() } }, ic('arrow-square-out')))))
  ordinabile(barra, { asse: 'orizzontale', fatto: ids => { ordinaSchede(id, ids); salva(); ridisegna() }, fuori: chi => { estrai(id, chi); salva(); ridisegna() } })
  return barra
}

// il nuovo ordine delle schede: le caselle della cartella si scambiano i posti, le altre restano dove sono
function ordinaSchede (g, ids) {
  const posti = R().map((r, i) => r.gruppo === g ? i : -1).filter(i => i >= 0), nuove = ids.map(riq).filter(r => r?.gruppo === g)
  if (nuove.length === posti.length) posti.forEach((p, k) => { F.dove().riquadri[p] = nuove[k] })
}

// una scheda tirata fuori: torna una casella sola, subito dopo la sua cartella
function estrai (g, chi) {
  const r = riq(chi), cart = gruppo(g)
  if (!r || r.gruppo !== g) return
  const ultimo = membri(g).at(-1)
  r.gruppo = null
  if (cart?.scelto === chi) cart.scelto = membri(g)[0]?.id
  const resto = R().filter(x => x !== r), dopo = resto.indexOf(ultimo === r ? membri(g).at(-1) : ultimo)
  F.dove().riquadri = [...resto.slice(0, dopo + 1), r, ...resto.slice(dopo + 1)]
}

// l'angolo in basso a destra: la larghezza scatta a colonne, l'altezza a passi di 20 pixel
function angolo (box, misure) {
  const a = el('span', { class: 'riquadro-angolo', 'data-non-trascinare': '', title: 'Trascina per allargare · doppio clic: altezza automatica' })
  a.addEventListener('dblclick', () => { misure({ altezza: null }); box.style.height = '' })
  a.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation()
    const g = box.parentElement, gr = g.getBoundingClientRect(), b = box.getBoundingClientRect()
    const passo = (gr.width + parseFloat(getComputedStyle(g).columnGap || 0)) / 12
    box.classList.add('si-allarga')
    const muovi = m => {
      const col = Math.min(12, Math.max(3, Math.round((m.clientX - b.left) / passo))), alto = Math.min(2400, Math.max(100, Math.round((m.clientY - b.top) / 20) * 20))
      box.style.setProperty('--larghezza', col); box.style.height = alto + 'px'; box.dataset.misura = `${col}/12 · ${alto}px`
    }
    const lascia = () => {
      removeEventListener('pointermove', muovi); removeEventListener('pointerup', lascia)
      box.classList.remove('si-allarga'); delete box.dataset.misura
      misure({ larghezza: +box.style.getPropertyValue('--larghezza'), altezza: parseInt(box.style.height) || null })
    }
    addEventListener('pointermove', muovi); addEventListener('pointerup', lascia)
  })
  return a
}

// una casella che deve farsi vedere (una cosa scelta che sale in «Adesso»): se è dietro un'altra scheda della sua cartella,
// rimpicciolita o tolta, torna davanti. Ridà true se ha dovuto cambiare qualcosa (allora la scrivania si ridisegna).
export function mostraCasella (id) {
  if (!F.scrivania) return false
  const r = MISURA.d && scrivania() && riq(id)
  if (!r) return false
  let cambiato = false
  if (r.nascosto) { r.nascosto = false; r.gruppo = null; cambiato = true }
  const g = r.gruppo && gruppo(r.gruppo)
  if (g && g.scelto !== id) { g.scelto = id; cambiato = true }
  const lista = r.gruppo ? membri(r.gruppo) : [r]
  if (lista[0].piccolo) { lista.forEach(x => { x.piccolo = false }); cambiato = true }
  if (cambiato) salva()
  return cambiato
}

// Le icone delle card (Marco, 25-11 sera: «dalla dashboard principale mi fai delle icone con la card annessa, dove quando la clicco
// mi viene fuori»): in cima alla scrivania, un'icona per ogni card che non è sulla scrivania. Un clic apre la card sopra la scrivania,
// con tutto quello che fa; da lì si mette sulla scrivania (📌) o si apre la sua pagina completa. Così in Personalizza non serve aggiungere.
const SEGNI = { adesso: 'target', giorni: 'calendar-dots', cervello: 'notebook', progetti: 'folder-simple', 'senza-data': 'check-circle', scadute: 'check-square',
  accessi: 'squares-four', cerca: 'magnifying-glass', diario: 'book-open-text', conti: 'briefcase', gestionali: 'desktop', notizie: 'paper-plane-tilt',
  notifiche: 'bell', lavagne: 'pencil-simple', versioni: 'arrows-clockwise', programmi: 'sliders-horizontal', 'da-chiudere': 'check',
  // la Squadra
  punto: 'target', assegna: 'user-plus', lavoro: 'check-square', chat: 'paper-plane-right', storico: 'clock', persone: 'users-three', tue: 'check-circle',
  // Mirion Fit
  oggi: 'target', colazione: 'book-open-text', pranzo: 'book-open-text', cena: 'book-open-text', spuntini: 'book-open-text', pasti: 'book-open-text',
  peso: 'arrows-vertical', acqua: 'sparkle', sonno: 'clock', integratori: 'plus', allenamento: 'target', attivita: 'arrows-out', settimana: 'calendar-dots' }
export const segno = id => SEGNI[id] ?? 'squares-four'
let volante = null // la card aperta dall'icona, finché non la chiudi

// dove: la disposizione delle card (la scrivania, la Squadra, un'app come Mirion Fit: Marco, 25-11 sera: «fai la stessa cosa per
// una dashboard principale di tutte le aree del programma, con card immettibili dalla dashboard»)
export function iconeCard (contenuti, ridisegna, { titoli = TITOLI, spazi = {}, dove = scrivania, qui = 'Sulla scrivania' } = {}) {
  const fuori = (dove()?.riquadri ?? []).filter(r => r.nascosto && contenuti[r.id] && titoli[r.id])
  if (!fuori.length) return ''
  return el('nav', { class: 'icone-card', 'aria-label': 'Le altre card: un clic e si aprono' },
    ...fuori.map(r => el('button', { type: 'button', class: 'icona-card', 'data-id': r.id, title: titoli[r.id], 'aria-haspopup': 'dialog',
      onclick: () => apriCard(r.id, contenuti, ridisegna, { titoli, spazi, dove, qui }) }, el('span', { class: 'icona-card-segno' }, ic(segno(r.id))), el('span', { class: 'icona-card-nome', testo: titoli[r.id] }))))
}

export function apriCard (id, contenuti, ridisegna, { titoli = TITOLI, spazi = {}, dove = scrivania, qui = 'Sulla scrivania' } = {}) {
  chiudiCard()
  const x = spazi[id], pagina = typeof x === 'function' ? x() : x
  const chiudi = () => chiudiCard()
  const fondo = el('div', { class: 'card-volante-fondo', onclick: e => { if (e.target === fondo) chiudi() } })
  const metti = () => {
    const lay = dove(), r = lay?.riquadri.find(c => c.id === id)
    if (!r) return
    const resto = lay.riquadri.filter(c => c !== r)
    r.nascosto = false; r.gruppo = null; r.piccolo = false
    lay.riquadri = [...resto.filter(c => !c.nascosto), r, ...resto.filter(c => c.nascosto)] // in fondo alle card accese
    chiudi(); salva({ subito: true }); ridisegna()
  }
  const card = el('div', { class: 'card-volante riquadro', role: 'dialog', 'aria-modal': 'true', 'aria-label': titoli[id], 'data-id': id },
    el('header', { class: 'card-volante-cima' },
      el('span', { class: 'icona-card-segno' }, ic(segno(id))), el('h2', { testo: titoli[id] }),
      el('div', { class: 'card-volante-tasti' },
        el('button', { type: 'button', class: 'quieto piccolo', onclick: metti, title: 'Mettila qui, in fondo' }, ic('plus'), qui),
        pagina ? el('a', { class: 'quieto piccolo', href: pagina, onclick: () => chiudi(), title: 'La pagina completa' }, ic('corners-out'), 'Pagina') : null,
        el('button', { type: 'button', class: 'riquadro-tasto chiudi-card', 'aria-label': 'Chiudi', title: 'Chiudi (Esc)', onclick: chiudi }, ic('x')))),
    el('div', { class: 'riquadro-corpo' }, contenuti[id]()))
  fondo.append(card)
  document.body.append(fondo)
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); chiudi() } }
  addEventListener('keydown', esc, true)
  volante = { fondo, esc }
  card.querySelector('.chiudi-card').focus()
}
export function chiudiCard () {
  if (!volante) return
  volante.fondo.remove(); removeEventListener('keydown', volante.esc, true); volante = null
}
addEventListener('hashchange', chiudiCard)

// Esc chiude lo schermo intero
addEventListener('keydown', e => { if (e.key === 'Escape' && intero && !document.querySelector('[aria-modal="true"]:not([hidden])')) { intero = null; dispatchEvent(new CustomEvent('su-misura')) } })
export const aperta = () => intero

// per il tasto destro (tasto-destro.js): le stesse mosse dei pulsanti, chiamate per id; dopo ognuna la scrivania si ridisegna
export const mosse = {
  riq, membri, gruppo,
  lista: id => gruppo(id) ? membri(id) : [riq(id)].filter(Boolean),
  schermoIntero (id) { intero = intero === id ? null : id; avvisa() },
  misura (id, campi) { mosse.lista(id).forEach(r => Object.assign(r, campi)); salva(); avvisa() },
  togli (id) { const g = gruppo(id), r = riq(g ? g.scelto : id); if (r) { r.nascosto = true; r.gruppo = null; salva(); avvisa() } },
  estrai (g, chi) { estrai(g, chi); salva(); avvisa() },
  sciogli (g) { membri(g).forEach(r => { r.gruppo = null }); salva(); avvisa() },
  unisci (a, b) { unisci(a, b); salva(); avvisa() },
  mostra (g, chi) { const c = gruppo(g); if (c) { c.scelto = chi; salva(); avvisa() } },
}
