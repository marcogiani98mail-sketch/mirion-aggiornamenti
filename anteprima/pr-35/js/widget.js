// I widget del telefono (Marco, 23-11-2026 sera: «se la scarico mi fai aprire il widget direttamente da telefono così che possa usarli
// senza aprire l'app» · «ovviamente di tutta l'applicazione, non solo di queste»). Ogni card di Mirion si apre da sola, a tutto
// schermo, con «?widget=<card>» nell'indirizzo: #scrivania?widget=adesso, #prodotto?id=piatto&widget=acqua, #clienti?widget=1.
// Dal telefono la si mette sulla schermata Home (⋮ → «Aggiungi a schermata Home»): un tocco e la card è lì, pronta da usare.
// I widget veri, quelli che stanno sulla schermata Home senza aprire niente, li può avere solo un'app nativa (Android o iPhone).
import { el, api } from './base.js'
import { ic } from './icone.js'
import { TITOLI } from './riquadri.js'
import { scrivania } from './su-misura.js'

// la card da sola, con sotto l'ingresso al resto
export const cornice = (contenuto, dove, nome = 'Mirion') => el('div', { class: 'widget-solo' }, contenuto,
  el('a', { class: 'quieto piccolo widget-apri', href: dove }, ic('arrow-square-out'), `Apri ${nome} in Mirion`))

// tutti i widget che ci sono adesso: le card della scrivania, quelle dei software, i clienti
export async function tutti () {
  // tutte le card, anche quelle spente sulla scrivania (Marco, 25-11: «le card salvale in caso una persona voglia dei widget sul
  // telefono»): prima quelle accese, nell'ordine della scrivania, poi le altre
  const sc = scrivania(), fuori = new Set(['studio-pt', 'senza-data'])
  const accese = (sc?.riquadri ?? []).filter(r => !r.nascosto).map(r => r.id)
  const ids = [...new Set([...accese, ...Object.keys(TITOLI)])].filter(id => TITOLI[id] && !fuori.has(id) && !/^p\./.test(id))
  const della = ids.map(id => ({ nome: TITOLI[id], dove: '#scrivania?widget=' + id, gruppo: 'La scrivania' }))
  let software = []
  try {
    const { CARTE } = await import('./prodotto.js'), ps = (await api('/api/prodotti')).prodotti ?? []
    software = ps.flatMap(p => Object.entries(CARTE).filter(([c]) => p.id === 'piatto' || ['task', 'ia', 'notizie', 'note', 'programma'].includes(c)).map(([c, t]) => ({ nome: `${p.nome} · ${t}`, dove: `#prodotto?id=${encodeURIComponent(p.id)}&widget=${c}`, gruppo: p.nome })))
  } catch { /* senza software, solo la scrivania */ }
  return [...della, ...software, { nome: 'Clienti', dove: '#clienti?widget=1', gruppo: 'Clienti' }]
}

// in Impostazioni → «Il telefono»: l'elenco, un link per card, e come metterla sulla schermata Home
export function elencoWidget () {
  const box = el('div', { class: 'widget-elenco' }, el('p', { class: 'sopra', testo: 'Leggo le card…' }))
  tutti().then(ws => {
    const gruppi = Object.groupBy ? Object.groupBy(ws, w => w.gruppo) : ws.reduce((g, w) => ((g[w.gruppo] ??= []).push(w), g), {})
    box.replaceChildren(
      el('p', { class: 'sopra', testo: 'Dal telefono apri una card qui sotto, poi dal menu del browser (⋮ o «Condividi») scegli «Aggiungi a schermata Home»: diventa un’icona che apre solo quella card, pronta da usare. I widget veri, che si vedono sulla schermata Home senza aprire niente, arriveranno con l’app per Android e iPhone.' }),
      ...Object.entries(gruppi).map(([g, lista]) => el('div', { class: 'widget-gruppo' }, el('b', { testo: g }),
        el('div', { class: 'widget-link' }, ...lista.map(w => el('a', { class: 'secondario piccolo', href: w.dove }, w.nome))))))
  })
  return box
}
