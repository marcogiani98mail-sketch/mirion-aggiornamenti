// La scrivania, a riquadri che si spostano e si allargano come widget (Marco, 20-11); di partenza a fasce una sotto l'altra (Marco, 19-11: «un banner bello lungo… sotto solo orizzontali»):
// 1. il banner «Adesso», da un capo all'altro, con «Fallo con…» le IA che usi e «Apri in Obsidian»;
// 2. i prossimi giorni: le caselle dei giorni a sinistra, le cose del giorno scelto in fila accanto;
// 3. oggi nel cervello e in tutto, in una riga; 4. i progetti in fila (un clic: il resoconto); 5. le cose senza data.
import { el, api, STATO, quando, nomeNota, notifica, festa } from './base.js'
import { ic } from './icone.js'
import { casella } from './casella.js'
import { bollino, avvisaCalendario } from './app.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'
import { griglia, mostraCasella, TITOLI, iconeCard } from './riquadri.js'
import { cornice } from './widget.js'
import * as extra from './caselle-extra.js'
import { barraScrivanie } from './scrivanie.js'
import { progetti, progettiPiccoli, sfoglia } from './progetti.js'
import { programmi, daChiudere } from './caselle-nuove.js'
import { strisciaCosaManca } from './cosa-manca.js'
import { MISURA, salva, ordinabile, pulsanteAnnulla, scrivania as scrivaniaAttiva } from './su-misura.js'
import * as software from './prodotto.js'
import { apriCifra } from './dentro-cervello.js'
import { casellaGestionali } from './gestionali.js'
import { casellaConti } from './conti.js'
import { casellaStudioPT, casellaNotizie, casellaNotifiche } from './caselle-studio-notizie.js'

// la Squadra dentro la scrivania (Marco, 23-11: «la squadra mi fa una sezione dedicata dentro alla scrivania, così che uno dalla
// scrivania possa vedere la chat, il tuo lavoro, le tue squadre e lo storico, ed elimini squadra dalla dashboard»): nella fila in
// cima, accanto ai nomi delle scrivanie, «Squadra» apre la sezione (#scrivania?sezione=squadra) con le caselle di squadra.js
let sezione = null
const pillSquadra = dentro => el('a', { class: 'scrivania-pill squadra-pill' + (dentro ? ' attiva' : ''), href: dentro ? '#scrivania' : '#scrivania?sezione=squadra', 'aria-current': dentro ? 'page' : null,
  title: dentro ? 'Torna alle caselle della scrivania' : 'La chat, il lavoro degli altri, il tuo lavoro, le squadre e lo storico' },
ic('users-three'), el('span', { testo: 'Squadra' }), el('b', { class: 'bollino', 'data-bollino-squadra': '', hidden: dentro || !STATO.novitaSquadra, testo: STATO.novitaSquadra > 99 ? '99+' : STATO.novitaSquadra ?? '' }))
async function mostraSquadra (stanza) {
  // la prima volta si svuota la scrivania; dopo (le novità arrivate, un messaggio) si ridisegna dentro, senza sfarfallare
  let box = stanza.querySelector(':scope > .scrivania-squadra')
  if (!box) { box = el('div', { class: 'scrivania-squadra' }, el('p', { class: 'vuoto caricamento', testo: 'Leggo la squadra…' })); stanza.replaceChildren(box) }
  await (await import('./squadra.js')).mostra(box)
  const fila = barraScrivanie(disegna, { fuori: true }); fila.append(pillSquadra(true)) // «Aggiornami» è nella barra in alto, in ogni pagina (24-11)
  stanza.querySelector(':scope > .scrivanie')?.remove(); box.before(fila)
}

const saluto = () => { const h = new Date().getHours(); return h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera' }
const pulito = t => t.replace(/📅\s*\S+/, '').replace(/\s?⏰\s*(?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}[:.]\d{2}/u, '').trim()
let giornoScelto = null
// «Adesso» (Marco, 20-11: «se spunto la nota di adesso… farne arrivare un'altra in poco tempo, o almeno passare alla prossima»):
// la coda è prima le cose con la data, poi quelle senza; «Passa alla prossima» la salta finché Delion resta aperta.
// Un clic su una cosa dei prossimi giorni la porta in «Adesso», pronta per «Fallo con Claude» (Marco, 20-11).
const saltate = new Set(), chiave = k => `${k.nota}#${k.riga}`
let scelta = null
// «Torna alla precedente» (Marco, 24-11 sera: «nella card principale oltre a farmi passare alla prossima fammi anche tornare
// indietro»): le saltate, in ordine; tornare indietro riporta in «Adesso» l'ultima saltata
const indietro = []

export async function mostra (stanza, params) {
  if (params) { sezione = params.get('sezione') === 'squadra' ? 'squadra' : null; pagina = params.get('pagina') || null; widget = params.get('widget') || null }
  if (sezione === 'squadra') return mostraSquadra(stanza)
  const [s, manca] = await Promise.all([api('/api/scrivania'), strisciaCosaManca().catch(() => null)])
  const ricarica = () => mostra(stanza).then(bollino)
  avvisaCalendario(s)
  ultima = { stanza, s, ricarica, manca }
  disegna()
}

// i riquadri come widget (riquadri.js): si spostano, si allargano, si rimpiccioliscono; ridisegnare non richiede il server
let ultima = null
// la pagina completa di ogni card, dove portano ⛶ e il doppio clic (Marco, 23-11: «mettere card tipo widget per ogni cosa e poi
// farle aprire a schermo intero con un apparato dedicato… deve essere tutto widget e apribile per la vera pagina, completa»):
// la sua stanza se ce l'ha; se no la sua pagina dentro la scrivania (#scrivania?pagina=…), con tutto lo spazio
const SPAZI = { conti: '#conti', adesso: '#scadute', giorni: '#calendario', scadute: '#scadute', 'senza-data': '#scadute?vista=senzadata', accessi: '#lavoro', lavagne: '#lavagne', cerca: '#cerca', diario: '#diario', 'studio-pt': '#gestionale?id=studio-pt', notizie: '#notizie',
  notifiche: '#scrivania?pagina=notifiche', versioni: '#scrivania?pagina=versioni', programmi: '#scrivania?pagina=programmi', cervello: '#scrivania?pagina=cervello', progetti: '#scrivania?pagina=progetti', gestionali: '#scrivania?pagina=gestionali' }
let pagina = null // la card aperta come pagina completa, se c'è
let widget = null // la card aperta da sola, come widget del telefono (widget.js)
const tutta = () => disegna() // per chi sta dentro una casella e ha un suo «disegna»
function disegna () {
  if (!ultima || sezione === 'squadra') return
  const { stanza, s, ricarica, manca } = ultima
  // ogni casella si costruisce solo se è sulla scrivania
  // Task, Lavoro e la Mappa sono widget (Marco, 21-11 sera: «le caselle falle diventare widget, a parte il calendario»):
  // in cima restano Aggiornami, il Calendario e la Libreria dei widget
  // Marco, 22-11: in alto non ci sono più Calendario (lo apre il doppio clic sui prossimi giorni) e Libreria (sta in Personalizza):
  // Aggiornami prende il posto della Libreria
  const fila = barraScrivanie(disegna); fila.querySelector('.scrivania-nuova')?.before(pillSquadra(false)); fila.append(pulsanteAnnulla())
  // le card dei software messe qui con «Metti sulla scrivania» (prodotto.js, 23-11)
  const deiSoftware = {}, spaziSoftware = {}
  for (const r of scrivaniaAttiva()?.riquadri ?? []) if (/^p\./.test(r.id)) { deiSoftware[r.id] = () => software.cartaPerScrivania(r.id, ricarica); spaziSoftware[r.id] = () => software.paginaCompleta(r.id) }
  const contenuti = { ...deiSoftware, adesso: () => banner(s, ricarica), giorni: () => giorni(s, ricarica), cervello: () => cervello(s), progetti: () => progetti(s.progetti, stanza),
    scadute: () => extra.scadute(ricarica), accessi: extra.accessi, lavagne: extra.lavagne, cerca: extra.cerca, diario: extra.diario, gestionali: casellaGestionali, conti: casellaConti,
    // Claudio, per ora, non c'è (Marco, 23-11 sera: «per ora Claudio e Turni pulizie toglieli»): la sua card non si disegna
    notizie: casellaNotizie, versioni: () => extra.versioni(pagina === 'versioni'), notifiche: () => casellaNotifiche(s, { tutte: pagina === 'notifiche' }),
    programmi: () => programmi(pagina === 'programmi'), 'da-chiudere': () => daChiudere() }
  // il widget: la card da sola, a tutto schermo (widget.js)
  if (widget && contenuti[widget]) return stanza.replaceChildren(cornice(el('div', { class: 'riquadro widget-riquadro' }, el('div', { class: 'riquadro-corpo' }, contenuti[widget]())), '#scrivania'))
  // la pagina completa di una card che non ha una stanza sua: la card da sola, con tutto lo spazio, e «← Scrivania» per tornare
  if (pagina && contenuti[pagina] && !/^p\./.test(pagina)) {
    scrollTo(0, 0)
    return stanza.replaceChildren(el('div', { class: 'pagina-completa', 'data-pagina': pagina },
      el('header', { class: 'pagina-cima' }, el('a', { class: 'secondario piccolo', href: '#scrivania' }, ic('arrow-left'), 'Scrivania'), el('h1', { testo: TITOLI[pagina] ?? pagina })),
      el('div', { class: 'pagina-corpo' }, contenuti[pagina]())))
  }
  // le card che non sono sulla scrivania: icone in cima, un clic e si aprono (Marco, 25-11 sera)
  const spazi = { ...SPAZI, ...spaziSoftware }
  stanza.replaceChildren(manca ?? '', fila, iconeCard(contenuti, disegna), griglia(contenuti, disegna, { spazi }))
}
addEventListener('su-misura', () => { if (ultima && !ultima.stanza.hidden && sezione !== 'squadra') disegna() })

// la coda di «Adesso», senza le saltate; se le hai saltate tutte si ricomincia dalla prima
function coda (s) {
  const tutte = [...s.prossime, ...s.senzaData]
  if (tutte.length && tutte.every(k => saltate.has(chiave(k)))) saltate.clear()
  const fila = tutte.filter(k => !saltate.has(chiave(k))), i = fila.findIndex(k => chiave(k) === scelta)
  if (i > 0) fila.unshift(...fila.splice(i, 1))
  return fila
}

// ridisegna solo il banner, con la cosa nuova che arriva da destra
function rimetti (s, ricarica) {
  const nuovo = banner(s, ricarica)
  document.querySelector('.banner')?.replaceWith(nuovo)
  nuovo.querySelector('.banner-adesso').classList.add('arriva')
  return nuovo
}

// 1. il banner: il saluto, la cosa da fare adesso e i pulsanti per farla
function banner (s, ricarica) {
  const fila = coda(s), prima = fila[0], nome = s.operatore ?? STATO.preset?.attivo?.nome // il nome di chi usa Mirion (Marco, 22-11)
  const oggi = s.prossime.filter(k => k.data === s.oggi).length
  const sinistra = el('div', { class: 'banner-saluto' },
    el('p', { class: 'sopra', testo: new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) }),
    el('h1', { testo: `${saluto()}${nome ? ', ' + nome : ''}` }),
    el('p', { class: 'sopra' }, `${oggi ? `${oggi} ${oggi === 1 ? 'cosa' : 'cose'} per oggi` : 'niente in scadenza oggi'} · ${s.prossime.length} nei prossimi giorni`,
      s.scadute ? [' · ', el('a', { href: '#scadute', testo: `${s.scadute} scadute` })] : null))
  const centro = el('div', { class: 'banner-adesso' }, el('h2', { testo: 'Adesso' }))
  if (prima) {
    const altre = fila.length - 1
    // la prossima arriva subito: il banner si ridisegna da solo, il resto della scrivania si aggiorna dopo
    const cambia = () => { if (scelta === chiave(prima)) scelta = null; rimetti(s, ricarica).querySelector('.avanti button')?.focus() }
    const fatta = async e => {
      const b = e.currentTarget; b.disabled = true
      try {
        await api('/api/casella', { nota: prima.nota, riga: prima.riga, testo: prima.testo, stato: 'fatta' })
        festa(e.clientX, e.clientY)
        // cliccata per sbaglio (Marco, 22-11: «devi darmi la possibilità di tornare indietro rigenerando la task»): «Annulla» la riapre
        // nella nota, così torna da fare anche in Obsidian e per Claude, e la riporta in «Adesso»
        const torna = async () => { try { await api('/api/casella', { nota: prima.nota, riga: prima.riga, testo: prima.testo, stato: 'riapri' }); scelta = chiave(prima); notifica('Tornata da fare, anche nella nota.'); ricarica() } catch (err) { notifica(err.message, { tipo: 'sempre' }) } }
        notifica(altre ? 'Fatta. Ecco la prossima.' : 'Fatta. Non c\'è altro in coda.', { azione: { testo: 'Annulla', fai: torna }, durata: 9000 })
        s.prossime = s.prossime.filter(k => k !== prima); s.senzaData = s.senzaData.filter(k => k !== prima)
        cambia(); ricarica()
      } catch (err) { b.disabled = false; notifica(err.message, { tipo: 'sempre' }) }
    }
    const salta = () => { saltate.add(chiave(prima)); indietro.push(chiave(prima)); cambia() }
    const torna = () => { const k = indietro.pop(); if (!k) return; saltate.delete(k); scelta = k; rimetti(s, ricarica).querySelector('.avanti button')?.focus() }
    // «La faccio io» (Marco, 24-11 sera: «dammi la possibilità di eseguire le task manualmente e di appuntarle così sono fatte»): un
    // appunto facoltativo su cosa hai fatto, che va nel diario di oggi con il link alla nota, e la cosa si spunta come con «Fatta»
    const aMano = e => {
      const avanti = e.currentTarget.closest('.avanti')
      const campo = el('input', { type: 'text', placeholder: 'Cosa hai fatto (facoltativo): va nel diario di oggi', maxlength: 300, 'aria-label': 'Cosa hai fatto' })
      const ok = el('button', { type: 'submit', class: 'primario fatta-adesso', testo: altre ? '✓ Fatta, la prossima' : '✓ Fatta' })
      const modulo = el('form', { class: 'bottoni avanti a-mano', onsubmit: async ev => {
        ev.preventDefault(); ok.disabled = true
        const appunto = campo.value.trim(), r = ok.getBoundingClientRect()
        try { await api('/api/diario', { testo: `Fatta a mano: ${pulito(prima.testo)}${appunto ? ' — ' + appunto : ''}, in [[${nomeNota(prima.nota)}]]` }) } catch (err) { notifica('Il diario non si è scritto: ' + err.message, { tipo: 'sempre' }) }
        await fatta({ currentTarget: ok, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })
      } }, campo, ok, el('button', { type: 'button', class: 'quieto', testo: 'Annulla', onclick: () => modulo.replaceWith(avanti) }))
      avanti.replaceWith(modulo); campo.focus()
    }
    // gli altri gesti, come sulle altre caselle (Marco, 23-11: «dammi la possibilità di mettere in pausa, archiviare o con le
    // possibilità disponibili sulla nota nella prima card»): rimanda, in pausa, non serve più, archivia, sotto task, prendi o lascia.
    // Il menu è quello di casella.js; quando la cosa esce dalla coda arriva la prossima, come con «Fatta»
    const esci = () => { s.prossime = s.prossime.filter(k => k !== prima); s.senzaData = s.senzaData.filter(k => k !== prima); cambia(); ricarica() }
    const gesti = casella(prima, { dopo: ricarica, esci })
    centro.append(el('p', { class: 'grande', testo: pulito(prima.testo) }), el('p', { class: 'sopra', testo: `${scelta === chiave(prima) ? 'scelta da te · ' : ''}${prima.data ? quando(prima.data) + ' · ' : ''}${nomeNota(prima.nota)}${altre ? ` · poi altre ${altre}` : ''}` }),
      el('div', { class: 'bottoni' }, ...pulsantiIA(ia => conIA.compito(prima, ia)), obsidian(prima.nota)),
      el('div', { class: 'bottoni avanti' },
        el('button', { type: 'button', class: 'secondario fatta-adesso', testo: altre ? '✓ Fatta, la prossima' : '✓ Fatta', onclick: fatta }),
        el('button', { type: 'button', class: 'secondario', testo: 'La faccio io', title: 'Fatta a mano: scrivi due righe su cosa hai fatto (vanno nel diario) e si spunta', onclick: aMano }),
        indietro.length ? el('button', { type: 'button', class: 'secondario', title: 'Riporta qui la cosa che hai appena saltato', onclick: torna }, ic('arrow-left'), 'Torna alla precedente') : null,
        altre ? el('button', { type: 'button', class: 'secondario', testo: 'Passa alla prossima', title: 'Resta da fare: torna in coda finché Mirion è aperta', onclick: salta }) : null,
        el('button', { type: 'button', class: 'secondario altro-adesso', title: 'Rimandala, mettila in pausa, archiviala, segnala come «non serve più», aggiungi una sotto task', 'aria-haspopup': 'menu',
          onclick: e => { e.stopPropagation(); gesti.apriMenu(e.currentTarget) } }, ic('dots-three'), 'Altro')))
  } else centro.append(el('p', { class: 'grande', testo: 'Niente in coda.' }), el('p', { class: 'sopra', testo: 'Quando scrivi «- [ ]» in una nota, la cosa da fare compare qui.' }))
  // in cima, fissi, su tutta la larghezza, i prossimi giorni in piccolo (Marco, 25-11 sera: «i numeri del cervello mettimeli dentro
  // la card principale in modo permanente, in alto» · poi «oggi nel cervello lo sostituisci con i prossimi giorni: fammi in piccolo
  // i giorni e la fai funzionare da lì»): un clic su un giorno apre sotto le sue cose, un altro clic lo richiude
  // le cose del giorno toccato vanno sotto la task da fare (Marco, 25-11 sera: «se tocco una casella del calendario dammi anche le task
  // che ho quel giorno lì, sotto la task da fare»)
  const giorniPiccoli = giorni(s, ricarica, { compatta: true })
  centro.append(giorniPiccoli.listaGiorno)
  return el('section', { class: 'banner', 'aria-label': 'Adesso' }, giorniPiccoli, ilPunto(s), sinistra, centro)
}

// il punto (Marco, 25-11 sera: «l'idea è implementare tutto nella card principale, in modo tale che da lì si sappia tutto, e poi si
// possono avere le card singole più specifiche»): in «Adesso» una riga con un numero per ogni cosa (task, notifiche, conti, rinnovi,
// progetti, cervello); ognuno porta alla sua pagina, e la card singola resta per chi la vuole più grande. I conti e le notifiche
// arrivano dopo, con la loro richiesta: se non rispondono, quel numero non c'è.
const euro = n => Number(n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
function ilPunto (s) {
  const voce = (icona, numero, nome, dove, { attento = false, titolo } = {}) => el('a', { class: 'punto-voce' + (attento ? ' attento' : ''), href: dove, title: titolo ?? `Apri: ${nome}` },
    ic(icona), el('b', { testo: numero }), el('span', { testo: nome }))
  const n = s.notiziario ?? {}, attivi = (s.progetti ?? []).filter(p => p.aperte > 0)
  const riga = el('nav', { class: 'il-punto', 'aria-label': 'Il punto' },
    voce('check-square', String(s.scadute ?? 0), s.scadute === 1 ? 'task scaduta' : 'task scadute', '#scadute', { attento: s.scadute > 0 }),
    voce('folder-simple', String(attivi.length), attivi.length === 1 ? 'progetto aperto' : 'progetti aperti', '#scrivania?pagina=progetti'),
    voce('notebook', String(n.aggiornate ?? 0), 'note toccate oggi', '#scrivania?pagina=cervello'))
  api('/api/notifiche?quante=1').then(d => { if (d?.nonLette != null) riga.append(voce('bell', String(d.nonLette), d.nonLette === 1 ? 'notifica da leggere' : 'notifiche da leggere', '#scrivania?pagina=notifiche', { attento: d.nonLette > 0 })) }).catch(() => {})
  api('/api/nucleo').then(d => {
    if (!d) return
    riga.append(voce('briefcase', euro(d.daIncassare?.totale), 'da incassare', '#conti', { attento: d.daIncassare?.scadute > 0, titolo: d.daIncassare?.scadute ? `Da incassare: ${d.daIncassare.scadute} scadut${d.daIncassare.scadute === 1 ? 'a' : 'e'}` : undefined }),
      voce('arrows-clockwise', String(d.rinnovi?.voci?.length ?? 0), `rinnov${d.rinnovi?.voci?.length === 1 ? 'o' : 'i'} in ${d.rinnovi?.giorni ?? 60} giorni`, '#conti'))
  }).catch(() => {})
  return riga
}

// l'ultima notifica, in mezzo fra il calendario e i progetti (Marco, 25-11 sera: «in mezzo allo spazio visualizza l'ultima notifica»):
// una riga sola; un clic porta dove dice la notifica, o a tutte le notifiche
// le notifiche da leggere, una alla volta con le frecce (Marco, 25-11 sera), come i progetti accanto, e la × per chiuderle
// tutte (Marco: «dammi la possibilità di chiuderle tutte»): si segnano come lette e spariscono da qui; restano nella pagina
// delle notifiche. Senza notifiche da leggere qui c'è solo la campanella che porta a quella pagina
let notificaVista = 0
function ultimaNotifica () {
  const posto = el('div', { class: 'ultima-notifica', role: 'status', 'aria-label': 'Le notifiche da leggere' })
  const campanella = () => el('a', { class: 'ultima-notifica-vuota', href: '#scrivania?pagina=notifiche', title: 'Nessuna notifica da leggere: apri le notifiche', 'aria-label': 'Le notifiche' }, ic('bell'))
  api('/api/notifiche?quante=30').then(r => {
    const voci = (r?.voci ?? []).filter(n => !n.letta)
    if (!voci.length) return posto.replaceChildren(campanella())
    if (notificaVista >= voci.length) notificaVista = 0
    const voce = n => {
      const d = new Date(n.quando), oggi = d.toDateString() === new Date().toDateString()
      const ora = oggi ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
      return el('a', { class: 'ultima-notifica-voce da-leggere', href: n.dove || '#scrivania?pagina=notifiche', title: n.testo },
        ic('bell'), el('small', { testo: ora }), el('span', { testo: n.testo }))
    }
    const chiudi = el('button', { type: 'button', class: 'sfoglia-freccia chiudi-notifiche', title: voci.length > 1 ? `Chiudi tutte (${voci.length}): restano nella pagina delle notifiche` : 'Chiudi: resta nella pagina delle notifiche',
      'aria-label': voci.length > 1 ? 'Chiudi tutte le notifiche' : 'Chiudi la notifica',
      onclick: () => api('/api/notifiche/lette', { ids: voci.map(n => n.id) }).then(() => { notificaVista = 0; posto.replaceChildren(campanella()) }).catch(() => {}) }, ic('x'))
    posto.replaceChildren(el('span', { class: 'ultima-notifica-fila' }, sfoglia(voci, voce, { prima: 'La notifica prima', dopo: 'La notifica dopo', indice: () => notificaVista, scegli: i => { notificaVista = i } }), chiudi))
  }).catch(() => {})
  return posto
}

let giornoAperto = null // nella fila piccola in cima ad «Adesso»: il giorno aperto, o nessuno
function giorni (s, ricarica, { compatta = false } = {}) {
  const elenco = []
  for (let d = new Date(s.oggi + 'T12:00'); d.toISOString().slice(0, 10) <= s.fine; d.setDate(d.getDate() + 1)) elenco.push(d.toISOString().slice(0, 10))
  if (!elenco.includes(giornoScelto)) giornoScelto = s.oggi
  const eventi = s.calendario?.eventi ?? [], conta = g => s.prossime.filter(k => k.data === g).length + eventi.filter(e => e.giorno === g).length
  const lista = el('div', { class: 'giorno-lista' }), schede = el('div', { class: 'giorni-schede', role: 'tablist', 'aria-label': 'Scegli il giorno' })
  // il clic sul testo: la cosa sale in «Adesso», la pagina torna su e il primo «Fallo con…» è già sotto il dito
  const inAdesso = (k, riga) => {
    scelta = chiave(k); saltate.delete(scelta)
    lista.querySelectorAll('.in-adesso').forEach(r => r.classList.remove('in-adesso')); riga.classList.add('in-adesso')
    // «Adesso» dietro un'altra scheda della cartella, rimpicciolito o tolto: torna davanti e la scrivania si ridisegna
    // dentro la card unica «Adesso» è già lì: si ridisegna solo il banner (mostraCasella accenderebbe la card «Adesso» spenta)
    if ((mostraCasella('adesso') || !document.querySelector('.banner'))) tutta() // la scelta è già in «Adesso» quando si ridisegna
    else rimetti(s, ricarica)
    const visto = document.querySelector('.banner')
    if (!visto) return
    visto.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    visto.querySelector('.banner-adesso .ia')?.focus({ preventScroll: true })
  }
  const disegna = () => {
    const scelto = compatta ? giornoAperto : giornoScelto
    schede.replaceChildren(...elenco.map(g => el('button', { type: 'button', role: 'tab', 'aria-selected': String(g === scelto), onclick: () => { if (compatta) giornoAperto = giornoAperto === g ? null : g; else giornoScelto = g; disegna() } },
      el('span', { testo: g === s.oggi ? 'Oggi' : quando(g) === 'domani' ? 'Domani' : new Date(g + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short' }) }),
      el('b', { testo: new Date(g + 'T12:00').getDate() }), conta(g) ? el('i', { testo: conta(g) }) : null)))
    lista.hidden = !scelto
    if (!scelto) return lista.replaceChildren()
    const cose = s.prossime.filter(k => k.data === scelto).sort((a, b) => (a.ora ?? '99').localeCompare(b.ora ?? '99')), impegni = eventi.filter(e => e.giorno === scelto)
    const nomeGiorno = scelto === s.oggi ? 'Oggi' : quando(scelto) === 'domani' ? 'Domani' : new Date(scelto + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    lista.replaceChildren(compatta ? el('div', { class: 'giorno-lista-cima' }, el('span', { class: 'sopra piccolo', testo: nomeGiorno }),
      el('button', { type: 'button', class: 'riquadro-tasto', title: 'Chiudi il giorno', 'aria-label': 'Chiudi il giorno', onclick: () => { giornoAperto = null; disegna() } }, ic('x'))) : '',
    el('ul', { class: 'caselle in-fila' },
      ...impegni.map(e => el('li', { class: 'impegno' }, el('b', { testo: e.ora ?? 'tutto il giorno' }), el('span', { testo: e.titolo ?? 'Impegno' }))),
      ...cose.map(k => { const r = casella(k, { mostraData: false, dopo: ricarica, scegli: inAdesso }); r.classList.toggle('in-adesso', chiave(k) === scelta); return r }),
      !cose.length && !impegni.length && el('li', { class: 'vuoto', testo: 'Niente in programma.' })))
  }
  disegna()
  if (compatta) {
    // la lista del giorno la mette il banner dove serve: sotto la task da fare
    lista.classList.add('giorno-in-adesso')
    return Object.assign(el('div', { class: 'giorni-piccoli', role: 'group', 'aria-label': 'I prossimi giorni e i progetti' },
      el('div', { class: 'giorni-piccoli-fila' }, el('span', { class: 'sopra piccolo', testo: 'I prossimi giorni' }), schede,
        el('a', { class: 'quieto piccolo', href: '#calendario', title: 'Il mese, con le task' }, ic('calendar-dots'))),
      ultimaNotifica(), progettiPiccoli(s.progetti)), { listaGiorno: lista })
  }
  return el('section', { class: 'fascia giorni', 'aria-labelledby': 'giorni-t' },
    // il giorno scelto si apre in Google Calendar (Marco, 21-11: «sui giorni dammi modo di poterlo aprire con Google Calendar»)
    el('header', {}, el('h2', { id: 'giorni-t', testo: 'I prossimi giorni' }), !s.calendario?.collegato && el('a', { class: 'sopra piccolo', href: '#impostazioni', testo: 'Collega il calendario di Google' }),
      el('span', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario piccolo', title: 'Apri il giorno scelto in Google Calendar', onclick: () => apriGoogle(giornoScelto) }, ic('calendar-dots'), 'Apri in Google Calendar'),
        el('a', { class: 'secondario piccolo', href: '#calendario', title: 'Il mese, con le task: si aggiungono e si assegnano' }, 'Il calendario di Mirion'))),
    el('div', { class: 'giorni-corpo' }, schede, lista))
}

// Google Calendar sul giorno: si apre nel browser (main.cjs manda fuori i link https)
export const apriGoogle = g => { const [a, m, d] = String(g).split('-'); window.open(`https://calendar.google.com/calendar/r/day/${a}/${+m}/${+d}`, '_blank', 'noopener') }

// 3. oggi nel cervello e la manutenzione, in una riga sola. Ogni cifra si apre: cosa c'è dentro e, per quelle del giorno, lo storico
// (dentro-cervello.js). Le cifre si spostano trascinandole e si tolgono con ✕, come le caselle; quelle tolte si rimettono sotto (Marco, 22-11)
const NOMI_CIFRE = { toccate: 'note toccate oggi', nuove: 'note nuove oggi', chiuse: 'cose chiuse oggi', ia: 'lavori con l’IA oggi', note: 'note in tutto', aperte: 'cose aperte', lavagne: 'lavagne', scadute: 'scadute', rotti: 'collegamenti rotti', ferme: 'note ferme da 3 mesi' }
const DEL_GIORNO = new Set(['toccate', 'nuove', 'chiuse', 'ia'])
function cervello (s) {
  const n = s.notiziario ?? {}, a = n.azioni ?? {}, t = s.totali ?? {}
  const valori = { toccate: n.aggiornate ?? 0, nuove: n.nuove ?? 0, chiuse: a.fatta ?? 0, ia: a.ia ?? 0, note: t.note ?? 0, aperte: t.caselle ?? 0, lavagne: t.lavagne ?? 0, scadute: t.scadute ?? 0, rotti: t.rotti ?? 0, ferme: t.ferme ?? 0 }
  const attente = { scadute: t.scadute, rotti: t.rotti }
  const c = MISURA.d?.cifre ?? { ordine: Object.keys(NOMI_CIFRE), nascoste: [] }
  const fila = el('div', { class: 'cifre in-fila', 'data-non-trascinare': '' }) // le cifre si spostano fra loro, la casella resta ferma
  for (const id of c.ordine) if (!c.nascoste.includes(id) && NOMI_CIFRE[id]) fila.append(el('div', { class: 'cifra-posto', 'data-id': id },
    el('button', { type: 'button', class: 'cifra' + (attente[id] ? ' attento' : '') + (DEL_GIORNO.has(id) ? ' del-giorno' : ''), title: DEL_GIORNO.has(id) ? 'Apri: cosa c’è dentro, e i giorni passati' : 'Apri: cosa c’è dentro', onclick: () => apriCifra(id) },
      el('b', { testo: Number(valori[id]).toLocaleString('it-IT') }), el('span', { testo: NOMI_CIFRE[id] })),
    el('button', { type: 'button', class: 'cifra-togli', title: 'Togli questa cifra', 'aria-label': `Togli «${NOMI_CIFRE[id]}»`, onclick: () => { c.nascoste.push(id); salva({ subito: true }) } }, ic('x'))))
  ordinabile(fila, { fatto: ids => { c.ordine = [...ids, ...c.ordine.filter(x => !ids.includes(x))]; salva() } })
  const tolte = c.nascoste.filter(id => NOMI_CIFRE[id])
  return el('section', { class: 'fascia cervello', 'aria-labelledby': 'cerv-t' },
    el('header', {}, el('h2', { id: 'cerv-t', testo: 'Oggi nel cervello' }), el('span', { class: 'sopra piccolo', testo: 'un clic su una cifra: cosa c’è dentro · trascinale per spostarle' })),
    // la scansione la fa Mirion con «Aggiornami», in alto (Marco, 21-11: «togli solo la scansione con Claude»)
    fila,
    tolte.length ? el('div', { class: 'cifre-tolte' }, el('span', { class: 'sopra piccolo', testo: 'Tolte:' }), ...tolte.map(id => el('button', { type: 'button', class: 'quieto piccolo', title: 'Rimettila', onclick: () => { c.nascoste = c.nascoste.filter(x => x !== id); salva({ subito: true }) } }, ic('plus'), NOMI_CIFRE[id]))) : null,
    n.esempi?.length ? el('ul', { class: 'toccate' }, el('li', { class: 'sopra piccolo', testo: 'Toccate oggi:' }), ...n.esempi.slice(0, 6).map(f => el('li', {}, el('a', { href: '#cerca?n=' + encodeURIComponent(f), testo: nomeNota(f) }), obsidian(f, '')))) : null)
}

// 5. le cose senza data, in colonne che scorrono
function senzaData (s, ricarica) {
  return el('section', { class: 'fascia senza-data', 'aria-labelledby': 'sd-t' },
    el('header', {}, el('h2', { id: 'sd-t', testo: `Senza data (${s.quanteSenzaData})` }), s.quanteSenzaData > s.senzaData.length && el('span', { class: 'sopra piccolo', testo: `qui le prime ${s.senzaData.length}; le altre con Ctrl+K` })),
    el('ul', { class: 'caselle in-fila' }, ...s.senzaData.map(k => casella(k, { dopo: ricarica }))))
}
