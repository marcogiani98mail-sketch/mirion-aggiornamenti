// Le caselle sulla sinistra (le stanze) e quelle dei collegamenti in alto (gli strumenti), su misura (Marco, 20-11).
// Si trascinano sempre. Una stanza lasciata al centro di un'altra fa una cartella; su una cartella ci entra. La cartella
// si apre con un clic, a destra della barra: lì si cambia il nome e ⇱ tira fuori una stanza. Quali stanze si vedono, la barra
// stretta e la grandezza delle icone si scelgono nel pannello «Personalizza».
import { $, $$, el, api, STATO, notifica } from './base.js'
import { ic } from './icone.js'
import { MISURA, salva, ordinabile, nuovoId } from './su-misura.js'
import { dock } from './dock.js'
import { applica as applicaColori } from './colori.js'
import { applica as applicaLogo } from './logo.js'

const S = () => MISURA.d.stanze
const cartella = id => S().cartelle.find(c => c.id === id)
// le icone delle stanze: Phosphor duotone (icone.js), al posto dei disegni a linea di index.html
const ICONE_STANZE = { scrivania: 'desktop', scadute: 'check-square', lavoro: 'briefcase', lavagne: 'pencil-simple-line', cerca: 'magnifying-glass', notizie: 'book-open-text', diario: 'notebook', calendario: 'calendar-dots', conti: 'briefcase', impostazioni: 'gear-six' }

// una volta sola, all'avvio: i contenitori restano, cambiano i figli
export function preparaBarre () {
  const stanze = $('[data-stanze]'), strumenti = $('[data-dock]')
  for (const a of $$('a[data-stanza]', stanze)) { a.dataset.id = a.dataset.stanza; a.draggable = false }
  for (const a of $$('a', stanze)) { const nome = ICONE_STANZE[a.dataset.stanza ?? a.getAttribute('href').slice(1)]; if (nome) a.querySelector('svg')?.replaceWith(ic(nome, { duo: true })) }
  ordinabile(stanze, {
    asse: 'verticale', fatto: ids => { S().ordine = ids; salva() },
    puoUnire: (a, b) => !a.dataset.id.startsWith('cartella-') && a.dataset.id !== 'scrivania' && b.dataset.id !== 'scrivania',
    unisci: (a, b) => { unisci(a, b); salva({ subito: true }) },
  })
  ordinabile(strumenti, { asse: 'orizzontale', fatto: ordinaStrumenti })
  strumenti.addEventListener('dragstart', e => e.preventDefault())
  addEventListener('su-misura', disegnaBarre)
  addEventListener('click', e => { if (!e.target.closest('.cartella-stanze')) chiudiCartelle() })
  addEventListener('hashchange', chiudiCartelle)
  disegnaBarre()
}

// la stanza a lasciata su b: se b è una cartella ci entra, se è una stanza fanno una cartella nuova al posto di b
function unisci (a, b) {
  const s = S()
  s.ordine = s.ordine.filter(x => x !== a)
  if (cartella(b)) { cartella(b).figli.push(a); return }
  const id = nuovoId('cartella')
  s.cartelle.push({ id, nome: 'Cartella', figli: [b, a] })
  s.ordine = s.ordine.map(x => x === b ? id : x)
  aperta = id
}

let aperta = null
const chiudiCartelle = () => { if (aperta) { aperta = null; for (const c of $$('.cartella-stanze')) c.classList.remove('aperta') } }

export function disegnaBarre () {
  const d = MISURA.d
  if (!d) return
  const nav = $('[data-stanze]'), fondo = $('.in-fondo', nav), stanza = id => $(`a[data-stanza="${id}"]`, nav)
  for (const a of $$('a[data-stanza]', nav)) { a.hidden = d.stanze.nascoste.includes(a.dataset.stanza); $('.fuori', a)?.remove(); fondo.before(a) } // tutte fuori, poi si rimettono
  $$('.cartella-stanze', nav).forEach(c => c.remove())
  for (const id of d.stanze.ordine) {
    if (!id.startsWith('cartella-')) { const a = stanza(id); if (a) fondo.before(a); continue }
    const c = cartella(id)
    const volo = el('div', { class: 'cartella-volo', role: 'group', 'aria-label': c.nome },
      el('input', { class: 'nome-cartella', value: c.nome, 'aria-label': 'Nome della cartella', onchange: e => { c.nome = e.target.value.trim() || 'Cartella'; salva({ subito: true }) } }))
    for (const f of c.figli) {
      const a = stanza(f); if (!a) continue
      a.append(el('button', { type: 'button', class: 'fuori', title: 'Tira fuori dalla cartella', 'aria-label': `Tira fuori ${a.textContent.trim()} dalla cartella`,
        onclick: e => { e.preventDefault(); e.stopPropagation(); c.figli = c.figli.filter(x => x !== f); S().ordine.splice(S().ordine.indexOf(id) + 1, 0, f); salva({ subito: true }) } }, ic('arrow-square-out')))
      volo.append(a)
    }
    const apri = el('button', { type: 'button', class: 'cartella-apri', 'aria-expanded': String(aperta === id), title: c.nome,
      onclick: e => { e.stopPropagation(); aperta = aperta === id ? null : id; box.classList.toggle('aperta', aperta === id); apri.setAttribute('aria-expanded', String(aperta === id)) } })
    apri.append(ic('folder-simple', { duo: true }))
    apri.append(el('span', { testo: c.nome }))
    const box = el('div', { class: 'cartella-stanze' + (aperta === id ? ' aperta' : ''), 'data-id': id }, apri, volo)
    fondo.before(box)
  }
  const software = $('.voci-prodotti', nav); if (software) fondo.before(software) // i software restano sotto le stanze (prodotto.js)
  document.body.dataset.tema = d.tema ?? 'aurora' // il tema (su-misura.css)
  document.body.dataset.stile = d.stile ?? 'classica' // Classica, Carta, Netto o Spazio (stili.css, Marco 23-11 e 25-11)
  if (d.stile === 'spazio') import('./spazio.js').then(m => m.accendiStelle()).catch(() => {}) // le stelle che si muovono (spazio.js)
  applicaColori({ tema: d.tema, colori: d.colori, stile: d.stile }) // le sfumature di Aurora, scelte in Personalizza (colori.js)
  applicaLogo(d.logo) // il logo e il nome in alto, e l'icona della finestra (logo.js)
  document.body.classList.toggle('barra-stretta', d.stanze.strette)
  for (const g of ['piccola', 'media', 'grande']) document.body.classList.toggle('strumenti-' + g, d.strumenti === g)
}

// l'ordine degli strumenti è l'ordine degli accessi del preset: quelli in alto prima, poi tutti gli altri come erano
export async function ordinaStrumenti (ids) {
  const tutti = STATO.preset?.attivo?.accessi?.map(a => a.id) ?? []
  try {
    await api('/api/preset/cambia', { azione: 'ordina', ordine: [...ids, ...tutti.filter(id => !ids.includes(id))] })
    STATO.preset = await api('/api/preset'); dock()
    dispatchEvent(new CustomEvent('preset-cambiato'))
  } catch (e) { notifica(e.message, { tipo: 'sempre' }); dock() }
}
