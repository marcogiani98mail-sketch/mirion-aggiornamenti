// La card «Accessi beta», solo per Marco (Marco, 26-11-2026 sera: «per i link che diamo fammi una card in squadra… una area dove
// c'è la dashboard del computer per riuscire a visualizzare gli accessi alle mie applicazioni in beta, così quando qualcuno accede
// io lo so»). Sta nella Squadra e si mette anche sulla scrivania. Dice: gli ultimi accessi (che arrivano anche come notifica),
// chi ha Mirion Trainer e quando è entrato l'ultima volta, i numeri di Mirion Fit (dei clienti dei trainer solo i numeri, mai chi
// sono), le licenze date con chi le ha usate, e per Mirion sul computer l'ultimo invio di ognuno della squadra. Il server è
// server/accessi-beta.mjs; le licenze si fanno e si rimandano dalla card «Mirion Fit e Mirion Trainer» (accessi-app.js).
import { el, api } from './base.js'
import { ic } from './icone.js'

let diMarco = null
// è la Mirion di Marco? (una volta sola: la scrivania lo chiede per sapere se offrire la card)
export const eDiMarco = () => diMarco ??= api('/api/accessi-beta?chi=1').then(r => Boolean(r?.marco)).catch(() => false)

const fa = iso => {
  if (!iso) return 'mai'
  const s = (Date.now() - Date.parse(iso)) / 1000
  if (s < 90) return 'adesso'
  if (s < 3600) return `${Math.round(s / 60)} min fa`
  if (s < 86400) return `${Math.round(s / 3600)} h fa`
  if (s < 7 * 86400) return `${Math.round(s / 86400)} g fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
const giorno = iso => iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const ora = iso => new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const vivo = iso => iso && Date.now() - Date.parse(iso) < 15 * 60_000
const SEGNO = { nuovo: 'user-plus', entrato: 'arrow-right', clienti: 'users-three', app: 'device-mobile' }

// tutte: a schermo intero (più righe)
export function accessiBeta (tutte = false) {
  const corpo = el('div', { class: 'beta-corpo' }, el('p', { class: 'vuoto', testo: 'Guardo chi è entrato…' }))
  const quando = el('span', { class: 'sopra piccolo' })
  const leggi = async () => {
    let d
    try { d = await api('/api/accessi-beta') } catch (e) { return corpo.replaceChildren(el('p', { class: 'vuoto', testo: e.message })) }
    if (!d.marco) return corpo.replaceChildren(el('p', { class: 'vuoto', testo: 'Gli accessi alle app in beta si vedono solo sulla Mirion di Marco.' }))
    quando.textContent = d.aggiornato ? `aggiornato ${fa(d.aggiornato)}` : ''
    const attivi = d.trainer.filter(t => !t.tolto), oggi = attivi.filter(t => t.visto && Date.now() - Date.parse(t.visto) < 86400_000).length
    const clientiFit = attivi.reduce((n, t) => n + t.clienti, 0) + (d.numeri?.clienti ?? 0)
    const numero = (n, testo, titolo) => el('div', { class: 'beta-numero', title: titolo }, el('b', { testo: String(n) }), el('span', { testo: testo }))
    const eventi = d.eventi.slice(0, tutte ? 100 : 8)
    corpo.replaceChildren(...[
      d.errore ? el('p', { class: 'sopra piccolo beta-avviso', testo: d.errore }) : null,
      el('div', { class: 'beta-numeri' },
        numero(attivi.length, attivi.length === 1 ? 'trainer' : 'trainer', 'Chi ha Mirion Trainer (licenza o chiave)'),
        numero(oggi, 'attivi oggi', 'Trainer la cui Mirion si è fatta viva nelle ultime 24 ore'),
        numero(clientiFit, 'clienti su Mirion Fit', 'I tuoi e quelli dei trainer, che hanno dato il consenso'),
        numero(d.licenze.length, d.licenze.length === 1 ? 'licenza data' : 'licenze date', 'Le licenze di Mirion Trainer fatte da qui')),
      el('h3', { testo: 'Gli ultimi accessi' }),
      eventi.length ? el('ul', { class: 'beta-eventi' }, ...eventi.map(e => el('li', {}, ic(SEGNO[e.tipo] ?? 'bell'), el('span', { testo: e.testo }), el('small', { class: 'sopra', title: ora(e.quando), testo: fa(e.quando) }))))
        : el('p', { class: 'vuoto', testo: 'Ancora niente: quando qualcuno entra in Mirion Trainer o un cliente si collega a Mirion Fit lo vedi qui, e ti arriva una notifica.' }),
      el('h3', { testo: 'Mirion Trainer' }),
      attivi.length ? el('ul', { class: 'beta-righe' }, ...attivi.map(t => el('li', { class: t.sospeso ? 'spento' : '' },
        el('span', { class: 'beta-pallino' + (vivo(t.visto) ? ' acceso' : ''), title: vivo(t.visto) ? 'collegato adesso' : 'non collegato' }),
        el('b', { testo: t.nome }),
        el('small', { class: 'sopra', testo: [`ultima volta ${fa(t.visto)}`, `dal ${giorno(t.creato)}`, `${t.clienti} ${t.clienti === 1 ? 'cliente' : 'clienti'}${t.invitati ? ` (+${t.invitati} invitati)` : ''}`,
          t.accessiApp ? `${t.accessiApp} dal telefono` : '', t.sospeso ? 'sospeso' : t.scade ? `licenza fino al ${giorno(t.scade)}` : ''].filter(Boolean).join(' · ') }))))
        : el('p', { class: 'vuoto', testo: 'Nessun trainer ancora.' }),
      el('h3', { testo: 'Mirion Fit' }),
      el('p', { class: 'sopra', testo: d.numeri ? `I tuoi clienti: ${d.numeri.clienti} collegati, ${d.numeri.attivi1} attivi oggi, ${d.numeri.attivi7} in settimana${d.numeri.invitati ? `, ${d.numeri.invitati} invitati che non sono ancora entrati` : ''}. Dei trainer: ${attivi.reduce((n, t) => n + t.clienti, 0)} clienti, ${attivi.reduce((n, t) => n + t.attivi7, 0)} attivi in settimana (solo i numeri: chi sono lo vede il loro trainer).` : 'Ancora nessun numero da Mirion Fit online.' }),
      el('h3', { testo: 'Le licenze che hai dato' }),
      d.licenze.length ? el('ul', { class: 'beta-righe' }, ...d.licenze.slice(0, tutte ? 200 : 6).map(l => el('li', { class: l.tolto || l.sospeso ? 'spento' : '' },
        el('span', { class: 'beta-pallino' + (l.entrato ? ' usata' : ''), title: l.entrato ? 'usata' : 'non ancora usata' }),
        el('b', { testo: l.nome || 'Senza nome' }),
        el('small', { class: 'sopra', testo: [`data il ${giorno(l.quando)}`, l.entrato ? `usata dal ${giorno(l.entrato)}, ultima volta ${fa(l.visto)}` : 'non ancora usata', l.tolto ? 'tolto' : l.sospeso ? 'sospeso' : ''].filter(Boolean).join(' · ') }))))
        : el('p', { class: 'vuoto', testo: 'Nessuna licenza data da qui: si fanno nella card «Mirion Fit e Mirion Trainer».' }),
      d.squadra.length ? el('h3', { testo: 'Mirion sul computer' }) : null,
      d.squadra.length ? el('ul', { class: 'beta-righe' }, ...d.squadra.map(p => el('li', {},
        el('span', { class: 'beta-pallino' + (p.ultimo && Date.now() - Date.parse(p.ultimo) < 86400_000 ? ' acceso' : '') }),
        el('b', { testo: p.nome }),
        el('small', { class: 'sopra', title: p.cosa ?? '', testo: p.ultimo ? `ultimo invio ${fa(p.ultimo)} · ${p.settimana} in settimana` : 'ancora nessun invio' })))) : null].filter(Boolean))
  }
  leggi()
  const giro = setInterval(() => { if (!corpo.isConnected) return clearInterval(giro); leggi() }, 2 * 60_000)
  return el('section', { class: 'fascia accessi-beta', 'aria-label': 'Accessi beta' },
    el('header', {}, el('h2', { testo: 'Accessi beta' }), quando),
    corpo, el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario piccolo', onclick: () => leggi() }, ic('arrows-clockwise'), 'Guarda di nuovo')))
}
