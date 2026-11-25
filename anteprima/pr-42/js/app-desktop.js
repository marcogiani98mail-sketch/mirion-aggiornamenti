// «Le app per il computer», in cima alla stanza Lavoro (Marco, 20-11: «tutte le app disponibili per desktop mettile sulla pagina
// dei download, così ce le hanno sul computer»): per i tuoi accessi che hanno un'app per Windows, se c'è già o il pulsante per
// installarla (winget, in silenzio). «Mostra tutte» apre l'elenco intero. Mentre una si installa, la pagina guarda ogni 3 secondi.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'
import { icona } from './dock.js'

let tutte = false

export function appDesktop () {
  const box = el('section', { class: 'pannello app-desktop' }, el('p', { class: 'vuoto', testo: 'Guardo quali app ci sono sul computer…' }))
  let giro = null
  const disegna = async () => {
    let d
    try { d = await api('/api/app-desktop' + (tutte ? '?tutte=1' : '')) } catch (e) { return box.replaceChildren(el('p', { class: 'vuoto', testo: e.message })) }
    const voce = a => el('li', { class: 'app-voce' + (a.presente ? ' ce' : '') }, icona({ id: a.chiave, nome: a.nome }),
      el('span', { class: 'app-nome' }, a.nome, el('small', { testo: a.presente ? 'sul computer' : a.inCorso === 'in corso' ? 'si installa…' : a.inCorso && a.inCorso !== 'finita' ? a.inCorso : a.presente === null ? 'non so se c\'è' : 'non c\'è ancora' })),
      a.presente ? el('span', { class: 'app-ok', 'aria-label': 'c\'è' }, ic('check-circle')) : el('button', { type: 'button', class: 'secondario piccolo', title: 'Si apre la sua pagina ufficiale (o lo Store): l\'installazione la fai tu, lì',
        onclick: () => { window.open(a.sito, '_blank', 'noopener'); notifica(`Si apre la pagina di ${a.nome}: installala da lì, poi torna qui.`) } }, ic('arrow-square-out'), 'Scaricala'))
    box.replaceChildren(
      el('header', { class: 'app-testa' }, el('div', {}, el('h2', { testo: 'Le app per il computer' }), el('p', { class: 'sopra piccolo', testo: tutte ? `Tutte le ${d.app.length} app, con la loro pagina di download.` : 'Quelle dei tuoi accessi che hanno un\'app per Windows.' })),
        el('button', { type: 'button', class: 'quieto', testo: tutte ? 'Solo le mie' : `Mostra tutte (${d.tutte})`, onclick: () => { tutte = !tutte; disegna() } })),
      d.app.length ? el('ul', { class: 'app-elenco' }, ...d.app.map(voce)) : el('p', { class: 'vuoto', testo: 'Nessuno dei tuoi accessi ha un\'app per il computer: guarda «Mostra tutte».' }))
    clearTimeout(giro)
    if (d.app.some(a => a.inCorso === 'in corso') && box.isConnected) giro = setTimeout(disegna, 3000)
  }
  disegna()
  return box
}
