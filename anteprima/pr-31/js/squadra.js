// La Squadra, una sezione della scrivania (Marco, 23-11: «la squadra mi fa una sezione dedicata dentro alla scrivania… la chat,
// il tuo lavoro, le tue squadre e lo storico, ed elimini squadra dalla dashboard»; scrivania.js la apre). Prima era una stanza (Marco, 20-11: «una sessione condivisa… su GitHub… la propria postazione, quella dell'altro… una gerarchia
// di comando» · «una notifica quando l'altra persona svolge il lavoro… un resoconto che mi faccia capire cos'ha fatto»).
// Senza un'area della squadra: il modulo per collegarla dal repository. Con l'area: chi sei, prendi e manda il lavoro, la squadra
// con la gerarchia e cosa può scrivere ognuno, gli incarichi da dare a chi sta sotto, le novità degli altri con il resoconto.
import { el, api, notifica, quando, nomeNota } from './base.js'
import { fermaCartella, boxCartella } from './cartella.js'
import { ic } from './icone.js'
import { obsidian } from './ia.js'
import { leTueSquadre, storicoEMessaggi } from './squadre.js'
import { griglia, iconeCard } from './riquadri.js'
import { MISURA, salva, pulsanteAnnulla } from './su-misura.js'
import { apriInvio } from './invio.js'
import { numerino } from './notifiche-squadra.js'

const ORA = iso => new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
let ultimo = null

// la stanza a caselle, come la scrivania (Marco, 22-11: «dammi la possibilità di personalizzare come nella scrivania anche queste
// parti»): ogni parte è una casella che si sposta, si allarga, si rimpicciolisce, si apre a schermo intero e si toglie; le tolte si
// rimettono da «Tolte». La disposizione sta con quella della scrivania (squadra, in disposizione.mjs).
// la chat e il lavoro degli altri erano stati tolti il 22-11; il 23-11 Marco li rivuole qui, nella sezione della scrivania;
// il 25-11 il lavoro degli altri va via di nuovo («leva il lavoro degli altri e usiamo solo lo storico»)
const TITOLI_SQUADRA = { punto: 'Il punto', assegna: 'Assegna una task', chat: 'La chat', lavoro: 'Il tuo lavoro', tue: 'Le tue squadre', storico: 'Lo storico', persone: 'Chi c’è' }
const fascia = (classe, titolo, ...dentro) => el('section', { class: 'fascia ' + classe }, el('header', {}, el('h2', { testo: titolo })), ...dentro)
let ultima = null

export async function mostra (stanza) {
  const d = await api('/api/squadra'), rifai = () => mostra(stanza)
  // più squadre, lo storico e i messaggi (Marco, 21-11): squadre.js
  const tue = await leTueSquadre(rifai)
  if (!d.attiva) { ultima = null; return stanza.replaceChildren(testata('La squadra', 'Un cervello condiviso su GitHub: ognuno la sua postazione, gli incarichi, il lavoro di tutti'), tue, collega(d)) }
  const n = await api('/api/squadra/novita').catch(() => ({ novita: [] }))
  ultimo = n.ultimo
  const parti = await storicoEMessaggi(d, rifai)
  const caselle = { punto: puntoSquadra(d, n, rifai), assegna: d.io ? fascia('squadra-assegna', 'Assegna una task', await assegna(d, rifai)) : null, chat: parti.messaggi, lavoro: d.io ? fascia('squadra-lavoro', 'Il tuo lavoro', azioni(d, rifai)) : chiSei(d, rifai), tue, storico: parti.storico,
    persone: fascia('squadra-persone', 'Chi c’è', albero(d, rifai)) }
  ultima = { stanza, d, caselle, github: parti.github }
  disegna()
  // aperta la sezione, le novità sono viste: via il numerino su «Squadra»
  if (n.ultimo) api('/api/squadra/visto', { sha: n.ultimo }).then(() => numerino(0)).catch(() => {})
}

// la card principale della Squadra (Marco, 25-11 sera: «fai anche una card principale per la squadra»): chi sei, quante persone,
// le novità degli altri, l'ultimo giro con GitHub; ogni numero apre la sua card (anche se è dietro un'altra scheda della cartella,
// rimpicciolita o tolta), e i due gesti di tutti i giorni: assegnare una task e prendere le novità
function vedi (id) {
  const sq = MISURA.d?.squadra, r = sq?.riquadri.find(x => x.id === id)
  if (!r) return
  const g = r.gruppo && sq.gruppi?.find(x => x.id === r.gruppo)
  if (r.nascosto || (g && g.scelto !== id) || r.piccolo) { r.nascosto = false; r.piccolo = false; if (g) g.scelto = id; salva({ subito: true }) }
  requestAnimationFrame(() => document.querySelector(`.riquadro[data-id="${r.gruppo ?? id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function puntoSquadra (d, n, rifai) {
  const voce = (icona, numero, nome, id, attento = false) => el('button', { type: 'button', class: 'punto-voce' + (attento ? ' attento' : ''), title: 'Apri', onclick: () => vedi(id) },
    ic(icona), el('b', { testo: numero }), el('span', { testo: nome }))
  const nuove = n?.novita?.length ?? 0, persone = d.persone?.length ?? 0
  const prendi = el('button', { type: 'button', class: 'secondario piccolo', onclick: async e => {
    const b = e.currentTarget; b.disabled = true
    try { const r = await api('/api/squadra/prendi', {}); if (r.errore) throw new Error(r.errore); notifica('Novità prese.'); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
  } }, ic('arrows-clockwise'), 'Prendi le novità')
  return el('section', { class: 'fascia punto-squadra' },
    el('header', {}, el('h2', { testo: d.io ? `Ciao ${d.io.nome}` : 'La squadra' }), el('span', { class: 'sopra piccolo', testo: d.io ? `${d.ruoli?.[d.io.ruolo] ?? d.io.ruolo ?? ''} · ${d.area?.nome ?? ''}` : 'Dimmi chi sei, per sapere dove puoi scrivere' })),
    el('nav', { class: 'il-punto', 'aria-label': 'Il punto della squadra' },
      voce('users-three', String(persone), persone === 1 ? 'persona' : 'persone', 'persone'),
      voce('bell', String(nuove), nuove === 1 ? 'novità dagli altri' : 'novità dagli altri', 'storico', nuove > 0),
      voce('paper-plane-tilt', 'Chat', 'scrivi alla squadra', 'chat'),
      voce('clock', d.sync?.quando ? new Date(d.sync.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—', d.sync?.errore ? 'ultimo giro: ' + d.sync.errore : 'ultimo giro con GitHub', 'lavoro', Boolean(d.sync?.errore))),
    el('div', { class: 'bottoni' }, d.io ? el('button', { type: 'button', class: 'primario piccolo', onclick: () => vedi('assegna') }, ic('user-plus'), 'Assegna una task') : null, prendi))
}

function disegna () {
  if (!ultima) return
  const { stanza, d, caselle, github } = ultima, sq = MISURA.d?.squadra
  const testa = testata(d.nome, d.daFuori ? `Dall’area personale · ${d.io ? `sei ${d.io.nome}` : 'dimmi chi sei'} · cambi squadra da «Le tue squadre»` : d.io ? `Sei ${d.io.nome}, ${d.ruoli[d.io.ruolo]?.toLowerCase() ?? d.io.ruolo} · trascina le card per spostarle, una sopra l’altra per fare una cartella` : 'Dimmi chi sei, per sapere dove puoi scrivere')
  if (!sq) return stanza.replaceChildren(testa, github ?? '', ...Object.values(caselle).filter(Boolean))
  const tolte = sq.riquadri.filter(r => r.nascosto && TITOLI_SQUADRA[r.id])
  // card divise, che si sovrappongono in cartelle con il nome che vuoi (Marco, 25-11 sera: «tutto il lavoro delle card divise e
  // sovrapponibili… e a squadra»): la pagina unica del pomeriggio torna la griglia di card, con le tre cartelle di partenza
  const contenuti = Object.fromEntries(Object.entries(caselle).filter(([, x]) => x).map(([id, x]) => [id, () => x]))
  // le tolte sono icone: un clic apre la card, «Nella Squadra» la rimette (Marco, 25-11 sera)
  const icone = tolte.length ? iconeCard(contenuti, disegna, { titoli: TITOLI_SQUADRA, dove: () => MISURA.d.squadra, qui: 'Nella Squadra' }) : ''
  stanza.replaceChildren(testa, github ?? '', el('div', { class: 'squadra-sopra' }, pulsanteAnnulla()), icone, griglia(contenuti, disegna, { dove: () => MISURA.d.squadra, titoli: TITOLI_SQUADRA,
    vuoto: el('p', { class: 'vuoto', testo: 'Hai tolto tutte le caselle: sono fra le icone qui sopra.' }) }))
}
addEventListener('su-misura', () => { if (ultima?.stanza.isConnected) disegna() })

const testata = (titolo, sotto) => el('div', { class: 'testata' }, el('div', {}, el('p', { class: 'sopra', testo: sotto }), el('h1', { testo: titolo })))

// collegare l'area: indirizzo del repository e cartella dove scaricarlo
function collega (d) {
  const repo = el('input', { placeholder: 'https://github.com/nome/repository', 'aria-label': 'Indirizzo del repository', class: 'campo-lungo' })
  const cartella = el('input', { placeholder: 'C:\\Users\\…\\Documents\\Delion\\La squadra', 'aria-label': 'Cartella dove scaricarlo', class: 'campo-lungo' })
  const nome = el('input', { placeholder: 'La squadra', 'aria-label': 'Nome dell\'area' })
  const esitoCollega = boxCartella() // la cartella controllata prima di scaricare (cartella.js)
  const scegli = window.delionApp?.scegliCartella && el('button', { type: 'button', class: 'secondario', testo: 'Scegli…', onclick: async () => { const c = await window.delionApp.scegliCartella('Dove scaricare la squadra'); if (c) cartella.value = c + '\\' + (repo.value.split('/').pop()?.replace(/\.git$/, '') || 'squadra') } })
  return el('section', { class: 'pannello squadra-collega' },
    el('h2', { testo: 'Collega l\'area della squadra' }),
    el('p', { class: 'sopra', testo: 'Ti serve l\'invito al repository su GitHub. La prima volta Windows ti chiede di entrare in GitHub dal browser.' }),
    d.aree?.length ? el('p', { class: 'sopra' }, 'Hai già un\'area della squadra: passaci dal nome dell\'area, in alto.') : null,
    el('form', { class: 'campi-area', onsubmit: async e => {
      e.preventDefault(); const b = e.submitter ?? e.currentTarget.querySelector('button.primario'); b.disabled = true; b.textContent = 'Scarico…'
      try { const r = await api('/api/squadra/collega', { repo: repo.value, cartella: cartella.value, nome: nome.value }); if (fermaCartella(r, { box: esitoCollega, campo: cartella, riprova: () => e.target.requestSubmit() })) { b.disabled = false; b.textContent = 'Collega'; return } notifica('L\'area della squadra è pronta. Mirion si riapre lì.', { tipo: 'sempre' }); setTimeout(() => { location.hash = 'scrivania?sezione=squadra'; location.reload() }, 600) }
      catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false; b.textContent = 'Collega' }
    } }, el('label', {}, el('span', { testo: 'Il repository' }), repo), el('label', {}, el('span', { testo: 'La cartella' }), el('span', { class: 'riga-cartella' }, cartella, scegli)), esitoCollega,
      el('label', {}, el('span', { testo: 'Il nome dell\'area' }), nome), el('button', { class: 'primario', testo: 'Collega' })))
}

function chiSei (d, rifai) {
  return el('section', { class: 'pannello squadra-chi' }, el('h2', { testo: 'Chi sei?' }), el('div', { class: 'bottoni' },
    ...d.persone.map(p => el('button', { type: 'button', class: 'secondario', testo: p.nome, onclick: async () => { try { await api('/api/squadra/io', { io: p.id }); rifai() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }))))
}

// prendi e manda: il lavoro va su GitHub solo dove il tuo ruolo scrive; il resto resta qui, e si dice cosa
function azioni (d, rifai) {
  const esito = el('p', { class: 'sopra squadra-esito', 'aria-live': 'polite', testo: d.sync?.quando ? `Ultimo giro: ${ORA(d.sync.quando)}${d.sync.errore ? ' · ' + d.sync.errore : ''}` : '' })
  // quello che fai sulla scrivania parte da solo (squadra.mjs, «subito»): qui l'ultimo invio, perché si veda che è partito
  const subito = el('p', { class: 'sopra piccolo', testo: `Quello che fai sulla scrivania (spunti, rimandi, aggiungi task e incarichi) parte da solo su GitHub e arriva agli altri.${d.sync?.inviato ? ` Ultimo: ${ORA(d.sync.inviato.quando)}, ${d.sync.inviato.cosa}.` : ''}` })
  const fai = async (cosa, b) => {
    b.disabled = true
    try {
      const r = await api('/api/squadra/' + cosa, {})
      if (r.errore) throw new Error(r.errore)
      esito.textContent = cosa === 'prendi' ? 'Novità prese.' : `${r.mandati ? `Mandati ${r.mandati} file.` : r.partiti ? 'Partito il lavoro che aspettava la rete.' : 'Niente di nuovo da mandare.'}${r.fermi?.length ? ` Restano qui, fuori dai tuoi permessi: ${r.fermi.slice(0, 5).join(', ')}${r.fermi.length > 5 ? '…' : ''}` : ''}`
      if (cosa === 'prendi') rifai()
    } catch (e) { esito.textContent = e.message; notifica(e.message, { tipo: 'sempre' }) } finally { b.disabled = false }
  }
  return el('div', { class: 'squadra-azioni' },
    el('button', { type: 'button', class: 'secondario', onclick: e => fai('prendi', e.currentTarget) }, ic('arrows-clockwise'), 'Prendi le novità'),
    el('button', { type: 'button', class: 'primario', onclick: e => fai('manda', e.currentTarget) }, ic('upload-simple'), 'Manda il mio lavoro'),
    d.daFuori ? null : el('a', { class: 'quieto', href: '#cerca?n=' + encodeURIComponent(`Incarichi/${d.io.id}.md`), testo: 'I miei incarichi' }), // dall'area personale la ricerca è nelle note personali
    d.porta?.serve ? el('button', { type: 'button', class: 'quieto', testo: 'Esci da Mirion', onclick: async () => { await api('/api/accesso/esci', {}); location.reload() } }) : null, esito, subito)
}

// la gerarchia: dal titolare in giù; il titolare aggiunge persone e cambia i ruoli; chi sta sopra dà incarichi
function albero (d, rifai) {
  const io = d.io, sono = io?.ruolo === 'titolare', sotto = new Set(io ? d.persone.find(p => p.id === io.id)?.sotto ?? [] : [])
  const ramo = capo => d.persone.filter(p => p.sopra === capo).map(p => el('li', {},
    el('div', { class: 'persona-riga' }, el('b', { testo: p.nome }), el('span', { class: 'ruolo ruolo-' + p.ruolo, testo: d.ruoli[p.ruolo] ?? p.ruolo }),
      p.reparto ? el('span', { class: 'reparto', title: p.contesto ?? '', testo: p.reparto }) : null,
      // il reparto con un tasto (Marco, 23-11): lo dà il titolare, a chiunque, anche a sé
      sono && el('button', { type: 'button', class: 'quieto', title: 'Il reparto e cosa fa: va nel CLAUDE.md, così l’IA sa a chi dare le task', onclick: () => scegliReparto(p, d, rifai) }, ic('briefcase'), p.reparto ? 'Cambia reparto' : 'Reparto'),
      (sotto.has(p.id) || p.id === io?.id) && el('button', { type: 'button', class: 'quieto', onclick: () => incarico(p, rifai) }, ic('plus'), 'Incarico')),
    p.contesto ? el('small', { class: 'contesto', testo: 'Si occupa di: ' + p.contesto }) : null,
    sono && p.ruolo !== 'titolare' ? accessoRiga(p, d.accessi?.[p.id], rifai, d.salvati?.includes(p.id)) : null,
    el('small', { class: 'scrive', testo: p.scrive.length ? 'Scrive in: ' + p.scrive.map(g => g === '**' ? 'tutto' : (g.endsWith('/**') ? g.slice(0, -2) : g)).join(', ') : 'Legge e basta' }),
    el('ul', {}, ...ramo(p.id))))
  return el('div', {}, el('ul', { class: 'albero-squadra' }, ...ramo(null)), sono ? nuovaPersona(d, rifai) : null)
}

function nuovaPersona (d, rifai) {
  const nome = el('input', { placeholder: 'Nome', 'aria-label': 'Nome', required: true })
  const ruolo = el('select', { 'aria-label': 'Ruolo' }, ...['collaboratore', 'responsabile', 'ospite'].filter(k => d.ruoli[k]).map(k => [k, d.ruoli[k]]).map(([k, n]) => el('option', { value: k, testo: n })))
  const sopra = el('select', { 'aria-label': 'Chi sta sopra' }, ...d.persone.map(p => el('option', { value: p.id, testo: 'sotto ' + p.nome })))
  // chi entra ha già il suo reparto (Marco, 23-11); il contesto è quello del reparto, e si cambia dopo con «Cambia reparto»
  const reparto = el('select', { 'aria-label': 'Reparto' }, el('option', { value: '', testo: 'Reparto: dopo' }), ...Object.entries(d.reparti ?? {}).filter(([k]) => k !== 'altro').map(([k, x]) => el('option', { value: k, testo: x.nome })))
  return el('form', { class: 'riga-form nuova-persona', onsubmit: async e => { e.preventDefault(); try { const r = await api('/api/squadra/persona', { nome: nome.value, ruolo: ruolo.value, sopra: sopra.value, reparto: reparto.value || null }); notifica('Aggiunta, e già mandata alla squadra su GitHub.', { tipo: 'sempre' }); rifai(); if (r.accesso) credenziali(r.accesso, true) } catch (err) { notifica(err.message, { tipo: 'sempre' }) } } },
    nome, ruolo, reparto, sopra, el('button', { class: 'secondario' }, ic('user-plus'), 'Aggiungi'))
}

// il reparto di una persona: un tasto per ognuno di quelli di partenza (il contesto si scrive da solo, e si cambia), o uno scritto a mano
function scegliReparto (p, d, rifai) {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const R = d.reparti ?? {}, giaChiave = Object.keys(R).find(k => R[k].nome === p.reparto) ?? (p.reparto ? 'altro' : null)
  let scelto = giaChiave
  const nomeAltro = el('input', { placeholder: 'Il nome del reparto', 'aria-label': 'Il nome del reparto', maxlength: 40, value: giaChiave === 'altro' ? p.reparto ?? '' : '', hidden: giaChiave !== 'altro' })
  const contesto = el('textarea', { rows: 3, maxlength: 400, 'aria-label': 'Di cosa si occupa', placeholder: 'Di cosa si occupa, in una frase' }); contesto.value = p.contesto ?? ''
  const tasti = el('div', { class: 'reparti-tasti', role: 'group', 'aria-label': 'Il reparto' }, ...Object.entries(R).map(([k, x]) => el('button', { type: 'button', class: 'secondario', 'aria-pressed': String(k === scelto), testo: x.nome, onclick: e => {
    scelto = k; tasti.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)))
    nomeAltro.hidden = k !== 'altro'; if (k === 'altro') nomeAltro.focus()
    // il contesto del reparto, se quello scritto è vuoto o è quello di un altro reparto di partenza
    if (!contesto.value.trim() || Object.values(R).some(y => y.contesto === contesto.value.trim())) contesto.value = x.contesto
  } })))
  const salva = el('button', { class: 'primario', testo: 'Salva e manda' })
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Il reparto di ${p.nome}` },
    el('header', {}, el('h2', { testo: `Il reparto di ${p.nome}` }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    el('p', { class: 'sopra', testo: `Va in .delion/squadra.json e nel CLAUDE.md del cervello («Chi fa cosa»), e parte subito su GitHub: l’IA di tutti sa che le task di questo reparto sono di ${p.nome}.` }),
    el('form', { class: 'campi-area', onsubmit: async e => {
      e.preventDefault(); if (salva.disabled) return
      if (!scelto) return notifica('Scegli un reparto.', { tipo: 'sempre' })
      salva.disabled = true
      try {
        const r = await api('/api/squadra/reparto', { id: p.id, reparto: scelto, nomeReparto: nomeAltro.value, contesto: contesto.value })
        fondo.remove(); notifica(r.mandato ? `${p.nome}: ${r.persona.reparto}. Già su GitHub.` : `${p.nome}: ${r.persona.reparto}. Salvato qui; su GitHub ${r.errore}`, { tipo: 'sempre' }); rifai()
      } catch (err) { salva.disabled = false; notifica(err.message, { tipo: 'sempre' }) }
    } }, tasti, nomeAltro, el('label', {}, el('span', { testo: 'Di cosa si occupa' }), contesto), salva)))
  fondo.addEventListener('keydown', e => { if (e.key === 'Escape') fondo.remove() })
  document.body.append(fondo); (tasti.querySelector('[aria-pressed="true"]') ?? tasti.querySelector('button'))?.focus()
}

// assegnare una task (Marco, 25-11: «assegnare task tramite Claude o tramite me»): a te o a chi sta sotto di te (il titolare a
// tutti), con la data se c'è. Diventa una casella in Incarichi/<persona>.md e parte subito su GitHub, anche dall'area personale.
// Claude fa lo stesso scrivendo nella stessa nota (le regole sono nel CLAUDE.md della squadra, «Dare una task»)
async function assegna (d, rifai) {
  const { persone = [] } = await api('/api/squadra/a-chi').catch(() => ({}))
  if (!persone.length) return el('p', { class: 'sopra', testo: 'Il tuo ruolo non dà task ad altri.' })
  const chi = el('select', { 'aria-label': 'A chi' }, ...persone.map(p => el('option', { value: p.id, testo: p.id === d.io.id ? `A me (${p.nome})` : p.nome + (p.reparto ? ` · ${p.reparto}` : '') })))
  const altro = persone.find(p => p.id !== d.io.id); if (altro) chi.value = altro.id
  const t = el('input', { placeholder: 'Cosa deve fare', 'aria-label': 'La task', required: true, maxlength: 300 }), data = el('input', { type: 'date', 'aria-label': 'Entro il' })
  return el('div', {},
    el('form', { class: 'riga-form squadra-assegna-form', onsubmit: async e => {
      e.preventDefault(); const b = e.target.querySelector('button'); if (b.disabled) return; b.disabled = true
      try { const r = await api('/api/squadra/incarico', { persona: chi.value, testo: t.value, data: data.value || null }); const n = persone.find(p => p.id === r.persona)?.nome ?? r.persona; t.value = ''; data.value = ''; notifica(`Task data a ${n}: è in Incarichi/${r.persona}.md e parte su GitHub.`, { tipo: 'sempre' }) }
      catch (err) { notifica(err.message, { tipo: 'sempre' }) } finally { b.disabled = false }
    } }, chi, t, data, el('button', { class: 'primario' }, ic('paper-plane-tilt'), 'Assegna')),
    el('p', { class: 'sopra piccolo', testo: 'Anche Claude può assegnarle: chiediglielo (es. «dai a Sava la revisione del sito entro venerdì»). Scrive in Incarichi/<persona>.md come dice il CLAUDE.md della squadra, e Mirion la manda su GitHub al giro dopo.' }))
}

function incarico (p, rifai) {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const t = el('input', { placeholder: 'Cosa deve fare', 'aria-label': 'L\'incarico', required: true }), data = el('input', { type: 'date', 'aria-label': 'Entro il' })
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Incarico per ${p.nome}` },
    el('header', {}, el('h2', { testo: `Un incarico per ${p.nome}` }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    el('p', { class: 'sopra', testo: `Diventa una casella in Incarichi/${p.id}.md. Poi «Manda il mio lavoro» e gli arriva.` }),
    el('form', { class: 'campi-area', onsubmit: async e => { e.preventDefault(); const b = e.target.querySelector('button'); if (b.disabled) return; b.disabled = true /* un clic solo: due davano due incarichi (23-11) */; try { await api('/api/squadra/incarico', { persona: p.id, testo: t.value, data: data.value || null }); fondo.remove(); notifica(`Incarico scritto per ${p.nome}: ora «Manda il mio lavoro».`, { tipo: 'sempre' }); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false } } },
      el('label', {}, el('span', { testo: 'Cosa' }), t), el('label', {}, el('span', { testo: 'Entro il (se c\'è)' }), data), el('button', { class: 'primario', testo: 'Scrivi l\'incarico' }))))
  document.body.append(fondo); t.focus()
}

// l'accesso a Mirion di una persona (server/accessi.mjs), per il titolare: chi entra nella squadra entra in Mirion; senza
// l'accesso no, anche con il programma (Marco, 22-11). Password dimenticata: «Nuova password», e si manda il messaggio.
function accessoRiga (p, a, rifai, salvata = false) {
  const fai = async (via, testo) => {
    try { const r = await api('/api/accessi/' + via, { persona: p.id }); rifai(); if (via === 'crea') credenziali(r); else notifica(testo, { tipo: 'sempre' }) } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  // togliere l'accesso chiede un secondo clic sullo stesso pulsante (le finestre di conferma qui non ci sono)
  const togli = el('button', { type: 'button', class: 'quieto piccolo', testo: 'Togli l’accesso', onclick: () => {
    if (togli.dataset.sicuro) return fai('togli', `${p.nome} non entra più in Mirion.`)
    togli.dataset.sicuro = '1'; togli.textContent = 'Sicuro? Premi ancora'; setTimeout(() => { delete togli.dataset.sicuro; togli.textContent = 'Togli l’accesso' }, 4000)
  } })
  return el('div', { class: 'accesso-riga' },
    el('small', { class: a ? 'segno-bene' : 'sopra', testo: a ? `Entra in Mirion come «${a.utente}» · password del ${new Date(a.creato).toLocaleDateString('it-IT')}` : 'Non entra in Mirion: non ha ancora l’accesso' }),
    el('span', { class: 'bottoni' },
      el('button', { type: 'button', class: 'quieto piccolo', testo: a ? 'Nuova password' : 'Dai l’accesso', onclick: () => fai('crea') }),
      a && salvata ? el('button', { type: 'button', class: 'quieto piccolo', testo: 'Mostra la password', onclick: async () => { try { credenziali(await api('/api/accessi/vedi?persona=' + encodeURIComponent(p.id)), false, true) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }) : null,
      a ? togli : null))
}

// nome utente e password appena creati: si vedono una volta sola, con il messaggio pronto da mandare
function credenziali (r, nuova = false, salvata = false) {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const testo = `Ciao ${r.nome}, ecco come entri in Mirion:

Nome utente: ${r.utente}
Password: ${r.password}

La password è solo tua. Se la dimentichi, scrivimi e te ne faccio una nuova.`
  const copia = el('button', { type: 'button', class: 'primario', onclick: async () => { try { await navigator.clipboard.writeText(testo); copia.replaceChildren(ic('check'), 'Copiato') } catch { notifica('Non riesco a copiare: seleziona il testo e copialo.', { tipo: 'sempre' }) } } }, ic('copy'), 'Copia il messaggio')
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': `L'accesso di ${r.nome}` },
    el('header', {}, el('h2', { testo: `L'accesso di ${r.nome}` }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    el('p', { class: 'sopra', testo: salvata ? `Salvata su questo computer il ${new Date(r.creato).toLocaleDateString('it-IT')}: è quella che vale adesso.` : `${nuova ? `${r.nome} è nella squadra. ` : ''}Mandagliela (WhatsApp, mail). È già su GitHub: la sua Mirion la trova alla prossima apertura, e quella di prima non vale più. Resta salvata su questo computer: la rivedi con «Mostra la password».` }),
    el('dl', { class: 'credenziali' }, el('dt', { testo: 'Nome utente' }), el('dd', {}, el('code', { testo: r.utente })), el('dt', { testo: 'Password' }), el('dd', {}, el('code', { testo: r.password }))),
    el('textarea', { class: 'messaggio-accesso', readonly: true, rows: 7, 'aria-label': 'Il messaggio da mandare', testo }),
    el('div', { class: 'bottoni' }, copia)))
  fondo.addEventListener('keydown', e => { if (e.key === 'Escape') fondo.remove() }) // Esc chiude, come gli altri cassetti
  document.body.append(fondo); copia.focus()
}
