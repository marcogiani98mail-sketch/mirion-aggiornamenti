// Dentro una cifra di «Oggi nel cervello» (server/dentro-cervello.mjs; Marco, 22-11: «entrare a vedere le caselle che ci sono una
// per una così che possa sapere cosa c'è dentro» · «aprire lo storico per casella così che veda il lavoro svolto e i file all'interno
// la chat va bene lo storico anche»). Si apre di lato: cosa c'è dentro, e per le cifre del giorno gli ultimi 14 giorni da scegliere
// (o un giorno qualunque), con i file e il lavoro fatto quel giorno.
import { el, api, notifica, nomeNota, quando as quandoGiorno } from './base.js'
import { ic } from './icone.js'
import { obsidian } from './ia.js'

const TIPI = { fatta: 'fatta', annullata: 'non serve più', archivia: 'archiviata', rimanda: 'rimandata', pausa: 'in pausa', riprendi: 'ripresa', valutare: 'da valutare', valutata: 'valutata', ora: 'ora cambiata', riapri: 'riaperta', ia: 'con l’IA', pensiero: 'scritta', lavagna: 'lavagna', personalizzazione: 'Mirion' }
const ora = q => q ? new Date(q).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''
const giornoLungo = g => new Date(g + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

export async function apriCifra (cosa, giorno = null) {
  document.querySelector('.cassetto-fondo.dentro-cifra')?.remove()
  const fondo = el('div', { class: 'cassetto-fondo dentro-cifra', onclick: e => { if (e.target === fondo) chiudi() } })
  const corpo = el('div', { class: 'dentro-corpo' }, el('p', { class: 'vuoto caricamento', testo: 'Leggo…' }))
  const titolo = el('h2', { testo: '…' })
  const chiudi = () => { fondo.remove(); removeEventListener('keydown', esc) }
  const esc = e => { if (e.key === 'Escape') chiudi() }
  addEventListener('keydown', esc)
  fondo.append(el('aside', { class: 'cassetto cassetto-largo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dentro-t' },
    el('header', {}, Object.assign(titolo, { id: 'dentro-t' }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: chiudi }, ic('x'))), corpo))
  document.body.append(fondo)

  const carica = async g => {
    try {
      const d = await api(`/api/cervello?cosa=${encodeURIComponent(cosa)}${g ? '&giorno=' + g : ''}`)
      titolo.textContent = d.titolo + (d.delGiorno ? (d.giorno === d.oggi ? ', oggi' : `, ${giornoLungo(d.giorno)}`) : '')
      corpo.replaceChildren(...[d.delGiorno && storico(d, carica), voci(d, chiudi), d.lavoro?.length ? lavoro(d) : null, d.link && el('a', { class: 'secondario', href: d.link, onclick: chiudi, testo: 'Apri nella stanza' })].filter(Boolean))
      corpo.querySelector('[aria-pressed="true"]')?.focus()
    } catch (e) { corpo.replaceChildren(el('p', { class: 'vuoto', testo: e.message })); notifica(e.message, { tipo: 'sempre' }) }
  }
  carica(giorno)
}

// gli ultimi 14 giorni, ognuno con il suo conto (una barra), e un giorno qualunque dal calendario
function storico (d, carica) {
  const massimo = Math.max(1, ...d.giorni.map(g => g.quante))
  return el('section', { class: 'storico-cifra', 'aria-label': 'Lo storico' },
    el('div', { class: 'storico-giorni' }, ...[...d.giorni].reverse().map(g => el('button', { type: 'button', 'aria-pressed': String(g.giorno === d.giorno), title: `${giornoLungo(g.giorno)}: ${g.quante}`, onclick: () => carica(g.giorno) },
      el('i', { style: { '--alto': Math.round(g.quante / massimo * 100) + '%' } }), el('b', { testo: g.quante }), el('span', { testo: g.giorno === d.oggi ? 'oggi' : new Date(g.giorno + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) })))),
    el('label', { class: 'sopra piccolo' }, 'Un altro giorno: ', el('input', { type: 'date', max: d.oggi, value: d.giorno, onchange: e => e.target.value && carica(e.target.value) })))
}

function voci (d, chiudi) {
  if (!d.voci.length) return el('p', { class: 'vuoto', testo: d.delGiorno ? 'Niente, quel giorno.' : 'Niente qui dentro.' })
  const riga = v => el('li', {},
    el('div', { class: 'dentro-testo' },
      v.cartella ? el('a', { href: '#cerca?q=' + encodeURIComponent(v.testo), onclick: chiudi }, el('b', { testo: v.testo })) : el('b', { testo: v.testo ? v.testo.replace(/📅\s*\S+|👤\s*\S+/g, '').trim() : nomeNota(v.rel) }),
      el('small', {}, [v.cartella && `${v.quante} note`, v.data && quandoGiorno(v.data), v.chiNome && `di ${v.chiNome}`, v.rel && (v.testo ? nomeNota(v.rel) : v.rel.split('/').slice(0, -1).join(' / ')), typeof v.quando === 'number' && ora(v.quando), typeof v.quando === 'string' && v.quando].filter(Boolean).join(' · '))),
    v.rel ? el('span', { class: 'bottoni' }, el('a', { class: 'quieto piccolo', href: '#cerca?n=' + encodeURIComponent(v.rel), onclick: chiudi, title: 'Leggila in Mirion' }, ic('eye')), obsidian(v.rel, '')) : null)
  return el('section', { 'aria-label': 'Cosa c’è dentro' },
    el('p', { class: 'sopra', testo: d.totale > d.voci.length ? `${d.totale} in tutto: qui le prime ${d.voci.length}` : `${d.totale} in tutto` }),
    el('ul', { class: 'dentro-lista' }, ...d.voci.map(riga)))
}

// il lavoro di quel giorno: ogni cosa fatta da Mirion, con l'ora
function lavoro (d) {
  return el('section', { class: 'dentro-lavoro', 'aria-label': 'Il lavoro del giorno' }, el('h3', { testo: 'Il lavoro di quel giorno, in Mirion' }),
    el('ul', {}, ...d.lavoro.slice(-80).reverse().map(r => el('li', {}, el('small', { testo: ora(r.quando) }), el('span', { class: 'tipo', testo: TIPI[r.tipo] ?? r.tipo }), el('span', { testo: r.cosa })))))
}
