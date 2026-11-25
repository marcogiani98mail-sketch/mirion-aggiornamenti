// I progetti della scrivania (prima in scrivania.js): le cartelle con cose da fare, un clic apre il resoconto con tutte le task
// (Marco, 21-11: «i progetti fammeli aprire e fammi visualizzare tutte le task che ci sono»).
import { el, api, quando, nomeNota, STATO, apri, notifica } from './base.js'
import { ic } from './icone.js'
import { casella } from './casella.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'

// 4. i progetti in fila; un clic apre il resoconto
export function progetti (lista, stanza) {
  return el('section', { class: 'fascia progetti', 'aria-labelledby': 'prog-t' }, el('header', {}, el('h2', { id: 'prog-t', testo: 'I progetti' }), el('span', { class: 'sopra piccolo', testo: 'un clic per il resoconto' })),
    lista.length ? el('ul', { class: 'progetti-fila' }, ...lista.map((p, i) => el('li', { class: 'entra', style: { '--i': i } }, el('button', { type: 'button', onclick: () => resoconto(p.cartella), 'aria-label': `Resoconto di ${p.nome}` },
      el('div', { class: 'anello', style: { '--p': p.percento } }, el('span', { testo: p.percento + '%' })),
      el('div', {}, el('b', { testo: p.nome }), el('small', { testo: `${p.fatte} fatte, ${p.aperte} aperte` }), el('small', { testo: `toccato ${quando(p.ultima)}` }))))))
      : el('p', { class: 'vuoto', testo: 'Nessuna cartella di progetto con cose da fare.' }))
}

// i progetti in piccolo, a destra dei prossimi giorni in cima ad «Adesso» (Marco, 25-11 sera: «inserisci vicino al calendario, ma
// sulla parte destra, la sezione progetti, togliendo la card»): l'anello, il nome e quante cose restano; un clic apre il resoconto.
// Uno alla volta, con le frecce (Marco, 25-11 sera: «le notifiche quasi non si vedono per la quantità dei progetti… fammene
// visualizzare solo uno e poi metti le frecce»): quattro progetti in fila schiacciavano l'ultima notifica in mezzo
let progettoVisto = 0
export function progettiPiccoli (lista = []) {
  const aperti = lista.filter(p => p.aperte > 0)
  const chip = p => el('button', { type: 'button', class: 'progetto-piccolo', onclick: () => resoconto(p.cartella), title: `${p.nome}: ${p.fatte} fatte, ${p.aperte} aperte · un clic per il resoconto` },
    el('span', { class: 'anello', style: { '--p': p.percento } }), el('b', { testo: p.nome }), el('small', { testo: String(p.aperte) }))
  return el('div', { class: 'progetti-piccoli', role: 'group', 'aria-label': 'I progetti' },
    el('a', { class: 'sopra piccolo', href: '#scrivania?pagina=progetti', title: 'Tutti i progetti', testo: 'Progetti' }),
    aperti.length ? sfoglia(aperti, chip, { prima: 'Il progetto prima', dopo: 'Il progetto dopo', indice: () => progettoVisto, scegli: i => { progettoVisto = i } })
      : el('span', { class: 'sopra piccolo', testo: 'nessuno aperto' }))
}

// una cosa alla volta, con le frecce ai lati e «2 di 4» (i progetti e le notifiche in cima ad «Adesso»). Con una sola cosa le
// frecce non ci sono. Le frecce girano: dopo l'ultima torna la prima
export function sfoglia (voci, disegna, { prima = 'Quella prima', dopo = 'Quella dopo', indice = () => 0, scegli = () => {} } = {}) {
  const posto = el('span', { class: 'sfoglia-voce' }), conta = el('small', { class: 'sfoglia-conta', 'aria-live': 'polite' })
  const vai = i => { const n = ((i % voci.length) + voci.length) % voci.length; scegli(n); posto.replaceChildren(disegna(voci[n])); conta.textContent = `${n + 1} di ${voci.length}` }
  vai(indice())
  if (voci.length < 2) return el('span', { class: 'sfoglia' }, posto)
  const freccia = (verso, testo) => el('button', { type: 'button', class: 'sfoglia-freccia', title: testo, 'aria-label': testo, onclick: () => vai(indice() + verso) }, ic(verso < 0 ? 'caret-left' : 'caret-right'))
  return el('span', { class: 'sfoglia' }, freccia(-1, prima), posto, freccia(1, dopo), conta)
}

// le principali con sotto le loro sotto task (padre = la riga della principale, nella stessa nota)
function albero (lista, principale, figlia) {
  const qui = new Set(lista.map(k => k.nota + '|' + k.riga)), figli = new Map()
  for (const k of lista) if (k.padre && qui.has(k.nota + '|' + k.padre)) figli.set(k.nota + '|' + k.padre, [...(figli.get(k.nota + '|' + k.padre) ?? []), k])
  const ramo = (k, sotto) => [sotto ? figlia(k, true) : principale(k), ...(figli.get(k.nota + '|' + k.riga) ?? []).flatMap(f => ramo(f, true))]
  return lista.filter(k => !(k.padre && qui.has(k.nota + '|' + k.padre))).flatMap(k => ramo(k, false))
}

// il resoconto di un progetto: di cosa si tratta, cosa resta, le note, e il punto con l'IA
async function resoconto (cartella) {
  const d = await api('/api/progetto?c=' + encodeURIComponent(cartella))
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const chiudi = () => fondo.remove()
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Resoconto di ${d.nome}` },
    el('header', {}, el('div', { class: 'anello grande-anello', style: { '--p': d.percento } }, el('span', { testo: d.percento + '%' })),
      el('div', {}, el('h2', { testo: d.nome }), el('p', { class: 'sopra', testo: `${d.fatte} cose fatte, ${d.aperte} aperte · ${d.settimana} note toccate negli ultimi 7 giorni` })),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: chiudi }, ic('x'))),
    d.descrizione && el('p', { class: 'descrizione', testo: d.descrizione.replace(/^`|`$/g, '') }),
    el('div', { class: 'bottoni' }, ...pulsantiIA(ia => conIA.progetto(cartella, ia), { testo: 'Il punto con' }), d.note[0] && obsidian(d.note[0].nota)),
    // le istruzioni del progetto per Claude (le legge «Claude lavora da solo»), e con l'API le chat del progetto (claude.js, 25-11)
    STATO.app?.claude !== false || STATO.claudeApiAttiva ? el('div', { class: 'bottoni' },
      STATO.claudeApi && STATO.claudeApiAttiva ? el('a', { class: 'bottone secondario piccolo', href: '#claude?progetto=' + encodeURIComponent(cartella), onclick: chiudi }, ic('sparkle'), 'Le chat del progetto con Claude') : null,
      el('button', { type: 'button', class: 'secondario piccolo', onclick: async () => { try { const r = await api('/api/claude/istruzioni', { progetto: cartella }); await apri.obsidian(r.nota) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('notebook'), 'Istruzioni per Claude')) : null,
    // tutte le task, le sotto task sotto la loro principale (Marco, 21-11: «fammi visualizzare tutte le task che ci sono»)
    el('h3', { testo: `Da fare (${d.aperte}), prima quelle con la data` }),
    d.task.length ? el('ul', { class: 'caselle' }, ...albero(d.task, k => casella(k, { dopo: () => {} }), (k, f) => casella(k, { dopo: () => {}, figlia: f }))) : el('p', { class: 'vuoto', testo: 'Niente da fare: il progetto è in pari.' }),
    d.fatteLista.length ? el('details', { class: 'fatte-progetto' }, el('summary', { testo: `Fatte (${d.fatte})${d.fatte > d.fatteLista.length ? `, qui le ultime ${d.fatteLista.length}` : ''}` }),
      el('ul', { class: 'caselle' }, ...d.fatteLista.map(k => el('li', { class: 'casella-riga stato-fatta' }, el('span', { class: 'spunta ferma', 'aria-hidden': 'true' }), el('div', { class: 'casella-testo' }, el('s', { testo: k.testo.replace(/📅\s*\S+/, '').trim() }), el('small', { testo: nomeNota(k.nota) })))))) : null,
    el('h3', { testo: 'Le note, dalla più recente' }),
    el('ul', { class: 'note-progetto' }, ...d.note.map(n => el('li', {}, el('a', { href: '#cerca?n=' + encodeURIComponent(n.nota), onclick: chiudi, testo: n.nome }),
      el('span', { class: 'note-lati' }, el('small', { testo: `${quando(n.modificata)} · ${n.aperte} aperte, ${n.fatte} fatte` }), obsidian(n.nota, '')))))))
  document.body.append(fondo)
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { chiudi(); removeEventListener('keydown', esc) } })
  fondo.querySelector('.chiudi').focus()
}

