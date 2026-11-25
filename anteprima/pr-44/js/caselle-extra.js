// Le caselle in più della scrivania, da aggiungere dal pannello «Personalizza» (Marco, 20-11: «dargli la possibilità
// di aggiungerle o toglierle in base a come si lavora»): le scadute, i tuoi accessi, cerca (che lascia la barra a sinistra),
// il diario, le lavagne. Ognuna è una fascia come le altre, con il suo titolo.
import { el, api, STATO, nomeNota } from './base.js'
import { VERSIONI } from './versioni.js'
import { attiva as areaAttiva } from './aree.js'
import { casella } from './casella.js'
import { apriAccesso, icona } from './dock.js'
import { obsidian } from './ia.js'
import { scrivi, pulsanteResoconto, pulsanteManda, squadra } from './diario.js'
import { pulsantiChi, diChi } from './per-persona.js'

const fascia = (classe, titolo, ...dentro) => el('section', { class: 'fascia ' + classe, 'aria-label': titolo }, el('header', {}, el('h2', { testo: titolo })), ...dentro)

// il widget Task (Marco, 21-11 sera: «le task sostituisci il widget che c'è già»): le quattro viste della stanza Task, con il
// numero di ognuna; la lista della vista scelta, le sotto task sotto la principale; un filtro; «Tutte» apre la stanza
// Marco, 22-11: le senza data stanno qui (non più in una casella loro), e ci sono anche le fatte
const VISTE = { scadute: 'Scadute', dafare: 'Da fare', senzadata: 'Senza data', pausa: 'In pausa', valutare: 'Da valutare', archiviate: 'Archiviate', svolte: 'Fatte' }, PEZZO = 15
let vistaTask = 'scadute', chiTask = 'mie' // sulla scrivania, di partenza le tue (Marco, 22-11)
export function scadute (ricarica) {
  const viste = el('div', { class: 'viste viste-piccole', role: 'tablist', 'aria-label': 'Lo stato delle task' }), lista = el('ul', { class: 'caselle in-fila' }, el('li', { class: 'vuoto', testo: 'Leggo…' }))
  let t = null, filtro = ''
  const chi = el('div', { class: 'task-chi' })
  const campo = el('input', { type: 'search', class: 'filtro', placeholder: 'Filtra', 'aria-label': 'Filtra le task', oninput: e => { filtro = e.target.value.toLowerCase(); disegna() } })
  const disegna = () => {
    viste.replaceChildren(...Object.entries(VISTE).map(([id, nome]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === vistaTask), class: 'vista-' + id, onclick: () => { vistaTask = id; disegna() } }, el('b', { testo: t[id].filter(diChi(chiTask)).length }), el('span', { testo: nome }))))
    chi.replaceChildren(pulsantiChi(t.squadra, chiTask, s => { chiTask = s; disegna() }) ?? '')
    const tutte = t[vistaTask].filter(diChi(chiTask)).filter(k => !filtro || k.testo.toLowerCase().includes(filtro) || k.nota.toLowerCase().includes(filtro))
    const qua = new Set(tutte.map(k => k.nota + '|' + k.riga)), figlie = new Map()
    for (const k of tutte) if (k.padre && qua.has(k.nota + '|' + k.padre)) figlie.set(k.nota + '|' + k.padre, [...(figlie.get(k.nota + '|' + k.padre) ?? []), k])
    const ramo = (k, f) => [casella(k, { dopo: ricarica, figlia: f }), ...(figlie.get(k.nota + '|' + k.riga) ?? []).flatMap(c => ramo(c, true))]
    const principali = tutte.filter(k => !(k.padre && qua.has(k.nota + '|' + k.padre)))
    lista.replaceChildren(...principali.slice(0, PEZZO).flatMap(k => ramo(k, false)),
      principali.length > PEZZO ? el('li', {}, el('a', { href: '#scadute?vista=' + vistaTask, testo: `e altre ${principali.length - PEZZO} nella stanza Task` })) : '',
      tutte.length ? '' : el('li', { class: 'vuoto', testo: filtro ? 'Nessuna task con queste parole.' : `Nessuna task ${VISTE[vistaTask].toLowerCase()}.` }))
  }
  api('/api/task').then(d => { t = d; disegna() }).catch(e => lista.replaceChildren(el('li', { class: 'vuoto', testo: e.message })))
  return el('section', { class: 'fascia extra-scadute', 'aria-label': 'Task' },
    el('header', {}, el('h2', { testo: 'Task' }), el('a', { class: 'sopra piccolo', href: '#scadute', testo: 'Tutte, nella stanza Task' })), el('div', { class: 'task-testa' }, viste, campo), chi, lista)
}

// Lavoro: le tessere del preset, a un clic (il widget che prima si chiamava «I tuoi accessi»)
export function accessi () {
  const tutti = STATO.preset?.attivo?.accessi ?? []
  return fascia('extra-accessi', 'Lavoro',
    tutti.length ? el('ul', { class: 'accessi-fila' }, ...tutti.map(a => el('li', {}, el('button', { type: 'button', onclick: () => apriAccesso(a), title: a.nome }, icona(a), el('span', { testo: a.nome })))))
      : el('p', { class: 'vuoto' }, 'Nessun accesso: li scegli nella stanza ', el('a', { href: '#lavoro', testo: 'Lavoro' }), '.'),
    el('a', { class: 'sopra piccolo', href: '#lavoro', testo: 'Tutto il lavoro: le app per il computer, cambia gli accessi' }))
}

// la Lavagna come card (Marco, 25-11 sera: «togli anche la lavagna dalla sinistra e mettila come card apribile a schermo intero»):
// il pulsante apre la lavagna a tutto schermo; sotto, le ultime salvate, che si riaprono e si modificano
export function lavagne () {
  const lista = el('ul', { class: 'risultati-corti lavagne-corte' }, el('li', { class: 'vuoto', testo: 'Cerco le lavagne salvate…' }))
  api('/api/disegni').then(tutte => {
    const mie = tutte.filter(g => g.nome !== 'La lavagna').sort((a, b) => b.modificato - a.modificato).slice(0, 5)
    lista.replaceChildren(...(mie.length ? mie.map(g => el('li', {}, el('a', { href: '#lavagne?apri=' + encodeURIComponent(g.nome), testo: g.nome }),
      el('small', { testo: new Date(g.modificato).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })))
      : [el('li', { class: 'vuoto', testo: 'Ancora nessuna lavagna salvata.' })]))
  }).catch(() => lista.replaceChildren(el('li', { class: 'vuoto', testo: 'Non riesco a leggere le lavagne salvate.' })))
  return fascia('extra-lavagne', 'Lavagna',
    el('a', { class: 'primario', href: '#lavagne', testo: 'Apri la lavagna a schermo intero' }), lista)
}

// cerca: le note per parola, senza lasciare la scrivania; un clic apre il lettore
export function cerca () {
  const lista = el('ul', { class: 'risultati-corti' })
  let timer = null
  const campo = el('input', { type: 'search', placeholder: 'Cerca nelle note…', 'aria-label': 'Cerca nelle note', oninput: e => {
    clearTimeout(timer); const q = e.target.value
    timer = setTimeout(async () => {
      if (q.trim().length < 2) return lista.replaceChildren()
      const r = await api('/api/cerca?q=' + encodeURIComponent(q)).catch(() => [])
      lista.replaceChildren(...r.slice(0, 8).map(x => el('li', {}, el('a', { href: '#cerca?n=' + encodeURIComponent(x.nota), testo: nomeNota(x.nota) }), el('small', { testo: x.pezzo }), obsidian(x.nota, ''))),
        ...(r.length ? [] : [el('li', { class: 'vuoto', testo: 'Nessuna nota con queste parole.' })]))
    }, 250)
  } })
  return fascia('extra-cerca', 'Cerca', campo, lista)
}


// il diario: le ultime righe di oggi e il campo per scriverne un'altra; «Tutto il diario» apre la stanza
export function diario () {
  const righe = el('ul', { class: 'diario-righe' }, el('li', { class: 'vuoto', testo: 'Leggo…' }))
  const carica = () => api('/api/diario').then(d => {
    const ultime = (d.testo ?? '').split(/\r?\n/).filter(r => /^\s*[-*] /.test(r)).slice(-6).map(r => r.replace(/^\s*[-*] /, ''))
    righe.replaceChildren(...(ultime.length ? ultime.map(r => el('li', { testo: r })) : [el('li', { class: 'vuoto', testo: 'Oggi non hai ancora scritto niente.' })]))
  }).catch(e => righe.replaceChildren(el('li', { class: 'vuoto', testo: e.message })))
  carica()
  const tutto = el('a', { class: 'sopra piccolo', href: '#diario', testo: 'Tutto il diario' }), piede = el('div', { class: 'diario-piede' }, pulsanteResoconto(carica, 'quieto'), tutto)
  squadra().then(sq => { if (sq) piede.insertBefore(pulsanteManda(sq, 'quieto'), tutto) }) // nella squadra: anche «Manda il diario»
  // la seconda vista (Marco, 23-11: «su Piatto il diario integrabile nel diario della scrivania come seconda visualizzazione
  // all'interno della card»): i software che danno i numeri del giorno (Piatto) hanno una scheda accanto a «Diario»
  const mio = el('div', { class: 'diario-vista' }, scrivi(carica), righe, piede), vista = el('div', {}, mio)
  const schede = el('div', { class: 'per-persona diario-schede', role: 'tablist', 'aria-label': 'Quale diario' })
  const scegli = async (b, cosa) => {
    schede.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', String(x === b)))
    if (!cosa) return vista.replaceChildren(mio)
    vista.replaceChildren(el('p', { class: 'vuoto', testo: 'Leggo…' }))
    const { vistaOggi } = await import('./prodotto.js')
    const r = await api('/api/prodotti/riepilogo?id=' + encodeURIComponent(cosa.id)).catch(e => ({ errore: e.message }))
    vista.replaceChildren(...[].concat(vistaOggi(cosa, r, () => scegli(b, cosa))), el('a', { class: 'sopra piccolo', href: '#prodotto?id=' + encodeURIComponent(cosa.id), testo: `La scrivania di ${cosa.nome}` }))
  }
  api('/api/prodotti').then(d => {
    const conOggi = (d.prodotti ?? []).filter(p => p.riepilogo)
    if (!conOggi.length) return
    const tuo = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', onclick: e => scegli(e.currentTarget, null) }, 'Diario')
    schede.replaceChildren(tuo, ...conOggi.map(p => el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: e => scegli(e.currentTarget, p) }, p.nome)))
  }).catch(() => {})
  return fascia('extra-diario', 'Diario', schede, vista)
}


// il registro delle versioni (Marco, 23-11 sera: «crea un registro versioni nell'app… solo nella mia dashboard e per ora in quella di
// Sava: lo storico dei cambiamenti»): sulla scrivania le ultime tre, nella sua pagina completa tutte. Si vede solo nel cervello di
// squadra (Marco e Sava); chi userà Mirion da solo, più avanti, non la vede
export function versioni (tutte = false) {
  const qui = STATO.versione
  if (areaAttiva()?.tipo && areaAttiva().tipo !== 'squadra') return el('section', { class: 'fascia versioni' }, el('header', {}, el('h2', { testo: 'Le versioni' })), el('p', { class: 'vuoto', testo: 'Il registro delle versioni è per la squadra di Mirion.' }))
  const voci = tutte ? VERSIONI : VERSIONI.slice(0, 3)
  return el('section', { class: 'fascia versioni', 'aria-label': 'Le versioni' },
    el('header', {}, el('h2', { testo: 'Le versioni' }), el('span', { class: 'sopra piccolo', testo: qui ? `su questo computer la ${qui}` : 'lo storico dei cambiamenti' })),
    el('ol', { class: 'versioni-elenco' }, ...voci.map(v => el('li', { class: v.versione === qui ? 'questa' : '' },
      el('div', { class: 'versione-testa' }, el('b', { testo: v.versione }), el('span', { testo: v.titolo }), el('small', { class: 'sopra', testo: new Date(v.data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + (v.versione === qui ? ' · questa' : '') })),
      el('ul', {}, ...v.novita.map(t => el('li', { testo: t })))))),
    !tutte && VERSIONI.length > 3 ? el('a', { class: 'quieto piccolo', href: '#scrivania?pagina=versioni' }, `Tutte le versioni (${VERSIONI.length})`) : null)
}
