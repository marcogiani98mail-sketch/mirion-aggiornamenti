// Il calendario di Mirion (Marco, 21-11: «aprimi proprio un calendario dove posso mettere task, assegnarle, e l'informazione va
// anche su Obsidian, collegamento da ambo i lati»). Il mese in griglia: le task con la data (dalle note) e gli impegni di Google.
// Un clic su un giorno: a destra le sue task e il modulo per aggiungerne una (con a chi, nella squadra). Una task trascinata su un
// altro giorno si rimanda. Tutto è scritto nelle note: Obsidian vede le stesse cose, e quello che cambi lì torna qui.
import { el, api, notifica, oggiISO, nomeNota } from './base.js'
import { ic } from './icone.js'
import { casella, ORA_NEL_TESTO } from './casella.js'

let mese = oggiISO().slice(0, 7), scelto = oggiISO()
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
const pulito = t => t.replace(/📅\s*\S+/g, '').replace(ORA_NEL_TESTO, '').replace(/⏸️?\s*in pausa/, '').trim()
// nel giorno, prima quelle con l'ora (in ordine d'ora), poi le altre (Marco, 25-11)
export const perOra = (a, b) => (a.ora ?? '99') < (b.ora ?? '99') ? -1 : (a.ora ?? '99') > (b.ora ?? '99') ? 1 : 0
const sposta = (m, n) => { const [a, b] = m.split('-').map(Number), d = new Date(Date.UTC(a, b - 1 + n, 1)); return d.toISOString().slice(0, 7) }

export async function mostra (stanza) {
  let d; try { d = await api('/api/calendario?mese=' + mese) } catch (e) { return stanza.replaceChildren(el('p', { class: 'vuoto', testo: e.message })) }
  const rifai = () => mostra(stanza)
  const [a, m] = mese.split('-').map(Number), primo = new Date(Date.UTC(a, m - 1, 1)), giorni = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const vuoti = (primo.getUTCDay() + 6) % 7, celle = []
  for (let i = 0; i < vuoti; i++) celle.push(el('div', { class: 'cal-cella fuori', 'aria-hidden': 'true' }))
  for (let g = 1; g <= giorni; g++) {
    const data = `${mese}-${String(g).padStart(2, '0')}`, task = d.task.filter(k => k.data === data).sort(perOra), impegni = d.eventi.filter(e => e.giorno === data)
    const cella = el('button', { type: 'button', class: 'cal-cella' + (data === oggiISO() ? ' oggi' : '') + (data === scelto ? ' scelta' : ''), 'aria-label': `${g}: ${task.length} task, ${impegni.length} impegni`,
      onclick: () => { scelto = data; rifai() } },
      el('b', { testo: g }),
      ...impegni.slice(0, 2).map(e => el('span', { class: 'cal-impegno', testo: `${e.ora ?? ''} ${e.titolo ?? 'Impegno'}`.trim() })),
      ...task.slice(0, 3).map(k => el('span', { class: 'cal-task' + (k.stato === 'fatta' ? ' fatta' : ''), draggable: k.stato === 'aperta', title: pulito(k.testo),
        ondragstart: e => e.dataTransfer.setData('text/plain', JSON.stringify({ nota: k.nota, riga: k.riga, testo: k.testo })), testo: `${k.ora ? k.ora + ' ' : ''}${pulito(k.testo)}` })),
      task.length + impegni.length > 5 ? el('small', { testo: `e altre ${task.length + impegni.length - 5}` }) : null)
    // trascinare una task su un altro giorno la rimanda a quel giorno, nella sua nota
    cella.ondragover = e => { e.preventDefault(); cella.classList.add('sopra-qui') }
    cella.ondragleave = () => cella.classList.remove('sopra-qui')
    cella.ondrop = async e => { e.preventDefault(); cella.classList.remove('sopra-qui'); try { const k = JSON.parse(e.dataTransfer.getData('text/plain')); await api('/api/casella', { ...k, stato: 'rimanda', data }); notifica('Rimandata al ' + g + '.'); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) } }
    celle.push(cella)
  }
  const titolo = primo.toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  stanza.replaceChildren(el('div', { class: 'cal-stanza' },
    el('section', { class: 'cal-mese' },
      el('header', { class: 'cal-testa' }, el('h1', { testo: titolo[0].toUpperCase() + titolo.slice(1) }),
        el('div', { class: 'bottoni' },
          el('button', { type: 'button', class: 'secondario piccolo', 'aria-label': 'Il mese prima', onclick: () => { mese = sposta(mese, -1); rifai() } }, ic('arrow-left')),
          el('button', { type: 'button', class: 'secondario piccolo', testo: 'Oggi', onclick: () => { mese = oggiISO().slice(0, 7); scelto = oggiISO(); rifai() } }),
          el('button', { type: 'button', class: 'secondario piccolo', 'aria-label': 'Il mese dopo', onclick: () => { mese = sposta(mese, 1); rifai() } }, ic('arrow-right')),
          el('button', { type: 'button', class: 'secondario piccolo', title: 'Lo stesso mese in Google Calendar', onclick: () => window.open(`https://calendar.google.com/calendar/r/month/${a}/${m}/1`, '_blank', 'noopener') }, ic('calendar-dots'), 'Google Calendar'))),
      !d.collegato && el('p', { class: 'sopra piccolo' }, 'Gli impegni di Google qui non ci sono ancora: ', el('a', { href: '#impostazioni', testo: 'collega il calendario' }), '.'),
      el('div', { class: 'cal-griglia' }, ...GIORNI.map(n => el('span', { class: 'cal-nome', testo: n })), ...celle)),
    giorno(d, rifai)))
}

// il giorno scelto: le task (con tutto quello che si può fare a una casella), gli impegni, e una task nuova
function giorno (d, rifai) {
  const task = d.task.filter(k => k.data === scelto).sort(perOra), impegni = d.eventi.filter(e => e.giorno === scelto)
  const testo = el('input', { placeholder: 'Cosa c\'è da fare', 'aria-label': 'La task', required: true, maxlength: 300 }), ora = el('input', { type: 'time', 'aria-label': 'Alle (se c’è un’ora)', title: 'L’ora, se c’è: si cambia dopo dal ⋯ della task' })
  const chi = d.persone.length
    ? el('select', { 'aria-label': 'A chi' }, el('option', { value: '', testo: 'A me' }), ...d.persone.filter(p => p.id !== d.io).map(p => el('option', { value: p.id, testo: p.nome })))
    : el('input', { placeholder: 'A chi (se non è per te)', 'aria-label': 'A chi', maxlength: 40 })
  const nota = el('input', { placeholder: d.persone.length ? 'Nota (vuoto: il tuo calendario)' : 'Nota (vuoto: Delion/Calendario)', 'aria-label': 'In quale nota', maxlength: 120 })
  const quando = new Date(scelto + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return el('aside', { class: 'cal-giorno' },
    el('h2', { testo: quando[0].toUpperCase() + quando.slice(1) }),
    impegni.length ? el('ul', { class: 'cal-impegni' }, ...impegni.map(e => el('li', {}, el('b', { testo: e.ora ?? 'tutto il giorno' }), ' ', e.titolo ?? 'Impegno'))) : null,
    task.length ? el('ul', { class: 'caselle' }, ...task.map(k => k.stato === 'fatta' ? el('li', { class: 'casella-riga stato-fatta' }, el('span', { class: 'spunta ferma', 'aria-hidden': 'true' }), el('div', { class: 'casella-testo' }, el('s', { testo: pulito(k.testo) }), el('small', { testo: nomeNota(k.nota) }))) : casella(k, { mostraData: false, dopo: rifai })))
      : el('p', { class: 'vuoto', testo: 'Niente in questo giorno.' }),
    el('form', { class: 'campi-area cal-nuova', onsubmit: async e => {
      e.preventDefault()
      try { const r = await api('/api/calendario/task', { testo: testo.value, data: scelto, ora: ora.value || null, persona: chi.value, nota: nota.value }); notifica(`Aggiunta in ${nomeNota(r.nota)}: la vedi anche in Obsidian.`); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
    } }, el('h3', { testo: 'Una task per questo giorno' }), testo, ora, chi, nota, el('button', { class: 'primario', testo: 'Aggiungi' })))
}
