// Le pagine complete di Piatto, disegnate da Mirion (Marco, 23-11-2026 sera: «quando apri una pagina deve essere in stile Mirion,
// non rivisitata… e deve occupare la pagina»). Ogni card della scrivania di Piatto (prodotto.js) con ⛶ o il doppio clic apre qui la
// sua pagina: le stesse card di vetro di Mirion, a tutta pagina, con il giorno che si sfoglia. I numeri li dà il programma di Piatto
// (/api/riepilogo, con «completo»: 28 giorni, i pesi, le attività, i soliti, ieri, la libreria degli esercizi), le azioni passano da
// /api/prodotti/azione come sulle card. Niente qui tiene dati: si rilegge tutto a ogni cambio.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'
import { campoCodice } from './codice-barre.js'

export const PAGINE = { oggi: 'Calorie e macro', colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena', spuntini: 'Spuntini', pasti: 'I pasti', acqua: 'Acqua', attivita: 'Attività', peso: 'Peso', allenamento: 'Allenamento', settimana: 'La settimana' }
const PASTI = [['colazione', 'Colazione'], ['pranzo', 'Pranzo'], ['cena', 'Cena'], ['spuntini', 'Spuntini']]
const n = v => Number.isFinite(+v) ? Math.round(+v).toLocaleString('it-IT') : '—'
const virgola = (v, c = 1) => Number.isFinite(+v) ? (+v).toLocaleString('it-IT', { maximumFractionDigits: c }) : '—'
const oggiLocale = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const sposta = (g, giorni) => { const d = new Date(g + 'T12:00'); d.setDate(d.getDate() + giorni); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const bello = g => new Date(g + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const corto = g => new Date(g + 'T12:00').toLocaleDateString('it-IT', { weekday: 'narrow' })

// una card di vetro, come sulla scrivania
export const carta = (titolo, { sopra, tasti, larga, classe = '' } = {}, ...dentro) => el('section', { class: `fascia pagina-carta ${larga ? 'larga' : ''} ${classe}`, 'aria-label': titolo },
  el('header', {}, el('h2', { testo: titolo }), sopra ? el('span', { class: 'sopra piccolo', testo: sopra }) : null, tasti ? el('div', { class: 'pagina-tasti' }, ...[].concat(tasti)) : null), ...dentro)
export const barra = (fatto, obiettivo, classe = '') => { const pc = obiettivo ? Math.min(100, Math.round(fatto / obiettivo * 100)) : 0; return el('span', { class: 'oggi-barra ' + classe, role: 'progressbar', 'aria-valuenow': pc, 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('i', { style: { width: pc + '%' } })) }
// le colonne (giorni o settimane); linea: l'obiettivo
export function colonne (voci, linea = null) {
  const max = Math.max(1, ...voci.map(v => +v.valore || 0), +linea || 0)
  return el('div', { class: 'pagina-colonne', style: { '--colonne': voci.length } },
    linea ? el('span', { class: 'pagina-linea', style: { bottom: Math.round(linea / max * 100) + '%' }, title: `obiettivo ${n(linea)}` }) : null,
    ...voci.map(v => el('div', { class: 'pagina-colonna' + (v.oggi ? ' oggi' : ''), title: v.titolo ?? '' }, el('i', { style: { height: Math.round((+v.valore || 0) / max * 100) + '%' } }), el('small', { testo: v.etichetta }))))
}
// il peso nel tempo: una linea, con l'obiettivo tratteggiato
export function grafico (pesi, obiettivo) {
  if (pesi.length < 2) return el('p', { class: 'vuoto', testo: 'Servono almeno due pesate.' })
  const L = 600, A = 180, xs = pesi.map(p => Date.parse(p.data)), ks = pesi.map(p => +p.kg), tutti = obiettivo ? [...ks, +obiettivo] : ks
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...tutti) - 0.5, y1 = Math.max(...tutti) + 0.5
  const X = t => Math.round((t - x0) / Math.max(1, x1 - x0) * (L - 20) + 10), Y = k => Math.round(A - 10 - (k - y0) / Math.max(0.1, y1 - y0) * (A - 20))
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', `0 0 ${L} ${A}`); s.setAttribute('class', 'pagina-grafico'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', `Il peso: da ${ks[0]} a ${ks.at(-1)} kg`)
  s.innerHTML = (obiettivo ? `<line x1="0" x2="${L}" y1="${Y(obiettivo)}" y2="${Y(obiettivo)}" class="obiettivo"/>` : '') +
    `<polyline points="${pesi.map((p, i) => `${X(xs[i])},${Y(ks[i])}`).join(' ')}"/>` + `<circle cx="${X(xs.at(-1))}" cy="${Y(ks.at(-1))}" r="5"/>`
  return el('div', {}, s, el('small', { class: 'sopra', testo: `${new Date(x0).toLocaleDateString('it-IT')} → ${new Date(x1).toLocaleDateString('it-IT')}` }))
}

// la pagina: in cima «← Piatto», il titolo e il giorno; sotto le card. quale: una chiave di PAGINE
export async function pagina (stanza, p, quale, giorno) {
  const oggi = oggiLocale(), g = /^\d{4}-\d{2}-\d{2}$/.test(giorno ?? '') && giorno <= oggi ? giorno : oggi
  const vai = altro => { location.hash = `#prodotto?id=${encodeURIComponent(p.id)}&pagina=${quale}${altro && altro !== oggi ? '&giorno=' + altro : ''}` }
  const rifai = () => pagina(stanza, p, quale, g)
  const fai = async (azione, detto) => { try { await api('/api/prodotti/azione', { id: p.id, azione: g === oggi ? azione : { ...azione, giorno: g } }); if (detto) notifica(detto); rifai() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  const cima = el('header', { class: 'pagina-cima pagina-piatto-cima' },
    el('a', { class: 'secondario piccolo', href: '#prodotto?id=' + encodeURIComponent(p.id) }, ic('arrow-left'), p.nome),
    el('h1', { testo: PAGINE[quale] ?? quale }),
    quale === 'peso' ? null : el('div', { class: 'pagina-giorno' },
      el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Il giorno prima', onclick: () => vai(sposta(g, -1)) }, ic('arrow-left')),
      el('span', { testo: g === oggi ? 'Oggi' : bello(g) }),
      el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Il giorno dopo', disabled: g >= oggi, onclick: () => vai(sposta(g, 1)) }, ic('arrow-right')),
      g !== oggi ? el('button', { type: 'button', class: 'quieto piccolo', onclick: () => vai(oggi) }, 'Oggi') : null))
  const corpo = el('div', { class: 'pagina-griglia' }, el('p', { class: 'vuoto', testo: 'Leggo…' }))
  if (!stanza.querySelector(':scope > .pagina-completa')) scrollTo(0, 0)
  stanza.replaceChildren(el('div', { class: 'pagina-completa pagina-piatto' }, cima, corpo))
  let r
  try { r = await api(`/api/prodotti/riepilogo?id=${encodeURIComponent(p.id)}${g !== oggi ? '&giorno=' + g : ''}`) } catch (e) { r = { errore: e.message } }
  const d = r?.dati
  if (!d || r.errore || r.manca) return corpo.replaceChildren(el('p', { class: 'vuoto', testo: r?.errore ? 'Non si legge adesso: ' + r.errore : `Il programma di ${p.nome} non risponde.` }))
  if (d.pronto === false) return corpo.replaceChildren(el('p', { class: 'vuoto', testo: 'Per cominciare serve il profilo (peso, altezza, obiettivo): scrivilo nella card «Peso».' }))
  const c = d.completo ?? {}
  if (!d.completo) corpo.before(el('p', { class: 'sopra piccolo', testo: `Il programma di ${p.nome} è di prima: per vedere tutto, fermalo e riaccendilo (lo fa Mirion riaprendo ${p.nome}).` }))
  const DISEGNA = { oggi: paginaCalorie, colazione: paginaPasto, pranzo: paginaPasto, cena: paginaPasto, spuntini: paginaPasto, pasti: paginaPasti, acqua: paginaAcqua, attivita: paginaAttivita, peso: paginaPeso, allenamento: paginaAllenamento, settimana: paginaSettimana }
  corpo.replaceChildren(...[].concat((DISEGNA[quale] ?? paginaCalorie)({ p, d, c, g, oggi, quale, fai, rifai })).filter(Boolean))
}

// ---- le pagine ----
function paginaCalorie ({ d, c, g }) {
  const o = d.obiettivo ?? {}, m = d.mangiato ?? {}
  const voci = PASTI.flatMap(([k, t]) => (d.pasti?.[k] ?? []).map(v => ({ ...v, pasto: t }))).sort((a, b) => b.kcal - a.kcal).slice(0, 6)
  const sette = (c.giorni ?? []).filter(x => x.scritto && x.giorno <= g).slice(-7), media = k => sette.length ? sette.reduce((s, x) => s + (+x[k] || 0), 0) / sette.length : null
  return [
    carta('Il giorno', { sopra: `obiettivo ${n(o.kcal)} kcal` },
      el('div', {}, el('b', { class: 'oggi-grande', testo: n(d.restano) }), el('span', { class: 'sopra', testo: ' kcal che restano' })),
      el('small', { class: 'sopra', testo: `mangiate ${n(m.kcal)} · bruciate ${n(d.bruciate)}` }), barra(m.kcal, o.kcal)),
    carta('Macro', { sopra: 'grammi / obiettivo' }, el('div', { class: 'pagina-macro' }, ...[['proteine', 'Proteine'], ['carboidrati', 'Carboidrati'], ['grassi', 'Grassi']].map(([k, t]) =>
      el('div', {}, el('small', { class: 'sopra', testo: `${t} ${n(m[k])} / ${n(o[k])} g` }), barra(m[k], o[k], k))))),
    carta('Pasto per pasto', { larga: true }, el('div', { class: 'pagina-tabella' }, el('table', {},
      el('thead', {}, el('tr', {}, ...['', 'kcal', 'proteine', 'carbo', 'grassi'].map(t => el('th', { testo: t })))),
      el('tbody', {}, ...PASTI.map(([k, t]) => { const x = d.perPasto?.[k] ?? {}; return el('tr', {}, el('th', {}, el('a', { href: `#prodotto?id=piatto&pagina=${k}${g !== oggiLocale() ? '&giorno=' + g : ''}`, testo: t })), ...['kcal', 'proteine', 'carboidrati', 'grassi'].map(f => el('td', { testo: n(x[f]) }))) }),
        el('tr', { class: 'totale' }, el('th', { testo: 'In tutto' }), ...['kcal', 'proteine', 'carboidrati', 'grassi'].map(f => el('td', { testo: n(m[f]) }))))))),
    carta('Quello che pesa di più', { sopra: 'per calorie' }, voci.length ? el('ul', { class: 'pasto-voci' }, ...voci.map(v => el('li', {}, el('span', { testo: `${v.nome} · ${n(v.grammi)} g` }), el('small', { class: 'sopra', testo: `${v.pasto} · ${n(v.kcal)} kcal` })))) : el('p', { class: 'vuoto', testo: 'Ancora niente.' })),
    carta('Media degli ultimi 7 giorni', { sopra: `${sette.length} giorni scritti` }, sette.length ? el('div', { class: 'pagina-cifre' },
      ...[['kcal', 'kcal'], ['proteine', 'proteine g'], ['carboidrati', 'carbo g'], ['grassi', 'grassi g']].map(([k, t]) => el('div', { class: 'cifra' }, el('b', { testo: n(media(k)) }), el('span', { testo: t }))))
      : el('p', { class: 'vuoto', testo: 'Nessun giorno scritto.' })),
  ]
}

function paginaPasto ({ p, d, c, quale, fai }) {
  const t = d.perPasto?.[quale] ?? {}, voci = d.pasti?.[quale] ?? [], soliti = (c.soliti ?? []).filter(s => !s.pasto || s.pasto === quale).slice(0, 12), ieri = c.ieri?.[quale] ?? []
  return [
    carta('Cosa hai mangiato', { larga: true, sopra: `${n(t.kcal)} kcal` },
      voci.length ? el('ul', { class: 'pasto-voci pagina-voci' }, ...voci.map((v, i) => el('li', {},
        el('span', {}, el('b', { testo: v.nome }), v.marca ? el('small', { class: 'sopra', testo: ' · ' + v.marca }) : null, el('small', { class: 'sopra', testo: ` · ${n(v.grammi)} g` })),
        el('small', { class: 'sopra', testo: `${n(v.kcal)} kcal · P ${n(v.proteine)} · C ${n(v.carboidrati)} · G ${n(v.grassi)}` }),
        el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${v.nome}`, onclick: () => fai({ tipo: 'togli-cibo', pasto: quale, indice: i }) }, ic('x')))))
        : el('p', { class: 'vuoto', testo: 'Ancora niente.' })),
    carta('In questo pasto', {}, el('div', { class: 'pagina-cifre' }, ...[['kcal', 'kcal'], ['proteine', 'proteine g'], ['carboidrati', 'carbo g'], ['grassi', 'grassi g']].map(([k, l]) => el('div', { class: 'cifra' }, el('b', { testo: n(t[k]) }), el('span', { testo: l }))))),
    carta('I soliti', { sopra: 'un clic e lo rimetti' }, soliti.length ? el('ul', { class: 'pasto-voci' }, ...soliti.map(s => el('li', {}, el('span', { testo: `${s.nome} · ${n(s.grammi)} g` }), el('small', { class: 'sopra', testo: `${n(s.kcal)} kcal` }),
      el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai({ tipo: 'rimetti', pasto: quale, id: s.id }, `Rimesso: ${s.nome}.`) }, ic('plus'))))) : el('p', { class: 'vuoto', testo: 'Ancora nessuno.' })),
    carta('Come ieri', { sopra: ieri.length ? `${ieri.length} cose, ${n(ieri.reduce((s, v) => s + (+v.kcal || 0), 0))} kcal` : '', tasti: ieri.length ? el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai({ tipo: 'copia-ieri', pasto: quale }, 'Copiato da ieri.') }, ic('copy'), 'Copia tutto') : null },
      ieri.length ? el('ul', { class: 'pasto-voci' }, ...ieri.map(v => el('li', {}, el('span', { testo: `${v.nome} · ${n(v.grammi)} g` }), el('small', { class: 'sopra', testo: `${n(v.kcal)} kcal` })))) : el('p', { class: 'vuoto', testo: 'Ieri niente.' })),
    carta('Aggiungi', { larga: true }, cercaCibo(p, quale, fai)),
  ]
}
function paginaPasti (x) { return PASTI.map(([k, t]) => carta(t, { sopra: `${n(x.d.perPasto?.[k]?.kcal)} kcal`, tasti: el('a', { class: 'quieto piccolo', href: `#prodotto?id=${x.p.id}&pagina=${k}` }, ic('corners-out')) },
  (x.d.pasti?.[k] ?? []).length ? el('ul', { class: 'pasto-voci' }, ...x.d.pasti[k].map(v => el('li', {}, el('span', { testo: `${v.nome} · ${n(v.grammi)} g` }), el('small', { class: 'sopra', testo: `${n(v.kcal)} kcal` })))) : el('p', { class: 'vuoto', testo: 'Ancora niente.' }))) }

// la ricerca di un alimento (la fa il programma), poi i grammi e «Aggiungi»
function cercaCibo (p, pasto, fai) {
  const q = el('input', { type: 'search', placeholder: 'Cerca un alimento (es. «yogurt greco»)', 'aria-label': 'Cerca un alimento' }), esiti = el('ul', { class: 'cibo-esiti' })
  const cerca = async () => {
    if (q.value.trim().length < 2) return
    esiti.replaceChildren(el('li', { class: 'vuoto', testo: 'Cerco…' }))
    try {
      const lista = ((await api(`/api/prodotti/cerca?id=${encodeURIComponent(p.id)}&q=${encodeURIComponent(q.value.trim())}`)).alimenti ?? []).slice(0, 10)
      esiti.replaceChildren(...(lista.length ? lista.map(a => {
        const gr = el('input', { type: 'number', min: 1, max: 3000, value: a.porzione?.grammi ?? 100, class: 'numero-breve', 'aria-label': `Grammi di ${a.nome}` })
        return el('li', {}, el('span', { testo: `${a.nome}${a.marca ? ' · ' + a.marca : ''}` }), el('small', { class: 'sopra', testo: `${n(a.per100?.kcal)} kcal/100 g` }), gr, el('span', { testo: 'g' }),
          el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai({ tipo: 'cibo', pasto, alimento: a, grammi: +gr.value || 100 }, `Aggiunto: ${a.nome}.`) }, ic('plus'), 'Aggiungi'))
      }) : [el('li', { class: 'vuoto', testo: 'Nessun alimento trovato.' })]))
    } catch (e) { esiti.replaceChildren(el('li', { class: 'vuoto', testo: e.message })) }
  }
  return el('div', { class: 'cibo-cerca' }, el('form', { class: 'riga-form', onsubmit: e => { e.preventDefault(); cerca() } }, q, el('button', { class: 'primario piccolo', testo: 'Cerca' })), esiti,
    campoCodice(p, (alimento, grammi) => fai({ tipo: 'cibo', pasto, alimento, grammi }, `Aggiunto: ${alimento.nome}.`))) // o il codice a barre (codice-barre.js)
}

function paginaAcqua ({ d, c, g, fai }) {
  const meta = d.obiettivo?.acqua ?? 2000, sette = (c.giorni ?? []).filter(x => x.giorno <= g).slice(-7)
  return [
    carta('Oggi', { sopra: `obiettivo ${virgola(meta / 1000)} litri`, tasti: [
      el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': 'Togli 250 ml', onclick: () => fai({ tipo: 'acqua', ml: -250 }) }, ic('minus')),
      el('button', { type: 'button', class: 'primario piccolo', onclick: () => fai({ tipo: 'acqua', ml: 250 }) }, ic('plus'), '250 ml'),
      el('button', { type: 'button', class: 'secondario piccolo', onclick: () => fai({ tipo: 'acqua', ml: 500 }) }, ic('plus'), '500 ml')] },
    el('div', {}, el('b', { class: 'oggi-grande', testo: virgola((d.acqua ?? 0) / 1000) }), el('span', { class: 'sopra', testo: ` / ${virgola(meta / 1000)} litri` })), barra(d.acqua, meta, 'acqua')),
    carta('Gli ultimi 7 giorni', { sopra: 'litri', larga: true }, colonne(sette.map(x => ({ etichetta: corto(x.giorno), valore: x.acqua, titolo: `${x.giorno}: ${virgola((x.acqua ?? 0) / 1000)} l`, oggi: x.giorno === g })), meta)),
  ]
}

function paginaAttivita ({ d, c, g, fai }) {
  const att = c.attivita ?? [], tipi = c.tipiAttivita ?? [], sette = (c.giorni ?? []).filter(x => x.giorno <= g).slice(-7)
  const tipo = el('select', { 'aria-label': 'L’attività' }, ...tipi.map(t => el('option', { value: t.id, testo: t.nome })))
  const minuti = el('input', { type: 'number', min: 1, max: 600, value: 30, class: 'numero-breve', 'aria-label': 'Minuti' })
  return [
    carta('Il giorno', { larga: true, sopra: `${n(d.bruciate)} kcal bruciate · si aggiungono alle calorie del giorno` },
      att.length ? el('ul', { class: 'pasto-voci' }, ...att.map((a, i) => el('li', {}, el('span', {}, el('b', { testo: a.nome }), el('small', { class: 'sopra', testo: ` · ${n(a.minuti)} min` })), el('small', { class: 'sopra', testo: `−${n(a.kcal)} kcal` }),
        el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${a.nome}`, onclick: () => fai({ tipo: 'togli-attivita', indice: i }) }, ic('x'))))) : el('p', { class: 'vuoto', testo: 'Ancora niente.' }),
      tipi.length ? el('form', { class: 'riga-form', onsubmit: e => { e.preventDefault(); fai({ tipo: 'attivita', attivita: tipo.value, minuti: +minuti.value || 30 }, 'Aggiunta.') } }, tipo, minuti, el('span', { testo: 'min' }), el('button', { class: 'primario piccolo' }, ic('plus'), 'Aggiungi')) : null),
    carta('Gli ultimi 7 giorni', { sopra: 'kcal bruciate', larga: true }, colonne(sette.map(x => ({ etichetta: corto(x.giorno), valore: x.bruciate, titolo: `${x.giorno}: ${n(x.bruciate)} kcal`, oggi: x.giorno === g })))),
  ]
}

function paginaPeso ({ d, c, fai }) {
  const campo = el('input', { type: 'number', step: '0.1', min: 20, max: 350, value: d.peso?.attuale ?? '', class: 'numero-breve', 'aria-label': 'Il peso di oggi, in kg' })
  const pesi = c.pesi ?? [], novanta = pesi.filter(x => Date.now() - Date.parse(x.data) <= 90 * 86400_000)
  return [
    carta('Adesso', { sopra: [d.peso?.obiettivo ? `obiettivo ${d.peso.obiettivo} kg` : null, d.peso?.diff30 != null ? `${d.peso.diff30 > 0 ? '+' : ''}${d.peso.diff30} kg in 30 giorni` : null].filter(Boolean).join(' · ') },
      el('div', {}, el('b', { class: 'oggi-grande', testo: virgola(d.peso?.attuale) }), el('span', { class: 'sopra', testo: ' kg' })),
      el('form', { class: 'riga-form', onsubmit: e => { e.preventDefault(); const kg = +campo.value; if (kg > 0) fai({ tipo: 'peso', kg }, `Peso di oggi: ${kg} kg.`) } }, campo, el('span', { testo: 'kg' }), el('button', { class: 'primario piccolo', testo: 'Salva' }))),
    carta('Gli ultimi 90 giorni', { larga: true }, grafico(novanta.length >= 2 ? novanta : pesi.slice(-12), d.peso?.obiettivo)),
    carta('Le pesate', {}, pesi.length ? el('ul', { class: 'pasto-voci' }, ...pesi.slice(-10).reverse().map(x => el('li', {}, el('span', { testo: new Date(x.data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) }), el('small', { class: 'sopra', testo: `${virgola(x.kg)} kg` })))) : el('p', { class: 'vuoto', testo: 'Ancora nessuna.' })),
  ]
}

function paginaAllenamento ({ d, c, g, fai }) {
  const es = Array.isArray(d.esercizi) ? d.esercizi : [], lib = c.libreria ?? []
  const settimane = [0, 1, 2, 3].map(i => (c.giorni ?? []).filter(x => x.giorno <= g).slice(-28).slice(i * 7, i * 7 + 7))
  const nome = el('input', { list: 'esercizi-libreria', placeholder: 'Esercizio (es. Panca piana)', 'aria-label': 'L’esercizio', required: true, maxlength: 60 })
  const serie = el('input', { type: 'number', min: 1, max: 20, value: 3, class: 'numero-breve', 'aria-label': 'Serie' }), rip = el('input', { type: 'number', min: 1, max: 200, value: 10, class: 'numero-breve', 'aria-label': 'Ripetizioni' })
  const kg = el('input', { type: 'number', min: 0, max: 600, step: '0.5', placeholder: 'kg', class: 'numero-breve', 'aria-label': 'Carico in kg' })
  return [
    carta('Gli esercizi del giorno', { larga: true, sopra: d.allenamento ? `${n(d.allenamento.esercizi)} esercizi · ${n(d.allenamento.serie)} serie · ${n(d.allenamento.volume)} kg sollevati` : '' },
      es.length ? el('ul', { class: 'pasto-voci pagina-voci' }, ...es.map((e, i) => el('li', {},
        el('span', {}, el('b', { testo: e.nome }), el('small', { class: 'sopra', testo: ' · ' + (e.elenco ?? []).map(s => `${s.ripetizioni}×${s.kg || 0} kg`).join(', ') })),
        el('small', { class: 'sopra', testo: e.volume ? `${n(e.volume)} kg` : '' }),
        el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${e.nome}`, onclick: () => fai({ tipo: 'togli-esercizio', indice: i }) }, ic('x'))))) : el('p', { class: 'vuoto', testo: 'Ancora niente.' }),
      el('datalist', { id: 'esercizi-libreria' }, ...lib.map(x => el('option', { value: x.nome }))),
      el('form', { class: 'allenamento-nuovo', onsubmit: e => { e.preventDefault(); if (!nome.value.trim()) return; const k = Math.max(1, +serie.value || 1); fai({ tipo: 'esercizio', nome: nome.value.trim(), serie: Array.from({ length: k }, () => ({ ripetizioni: +rip.value || 0, kg: +kg.value || 0 })) }, `Aggiunto: ${nome.value.trim()}.`) } },
        nome, el('span', { class: 'riga-numeri' }, serie, el('span', { testo: 'serie ×' }), rip, el('span', { testo: 'rip. ×' }), kg, el('span', { testo: 'kg' })), el('button', { class: 'primario piccolo' }, ic('plus'), 'Aggiungi'))),
    carta('Le ultime 4 settimane', { sopra: 'kg sollevati per settimana' }, colonne(settimane.map((s, i) => ({ etichetta: i === 3 ? 'questa' : `−${3 - i}`, valore: s.reduce((t, x) => t + (+x.allenamento?.volume || 0), 0), titolo: `${s[0]?.giorno ?? ''} → ${s.at(-1)?.giorno ?? ''}` })))),
    carta('Gli esercizi: come si fanno', { larga: true, sopra: `${lib.length} esercizi` }, lib.length ? el('div', { class: 'pagina-libreria' }, ...lib.map(x => el('details', {},
      el('summary', {}, el('b', { testo: x.nome }), el('small', { class: 'sopra', testo: [x.muscoli, x.attrezzo].filter(Boolean).join(' · ') })),
      x.passi?.length ? el('ol', {}, ...x.passi.map(t => el('li', { testo: t }))) : null,
      x.attenzione ? el('p', { class: 'sopra', testo: 'Attenzione: ' + x.attenzione }) : null,
      x.record ? el('p', { class: 'sopra', testo: `Record: ${virgola(x.record.kg)} kg × ${x.record.ripetizioni} (${x.record.giorno})` }) : null,
      x.ultimaVolta ? el('p', { class: 'sopra', testo: `L'ultima volta, ${x.ultimaVolta.giorno}: ${x.ultimaVolta.serie.map(s => `${s.ripetizioni}×${s.kg || 0} kg`).join(', ')}` }) : null))) : el('p', { class: 'vuoto', testo: 'La libreria non c’è ancora.' })),
  ]
}

function paginaSettimana ({ d, c, g }) {
  const ventotto = (c.giorni ?? []).filter(x => x.giorno <= g).slice(-28), scritti = ventotto.filter(x => x.scritto), ob = d.obiettivo?.kcal
  const media = k => scritti.length ? scritti.reduce((s, x) => s + (+x[k] || 0), 0) / scritti.length : null
  const pesi = (c.pesi ?? []).filter(x => x.data <= g && Date.parse(g) - Date.parse(x.data) <= 28 * 86400_000)
  return [
    carta('Calorie giorno per giorno', { larga: true, sopra: ob ? 'la linea è l’obiettivo' : '' }, colonne(ventotto.map(x => ({ etichetta: String(Number(x.giorno.slice(8))), valore: x.kcal, titolo: `${x.giorno}: ${n(x.kcal)} kcal`, oggi: x.giorno === g })), ob)),
    carta('In numeri', { sopra: `${scritti.length} giorni scritti su ${ventotto.length}` }, el('div', { class: 'pagina-cifre' },
      ...[['kcal', 'kcal al giorno'], ['proteine', 'proteine g'], ['bruciate', 'kcal bruciate'], ['acqua', 'ml d’acqua']].map(([k, t]) => el('div', { class: 'cifra' }, el('b', { testo: n(media(k)) }), el('span', { testo: t }))))),
    carta('Il peso nello stesso periodo', {}, grafico(pesi, d.peso?.obiettivo)),
  ]
}
