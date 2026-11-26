// Clienti e conti: la stanza del nucleo (server/nucleo.mjs; Marco, 25-11-2026: «mirion è la dashboard principale per ogni tipo
// di attività… il punto sarebbe quello di sostituire il commercialista»). In cima i numeri (incassato, da incassare, ricorrente,
// la soglia del forfettario e quanto mettere da parte), sotto le cose da fare con i soldi (fatture da incassare, rinnovi,
// preventivi aperti), poi i clienti. Tutto è scritto in note del cervello: «Apri in Obsidian» porta alla nota.
// La card «Conti» della scrivania (casellaConti) è la versione corta della stessa pagina; il doppio clic apre la stanza.
import { el, api, notifica, oggiISO, quando } from './base.js'
import { ic } from './icone.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'

const euro = n => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const perc = n => `${Math.round((Number(n) || 0) * 100)}%`
const fascia = (classe, titolo, sopra, ...dentro) => el('section', { class: 'fascia conti ' + classe, 'aria-label': titolo }, el('header', {}, el('h2', { testo: titolo }), sopra ?? null), ...dentro)
const cifra = (titolo, valore, sotto, classe = '') => el('div', { class: 'conti-cifra ' + classe }, el('small', { class: 'sopra', testo: titolo }), el('b', { testo: valore }), sotto ? el('small', { class: 'sopra', testo: sotto }) : null)
const vuoto = t => el('p', { class: 'vuoto', testo: t })

// i numeri in cima, uguali nella stanza e nella card
function cifre (d) {
  const s = d.soglia, f = d.fiscale
  return el('div', { class: 'conti-cifre' },
    cifra('Incassato questo mese', euro(d.mese.incassato)),
    cifra('Incassato nell\'anno', euro(d.mese.anno), s.usata != null ? `${perc(s.usata)} della soglia di ${euro(s.limite)}` : null, s.usata >= 0.85 ? 'attenzione' : ''),
    cifra('Da incassare', euro(d.daIncassare.totale), d.daIncassare.scadute ? `${d.daIncassare.scadute} ${d.daIncassare.scadute === 1 ? 'scaduta' : 'scadute'}` : null, d.daIncassare.scadute ? 'attenzione' : ''),
    cifra('Ricorrente al mese', euro(d.mese.ricorrente), 'dai servizi attivi'),
    f.pronta ? cifra('Da mettere da parte', euro(f.totale), `stima: ${perc(f.quota)} di ogni incasso`) : null)
}

// la stima del fisco, o come impostarla (Mirion non inventa i numeri: regola 2 del cervello)
function fisco (d, dopo) {
  const f = d.fiscale
  if (f.pronta) return el('p', { class: 'sopra conti-fisco' }, `Stima ${f.regime || 'forfettario'} sull'incassato dell'anno: reddito ${euro(f.reddito)}, contributi ${euro(f.contributi)}, imposta ${euro(f.imposta)}. È una stima per mettere da parte, non la dichiarazione. `, obsidian(f.nota, 'Cambia i numeri'))
  return el('div', { class: 'conti-fisco' },
    el('p', { class: 'sopra', testo: f.esiste ? `Per stimare tasse e contributi mancano ${f.manca.join(', ')} nelle impostazioni fiscali. Scrivili dopo averli verificati.` : 'Per stimare quanto mettere da parte per tasse e contributi servono le impostazioni fiscali (coefficiente, imposta, contributi).' }),
    f.esiste ? obsidian(f.nota, 'Apri le impostazioni fiscali')
      : el('button', { type: 'button', class: 'secondario piccolo', onclick: async () => { try { await api('/api/nucleo/impostazioni', {}); notifica('Le impostazioni fiscali sono nel cervello, in 4 Conti: scrivi i numeri dopo averli verificati.', { tipo: 'sempre' }); dopo() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('plus'), 'Prepara le impostazioni fiscali'))
}

const riga = (...figli) => el('li', { class: 'conti-riga' }, ...figli)
const tanti = (n, uno, piu) => `${n} ${n === 1 ? uno : piu}`
const testo = (titolo, sotto) => el('div', {}, el('b', { testo: titolo }), sotto ? el('small', { class: 'sopra', testo: sotto }) : null)

function listaIncassare (d, dopo, quante = 50) {
  const v = d.daIncassare.voci
  if (!v.length) return vuoto('Nessuna fattura da incassare.')
  return el('ul', { class: 'conti-lista' }, ...v.slice(0, quante).map(f => riga(
    testo(`${f.cliente || 'Senza cliente'} · fattura ${f.numero}`, f.scadenza ? `${f.scaduta ? 'scaduta' : 'scade'} ${quando(f.scadenza)}` : 'senza scadenza'),
    el('b', { class: f.scaduta ? 'conti-importo attenzione' : 'conti-importo', testo: euro(f.totale) }),
    el('button', { type: 'button', class: 'secondario piccolo', title: 'Segna pagata oggi: la riga va negli incassi del mese', onclick: async () => { try { await api('/api/nucleo/pagata', { nota: f.nota, data: oggiISO() }); notifica(`Fattura ${f.numero} pagata: è negli incassi.`); dopo() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('check'), 'Pagata'),
    obsidian(f.nota, ''))))
}
function listaRinnovi (d, quante = 50) {
  const v = d.rinnovi.voci
  if (!v.length) return vuoto(`Nessun rinnovo nei prossimi ${d.rinnovi.giorni} giorni.`)
  return el('ul', { class: 'conti-lista' }, ...v.slice(0, quante).map(s => riga(
    testo(`${s.servizio} · ${s.cliente || 'senza cliente'}`, `${s.passato ? 'scaduto' : 'si rinnova'} ${quando(s.rinnovo)} · ogni ${s.periodo}`),
    el('b', { class: s.passato ? 'conti-importo attenzione' : 'conti-importo', testo: euro(s.canone) }), obsidian(s.nota, ''))))
}
function listaPreventivi (d, quante = 50) {
  const v = d.preventivi.voci
  if (!v.length) return vuoto('Nessun preventivo aperto.')
  return el('ul', { class: 'conti-lista' }, ...v.slice(0, quante).map(p => riga(
    testo(`${p.cliente || 'Senza cliente'} · preventivo ${p.numero}`, `${p.stato}${p.valido_fino ? (p.scaduto ? ' · scaduto ' : ' · valido fino a ') + quando(p.valido_fino) : ''}`),
    el('b', { class: 'conti-importo', testo: euro(p.totale) }), obsidian(p.nota, ''))))
}

// ---- la card della scrivania ----
export function casellaConti () {
  const corpo = el('div', {}, vuoto('Leggo i conti…'))
  const disegna = () => api('/api/nucleo').then(d => corpo.replaceChildren(cifre(d),
    el('h3', { class: 'sopra conti-sotto', testo: 'Da incassare' }), listaIncassare(d, disegna, 4),
    el('h3', { class: 'sopra conti-sotto', testo: 'Rinnovi' }), listaRinnovi(d, 4),
    el('a', { class: 'sopra piccolo', href: '#conti', testo: `${tanti(d.clienti.attivi, 'cliente attivo', 'clienti attivi')}${d.clienti.lead ? `, ${d.clienti.lead} da chiudere` : ''} · apri Clienti e conti` })))
    .catch(e => corpo.replaceChildren(vuoto('Non riesco a leggere i conti: ' + e.message)))
  disegna()
  return fascia('casella-conti', 'Conti', el('a', { class: 'sopra piccolo', href: '#conti', testo: 'tutto' }), corpo)
}

// ---- la stanza ----
let scelto = null // il cliente aperto
export async function mostra (stanza, params) {
  if (params?.get('n')) scelto = params.get('n')
  const dopo = () => mostra(stanza)
  let d, cl
  try { [d, cl] = await Promise.all([api('/api/nucleo'), api('/api/nucleo/clienti')]) } catch (e) { return stanza.replaceChildren(vuoto(e.message)) }
  const clienti = cl.clienti
  const scheda = el('div', { class: 'conti-scheda' })
  if (scelto) apriScheda(scheda, scelto, dopo)
  stanza.replaceChildren(el('div', { class: 'conti-stanza' },
    el('header', { class: 'pagina-cima' }, el('h1', { testo: 'Clienti e conti' }),
      el('p', { class: 'sopra', testo: 'Clienti, preventivi, fatture e incassi sono note del tuo cervello: le app di Mirion ci scrivono, tu le vedi qui e in Obsidian.' })),
    fascia('numeri', 'I numeri', null, cifre(d), fisco(d, dopo)),
    el('div', { class: 'conti-colonne' },
      fascia('incassare', 'Da incassare', null, listaIncassare(d, dopo)),
      fascia('rinnovi', `Rinnovi dei prossimi ${d.rinnovi.giorni} giorni`, null, listaRinnovi(d)),
      fascia('preventivi', 'Preventivi aperti', el('small', { class: 'sopra', testo: euro(d.preventivi.totale) }), listaPreventivi(d))),
    fascia('clienti-elenco', `Clienti (${clienti.length})`, null,
      clienti.length ? el('ul', { class: 'conti-lista conti-clienti' }, ...clienti.map(c => riga(
        el('button', { type: 'button', class: 'quieto conti-nome', onclick: () => { scelto = c.nota; apriScheda(scheda, c.nota, dopo); scheda.scrollIntoView({ behavior: 'smooth' }) } }, testo(c.nome, [c.stato, c.settore, c.app && `da ${c.app}`].filter(Boolean).join(' · '))),
        el('small', { class: c.scadute ? 'sopra attenzione' : 'sopra', testo: [c.servizi && tanti(c.servizi, 'servizio', 'servizi'), c.daIncassare && `${euro(c.daIncassare)} da incassare`, c.preventiviAperti && tanti(c.preventiviAperti, 'preventivo aperto', 'preventivi aperti')].filter(Boolean).join(' · ') }))))
        : vuoto('Ancora nessun cliente: aggiungine uno qui sotto, o scrivi «tipo: cliente» nelle proprietà di una nota.'),
      moduloCliente(dopo)),
    scheda,
    el('div', { class: 'conti-colonne' }, fascia('incasso', 'Registra un incasso', null, moduloIncasso(clienti, dopo)), fascia('preventivo', 'Nuovo preventivo', null, moduloPreventivo(clienti, dopo))),
    fascia('ultimi', 'Ultimi incassi', null, d.ultimiIncassi.length ? el('ul', { class: 'conti-lista' }, ...d.ultimiIncassi.map(i => riga(testo(`${i.cliente || '—'} · ${i.descrizione || i.fonte}`, `${quando(i.data)} · ${i.fonte}`), el('b', { class: 'conti-importo', testo: euro(i.importo) }), obsidian(i.nota, '')))) : vuoto('Nessun incasso registrato.'))))
}

async function apriScheda (box, nota, dopo) {
  box.replaceChildren(vuoto('Leggo il cliente…'))
  let c; try { c = await api('/api/nucleo/cliente?n=' + encodeURIComponent(nota)) } catch (e) { scelto = null; return box.replaceChildren() }
  const dati = [['Stato', c.stato], ['P. IVA', c.piva], ['Codice fiscale', c.cf], ['Codice SDI', c.sdi], ['PEC', c.pec], ['Email', c.email], ['Telefono', c.telefono], ['Referente', c.referente], ['Fonte', c.fonte], ['Settore', c.settore], ['Dall\'app', c.app]].filter(([, v]) => v)
  const chiedi = (cosa, ia) => conIA.testo(`${cosa} per il cliente «${c.nome}» (nota: ${c.nota}). Usa il listino in «5 Come si fa/Listino.md» se c'è, e i modelli in «Modelli». Scrivi la bozza in una nota nuova con «tipo: preventivo», «cliente: "[[${c.nome}]]"», «stato: bozza» e il totale nelle proprietà, in «4 Conti/Preventivi». Non mandare niente: la controllo io.`, ia)
  box.replaceChildren(fascia('scheda', c.nome, el('span', { class: 'bottoni' }, obsidian(c.nota), el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Chiudi la scheda', onclick: () => { scelto = null; box.replaceChildren() } }, ic('x'))),
    dati.length ? el('dl', { class: 'conti-dati' }, ...dati.flatMap(([k, v]) => [el('dt', { testo: k }), el('dd', { testo: v })])) : vuoto('Nessun dato fiscale: aggiungili nelle proprietà della nota (piva, sdi, pec…).'),
    el('div', { class: 'bottoni' }, ...pulsantiIA(ia => chiedi('Scrivi il preventivo', ia), { testo: 'Preventivo con' })),
    el('div', { class: 'conti-colonne' },
      el('div', {}, el('h3', { class: 'sopra conti-sotto', testo: 'Servizi' }), c.servizi.length ? el('ul', { class: 'conti-lista' }, ...c.servizi.map(s => riga(testo(s.servizio, `${s.stato} · ogni ${s.periodo}${s.rinnovo ? ' · rinnovo ' + quando(s.rinnovo) : ''}`), el('b', { class: 'conti-importo', testo: euro(s.canone) }), obsidian(s.nota, '')))) : vuoto('Nessun servizio.')),
      el('div', {}, el('h3', { class: 'sopra conti-sotto', testo: 'Preventivi e fatture' }), [...c.preventivi.map(p => ({ ...p, cosa: 'preventivo' })), ...c.fatture.map(f => ({ ...f, cosa: 'fattura' }))].length
        ? el('ul', { class: 'conti-lista' }, ...[...c.preventivi.map(p => ({ ...p, cosa: 'preventivo' })), ...c.fatture.map(f => ({ ...f, cosa: 'fattura' }))].sort((a, b) => String(b.data).localeCompare(String(a.data))).map(x => riga(testo(`${x.cosa} ${x.numero}`, `${x.stato}${x.data ? ' · ' + quando(x.data) : ''}`), el('b', { class: 'conti-importo', testo: euro(x.totale) }), obsidian(x.nota, ''))))
        : vuoto('Nessun preventivo o fattura.')),
      el('div', {}, el('h3', { class: 'sopra conti-sotto', testo: 'Incassi' }), c.incassi.length ? el('ul', { class: 'conti-lista' }, ...c.incassi.slice(0, 12).map(i => riga(testo(i.descrizione || i.fonte, quando(i.data)), el('b', { class: 'conti-importo', testo: euro(i.importo) })))) : vuoto('Nessun incasso.')))))
}

const campo = (etichetta, input) => el('label', { class: 'conti-campo' }, el('span', { testo: etichetta }), input)
const input = (nome, segnaposto = '', tipo = 'text') => el('input', { name: nome, type: tipo, placeholder: segnaposto, autocomplete: 'off' })
const sceltaCliente = (clienti, vuota = 'Senza cliente') => el('select', { name: 'cliente' }, el('option', { value: '', testo: vuota }), ...clienti.map(c => el('option', { value: c.nome, testo: c.nome })))
const valori = form => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]))

function moduloCliente (dopo) {
  const f = el('form', { class: 'conti-modulo', onsubmit: async e => {
    e.preventDefault()
    try { const r = await api('/api/nucleo/cliente', valori(f)); notifica(r.nuovo ? `Cliente aggiunto: ${r.nota}` : `C'era già: ho aggiunto i dati che mancavano in ${r.nota}`); scelto = r.nota; dopo() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  } },
  campo('Nome', input('nome', 'Es. B&B La Corte')),
  campo('Stato', el('select', { name: 'stato' }, ...['attivo', 'lead', 'ex'].map(s => el('option', { value: s, testo: s })))),
  campo('Partita IVA', input('piva')), campo('Codice SDI', input('sdi', '7 caratteri')), campo('PEC', input('pec')), campo('Email', input('email', '', 'email')),
  campo('Referente', input('referente')), campo('Settore', input('settore', 'Es. ospitalità')),
  el('button', { class: 'primario', type: 'submit' }, ic('user-plus'), 'Aggiungi il cliente'))
  return el('details', { class: 'conti-aggiungi' }, el('summary', { testo: 'Nuovo cliente' }), f)
}

function moduloIncasso (clienti, dopo) {
  const f = el('form', { class: 'conti-modulo', onsubmit: async e => {
    e.preventDefault()
    try { const r = await api('/api/nucleo/incasso', { ...valori(f), fonte: 'a mano' }); notifica(`Incasso di ${euro(r.importo)} registrato in ${r.nota}.`); dopo() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  } },
  campo('Importo €', input('importo', '0,00')), campo('Data', Object.assign(input('data', '', 'date'), { value: oggiISO() })),
  campo('Cliente', sceltaCliente(clienti)), campo('Descrizione', input('descrizione', 'Es. Acconto sito')), campo('Riferimento', input('riferimento', 'Es. Fattura 2026-03')),
  el('button', { class: 'primario', type: 'submit' }, ic('plus'), 'Registra'))
  return f
}

function moduloPreventivo (clienti, dopo) {
  if (!clienti.length) return vuoto('Prima aggiungi un cliente.')
  const righe = el('div', { class: 'conti-righe' })
  const nuovaRiga = () => righe.append(el('div', { class: 'conti-riga-prev' }, input('descrizione', 'Descrizione'), input('quantita', '1'), input('prezzo', 'Prezzo €')))
  nuovaRiga()
  const f = el('form', { class: 'conti-modulo', onsubmit: async e => {
    e.preventDefault()
    const voci = [...righe.children].map(r => ({ descrizione: r.querySelector('[name=descrizione]').value, quantita: r.querySelector('[name=quantita]').value || 1, prezzo: r.querySelector('[name=prezzo]').value })).filter(v => v.descrizione && v.prezzo)
    try { const r = await api('/api/nucleo/preventivo', { cliente: f.querySelector('[name=cliente]').value, righe: voci, validita: f.querySelector('[name=validita]').value }); notifica(`Preventivo ${r.numero} in bozza (${euro(r.totale)}): ${r.nota}`, { tipo: 'sempre' }); dopo() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  } },
  campo('Cliente', sceltaCliente(clienti, 'Scegli il cliente')), righe,
  el('button', { type: 'button', class: 'quieto piccolo', onclick: nuovaRiga }, ic('plus'), 'Un\'altra riga'),
  campo('Valido per (giorni)', Object.assign(input('validita', '30', 'number'), { value: 30 })),
  el('button', { class: 'primario', type: 'submit' }, ic('pencil-simple'), 'Crea la bozza'))
  return f
}
