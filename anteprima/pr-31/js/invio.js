// Dentro un invio dello storico della squadra (server/invio.mjs; Marco, 22-11: «dammi la possibilità di aprire lo storico per
// casella così che veda il lavoro svolto e i file all'interno»): chi, quando, cosa ha scritto, le cose chiuse e aggiunte, e i file,
// ognuno da leggere in Mirion o da aprire in Obsidian.
import { el, api, notifica, nomeNota } from './base.js'
import { ic } from './icone.js'
import { attiva } from './aree.js'
import { leggiNota } from './markdown.js'

// le note dell'invio si aprono in Obsidian nel vault della squadra (anche guardandola dall'area personale; Marco, 25-11)
const apriInObsidian = nota => api('/api/squadra/apri', { nota }).catch(e => notifica(e.message, { tipo: 'sempre' }))
const obsidianSquadra = rel => el('button', { type: 'button', class: 'obsidian-icona', title: 'Apri in Obsidian', 'aria-label': `Apri «${rel}» in Obsidian`, onclick: e => { e.preventDefault(); apriInObsidian(rel) } }, el('img', { src: './icone/obsidian.png', alt: '' }))
// un link scritto nella nota: [[nota]] e i link a un file del cervello in Obsidian; quelli a un sito (o obsidian://) fuori, nel browser
const apriLink = u => /^(https?|obsidian|mailto):/i.test(u) ? window.open(u, '_blank', 'noopener') : apriInObsidian(decodeURIComponent(u))

const ORA = iso => new Date(iso).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export async function apriInvio (sha) {
  document.querySelector('.cassetto-fondo.dentro-invio')?.remove()
  const fondo = el('div', { class: 'cassetto-fondo dentro-invio', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const corpo = el('div', { class: 'dentro-corpo' }, el('p', { class: 'vuoto caricamento', testo: 'Leggo…' })), titolo = el('h2', { id: 'invio-t', testo: 'L’invio' })
  fondo.addEventListener('keydown', e => { if (e.key === 'Escape') fondo.remove() })
  const chiudi = el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))
  fondo.append(el('aside', { class: 'cassetto cassetto-largo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'invio-t' }, el('header', {}, titolo, chiudi), corpo))
  document.body.append(fondo); chiudi.focus()
  try {
    const d = await api('/api/squadra/invio?sha=' + encodeURIComponent(sha))
    titolo.textContent = `${d.chi}, ${ORA(d.quando)}`
    const lista = (nome, voci, classe) => voci.length ? el('section', { class: 'dentro-lavoro' }, el('h3', { testo: `${nome} (${voci.length})` }), el('ul', { class: 'invio-cose ' + classe }, ...voci.map(v => el('li', { testo: v })))) : null
    const vai = rel => el('a', { class: 'quieto piccolo', href: '#cerca?n=' + encodeURIComponent(rel), title: 'Leggila in Mirion', onclick: () => fondo.remove() }, ic('eye'))
    corpo.replaceChildren(...[
      el('p', { class: 'grande', testo: d.titolo }), d.resto ? el('p', { class: 'sopra invio-resto', testo: d.resto }) : null,
      chiLoVede(d, sha),
      d.resoconto ? el('p', {}, el('button', { type: 'button', class: 'secondario piccolo', title: 'Apri in Obsidian', onclick: () => apriInObsidian(d.resoconto) }, el('img', { src: './icone/obsidian.png', alt: '', class: 'icona-app' }), 'Il resoconto del giorno')) : null,
      // la lavagna e le immagini, da vedere; poi quello che c'è scritto, leggibile come in Cerca (Marco, 22-11)
      d.immagini?.length ? el('section', { class: 'invio-immagini' }, el('h3', { testo: 'Le lavagne e le immagini' }), ...d.immagini.map(rel => {
        const img = el('img', { alt: nomeNota(rel) })
        api('/api/squadra/immagine?rel=' + encodeURIComponent(rel)).then(r => { img.src = r.src }).catch(() => img.replaceWith(el('p', { class: 'sopra', testo: 'immagine non disponibile' })))
        // un clic: su tutto lo schermo, con lo zoom (visore.js, 23-11)
        img.style.cursor = 'zoom-in'; img.title = 'Apri a schermo intero, con lo zoom'
        img.addEventListener('click', () => img.src && import('./visore.js').then(m => m.apriImmagine(img.src, nomeNota(rel))))
        return el('figure', {}, img, el('figcaption', { testo: nomeNota(rel) }))
      })) : null,
      d.testi?.length ? el('section', { class: 'invio-testi' }, el('h3', { testo: 'Cosa c’è scritto' }), ...d.testi.map(x => el('article', { class: 'invio-testo' },
        el('h4', {}, nomeNota(x.rel), el('small', { testo: '  ' + x.rel.split('/').slice(0, -1).join(' / ') })),
        el('div', { class: 'lettore-testo' }, leggiNota(x.testo.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''), { apriNota: apriInObsidian, apriLink })),
        x.tagliato ? el('p', { class: 'sopra piccolo', testo: '… il resto è nella nota' }) : null))) : null,
      lista('Ha chiuso', d.chiuse, 'chiuse'), lista('Ha aggiunto da fare', d.nuove, 'nuove'),
      el('section', { 'aria-label': 'I file' }, el('h3', { testo: `I file (${d.quantiFile})` }),
        el('ul', { class: 'dentro-lista' }, ...d.file.map(f => el('li', {},
          el('div', { class: 'dentro-testo' }, el('b', { testo: nomeNota(f.rel) }), el('small', { testo: [f.stato, f.rel.split('/').slice(0, -1).join(' / '), f.piu || f.meno ? `+${f.piu} −${f.meno} righe` : null].filter(Boolean).join(' · ') })),
          f.siApre && /\.md$/.test(f.rel) && attiva()?.tipo === 'squadra' ? el('span', { class: 'bottoni' }, vai(f.rel), obsidianSquadra(f.rel)) : f.siApre ? el('span', { class: 'bottoni' }, obsidianSquadra(f.rel)) : el('small', { class: 'sopra', testo: 'non c’è più' }))))),
      el('p', { class: 'sopra piccolo', testo: `Invio ${d.sha}` })].filter(Boolean))
  } catch (e) { corpo.replaceChildren(el('p', { class: 'vuoto', testo: e.message })); notifica(e.message, { tipo: 'sempre' }) }
}

// chi vede questo invio (server/visibilita.mjs; Marco, 22-11: «segnarlo come solo mio e Sava o generale, o… se arriva un nuovo
// membro solo per me e lui»): tutta la squadra, anche chi entra dopo, o solo le persone spuntate (di partenza quelle di adesso)
function chiLoVede (d, sha) {
  const nomi = ids => ids.map(id => d.persone.find(p => p.id === id)?.nome ?? id).join(', ')
  if (!d.puoSegnare) return el('p', { class: 'sopra piccolo invio-vede', testo: d.vede ? `Lo vedono solo: ${nomi(d.vede)}` : 'Lo vede tutta la squadra' })
  const scelti = new Set(d.vede ?? d.persone.map(p => p.id))
  const caselle = el('div', { class: 'invio-persone', hidden: !d.vede }, ...d.persone.map(p => el('label', {},
    el('input', { type: 'checkbox', checked: scelti.has(p.id), disabled: p.id === d.io, onchange: e => { if (e.target.checked) scelti.add(p.id); else scelti.delete(p.id) } }), ' ', p.nome + (p.id === d.io ? ' (tu)' : ''))))
  let modo = d.vede ? 'scelti' : 'tutti'
  const scelta = (valore, testo) => el('label', {}, el('input', { type: 'radio', name: 'vede-' + sha, value: valore, checked: modo === valore, onchange: () => { modo = valore; caselle.hidden = modo !== 'scelti' } }), ' ', testo)
  const salva = el('button', { type: 'button', class: 'secondario piccolo', testo: 'Salva', onclick: async () => {
    salva.disabled = true
    try {
      const r = await api('/api/squadra/invio/visibilita', { sha, persone: modo === 'tutti' ? null : [...scelti] })
      notifica(r.persone ? `Lo vedono solo: ${nomi(r.persone)}. Chi entra dopo non lo vede.` : 'Lo vede tutta la squadra, anche chi entra dopo.', { tipo: 'sempre' })
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) } finally { salva.disabled = false }
  } })
  return el('fieldset', { class: 'invio-vede' }, el('legend', { testo: 'Chi lo vede' }),
    scelta('tutti', 'Tutta la squadra, anche chi entra dopo'), scelta('scelti', `Solo chi c’è adesso, o solo alcuni`), caselle,
    el('p', { class: 'sopra piccolo', testo: 'Mirion non lo mostra a chi non è spuntato. Il file resta su GitHub: chi ha accesso al repository lo può leggere con altri programmi.' }), salva,
    // la riservatezza vera (dalla ricerca del 22-11): uno spazio a parte, cioè una squadra con il suo repository, dove entra solo chi inviti
    el('p', { class: 'sopra piccolo' }, 'Per le cose davvero riservate serve uno spazio a parte, con il suo repository: ci entra solo chi inviti. ', el('button', { type: 'button', class: 'quieto piccolo', testo: 'Crea uno spazio riservato', onclick: () => import('./squadre.js').then(m => m.nuova()) })))
}
