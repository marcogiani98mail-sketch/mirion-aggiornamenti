// Le app nella Squadra, solo per Marco (26-11-2026: «dall'app non è condivisibile l'app né per Fit né per Trainer… i QR glieli mando
// io… fammi sulla mia dashboard una cosa come gli accessi con Mirion e mettimeli in Squadra, visualizzabili solo a me, dove li posso
// togliere e mettere, così le informazioni, in caso venissero perse, le salvo»). Qui: chi ha Mirion Trainer (sospendi, riattiva,
// togli), la licenza per un trainer nuovo, il QR di Mirion Fit, e le licenze già date, salvate su questo computer per rimandarle.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'
import { trainerRiga, aggiungiTrainer, qrApp } from './clienti.js'

const giorno = iso => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

export async function accessiApp (rifai) {
  const fai = async (corpo, detto) => { try { const r = await api('/api/clienti', corpo); if (detto) notifica(detto); return r } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  const [c, ar] = await Promise.all([api('/api/clienti').catch(() => ({})), fai({ azione: 'licenze-date' })])
  if (!ar?.marco) return null // solo sulla Mirion di Marco: le licenze le firma lui
  const tutti = c.online?.trainer ?? [], lista = tutti.filter(t => !t.tolto), tolti = tutti.filter(t => t.tolto)
  const copia = async (testo, detto) => { try { await navigator.clipboard.writeText(testo); notifica(detto) } catch { notifica('Non riesco a copiare: seleziona il testo e copialo.', { tipo: 'sempre' }) } }

  // la licenza per un trainer nuovo, qui nella card: lui ti manda il codice trainer che vede nella sua Mirion
  const codice = el('input', { placeholder: 'Il codice trainer (43 caratteri)', 'aria-label': 'Il codice del trainer', required: true })
  const nome = el('input', { placeholder: 'Il nome del trainer', maxlength: 60, 'aria-label': 'Il nome del trainer', required: true })
  const scade = el('input', { type: 'date', 'aria-label': 'Vale fino al (vuoto: per sempre)', title: 'Vale fino al (vuoto: per sempre)' })
  const nuova = el('form', { class: 'app-licenza', onsubmit: async e => {
    e.preventDefault()
    const r = await fai({ azione: 'licenza-fit-per', codice: codice.value, nome: nome.value, scade: scade.value })
    if (r?.licenza) { await copia(r.licenza, `Licenza per ${nome.value.trim()} copiata e salvata qui: mandagliela.`); rifai() }
  } }, codice, nome, scade, el('button', { type: 'submit', class: 'primario piccolo' }, ic('user-plus'), 'Fai la licenza'))

  const date = (ar.date ?? []).map(x => {
    const togli = el('button', { type: 'button', class: 'quieto piccolo', testo: 'Togli dalla lista' })
    togli.onclick = async () => { if (!togli.dataset.sicuro) { togli.dataset.sicuro = '1'; togli.textContent = 'Sicuro? Premi ancora'; return } if (await fai({ azione: 'licenza-data-togli', quando: x.quando })) rifai() }
    return el('li', {}, el('b', { testo: x.nome || 'Senza nome' }),
      el('small', { class: 'sopra', testo: `data il ${giorno(x.quando)} · ${x.scade ? 'vale fino al ' + giorno(x.scade) : 'senza scadenza'}` }),
      el('span', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario piccolo', onclick: () => copia(x.licenza, `Licenza di ${x.nome} copiata: rimandagliela.`) }, ic('copy'), 'Copia la licenza'), togli))
  })

  return el('div', { class: 'accessi-app' },
    el('p', { class: 'sopra piccolo', testo: 'Le vedi solo tu. Né Mirion Fit né Mirion Trainer si passano da un telefono all’altro: le licenze e i QR li mandi tu, e qui restano salvati per rimandarli.' }),
    el('h3', { testo: 'Mirion Trainer: chi ce l’ha' }),
    el('ul', { class: 'trainer-lista' }, ...lista.map(t => trainerRiga(t, fai, rifai))),
    lista.length ? null : el('p', { class: 'vuoto', testo: 'Ancora nessun personal trainer collegato.' }),
    tolti.length ? el('details', {}, el('summary', { testo: `Tolti (${tolti.length})` }), el('ul', { class: 'trainer-lista' }, ...tolti.map(t => trainerRiga(t, fai, rifai)))) : null,
    el('h3', { testo: 'Dai Mirion Trainer a un trainer' }), nuova,
    el('details', {}, el('summary', { testo: 'Senza licenza: con una chiave' }), aggiungiTrainer(fai, rifai)),
    el('h3', { testo: 'Mirion Fit per un cliente' }),
    el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario', onclick: () => qrApp(fai) }, ic('device-mobile'), 'Il QR di Mirion Fit')),
    el('h3', { testo: `Le licenze date${date.length ? ` (${date.length})` : ''}` }),
    date.length ? el('ul', { class: 'trainer-lista licenze-date' }, ...date) : el('p', { class: 'vuoto', testo: 'Nessuna licenza ancora: quelle che fai da qui restano salvate in questa lista.' }))
}
