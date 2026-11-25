// La stanza «Claude» (Marco, 25-11-2026: «con l'app con l'IA mi fai una dashboard dedicata a fare questo tipo di cose,
// perfettamente integrata con Mirion, così da avere pieno controllo»). Claude via API, con la chiave di Impostazioni:
// - «Chat»: Claude legge il cervello e propone le modifiche; ognuna si approva o si scarta qui (server/chat-claude.mjs)
// - «Consumi»: quanto si spende oggi e nel mese, per funzione e per modello, gli ultimi 30 giorni, le ultime chiamate,
//   il tetto del mese e il modello di ogni funzione (server/claude.mjs)
// Chi vuole il suo abbonamento di claude.ai usa «Fallo con…», che apre l'app di Claude come sempre.
import { el, api, notifica, quando, apri } from './base.js'
import { ic } from './icone.js'
import { leggiNota } from './markdown.js'
import { obsidian } from './ia.js'

const usd = n => '$' + (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: n > 0 && n < 0.01 ? 4 : 2 })
const tok = n => (Number(n) || 0) >= 1e6 ? `${((n) / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 })} mln` : (Number(n) || 0).toLocaleString('it-IT')
const ora = iso => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
const SFORZI = { low: 'Basso: più veloce, spende meno', medium: 'Medio', high: 'Alto: ragiona di più, spende di più' }

// la scheda aperta, la chat scelta e il progetto restano mentre giri per Mirion; compito: una task da far partire (casella.js)
let stato = { scheda: 'chat', chat: null, progetto: '', compito: null }

// «Claude lavora da solo» con l'API, dal menu di una task: si apre la stanza e la chat della task parte da sola
export function lavoraConAPI (k) {
  stato = { ...stato, scheda: 'chat', chat: null, compito: { nota: k.nota, riga: k.riga, testo: k.testo } }
  if (location.hash.startsWith('#claude')) location.hash = '#claude?compito=' + Date.now(); else location.hash = '#claude'
}

export async function mostra (stanza, parametri) {
  if (parametri?.get('scheda')) stato.scheda = parametri.get('scheda') === 'consumi' ? 'consumi' : 'chat'
  // dalla scheda di un progetto: le chat di quel progetto, e una nuova lì dentro
  if (parametri?.get('progetto')) { stato = { ...stato, scheda: 'chat', chat: null, progetto: parametri.get('progetto') }; history.replaceState(null, '', '#claude') }
  const d = await api('/api/claude'), ridisegna = () => mostra(stanza)
  const s = d.impostazioni, parte = s.tetto > 0 ? d.mese.costo / s.tetto : 0
  const scheda = (id, testo, icona) => el('a', { href: `#claude?scheda=${id}`, class: stato.scheda === id ? 'attiva' : null, onclick: e => { e.preventDefault(); stato.scheda = id; ridisegna() } }, ic(icona), testo)
  stanza.replaceChildren(...[
    el('div', { class: 'testata' },
      el('div', {},
        el('p', { class: 'sopra', testo: 'Claude via API, con la tua chiave · i consumi restano su questo computer' }),
        el('h1', { testo: 'Claude' })),
      el('div', { class: 'claude-tetto' + (parte >= 1 ? ' finito' : parte >= s.avviso ? ' quasi' : ''), title: 'La spesa di questo mese rispetto al tetto' },
        el('small', { class: 'sopra', testo: s.tetto > 0 ? `Questo mese ${usd(d.mese.costo)} di ${usd(s.tetto)}` : `Questo mese ${usd(d.mese.costo)} · nessun tetto` }),
        s.tetto > 0 ? el('div', { class: 'claude-barra' }, el('i', { style: { width: Math.min(100, parte * 100) + '%' } })) : null)),
    d.pronto ? null : el('div', { class: 'pannello claude-avviso' },
      el('p', {}, el('b', { testo: 'Manca la chiave API di Claude. ' }), 'La crei su console.anthropic.com (Settings → API keys), ricarichi il credito, e la incolli in Impostazioni: resta cifrata su questo computer. Per usare il tuo abbonamento di claude.ai, invece, c\'è sempre «Fallo con…», che apre l\'app di Claude.'),
      el('div', { class: 'bottoni' }, el('a', { class: 'bottone piccolo', href: '#impostazioni' }, ic('gear-six'), 'Apri Impostazioni'))),
    el('nav', { class: 'schede-fit', 'aria-label': 'Le parti della stanza Claude' }, scheda('chat', 'Chat', 'sparkle'), scheda('consumi', 'Consumi e impostazioni', 'sliders-horizontal')),
    stato.scheda === 'consumi' ? consumi(d, ridisegna) : chat(d, ridisegna)].filter(Boolean))
}

// --- la chat ---
function chat (d, ridisegna) {
  const nomeProgetto = c => d.progetti.find(p => p.cartella === c)?.nome ?? String(c).split('/').pop()
  const scelte = d.chat.filter(c => !stato.progetto || (stato.progetto === '-' ? !c.progetto : c.progetto === stato.progetto))
  const filtro = el('select', { 'aria-label': 'Le chat di quale progetto', onchange: e => { stato.progetto = e.target.value; stato.chat = null; ridisegna() } },
    el('option', { value: '', selected: !stato.progetto, testo: 'Tutte le chat' }), el('option', { value: '-', selected: stato.progetto === '-', testo: 'Senza progetto' }),
    ...[...new Set([...d.progetti.map(p => p.cartella), ...d.chat.map(c => c.progetto).filter(Boolean), ...(stato.progetto && stato.progetto !== '-' ? [stato.progetto] : [])])]
      .map(c => el('option', { value: c, selected: stato.progetto === c, testo: 'Progetto: ' + nomeProgetto(c) })))
  const lista = el('ul', {}, ...scelte.map(c => el('li', {}, el('a', { href: '#claude', class: c.id === stato.chat ? 'scelta' : null, onclick: e => { e.preventDefault(); stato.chat = c.id; ridisegna() } },
    el('b', {}, c.titolo, c.daApprovare ? el('span', { class: 'claude-bollino', title: 'Proposte da approvare', testo: c.daApprovare }) : null),
    el('small', { testo: [quando(c.aggiornata.slice(0, 10)), !stato.progetto && c.progetto ? nomeProgetto(c.progetto) : null, usd(c.costo)].filter(Boolean).join(' · ') })))))
  const fila = el('div', { class: 'chat-fila', 'aria-live': 'polite' }), testa = el('div', { class: 'chat-testa' })
  const campo = el('textarea', { rows: 1, maxlength: 20000, placeholder: 'Chiedi a Claude: «cosa scade questa settimana?», «prepara la mail per Rossi», «riassumi il progetto…»', 'aria-label': 'Il messaggio per Claude' })
  const invia = el('button', { type: 'button', class: 'tondo', title: 'Manda (Invio)', 'aria-label': 'Manda' }, ic('paper-plane-right'))
  const progettoQui = c => c ? c.progetto : (stato.progetto && stato.progetto !== '-' ? stato.progetto : null)
  // le istruzioni del progetto per Claude (come nei Progetti di Claude): una nota nella cartella, si apre in Obsidian
  const istruzioni = p => el('button', { type: 'button', class: 'secondario piccolo', title: 'Claude le legge in ogni chat di questo progetto', onclick: async () => { try { const r = await api('/api/claude/istruzioni', { progetto: p }); await apri.obsidian(r.nota) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('notebook'), 'Istruzioni del progetto')
  const disegna = c => {
    const p = progettoQui(c)
    testa.replaceChildren(el('div', { class: 'claude-testa-riga' }, el('h2', { testo: c ? c.titolo : p ? `Una chat nuova nel progetto «${nomeProgetto(p)}»` : 'Una chat nuova' }), p ? istruzioni(p) : null), el('small', { class: 'sopra', testo: c ? `Questa chat: ${usd(c.costo)} · modello della chat: ${nomeModello(d, d.impostazioni.modelli.chat)}` : `Claude legge il tuo cervello e ti propone le modifiche: niente si scrive finché non lo approvi. Modello: ${nomeModello(d, d.impostazioni.modelli.chat)}.` }))
    fila.replaceChildren(...(c?.vista ?? []).map(m => bolla(m, c, ridisegna)))
    if (!c) fila.append(el('p', { class: 'vuoto', testo: 'Scrivi qui sotto per cominciare.' }))
    fila.scrollTop = fila.scrollHeight
  }
  const manda = async () => {
    const testo = campo.value.trim(); if (!testo) return campo.focus()
    campo.value = ''; invia.disabled = true; campo.disabled = true
    fila.querySelector('.vuoto')?.remove()
    fila.append(el('div', { class: 'bolla mia' }, el('p', { testo })), el('div', { class: 'bolla sua' }, el('p', { class: 'puntini', testo: 'Claude legge e pensa' })))
    fila.scrollTop = fila.scrollHeight
    try { const c = await api('/api/claude/chat', { id: stato.chat, testo, progetto: stato.chat ? null : progettoQui(null) }); stato.chat = c.id; ridisegna() }
    catch (e) { fila.lastChild.replaceWith(el('div', { class: 'bolla errore' }, el('p', { testo: e.message }))); campo.value = testo; invia.disabled = false; campo.disabled = false; campo.focus() }
  }
  invia.onclick = manda
  campo.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); manda() } })
  campo.addEventListener('input', () => { campo.style.height = 'auto'; campo.style.height = Math.min(160, campo.scrollHeight) + 'px' })
  if (!d.pronto) { campo.disabled = true; invia.disabled = true }
  disegna(null)
  // una task da far lavorare (dal suo menu): la chat parte da sola, e si vede Claude al lavoro
  if (stato.compito && d.pronto) {
    const k = stato.compito; stato.compito = null
    fila.replaceChildren(el('div', { class: 'bolla mia' }, el('p', { testo: `Lavora su questa task: «${k.testo}»` })), el('div', { class: 'bolla sua' }, el('p', { class: 'puntini', testo: 'Claude legge la task e ci lavora' })))
    api('/api/claude/compito-api', k).then(c => { stato.chat = c.id; stato.progetto = ''; ridisegna() }).catch(e => fila.lastChild.replaceWith(el('div', { class: 'bolla errore' }, el('p', { testo: e.message }))))
  } else if (stato.chat) api('/api/claude/chat?id=' + encodeURIComponent(stato.chat)).then(disegna).catch(() => { stato.chat = null; disegna(null) })
  return el('div', { class: 'chat-stanza claude-chat' },
    el('div', { class: 'chat-lista' },
      el('div', { class: 'chat-lista-testa' }, el('h1', { testo: 'Chat' }), el('button', { type: 'button', class: 'secondario piccolo', onclick: () => { stato.chat = null; ridisegna() } }, ic('plus'), 'Nuova')),
      filtro,
      scelte.length ? lista : el('p', { class: 'vuoto piccolo', testo: stato.progetto ? 'Nessuna chat qui: scrivi per cominciarne una.' : 'Ancora nessuna chat.' }),
      stato.chat ? el('button', { type: 'button', class: 'secondario piccolo claude-togli', onclick: async () => { try { await api('/api/claude/chat/togli', { id: stato.chat }); stato.chat = null; ridisegna() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('trash'), 'Togli questa chat') : null),
    el('div', { class: 'chat-telefono' }, testa, fila, el('div', { class: 'chat-scrivi' }, campo, invia)))
}

const nomeModello = (d, id) => d.modelli.find(m => m.id === id)?.nome ?? id

function bolla (m, c, ridisegna) {
  if (m.chi === 'tu') return el('div', { class: 'bolla mia' }, el('p', { testo: m.testo }), el('time', { testo: ora(m.quando) }))
  const proposte = c.proposte.filter(p => (m.proposte ?? []).includes(p.id)) // le proposte nate in questa risposta
  return el('div', { class: 'bolla sua claude-bolla' },
    m.fatti?.length ? el('small', { class: 'strumenti', testo: m.fatti.join(' · ') }) : null,
    leggiNota(m.testo),
    ...proposte.map(p => proposta(p, c, ridisegna)),
    el('time', { testo: `${ora(m.quando)} · ${usd(m.costo)}` }))
}
function proposta (p, c, ridisegna) {
  const decidi = azione => async () => { try { await api('/api/claude/proposta', { id: c.id, proposta: p.id, azione }); notifica(azione === 'applica' ? `Scritto in «${p.nota.replace(/\.md$/, '')}».` : 'Proposta scartata.'); ridisegna() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  return el('div', { class: 'claude-proposta ' + p.stato.replace(' ', '-') },
    el('small', { class: 'sopra', testo: `Proposta ${p.id} · ${p.tipo === 'crea' ? 'nota nuova' : 'da aggiungere in fondo a'} «${p.nota.replace(/\.md$/, '')}»` }),
    p.perche ? el('p', { testo: p.perche }) : null,
    el('details', {}, el('summary', { testo: 'Il testo' }), el('pre', { testo: p.testo })),
    p.stato === 'da approvare'
      ? el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'piccolo', onclick: decidi('applica') }, ic('check'), 'Approva e scrivi'), el('button', { type: 'button', class: 'secondario piccolo', onclick: decidi('scarta') }, ic('x'), 'Scarta'))
      : el('div', { class: 'bottoni' }, el('small', { class: 'sopra', testo: p.stato === 'applicata' ? 'Scritta nel cervello' : 'Scartata' }), p.stato === 'applicata' ? obsidian(p.nota, 'Apri in Obsidian') : null))
}

// --- i consumi e le impostazioni ---
function consumi (d, ridisegna) {
  const s = d.impostazioni, max = Math.max(...d.giorni.map(g => g.costo), 0.0001)
  const cifra = (titolo, valore, sotto, classe = '') => el('div', { class: 'conti-cifra ' + classe }, el('small', { class: 'sopra', testo: titolo }), el('b', { testo: valore }), sotto ? el('small', { class: 'sopra', testo: sotto }) : null)
  const tabella = (titolo, righe) => el('section', { class: 'pannello claude-tabella' }, el('h2', { testo: titolo }),
    righe.length ? el('table', {}, el('tr', {}, ...['', 'Chiamate', 'Token entrata', 'Token uscita', 'Costo'].map(t => el('th', { testo: t }))),
      ...righe.map(r => el('tr', {}, el('td', { testo: r.nome }), el('td', { testo: r.chiamate }), el('td', { testo: tok(r.entrata) }), el('td', { testo: tok(r.uscita) }), el('td', { testo: usd(r.costo) }))))
      : el('p', { class: 'vuoto', testo: 'Ancora niente questo mese.' }))
  return el('div', { class: 'claude-consumi' },
    el('div', { class: 'conti-cifre' },
      cifra('Oggi', usd(d.oggi.costo), `${d.oggi.chiamate} ${d.oggi.chiamate === 1 ? 'chiamata' : 'chiamate'}`),
      cifra('Questo mese', usd(d.mese.costo), `${d.mese.chiamate} chiamate${d.mese.errori ? `, ${d.mese.errori} non riuscite` : ''}`),
      cifra('A fine mese, a questo ritmo', usd(d.stimaFineMese), 'una stima', s.tetto > 0 && d.stimaFineMese > s.tetto ? 'attenzione' : ''),
      cifra('Tetto del mese', s.tetto > 0 ? usd(s.tetto) : 'nessuno', s.tetto > 0 ? `restano ${usd(Math.max(0, s.tetto - d.mese.costo))}` : 'Claude non si ferma mai'),
      cifra('Dalla cache', tok(d.mese.cache), 'token riletti, costano molto meno')),
    el('section', { class: 'pannello' }, el('h2', { testo: 'Gli ultimi 30 giorni' }),
      el('div', { class: 'claude-giorni', role: 'img', 'aria-label': 'La spesa di ogni giorno degli ultimi 30' },
        ...d.giorni.map(g => el('i', { title: `${quando(g.giorno)}: ${usd(g.costo)}`, style: { height: Math.max(g.costo > 0 ? 4 : 1, g.costo / max * 100) + '%' } }))),
      el('small', { class: 'sopra', testo: `il giorno più caro: ${usd(max > 0.0001 ? max : 0)}` })),
    el('div', { class: 'claude-due' }, tabella('Per funzione, questo mese', d.perFunzione), tabella('Per modello, questo mese', d.perModello)),
    impostazioni(d, ridisegna),
    el('section', { class: 'pannello claude-tabella' }, el('h2', { testo: 'Le ultime chiamate' }),
      d.ultime.length ? el('table', {}, el('tr', {}, ...['Quando', 'Funzione', 'Modello', 'Entrata', 'Uscita', 'Costo', ''].map(t => el('th', { testo: t }))),
        ...d.ultime.map(r => el('tr', { class: r.errore ? 'errore' : null }, el('td', { testo: `${quando(r.quando.slice(0, 10))} ${ora(r.quando)}` }), el('td', { testo: d.funzioni.find(f => f.id === r.funzione)?.nome ?? r.funzione }),
          el('td', { testo: nomeModello(d, r.modello) + (r.modello !== r.richiesto ? ' (riserva)' : '') }), el('td', { testo: tok(r.entrata + r.cacheLetti + r.cacheScritti) }), el('td', { testo: tok(r.uscita) }), el('td', { testo: usd(r.costo) }),
          el('td', { class: 'sopra', testo: r.errore ?? r.dettaglio ?? '' }))))
        : el('p', { class: 'vuoto', testo: 'Ancora nessuna chiamata a Claude.' })),
    d.mesi.length > 1 ? el('section', { class: 'pannello claude-tabella' }, el('h2', { testo: 'I mesi' }), el('table', {}, ...d.mesi.map(m => el('tr', {}, el('td', { testo: new Date(m.mese + '-15').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) }), el('td', { testo: `${m.chiamate} chiamate` }), el('td', { testo: usd(m.costo) }))))) : null,
    el('p', { class: 'sopra piccolo', testo: 'I costi sono stime fatte con i prezzi dell\'API: il conto vero, le chiavi e la ricarica del credito sono sulla Console Anthropic (console.anthropic.com).' }))
}

function impostazioni (d, ridisegna) {
  const s = d.impostazioni
  const tetto = el('input', { type: 'number', min: 0, max: 10000, step: 1, value: s.tetto, 'aria-label': 'Il tetto di spesa del mese, in dollari' })
  const modelli = Object.fromEntries(d.funzioni.map(f => [f.id, el('select', { 'aria-label': `Il modello per ${f.nome}` }, ...d.modelli.map(m => el('option', { value: m.id, selected: s.modelli[f.id] === m.id, testo: `${m.nome} · $${m.entrata} / $${m.uscita} per milione di token${m.spiega ? ' · ' + m.spiega : ''}` })))]))
  const sforzi = Object.fromEntries(d.funzioni.filter(f => f.sforzo).map(f => [f.id, el('select', { 'aria-label': `Quanto ragiona Claude per ${f.nome}` }, ...Object.entries(SFORZI).map(([v, t]) => el('option', { value: v, selected: s.sforzi[f.id] === v, testo: t })))]))
  const salva = async () => {
    try {
      await api('/api/claude/impostazioni', { tetto: tetto.value, modelli: Object.fromEntries(Object.entries(modelli).map(([k, e]) => [k, e.value])), sforzi: Object.fromEntries(Object.entries(sforzi).map(([k, e]) => [k, e.value])) })
      notifica('Fatto: Claude usa le scelte nuove dalla prossima chiamata.'); ridisegna()
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  return el('section', { class: 'pannello claude-imposta' }, el('h2', { testo: 'Le tue scelte' }),
    el('label', {}, el('span', { testo: 'Tetto di spesa del mese, in dollari (0 = nessun tetto). Arrivati al tetto, Claude si ferma fino al mese dopo.' }), tetto),
    ...d.funzioni.map(f => el('label', {}, el('span', { testo: `Modello per «${f.nome}»` }), modelli[f.id])),
    ...Object.entries(sforzi).map(([id, e]) => el('label', {}, el('span', { testo: `Quanto ragiona nella ${d.funzioni.find(f => f.id === id).nome.toLowerCase()}` }), e)),
    el('div', { class: 'bottoni' }, el('button', { type: 'button', onclick: salva }, ic('check'), 'Salva')))
}
