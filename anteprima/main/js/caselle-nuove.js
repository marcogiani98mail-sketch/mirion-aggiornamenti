// Due card della scrivania (Marco, 24-11-2026 sera).
// «I programmi»: «fammi anche una card che mi fa visualizzare i programmi che abbiamo adesso in giro e dove girano» (server/programmi.mjs).
// «Da chiudere e nascoste»: «metti anche una card con il fatto che possa vedere le card suggerite da chiudere e quelle nascoste»:
// le cose da fare che il diario dice già fatte (fatte-diario.js) e quelle nascoste nelle note (nascoste.js), sempre a vista sulla
// scrivania invece che solo in un cassetto dopo «Aggiornami». Gli stessi gesti: «Sì, è fatta» / «Da valutare» / «No», «Rendila una casella» / «Da valutare» / «No».
import { el, api, notifica, nomeNota } from './base.js'
import { ic } from './icone.js'
import { obsidian } from './ia.js'
import { scartate, scarta, chiaveFatta, bottoneDaValutare } from './fatte-diario.js'
import { pulsanteTutte } from './nascoste.js'

const DOVE = { computer: 'desktop', online: 'arrow-up-right', github: 'upload-simple', android: 'arrow-down', mac: 'desktop' }
const chiaro = t => /^(acceso|online|pronta)/.test(t) ? 'bene' : /spento|non risponde|nessuna/.test(t) ? 'presto' : ''

export function programmi (tutte = false) {
  const lista = el('ul', { class: 'programmi-elenco' }, el('li', { class: 'vuoto', testo: 'Guardo cosa gira…' }))
  const quando = el('span', { class: 'sopra piccolo' })
  const leggi = async (diNuovo = false) => {
    try {
      const d = await api('/api/programmi' + (diNuovo ? '?di-nuovo=1' : ''))
      quando.textContent = 'controllato alle ' + new Date(d.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      const voci = tutte ? d.programmi : d.programmi.slice(0, 8)
      lista.replaceChildren(...voci.map(p => el('li', { class: 'programma' + (p.nascosto ? ' tolto' : '') },
        el('div', { class: 'programma-testa' }, el('b', { testo: p.nome }), p.versione ? el('small', { class: 'sopra', testo: p.versione }) : null,
          el('span', { class: 'programma-stato ' + chiaro(p.stato), testo: p.stato })),
        p.cosa ? el('small', { class: 'sopra', testo: p.cosa + (p.nascosto ? ' · tolto da Mirion' : '') + (p.nota ? ' · ' + p.nota : '') }) : null,
        el('div', { class: 'programma-dove' }, ...p.dove.map(w => w.url
          ? el('a', { href: w.url, target: '_blank', rel: 'noopener', title: 'Apri' }, ic(DOVE[w.tipo] ?? 'arrow-up-right'), w.testo)
          : el('span', {}, ic(DOVE[w.tipo] ?? 'arrow-up-right'), w.testo))))))
      if (!tutte && d.programmi.length > voci.length) lista.append(el('li', {}, el('a', { class: 'quieto piccolo', href: '#scrivania?pagina=programmi', testo: `Tutti (${d.programmi.length})` })))
    } catch (e) { lista.replaceChildren(el('li', { class: 'vuoto', testo: 'Non riesco a guardare: ' + e.message })) }
  }
  leggi()
  return el('section', { class: 'fascia programmi', 'aria-label': 'I programmi' },
    el('header', {}, el('h2', { testo: 'I programmi' }), quando, el('button', { type: 'button', class: 'quieto piccolo', title: 'Guarda di nuovo adesso', onclick: () => leggi(true) }, ic('arrows-clockwise'))),
    lista)
}

// due card (Marco, 25-11 notte: «le schede da chiudere e nascoste… dividimele come card tra nascoste e fatte»): «Da chiudere»,
// le cose che il diario dice fatte (con «Segna tutte fatte»), e «Nascoste», le cose da fare scritte nelle note senza casella.
// Una parte senza niente da mostrare resta una riga sola sotto il titolo
const vuota = (stato, testo) => n => { stato.hidden = n > 0; if (!n) stato.textContent = testo }
const aggiorna = () => dispatchEvent(new Event('delion-aggiornami'))

export function daChiudere () {
  const fatte = el('ul', { class: 'fatte-diario' })
  const stato = el('p', { class: 'sopra piccolo da-chiudere-stato', testo: 'Guardo il diario…' })
  const fatto = vuota(stato, 'Niente da chiudere: il diario non racconta cose ancora aperte.')
  ;(async () => {
    const { proposte = [] } = await api('/api/fatte-dal-diario').catch(() => ({}))
    const via = scartate(), qui = proposte.filter(p => !via.has(chiaveFatta(p)))
    fatte.replaceChildren(...(qui.length ? qui.map(p => {
      const li = el('li', {},
        el('div', { class: 'fatte-testo' }, el('b', { testo: p.testo.replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/u, '') }), el('small', { class: 'sopra', testo: `nel diario del ${new Date(p.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}${p.prova ? `: «${p.prova}»` : ''}` })),
        el('div', { class: 'bottoni' },
          el('button', { type: 'button', class: 'primario piccolo', onclick: async e => {
            const b = e.currentTarget; b.disabled = true
            try { await api('/api/casella', { nota: p.nota, riga: p.riga, testo: p.testo, stato: 'fatta' }); li.classList.add('fatta'); li.querySelector('.bottoni').replaceChildren(el('span', { class: 'segno-bene', testo: '✓ fatta' })); aggiorna() }
            catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
          } }, ic('check'), 'Sì, è fatta'),
          bottoneDaValutare(() => api('/api/casella', { nota: p.nota, riga: p.riga, testo: p.testo, stato: 'valutare' })),
          el('button', { type: 'button', class: 'quieto piccolo', title: 'Non te la ripropone più', onclick: () => { scarta(p); li.remove() } }, 'No')))
      return li
    }) : []))
    fatto(qui.length)
    // tutte fatte con un clic (Marco, 25-11 notte: «dammi la possibilità di mettere tutte fatte con un clic»)
    if (qui.length > 1) fatte.before(el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'primario piccolo', onclick: async e => {
      const b = e.currentTarget; b.disabled = true; let fatti = 0
      for (const p of qui) { try { await api('/api/casella', { nota: p.nota, riga: p.riga, testo: p.testo, stato: 'fatta' }); fatti++ } catch { /* quella resta da chiudere */ } }
      for (const li of fatte.children) { li.classList.add('fatta'); li.querySelector('.bottoni')?.replaceChildren(el('span', { class: 'segno-bene', testo: '✓ fatta' })) }
      b.replaceWith(el('span', { class: 'segno-bene', testo: `✓ ${fatti} fatte` })); aggiorna()
    } }, ic('check'), `Segna tutte fatte (${qui.length})`)))
  })()
  return el('section', { class: 'fascia da-chiudere', 'aria-label': 'Da chiudere' },
    el('header', {}, el('h2', { testo: 'Da chiudere' }), el('span', { class: 'sopra piccolo', testo: 'il diario dice che sono fatte' })),
    stato, fatte)
}

export function nascosteNelleNote () {
  const nascoste = el('ul', { class: 'nascoste-lista' })
  const stato = el('p', { class: 'sopra piccolo da-chiudere-stato', testo: 'Guardo le note…' })
  const fatto = vuota(stato, 'Niente di nascosto nelle note degli ultimi 14 giorni.')
  ;(async () => {
    const { nascoste: lista = [] } = await api('/api/scansione').catch(() => ({}))
    const via = scartate(), qui = lista.filter(k => !via.has(chiaveFatta(k))) // le nascoste a cui hai detto «No» (25-11)
    nascoste.replaceChildren(...(qui.length ? qui.slice(0, 20).map(k => {
      const li = el('li', { class: 'nascosta' }, el('div', {}, el('b', { testo: k.testo }), el('small', { testo: `${nomeNota(k.nota)}, riga ${k.riga}` })), obsidian(k.nota, ''),
        el('button', { type: 'button', class: 'secondario piccolo', onclick: async e => {
          const b = e.currentTarget; b.disabled = true
          try { await api('/api/scansione/casella', k); li.classList.add('fatta'); b.textContent = '✓ È una casella'; aggiorna() } catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
        } }, ic('check-square'), 'Rendila una casella'),
        el('span', { class: 'bottoni' }, bottoneDaValutare(() => api('/api/scansione/casella', { ...k, valutare: true })),
          el('button', { type: 'button', class: 'quieto piccolo', title: 'Non è una cosa da fare: non te la ripropone più', onclick: () => { scarta(k); li.remove() } }, 'No')))
      li._k = k
      return li
    }) : []))
    fatto(qui.length)
    if (qui.length > 1) nascoste.before(el('div', { class: 'bottoni' }, pulsanteTutte(qui.slice(0, 20), nascoste))) // tutte quelle mostrate, in un clic (25-11)
  })()
  return el('section', { class: 'fascia da-chiudere nascoste', 'aria-label': 'Nascoste' },
    el('header', {}, el('h2', { testo: 'Nascoste' }), el('span', { class: 'sopra piccolo', testo: 'sembrano cose da fare, ma non sono caselle' })),
    stato, nascoste)
}
