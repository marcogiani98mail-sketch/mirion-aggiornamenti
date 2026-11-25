// Mirion Trainer (Marco, 24-11-2026 sera: «saranno divise in due: ci sarà Mirion Trainer e Mirion Fit… Mirion Trainer sarà il
// gestionale dove oltre la visualizzazione di Mirion Fit ci sarà la disponibilità di usare una analisi tramite Claude del cliente»).
// Mirion Trainer è il programma del personal trainer: i suoi clienti (che invita con il QR), la loro analisi con Claude e, per il
// titolare, la palestra. Mirion Fit è l'app del cliente: nella barra resta un software a parte (la scrivania del diario, prodotto.js).
// Ogni trainer ha il suo Mirion Trainer e i suoi clienti: il QR di un trainer lega il cliente solo a lui (Piatto online, nucleo.mjs).
import { el, api, $$ } from './base.js'
import { ic } from './icone.js'

export const NOME = 'Mirion Trainer'

let titolare = null
// è il titolare della palestra? (lo dice la dashboard dei clienti: chi la apre lo passa, se no si chiede una volta)
export const eTitolare = (d) => {
  if (d) titolare = Promise.resolve(Boolean(d.online?.io?.titolare))
  return titolare ??= api('/api/clienti').then(x => Boolean(x.online?.io?.titolare)).catch(() => false)
}

// la voce della barra a sinistra, sotto «Software»
export const voceTrainer = () => el('a', { href: '#clienti', 'data-prodotto': 'trainer', title: 'Mirion Trainer: i tuoi clienti, la loro analisi con Claude e la palestra' },
  // l'icona di Mirion Trainer (build/icone-fit.mjs, 24-11: la casella di Mirion con la M e un manubrio)
  el('span', { class: 'voce-iniziale voce-icona', 'aria-hidden': 'true' }, el('img', { src: './mirion-trainer.svg', alt: '' })), el('span', { testo: NOME }))

// si accende su tutte le pagine di Mirion Trainer (i clienti, un cliente, la palestra)
export function accendiVoce () {
  for (const a of $$('[data-prodotto]')) { if (a.dataset.prodotto === 'trainer') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current') }
}

// le schede in cima: «I tuoi clienti» e «La palestra»; ci sono solo per il titolare (un trainer ha soltanto i suoi clienti)
export function schedeTrainer (attiva) {
  const scheda = (quale, href, icona, testo) => el('a', { href, class: attiva === quale ? 'attiva' : '', 'aria-current': attiva === quale ? 'page' : null, 'data-scheda': quale }, ic(icona, { duo: true }), testo)
  const nav = el('nav', { class: 'schede-fit', 'aria-label': NOME, hidden: attiva !== 'palestra' },
    scheda('clienti', '#clienti', 'user-plus', 'I tuoi clienti'), scheda('palestra', '#clienti?vista=palestra', 'users-three', 'La palestra'))
  eTitolare().then(si => { if (si) nav.hidden = false })
  return nav
}
