// Le cose da fare nascoste che Mirion trova da sola con «Aggiornami» (server/scansione-mirion.mjs): righe che sembrano
// cose da fare ma non sono caselle. Si mostrano in un cassetto; «Rendila una casella» la trasforma nella sua nota, «Da valutare» la fa casella con «#da-valutare» (Task, «Da valutare»), «No» non la ripropone.
import { el, api, notifica, nomeNota } from './base.js'
import { ic } from './icone.js'
import { obsidian } from './ia.js'
import { bottoneDaValutare, scarta, scartate, chiaveFatta } from './fatte-diario.js'

export async function cerca ({ silenziosa = false } = {}) {
  const via = scartate(), nascoste = (await api('/api/scansione').catch(() => ({ nascoste: [] }))).nascoste.filter(k => !via.has(chiaveFatta(k)))
  if (!nascoste.length) { if (!silenziosa) notifica('Nessuna cosa da fare nascosta nelle note degli ultimi 14 giorni.'); return 0 }
  mostra(nascoste); return nascoste.length
}

// «Rendile tutte caselle» (Marco, 25-11): quelle ancora nella lista (non quelle già fatte, da valutare o scartate con «No»)
export function pulsanteTutte (lista, contenitore) {
  const b = el('button', { type: 'button', class: 'primario piccolo', onclick: async () => {
    const vive = [...contenitore.querySelectorAll('li.nascosta:not(.fatta)')].map(li => li._k).filter(Boolean)
    if (!vive.length) return notifica('Non ne restano da rendere caselle.')
    b.disabled = true
    try {
      const r = await api('/api/scansione/tutte', { nascoste: vive })
      for (const li of contenitore.querySelectorAll('li.nascosta:not(.fatta)')) { li.classList.add('fatta'); li.querySelectorAll('button').forEach(x => { x.disabled = true }); li.querySelector('.bottoni')?.replaceChildren(el('span', { class: 'segno-bene', testo: '✓ È una casella' })) }
      notifica(r.saltate.length ? `${r.fatte} rese caselle; ${r.saltate.length} no, perché la nota è cambiata: premi Aggiornami.` : `${r.fatte} rese caselle, nelle loro note.`, { tipo: 'sempre' })
      dispatchEvent(new Event('delion-aggiornami'))
    } catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
  } }, ic('check-square'), `Rendile tutte caselle (${lista.length})`)
  return b
}

function mostra (lista) {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const righe = lista.map(k => {
    const li = el('li', { class: 'nascosta' }, el('div', {}, el('b', { testo: k.testo }), el('small', { testo: `${nomeNota(k.nota)}, riga ${k.riga}` })), obsidian(k.nota, ''),
      el('button', { type: 'button', class: 'secondario piccolo', onclick: async e => {
        const b = e.currentTarget; b.disabled = true // dopo «await» e.currentTarget non c'è più: il tasto restava spento
        try { await api('/api/scansione/casella', k); li.classList.add('fatta'); li.querySelector('button.secondario').textContent = '✓ È una casella'; dispatchEvent(new Event('delion-aggiornami')) }
        catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
      } }, ic('check-square'), 'Rendila una casella'),
      el('span', { class: 'bottoni' }, bottoneDaValutare(() => api('/api/scansione/casella', { ...k, valutare: true })),
        el('button', { type: 'button', class: 'quieto piccolo', title: 'Non è una cosa da fare: non te la ripropone più', onclick: () => { scarta(k); li.remove() } }, 'No')))
    li._k = k
    return li
  })
  const ul = el('ul', { class: 'nascoste-lista' }, ...righe)
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Cose da fare nascoste' },
    el('header', {}, el('div', {}, el('h2', { testo: `${lista.length} cose da fare nascoste` }),
      el('p', { class: 'sopra', testo: 'Righe delle note degli ultimi 14 giorni che sembrano cose da fare ma non sono caselle. Mirion non le cambia da sola: scegli tu, una per una o tutte insieme.' }), pulsanteTutte(lista, ul)),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    ul))
  document.body.append(fondo)
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { fondo.remove(); removeEventListener('keydown', esc) } })
  fondo.querySelector('.chiudi').focus()
}
