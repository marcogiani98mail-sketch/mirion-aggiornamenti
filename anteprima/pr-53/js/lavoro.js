// Lavoro: i tuoi accessi raggruppati (posta, fisco, soldi, clienti…), il preset attivo e come cambiarlo.
// Un preset nasce da un lavoro del catalogo e poi si cambia tutto: aggiungi, togli, sposta, metti nel dock.
import { el, api, STATO, notifica } from './base.js'
import { appDesktop } from './app-desktop.js'
import { apriAccesso, icona, dock, nelDock } from './dock.js'
import { MISURA, salva, ordinabile } from './su-misura.js'
import { ordinaStrumenti } from './barra.js'

// le tessere si trascinano sempre; «Personalizza» qui apre gli attrezzi delle tessere: grandezza, la tua pagina, togliere (Marco, 20-11)
let catalogo = null, ultimaStanza = null, modifica = false
const GRANDEZZE = ['media', 'grande', 'piccola'], NOMI = { piccola: 'Piccola', media: 'Media', grande: 'Grande' }
const ridisegna = () => { if (ultimaStanza && !ultimaStanza.hidden) mostra(ultimaStanza) }
addEventListener('su-misura', ridisegna); addEventListener('preset-cambiato', ridisegna)

async function ricarica (stanza) { STATO.preset = await api('/api/preset'); dock(); return mostra(stanza) }

export async function mostra (stanza) {
  ultimaStanza = stanza
  const pr = STATO.preset = await api('/api/preset'), p = pr.attivo
  if (!p) return stanza.replaceChildren(el('div', { class: 'testata' }, el('h1', { testo: 'Lavoro' })), nuovoPreset(pr, stanza))
  const gruppi = Object.groupBy ? Object.groupBy(p.accessi, a => a.gruppo || 'I miei') : p.accessi.reduce((o, a) => ((o[a.gruppo || 'I miei'] ??= []).push(a), o), {})
  const cambia = async corpo => { try { await api('/api/preset/cambia', corpo); await ricarica(stanza) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  const posizione = id => p.accessi.findIndex(a => a.id === id)
  const web = url => api('/api/apri', { app: 'web', nota: url }).catch(e => notifica(e.message, { tipo: 'sempre' }))
  const grandezza = id => MISURA.d?.tessere?.[id] ?? 'media'
  // in alto a destra: quelle scelte (o le prime del preset); in Personalizza ognuna si mette o si toglie con ★
  const inAlto = new Set(nelDock().map(a => a.id))
  const fissa = a => { const ora = nelDock().map(x => x.id); MISURA.d.dock = inAlto.has(a.id) ? ora.filter(id => id !== a.id) : [...ora, a.id]; salva({ subito: true }); dock(); mostra(stanza) }
  const tessera = a => el('li', { class: `tessera tessera-${grandezza(a.id)}` + (inAlto.has(a.id) ? ' nel-dock' : ''), 'data-id': a.id },
    el('div', { class: 'tessera-riga' },
      el('button', { type: 'button', class: 'apri', onclick: () => modifica || apriAccesso(a), title: a.nota ?? a.url },
        icona(a),
        el('span', {}, a.nome, el('small', { testo: a.app ? 'app sul computer' : new URL(a.url).hostname.replace(/^www\./, '') }))),
      pr.mostraAffiliazioni && a.affiliato ? el('em', { class: 'affiliato', title: 'Questo servizio ha un programma di affiliazione', testo: 'affiliato' }) : null,
      modifica && el('div', { class: 'tessera-azioni' },
        el('button', { type: 'button', 'aria-label': `Grandezza di ${a.nome}: ${NOMI[grandezza(a.id)]}`, title: `Grandezza: ${NOMI[grandezza(a.id)]}`, testo: '⤢', onclick: () => { const g = grandezza(a.id); MISURA.d.tessere[a.id] = GRANDEZZE[(GRANDEZZE.indexOf(g) + 1) % GRANDEZZE.length]; salva(); mostra(stanza) } }),
        el('button', { type: 'button', class: inAlto.has(a.id) ? 'acceso' : '', 'aria-pressed': String(inAlto.has(a.id)), 'aria-label': inAlto.has(a.id) ? `Togli ${a.nome} da quelle in alto a destra` : `Metti ${a.nome} in alto a destra`, title: inAlto.has(a.id) ? 'In alto a destra: clic per toglierla da lì' : 'Mettila in alto a destra', testo: inAlto.has(a.id) ? '★' : '☆', onclick: () => fissa(a) }),
        el('button', { type: 'button', 'aria-label': `Sposta ${a.nome} prima`, testo: '←', onclick: () => cambia({ azione: 'sposta', id: a.id, verso: -1 }) }),
        el('button', { type: 'button', 'aria-label': `Sposta ${a.nome} dopo`, testo: '→', onclick: () => cambia({ azione: 'sposta', id: a.id, verso: 1 }) }),
        el('button', { type: 'button', 'aria-label': `Togli ${a.nome}`, testo: '✕', onclick: () => cambia({ azione: 'togli', id: a.id }) }))),
    // non ce l'hai ancora? la pagina per cominciare (e, per i servizi affiliati, il programma)
    !modifica && (a.inizia || a.programma) && el('div', { class: 'tessera-piede' },
      a.inizia && el('button', { type: 'button', class: 'link', onclick: () => web(a.inizia), testo: "Non ce l'hai? Comincia qui" }),
      pr.mostraAffiliazioni && a.programma && el('button', { type: 'button', class: 'link aff', onclick: () => web(a.programma), testo: 'Programma di affiliazione' })),
    // la tua pagina: se il tuo indirizzo è diverso (la tua PEC, il tuo pannello, la pagina del tuo account)
    modifica && !a.app && el('form', { class: 'tessera-piede riga-form', onsubmit: e => { e.preventDefault(); cambia({ azione: 'url', id: a.id, accesso: { url: e.target.elements.url.value } }) } },
      el('input', { name: 'url', type: 'url', value: a.url, 'aria-label': `La tua pagina di ${a.nome}`, placeholder: 'https://la-tua-pagina' }),
      el('button', { class: 'quieto', testo: 'Salva la pagina' })))
  stanza.replaceChildren(
    el('div', { class: 'testata' },
      el('div', {}, el('p', { class: 'sopra', testo: `Preset «${p.nome}»${p.lavoro ? ' · ' + (pr.lavori.find(l => l.id === p.lavoro)?.nome ?? p.lavoro) : ''}` }), el('h1', { testo: 'I tuoi accessi' }),
        el('p', { class: 'riassunto', testo: `${p.accessi.length} accessi; in alto a destra ${Array.isArray(MISURA.d?.dock) ? `ci sono le ${nelDock().length} che hai scelto (★ in Personalizza)` : `stanno i primi ${pr.dock}: in Personalizza scegli quali con ★`}. Un clic e si aprono: le app sul computer, i siti nel tuo browser.` })),
      el('div', { class: 'bottoni' },
        el('button', { type: 'button', class: modifica ? 'primario' : 'secondario', testo: modifica ? 'Fatto' : 'Personalizza', onclick: () => { modifica = !modifica; mostra(stanza) } }),
        modifica && Array.isArray(MISURA.d?.dock) ? el('button', { type: 'button', class: 'quieto', testo: 'In alto le prime del preset', title: 'Torna come prima: in alto a destra le prime del preset', onclick: () => { MISURA.d.dock = null; salva({ subito: true }); dock(); mostra(stanza) } }) : null,
        pr.elenco.length > 1 && el('select', { 'aria-label': 'Cambia preset', onchange: async e => { await api('/api/preset/scegli', { id: e.target.value }); ricarica(stanza) } }, ...pr.elenco.map(x => el('option', { value: x.id, selected: x.id === p.id, testo: x.nome }))))),
    modifica ? null : appDesktop(), // le app per il computer (app-desktop.js)
    el('div', { class: 'gruppi' }, ...Object.entries(gruppi).map(([g, lista]) => {
      const ul = el('ul', { class: 'tessere' }, ...lista.map(tessera))
      ordinabile(ul, { fatto: () => ordinaStrumenti([...stanza.querySelectorAll('.tessera[data-id]')].map(t => t.dataset.id)) })
      return el('section', { class: 'gruppo' }, el('h2', { testo: g }), ul)
    })),
    ...(modifica ? [aggiungi(p, cambia), nuovoPreset(pr, stanza)] : []))
}

// aggiungere: dal catalogo (126 accessi italiani) o un sito tuo
function aggiungi (p, cambia) {
  const box = el('section', { class: 'pannello aggiungi' }, el('h2', { testo: 'Aggiungi un accesso' }))
  const ce = new Set(p.accessi.map(a => a.id)), lista = el('ul', { class: 'catalogo' })
  const disegna = q => {
    const voci = Object.entries(catalogo ?? {}).filter(([id, a]) => !ce.has(id) && (!q || (a.nome + ' ' + a.gruppo).toLowerCase().includes(q.toLowerCase())))
    lista.replaceChildren(...voci.slice(0, 40).map(([id, a]) => el('li', {}, el('button', { type: 'button', onclick: () => cambia({ azione: 'aggiungi', accesso: { id } }) },
      icona({ ...a, id }, 'icona-app piccola'), el('span', {}, a.nome, el('small', { testo: a.gruppo }))))))
  }
  const cerca = el('input', { type: 'search', placeholder: 'Cerca nel catalogo: PEC, fatture, INPS, Canva…', 'aria-label': 'Cerca nel catalogo', oninput: e => disegna(e.target.value) })
  const nome = el('input', { placeholder: 'Nome', 'aria-label': 'Nome del sito' }), url = el('input', { placeholder: 'https://…', 'aria-label': 'Indirizzo del sito', type: 'url' })
  box.append(cerca, lista, el('form', { class: 'riga-form', onsubmit: e => { e.preventDefault(); cambia({ azione: 'aggiungi', accesso: { nome: nome.value, url: url.value } }) } },
    el('span', { class: 'sopra', testo: 'Oppure un sito tuo:' }), nome, url, el('button', { class: 'secondario', testo: 'Aggiungi' })))
  if (catalogo) disegna('')
  else api('/api/preset/catalogo').then(c => { catalogo = c.accessi; disegna('') })
  return box
}

// un preset nuovo, partendo da un lavoro
function nuovoPreset (pr, stanza) {
  const nome = el('input', { placeholder: 'Di chi è (es. Mamma)', 'aria-label': 'Nome del preset', required: true })
  const lavoro = el('select', { 'aria-label': 'Il lavoro' }, ...pr.lavori.map(l => el('option', { value: l.id, testo: l.nome })))
  return el('section', { class: 'pannello' }, el('h2', { testo: 'Un preset nuovo' }),
    el('p', { class: 'sopra', testo: 'Scegli il lavoro: Mirion mette gli accessi che servono a quel lavoro. Poi li cambi come vuoi.' }),
    el('form', { class: 'riga-form', onsubmit: async e => { e.preventDefault(); try { await api('/api/preset/nuovo', { nome: nome.value, lavoro: lavoro.value }); modifica = false; ricarica(stanza) } catch (err) { notifica(err.message, { tipo: 'sempre' }) } } },
      nome, lavoro, el('button', { class: 'primario', testo: 'Crea il preset' })))
}
