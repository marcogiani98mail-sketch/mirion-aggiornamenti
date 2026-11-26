// Il tasto destro su tutto quello che si personalizza (Marco, 20-11: «dai la possibilità di fare tasto destro e modificare,
// scegli tu le opzioni»). Le voci, scelte da Code: per una casella le misure, la cartella, le altre scrivanie, togliere; per una
// scrivania aprire, rinominare, duplicare, eliminare; per una stanza aprirla, metterla sulla scrivania, nasconderla, le cartelle;
// per le icone in alto e le tessere di Lavoro aprire, grandezza, spostare, togliere; per una cosa da fare il suo menu ⋯.
// Nei campi dove si scrive resta il menu del sistema (copia, incolla).
import { $, api, STATO, notifica } from './base.js'
import { MISURA, salva, avvisa, nuovoId, scrivania, rimettiComEra } from './su-misura.js'
import { TITOLI, mosse } from './riquadri.js'
import { apriMenu } from './menu.js'
import { apriAccesso, dock } from './dock.js'

const STANZA_CASELLA = { scadute: 'scadute', lavoro: 'accessi', cerca: 'cerca', diario: 'diario' }
const LARGHEZZE = [[12, 'Intera'], [8, 'Due terzi'], [6, 'Metà'], [4, 'Un terzo']]
const GRANDEZZE = [['piccola', 'Piccola'], ['media', 'Media'], ['grande', 'Grande']]
const pannello = () => import('./pannello.js').then(m => m.pannello())
const conferma = (testo, fai) => ({ testo, segno: '✕', pericolo: true, sotto: [{ testo: 'Sì, ' + testo[0].toLowerCase() + testo.slice(1), pericolo: true, fai }, { testo: 'No, lascia stare' }] })

export function tastoDestro () {
  addEventListener('contextmenu', e => {
    const t = e.target
    if (t.closest('input, textarea, [contenteditable], .menu-destro') || String(getSelection()).trim()) return
    const voci = scegli(t)
    if (!voci) return
    e.preventDefault()
    // dalla tastiera (tasto Menu, Maiusc+F10) il menu si apre sotto l'elemento, non nell'angolo
    const r = t.getBoundingClientRect(), daTastiera = e.clientX === 0 && e.clientY === 0
    apriMenu(daTastiera ? r.left + 12 : e.clientX, daTastiera ? r.bottom : e.clientY, voci.voci, voci.titolo)
  })
}

function scegli (t) {
  const riga = t.closest('.casella-riga')
  if (riga?.querySelector('.casella-piu')) { riga.querySelector('.casella-piu').click(); return null } // una cosa da fare: il suo menu ⋯
  // le caselle della sezione Squadra non sono caselle della scrivania: il loro menu spostava la chat nel nulla (23-11)
  const scheda = t.closest('.scheda-cartella'), box = t.closest('.scrivania-squadra') ? null : t.closest('#scrivania .griglia-riquadri > .riquadro')
  if (scheda && box) return menuScheda(box.dataset.id, scheda.dataset.id)
  if (box) return menuCasella(box.dataset.id)
  if (t.closest('.scrivania-pill')) return menuScrivania(t.closest('.scrivania-pill').dataset.id)
  if (t.closest('#scrivania') && MISURA.d) return menuSfondo()
  const stanza = t.closest('.stanze a[data-stanza]')
  if (stanza) return menuStanza(stanza.dataset.stanza, stanza.closest('.cartella-stanze')?.dataset.id)
  if (t.closest('.cartella-stanze')) return menuCartella(t.closest('.cartella-stanze').dataset.id)
  if (t.closest('.stanze')) return menuBarra()
  if (t.closest('.strumento[data-id]')) return menuStrumento(t.closest('.strumento').dataset.id)
  if (t.closest('.tessere > .tessera')) return menuTessera(t.closest('.tessera').dataset.id)
  return null
}

// una casella (o una cartella di caselle) sulla scrivania
function menuCasella (id) {
  const lista = mosse.lista(id), capo = lista[0], cart = mosse.gruppo(id), sc = scrivania()
  if (!capo) return null
  const altre = sc.riquadri.filter(r => !r.nascosto && !lista.includes(r)).filter((r, i, a) => !r.gruppo || a.findIndex(x => x.gruppo === r.gruppo) === i)
  const altreScrivanie = MISURA.d.scrivanie.filter(s => s !== sc)
  const verso = copia => altreScrivanie.map(s => ({ testo: s.nome, fai: () => { portaSu(s, lista, copia); notifica(`${copia ? 'Copiata' : 'Spostata'} su «${s.nome}».`) } }))
  return { titolo: cart ? cart.nome : TITOLI[capo.id], voci: [
    { testo: 'A schermo intero', segno: '⛶', fai: () => mosse.schermoIntero(id) },
    { testo: capo.piccolo ? 'Riapri' : 'Rimpicciolisci', segno: capo.piccolo ? '+' : '−', fai: () => mosse.misura(id, { piccolo: !capo.piccolo }) },
    { testo: 'Larghezza', segno: '↔', sotto: LARGHEZZE.map(([n, nome]) => ({ testo: nome, scelta: capo.larghezza === n, fai: () => mosse.misura(id, { larghezza: n }) })) },
    { testo: 'Altezza automatica', segno: '↕', spenta: !capo.altezza, fai: () => mosse.misura(id, { altezza: null }) },
    '-',
    { testo: cart ? 'Aggiungi alla cartella' : 'Metti in una cartella con', segno: '▣', spenta: !altre.length,
      sotto: altre.map(r => ({ testo: r.gruppo ? mosse.gruppo(r.gruppo)?.nome ?? TITOLI[r.id] : TITOLI[r.id], fai: () => mosse.unisci(id, r.gruppo ?? r.id) })) },
    cart && { testo: 'Rinomina la cartella', segno: '✎', fai: () => { const c = document.querySelector(`.riquadro[data-id="${id}"] .nome-cartella`); c?.focus(); c?.select() } },
    cart && { testo: 'Sciogli la cartella', segno: '⇱', fai: () => mosse.sciogli(id) },
    altreScrivanie.length && { testo: 'Sposta su un\'altra scrivania', segno: '→', sotto: verso(false) },
    altreScrivanie.length && { testo: 'Copia su un\'altra scrivania', segno: '⧉', sotto: verso(true) },
    '-',
    { testo: cart ? `Togli «${TITOLI[cart.scelto]}» dalla scrivania` : 'Togli dalla scrivania', segno: '✕', pericolo: true, fai: () => mosse.togli(id) },
    { testo: 'Personalizza…', segno: '✎', fai: pannello },
  ] }
}

// le caselle su un'altra scrivania: lì diventano visibili, sciolte; spostandole, qui si tolgono
function portaSu (s, lista, copia) {
  for (const r of lista) {
    const la = s.riquadri.find(x => x.id === r.id)
    if (la) Object.assign(la, { nascosto: false, gruppo: null, larghezza: r.larghezza, altezza: r.altezza, piccolo: false })
    if (!copia) { r.nascosto = true; r.gruppo = null }
  }
  salva(); avvisa()
}

function menuScheda (g, chi) {
  return { titolo: TITOLI[chi], voci: [
    { testo: 'Apri questa scheda', segno: '▸', fai: () => mosse.mostra(g, chi) },
    { testo: 'Tira fuori dalla cartella', segno: '⇱', fai: () => mosse.estrai(g, chi) },
    '-',
    { testo: 'Togli dalla scrivania', segno: '✕', pericolo: true, fai: () => { const r = mosse.riq(chi); if (r) { r.nascosto = true; r.gruppo = null; salva(); avvisa() } } },
  ] }
}

// una scrivania nella fila in cima
function menuScrivania (id) {
  const d = MISURA.d, s = d.scrivanie.find(x => x.id === id)
  if (!s) return null
  return { titolo: s.nome, voci: [
    { testo: 'Apri', segno: '▸', spenta: d.attiva === id, fai: () => { d.attiva = id; salva(); avvisa() } },
    { testo: 'Rinomina', segno: '✎', fai: () => document.querySelector(`.scrivania-pill[data-id="${id}"] .scrivania-nome`)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })) },
    { testo: 'Duplica', segno: '⧉', spenta: d.scrivanie.length >= 12, fai: () => {
      const copia = { ...structuredClone(s), id: nuovoId('scrivania').slice(0, 24), nome: (s.nome + ' (copia)').slice(0, 30) }
      d.scrivanie.splice(d.scrivanie.indexOf(s) + 1, 0, copia); d.attiva = copia.id; salva(); avvisa()
    } },
    { testo: 'Nuova scrivania', segno: '+', fai: () => $('.scrivania-nuova')?.click() },
    '-',
    d.scrivanie.length > 1 ? conferma(`Elimina «${s.nome}»`, () => { d.scrivanie = d.scrivanie.filter(x => x !== s); if (d.attiva === id) d.attiva = d.scrivanie[0].id; salva(); avvisa() }) : { testo: 'Elimina (è l\'unica)', segno: '✕', spenta: true },
  ] }
}

function menuSfondo () {
  return { titolo: scrivania()?.nome ?? 'Scrivania', voci: [
    { testo: 'Aggiungi caselle…', segno: '+', fai: pannello },
    { testo: 'Nuova scrivania', segno: '+', fai: () => $('.scrivania-nuova')?.click() },
    '-',
    conferma('Rimetti tutto com\'era', rimettiComEra),
  ] }
}

// una stanza nella barra a sinistra (anche dentro una cartella)
function menuStanza (id, dentro) {
  const s = MISURA.d.stanze, nome = $(`.stanze a[data-stanza="${id}"] span`)?.textContent ?? id, cas = STANZA_CASELLA[id], r = cas && scrivania()?.riquadri.find(x => x.id === cas)
  return { titolo: nome, voci: [
    { testo: 'Apri', segno: '▸', fai: () => { location.hash = id } },
    cas && { testo: r?.nascosto === false ? `Togli da «${scrivania().nome}»` : `Metti su «${scrivania().nome}»`, segno: '▦', fai: () => { r.nascosto = !r.nascosto; r.gruppo = null; salva({ subito: true }) } },
    id !== 'scrivania' && { testo: 'Nascondi dalla barra', segno: '◌', fai: () => { s.nascoste = [...s.nascoste, id]; salva({ subito: true }) } },
    id !== 'scrivania' && !dentro && s.cartelle.length && { testo: 'Metti nella cartella', segno: '▣', sotto: s.cartelle.map(c => ({ testo: c.nome, fai: () => { s.ordine = s.ordine.filter(x => x !== id); c.figli.push(id); salva({ subito: true }) } })) },
    dentro && { testo: 'Tira fuori dalla cartella', segno: '⇱', fai: () => { const c = s.cartelle.find(x => x.id === dentro); c.figli = c.figli.filter(x => x !== id); s.ordine.splice(s.ordine.indexOf(dentro) + 1, 0, id); salva({ subito: true }) } },
    '-', ...menuBarra().voci,
  ] }
}

function menuCartella (id) {
  const s = MISURA.d.stanze, c = s.cartelle.find(x => x.id === id)
  if (!c) return null
  return { titolo: c.nome, voci: [
    { testo: 'Apri', segno: '▸', fai: () => document.querySelector(`.cartella-stanze[data-id="${id}"] .cartella-apri`)?.click() },
    { testo: 'Rinomina', segno: '✎', fai: () => { const b = document.querySelector(`.cartella-stanze[data-id="${id}"]`); if (!b.classList.contains('aperta')) b.querySelector('.cartella-apri').click(); const i = b.querySelector('.nome-cartella'); i?.focus(); i?.select() } },
    { testo: 'Sciogli la cartella', segno: '⇱', fai: () => { const i = s.ordine.indexOf(id); s.ordine.splice(i, 1, ...c.figli); s.cartelle = s.cartelle.filter(x => x !== c); salva({ subito: true }) } },
  ] }
}

function menuBarra () {
  const s = MISURA.d.stanze, nomi = id => $(`.stanze a[data-stanza="${id}"] span`)?.textContent ?? id
  return { titolo: 'La barra', voci: [
    { testo: s.strette ? 'Barra larga, con i nomi' : 'Barra stretta, solo icone', segno: '⟷', fai: () => { s.strette = !s.strette; salva({ subito: true }) } },
    { testo: 'Mostra le stanze nascoste', segno: '●', spenta: !s.nascoste.length, sotto: s.nascoste.map(id => ({ testo: nomi(id), fai: () => { s.nascoste = s.nascoste.filter(x => x !== id); salva({ subito: true }) } })) },
    { testo: 'Personalizza…', segno: '✎', fai: pannello },
  ] }
}

// le icone in alto e le tessere di Lavoro: sono gli accessi del preset
const accesso = id => STATO.preset?.attivo?.accessi?.find(a => a.id === id)
async function preset (corpo) {
  try { await api('/api/preset/cambia', corpo); STATO.preset = await api('/api/preset'); dock(); dispatchEvent(new CustomEvent('preset-cambiato')) } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}
const sposta = id => [{ testo: 'Sposta prima', segno: '←', fai: () => preset({ azione: 'sposta', id, verso: -1 }) }, { testo: 'Sposta dopo', segno: '→', fai: () => preset({ azione: 'sposta', id, verso: 1 }) }]

function menuStrumento (id) {
  const a = accesso(id)
  if (!a) return null
  return { titolo: a.nome, voci: [
    { testo: 'Apri', segno: '▸', fai: () => apriAccesso(a) }, ...sposta(id),
    { testo: 'Grandezza delle icone', segno: '⤢', sotto: GRANDEZZE.map(([g, nome]) => ({ testo: nome, scelta: MISURA.d.strumenti === g, fai: () => { MISURA.d.strumenti = g; salva({ subito: true }) } })) },
    { testo: 'Tutti i tuoi accessi', segno: '⋯', fai: () => { location.hash = 'lavoro' } },
  ] }
}

function menuTessera (id) {
  const a = accesso(id)
  if (!a) return null
  const g = MISURA.d.tessere[id] ?? 'media'
  return { titolo: a.nome, voci: [
    { testo: 'Apri', segno: '▸', fai: () => apriAccesso(a) },
    { testo: 'Grandezza', segno: '⤢', sotto: GRANDEZZE.map(([x, nome]) => ({ testo: nome, scelta: g === x, fai: () => { MISURA.d.tessere[id] = x; salva(); avvisa() } })) },
    ...sposta(id), '-',
    conferma(`Togli «${a.nome}»`, () => preset({ azione: 'togli', id })),
  ] }
}
