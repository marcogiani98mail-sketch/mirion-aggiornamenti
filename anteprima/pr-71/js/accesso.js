// La porta della Mirion del collaboratore (server/accessi.mjs): nome utente e password, che crea Marco dalla Squadra della scrivania.
// Finché non si entra, Mirion mostra solo questo. Password dimenticata: Marco ne fa una nuova con un clic e la manda.
import { el, api } from './base.js'
import { ic } from './icone.js'

export function accesso (s) {
  const fondo = el('div', { class: 'cassetto-fondo attivazione-fondo' })
  const errore = el('p', { class: 'attivazione-errore', role: 'alert', hidden: true })
  const utente = el('input', { name: 'utente', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: false })
  const password = el('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true })
  const mostra = el('button', { type: 'button', class: 'quieto piccolo', 'aria-pressed': 'false', testo: 'Mostra', onclick: () => {
    const si = password.type === 'password'; password.type = si ? 'text' : 'password'; mostra.textContent = si ? 'Nascondi' : 'Mostra'; mostra.setAttribute('aria-pressed', String(si))
  } })
  const entra = el('button', { class: 'primario grande', testo: 'Entra' })
  const dimenticata = el('p', { class: 'sopra', hidden: true, testo: 'Scrivi a Marco: dalla Squadra della scrivania ti fa una password nuova con un clic e te la manda. Quella vecchia smette di valere.' })
  const modulo = el('form', { class: 'campi-area', onsubmit: async e => {
    e.preventDefault(); errore.hidden = true; entra.disabled = true; entra.textContent = 'Controllo…'
    try { await api('/api/accesso/entra', { utente: utente.value, password: password.value }); location.reload() }
    catch (err) { errore.textContent = err.message; errore.hidden = false; entra.disabled = false; entra.textContent = 'Entra'; password.select() }
  } },
  el('label', {}, el('span', { testo: 'Nome utente' }), utente),
  el('label', {}, el('span', { testo: 'Password' }), el('span', { class: 'riga-cartella' }, password, mostra)),
  errore, entra,
  el('button', { type: 'button', class: 'quieto', testo: 'Ho dimenticato la password', onclick: () => { dimenticata.hidden = false } }), dimenticata)
  fondo.append(el('aside', { class: 'cassetto finestra-attivazione', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Entra in Mirion' },
    el('h2', {}, ic('users-three'), ' Entra in Mirion'),
    el('p', { class: 'sopra', testo: `Questa Mirion è di «${s.nome}». Il nome utente e la password te li ha mandati Marco.` }), modulo))
  document.body.append(fondo)
  utente.focus()
}
