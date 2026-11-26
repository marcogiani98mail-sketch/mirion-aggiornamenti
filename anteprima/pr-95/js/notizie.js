// La stanza Notizie (Marco, 23-11: «una newsletter, per ora settabile, dove aggiungo un link e mi viene scremata per parole
// chiave in base a quello che è il nostro lavoro, e dei dati utili»): in cima il campo per il link, sotto le notizie già lette
// (dalla più nuova, o da quella che c'entra di più), a destra le parole chiave. Il lavoro lo fa server/notizie.mjs.
import { el, api, notifica, apri, quando } from './base.js'
import { ic } from './icone.js'

let ordine = 'nuove', progettoScelto = null

export async function mostra (stanza) {
  const d = await api('/api/notizie')
  const rifai = () => mostra(stanza)
  const progetti = [...new Set(d.notizie.map(n => n.progetto).filter(Boolean))].sort()
  if (progettoScelto && !progetti.includes(progettoScelto)) progettoScelto = null
  const viste = d.notizie.filter(n => !progettoScelto || n.progetto === progettoScelto).sort((a, b) => ordine === 'conta' ? b.punteggio - a.punteggio : 0)
  const link = campoLink(d, rifai, { grande: true })
  stanza.replaceChildren(
    el('div', { class: 'testata' }, el('div', {},
      el('p', { class: 'sopra', testo: 'Arrivano da sole con le vostre parole chiave, o da un link: ogni notizia è una nota in Condiviso/Notizie' }),
      el('h1', { testo: 'Notizie' })), cercaAdesso(rifai)),
    rigaAuto(d, rifai), link,
    el('div', { class: 'notizie' },
      el('section', { class: 'notizie-elenco' },
        el('div', { class: 'notizie-filtri' },
          el('div', { class: 'per-persona', role: 'group', 'aria-label': 'Per progetto' },
            ...[[null, 'Tutte'], ...progetti.map(p => [p, p])].map(([id, nome]) => el('button', { type: 'button', 'aria-pressed': String(progettoScelto === id), onclick: () => { progettoScelto = id; rifai() } }, nome))),
          el('div', { class: 'per-persona', role: 'group', 'aria-label': 'In ordine' },
            el('button', { type: 'button', 'aria-pressed': String(ordine === 'nuove'), onclick: () => { ordine = 'nuove'; rifai() } }, 'Le più nuove'),
            el('button', { type: 'button', 'aria-pressed': String(ordine === 'conta'), onclick: () => { ordine = 'conta'; rifai() } }, 'Quelle che c’entrano di più'))),
        viste.length ? el('ul', { class: 'notizie-lista' }, ...viste.map(scheda)) : el('p', { class: 'vuoto', testo: d.notizie.length ? 'Nessuna notizia per questo progetto.' : 'Ancora nessuna notizia: premi «Cerca adesso» o incolla un link.' })),
      el('aside', { class: 'pannello notizie-parole' }, el('h2', { testo: 'Parole chiave' }), el('p', { class: 'sopra piccolo', testo: 'Più ne trova in una notizia, più c’entra. ✕ per toglierne una.' }), tagParole(d),
        el('h2', { testo: 'Personalizza' }), personalizza(d, rifai))))
  link.querySelector('input')?.focus()
}

// --- i pezzi, usati qui e nella card della scrivania (caselle-studio-notizie.js) ---

// «Cerca adesso»: la ricerca fatta subito, senza aspettare la mattina
export function cercaAdesso (dopo) {
  const b = el('button', { type: 'button', class: 'secondario piccolo', title: 'Cerca subito le notizie nuove con le parole chiave' }, ic('magnifying-glass'), 'Cerca adesso')
  b.onclick = async () => {
    b.disabled = true; b.replaceChildren('Cerco…')
    try {
      const r = await api('/api/notizie/cerca', {})
      const n = r.salvate.length
      notifica((n ? `${n === 1 ? 'Una notizia nuova' : n + ' notizie nuove'}: «${r.salvate[0].titolo}»${n > 1 ? '…' : ''}` : `Niente di nuovo che c’entri (guardate ${r.guardate} notizie).`) + (r.errori?.length ? ' Non rispondono: ' + r.errori.join('; ') : ''), { tipo: 'sempre' })
      dopo?.()
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) } finally { b.disabled = false; b.replaceChildren(ic('magnifying-glass'), 'Cerca adesso') }
  }
  return b
}

// quando arrivano da sole: ogni mattina a un'ora, o ogni tot ore; quante alla volta; si possono spegnere
export function rigaAuto (d, dopo) {
  const a = d.automatiche ?? {}
  const salva = async cambio => { try { await api('/api/notizie/automatiche', cambio); dopo?.() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  const quando = el('select', { 'aria-label': 'Quando cercare', onchange: e => salva({ quando: e.target.value }) },
    el('option', { value: 'mattina', selected: a.quando !== 'ore', testo: 'ogni mattina alle' }), el('option', { value: 'ore', selected: a.quando === 'ore', testo: 'ogni' }))
  const ora = el('input', { type: 'time', value: a.ora ?? '07:30', 'aria-label': 'A che ora', onchange: e => e.target.value && salva({ ora: e.target.value }) })
  const ore = el('input', { type: 'number', min: 1, max: 24, value: a.ore ?? 6, class: 'numero-breve', 'aria-label': 'Ogni quante ore', onchange: e => salva({ ore: +e.target.value }) })
  const quante = el('input', { type: 'number', min: 1, max: 10, value: a.quante ?? 3, class: 'numero-breve', 'aria-label': 'Quante notizie alla volta', onchange: e => salva({ quante: +e.target.value }) })
  const acceso = el('input', { type: 'checkbox', checked: a.attivo !== false, onchange: e => salva({ attivo: e.target.checked }) })
  const p = a.prossima ? new Date(a.prossima) : null
  const quandoP = p ? (p <= new Date() ? 'fra poco' : p.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : null
  const nota = !a.qui ? 'le cerca la Mirion del titolare: qui arrivano da GitHub' : a.attivo === false ? 'spente' : quandoP ? 'prossima: ' + quandoP : ''
  return el('div', { class: 'notizie-auto' },
    el('label', { class: 'interruttore-breve' }, acceso, el('span', { testo: 'Arrivano da sole' })),
    quando, ...(a.quando === 'ore' ? [ore, el('span', { testo: 'ore' })] : [ora]),
    el('span', { testo: '·' }), quante, el('span', { testo: 'alla volta' }),
    nota ? el('small', { class: 'sopra', testo: nota }) : null)
}

// «Personalizza» (Marco, 23-11: «rendi la cosa personalizzabile»): da dove cercare (Google News con le parole chiave, i feed delle
// newsletter e dei siti che scegli tu), quanto vecchie possono essere, quante parole chiave deve avere almeno una notizia
export function personalizza (d, dopo) {
  const a = d.automatiche ?? {}
  const salva = async cambio => { try { await api('/api/notizie/automatiche', cambio); dopo?.() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  const fonti = a.fonti ?? []
  const nuova = el('input', { type: 'url', placeholder: 'Il feed RSS di una newsletter, un sito, un giornale', 'aria-label': 'Aggiungi una fonte' })
  const aggiungi = () => { const u = nuova.value.trim(); if (u) salva({ fonti: [...fonti, u] }) }
  nuova.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aggiungi() } })
  const scegli = (etichetta, valore, opzioni, cambia) => el('label', { class: 'scelta-breve' }, el('span', { testo: etichetta }),
    el('select', { onchange: e => cambia(+e.target.value) }, ...opzioni.map(([v, t]) => el('option', { value: v, selected: v === valore, testo: t }))))
  return el('div', { class: 'notizie-personalizza' },
    el('h4', { testo: 'Da dove' }),
    el('label', { class: 'interruttore-breve' }, el('input', { type: 'checkbox', checked: a.google !== false, onchange: e => salva({ google: e.target.checked }) }),
      el('span', { testo: 'Google News, con le parole chiave' })),
    el('ul', { class: 'tag-parole' }, ...fonti.map(f => el('li', { class: 'tag', title: f }, el('span', { testo: (() => { try { const u = new URL(f); return u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.slice(0, 24) : '') } catch { return f } })() }),
      el('button', { type: 'button', 'aria-label': 'Togli la fonte ' + f, title: 'Togli', onclick: () => salva({ fonti: fonti.filter(x => x !== f) }) }, ic('x'))))),
    el('div', { class: 'notizia-nuova' }, nuova, el('button', { type: 'button', class: 'secondario piccolo', onclick: aggiungi }, ic('plus'), 'Aggiungi')),
    el('small', { class: 'sopra', testo: 'Le newsletter e i siti hanno spesso un indirizzo «RSS» o «feed» (…/feed, …/rss.xml): mettilo qui e Mirion legge anche quello, ogni volta.' }),
    el('h4', { testo: 'Come scegliere' }),
    el('div', { class: 'scelte-brevi' },
      scegli('Notizie degli ultimi', a.giorni ?? 2, [[1, '1 giorno'], [2, '2 giorni'], [3, '3 giorni'], [7, '7 giorni'], [14, '14 giorni']], v => salva({ giorni: v })),
      scegli('Con almeno', a.minimo ?? 2, [[1, '1 parola chiave (tante notizie)'], [2, '2 parole chiave'], [3, '3 parole chiave (poche, molto vicine)']], v => salva({ minimo: v }))))
}

// il campo per un link: letto e scremato; se non c'entra, si salva solo se lo dici tu
export function campoLink (d, dopo, { grande = false } = {}) {
  const campo = el('input', { type: 'url', class: grande ? 'campo-grande' : '', placeholder: grande ? 'Incolla il link di un articolo, una newsletter, un bando…' : 'Incolla un link e premi Invio', 'aria-label': 'Il link della notizia', required: true })
  const vai = el('button', { class: grande ? 'primario' : 'secondario piccolo' }, ic('magnifying-glass'), 'Leggi')
  const esito = el('div', { class: 'notizia-esito', 'aria-live': 'polite' })
  const leggi = async (url, forza = false) => {
    vai.disabled = true; vai.replaceChildren(d.claude ? 'Leggo e chiedo a Claude…' : 'Leggo…'); esito.replaceChildren()
    try {
      const r = await api('/api/notizie', { url, forza })
      if (r.gia) { notifica('C’è già: «' + r.titolo + '».'); return }
      if (!r.salvata) {
        esito.replaceChildren(el('div', { class: 'pannello notizia-scartata' },
          el('b', { testo: 'Non c’entra con il vostro lavoro: «' + r.titolo + '»' }),
          el('p', { class: 'sopra', testo: r.trovate.length ? 'Trovate poche parole chiave: ' + r.trovate.map(x => x.parola).join(', ') + '.' : 'Nessuna delle parole chiave è nella pagina.' }),
          el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario', onclick: () => leggi(url, true) }, 'Salvala lo stesso'),
            el('button', { type: 'button', class: 'quieto', onclick: () => esito.replaceChildren() }, 'Lascia stare'))))
        return
      }
      campo.value = ''
      notifica('Salvata: «' + r.titolo + '»' + (r.progetto ? ' · per ' + r.progetto : '') + (r.ia?.errore ? ' · senza riassunto: ' + r.ia.errore : '') + '.', { tipo: r.ia?.errore ? 'sempre' : '' })
      dopo?.()
    } catch (e) { esito.replaceChildren(el('p', { class: 'attivazione-errore', role: 'alert', testo: e.message })) }
    finally { vai.disabled = false; vai.replaceChildren(ic('magnifying-glass'), 'Leggi') }
  }
  return el('div', {}, el('form', { class: 'notizia-nuova', onsubmit: e => { e.preventDefault(); if (!vai.disabled) leggi(campo.value) } }, campo, vai), esito)
}

function scheda (n) {
  return el('li', { class: 'pannello notizia' },
    el('div', { class: 'notizia-testa' },
      el('b', { class: 'notizia-punti', title: 'Quanto c’entra: più parole chiave diverse trova, più è alto', testo: n.punteggio }),
      el('div', {}, el('h3', { testo: n.titolo }),
        el('small', { class: 'sopra', testo: [n.fonte, n.aggiunta ? quando(n.aggiunta) : null, n.da ? `da ${n.da}` : null].filter(Boolean).join(' · ') }))),
    n.riassunto ? el('p', { class: 'notizia-riassunto', testo: n.riassunto }) : null,
    el('div', { class: 'notizia-parole' }, n.progetto ? el('span', { class: 'reparto', testo: n.progetto }) : null, ...n.parole.slice(0, 8).map(p => el('span', { class: 'ruolo', testo: p }))),
    el('div', { class: 'bottoni' },
      el('button', { type: 'button', class: 'secondario piccolo', onclick: () => window.open(n.link, '_blank', 'noopener') }, ic('arrow-square-out'), 'La pagina'),
      el('button', { type: 'button', class: 'quieto piccolo', onclick: () => apri.obsidian(n.rel).catch(e => notifica(e.message, { tipo: 'sempre' })) }, 'La nota in Obsidian'),
      el('a', { class: 'quieto piccolo', href: '#cerca?n=' + encodeURIComponent(n.rel) }, 'Leggila qui')))
}

// le parole chiave come tag (Marco, 23-11: «le parole chiave inseriscile stile tag»): ognuna con la ✕ per toglierla, il campo
// sotto per aggiungerne (Invio o la virgola). Ogni cambio si salva subito in Condiviso/Notizie/Parole chiave.md (e su GitHub)
export function tagParole (d) {
  let lista = [...d.parole]
  const tag = el('ul', { class: 'tag-parole', 'aria-label': 'Le parole chiave' })
  const campo = el('input', { type: 'text', placeholder: 'Aggiungi una parola e premi Invio', 'aria-label': 'Aggiungi una parola chiave', maxlength: 60 })
  const salva = async nuova => {
    const prima = lista; lista = nuova; disegna()
    try { const r = await api('/api/notizie/parole', { parole: lista }); lista = r.parole; disegna() }
    catch (e) { lista = prima; disegna(); notifica(e.message, { tipo: 'sempre' }) }
  }
  const disegna = () => tag.replaceChildren(...lista.map(p => el('li', { class: 'tag' }, el('span', { testo: p }),
    el('button', { type: 'button', 'aria-label': `Togli «${p}»`, title: 'Togli', onclick: () => salva(lista.filter(x => x !== p)) }, ic('x')))))
  const aggiungi = () => {
    const nuove = campo.value.split(/[,;\n]/).map(s => s.trim()).filter(s => s && !lista.some(x => x.toLowerCase() === s.toLowerCase()))
    campo.value = ''
    if (nuove.length) salva([...lista, ...nuove])
  }
  campo.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); aggiungi() }
    else if (e.key === 'Backspace' && !campo.value && lista.length) salva(lista.slice(0, -1)) // Backspace nel campo vuoto toglie l'ultima
  })
  campo.addEventListener('blur', () => { if (campo.value.trim()) aggiungi() })
  disegna()
  return el('div', { class: 'tag-box' }, tag, campo)
}
