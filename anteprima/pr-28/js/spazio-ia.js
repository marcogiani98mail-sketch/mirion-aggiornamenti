// La stanza «Lavoro con l'IA» (Marco, 20-11: «uno spazio dove il lavoro con Claude, ma con un'intelligenza artificiale qualunque,
// venga visto dal programma e monitorato… tramite Obsidian che traccia quello che viene svolto»).
// Le sessioni sono note nel vault (server/sessioni-ia.mjs): qui si vedono, si incolla la risposta della chat, si chiudono
// con una riga su cosa è stato fatto. La stanza si ridisegna da sola quando un file del vault cambia (app.js, /api/eventi).
import { el, api, notifica, quando } from './base.js'
import { ic } from './icone.js'
import { pulsantiIA, obsidian } from './ia.js'

let stanzaViva = null

export async function mostra (stanza) {
  stanzaViva = stanza
  const d = await api('/api/ia/sessioni'), ridisegna = () => mostra(stanza)
  const aperte = d.sessioni.filter(s => s.stato === 'aperta'), chiuse = d.sessioni.filter(s => s.stato !== 'aperta')
  stanza.replaceChildren(
    el('div', { class: 'testata' }, el('div', {},
      el('p', { class: 'sopra', testo: `Le note delle sessioni sono in «${d.cartella}», dentro il tuo vault` }),
      el('h1', { testo: 'Lavoro con l\'IA' }))),
    chiedi(),
    abbonamento(),
    el('p', { class: 'sopra piccolo spiega-ia', testo: 'Ogni volta che lavori con un\'IA da Mirion nasce una nota: la richiesta, chi, quando. Finché la sessione è aperta, Mirion segna nella nota i file del vault che cambiano. La risposta della chat la incolli qui; Claude la scrive da solo. In Obsidian vedi tutto, e nel resoconto del giorno c\'è «Lavoro con l\'IA».' }),
    el('h2', { testo: aperte.length ? `Aperte (${aperte.length})` : 'Nessuna sessione aperta' }),
    el('ul', { class: 'sessioni-ia' }, ...aperte.map(s => sessione(s, ridisegna))),
    ...(chiuse.length ? [el('h2', { testo: `Chiuse (${chiuse.length})` }), el('ul', { class: 'sessioni-ia chiuse' }, ...chiuse.map(s => sessione(s, ridisegna)))] : []))
}

// quando un file del vault cambia: se la stanza è aperta, si ridisegna (senza perdere quello che stai scrivendo)
export function aggiorna () {
  if (!stanzaViva || stanzaViva.hidden || stanzaViva.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return
  mostra(stanzaViva).catch(() => {})
}

// una richiesta libera: con l'IA predefinita, un'altra dalla freccina, (Claude e Codex lavorano dentro il vault)
function chiedi () {
  const campo = el('textarea', { rows: 2, maxlength: 4000, class: 'campo-grande', placeholder: 'Cosa vuoi fare? Per esempio: «riordina le note dei clienti» o «scrivi la mail a Rossi»', 'aria-label': 'La richiesta per l\'IA' })
  const manda = async (ia, modo) => {
    const testo = campo.value.trim()
    if (!testo) { campo.focus(); return notifica('Scrivi prima cosa chiedere.') }
    try {
      await api('/api/ia/chiedi', { testo, ia, modo })
      notifica(modo === 'code' || String(ia).startsWith('claude') || ia === 'codex' ? `${ia === 'codex' ? 'Codex' : 'Claude'} si apre sul tuo cervello con la richiesta: conferma la cartella e premi invio.` : 'L\'IA si apre con la richiesta (è anche negli appunti: Ctrl+V). La sessione è qui sotto.', { tipo: 'sempre', durata: 7000 })
      campo.value = ''; setTimeout(aggiorna, 300)
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  return el('div', { class: 'pannello chiedi-ia' }, campo, el('div', { class: 'bottoni' }, ...pulsantiIA(ia => manda(ia))))
}

function sessione (s, ridisegna) {
  const aperta = s.stato === 'aperta'
  const risposta = el('textarea', { rows: 3, maxlength: 20000, placeholder: 'Incolla qui la risposta della chat (Ctrl+V)', 'aria-label': `La risposta per «${s.titolo}»` })
  const fatto = el('input', { type: 'text', maxlength: 300, placeholder: 'In una riga: cosa è stato fatto', 'aria-label': `Cosa è stato fatto in «${s.titolo}»` })
  const azione = (url, corpo, ok) => async () => { try { await api(url, corpo()); notifica(ok); ridisegna() } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  return el('li', { class: 'sessione-ia pannello' + (s.attiva ? ' viva' : '') },
    el('div', { class: 'sessione-testa' },
      ic('sparkle', { duo: true }),
      el('div', {}, el('b', { testo: s.titolo.replace(/^\d{4}-\d{2}-\d{2} \d{4} /, '') }),
        el('small', { testo: [s.ia, s.inizio && quando(s.inizio.slice(0, 10)) + ' alle ' + s.inizio.slice(11, 16), s.file ? `${s.file} ${s.file === 1 ? 'file cambiato' : 'file cambiati'}` : 'nessun file cambiato', s.attiva ? 'Mirion sta guardando' : aperta ? 'aperta' : 'chiusa'].filter(Boolean).join(' · ') })),
      obsidian(s.rel, '')),
    !aperta ? null : el('details', {}, el('summary', { testo: 'Incolla la risposta, chiudi la sessione' }),
      risposta,
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario piccolo', onclick: azione('/api/ia/sessione/risposta', () => ({ rel: s.rel, testo: risposta.value }), 'La risposta è nella nota.') }, ic('copy'), 'Metti la risposta nella nota')),
      fatto,
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'primario piccolo', onclick: azione('/api/ia/sessione/chiudi', () => ({ rel: s.rel, fatto: fatto.value }), 'Sessione chiusa: è nel resoconto di oggi.') }, ic('check'), 'Chiudi la sessione'))))
}

// «Claude lavora da solo» con l'abbonamento (server/claude-code.mjs): se Claude Code c'è e se è collegato al tuo account
function abbonamento () {
  const qui = el('p', { class: 'sopra piccolo claude-abbonamento' })
  api('/api/claude/abbonamento').then(s => {
    if (!s.trovato) return qui.replaceChildren('«Claude lavora da solo» con l\'abbonamento ha bisogno dell\'app di Claude su questo computer.')
    if (s.collegato) return qui.replaceChildren(`Claude Code è collegato al tuo abbonamento: dal menu di una task, «Claude lavora da solo».${s.lavori ? ` Adesso sta lavorando su ${s.lavori} task.` : ''}`)
    qui.replaceChildren('Per «Claude lavora da solo» con l\'abbonamento, Claude Code va collegato al tuo account una volta. ',
      el('button', { type: 'button', class: 'secondario piccolo', onclick: async () => { try { await api('/api/claude/abbonamento/collega', {}); notifica('Si apre il browser: entra con il tuo account di Claude, poi torna qui.', { tipo: 'sempre', durata: 8000 }) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('sparkle'), 'Collega Claude'))
  }).catch(() => qui.remove())
  return qui
}
