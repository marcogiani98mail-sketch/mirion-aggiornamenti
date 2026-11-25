// Cerca: le note del vault per parola, e il lettore per leggerle senza aprire Obsidian.
// I [[collegamenti]] portano alla nota collegata; «Apri in Obsidian» e «Chiedi a Claude» a un clic.
import { el, api, notifica, nomeNota } from './base.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'
import { leggiNota } from './markdown.js'

let ultima = '', risultati = [], indietro = []

export async function mostra (stanza, parametri) {
  const campo = el('input', { type: 'search', class: 'campo-grande', placeholder: 'Cerca nelle note: una parola, un nome, un cliente…', 'aria-label': 'Cerca nelle note', value: ultima })
  const lista = el('ul', { class: 'risultati', 'aria-label': 'Note trovate' }), lettore = el('article', { class: 'lettore pannello', 'aria-live': 'polite' })
  let timer = null
  const cerca = async q => {
    ultima = q
    if (q.trim().length < 2) { lista.replaceChildren(); return }
    risultati = await api('/api/cerca?q=' + encodeURIComponent(q))
    lista.replaceChildren(...risultati.map(r => el('li', { class: 'risultato' }, el('button', { type: 'button', onclick: () => leggi(r.nota) }, el('b', { testo: nomeNota(r.nota) }), el('small', { testo: r.nota.split('/').slice(0, -1).join(' / ') || 'radice' }), el('span', { testo: r.pezzo })), obsidian(r.nota, ''))))
    if (!risultati.length) lista.append(el('li', { class: 'vuoto', testo: 'Nessuna nota con queste parole.' }))
  }
  const leggi = async (nota, daLink = false) => {
    try {
      const { testo } = await api('/api/nota?n=' + encodeURIComponent(nota))
      if (!daLink) indietro = []
      lettore.replaceChildren(
        el('header', { class: 'lettore-testa' },
          el('div', {}, el('small', { class: 'sopra', testo: nota.split('/').slice(0, -1).join(' / ') }), el('h2', { testo: nomeNota(nota) })),
          el('div', { class: 'bottoni' },
            indietro.length ? el('button', { type: 'button', class: 'quieto', testo: '← Indietro', onclick: () => leggi(indietro.pop(), true) }) : null,
            obsidian(nota),
            ...pulsantiIA(ia => conIA.testo(`Ecco la mia nota «${nomeNota(nota)}»:\n---\n${testo.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').slice(0, 3000)}\n---\nDimmi cosa resta da fare, in ordine, e aiutami a cominciare dalla prima.`, ia), { testo: 'Chiedi a' }))),
        leggiNota(testo, {
          apriNota: async nome => { try { const r = await api('/api/trova?n=' + encodeURIComponent(nome)); indietro.push(nota); leggi(r.nota, true) } catch (e) { notifica(e.message) } },
          apriLink: href => /^https:/.test(href) ? notifica('I link esterni si aprono da Obsidian: ' + href) : null,
        }))
      lettore.scrollTop = 0
      for (const b of lista.querySelectorAll('.risultato > button')) b.toggleAttribute('aria-current', b.firstChild.textContent === nomeNota(nota))
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  campo.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => cerca(campo.value), 220) })
  lettore.append(el('p', { class: 'vuoto', testo: 'Scegli una nota a sinistra: la leggi qui.' }))
  stanza.replaceChildren(el('div', { class: 'testata' }, el('h1', { testo: 'Cerca' })), campo, el('div', { class: 'cerca-corpo' }, lista, lettore))
  const q = parametri.get('q'); if (q) { ultima = q; campo.value = q }
  if (ultima) await cerca(ultima)
  const n = parametri.get('n'); if (n) leggi(n)
  campo.focus()
}
