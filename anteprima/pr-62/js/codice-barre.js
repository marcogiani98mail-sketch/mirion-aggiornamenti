// Il codice a barre per aggiungere un alimento (Marco, 23-11-2026 sera: «la cosa dello screenshot e il codice a barre mantienila come
// opzione per il cibo che si mangia… chiedi gli accessi dovuti come se stessi usando un'app normale, deve essere tutto legale»).
// Tre modi, dal più semplice: scrivere le cifre; una foto o uno screenshot dell'etichetta (il codice si legge qui, sul dispositivo:
// l'immagine non va da nessuna parte); la fotocamera dal vivo. La fotocamera parte solo dopo che Mirion ha detto a cosa serve e tu
// hai detto sì, e poi chiede il permesso il telefono (o il browser), come ogni app; si spegne appena letto il codice o chiuso.
// Online va solo il numero del codice: lo cerca il programma di Piatto su Open Food Facts (/api/cibo?codice=).
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

const FORMATI = ['ean_13', 'ean_8', 'upc_a', 'upc_e']
const leggeCodici = () => 'BarcodeDetector' in window
const valido = c => /^\d{8,14}$/.test(c)
const n = v => Number.isFinite(+v) ? Math.round(+v).toLocaleString('it-IT') : '—'

// aggiungi(alimento, grammi): come le card e le pagine di Piatto aggiungono un alimento al pasto
export function campoCodice (p, aggiungi) {
  const cifre = el('input', { inputmode: 'numeric', pattern: '[0-9]{8,14}', maxlength: 14, placeholder: 'Il codice a barre (8-13 cifre)', 'aria-label': 'Il codice a barre', class: 'codice-cifre' })
  const esito = el('div', { class: 'codice-esito' })
  const cerca = async codice => {
    codice = String(codice ?? '').replace(/\D/g, '')
    if (!valido(codice)) { esito.replaceChildren(el('p', { class: 'vuoto', testo: 'Il codice a barre ha da 8 a 14 cifre.' })); return }
    cifre.value = codice
    esito.replaceChildren(el('p', { class: 'vuoto', testo: 'Cerco ' + codice + '…' }))
    try {
      const a = ((await api(`/api/prodotti/cerca?id=${encodeURIComponent(p.id)}&codice=${codice}`)).alimenti ?? [])[0]
      if (!a) return esito.replaceChildren(el('p', { class: 'vuoto', testo: 'Questo codice non c’è su Open Food Facts: cercalo per nome.' }))
      const g = el('input', { type: 'number', min: 1, max: 3000, value: a.porzione?.grammi ?? 100, class: 'numero-breve', 'aria-label': `Grammi di ${a.nome}` })
      esito.replaceChildren(el('div', { class: 'codice-trovato' }, el('b', { testo: a.nome }), el('small', { class: 'sopra', testo: [a.marca, `${n(a.per100?.kcal)} kcal/100 g`].filter(Boolean).join(' · ') }),
        el('span', { class: 'riga-form' }, g, el('span', { testo: 'g' }), el('button', { type: 'button', class: 'primario piccolo', onclick: () => aggiungi(a, +g.value || 100) }, ic('plus'), 'Aggiungi'))))
    } catch (e) { esito.replaceChildren(el('p', { class: 'vuoto', testo: /404|non ha ancora|sconosciut/.test(e.message) ? 'Il programma di Mirion Fit è vecchio: riaccendilo per cercare con il codice.' : e.message })) }
  }
  // una foto o uno screenshot dell'etichetta: si legge qui, se il browser sa leggere i codici (Android, Mac); se no, le cifre a mano
  const file = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return
    if (!leggeCodici()) return esito.replaceChildren(el('p', { class: 'vuoto', testo: 'Qui il codice dalla foto non si legge (su Windows il browser non lo sa fare): scrivi le cifre che vedi sotto le barre. Dal telefono Android la foto funziona.' }))
    try {
      const img = await createImageBitmap(f), trovati = await new window.BarcodeDetector({ formats: FORMATI }).detect(img)
      if (!trovati.length) return esito.replaceChildren(el('p', { class: 'vuoto', testo: 'Nella foto non trovo un codice a barre: riprova più vicino, o scrivi le cifre.' }))
      cerca(trovati[0].rawValue)
    } catch { esito.replaceChildren(el('p', { class: 'vuoto', testo: 'Non riesco a leggere questa immagine: scrivi le cifre.' })) }
  } })
  // la fotocamera dal vivo: solo dove si può (un browser che legge i codici, una pagina sicura), e solo dopo il tuo sì
  const dalVivo = leggeCodici() && navigator.mediaDevices?.getUserMedia && window.isSecureContext
  return el('div', { class: 'codice-barre' },
    el('form', { class: 'riga-form', onsubmit: e => { e.preventDefault(); cerca(cifre.value) } }, cifre, el('button', { class: 'secondario piccolo', testo: 'Cerca' })),
    el('div', { class: 'bottoni' },
      file, el('button', { type: 'button', class: 'quieto piccolo', title: 'Una foto o uno screenshot dell’etichetta: il codice si legge qui, l’immagine non va da nessuna parte', onclick: () => file.click() }, ic('upload-simple'), 'Foto o screenshot'),
      dalVivo ? el('button', { type: 'button', class: 'quieto piccolo', onclick: () => fotocamera(cerca, esito) }, ic('eye'), 'Inquadra') : null),
    esito)
}

// la fotocamera: prima Mirion spiega e chiede, poi chiede il telefono; si spegne appena letto o chiuso
function fotocamera (cerca, esito) {
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo' })
  const chiudi = () => { flusso?.getTracks().forEach(t => t.stop()); fondo.remove() }
  let flusso = null
  const scatola = el('section', { class: 'invito-scatola', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'La fotocamera' },
    el('h2', { testo: 'Usare la fotocamera?' }),
    el('p', { class: 'sopra', testo: 'Mirion la usa solo per leggere il codice a barre dell’alimento, qui sul telefono: niente foto salvate, niente immagini mandate. Si spegne appena letto il codice. Dopo il tuo sì, il telefono ti chiede il permesso.' }),
    el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'primario', onclick: avvia }, 'Sì, usa la fotocamera'), el('button', { type: 'button', class: 'secondario', onclick: chiudi }, 'No')))
  fondo.append(scatola); document.body.append(fondo)
  async function avvia () {
    try {
      flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      const video = el('video', { class: 'codice-video', playsinline: true, muted: true, autoplay: true }); video.srcObject = flusso
      scatola.replaceChildren(el('h2', { testo: 'Inquadra il codice a barre' }), video, el('button', { type: 'button', class: 'secondario', onclick: chiudi }, 'Chiudi'))
      const lettore = new window.BarcodeDetector({ formats: FORMATI })
      const guarda = async () => {
        if (!fondo.isConnected) return
        try { const t = await lettore.detect(video); if (t.length) { chiudi(); return cerca(t[0].rawValue) } } catch { }
        setTimeout(guarda, 250)
      }
      video.addEventListener('playing', guarda, { once: true })
    } catch (e) { chiudi(); notifica(e.name === 'NotAllowedError' ? 'Hai detto no alla fotocamera: va bene, scrivi le cifre o usa una foto.' : 'La fotocamera non parte: scrivi le cifre o usa una foto.', { tipo: 'sempre' }) }
  }
}
