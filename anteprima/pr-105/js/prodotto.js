// La scrivania di un software (Marco, 23-11: «Mirion è la software house: ogni implementazione è qualcosa di nuovo che va a
// finire nella barra a sinistra, mentre la scrivania deve considerare il lavoro, tramite Claude, del proprio progetto: come se
// creassimo delle scrivanie compartimentate, dove sulla principale possiamo mettere tutto e su quelle sotto ci vanno i software»
// · «redigi l'app a scrivania come la scrivania che si utilizza e trasforma ogni componente in card inseribile anche sulla
// scrivania tramite un click; la prima è personalizzabile, quella apposita anche ma solo con le cose inerenti alla sezione»).
// Ogni prodotto di .delion/prodotti.json ha una voce nella barra a sinistra (vociProdotti) che apre la sua scrivania: le sue
// card (Oggi, Il programma, Da fare, Lavora con l'IA, Notizie, Le note) si spostano, si allargano, si mettono in cartella e si
// tolgono come quelle della scrivania (riquadri.js, la disposizione in MISURA.d.prodotti[id]); sotto si rimettono quelle tolte.
// Ogni card ha «Metti sulla scrivania»: con un clic va anche sulla scrivania principale (id «p.<software>.<card>»), dove si
// costruisce con gli stessi pezzi (cartaPerScrivania). Un prodotto nuovo è una voce in più in prodotti.json, senza toccare il codice.
import { fitMinimal } from './minimal.js'
import { el, api, notifica, quando, $, $$, nomeNota } from './base.js'
import { ic, haIcona } from './icone.js'
import { casella } from './casella.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'
import { griglia, TITOLI, iconeCard, carteDentro } from './riquadri.js'
import { MISURA, salva, scrivania } from './su-misura.js'
import { pagina as paginaCompletaPiatto, PAGINE } from './pagine-piatto.js'
import { cornice } from './widget.js'
import { campoCodice } from './codice-barre.js'
import { voceTrainer, CARTE_TRAINER, LARGHE_TRAINER } from './schede-trainer.js'
import { cerchioSvg, cartaTrainerPerScrivania } from './clienti.js'
import * as G from './fit-guida.js'

export const CARTE = { oggi: 'Oggi', cibo: 'Cibo', colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena', spuntini: 'Spuntini', pasti: 'I pasti', attivita: 'Attività', acqua: 'Acqua', sonno: 'Sonno', integratori: 'Integratori', peso: 'Peso', misure: 'Le misure', allenamento: 'Allenamento', scheda: 'La scheda del trainer', percorso: 'Il tuo percorso', libreria: 'La libreria', esercizi: 'Gli esercizi', prestazioni: 'Cerchio prestazioni', check: 'Il check della settimana', settimana: 'La settimana', programma: 'Il programma', task: 'Da fare', ia: 'Lavora con l’IA', notizie: 'Notizie', note: 'Le note' }
const LARGHE = { oggi: 6, cibo: 6, colazione: 6, pranzo: 6, cena: 6, spuntini: 6, pasti: 6, attivita: 3, acqua: 3, sonno: 3, integratori: 3, peso: 3, misure: 3, allenamento: 6, scheda: 6, percorso: 6, libreria: 6, esercizi: 6, prestazioni: 3, check: 3, settimana: 6, programma: 12, task: 6, ia: 6, notizie: 6, note: 6 }
// le card di Mirion Fit che c'erano sul telefono e non qui (Marco, 26-11-2026 sera: «la dashboard completa uguale a quella del
// telefono»): la scheda del trainer, la libreria degli allenamenti, gli esercizi con la guida, il check della settimana, le misure
const NUOVE_FIT = ['scheda', 'percorso', 'libreria', 'esercizi', 'prestazioni', 'check', 'misure']
// Piatto in Mirion (Marco, 23-11: «non voglio che sia apribile da Piatto: si apra già quando seleziono Piatto, e devono essere
// tutte card minimaliste dove posso accedere per variare»): le card che fanno, e quelle del lavoro sul software (tolte all'inizio)
// Marco, 23-11 sera: «tutto il contenuto della scrivania completa di Piatto trasponilo in card sulla scrivania di Piatto»: un pasto
// per card e l'attività, come in Piatto; «I pasti» (tutti in una) resta fra le card tolte
const UN_PASTO = ['colazione', 'pranzo', 'cena', 'spuntini']
// Mirion Fit (24-11): anche il sonno e gli integratori, come in Piatto
const DEL_GIORNO = ['oggi', 'cibo', ...UN_PASTO, 'pasti', 'acqua', 'sonno', 'integratori', 'attivita', 'peso', 'misure', 'scheda', 'percorso', 'allenamento', 'libreria', 'esercizi', 'prestazioni', 'check', 'settimana'], DEL_LAVORO = ['programma', 'task', 'ia', 'notizie', 'note']
// Mirion Fit (Marco, 24-11 sera: «nell'app togli lavora con l'IA in scrivania, e il programma non lo rendere visualizzabile però
// assicurati che ci siano le card che lo sostituiscano»): nella scrivania di un software con le card del giorno non ci sono più
// «Il programma» né «Lavora con l'IA»; le card del giorno (Oggi, i pasti, Acqua, Sonno, Integratori, Attività, Peso, Allenamento,
// La settimana) fanno le sue veci.
// Marco, 24-11 sera: «togli i pasti e lasciali sfusi, card pasti via… le note pure via»: niente «I pasti» (restano Colazione,
// Pranzo, Cena e Spuntini, una per card), niente «Le note» e niente «Da fare» («da fare pure»): resta Notizie
// Marco, 26-11-2026: «metti tutti gli apparati del cibo in uno solo dove li selezionano se è pranzo, cena ecc. non lasciarli
// sparsi»: una card «Cibo» con i quattro pasti da scegliere, al posto di Colazione, Pranzo, Cena e Spuntini (come in Mirion Fit)
const SENZA = ['programma', 'ia', 'pasti', 'note', 'task', ...UN_PASTO]
const carteDi = p => haOggi(p) ? [...DEL_GIORNO, ...DEL_LAVORO].filter(c => !SENZA.includes(c)) : DEL_LAVORO
const PASTI = [['colazione', 'Colazione'], ['pranzo', 'Pranzo'], ['cena', 'Cena'], ['spuntini', 'Spuntini']]
// un'azione sul programma (acqua, peso, cibo, esercizio): la fa lui, poi le card si rileggono
async function fai (p, azione, dopo, detto) {
  try { await api('/api/prodotti/azione', { id: p.id, azione }); if (detto) notifica(detto); dopo?.() } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}
const numero = v => Number.isFinite(+v) ? Math.round(+v).toLocaleString('it-IT') : '—'
const oreDiSonno = h => { let o = Math.floor(h), m = Math.round((h - o) * 60); if (m === 60) { o++; m = 0 } return m ? `${o} h ${String(m).padStart(2, '0')}` : `${o} h` }
const barretta = (fatto, obiettivo, classe = '') => { const pc = obiettivo ? Math.min(100, Math.round(fatto / obiettivo * 100)) : 0; return el('span', { class: 'oggi-barra ' + classe, role: 'progressbar', 'aria-valuenow': pc, 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('i', { style: { width: pc + '%' } })) }
// le card che leggono i numeri del giorno: se mancano, dicono perché (spento, profilo da fare, errore)
function conNumeri (p, r, fatto) {
  if (r?.errore) return el('p', { class: 'vuoto', testo: 'Non si legge adesso: ' + r.errore })
  if (r?.manca) return el('p', { class: 'vuoto', testo: `Il programma di ${p.nome} non è ancora su questo computer: prendi le novità del cervello.` })
  if (r?.nessuno || !r?.dati) return el('p', { class: 'vuoto', testo: 'Nessun numero per oggi.' })
  if (r.dati.pronto === false) return el('p', { class: 'vuoto', testo: `Per cominciare serve il tuo profilo (peso, altezza, obiettivo): scrivilo nella card «Peso».` })
  return fatto(r.dati)
}
// «Oggi»: i numeri del giorno che dà il programma del software (Piatto: /api/riepilogo); gli altri, quando l'avranno («riepilogo» in prodotti.json)
const haOggi = p => Boolean(p.riepilogo) || p.id === 'piatto'

const fascia = (classe, titolo, sopra, ...dentro) => el('section', { class: 'fascia ' + classe, 'aria-label': titolo },
  el('header', {}, el('h2', { testo: titolo }), sopra), ...dentro)
const leggi = n => '#cerca?n=' + encodeURIComponent(n)
// Mirion Fit (id «piatto») ha la sua icona (build/icone-fit.mjs, 24-11: la casella di Mirion con un manubrio); gli altri un'icona Phosphor
const segno = p => p.id === 'piatto' ? el('span', { class: 'voce-iniziale voce-icona', 'aria-hidden': 'true' }, el('img', { src: './mirion-fit.svg', alt: '' }))
  : el('span', { class: 'voce-iniziale', 'aria-hidden': 'true' }, ic(p.icona && haIcona(p.icona + '/duo') ? p.icona : 'briefcase', { duo: true }))

// l'elenco dei software, letto una volta (si rilegge aprendo una loro scrivania)
let elenco = null
const prodotti = (fresco = false) => { if (!elenco || fresco) elenco = api('/api/prodotti').then(d => d.prodotti ?? []).catch(() => []); return elenco }
// i titoli delle card dei software, anche per la scrivania principale (le strisce, le cartelle, i pulsanti)
const registraTitoli = lista => {
  for (const p of lista) for (const [c, t] of Object.entries(CARTE)) TITOLI[`p.${p.id}.${c}`] = `${p.id === 'piatto' ? 'Mirion Fit' : p.nome} · ${t}`
  for (const [c, t] of Object.entries(CARTE_TRAINER)) TITOLI[`p.trainer.${c}`] = `Mirion Trainer · ${t}`
}

// la barra a sinistra: una voce per prodotto, sotto le stanze (barra.js le rimette al loro posto quando ridisegna)
export async function vociProdotti () {
  const nav = $('[data-stanze]'); if (!nav) return
  const lista = await prodotti(true); registraTitoli(lista)
  $('.voci-prodotti', nav)?.remove()
  // Mirion Fit, la prima estensione di Mirion (Marco, 24-11 sera: «Mirion Fit è il progetto che contiene anche Mirion Trainer, quindi
  // mettili assieme: sarebbe la prima estensione di Mirion»): un gruppo con il suo nome e due voci, «Fit» (la scrivania del diario,
  // l'app del cliente) e «Trainer» (i clienti, la loro analisi con Claude, la palestra: schede-trainer.js). Gli altri software sotto
  const voce = p => el('a', { href: '#prodotto?id=' + encodeURIComponent(p.id), 'data-prodotto': p.id, title: p.descrizione || p.nome }, segno(p), el('span', { testo: p.nome }))
  // 26-11 (Marco: «mirion fit non deve avere l'area clienti, solo mirion trainer»): due voci separate, Mirion Fit (il diario del
  // cliente) e Mirion Trainer (i clienti e la palestra); i clienti stanno solo in Mirion Trainer
  const trainer = voceTrainer(), fit = lista.find(p => p.id === 'piatto')
  trainer.querySelector('span:last-child').textContent = 'Mirion Trainer'
  const vFit = fit ? voce(fit) : null; if (vFit) vFit.querySelector('span:last-child').textContent = 'Mirion Fit'
  const box = el('div', { class: 'voci-prodotti', role: 'group', 'aria-label': 'Le estensioni' }, el('span', { class: 'voci-titolo', testo: 'Estensioni' }),
    vFit, trainer,
    ...lista.filter(p => p.id !== 'piatto').map(voce))
  $('.in-fondo', nav)?.before(box)
  const [nome, resto] = location.hash.slice(1).split('?') // aperta direttamente su un software: la sua voce si accende subito
  if (nome === 'clienti') trainer.setAttribute('aria-current', 'page')
  if (nome === 'prodotto') $(`[data-prodotto="${CSS.escape(new URLSearchParams(resto ?? '').get('id') ?? '')}"]`, box)?.setAttribute('aria-current', 'page')
}

// i dati di un software, chiesti una volta per disegno e divisi fra le sue card
// le pagine complete dei software (Marco, 23-11 sera: «solo card, passaggio due pagina completa» · «quando apri una pagina deve
// essere in stile Mirion, non rivisitata… e deve occupare la pagina»): ⛶ e il doppio clic aprono la pagina intera della card,
// disegnata da Mirion con i numeri del programma (pagine-piatto.js). Le card del lavoro sul software portano alle stanze di Mirion
const ultimi = {} // l'ultimo riepilogo letto di ogni software
const DI_MIRION = { task: '#scadute', notizie: '#notizie', ia: '#ia' }
export function paginaDi (pid, carta) {
  if (DI_MIRION[carta]) return DI_MIRION[carta]
  if (carta === 'programma') return '#gestionale?id=' + encodeURIComponent(pid)
  return PAGINE[carta] ? '#prodotto?id=' + encodeURIComponent(pid) + '&pagina=' + carta : null
}
// la card di un software sulla scrivania principale (id «p.<software>.<card>»): la sua pagina, o la scrivania del software
// la card principale (Mirion Fit «Oggi», Mirion Trainer «I numeri») si ingrandisce lì, a schermo intero, con le altre card dentro
export const paginaCompleta = id => { const [, pid, carta] = id.split('.'); if (DENTRO[pid] === carta) return null; return pid === 'trainer' ? '#clienti' : paginaDi(pid, carta) ?? '#prodotto?id=' + encodeURIComponent(pid) }
const DENTRO = { piatto: 'oggi', trainer: 'cifre' }
function datiDi (p) {
  const c = {}
  return {
    task: () => c.task ??= api('/api/task').catch(() => null),
    notizie: () => c.notizie ??= api('/api/notizie').catch(() => null),
    note: () => c.note ??= api('/api/prodotti/note?id=' + encodeURIComponent(p.id)).catch(() => ({ note: [] })),
    oggi: () => c.oggi ??= api('/api/prodotti/riepilogo?id=' + encodeURIComponent(p.id)).then(r => { if (r?.dati) ultimi[p.id] = r.dati; return r }).catch(e => ({ errore: e.message })),
  }
}

// «Metti sulla scrivania»: la card anche sulla scrivania principale, con un clic; di nuovo, si toglie (anche per Mirion Trainer: p = { id: 'trainer' })
export function bottoneScrivania (p, carta, larga = LARGHE[carta] ?? 6) {
  const id = `p.${p.id}.${carta}`, b = el('button', { type: 'button', class: 'quieto piccolo sulla-scrivania' })
  const r = () => scrivania()?.riquadri.find(x => x.id === id)
  const disegna = () => { const su = r() && !r().nascosto; b.replaceChildren(ic(su ? 'check' : 'plus'), su ? 'Sulla scrivania' : 'Metti sulla scrivania'); b.title = su ? 'È anche sulla scrivania principale: clic per toglierla da lì' : 'Mettila anche sulla scrivania principale, con un clic'; b.setAttribute('aria-pressed', String(Boolean(su))) }
  b.onclick = e => {
    e.stopPropagation()
    const s = scrivania(); if (!s) return
    let x = r()
    if (x && !x.nascosto) { x.nascosto = true; x.gruppo = null; notifica(`Tolta dalla scrivania «${s.nome}»: «${TITOLI[id] ?? id}».`) }
    else {
      if (!x) { x = { id, larghezza: larga, altezza: null, piccolo: false, nascosto: false, gruppo: null, colore: null }; s.riquadri.unshift(x) } else { x.nascosto = false; s.riquadri.splice(s.riquadri.indexOf(x), 1); s.riquadri.unshift(x) }
      notifica(`Messa sulla scrivania «${s.nome}»: «${TITOLI[id] ?? id}».`, { azione: { testo: 'Vai', fai: () => { location.hash = 'scrivania' } } })
    }
    salva({ subito: true }); disegna()
  }
  disegna(); return b
}

// le card. dove: 'prodotto' (la sua scrivania) o 'principale' (la scrivania di tutto: in testa il nome del software, e «Apri»)
function carta (p, quale, dati, rifai, dove) {
  const pg = dove === 'dentro' ? paginaDi(p.id, quale) : null
  const sopra = dove === 'dentro' ? (pg ? el('a', { class: 'quieto piccolo', href: pg, title: 'La pagina completa' }, ic('corners-out'), 'Pagina') : null)
    : dove === 'principale'
    ? el('a', { class: 'quieto piccolo', href: '#prodotto?id=' + encodeURIComponent(p.id), title: `La scrivania di ${p.nome}` }, segno(p), p.nome)
    : bottoneScrivania(p, quale)
  const titolo = (dove === 'principale' && quale !== 'programma' ? `${CARTE[quale]}` : CARTE[quale])
  const cartella = p.cartellaRel ?? '', progetto = cartella.split('/').pop()
  const corpo = el('div', { class: 'carta-corpo' }, el('p', { class: 'vuoto', testo: 'Leggo…' }))
  const riempi = async f => { try { corpo.replaceChildren(...[].concat(await f()).filter(Boolean)) } catch (e) { corpo.replaceChildren(el('p', { class: 'vuoto', testo: 'Non si legge adesso: ' + e.message })) } }

  if (quale === 'programma') {
    const stato = p.acceso ? 'acceso su questo computer' : p.programma?.ce ? 'pronto da accendere (si accende con «Apri»)' : p.programma ? 'il programma non è ancora su questo computer' : 'senza programma per ora'
    corpo.replaceChildren(
      p.descrizione ? el('p', { class: 'prodotto-descrizione', testo: p.descrizione }) : null,
      el('p', { class: 'sopra piccolo', testo: [p.per ? 'per ' + p.per : null, stato, p.provvisorio ? 'nome provvisorio' : null].filter(Boolean).join(' · ') }),
      el('div', { class: 'bottoni' },
        p.programma || p.online ? el('a', { class: 'primario piccolo', href: '#gestionale?id=' + encodeURIComponent(p.id) }, ic('arrow-right'), 'Apri ' + p.nome) : null,
        p.online ? el('button', { type: 'button', class: 'secondario piccolo', onclick: () => api('/api/prodotti/apri', { id: p.id, dove: 'online' }).catch(e => notifica(e.message, { tipo: 'sempre' })) }, ic('arrow-up-right'), 'Online') : null,
        p.cartellaCe ? el('button', { type: 'button', class: 'quieto piccolo', onclick: () => api('/api/prodotti/cartella', { id: p.id }).catch(e => notifica(e.message, { tipo: 'sempre' })) }, ic('folder-simple'), 'La cartella') : null,
        p.nostro ? el('button', { type: 'button', class: 'quieto piccolo', onclick: () => api('/api/prodotti/ferma', { id: p.id }).then(rifai).catch(e => notifica(e.message, { tipo: 'sempre' })) }, 'Ferma il programma') : null))
  } else if (quale === 'task') {
    riempi(async () => {
      const t = await dati.task(), sue = t ? [...(t.scadute ?? []), ...(t.dafare ?? [])].filter(k => cartella && k.nota?.startsWith(cartella + '/')) : []
      return sue.length ? [el('ul', { class: 'caselle' }, ...sue.slice(0, 12).map(k => casella(k, { dopo: rifai }))), sue.length > 12 ? el('p', { class: 'sopra piccolo', testo: `e altre ${sue.length - 12} nella stanza Task` }) : null]
        : el('p', { class: 'vuoto', testo: cartella ? `Niente da fare in ${cartella}.` : 'Il software non ha una cartella in prodotti.json.' })
    })
  } else if (quale === 'ia') {
    const richiesta = el('textarea', { rows: 3, placeholder: `Cosa vuoi fare su ${p.nome}?`, 'aria-label': 'La richiesta per l’IA' })
    const contesto = `Lavoriamo sul software «${p.nome}» della software house${cartella ? `, nella cartella «${cartella}» del cervello` : ''}. ${p.descrizione ? 'Cosa fa: ' + p.descrizione + '. ' : ''}Prima leggi la sua nota principale e le cose da fare («- [ ]») della cartella.`
    corpo.replaceChildren(
      el('div', { class: 'bottoni' }, ...pulsantiIA(ia => conIA.testo(`${contesto}\nPoi fammi il resoconto: a che punto è, cosa è fermo, e le prossime tre cose da fare in ordine.`, ia), { testo: 'Il resoconto con' })),
      richiesta,
      el('div', { class: 'bottoni' }, ...pulsantiIA(ia => { if (!richiesta.value.trim()) { richiesta.focus(); return notifica('Scrivi cosa vuoi fare.') } conIA.testo(`${contesto}\n${richiesta.value.trim()}`, ia) }, { testo: 'Fallo con' })))
  } else if (quale === 'notizie') {
    riempi(async () => {
      const ns = ((await dati.notizie())?.notizie ?? []).filter(n => n.progetto === progetto).slice(0, 6)
      return ns.length ? el('ul', { class: 'notizie-brevi' }, ...ns.map(n => el('li', { class: 'notizia-breve' },
        el('b', { class: 'notizia-punti', testo: n.punteggio }),
        el('div', {}, el('a', { href: leggi(n.rel), testo: n.titolo }), el('small', { class: 'sopra', testo: [n.fonte, n.aggiunta ? quando(n.aggiunta) : null].filter(Boolean).join(' · ') })),
        n.link ? el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Apri la pagina', onclick: () => window.open(n.link, '_blank', 'noopener') }, ic('arrow-square-out')) : null)))
        : el('p', { class: 'vuoto', testo: `Ancora nessuna notizia per ${progetto || p.nome}.` })
    })
  } else if (quale === 'note') {
    riempi(async () => {
      const nt = await dati.note()
      return nt.note.length ? el('ul', { class: 'note-prodotto' }, ...nt.note.slice(0, 12).map(n => el('li', {},
        el('a', { href: leggi(n.rel), testo: nomeNota(n.rel) }), el('small', { class: 'sopra', testo: n.rel.slice(cartella.length + 1, -(nomeNota(n.rel).length + 3)).replace(/\/$/, '') }), obsidian(n.rel, ''))))
        : el('p', { class: 'vuoto', testo: 'Nessuna nota nella cartella.' })
    })
  } else if (quale === 'oggi') {
    // sulla sua scrivania «Oggi» è breve: le calorie che restano e i macro; acqua, peso e allenamento hanno la loro card
    riempi(async () => { const v = vistaOggi(p, await dati.oggi(), rifai); return dove === 'dentro' ? v : [v, dentroOggi(p, dati, rifai)] }) // la card principale, completa anche in Mirion Fit (25-11 sera: «fai una card principale… per Mirion Fit»)
  } else if (quale === 'acqua') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => [
      el('div', {}, el('b', { class: 'oggi-medio', testo: numero(d.acqua) }), el('span', { class: 'sopra', testo: ` / ${numero(d.obiettivo?.acqua)} ml` })),
      barretta(d.acqua, d.obiettivo?.acqua, 'acqua'),
      el('div', { class: 'bottoni' },
        el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai(p, { tipo: 'acqua', ml: 250 }, rifai) }, ic('plus'), '250 ml'),
        el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Togli 250 ml', onclick: () => fai(p, { tipo: 'acqua', ml: -250 }, rifai) }, ic('minus')))]))
  } else if (quale === 'sonno') {
    // le ore della notte: tre tasti se non c'è ancora, ± mezz'ora se c'è; la media di 7 notti
    riempi(async () => conNumeri(p, await dati.oggi(), d => {
      const ore = h => { let o = Math.floor(h), m = Math.round((h - o) * 60); if (m === 60) { o++; m = 0 } return m ? `${o} h ${String(m).padStart(2, '0')}` : `${o} h` }
      const s = d.sonno, giu = s && s.ore < (d.piano?.sonno || 7)
      return [el('div', {}, el('b', { class: 'oggi-medio', testo: s ? ore(s.ore) : '—' }), el('span', { class: 'sopra', testo: s ? (giu ? '  sotto le ' + (d.piano?.sonno || 7) + ' ore' : '  riposato') : '  la notte passata' })),
        d.sonno7 ? el('small', { class: 'sopra', testo: `media ${ore(d.sonno7.ore)} in ${d.sonno7.notti} ${d.sonno7.notti === 1 ? 'notte' : 'notti'}` }) : null,
        el('div', { class: 'bottoni' }, ...(s
          ? [el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai(p, { tipo: 'sonno', ore: s.ore + 0.5 }, rifai) }, ic('plus'), '30 min'),
            el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Mezz’ora in meno', onclick: () => fai(p, { tipo: 'sonno', ore: Math.max(0.5, s.ore - 0.5) }, rifai) }, ic('minus'))]
          : [6, 7, 8].map(h => el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai(p, { tipo: 'sonno', ore: h }, rifai) }, `${h} ore`))))]
    }))
  } else if (quale === 'integratori') {
    // quelli di oggi: un clic per «preso» (con più dosi, una dose per clic); si aggiungono in Piatto (anche dal QR del trainer)
    riempi(async () => conNumeri(p, await dati.oggi(), d => (d.integratori ?? []).length
      ? el('ul', { class: 'pasto-voci' }, ...d.integratori.map((x, i) => el('li', {},
        el('button', { type: 'button', class: 'quieto piccolo', 'aria-pressed': String(x.presi >= x.dosi), onclick: () => fai(p, { tipo: 'integratore', indice: i }, rifai) }, ic(x.presi >= x.dosi ? 'check-circle' : 'plus'), x.nome),
        el('small', { class: 'sopra' + (x.finisce ? ' presto' : ''), testo: [x.dose, x.dosi > 1 ? `${x.presi}/${x.dosi}` : null, x.finisce ? 'sta finendo' : null].filter(Boolean).join(' · ') }))))
      : el('p', { class: 'vuoto', testo: 'Nessun integratore: si aggiungono in Mirion Fit, anche con il codice a barre o il QR del trainer.' })))
  } else if (quale === 'peso') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => {
      const campo = el('input', { type: 'number', step: '0.1', min: 20, max: 350, value: d.peso?.attuale ?? '', class: 'numero-breve', 'aria-label': 'Il peso di oggi, in kg' })
      const modulo = el('form', { class: 'riga-form', hidden: true, onsubmit: e => { e.preventDefault(); const kg = +campo.value; if (kg > 0) fai(p, { tipo: 'peso', kg }, rifai, `Peso di oggi: ${kg} kg.`) } }, campo, el('span', { testo: 'kg' }), el('button', { class: 'primario piccolo', testo: 'Salva' }))
      return [el('div', {}, el('b', { class: 'oggi-medio', testo: d.peso?.attuale ?? '—' }), el('span', { class: 'sopra', testo: ' kg' })),
        el('small', { class: 'sopra', testo: [d.peso?.obiettivo ? `obiettivo ${d.peso.obiettivo} kg` : null, d.peso?.diff30 != null ? `${d.peso.diff30 > 0 ? '+' : ''}${d.peso.diff30} in 30 giorni` : null].filter(Boolean).join(' · ') }),
        el('button', { type: 'button', class: 'quieto piccolo', onclick: () => { modulo.hidden = !modulo.hidden; if (!modulo.hidden) campo.focus() } }, ic('pencil-simple'), 'Cambia'), modulo]
    }))
  } else if (quale === 'settimana') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => vistaSettimana(d)))
  } else if (quale === 'cibo') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardCibo(p, d, rifai)))
  } else if (UN_PASTO.includes(quale)) {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardPasto(p, d, quale, rifai)))
  } else if (quale === 'attivita') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardAttivita(p, d)))
  } else if (quale === 'pasti') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardPasti(p, d, rifai)))
  } else if (quale === 'allenamento') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardAllenamento(p, d, rifai)))
  } else if (quale === 'percorso') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardPercorso(d)))
  } else if (quale === 'prestazioni') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardPrestazioni(d)))
  } else if (quale === 'scheda') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardScheda(p, d, rifai)))
  } else if (quale === 'libreria') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardLibreria(p, d, rifai)))
  } else if (quale === 'esercizi') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardEsercizi(p, d, rifai)))
  } else if (quale === 'check') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardCheck(p, d, rifai)))
  } else if (quale === 'misure') {
    riempi(async () => conNumeri(p, await dati.oggi(), d => cardMisure(p, d, rifai)))
  }
  return fascia('carta-prodotto carta-' + quale, titolo, sopra, corpo)
}

// tutte le card di Mirion Fit dentro «Oggi» (26-11-2026 notte): le icone, un clic e la card si apre lì; le card singole restano
function dentroOggi (p, dati, rifai) {
  const voci = carteDi(p).filter(c => c !== 'oggi').map(c => [c, CARTE[c]])
  return carteDentro(p.id, voci, c => carta(p, c, dati, rifai, 'dentro'),
    { inPiu: el('a', { class: 'quieto piccolo dentro-pagina', href: paginaDi(p.id, 'oggi'), title: 'Calorie e macro, la pagina completa' }, ic('arrow-square-out'), 'Calorie e macro') })
}

// «Oggi»: i numeri del giorno del software (Piatto: calorie, macro, acqua, peso, la settimana, gli esercizi se ci sono)
export function vistaOggi (p, r, rifai) {
  if (r?.errore) return el('p', { class: 'vuoto', testo: 'Non si legge adesso: ' + r.errore })
  if (r?.nessuno) return el('p', { class: 'vuoto', testo: `${p.nome} non dà ancora i numeri del giorno.` })
  if (r?.spento) return el('p', { class: 'vuoto', testo: r.manca ? `Il programma di ${p.nome} non è ancora su questo computer: prendi le novità del cervello.` : `${p.nome} si sta accendendo: riprova fra un attimo.` })
  const d = r?.dati
  if (!d) return el('p', { class: 'vuoto', testo: 'Nessun numero per oggi.' })
  if (d.pronto === false) return el('p', { class: 'vuoto', testo: 'Per cominciare serve il tuo profilo (peso, altezza, obiettivo): scrivilo nella card «Peso».' })
  const n = v => Number.isFinite(+v) ? Math.round(+v).toLocaleString('it-IT') : '—'
  const barra = (fatto, obiettivo, classe = '') => { const pc = obiettivo ? Math.min(100, Math.round(fatto / obiettivo * 100)) : 0; return el('span', { class: 'oggi-barra ' + classe, role: 'progressbar', 'aria-valuenow': pc, 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('i', { style: { width: pc + '%' } })) }
  const o = d.obiettivo ?? {}, m = d.mangiato ?? {}
  const macro = [['proteine', 'Proteine'], ['carboidrati', 'Carboidrati'], ['grassi', 'Grassi']]
  const max = Math.max(1, ...(d.settimana ?? []).map(g => +g.kcal || 0), +o.kcal || 0)
  const esercizi = Array.isArray(d.esercizi) ? d.esercizi : []
  return el('div', { class: 'oggi' },
    el('div', { class: 'oggi-kcal' },
      el('div', {}, el('b', { class: 'oggi-grande', testo: n(d.restano) }), el('span', { class: 'sopra', testo: ' kcal che restano' })),
      el('small', { class: 'sopra', testo: `mangiate ${n(m.kcal)} · bruciate ${n(d.bruciate)} · obiettivo ${n(o.kcal)}` }),
      barra(m.kcal, o.kcal)),
    el('div', { class: 'oggi-macro' }, ...macro.map(([k, t]) => el('div', {}, el('small', { class: 'sopra', testo: `${t} ${n(m[k])}/${n(o[k])} g` }), barra(m[k], o[k], k)))),
    el('div', { class: 'oggi-fila' },
      el('div', {}, el('small', { class: 'sopra', testo: 'Acqua' }), el('b', { testo: `${n(d.acqua)} / ${n(o.acqua)} ml` }), barra(d.acqua, o.acqua, 'acqua')),
      d.peso ? el('div', {}, el('small', { class: 'sopra', testo: 'Peso' }), el('b', { testo: `${d.peso.attuale ?? '—'} kg` }), el('small', { class: 'sopra', testo: [d.peso.obiettivo ? `obiettivo ${d.peso.obiettivo} kg` : null, d.peso.diff30 != null ? `${d.peso.diff30 > 0 ? '+' : ''}${d.peso.diff30} kg in 30 giorni` : null].filter(Boolean).join(' · ') })) : null,
      d.sonno?.ore ? el('div', {}, el('small', { class: 'sopra', testo: 'Sonno' }), el('b', { testo: oreDiSonno(d.sonno.ore) })) : null,
      d.giorniDiFila ? el('div', {}, el('small', { class: 'sopra', testo: 'Di fila' }), el('b', { testo: `${d.giorniDiFila} ${d.giorniDiFila === 1 ? 'giorno' : 'giorni'}` })) : null),
    // gli esercizi di oggi (Piatto, 23-11: per esercizio serie, ripetizioni in tutto, il carico più alto, il volume kg × ripetizioni;
    // «allenamento» è il totale del giorno)
    esercizi.length ? el('div', { class: 'oggi-esercizi' },
      el('small', { class: 'sopra', testo: d.allenamento ? `Allenamento di oggi: ${n(d.allenamento.esercizi)} esercizi · ${n(d.allenamento.serie)} serie · ${n(d.allenamento.volume)} kg sollevati` : 'Esercizi di oggi' }),
      el('ul', {}, ...esercizi.slice(0, 8).map(e => el('li', { testo: [e.nome, e.serie ? `${e.serie} serie` : null, e.ripetizioni ? `${e.ripetizioni} ripetizioni` : null, e.kg ? `fino a ${e.kg} kg` : null, e.volume ? `${n(e.volume)} kg in tutto` : null, e.minuti ? `${e.minuti} min` : null].filter(Boolean).join(' · ') })))) : null,
    d.settimana?.length ? el('div', { class: 'oggi-settimana', 'aria-label': 'Le calorie della settimana' }, ...d.settimana.map(g => el('div', { class: 'oggi-giorno', title: `${g.giorno}: ${n(g.kcal)} kcal` },
      el('i', { style: { height: Math.round((+g.kcal || 0) / max * 100) + '%' } }), el('small', { testo: new Date(g.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'narrow' }) })))) : null)
}

// una card di un software sulla scrivania principale (id «p.<software>.<card>»): si costruisce quando arriva l'elenco
export function cartaPerScrivania (id, rifai) {
  const [, pid, quale] = id.split('.')
  if (pid === 'trainer') return cartaTrainerPerScrivania(quale, rifai)
  const box = el('div', { class: 'carta-attesa' }, el('p', { class: 'vuoto', testo: 'Leggo…' }))
  prodotti().then(lista => {
    registraTitoli(lista)
    const p = lista.find(x => x.id === pid)
    box.replaceWith(!p ? el('p', { class: 'vuoto', testo: `Il software «${pid}» non c’è più in prodotti.json: toglila con la ✕.` })
      : !carteDi(p).includes(quale) ? el('p', { class: 'vuoto', testo: `Questa card di ${p.nome} non c’è più: toglila con la ✕.` })
      : carta(p, quale, datiDi(p), rifai, 'principale'))
  })
  return box
}

export async function mostra (stanza, params) {
  const id = params?.get('id') ?? ''
  for (const a of $$('[data-prodotto]')) { if (a.dataset.prodotto === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current') }
  const rifai = () => mostra(stanza, params)
  const lista = await prodotti(true); registraTitoli(lista)
  const p = lista.find(x => x.id === id)
  if (!p) return stanza.replaceChildren(el('p', { class: 'vuoto', testo: 'Questo software non è in .delion/prodotti.json.' }), el('a', { href: '#scrivania', testo: 'Torna alla scrivania' }))
  // il widget (Marco, 23-11 sera: «aprire il widget direttamente da telefono… senza aprire l'app»): una card sola, a tutto schermo,
  // da mettere sulla schermata Home; sotto, l'ingresso a Mirion (widget.js)
  const w = params?.get('widget')
  if (w && CARTE[w]) return stanza.replaceChildren(cornice(carta(p, w, datiDi(p), () => mostra(stanza, params), 'prodotto'), '#prodotto?id=' + encodeURIComponent(p.id), p.nome))
  // la pagina completa di una card (pagine-piatto.js), a tutta pagina
  const pg = params?.get('pagina')
  if (pg && PAGINE[pg] && haOggi(p)) return paginaCompletaPiatto(stanza, p, pg, params.get('giorno'))
  // la disposizione delle sue card (salvata con le altre, server/disposizione.mjs): la prima volta tutte accese
  MISURA.d.prodotti ??= {}
  // Mirion Fit parte già minimal (Marco, 25-11): «Oggi» e tre cartelle, i pasti, il corpo, il movimento (minimal.js)
  const nuova = () => { const d = { riquadri: Object.keys(CARTE).map(c => ({ id: c, larghezza: LARGHE[c], altezza: null, piccolo: false, nascosto: haOggi(p) && (DEL_LAVORO.includes(c) || c === 'pasti'), gruppo: null, colore: null })), gruppi: [] }; return p.id === 'piatto' ? fitMinimal(d) : d }
  const disposizione = () => MISURA.d.prodotti[id] ??= nuova()
  const dati = datiDi(p), ridisegna = () => disegna()
  const contenuti = Object.fromEntries(carteDi(p).map(c => [c, () => carta(p, c, dati, rifai, 'prodotto')]))
  // una scrivania di Piatto fatta prima delle card del giorno (0.1.10): il server ha messo le card nuove in fondo; una volta sola
  // vanno in cima, accese, e quelle del lavoro sul software si tolgono (si rimettono da «Card tolte»)
  if (haOggi(p)) {
    const lay = disposizione(), dove = c => lay.riquadri.findIndex(r => r.id === c)
    // le card della scrivania completa di Piatto (23-11 sera): arrivano dal server in fondo; una volta sola vanno dopo «Oggi», accese
    if (dove('colazione') > dove('note') && dove('note') >= 0) {
      const nuove = [...UN_PASTO, 'attivita'].map(c => lay.riquadri.find(r => r.id === c)).filter(Boolean)
      lay.riquadri = lay.riquadri.filter(r => !nuove.includes(r))
      for (const r of nuove) { r.nascosto = false; r.gruppo = null; r.larghezza = LARGHE[r.id] }
      const pasti = lay.riquadri.find(r => r.id === 'pasti'); if (pasti) { pasti.nascosto = true; pasti.gruppo = null }
      lay.riquadri.splice(dove('oggi') + 1, 0, ...nuove.filter(r => r.id !== 'attivita'))
      const acqua = dove('acqua'); lay.riquadri.splice(acqua >= 0 ? acqua + 1 : lay.riquadri.length, 0, ...nuove.filter(r => r.id === 'attivita'))
      salva({ subito: true })
    }
  }
  // Mirion Fit (24-11): una scrivania di Piatto fatta prima del sonno e degli integratori: il server li ha messi in fondo; una volta
  // sola vanno dopo «Acqua», accesi
  if (haOggi(p)) {
    const lay = disposizione(), dove = c => lay.riquadri.findIndex(r => r.id === c)
    if (dove('sonno') > dove('note') && dove('note') >= 0) {
      const nuove = ['sonno', 'integratori'].map(c => lay.riquadri.find(r => r.id === c)).filter(Boolean)
      lay.riquadri = lay.riquadri.filter(r => !nuove.includes(r))
      for (const r of nuove) { r.nascosto = false; r.gruppo = null; r.larghezza = LARGHE[r.id] }
      const acqua = dove('acqua'); lay.riquadri.splice(acqua >= 0 ? acqua + 1 : 0, 0, ...nuove)
      salva({ subito: true })
    }
  }
  if (haOggi(p)) {
    const lay = disposizione(), pos = c => lay.riquadri.findIndex(r => r.id === c)
    if (pos('note') >= 0 && pos('pasti') > pos('note')) {
      const giorno = DEL_GIORNO.map(c => lay.riquadri.find(r => r.id === c)).filter(Boolean)
      for (const r of giorno) { r.nascosto = false; r.larghezza = LARGHE[r.id] }
      const lavoro = lay.riquadri.filter(r => !DEL_GIORNO.includes(r.id))
      for (const r of lavoro) { r.nascosto = true; r.gruppo = null }
      lay.riquadri = [...giorno, ...lavoro]; salva({ subito: true })
    }
  }
  // il cibo in una card (26-11-2026): una scrivania di prima ha «Cibo» in fondo, spenta (server/disposizione.mjs); una volta sola va
  // dove stava il primo pasto acceso (o dopo «Oggi»), accesa, e i pasti uno per card si spengono
  if (haOggi(p)) {
    const lay = disposizione(), cibo = lay.riquadri.find(r => r.id === 'cibo')
    const pasti = lay.riquadri.filter(r => UN_PASTO.includes(r.id) || r.id === 'pasti')
    if (cibo && pasti.some(r => !r.nascosto)) {
      const primo = pasti.find(r => !r.nascosto)
      lay.riquadri.splice(lay.riquadri.indexOf(cibo), 1)
      Object.assign(cibo, { nascosto: false, gruppo: null, larghezza: primo.gruppo ? primo.larghezza : LARGHE.cibo, altezza: null, piccolo: false })
      const i = lay.riquadri.indexOf(primo); lay.riquadri.splice(i, 0, cibo)
      for (const r of pasti) { r.nascosto = true; r.gruppo = null }
      salva({ subito: true })
    }
  }
  // le card del telefono che mancavano (26-11-2026 sera): il server le mette in fondo (server/disposizione.mjs); una volta
  // sola vanno dopo «Allenamento» (o dopo «Oggi»), accese. Si riconoscono perché stanno dopo le card del lavoro sul software
  if (haOggi(p)) {
    const lay = disposizione(), pos = c => lay.riquadri.findIndex(r => r.id === c)
    const nuove = NUOVE_FIT.map(c => lay.riquadri.find(r => r.id === c)).filter(r => r && pos(r.id) > pos('notizie') && pos('notizie') >= 0)
    if (nuove.length) {
      lay.riquadri = lay.riquadri.filter(r => !nuove.includes(r))
      for (const r of nuove) Object.assign(r, { nascosto: false, gruppo: null, larghezza: LARGHE[r.id], altezza: null, piccolo: false })
      const dopo = pos('allenamento') >= 0 ? pos('allenamento') : pos('oggi')
      lay.riquadri.splice(dopo + 1, 0, ...nuove); salva({ subito: true })
    }
  }
  // «la scrivania due»: tutto il programma, a pagina intera dentro Mirion (compare quando il riepilogo dice dov'è)
  // il programma del software, intero, dentro Mirion (le pagine complete delle card le disegna Mirion)
  const intera = el('a', { class: 'quieto piccolo prodotto-intera', href: '#gestionale?id=' + encodeURIComponent(p.id), hidden: haOggi(p) || (!p.programma?.ce && !p.online) }, ic('arrow-square-out'), 'Il programma')
  const spazi = Object.fromEntries(carteDi(p).filter(c => c !== DENTRO[p.id]).map(c => [c, () => paginaDi(p.id, c)]))
  const disegna = () => {
    const tolte = disposizione().riquadri.filter(r => r.nascosto && contenuti[r.id])
    stanza.replaceChildren(
      el('div', { class: 'testata prodotto-testata' }, el('div', {},
        el('p', { class: 'sopra' }, el('a', { href: '#scrivania', testo: 'Scrivania' }), ' › Software'),
        el('h1', { class: 'prodotto-titolo' }, segno(p), p.nome)), intera,
        // il QR degli integratori sta in Mirion Fit (Marco, 24-11 sera: «l'area apposita mettila in Mirion Fit, non in Mirion Trainer»)
        p.id === 'piatto' ? el('button', { type: 'button', class: 'secondario piccolo', title: 'Un QR con gli integratori da prendere: si inquadra in Mirion Fit → Integratori', onclick: async () => (await import('./clienti.js')).qrIntegratori() }, ic('plus'), 'QR integratori') : null,
        el('span', { class: 'sopra piccolo', testo: 'le card si spostano, si allargano e si tolgono come sulla scrivania; «Metti sulla scrivania» le porta anche su quella principale' })),
      // «personalizzabile, ma solo con le cose inerenti alla sezione»: le sue card tolte sono icone in cima, un clic le apre
      // e «Qui» le rimette (Marco, 25-11 sera: «fai la stessa cosa… con card immettibili dalla dashboard»)
      tolte.length ? iconeCard(contenuti, disegna, { titoli: CARTE, dove: disposizione, qui: 'qui' }) : '',
      griglia(contenuti, ridisegna, { dove: disposizione, titoli: CARTE, spazi, vuoto: el('p', { class: 'vuoto', testo: 'Hai tolto tutte le card: sono fra le icone qui sopra.' }) }))
  }
  disegna()
}

// «Oggi» breve: le calorie che restano e i macro
function vistaSettimana (d) {
  const max = Math.max(1, ...(d.settimana ?? []).map(g => +g.kcal || 0), +d.obiettivo?.kcal || 0)
  return d.settimana?.length ? el('div', { class: 'oggi-settimana', 'aria-label': 'Le calorie della settimana' }, ...d.settimana.map(g => el('div', { class: 'oggi-giorno', title: `${g.giorno}: ${numero(g.kcal)} kcal` },
    el('i', { style: { height: Math.round((+g.kcal || 0) / max * 100) + '%' } }), el('small', { testo: new Date(g.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'narrow' }) }))))
    : el('p', { class: 'vuoto', testo: 'Ancora nessun giorno.' })
}

// «Pasti»: una riga per pasto con le sue calorie; un clic la apre: cosa c'è (✕ per toglierlo) e il campo per aggiungere un alimento
// un pasto in una card (come le card dei pasti di Piatto): quanto, i macro, cosa c'è dentro (✕ toglie) e «Aggiungi»
function cardPasto (p, d, k, rifai) {
  const tot = d.perPasto?.[k] ?? {}, voci = d.pasti?.[k] ?? [], box = el('div', { class: 'pasto-solo' })
  const aggiungi = el('div', { class: 'pasto-aggiungi', hidden: true }, aggiungiCibo(p, k, rifai))
  box.append(
    el('div', {}, el('b', { class: 'oggi-medio', testo: numero(tot.kcal) }), el('span', { class: 'sopra', testo: ' kcal' })),
    el('small', { class: 'sopra', testo: [['proteine', 'P'], ['carboidrati', 'C'], ['grassi', 'G']].filter(([m]) => tot[m] != null).map(([m, l]) => `${l} ${numero(tot[m])} g`).join(' · ') }),
    voci.length ? el('ul', { class: 'pasto-voci' }, ...voci.map((v, i) => el('li', {}, el('span', { testo: `${v.nome} · ${numero(v.grammi)} g` }), el('small', { class: 'sopra', testo: `${numero(v.kcal)} kcal` }),
      el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${v.nome}`, onclick: () => fai(p, { tipo: 'togli-cibo', pasto: k, indice: i }, rifai) }, ic('x')))))
      : el('p', { class: 'vuoto', testo: 'Ancora niente.' }),
    el('button', { type: 'button', class: 'secondario piccolo', onclick: e => { aggiungi.hidden = !aggiungi.hidden; e.currentTarget.setAttribute('aria-expanded', String(!aggiungi.hidden)); if (!aggiungi.hidden) aggiungi.querySelector('input')?.focus() } }, ic('plus'), 'Aggiungi'),
    aggiungi)
  return box
}
// il cibo in una card (26-11-2026): le calorie che restano, i quattro pasti come bottoni con le loro calorie e, sotto, il pasto
// scelto (all'inizio quello dell'ora) con cosa c'è dentro e «Aggiungi», che mette l'alimento proprio in quel pasto
let pastoScelto = null
const pastoDellOra = (d = new Date()) => { const m = d.getHours() * 60 + d.getMinutes(); return m < 630 ? 'colazione' : m < 900 ? 'pranzo' : m < 1110 ? 'spuntini' : 'cena' }
function cardCibo (p, d, rifai) {
  const box = el('div', { class: 'cibo-una' })
  const disegna = () => {
    const k = pastoScelto ?? pastoDellOra(), o = d.obiettivo ?? {}, m = d.mangiato ?? {}
    box.replaceChildren(
      el('div', {}, el('b', { class: 'oggi-medio', testo: numero(d.restano) }), el('span', { class: 'sopra', testo: ` kcal che restano · mangiate ${numero(m.kcal)} di ${numero(o.kcal)}` })),
      barretta(m.kcal, o.kcal),
      el('div', { class: 'scegli-pasto', role: 'group', 'aria-label': 'Il pasto' }, ...PASTI.map(([id, t]) => el('button', {
        type: 'button', class: id === k ? 'scelto' : '', 'aria-pressed': String(id === k), onclick: () => { pastoScelto = id; disegna() },
      }, el('b', { testo: t }), el('small', { testo: `${numero(d.perPasto?.[id]?.kcal ?? 0)} kcal` })))),
      cardPasto(p, d, k, rifai))
  }
  disegna(); return box
}
// l'attività del giorno: le calorie bruciate; la si scrive nella sua pagina completa (⛶), dove c'è tutto
function cardAttivita (p, d) {
  const pagina = paginaDi(p.id, 'attivita')
  return [el('div', {}, el('b', { class: 'oggi-medio', testo: numero(d.bruciate) }), el('span', { class: 'sopra', testo: ' kcal bruciate' })),
    el('small', { class: 'sopra', testo: 'si aggiungono alle calorie del giorno' }),
    pagina ? el('a', { class: 'secondario piccolo', href: pagina }, ic('plus'), 'Aggiungi un\'attività') : null]
}
function cardPasti (p, d, rifai) {
  const aperto = { v: null }, box = el('div', { class: 'pasti' })
  const disegna = () => box.replaceChildren(...PASTI.map(([k, t]) => {
    const tot = d.perPasto?.[k] ?? {}, voci = d.pasti?.[k] ?? null, su = aperto.v === k
    return el('div', { class: 'pasto' + (su ? ' aperto' : '') },
      el('button', { type: 'button', class: 'pasto-riga', 'aria-expanded': String(su), onclick: () => { aperto.v = su ? null : k; disegna() } },
        el('b', { testo: t }), el('span', { class: 'sopra', testo: `${numero(tot.kcal)} kcal` }), ic(su ? 'caret-down' : 'caret-right')),
      su ? el('div', { class: 'pasto-dentro' },
        voci ? (voci.length ? el('ul', { class: 'pasto-voci' }, ...voci.map((v, i) => el('li', {}, el('span', { testo: `${v.nome} · ${numero(v.grammi)} g` }), el('small', { class: 'sopra', testo: `${numero(v.kcal)} kcal` }),
          el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${v.nome}`, onclick: () => fai(p, { tipo: 'togli-cibo', pasto: k, indice: i }, rifai) }, ic('x')))))
          : el('p', { class: 'vuoto', testo: 'Ancora niente.' })) : null,
        aggiungiCibo(p, k, rifai)) : null)
  }))
  disegna(); return box
}
// cerca un alimento (la ricerca del programma), sceglilo, scrivi i grammi
function aggiungiCibo (p, pasto, rifai) {
  const q = el('input', { type: 'search', placeholder: 'Cerca un alimento (es. «yogurt greco»)', 'aria-label': 'Cerca un alimento' })
  const esiti = el('ul', { class: 'cibo-esiti' })
  const cerca = async () => {
    if (q.value.trim().length < 2) return
    esiti.replaceChildren(el('li', { class: 'vuoto', testo: 'Cerco…' }))
    try {
      const r = await api(`/api/prodotti/cerca?id=${encodeURIComponent(p.id)}&q=${encodeURIComponent(q.value.trim())}`)
      const lista = (r.alimenti ?? []).slice(0, 8)
      esiti.replaceChildren(...(lista.length ? lista.map(a => {
        const g = el('input', { type: 'number', min: 1, max: 3000, value: a.porzione?.grammi ?? 100, class: 'numero-breve', 'aria-label': `Grammi di ${a.nome}` })
        return el('li', {}, el('span', { testo: `${a.nome}${a.marca ? ' · ' + a.marca : ''}` }), el('small', { class: 'sopra', testo: `${numero(a.per100?.kcal)} kcal/100 g` }), g, el('span', { testo: 'g' }),
          el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai(p, { tipo: 'cibo', pasto, alimento: a, grammi: +g.value || 100 }, rifai, `Aggiunto: ${a.nome}.`) }, ic('plus'), 'Aggiungi'))
      }) : [el('li', { class: 'vuoto', testo: 'Nessun alimento trovato.' })]))
    } catch (e) { esiti.replaceChildren(el('li', { class: 'vuoto', testo: e.message })) }
  }
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); cerca() } })
  return el('div', { class: 'cibo-cerca' }, el('div', { class: 'notizia-nuova' }, q, el('button', { type: 'button', class: 'secondario piccolo', onclick: cerca }, ic('magnifying-glass'), 'Cerca')), esiti,
    // oppure il codice a barre: le cifre, una foto o la fotocamera (codice-barre.js)
    campoCodice(p, (alimento, grammi) => fai(p, { tipo: 'cibo', pasto, alimento, grammi }, rifai, `Aggiunto: ${alimento.nome}.`)))
}

// «Allenamento»: il totale di oggi, gli esercizi fatti (✕ per toglierne uno) e il modulo per aggiungerne uno
// Mirion Fit in Mirion come sull'app (Marco, 26-11-2026: «su Mirion desktop deve funzionare bene come sull'app… a card»):
// il percorso con la seduta di oggi e il cerchio delle prestazioni, gli stessi della scheda «Allena» del telefono
function cardPercorso (d) {
  const pc = d.percorso
  if (!pc) return el('p', { class: 'vuoto', testo: 'Nessun percorso: in Mirion Fit si sceglie un allenamento dalla libreria o se ne fa uno su misura.' })
  return [
    el('p', {}, el('b', { testo: pc.titolo }), el('small', { class: 'sopra', testo: [pc.libreria ? '  dalla libreria' : pc.scelte ? '  su misura' : null, pc.oggi ? ` · oggi ${pc.oggi}: ${pc.fatti}/${pc.di} esercizi` : null].filter(Boolean).join('') })),
    el('ul', { class: 'percorso-sedute' }, ...(pc.sedute ?? []).map(s => el('li', { class: s.nome === pc.oggi ? 'oggi' : '' }, el('b', { testo: s.nome }), el('small', { class: 'sopra', testo: (s.esercizi ?? []).join(' · ') }))))]
}
function cardPrestazioni (d) {
  const pr = d.prestazioni
  if (!pr?.serie) return el('p', { class: 'vuoto', testo: 'Il cerchio si riempie con le serie delle ultime 4 settimane: segna un allenamento.' })
  const deb = pr.gruppi?.find(g => g.id === pr.debole)
  return [cerchioSvg(pr), el('small', { class: 'sopra', testo: `${pr.sedute} sedute · costanza ${pr.costanza}% · multiarticolari ${pr.multi}%${deb ? ` · da spingere: ${deb.nome.toLowerCase()}` : ''}` })]
}
// la guida animata (26-11-2026, come in Mirion Fit): la figura fa lo squat, conta ripetizioni e serie, poi il recupero;
// alla fine le serie fatte entrano nell'allenamento di oggi
function apriGuida (p, rifai, id, nome) {
  const o = { id, nome, serie: 3, rip: 10, recupero: 90, kg: null }
  const chiudi = () => fondo.remove()
  const scatola = el('section', { class: 'invito-scatola guida-desk', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${nome} con la guida` }, el('h2', { testo: nome }))
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo', onclick: e => { if (e.target === fondo) chiudi() } }, scatola)
  const corpo = el('div'); corpo.innerHTML = G.htmlGuida(o); scatola.append(corpo, el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'quieto', onclick: chiudi }, 'Chiudi')))
  document.body.append(fondo)
  G.montaGuida(corpo, o, fatte => { chiudi(); fai(p, { tipo: 'esercizio', nome, serie: fatte.map(r => ({ ripetizioni: r, kg: 0 })) }, rifai, `${nome}: ${fatte.length} serie segnate. Aggiungi i kg se vuoi.`) })
}
function cardAllenamento (p, d, rifai) {
  const es = Array.isArray(d.esercizi) ? d.esercizi : []
  // la guida animata per tutti gli esercizi che ce l'hanno (26-11-2026 sera: la figura premium, fit-guida.js), come in Mirion Fit
  const nomi = Object.fromEntries((d.completo?.libreria ?? []).map(e => [e.id, e.nome]))
  const scelta = el('select', { 'aria-label': 'L’esercizio con la guida animata' }, ...Object.keys(G.MOVIMENTI).filter(id => nomi[id]).map(id => el('option', { value: id, testo: nomi[id] })))
  const guide = el('p', { class: 'guida-scelte' }, el('small', { class: 'sopra', testo: 'Con la guida animata: ' }), scelta,
    el('button', { type: 'button', class: 'secondario piccolo', onclick: () => apriGuida(p, rifai, scelta.value, nomi[scelta.value]) }, ic('target'), 'Allenati'))
  const nome = el('input', { placeholder: 'Esercizio (es. Panca piana)', 'aria-label': 'L’esercizio', required: true, maxlength: 60 })
  const serie = el('input', { type: 'number', min: 1, max: 20, value: 3, class: 'numero-breve', 'aria-label': 'Serie' })
  const rip = el('input', { type: 'number', min: 1, max: 200, value: 10, class: 'numero-breve', 'aria-label': 'Ripetizioni per serie' })
  const kg = el('input', { type: 'number', min: 0, max: 600, step: '0.5', value: '', class: 'numero-breve', placeholder: 'kg', 'aria-label': 'Carico in kg' })
  const modulo = el('form', { class: 'allenamento-nuovo', hidden: true, onsubmit: e => {
    e.preventDefault(); if (!nome.value.trim()) return
    const n = Math.max(1, +serie.value || 1)
    fai(p, { tipo: 'esercizio', nome: nome.value.trim(), serie: Array.from({ length: n }, () => ({ ripetizioni: +rip.value || 0, kg: +kg.value || 0 })) }, rifai, `Aggiunto: ${nome.value.trim()}.`)
  } }, nome, el('span', { class: 'riga-numeri' }, serie, el('span', { testo: 'serie ×' }), rip, el('span', { testo: 'rip. ×' }), kg, el('span', { testo: 'kg' })), el('button', { class: 'primario piccolo', testo: 'Aggiungi' }))
  return [
    guide,
    d.allenamento ? el('small', { class: 'sopra', testo: `${numero(d.allenamento.esercizi)} esercizi · ${numero(d.allenamento.serie)} serie · ${numero(d.allenamento.volume)} kg sollevati` }) : null,
    es.length ? el('ul', { class: 'pasto-voci' }, ...es.map((e, i) => el('li', {},
      el('span', { testo: [e.nome, e.serie ? `${e.serie} serie` : null, e.ripetizioni ? `${e.ripetizioni} rip.` : null, e.kg ? `fino a ${e.kg} kg` : null].filter(Boolean).join(' · ') }),
      el('small', { class: 'sopra', testo: e.volume ? `${numero(e.volume)} kg` : '' }),
      el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${e.nome}`, onclick: () => fai(p, { tipo: 'togli-esercizio', indice: i }, rifai) }, ic('x')))))
      : el('p', { class: 'vuoto', testo: 'Oggi ancora niente.' }),
    el('button', { type: 'button', class: 'quieto piccolo', onclick: () => { modulo.hidden = !modulo.hidden; if (!modulo.hidden) nome.focus() } }, ic('plus'), 'Aggiungi un esercizio'), modulo]
}

// ---- le card del telefono che mancavano (Marco, 26-11-2026 sera: «la dashboard completa uguale a quella del telefono») ----
// «La scheda del trainer»: gli esercizi con serie × ripetizioni e kg; «Fai» lo segna già pronto, come «Fai» sul telefono
function cardScheda (p, d, rifai) {
  const s = d.schedaTrainer
  if (!s) return el('p', { class: 'vuoto', testo: 'Nessuna scheda: quando il tuo trainer te la manda da Mirion Trainer, la trovi qui e vale prima di tutto.' })
  return [
    el('p', {}, el('b', { testo: s.titolo }), el('small', { class: 'sopra', testo: `  ${s.fatti} di ${s.esercizi.length} fatti${s.da ? ` · da ${s.da}` : ''}` })),
    el('ul', { class: 'pasto-voci scheda-voci' }, ...s.esercizi.map(e => el('li', { class: e.fatto ? 'fatto' : '' },
      el('span', {}, el('b', { testo: e.nome }), el('small', { class: 'sopra', testo: [` ${e.serie} × ${e.rip}`, e.kg != null ? `${String(e.kg).replace('.', ',')} kg` : null, e.recupero ? `recupero ${e.recupero} s` : null, e.note || null].filter(Boolean).join(' · ') })),
      e.fatto ? el('span', { class: 'bene', testo: '✓' })
        : el('button', { type: 'button', class: 'primario piccolo', onclick: () => fai(p, { tipo: 'esercizio', nome: e.nome, serie: Array.from({ length: Math.max(1, +e.serie || 1) }, () => ({ ripetizioni: parseInt(e.rip, 10) || 10, kg: +e.kg || 0 })) }, rifai, `${e.nome}: segnato. Cambia i kg nella card «Allenamento» se serve.`) }, 'Fai')))),
    s.nota ? el('p', { class: 'sopra piccolo', testo: s.nota }) : null]
}
// «La libreria»: gli allenamenti pronti, filtrati per livello; «Usa» lo fa diventare il tuo percorso (azione «libreria» di Mirion Fit)
let filtroLibreria = ''
function cardLibreria (p, d, rifai) {
  const tutti = d.allenamentiPronti ?? []
  if (!tutti.length) return el('p', { class: 'vuoto', testo: 'La libreria arriva con Mirion Fit aggiornato: prendi le novità del cervello.' })
  const livelli = [...new Set(tutti.map(x => x.livello))]
  const elenco = el('ul', { class: 'libreria-voci' })
  const riempiElenco = () => elenco.replaceChildren(...tutti.filter(x => !filtroLibreria || x.livello === filtroLibreria).map(x => el('li', { class: d.percorso?.libreria === x.id ? 'scelto' : '' },
    el('div', {}, el('b', { testo: x.titolo }), el('small', { class: 'sopra', testo: [x.livello, x.obiettivo, `${x.giorni} giorni a settimana`, x.minuti ? `${x.minuti} min` : null].filter(Boolean).join(' · ') }), el('p', { class: 'sopra piccolo', testo: x.descrizione }), el('small', { class: 'sopra', testo: x.sedute.join(' · ') })),
    d.percorso?.libreria === x.id ? el('span', { class: 'bene', testo: 'il tuo percorso' })
      : el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai(p, { tipo: 'libreria', id: x.id }, rifai, `«${x.titolo}» è il tuo percorso: la seduta di oggi è nella card «Il tuo percorso».`) }, 'Usa'))))
  const filtri = el('div', { class: 'filtri-libreria bottoni' }, ...['', ...livelli].map(l => el('button', { type: 'button', class: 'quieto piccolo', 'aria-pressed': String(filtroLibreria === l), onclick: () => { filtroLibreria = l; for (const b of filtri.children) b.setAttribute('aria-pressed', String(b.dataset.l === l)); riempiElenco() }, 'data-l': l }, l || 'Tutti')))
  riempiElenco()
  return [el('small', { class: 'sopra', testo: `${tutti.length} allenamenti pronti per la palestra, con i pesi` }), filtri, elenco]
}
// «Gli esercizi»: come si fanno, l'ultima volta e il record; la guida animata dove c'è (fit-guida.js)
const CON_GUIDA = Object.keys(G.MOVIMENTI)
function cardEsercizi (p, d, rifai) {
  const tutti = d.completo?.libreria ?? []
  if (!tutti.length) return el('p', { class: 'vuoto', testo: 'Gli esercizi arrivano con Mirion Fit aggiornato.' })
  const elenco = el('ul', { class: 'esercizi-voci' })
  const cerca = el('input', { type: 'search', placeholder: 'Cerca un esercizio o un muscolo', 'aria-label': 'Cerca un esercizio', oninput: () => mostraEs() })
  const mostraEs = () => {
    const q = cerca.value.trim().toLowerCase()
    const scelti = tutti.filter(e => !q || e.nome.toLowerCase().includes(q) || [].concat(e.muscoli ?? []).join(' ').toLowerCase().includes(q)).slice(0, q ? 40 : 12)
    elenco.replaceChildren(...scelti.map(e => {
      const det = el('div', { class: 'esercizio-come', hidden: true },
        (e.passi ?? []).length ? el('ol', {}, ...e.passi.map(x => el('li', { testo: x }))) : null,
        e.attenzione ? el('p', { class: 'sopra piccolo presto', testo: 'Attenzione: ' + e.attenzione }) : null)
      return el('li', {},
        el('div', {}, el('button', { type: 'button', class: 'quieto esercizio-nome', 'aria-expanded': 'false', onclick: ev => { det.hidden = !det.hidden; ev.currentTarget.setAttribute('aria-expanded', String(!det.hidden)) } }, el('b', { testo: e.nome })),
          el('small', { class: 'sopra', testo: [[].concat(e.muscoli ?? []).join(', '), e.attrezzo, e.record?.kg ? `record ${e.record.kg} kg × ${e.record.ripetizioni}` : null, e.ultimaVolta ? `l’ultima volta ${e.ultimaVolta.giorno.slice(8)}/${e.ultimaVolta.giorno.slice(5, 7)}` : null].filter(Boolean).join(' · ') }), det),
        CON_GUIDA.includes(e.id) ? el('button', { type: 'button', class: 'secondario piccolo', onclick: () => apriGuida(p, rifai, e.id, e.nome) }, ic('target'), 'Guida') : null)
    }))
  }
  mostraEs()
  return [el('small', { class: 'sopra', testo: `${tutti.length} esercizi · clic sul nome per come si fa` }), cerca, elenco]
}
// «Il check della settimana»: cinque domande da 1 a 5 e una riga; lo vede anche il trainer, se condividi
function cardCheck (p, d, rifai) {
  const domande = d.domandeCheck ?? [], c = d.check
  if (c) return [el('small', { class: 'sopra', testo: 'fatto questa settimana' }),
    el('ul', { class: 'pasto-voci' }, ...domande.map(q => el('li', {}, el('span', { testo: q.nome }), el('b', { testo: c[q.id] ? `${c[q.id]}/5` : '–' })))),
    c.nota ? el('p', { class: 'sopra piccolo', testo: c.nota }) : null]
  if (!domande.length) return el('p', { class: 'vuoto', testo: 'Il check arriva con Mirion Fit aggiornato.' })
  const risposte = {}
  const nota = el('input', { placeholder: 'Una riga per il trainer (facoltativa)', maxlength: 500, 'aria-label': 'Una riga per il trainer' })
  return [el('small', { class: 'sopra', testo: 'Com’è andata la settimana? Cinque domande, un minuto.' }),
    el('form', { class: 'check-modulo', onsubmit: e => { e.preventDefault(); if (Object.keys(risposte).length < 3) return notifica('Rispondi almeno a tre domande.'); fai(p, { tipo: 'check', risposte, nota: nota.value }, rifai, 'Check fatto. Grazie!') } },
      ...domande.map(q => el('div', { class: 'check-domanda' }, el('small', { class: 'sopra', testo: `${q.nome} (1 ${q.basso}, 5 ${q.alto})` }),
        el('div', { class: 'check-voti', role: 'group', 'aria-label': q.nome }, ...[1, 2, 3, 4, 5].map(v => el('button', { type: 'button', class: 'quieto piccolo', 'aria-pressed': 'false', onclick: ev => { risposte[q.id] = v; for (const b of ev.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === ev.currentTarget)) } }, String(v)))))),
      nota, el('button', { class: 'primario piccolo', testo: 'Fatto' }))]
}
// «Le misure»: vita, fianchi, petto, braccio e coscia in centimetri, con la differenza dalla volta prima
const MISURE = [['vita', 'Vita'], ['fianchi', 'Fianchi'], ['petto', 'Petto'], ['braccio', 'Braccio'], ['coscia', 'Coscia']]
function cardMisure (p, d, rifai) {
  const tutte = d.completo?.misure ?? [], ultima = tutte.at(-1), prima = tutte.at(-2)
  const campi = MISURE.map(([k, t]) => el('label', { class: 'misura-campo' }, el('small', { class: 'sopra', testo: t }), el('input', { type: 'number', step: '0.5', min: 10, max: 250, name: k, value: '', class: 'numero-breve', 'aria-label': t + ' in cm' })))
  const modulo = el('form', { class: 'misure-modulo', hidden: true, onsubmit: e => { e.preventDefault(); const m = {}; for (const c of campi) { const i = c.querySelector('input'); if (i.value) m[i.name] = +i.value } if (!Object.keys(m).length) return notifica('Scrivi almeno una misura.'); fai(p, { tipo: 'misure', misure: m }, rifai, 'Misure segnate.') } }, ...campi, el('button', { class: 'primario piccolo', testo: 'Salva' }))
  const diff = k => ultima?.[k] != null && prima?.[k] != null ? Math.round((ultima[k] - prima[k]) * 10) / 10 : null
  return [
    ultima ? el('ul', { class: 'pasto-voci' }, ...MISURE.filter(([k]) => ultima[k] != null).map(([k, t]) => el('li', {}, el('span', { testo: t }), el('b', { testo: `${String(ultima[k]).replace('.', ',')} cm` }), diff(k) ? el('small', { class: diff(k) < 0 ? 'bene' : 'presto', testo: `${diff(k) > 0 ? '+' : ''}${String(diff(k)).replace('.', ',')}` }) : null)))
      : el('p', { class: 'sopra piccolo', testo: 'Con il metro da sarta, sempre nello stesso punto: si vedono i centimetri persi anche quando la bilancia sta ferma.' }),
    ultima ? el('small', { class: 'sopra', testo: `le ultime il ${ultima.data.slice(8)}/${ultima.data.slice(5, 7)}` }) : null,
    el('button', { type: 'button', class: 'quieto piccolo', onclick: () => { modulo.hidden = !modulo.hidden } }, ic('plus'), 'Segna le misure'), modulo]
}

// Mirion Fit e Mirion Trainer insieme sulla scrivania principale (Marco, 26-11-2026 sera: «mettimele insieme come se fossi io il
// trainer»): una volta sola, in cima, il tuo Oggi e il tuo allenamento accanto a quello che chiedono i tuoi clienti. Da lì si
// tolgono con la ✕ come le altre, e non tornano più
const INSIEME = [['p.piatto.oggi', 6], ['p.trainer.guarda', 6], ['p.piatto.allenamento', 6], ['p.trainer.squadra', 3], ['p.piatto.prestazioni', 3], ['p.trainer.sedute', 6], ['p.trainer.fit', 6]].filter(([id]) => id !== 'p.trainer.fit')
export function insiemeSullaScrivania (s) {
  let fatto = false; try { fatto = localStorage.getItem('mirion:fit-trainer-insieme') === '1' } catch { }
  if (fatto || !s || s.id !== 'principale') return false
  try { localStorage.setItem('mirion:fit-trainer-insieme', '1') } catch { }
  if (s.riquadri.some(r => /^p\.trainer\./.test(r.id))) return false
  const nuove = INSIEME.filter(([id]) => !s.riquadri.some(r => r.id === id && !r.nascosto)).map(([id, larghezza]) => ({ id, larghezza, altezza: null, piccolo: false, nascosto: false, gruppo: null, colore: null }))
  s.riquadri = [...nuove, ...s.riquadri.filter(r => !nuove.some(x => x.id === r.id))]
  return nuove.length > 0
}

