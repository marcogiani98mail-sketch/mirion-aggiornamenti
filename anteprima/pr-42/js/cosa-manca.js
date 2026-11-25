// La guida a prova di errore (Marco, 21-11: «ci deve essere la guida per le cose che mancano per farlo funzionare»): in cima alla
// scrivania, se manca qualcosa, una striscia che lo dice; il clic apre la lista, dal più importante, con il pulsante giusto per
// ognuna. Niente si installa da Mirion: i programmi si scaricano dalla loro pagina, e la lista se ne accorge con «Controlla di nuovo».
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

export async function strisciaCosaManca () {
  const d = await api('/api/cosa-manca').catch(() => null)
  if (!d?.mancano) return null
  // la striscia si chiude (Marco, 21-11: «il banner in alto fammi scegliere di chiuderlo»): torna solo se manca qualcosa di nuovo
  const firma = d.voci.filter(v => !v.ok).map(v => v.id).sort().join(',')
  let chiusa = ''; try { chiusa = localStorage.getItem('mirion-manca-chiusa') ?? '' } catch { /* senza memoria del browser si mostra */ }
  if (firma.split(',').every(id => chiusa.split(',').includes(id))) return null
  const striscia = el('div', { class: 'cosa-manca' + (d.essenziali ? ' importante' : ''), role: 'status' },
    ic('warning'), el('span', { testo: d.essenziali ? `Per far funzionare Mirion manca ${d.essenziali === 1 ? 'una cosa importante' : d.essenziali + ' cose importanti'}${d.mancano > d.essenziali ? ` (e ${d.mancano - d.essenziali} utili)` : ''}.` : d.mancano === 1 ? 'C\'è una cosa che renderebbe Mirion più comoda.' : `Ci sono ${d.mancano} cose che renderebbero Mirion più comoda.` }),
    el('button', { type: 'button', class: 'secondario piccolo', testo: 'Vedi cosa manca', onclick: () => apri(d) }),
    el('button', { type: 'button', class: 'quieto chiudi-striscia', 'aria-label': 'Chiudi', title: 'Chiudi: torna solo se manca qualcosa di nuovo', onclick: () => { try { localStorage.setItem('mirion-manca-chiusa', firma) } catch { } striscia.remove() } }, ic('x')))
  return striscia
}

async function fai (v) {
  const f = v.fai
  if (f.pagina) { window.open(f.pagina, '_blank', 'noopener'); return notifica('Si apre la pagina ufficiale: installa da lì, poi premi «Controlla di nuovo».', { tipo: 'sempre', durata: 8000 }) }
  if (f.stanza) { document.querySelector('.cassetto-fondo.manca-fondo')?.remove(); location.hash = f.stanza; return }
  try {
    if (f.azione === 'collega-obsidian') { const a = await api('/api/aree'); const r = await api('/api/aree/collega', { id: a.attiva }); notifica(r.collegata ? 'Collegata a Obsidian. Se Obsidian era aperto, riaprilo.' : r.errore ?? 'Obsidian non è su questo computer.', { tipo: 'sempre' }) }
  } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}

function apri (d) {
  const fondo = el('div', { class: 'cassetto-fondo manca-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const lista = el('ul', { class: 'manca-lista' })
  const disegna = d => lista.replaceChildren(...d.voci.map(v => el('li', { class: v.ok ? 'ok' : v.essenziale ? 'manca importante' : 'manca' },
    el('span', { class: 'segno', 'aria-hidden': 'true' }, v.ok ? ic('check-circle') : ic('warning')),
    el('div', {}, el('b', { testo: v.titolo }), el('small', { testo: v.ok ? 'C\'è.' : v.serve })),
    v.ok ? el('span', { class: 'sopra', testo: 'a posto' }) : el('button', { type: 'button', class: v.essenziale ? 'primario piccolo' : 'secondario piccolo', onclick: () => fai(v) }, v.fai.pagina ? ic('arrow-square-out') : null, v.fai.testo))))
  disegna(d)
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Cosa manca' },
    el('header', {}, el('div', {}, el('h2', { testo: 'Cosa manca' }), el('p', { class: 'sopra', testo: 'Dal più importante. I programmi si scaricano dalla loro pagina ufficiale: Mirion non installa niente da sola.' })),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    lista,
    el('button', { type: 'button', class: 'secondario', onclick: async e => { e.currentTarget.disabled = true; const n = await api('/api/cosa-manca').catch(() => d); disegna(n); e.currentTarget.disabled = false; notifica(n.mancano ? `Mancano ancora ${n.mancano} cose.` : 'C\'è tutto.') } }, ic('arrows-clockwise'), 'Controlla di nuovo')))
  document.body.append(fondo)
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { fondo.remove(); removeEventListener('keydown', esc) } })
  fondo.querySelector('.chiudi').focus()
}
