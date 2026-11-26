// L'aggiornamento che si vede (Marco, 23-11: «fai un avviso o qualcosa che mi dica che si sta aggiornando, perché se no diventa
// difficile saperlo»): un riquadro fra le notifiche che non se ne va da solo, con la barra di quanto ha scaricato e la fase
// (scarico, controllo l'impronta, apro l'installatore, Mirion si chiude e si riapre). Lo usano l'avviso all'avvio e Impostazioni.
import { el, api, $ } from './base.js'

const MB = n => (n / 1048576).toLocaleString('it-IT', { maximumFractionDigits: 0 })
let riquadro = null

// la notifica «C'è Mirion X» resta finché non la chiudi o premi «Aggiorna» (prima spariva dopo 20 secondi)
export function avvisaVersione (r) {
  if (riquadro || $('.notifica.versione-nuova')) return
  const n = el('div', { class: 'notifica versione-nuova', role: 'status' },
    el('div', { class: 'agg-corpo' }, el('b', { testo: `C’è Mirion ${r.ultima}` }), r.note ? el('span', { class: 'agg-dettaglio', testo: r.note }) : null),
    el('div', { class: 'agg-bottoni' },
      el('button', { type: 'button', class: 'primario piccolo', testo: 'Aggiorna', onclick: () => { n.remove(); $('.versione-nuova-tasto')?.remove(); $('.versione-attuale')?.removeAttribute('hidden'); aggiornaOra() } }),
      el('button', { type: 'button', class: 'quieto', testo: 'Dopo', title: 'Te lo ricordo alla prossima apertura; intanto è in Impostazioni', onclick: () => n.remove() })))
  $('[data-notifiche]').append(n)
}

// La versione nuova dove si legge il numero, in alto (Marco, 25-11: «per la nuova versione appare una notifica dove adesso c’è
// segnalata la versione», «e si aggiorna da lì»): al posto di «v0.1.x alpha» un tasto con il pallino, «0.1.y · Aggiorna».
// È un tasto accanto al marchio e non dentro, perché il marchio è un link alla scrivania.
export function segnaVersione (r) {
  const marchio = $('.marchio')
  if (!marchio || $('.versione-nuova-tasto')) return
  const tasto = el('button', { type: 'button', class: 'versione-nuova-tasto', title: `C’è Mirion ${r.ultima} (tu hai la ${r.versione}). Premi per aggiornare: Mirion scarica, controlla e si riapre aggiornata`,
    'aria-label': `C’è Mirion ${r.ultima}: aggiorna`, onclick: () => { tasto.remove(); $('.versione-attuale')?.removeAttribute('hidden'); $('.notifica.versione-nuova')?.remove(); aggiornaOra() } },
  el('span', { class: 'pallino', 'aria-hidden': 'true' }), el('span', { testo: `${r.ultima} · Aggiorna` }))
  $('.versione-attuale')?.setAttribute('hidden', '')
  marchio.after(tasto)
}

export async function aggiornaOra () {
  if (riquadro) return riquadro.querySelector('button')?.focus()
  const titolo = el('b', { testo: 'Aggiorno Mirion…' }), dettaglio = el('span', { class: 'agg-dettaglio', testo: 'Controllo la versione nuova' })
  const barra = el('progress', { class: 'agg-barra', max: 100, 'aria-label': 'Avanzamento dell’aggiornamento' }), bottoni = el('div', { class: 'agg-bottoni', hidden: true })
  riquadro = el('div', { class: 'notifica aggiornamento', role: 'status', 'aria-live': 'polite' }, el('div', { class: 'agg-corpo' }, titolo, dettaglio, barra), bottoni)
  $('[data-notifiche]').append(riquadro)
  const mostra = p => {
    const v = p.versione ? ` ${p.versione}` : ''
    if (p.fase === 'scarico') {
      titolo.textContent = `Scarico Mirion${v}…`
      if (p.totale) { const pc = Math.min(100, Math.round(p.fatti / p.totale * 100)); barra.value = pc; dettaglio.textContent = `${pc}% · ${MB(p.fatti)} di ${MB(p.totale)} MB · puoi continuare a lavorare` }
      else { barra.removeAttribute('value'); dettaglio.textContent = `${MB(p.fatti ?? 0)} MB scaricati · puoi continuare a lavorare` }
    } else if (p.fase === 'impronta') { titolo.textContent = `Controllo Mirion${v}…`; dettaglio.textContent = 'Guardo che il file sia quello giusto'; barra.value = 100 }
    else if (p.fase === 'apro') { titolo.textContent = `Installo Mirion${v}…`; dettaglio.textContent = 'Apro l’installatore'; barra.removeAttribute('value') }
  }
  const giro = setInterval(() => api('/api/aggiornamenti/stato').then(mostra).catch(() => {}), 500)
  try {
    const x = await api('/api/aggiornamenti/installa', {})
    clearInterval(giro); barra.removeAttribute('value')
    // sul Mac (24-11): la pagina della versione su GitHub, con il .dmg da scaricare
    if (x?.chiude === false && /^https:/.test(x.pronto ?? '')) { titolo.textContent = 'Scarica la versione per Mac'; dettaglio.textContent = x.avviso; barra.value = 100; chiudibile() }
    else if (x?.chiude === false) { titolo.textContent = 'Serve il permesso'; dettaglio.textContent = x.avviso || 'L’installatore chiede il permesso dell’amministratore e riapre Mirion aggiornata.'; chiudibile() }
    else if (x?.chiude) { riquadro.classList.add('chiude'); titolo.textContent = 'Mirion si chiude e si riapre aggiornata'; dettaglio.textContent = 'Fra qualche secondo. Non spegnere il computer.' }
    else { titolo.textContent = 'Aggiornamento pronto'; dettaglio.textContent = 'Scaricato e controllato (in prova: l’installatore non si apre).'; barra.value = 100; chiudibile() }
  } catch (e) {
    clearInterval(giro)
    riquadro.classList.add('errore'); titolo.textContent = 'L’aggiornamento non è andato'; dettaglio.textContent = e.message; barra.hidden = true
    bottoni.replaceChildren(el('button', { type: 'button', class: 'primario piccolo', testo: 'Riprova', onclick: () => { riquadro.remove(); riquadro = null; aggiornaOra() } }))
    chiudibile()
  }
  function chiudibile () { bottoni.hidden = false; bottoni.append(el('button', { type: 'button', class: 'quieto', testo: 'Chiudi', onclick: () => { riquadro.remove(); riquadro = null } })) }
}
