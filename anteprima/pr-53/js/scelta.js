// La scelta all'avvio (server/prodotti.mjs): Mirion è la software house, e si entra o nel cervello di squadra (il workspace)
// o in un prodotto che si sta costruendo. Il workspace è il primo e ha già il fuoco: Invio o Esc e Mirion si apre come prima.
// La scheda di un prodotto apre il programma dentro Mirion (la stanza #gestionale, gestionali.js: lo accende, se serve, con i colori
// di Aurora), la versione online se c'è,
// e la cartella del progetto;
// la scelta resta aperta, così dopo si può entrare anche nel workspace. Si riapre da Ctrl+K («Prodotti»).
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

let esci = null // chiude la scelta ed entra in Mirion (per «Apri il programma»)

// ridà una promessa che si risolve quando si entra nel workspace
export function scelta (d, { dopo = false } = {}) {
  return new Promise(entra => {
    const fondo = el('div', { class: 'cassetto-fondo attivazione-fondo scelta-fondo' })
    const via = () => { removeEventListener('keydown', esc); fondo.remove(); esci = null; entra() }
    esci = via
    function esc (e) { if (e.key === 'Escape') via() }
    addEventListener('keydown', esc)
    const workspace = el('button', { type: 'button', class: 'scelta-carta scelta-workspace', onclick: via },
      el('span', { class: 'scelta-icona' }, ic('squares-four')),
      el('b', { testo: d.spazio.nome }),
      el('small', { testo: d.spazio.descrizione || 'Il cervello di squadra: postazioni, incarichi, diario, Cruscotto e le sessioni con l\'IA.' }),
      el('span', { class: 'scelta-vai' }, dopo ? 'Torna al workspace' : 'Entra', ic('arrow-right')))
    fondo.append(el('aside', { class: 'cassetto finestra-attivazione finestra-scelta', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Dove entri' },
      el('h2', { testo: 'Dove entri?' }),
      el('p', { class: 'sopra', testo: 'Mirion è la vostra software house: il workspace di squadra e i prodotti che state costruendo.' }),
      el('div', { class: 'scelta-gruppo' }, el('h3', { testo: 'Workspace' }), workspace),
      el('div', { class: 'scelta-gruppo' }, el('h3', { testo: d.prodotti.length === 1 ? 'Il prodotto' : 'I prodotti' }),
        el('div', { class: 'scelta-prodotti' }, d.prodotti.map(carta))),
      el('p', { class: 'scelta-nota', testo: 'Un prodotto nuovo si aggiunge nel cervello, in .delion/prodotti.json.' })))
    document.body.append(fondo)
    workspace.focus()
  })
}

function carta (p) {
  const stato = el('small', { class: 'scelta-stato' })
  const disegnaStato = () => {
    stato.replaceChildren(p.acceso ? el('i', { class: 'scelta-acceso', testo: `acceso su ${p.programma.indirizzo.replace(/^https?:\/\//, '').replace(/\/$/, '')}` })
      : p.programma && !p.programma.ce ? el('i', { testo: 'il programma non è ancora in questo cervello' }) : '')
    ferma.hidden = !p.nostro
  }
  const lavora = async (tasto, fai) => {
    tasto.disabled = true
    try { await fai() } catch (e) { notifica(e.message, { tipo: 'sempre', durata: 9000 }) }
    tasto.disabled = false
  }
  // il programma si apre dentro Mirion, nella sua stanza (gestionali.js), che lo accende se serve; «← Scrivania» torna indietro
  const apri = el('button', { type: 'button', class: 'primario', disabled: !p.programma?.ce && !p.online, onclick: () => {
    location.hash = 'gestionale?id=' + encodeURIComponent(p.id)
    if (esci) esci(); else dispatchEvent(new HashChangeEvent('hashchange')) // dalla scelta riaperta con Ctrl+K: la stanza si apre da sola
  } }, ic('arrow-right'), ' Apri il programma')
  const cartella = el('button', { type: 'button', class: 'secondario', disabled: !p.cartellaCe, title: p.cartellaCe ? p.cartella : 'la cartella non c\'è ancora', onclick: () => lavora(cartella, () => api('/api/prodotti/cartella', { id: p.id })) }, ic('folder-simple'), ' Cartella del progetto')
  const online = p.online && p.programma ? el('button', { type: 'button', class: 'secondario', title: p.online, onclick: () => lavora(online, async () => { const r = await api('/api/prodotti/apri', { id: p.id, dove: 'online' }); notifica(`«${p.nome}» online si apre nel browser: ${r.aperto}`, { durata: 6000 }) }) }, ic('arrow-up-right'), ' Online') : null
  const ferma = el('button', { type: 'button', class: 'quieto', hidden: true, onclick: () => lavora(ferma, async () => { await api('/api/prodotti/ferma', { id: p.id }); Object.assign(p, { acceso: false, nostro: false }); disegnaStato() }) }, 'Ferma')
  disegnaStato()
  return el('article', { class: 'scelta-carta scelta-prodotto' },
    el('span', { class: 'scelta-icona' }, ic('briefcase')),
    el('b', {}, p.nome, p.provvisorio ? el('em', { class: 'scelta-provvisorio', testo: 'nome provvisorio' }) : null),
    p.descrizione ? el('small', { testo: p.descrizione }) : null,
    p.per ? el('small', { class: 'scelta-per', testo: 'Per ' + p.per }) : null,
    stato,
    el('div', { class: 'scelta-tasti' }, apri, online, cartella, ferma))
}
