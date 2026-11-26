// Le aree di lavoro (Marco, 20-11: «se una persona vuole un'altra area di lavoro fai selezionare la cartella, imposti il
// collegamento con Obsidian e con l'area di Claude… stessa cosa per quelle esistenti»). In alto, accanto al marchio, il nome
// dell'area: un clic (o il tasto destro) apre il menu per cambiarla, crearne una nuova, impostarla. Cambiare area ricarica
// Delion su quella cartella, come riaprirla; un'area mai letta parte con il primo sguardo.
import { $, el, api, notifica } from './base.js'
import { fermaCartella, boxCartella } from './cartella.js'
import { ic } from './icone.js'
import { apriMenu } from './menu.js'

let D = null
export const carica = async () => { try { D = await api('/api/aree') } catch { D = null } return D }
export const attiva = () => D?.aree.find(a => a.id === D.attiva)

// personale o di gruppo (Marco, 21-11: «dividi l'area di lavoro personale da quella di gruppo, così che si differenziano»):
// la personale ha la casa e il viola, quella di gruppo (la squadra su GitHub) le persone e il verde
const diGruppo = x => x?.tipo === 'squadra'
const icona = x => diGruppo(x) ? 'users-three' : 'house'

export function pulsanteArea () {
  const a = attiva(), g = diGruppo(a)
  const b = el('button', { type: 'button', class: 'area-attiva' + (g ? ' di-gruppo' : ''), 'data-area': '', 'aria-haspopup': 'menu', title: (g ? 'Area di gruppo' : 'Area personale') + ': cambia, aggiungi, imposta' },
    ic(icona(a)), el('span', { testo: a?.nome ?? 'Area di lavoro' }), el('b', { testo: g ? 'gruppo' : 'personale' }), ic('caret-down'))
  const apri = e => { e?.preventDefault(); const r = b.getBoundingClientRect(); apriMenu(r.left, r.bottom + 6, menuAree(), 'Aree di lavoro') }
  b.addEventListener('click', apri); b.addEventListener('contextmenu', apri)
  ;($('.versione-attuale') ?? $('.marchio')).after(b) // dopo il numero della versione, se c'è
}

export function menuAree () {
  const a = attiva(), aree = D?.aree ?? []
  const voce = x => ({ testo: x.nome, ico: icona(x), scelta: x.id === D.attiva, spenta: !x.esiste, fai: () => x.id === D.attiva || passa(x.id) })
  const gruppo = aree.filter(diGruppo)
  return [
    { etichetta: 'Personali' }, ...aree.filter(x => !diGruppo(x)).map(voce),
    { etichetta: 'Di gruppo' }, ...(gruppo.length ? gruppo.map(voce) : [{ testo: 'Collega un\'area di gruppo…', ico: 'users-three', fai: () => { location.hash = 'scrivania?sezione=squadra' } }]),
    '-',
    { testo: 'Nuova area personale…', segno: '+', fai: () => finestra(null) },
    gruppo.length && { testo: 'Collega un\'altra area di gruppo…', ico: 'user-plus', fai: () => { location.hash = 'scrivania?sezione=squadra' } },
    a && { testo: `Impostazioni di «${a.nome}»…`, segno: '✎', fai: () => finestra(a) },
    D?.aree.length > 1 && { testo: 'Togli un\'area di lavoro…', segno: '−', fai: () => toglierne() },
  ]
}

export async function passa (id) {
  try { await api('/api/aree/scegli', { id }); location.hash = 'scrivania'; location.reload() } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}

// la finestra di un'area: nome, cartella (scelta con la finestra di Windows nell'app, scritta a mano nel browser),
// il collegamento con Obsidian, Claude che si apre lì; per un'area che c'è già, rileggere e togliere dall'elenco
export function finestra (a) {
  const nuova = !a, fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) chiudi() } })
  const chiudi = () => fondo.remove()
  const nome = el('input', { value: a?.nome ?? '', placeholder: 'Es. Clienti, Studio, Casa', 'aria-label': 'Nome dell\'area', maxlength: 40 })
  const cartella = el('input', { value: a?.cartella ?? '', placeholder: 'C:\\Users\\…\\La mia cartella', 'aria-label': 'Cartella dell\'area', class: 'cartella-area' })
  const scegli = window.delionApp?.scegliCartella && el('button', { type: 'button', class: 'secondario', testo: 'Scegli…', onclick: async () => { const c = await window.delionApp.scegliCartella('La cartella dell\'area di lavoro'); if (c) { cartella.value = c; if (!nome.value) nome.value = c.split(/[\\/]/).pop() } } })
  const esitoCartella = boxCartella() // il problema della cartella, o «la creo?» (cartella.js)
  // una cartella nuova la fa Mirion, in Documenti\Delion\<nome>; oppure se ne sceglie una che c'è (Marco, 24-11)
  let modo = nuova ? 'nuova' : 'esistente'
  const dove = el('p', { class: 'sopra piccolo dove-cartella' })
  const scriviDove = () => { dove.textContent = `Mirion crea la cartella in Documenti\\Delion\\${nome.value.trim() || '…'} e ci mette il cervello: le regole per Claude, le cartelle, i modelli, Obsidian già impostato.` }
  nome.addEventListener('input', scriviDove); scriviDove()
  const rigaCartella = el('label', {}, el('span', { testo: 'Cartella' }), el('span', { class: 'riga-cartella' }, cartella, scegli))
  const cambiaModo = m => { modo = m; rigaCartella.hidden = m === 'nuova'; dove.hidden = m !== 'nuova'; esitoCartella.hidden = m === 'nuova' }
  const sceltaModo = nuova && el('div', { class: 'scelta-modo', role: 'radiogroup', 'aria-label': 'Quale cartella' },
    ...[['nuova', 'Una cartella nuova'], ['esistente', 'Una cartella che c\'è già']].map(([v, t]) => el('label', { class: 'scelta-modo-voce' },
      el('input', { type: 'radio', name: 'modo-area', value: v, checked: v === modo, onchange: () => cambiaModo(v) }), el('span', { testo: t }))))
  const apri = el('input', { type: 'checkbox', checked: true })
  if (nuova) cambiaModo(modo); else dove.hidden = true
  const salva = async (e, crea = false) => {
    e?.preventDefault?.()
    if (modo === 'nuova' && !nome.value.trim()) return notifica('Scrivi il nome: diventa anche il nome della cartella.', { tipo: 'sempre' })
    if (modo !== 'nuova' && !cartella.value.trim()) return notifica('Scegli la cartella dell\'area.', { tipo: 'sempre' })
    const riprova = c => salva(null, c)
    try {
      if (nuova) {
        const r = await api('/api/aree/nuova', modo === 'nuova' ? { nome: nome.value, nuovaCartella: true, apriObsidian: apri.checked } : { nome: nome.value, cartella: cartella.value, crea, apriObsidian: apri.checked })
        if (fermaCartella(r, { box: esitoCartella, campo: cartella, riprova })) return
        const cervello = r.esistente ? (r.installati?.length ? `, con le funzioni del cervello che mancavano (${r.installati.length})` : '') : ', con il cervello pronto'
        notifica(`Area «${r.area.nome}» pronta in ${r.area.cartella}${cervello}${r.obsidian.collegata ? ', collegata a Obsidian' : ''}${r.aperta ? ' e aperta in Obsidian' : ''}. Mirion si riapre lì.`, { tipo: 'sempre', durata: 9000 })
      } else {
        const r = await api('/api/aree/cambia', { id: a.id, nome: nome.value, cartella: cartella.value !== a.cartella ? cartella.value : undefined, crea })
        if (fermaCartella(r, { box: esitoCartella, campo: cartella, riprova })) return
        notifica('Area salvata.')
      }
      chiudi(); setTimeout(() => { location.hash = 'scrivania'; location.reload() }, 600)
    } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  }
  let conferma = false
  const togli = !nuova && D.aree.length > 1 && el('button', { type: 'button', class: 'quieto pericolo', testo: 'Togli dall\'elenco', title: 'La cartella e le note restano dove sono', onclick: async e => {
    if (!conferma) { conferma = true; e.target.textContent = 'Sì, toglila (la cartella resta)'; return }
    try { await togliArea(a); chiudi() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  } })
  fondo.append(el('aside', { class: 'cassetto finestra-area', role: 'dialog', 'aria-modal': 'true', 'aria-label': nuova ? 'Nuova area di lavoro' : `L'area ${a.nome}` },
    el('header', {}, el('div', {}, el('h2', { testo: nuova ? 'Nuova area di lavoro' : `L'area «${a.nome}»` }),
      el('p', { class: 'sopra', testo: 'Un\'area è una cartella: Mirion la legge come un vault di Obsidian, con le sue scrivanie, e Claude ci lavora dentro.' })),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: chiudi }, ic('x'))),
    el('form', { class: 'campi-area', onsubmit: salva },
      el('label', {}, el('span', { testo: 'Nome' }), nome),
      sceltaModo, dove, rigaCartella, esitoCartella,
      el('ul', { class: 'collegamenti-area' },
        el('li', {}, el('b', { testo: 'Obsidian' }), el('span', { testo: nuova ? 'la cartella entra nella lista dei vault di Obsidian' : a.collegata ? '✓ collegata: «Apri in Obsidian» trova le note' : 'non ancora nella lista dei vault' }),
          !nuova && el('button', { type: 'button', class: 'secondario piccolo', testo: a.collegata ? 'Apri in Obsidian' : 'Collega e apri', onclick: async () => { const r = await api('/api/aree/collega', { id: a.id, apri: true }).catch(err => ({ errore: err.message })); notifica(r.collegata || a.collegata ? `Collegata a Obsidian${r.installati?.length ? ` (aggiunte le funzioni del cervello che mancavano: ${r.installati.length})` : ''}. Se Obsidian era già aperto e non la vedi, riaprilo.` : r.errore ?? 'Obsidian non è su questo computer.', { tipo: 'sempre' }) } })),
        nuova && el('li', {}, el('b', { testo: 'Apri' }), el('label', { class: 'scelta-spunta' }, apri, el('span', { testo: 'apri la cartella in Obsidian appena è pronta' }))),
        el('li', {}, el('b', { testo: 'Claude' }), el('span', { testo: 'Claude si apre in questa cartella. In una cartella nuova Mirion mette il cervello intero (CLAUDE.md e le regole per le altre IA, le cartelle, i modelli); in una che ha già delle note aggiunge solo quello che manca, senza toccare niente' })),
        el('li', {}, el('b', { testo: 'Mirion' }), el('span', { testo: nuova ? 'la prima volta legge tutto (il primo sguardo) e parte con una scrivania sua' : 'scrivanie, cartelle e barra di quest\'area restano sue' }))),
      el('div', { class: 'bottoni piede-pannello' }, togli || el('span'), el('button', { class: 'primario', testo: nuova ? 'Crea e apri l\'area' : 'Salva' })))))
  document.body.append(fondo)
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { chiudi(); removeEventListener('keydown', esc) } })
  nome.focus()
}

// togliere un'area: la cartella resta; se era quella in uso, Delion si riapre sulla prima delle altre
async function togliArea (a) {
  const r = await api('/api/aree/togli', { id: a.id })
  if (r.passata) { notifica(`«${a.nome}» tolta dall'elenco; la cartella è rimasta. Mirion si riapre su «${r.passata.nome}».`, { tipo: 'sempre' }); setTimeout(() => { location.hash = 'scrivania'; location.reload() }, 900); return r }
  await carica(); notifica(`«${a.nome}» tolta dall'elenco; la cartella è rimasta.`); $('[data-area]')?.remove(); pulsanteArea(); return r
}

// la finestra «Togli un'area di lavoro»: le personali e quelle di gruppo, ognuna con il suo tasto; al primo clic chiede conferma
function toglierne () {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const riga = x => {
    let sicuro = false
    return el('li', { class: diGruppo(x) ? 'di-gruppo' : '' }, el('b', {}, ic(icona(x)), ' ', x.nome + (x.id === D.attiva ? ' (in uso)' : '')), el('span', { class: 'sopra', testo: x.cartella }),
      D.aree.length > 1 ? el('button', { type: 'button', class: 'quieto pericolo', testo: 'Togli', 'aria-label': `Togli ${x.nome}`, onclick: async e => {
        if (!sicuro) { sicuro = true; e.currentTarget.textContent = 'Sì, toglila'; return }
        try { const r = await togliArea(x); if (!r.passata) corpo.replaceChildren(elenco()) } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
      } }) : el('span', { class: 'sopra', testo: 'è l\'unica' }))
  }
  const parte = (titolo, lista) => lista.length ? [el('h3', { class: 'aree-titolo', testo: titolo }), el('ul', { class: 'collegamenti-area aree-da-togliere' }, ...lista.map(riga))] : []
  const elenco = () => el('div', {}, ...parte('Personali', D.aree.filter(x => !diGruppo(x))), ...parte('Di gruppo', D.aree.filter(diGruppo)))
  const corpo = el('div', {}, elenco())
  fondo.append(el('aside', { class: 'cassetto finestra-area', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Togli un\'area di lavoro' },
    el('header', {}, el('div', {}, el('h2', { testo: 'Togli un\'area di lavoro' }),
      el('p', { class: 'sopra', testo: 'L\'area esce dall\'elenco di Mirion; la cartella e le note restano dove sono. Se togli quella in uso, Mirion passa alla prima delle altre.' })),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))), corpo))
  document.body.append(fondo)
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { fondo.remove(); removeEventListener('keydown', esc) } })
  fondo.querySelector('button.pericolo')?.focus()
}
