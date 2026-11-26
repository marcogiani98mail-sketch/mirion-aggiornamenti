// Tre card della scrivania (la terza, il centro notifiche, è in fondo) (Marco, 23-11-2026: «metti tutto in una card per la scrivania… una card Studio PT… card anche delle notizie»).
// - «Studio PT»: il prodotto in un colpo d'occhio, dal cervello: cosa fa, dov'è online, i tasti per aprirlo, la nota e la ricerca,
//   le cose da fare della sua nota (con i gesti di sempre) e le notizie che lo riguardano.
// - «Notizie»: le ultime notizie lette e scremate (server/notizie.mjs), con quanto c'entrano; un clic apre la nota, «Tutte» la stanza.
// Il doppio clic apre lo spazio della card (SPAZI in scrivania.js): il gestionale, o la stanza Notizie.
import { el, api, notifica, quando, STATO, AVVISI } from './base.js'
import { ic } from './icone.js'
import { casella } from './casella.js'

const fascia = (classe, titolo, sopra, ...dentro) => el('section', { class: 'fascia ' + classe, 'aria-label': titolo },
  el('header', {}, el('h2', { testo: titolo }), sopra), ...dentro)

const NOTA_PT = 'Condiviso/Progetti/Studio PT/Studio PT.md'
const RICERCA_PT = 'Condiviso/Progetti/Studio PT/Ricerca sulle app per PT e palestre.md'
const CARTELLA_PT = 'Condiviso/Progetti/Studio PT/'
const leggi = n => '#cerca?n=' + encodeURIComponent(n)

// le notizie si leggono una volta per disegno della scrivania, per tutte e due le card
let notizie = null
const leggiNotizie = (fresche = false) => { if (!notizie || fresche) notizie = api('/api/notizie').then(d => d.notizie ?? []).catch(() => null); return notizie }

const rigaNotizia = n => el('li', { class: 'notizia-breve' },
  el('b', { class: 'notizia-punti', title: 'Quanto c’entra: più parole chiave diverse trova, più è alto', testo: n.punteggio }),
  el('div', {}, el('a', { href: leggi(n.rel), testo: n.titolo }),
    el('small', { class: 'sopra', testo: [n.fonte, n.aggiunta ? quando(n.aggiunta) : null, n.progetto].filter(Boolean).join(' · ') })),
  n.link ? el('button', { type: 'button', class: 'quieto piccolo', title: 'Apri la pagina', 'aria-label': `Apri la pagina di «${n.titolo}»`, onclick: () => window.open(n.link, '_blank', 'noopener') }, ic('arrow-square-out')) : null)

// la card «Studio PT». s: i dati della scrivania (/api/scrivania), per le cose da fare
export function casellaStudioPT (s, ricarica) {
  const testa = el('div', { class: 'prodotto-testa' }, el('p', { class: 'sopra', testo: 'Leggo Claudio…' }))
  const tasti = el('div', { class: 'bottoni' })
  const notizieBox = el('div')
  // le cose da fare della nota di Studio PT, con data e senza, come le vede chi usa Mirion
  const daFare = [...(s.prossime ?? []), ...(s.senzaData ?? [])].filter(k => k.nota?.startsWith(CARTELLA_PT))
  const lista = daFare.length
    ? el('div', {}, el('ul', { class: 'caselle in-fila' }, ...daFare.slice(0, 6).map(k => casella(k, { dopo: ricarica }))),
      daFare.length > 6 ? el('a', { class: 'sopra piccolo', href: leggi(NOTA_PT), testo: `e altre ${daFare.length - 6}: le trovi nella nota` }) : null)
    : el('p', { class: 'vuoto', testo: 'Niente da fare per Claudio nei prossimi giorni.' })
  api('/api/prodotti').then(d => {
    const p = (d.prodotti ?? []).find(x => x.id === 'studio-pt')
    if (!p) return testa.replaceChildren(el('p', { class: 'vuoto', testo: 'Claudio (studio-pt) non è in .delion/prodotti.json.' }))
    testa.replaceChildren(
      el('p', { testo: p.descrizione ?? '' }),
      el('p', { class: 'sopra' }, p.acceso ? 'acceso su questo computer' : p.programma?.ce ? 'pronto da accendere' : 'il programma non è su questo computer',
        p.online ? [' · online: ', el('span', { class: 'prodotto-link', testo: p.online.replace(/^https?:\/\//, '').replace(/\/$/, '') }), ' (chiede il login del team Netlify)'] : null))
    tasti.replaceChildren(
      el('a', { class: 'primario piccolo', href: '#gestionale?id=studio-pt', 'aria-disabled': String(!p.programma?.ce && !p.online) }, ic('arrow-right'), 'Apri'),
      p.online ? el('button', { type: 'button', class: 'secondario piccolo', onclick: () => api('/api/prodotti/apri', { id: p.id, dove: 'online' }).catch(e => notifica(e.message, { tipo: 'sempre' })) }, ic('arrow-up-right'), 'Online') : null,
      el('a', { class: 'quieto piccolo', href: leggi(NOTA_PT) }, ic('notebook'), 'La nota'),
      el('a', { class: 'quieto piccolo', href: leggi(RICERCA_PT) }, ic('magnifying-glass'), 'La ricerca'))
  }).catch(e => testa.replaceChildren(el('p', { class: 'vuoto', testo: 'Non riesco a leggere i gestionali: ' + e.message })))
  leggiNotizie(true).then(ns => {
    const sue = (ns ?? []).filter(n => n.progetto === 'Studio PT').slice(0, 3)
    notizieBox.replaceChildren(...(sue.length ? [el('h3', { class: 'sopra piccolo', testo: 'Notizie su Claudio' }), el('ul', { class: 'notizie-brevi' }, ...sue.map(rigaNotizia))] : []))
  })
  // il nome che si vede: «Claudio» per ora (Marco, 23-11), l'id della card resta «studio-pt»
  return fascia('studio-pt', 'Claudio', el('span', { class: 'sopra piccolo', testo: 'l’app per personal trainer, studi e palestre' }),
    testa, tasti, el('h3', { class: 'sopra piccolo', testo: `Da fare (${daFare.length})` }), lista, notizieBox)
}

// la card «Notizie»: tutto sulla scrivania (Marco, 23-11: «non voglio che sia nella barra di sinistra, la voglio nella scrivania»):
// le ultime notizie, «Cerca adesso», quando arrivano da sole, il campo per un link e le parole chiave a tag. I pezzi sono quelli
// della stanza Notizie (notizie.js), che resta per vederle tutte: si apre con il doppio clic sulla card o con «Tutte».
export function casellaNotizie () {
  const corpo = el('div', { class: 'notizie-card' }, el('p', { class: 'vuoto', testo: 'Leggo le notizie…' }))
  const tasti = el('span', { class: 'bottoni' })
  const disegna = async () => {
    try {
      const [d, m] = await Promise.all([api('/api/notizie'), import('./notizie.js')])
      notizie = Promise.resolve(d.notizie ?? []) // le altre card (Studio PT, Notifiche) vedono le stesse
      tasti.replaceChildren(m.cercaAdesso(disegna), el('a', { class: 'quieto piccolo', href: '#notizie', title: 'Tutte le notizie, per progetto' }, 'Tutte'))
      corpo.replaceChildren(
        m.rigaAuto(d, disegna),
        d.notizie.length ? el('ul', { class: 'notizie-brevi' }, ...d.notizie.slice(0, 5).map(rigaNotizia)) : el('p', { class: 'vuoto', testo: 'Ancora nessuna notizia: premi «Cerca adesso», o aspetta la prossima ricerca.' }),
        m.campoLink(d, disegna),
        el('details', { class: 'notizie-dettagli' }, el('summary', { testo: `Parole chiave (${d.parole.length})` }), m.tagParole(d)),
        el('details', { class: 'notizie-dettagli' }, el('summary', { testo: `Personalizza: da dove, quanto vecchie, quanto severo${d.automatiche?.fonti?.length ? ` · ${d.automatiche.fonti.length} fonti tue` : ''}` }), m.personalizza(d, disegna)))
    } catch (e) { corpo.replaceChildren(el('p', { class: 'vuoto', testo: 'Le notizie non si leggono adesso: ' + e.message })) }
  }
  disegna()
  return fascia('notizie-casella', 'Notizie', tasti, corpo)
}

// il centro notifiche (Marco, 23-11-2026: «metti anche un centro notifiche… così se c'è una versione nuova la facciamo»):
// in un posto solo quello che aspetta una mano. In cima la versione nuova di Mirion con «Aggiorna», poi le novità della squadra,
// le task scadute, le notizie di oggi, le cose di Studio PT in scadenza; in fondo gli ultimi avvisi di questa apertura di Mirion.
export function casellaNotifiche (s, { tutte: subito = false } = {}) { // subito: tutte, nella sua pagina completa
  const lista = el('ul', { class: 'centro-notifiche' }, el('li', { class: 'vuoto', testo: 'Guardo cosa c’è…' }))
  const voce = (icona, testo, dove, tasto) => el('li', { class: 'notifica-voce' }, el('span', { class: 'notifica-icona', 'aria-hidden': 'true' }, ic(icona)),
    el('div', {}, dove ? el('a', { href: dove, testo }) : el('span', { testo })), tasto ?? null)
  const domani = new Date(s.oggi + 'T12:00'); domani.setDate(domani.getDate() + 2)
  const vicine = [...(s.prossime ?? [])].filter(k => k.nota?.startsWith(CARTELLA_PT) && k.data && k.data <= domani.toISOString().slice(0, 10))
  Promise.all([api('/api/aggiornamenti').catch(() => null), leggiNotizie()]).then(([agg, ns]) => {
    const voci = []
    if (agg?.nuova) {
      voci.push(voce('arrows-clockwise', `C’è Mirion ${agg.ultima} (hai la ${agg.versione})${agg.note ? ': ' + agg.note.split('\n')[0] : ''}`, null,
        el('button', { type: 'button', class: 'primario piccolo', onclick: () => import('./aggiornamento.js').then(m => m.aggiornaOra()) }, 'Aggiorna')))
    }
    if (STATO.novitaSquadra) voci.push(voce('users-three', `${STATO.novitaSquadra} novità dalla squadra`, '#scrivania?sezione=squadra'))
    if (s.scadute) voci.push(voce('warning', `${s.scadute} ${s.scadute === 1 ? 'task scaduta' : 'task scadute'}`, '#scadute'))
    if (vicine.length) voci.push(voce('target', `Claudio: ${vicine.length} ${vicine.length === 1 ? 'cosa da fare' : 'cose da fare'} entro dopodomani`, leggi(NOTA_PT)))
    const nuove = (ns ?? []).filter(n => n.aggiunta === s.oggi)
    if (nuove.length) voci.push(voce('book-open-text', `${nuove.length} ${nuove.length === 1 ? 'notizia nuova' : 'notizie nuove'} oggi`, '#notizie'))
    if (!voci.length) voci.push(el('li', { class: 'vuoto', testo: agg?.attivo ? `Niente che aspetta: Mirion ${agg.versione} è aggiornata.` : 'Niente che aspetta.' }))
    lista.replaceChildren(...voci, archivio)
  })
  // tutte le notifiche (Marco, 23-11: «rendi tutte le notifiche possibili sull'area Notifiche, così si hanno»): l'archivio
  // del server (notifiche.mjs), anche quelle dei giorni prima; le non lette in evidenza, «Segna tutte lette», «Mostra tutte»
  const archivio = el('li', { class: 'notifiche-archivio' })
  let tutte = subito
  const ICONE = { squadra: 'users-three', notizie: 'book-open-text', aggiornamenti: 'arrows-clockwise', task: 'check-square', calendario: 'calendar-dots', software: 'squares-four', ia: 'sparkle', errore: 'warning' }
  const quandoBreve = ms => { const d = new Date(ms), oggi = new Date().toDateString() === d.toDateString(); return oggi ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }
  const disegnaArchivio = async () => {
    let r; try { r = await api('/api/notifiche?quante=' + (tutte ? 400 : 12)) } catch { return archivio.replaceChildren() }
    archivio.replaceChildren(
      el('div', { class: 'archivio-testa' }, el('b', { class: 'sopra piccolo', testo: `Tutte le notifiche${r.nonLette ? ` · ${r.nonLette} da leggere` : ''}` }),
        r.nonLette ? el('button', { type: 'button', class: 'quieto piccolo', onclick: async () => { await api('/api/notifiche/lette', {}).catch(() => {}); disegnaArchivio() } }, 'Segna tutte lette') : null),
      r.voci.length ? el('ul', { class: 'archivio-lista' }, ...r.voci.map(n => el('li', { class: 'avviso-passato' + (n.letta ? '' : ' da-leggere') + (n.tipo === 'sempre' ? ' importante' : '') },
        el('span', { class: 'notifica-icona', 'aria-hidden': 'true' }, ic(ICONE[n.fonte] ?? 'bell')),
        el('small', { class: 'sopra', testo: quandoBreve(n.quando) }),
        n.dove ? el('a', { href: n.dove, testo: n.testo + (n.volte > 1 ? ` (×${n.volte})` : '') }) : el('span', { testo: n.testo + (n.volte > 1 ? ` (×${n.volte})` : '') }))))
        : el('p', { class: 'vuoto', testo: 'Ancora nessuna notifica.' }),
      r.tutte > r.voci.length || tutte ? el('button', { type: 'button', class: 'quieto piccolo', onclick: () => { tutte = !tutte; disegnaArchivio() } }, tutte ? 'Mostra solo le ultime' : `Mostra tutte (${r.tutte})`) : '') // non null: replaceChildren lo scriverebbe
  }
  disegnaArchivio()
  return fascia('notifiche-casella', 'Notifiche', el('span', { class: 'sopra piccolo', testo: 'quello che aspetta una mano, e tutte le notifiche' }), lista)
}
