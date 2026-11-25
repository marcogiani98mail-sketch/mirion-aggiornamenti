// «Aggiornami», in cima alla scrivania (Marco, 20-11: «fai un tasto aggiornami così che il vault guardi Obsidian…
// l'ideale è che Obsidian e Delion vadano di pari passo»). Delion si aggiorna già da solo quando un file del vault cambia
// (app.js, /api/eventi); il tasto lo fa subito, e nell'area della squadra prima prende da GitHub il lavoro degli altri.
// Accanto, l'ora dell'ultimo allineamento: «in pari con Obsidian alle 16:40».
import { el, api, notifica, STATO } from './base.js'
import { ic } from './icone.js'
import * as aree from './aree.js'

const testoOra = () => STATO.allineato
  ? `in pari con Obsidian alle ${new Date(STATO.allineato).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
  : STATO.allineato === false ? 'non in pari: Mirion non sente il vault' : 'mi allineo con Obsidian…'
// un ascoltatore solo, per tutte le scritte che ci sono nella pagina (la scrivania si ridisegna spesso)
addEventListener('delion-allineato', () => { for (const s of document.querySelectorAll('.aggiornami-ora')) s.textContent = testoOra(); for (const b of document.querySelectorAll('.aggiornami-cima')) b.title = titolo() })
const titolo = () => 'Aggiornami: rilegge subito il vault (quello che hai scritto in Obsidian, o che ha scritto un’IA) e cerca le cose da fare nascoste; nella squadra prende anche il lavoro degli altri da GitHub. Ora: ' + testoOra()

// cima: il tasto nella barra in alto, in ogni pagina di Mirion (Marco, 24-11: «dammi il tastino aggiornami da tutte le parti
// navigabili»); l'ora dell'ultimo allineamento sta nel suo suggerimento
export function pulsanteAggiornami ({ cima = false } = {}) {
  const b = el('button', { type: 'button', class: 'scrivania-libreria aggiornami', title: 'Rilegge subito il vault (quello che hai scritto in Obsidian, o che ha scritto un\'IA) e cerca le cose da fare nascoste nelle note. Nella squadra prende anche il lavoro degli altri da GitHub.',
    onclick: async () => {
      b.disabled = true; b.classList.add('gira')
      try {
        let altri = ''
        if (aree.attiva()?.tipo === 'squadra') { const r = await api('/api/squadra/prendi', {}).catch(e => ({ ok: false, errore: e.message })); altri = r.ok ? ' e con la squadra' : ` (la squadra no: ${r.errore})` }
        await new Promise(ok => { addEventListener('delion-allineato', ok, { once: true }); dispatchEvent(new Event('delion-aggiornami')) })
        // poi la scansione di Mirion, al posto di «Scansiona con Claude» (Marco, 21-11): le cose da fare nascoste nelle note
        const trovate = await import('./nascoste.js').then(m => m.cerca({ silenziosa: true })).catch(() => 0)
        // e le cose da fare che il diario dice già fatte (fatte-diario.js): se ce ne sono, la finestra per confermarle
        const fatte = await import('./fatte-diario.js').then(m => m.controlla()).catch(() => 0)
        notifica(`Aggiornato: Mirion è in pari con Obsidian${altri}.${trovate ? ` Ho trovato ${trovate} cose da fare nascoste.` : ' Nessuna cosa da fare nascosta.'}${fatte ? ` Dal diario sembrano fatte ${fatte} cose: confermale.` : ''}`)
      } catch (e) { notifica(e.message, { tipo: 'sempre' }) } finally { b.disabled = false; b.classList.remove('gira') }
    } }, ic('arrows-clockwise'), el('span', { testo: 'Aggiornami' }))
  if (cima) { b.classList.add('aggiornami-cima'); b.title = titolo(); return b }
  return el('div', { class: 'aggiornami-gruppo' }, b, el('small', { class: 'aggiornami-ora', 'aria-live': 'polite', testo: testoOra() }))
}
