// I gestionali dentro Mirion (Marco, 22-11-2026: «le apps mettile sulla casella di mirion apribili dentro il programma e mettici
// le palette giuste anche lì»). La casella «I gestionali» sulla scrivania elenca i prodotti di .delion/prodotti.json
// (server/prodotti.mjs); «Apri» porta alla stanza #gestionale?id=…, che accende il programma e lo mostra dentro la finestra,
// al suo indirizzo di sempre (così i suoi dati, nel browser, restano i suoi). «← Scrivania» torna indietro.
// I colori: la voce «colori» di prodotti.json dice quale variabile del gestionale prende quale colore di Mirion; qui si
// risolvono con la sfumatura di Aurora scelta, e main.cjs le scrive dentro la pagina del gestionale (anche quando cambi
// sfumatura in Personalizza). Nel browser (anteprima) il gestionale si apre con i suoi colori.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

let elenco = null // l'ultima risposta di /api/prodotti
async function prodotti (fresco = false) {
  if (!elenco || fresco) elenco = await api('/api/prodotti')
  return elenco.prodotti ?? []
}

// la casella della scrivania
export function casellaGestionali () {
  const lista = el('ul', { class: 'gestionali-lista' }, el('li', { class: 'vuoto', testo: 'Leggo i gestionali…' }))
  prodotti(true).then(ps => {
    if (!ps.length) return lista.replaceChildren(el('li', { class: 'vuoto', testo: 'Ancora nessun gestionale: si aggiungono nel cervello, in .delion/prodotti.json.' }))
    lista.replaceChildren(...ps.map(p => el('li', { class: 'gestionale-voce' },
      el('span', { class: 'gestionale-icona', 'aria-hidden': 'true' }, ic(p.id === 'turni-pulizie' ? 'calendar-dots' : p.id === 'studio-pt' ? 'target' : 'briefcase')),
      el('div', { class: 'gestionale-nome' }, el('b', {}, p.nome, p.provvisorio ? el('em', { class: 'scelta-provvisorio', testo: 'provvisorio' }) : null),
        el('small', { testo: p.acceso ? 'acceso' : p.programma?.ce ? 'pronto da accendere' : p.online ? 'online' : 'il programma non c\'è ancora' })),
      el('a', { class: 'primario piccolo', href: '#gestionale?id=' + encodeURIComponent(p.id), 'aria-disabled': String(!p.programma?.ce && !p.online) }, ic('arrow-right'), 'Apri'))))
  }).catch(e => lista.replaceChildren(el('li', { class: 'vuoto', testo: 'Non riesco a leggere i gestionali: ' + e.message })))
  return el('section', { class: 'fascia gestionali', 'aria-label': 'I gestionali' },
    el('header', {}, el('h2', { testo: 'I gestionali' }), el('span', { class: 'sopra piccolo', testo: 'si aprono qui dentro, con i colori di Mirion' })), lista)
}

// le variabili del gestionale, risolte con i colori di Mirion di adesso
function colori (p) {
  const cs = getComputedStyle(document.body), v = nome => cs.getPropertyValue('--' + nome).trim()
  const fuori = {}
  for (const [sua, nostra] of Object.entries(p.colori ?? {})) {
    if (Array.isArray(nostra)) { const [a, per, b] = nostra; const x = v(a), y = b === 'transparent' ? 'transparent' : v(b); if (x && y) fuori[sua] = `color-mix(in oklch, ${x} ${Math.min(100, Math.max(0, +per))}%, ${y})` }
    else if (v(nostra)) fuori[sua] = v(nostra)
  }
  return fuori
}
function colora (riquadro, p) {
  if (!window.delionApp?.coloraGestionale || !p.colori || !riquadro.src) return
  window.delionApp.coloraGestionale(new URL(riquadro.src).origin, colori(p)).catch(() => {})
}

// la stanza: in cima il nome e i tasti, sotto il gestionale a tutta altezza
let aperto = null // { id, riquadro, p }
addEventListener('mirion-colori', () => { if (aperto?.riquadro.isConnected) colora(aperto.riquadro, aperto.p) }) // cambi sfumatura: anche lui
export async function mostra (stanza, params) {
  const id = params.get('id'), ps = await prodotti(true), p = ps.find(x => x.id === id)
  if (!p) { stanza.replaceChildren(el('p', { class: 'vuoto', testo: 'Questo gestionale non c\'è: torna alla scrivania.' })); return }
  scrollTo(0, 0); document.querySelector('[data-palco]')?.scrollTo?.(0, 0) // la stanza parte dall'alto, anche se la scrivania era scorsa giù
  // una pagina del programma (le card dei software, prodotto.js): solo un indirizzo dentro il programma, «#/…»
  const pagina = /^#\/[^\s]{0,300}$/.test(params.get('pagina') ?? '') ? params.get('pagina') : ''
  // dentro Mirion il programma prende il suo stile («in=mirion»: Piatto lo usa per vestirsi come Mirion); dal telefono passa dalla
  // porta del telefono (telefono.mjs: la porta del programma + 10000, sullo stesso indirizzo da cui arriva il telefono)
  const dentroLui = base => {
    const u = new URL(base)
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) { u.hostname = location.hostname; u.port = String(+u.port + 10000) }
    u.searchParams.set('in', 'mirion'); if (pagina) u.hash = pagina
    return u.href
  }
  // a pagina intera (Marco, 23-11 sera: «quando apri una pagina deve essere in stile Mirion… e deve occupare la pagina»): niente barra
  // del gestionale sopra, solo due tasti piccoli per tornare
  const piena = Boolean(pagina)
  if (aperto?.id === id && aperto.piena === piena && aperto.riquadro.isConnected && stanza.contains(aperto.riquadro)) { if (pagina && aperto.base) aperto.riquadro.src = dentroLui(aperto.base); return } // già aperto: resta com'era
  const stato = el('span', { class: 'gestionale-stato', testo: 'Accendo…' })
  const riquadro = el('iframe', { class: 'gestionale-riquadro', title: p.nome, referrerpolicy: 'no-referrer' })
  riquadro.addEventListener('load', () => colora(riquadro, p))
  const lavora = async (fai) => { try { await fai() } catch (e) { notifica(e.message, { tipo: 'sempre', durata: 9000 }) } }
  const tasti = el('div', { class: 'gestionale-tasti' },
    el('button', { type: 'button', class: 'quieto', title: 'Ricarica', onclick: () => { riquadro.src = riquadro.src } }, ic('arrows-clockwise'), 'Ricarica'),
    p.programma?.ce && window.delionApp ? el('button', { type: 'button', class: 'quieto', title: 'In una finestra di Mirion a parte', onclick: () => riquadro.src && window.open(riquadro.src, '_blank') }, ic('corners-out'), 'In una finestra') : null,
    p.online ? el('button', { type: 'button', class: 'quieto', onclick: () => lavora(() => api('/api/prodotti/apri', { id: p.id, dove: 'online' })) }, ic('arrow-up-right'), 'Online') : null,
    p.cartellaCe ? el('button', { type: 'button', class: 'quieto', onclick: () => lavora(() => api('/api/prodotti/cartella', { id: p.id })) }, ic('folder-simple'), 'Cartella') : null)
  stanza.replaceChildren(piena
    ? el('div', { class: 'gestionale piena' },
      el('nav', { class: 'gestionale-torna', 'aria-label': 'Torna indietro' },
        el('a', { class: 'secondario piccolo', href: '#prodotto?id=' + encodeURIComponent(p.id), title: `Torna alle card di ${p.nome}` }, ic('arrow-left'), p.nome),
        el('a', { class: 'quieto piccolo', href: '#scrivania', title: 'La scrivania' }, ic('desktop'))),
      riquadro)
    : el('div', { class: 'gestionale' },
      el('header', { class: 'gestionale-cima' },
        el('a', { class: 'secondario piccolo', href: '#scrivania' }, ic('arrow-left'), 'Scrivania'),
        el('h1', { testo: p.nome }), p.provvisorio ? el('em', { class: 'scelta-provvisorio', testo: 'nome provvisorio' }) : null, stato, tasti),
      riquadro))
  aperto = { id, riquadro, p, piena }
  try {
    // il programma su questo computer: si accende se serve; senza programma, la versione online (senza i colori di Mirion)
    if (p.programma?.ce || !p.online) {
      const r = await api('/api/prodotti/apri', { id: p.id, dentro: true })
      riquadro.src = dentroLui(r.aperto); aperto.base = r.aperto
      stato.textContent = r.giaAcceso ? 'acceso' : 'acceso adesso'
    } else { riquadro.src = p.online; stato.textContent = 'online' }
  } catch (e) { stato.textContent = 'non parte'; riquadro.replaceWith(el('p', { class: 'vuoto', testo: e.message })) }
}
