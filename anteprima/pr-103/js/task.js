// La stanza Task (prima «Scadute»; Marco, 20-11: «non chiamarle scadute, chiamale task… le note hanno uno stato…
// ci sono quelle archiviate, quelle scadute, quelle in pausa e quelle no»). Quattro viste, ognuna con il suo conto:
// scadute (per periodo), da fare (prima con la data), in pausa (⏸️ o nota «in pausa»), archiviate ([-] o nota archiviata o chiusa).
// Ogni gesto scrive nella nota; le liste lunghe si mostrano a pezzi.
import { el, api, oggiISO, piu, quando, nomeNota } from './base.js'
import { casella } from './casella.js'
import { bollino } from './app.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'
import { pulsantiChi, diChi } from './per-persona.js'

const PEZZO = 60
const VISTE = {
  scadute: { nome: 'Scadute', spiega: 'Le cose aperte con la data passata. Fatte, rimandale, mettile in pausa o archiviale.' },
  dafare: { nome: 'Da fare', spiega: 'Le cose aperte che non sono scadute: prima quelle con la data, poi quelle senza. Sono queste che la scrivania ti propone.' },
  // Marco, 22-11: «metti le senza data nelle task» · «dammi un appunto anche su tutte le task già svolte»
  senzadata: { nome: 'Senza data', spiega: 'Le cose aperte senza un giorno. Dagliene uno dal ⋯, o falle quando capita.' },
  pausa: { nome: 'In pausa', spiega: 'Hanno ⏸️ nella riga, o stanno in una nota con «stato: in pausa». Mirion non te le propone finché non le riprendi.' },
  // Marco, 25-11: quando Mirion chiede se una nascosta è una task, o se una task è fatta, oltre a sì e no c'è «Da valutare»
  valutare: { nome: 'Da valutare', spiega: 'Hanno «#da-valutare» nella riga: né sì né no, le decidi quando hai tempo. Dal ⋯: «È da fare», «Non serve più», o spuntala se è fatta. Mirion non te le propone finché non le valuti.' },
  archiviate: { nome: 'Archiviate', spiega: 'Le caselle segnate [-] e quelle delle note archiviate o chiuse. Restano nelle note; da qui le riapri.' },
  svolte: { nome: 'Fatte', spiega: 'Le task già fatte, segnate [x] nelle note (le vede anche Claude). Una spuntata per sbaglio si riapre con ↺.' },
}
let vista = 'scadute', filtro = '', mostrate = PEZZO, chiScelta = 'tutte' // nella squadra: di chi (per-persona.js)

export async function mostra (stanza, parametri) {
  if (VISTE[parametri?.get('vista')]) vista = parametri.get('vista')
  let d = await api('/api/task')
  api('/api/task/viste', {}).then(bollino).catch(() => {}) // le hai viste: il numerino su «Task» si spegne
  const corpo = el('div', { class: 'fasce-scrivania' }), banner = el('section', { class: 'banner' })
  // dopo un gesto la riga esce subito; i conti e le altre viste si aggiornano dal vault, senza ridisegnare la lista
  const tolta = k => { for (const v of Object.keys(VISTE)) d[v] = d[v].filter(x => x !== k); bollino(); disegnaBanner(); api('/api/task').then(n => { d = n; disegnaBanner() }).catch(() => {}) }
  const scegli = v => { vista = v; mostrate = PEZZO; history.replaceState(null, '', '#scadute?vista=' + v); disegnaBanner(); disegna() }

  const disegnaBanner = () => {
    // il riquadro con la scaduta più recente solo se è nuova (non vista l'ultima volta); se no, la spiegazione della vista
    const prima = vista === 'scadute' ? d.scadute.find(k => k.nuova) : null
    banner.replaceChildren(
      el('div', { class: 'banner-saluto' }, el('p', { class: 'sopra', testo: 'Le cose da fare del cervello, per stato' }), el('h1', { testo: 'Task' }),
        el('div', { class: 'viste', role: 'tablist', 'aria-label': 'Lo stato delle task' }, ...Object.entries(VISTE).map(([id, v]) =>
          el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === vista), class: 'vista-' + id, onclick: () => scegli(id) }, el('b', { testo: d[id].filter(diChi(chiScelta)).length.toLocaleString('it-IT') }), el('span', { testo: v.nome })))),
        pulsantiChi(d.squadra, chiScelta, s => { chiScelta = s; mostrate = PEZZO; disegnaBanner(); disegna() }, s => d[vista].filter(diChi(s)).length),
        el('p', { class: 'sopra piccolo', testo: `e ${d.fatte.toLocaleString('it-IT')} già fatte` }),
        el('input', { type: 'search', class: 'filtro', placeholder: 'Filtra per parola o per nota', 'aria-label': 'Filtra le task', value: filtro, oninput: e => { filtro = e.target.value; mostrate = PEZZO; disegna() } })),
      el('div', { class: 'banner-adesso' }, ...(prima ? [
        el('h2', { testo: 'Scaduta da quando hai guardato l\'ultima volta' }), el('p', { class: 'grande', testo: prima.testo.replace(/📅\s*\S+/, '').replace(/\s?⏰\s*(?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}[:.]\d{2}/u, '').trim() }),
        el('p', { class: 'sopra', testo: `scaduta ${quando(prima.data)} · ${nomeNota(prima.nota)}` }),
        el('div', { class: 'bottoni' }, ...pulsantiIA(ia => conIA.compito(prima, ia)), obsidian(prima.nota))]
        : [el('h2', { testo: VISTE[vista].nome }), el('p', { class: 'grande', testo: vista === 'scadute' ? (d.scadute.length ? 'Niente di nuovo da quando le hai guardate. Le scadute di prima sono qui sotto.' : 'Nessuna cosa da fare ha la data passata.') : VISTE[vista].spiega })])))
  }

  // le fasce della vista: le scadute per periodo, le da fare con e senza data, le altre in una fascia sola
  const fasce = () => {
    const oggi = oggiISO(), settimana = piu(oggi, -7), mese = piu(oggi, -31), fra7 = piu(oggi, 7)
    if (vista === 'scadute') return [['Nell\'ultima settimana', k => k.data >= settimana], ['Nell\'ultimo mese', k => k.data < settimana && k.data >= mese], ['Più vecchie', k => k.data < mese]]
    if (vista === 'dafare') return [['Nei prossimi 7 giorni', k => k.data && k.data <= fra7], ['Più avanti', k => k.data > fra7], ['Senza data', k => !k.data]]
    return [[VISTE[vista].nome, () => true]]
  }

  const disegna = () => {
    const q = filtro.toLowerCase(), tutteViste = d[vista].filter(diChi(chiScelta)).filter(k => !q || k.testo.toLowerCase().includes(q) || k.nota.toLowerCase().includes(q))
    // task principali e sotto task (Marco, 21-11): una sotto task la cui principale è nella stessa vista si mostra sotto di lei
    const qua = new Set(tutteViste.map(k => k.nota + '|' + k.riga)), figlie = new Map()
    for (const k of tutteViste) if (k.padre && qua.has(k.nota + '|' + k.padre)) { const p = k.nota + '|' + k.padre; figlie.set(p, [...(figlie.get(p) ?? []), k]) }
    const viste = tutteViste.filter(k => !(k.padre && qua.has(k.nota + '|' + k.padre)))
    const ramo = (k, livello = 0) => [casella(k, { dopo: s => ['sotto', 'chi', 'torna'].includes(s) ? mostra(stanza) : tolta(k), figlia: livello > 0 }), ...(figlie.get(k.nota + '|' + k.riga) ?? []).flatMap(f => ramo(f, livello + 1))]
    // la principale con le sue sotto task sta in un riquadro solo, così nella griglia a colonne restano insieme
    const conFiglie = k => { const r = ramo(k); return r.length === 1 ? r : [el('li', { class: 'gruppo-task' }, el('ul', { class: 'caselle' }, ...r))] }
    let resto = mostrate
    const sezioni = fasce().map(([nome, dentro]) => {
      const tutte = viste.filter(dentro), qui = tutte.slice(0, Math.max(0, resto)); resto -= qui.length
      return tutte.length ? el('section', { class: 'fascia' }, el('header', {}, el('h2', { testo: `${nome} (${tutte.length.toLocaleString('it-IT')})` })),
        qui.length ? el('ul', { class: 'caselle in-fila alte' }, ...qui.flatMap(k => conFiglie(k))) : el('p', { class: 'sopra piccolo', testo: 'Più giù: «Mostrane altre».' })) : null
    }).filter(Boolean)
    const mancano = viste.length - mostrate
    corpo.replaceChildren(...[banner, ...sezioni,
      mancano > 0 && el('button', { type: 'button', class: 'secondario altre', testo: `Mostrane altre ${Math.min(PEZZO, mancano)} (ne restano ${mancano.toLocaleString('it-IT')})`, onclick: () => { mostrate += PEZZO; disegna() } }),
      !viste.length && el('p', { class: 'vuoto grande', testo: d[vista].length ? 'Nessuna task con queste parole.' : `Nessuna task ${VISTE[vista].nome.toLowerCase()}.` })].filter(Boolean))
  }
  disegnaBanner()
  stanza.replaceChildren(corpo)
  disegna()
}
