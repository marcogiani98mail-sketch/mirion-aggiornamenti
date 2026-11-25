// Le cose da fare che il diario dice già fatte (server/fatte-dal-diario.mjs; Marco, 24-11): con «Aggiornami» Mirion confronta il
// diario degli ultimi giorni con le caselle aperte e, se ne trova, mostra la finestra con le proposte. Per ognuna la riga del
// diario che la racconta, «Sì, è fatta» (si spunta nella sua nota, non si cancella) «Da valutare» (va in Task, «Da valutare») o «No» (non te la ripropone più).
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

// le scartate («No») le usa anche la card «Da chiudere e nascoste» della scrivania (caselle-nuove.js)
const K = 'mirion:fatte-no', chiave = p => `${p.nota}|${p.testo}`
export const chiaveFatta = chiave
export const scartate = () => { try { return new Set(JSON.parse(localStorage.getItem(K) || '[]')) } catch { return new Set() } }
export const scarta = p => { try { const s = scartate(); s.add(chiave(p)); localStorage.setItem(K, JSON.stringify([...s].slice(-500))) } catch { /* niente */ } }

// «Da valutare» (Marco, 25-11: «oltre che sì/no, da valutare»): la riga prende «#da-valutare» e va in Task, «Da valutare»;
// la usano anche le nascoste (nascoste.js) e la card «Da chiudere e nascoste» (caselle-nuove.js)
// la riga si cerca al clic: chi chiama crea il bottone mentre costruisce la riga, che non esiste ancora (prima: «li» passato
// da fuori, e l'elenco non si apriva più: «Cannot access 'li' before initialization»)
export function bottoneDaValutare (fai) {
  return el('button', { type: 'button', class: 'secondario piccolo', title: 'Né sì né no: la ritrovi in Task, «Da valutare»', onclick: async e => {
    const b = e.currentTarget, li = b.closest('li'); b.disabled = true
    try { await fai(); li.classList.add('fatta'); li.querySelector('.bottoni')?.replaceChildren(el('span', { class: 'segno-bene', testo: '? da valutare' })); dispatchEvent(new Event('delion-aggiornami')) }
    catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
  } }, ic('clock'), 'Da valutare')
}

// ridà quante proposte ci sono (dopo quelle già scartate); con mostra: true apre la finestra
export async function controlla ({ mostra = true } = {}) {
  const { proposte = [] } = await api('/api/fatte-dal-diario').catch(() => ({}))
  const via = scartate(), qui = proposte.filter(p => !via.has(chiave(p)))
  if (qui.length && mostra) finestra(qui)
  return qui.length
}

function finestra (proposte) {
  document.querySelector('.fatte-diario-fondo')?.remove()
  const fondo = el('div', { class: 'cassetto-fondo fatte-diario-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const lista = el('ul', { class: 'fatte-diario' })
  const riga = p => {
    const li = el('li', {},
      el('div', { class: 'fatte-testo' }, el('b', { testo: p.testo.replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/u, '') }), el('small', { class: 'sopra', testo: `nel diario del ${new Date(p.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}: «${p.prova}»` })),
      el('div', { class: 'bottoni' },
        el('button', { type: 'button', class: 'primario piccolo', onclick: async e => {
          e.target.disabled = true
          try { await api('/api/casella', { nota: p.nota, riga: p.riga, testo: p.testo, stato: 'fatta' }); li.classList.add('fatta'); li.querySelector('.bottoni').replaceChildren(el('span', { class: 'segno-bene', testo: '✓ fatta' })); dispatchEvent(new Event('delion-aggiornami')) }
          catch (err) { notifica(err.message, { tipo: 'sempre' }); e.target.disabled = false }
        } }, ic('check'), 'Sì, è fatta'),
        bottoneDaValutare(() => api('/api/casella', { nota: p.nota, riga: p.riga, testo: p.testo, stato: 'valutare' })),
        el('button', { type: 'button', class: 'quieto piccolo', onclick: () => { scarta(p); li.remove(); if (!lista.children.length) fondo.remove() } }, 'No')))
    return li
  }
  lista.append(...proposte.map(riga))
  fondo.append(el('aside', { class: 'cassetto finestra-area', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Dal diario: sembrano fatte' },
    el('header', {}, el('div', {}, el('h2', { testo: 'Dal diario: sembrano fatte' }),
      el('p', { class: 'sopra', testo: 'Queste cose da fare sono raccontate nel diario degli ultimi giorni. Conferma quelle fatte: si spuntano nella loro nota (non si cancellano) ed escono dalle liste.' })),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    lista))
  document.body.append(fondo)
}
