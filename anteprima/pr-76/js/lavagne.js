// La lavagna: un foglio solo, dove si disegna (Excalidraw, licenza MIT, con le librerie di icone, post-it, persone, Gantt…).
// Il gesto principale è «Invia a Claude»: il disegno diventa un'immagine nel vault (Lavagne/), va negli appunti,
// e si apre Claude con la richiesta scritta; tu incolli (Ctrl+V) e premi invio. Claude fa il resto nel cervello.
// Le lavagne vecchie e le tele di Obsidian restano nel vault, dove sono: qui non si mostrano (Marco, 19-11).
import { el, api, notifica, oggiISO } from './base.js'
import { conIA, pulsantiIA } from './ia.js'
import { pulsantiSalva } from './lavagna-salva.js'
import { ic } from './icone.js'

const X = window.ExcalidrawLib, FOGLIO = 'La lavagna'
let excal = null, radice = null, versione = -1, timer = null, salvato = null, chiave = 0
// la lavagna aperta (Marco, 24-11 sera: il link che riapre una lavagna salvata): di solito il foglio di sempre; con
// #lavagne?apri=<nome> (il link mirion://lavagna/<nome>, o «Le salvate») una lavagna salvata, che si modifica e si salva lì
let foglio = FOGLIO, libreria = [], titolo = null, torna = null, pendente = null
const somma = els => els.reduce((n, e) => n + e.version, 0)
const segnaFoglio = () => { if (titolo) titolo.textContent = foglio === FOGLIO ? 'Lavagna' : 'Lavagna · ' + foglio; if (torna) torna.hidden = foglio === FOGLIO }

export async function mostra (stanza, parametri) {
  if (!X) return stanza.replaceChildren(el('p', { class: 'vuoto grande', testo: 'La lavagna non si è caricata (manca Excalidraw).' }))
  const apri = parametri?.get('apri')
  if (radice) { if (apri && apri !== foglio) await apriLavagna(apri); return }
  salvato = el('span', { class: 'sopra piccolo', 'aria-live': 'polite' })
  titolo = el('h1', { class: 'lavagna-titolo', testo: 'Lavagna' })
  torna = el('button', { type: 'button', class: 'quieto', hidden: true, title: 'La lavagna di sempre', onclick: () => { location.hash = 'lavagne'; apriLavagna(FOGLIO) } }, ic('arrow-left'), 'Torna al foglio')
  const tela = el('div', { class: 'tela' })
  stanza.replaceChildren(el('div', { class: 'lavagna-sola' },
    el('div', { class: 'lavagne-barra' },
      titolo, torna, salvato, el('span', { class: 'spazio' }),
      el('button', { type: 'button', class: 'quieto', testo: 'Foglio nuovo', title: 'Il foglio di adesso resta nel vault, in Lavagne/', onclick: nuovo }),
      // a schermo intero (Marco, 21-11): la lavagna su tutto lo schermo; Esc o lo stesso pulsante per tornare
      el('button', { type: 'button', class: 'quieto', title: 'Le lavagne salvate: un clic e si riaprono qui, da modificare', onclick: galleria }, ic('squares-four'), 'Le salvate'),
      el('button', { type: 'button', class: 'quieto', title: 'La lavagna su tutto lo schermo (Esc per uscire); dentro, lo zoom è in basso a sinistra o Ctrl + rotella', onclick: () => document.fullscreenElement ? document.exitFullscreen() : stanza.querySelector('.lavagna-sola')?.requestFullscreen().catch(() => {}) }, ic('corners-out'), 'Schermo intero'),
      ...pulsantiSalva({ vuota: () => !excal?.getSceneElements().length, nome: () => foglio === FOGLIO ? null : foglio, scena: () => X.serializeAsJSON(excal.getSceneElements(), excal.getAppState(), excal.getFiles(), 'local'), png: async () => {
        const blob = await immagine(); return new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob) })
      } }),
      ...pulsantiIA(ia => invia(ia), { testo: 'Invia a' })),
    tela))
  radice = ReactDOM.createRoot(tela)
  // la lavagna che non c'è ancora parte vuota; una che non si riesce a leggere NO: un foglio vuoto la sovrascriverebbe al primo
  // tratto (analisi del 23-11). Si dice perché e si può riprovare
  let errore = null
  // aperta da un link (apri): quella lavagna salvata; se non c'è più, il foglio di sempre
  let scena = null
  if (apri) { scena = await api('/api/disegno?d=' + encodeURIComponent(apri)).catch(() => null); if (scena) foglio = apri; else notifica(`La lavagna «${apri}» non c'è più: ecco il foglio di sempre.`, { tipo: 'sempre' }) }
  const [lib, sempre] = await Promise.all([api('/api/librerie').catch(() => []), scena ? null : api('/api/disegno?d=' + encodeURIComponent(FOGLIO)).catch(e => { if (!/ENOENT|no such file/i.test(e.message)) errore = e; return null })])
  libreria = lib
  if (errore) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Riprova' }); b.onclick = () => location.reload()
    tela.replaceChildren(Object.assign(document.createElement('p'), { className: 'vuoto', textContent: `Non riesco a leggere la lavagna (${errore.message}). Non la apro vuota, per non cancellarla. ` }), b)
    return
  }
  segnaFoglio()
  monta(scena ?? sempre, libreria)
}

// apre una lavagna salvata (o il foglio di sempre) nell'editor: prima si salva subito quello che era in attesa
async function apriLavagna (nome) {
  clearTimeout(timer); if (pendente) await pendente()
  let scena = null
  try { scena = await api('/api/disegno?d=' + encodeURIComponent(nome)) } catch (e) {
    if (nome !== FOGLIO || !/ENOENT|no such file/i.test(e.message)) return notifica(`Non riesco ad aprire «${nome}»: ${e.message}`, { tipo: 'sempre' })
  }
  foglio = nome; segnaFoglio(); monta(scena, libreria)
  if (nome !== FOGLIO) notifica(`«${nome}»: le modifiche si salvano lì.`)
}

function monta (scena, libreria) {
  versione = somma(scena?.elements ?? []); chiave++
  radice.render(React.createElement(X.Excalidraw, {
    key: chiave, theme: 'dark', langCode: 'it-IT',
    initialData: { elements: scena?.elements ?? [], files: scena?.files ?? {}, libraryItems: libreria, scrollToContent: true,
      appState: { ...(scena?.appState ?? {}), theme: 'dark', viewBackgroundColor: '#ffffff', gridSize: 20, collaborators: new Map() } },
    excalidrawAPI: a => { excal = a }, onChange: salvaPresto,
    UIOptions: { canvasActions: { loadScene: false, saveToActiveFile: false, export: { saveFileToDisk: true } } },
  }))
}

function salvaPresto (elementi, appState, files) {
  const v = somma(elementi); if (v === versione) return
  versione = v; salvato.textContent = 'modifiche…'
  clearTimeout(timer)
  // se il salvataggio non riesce si dice subito (prima restava «modifiche…» e il disegno si perdeva chiudendo Mirion)
  const quale = foglio // la lavagna di questo tratto: se nel frattempo se ne apre un'altra, si salva comunque qui
  pendente = async () => {
    pendente = null
    try { await api('/api/disegno', { nome: quale, scena: X.serializeAsJSON(elementi, appState, files, 'local') }); salvato.textContent = quale === FOGLIO ? 'salvata nel vault' : `salvata in «${quale}»` }
    catch (e) { salvato.textContent = 'NON salvata'; versione = null; notifica('La lavagna non si è salvata: ' + e.message + '. Non chiudere Mirion: riprovo al prossimo tratto.', { tipo: 'sempre', durata: 9000 }) }
  }
  timer = setTimeout(() => pendente?.(), 1000)
}

const immagine = () => X.exportToBlob({ elements: excal.getSceneElements(), files: excal.getFiles(), mimeType: 'image/png', maxWidthOrHeight: 1800, exportPadding: 24,
  appState: { ...excal.getAppState(), exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: false } })

// il disegno va nel vault come immagine, negli appunti, e Claude si apre con la richiesta scritta
async function invia (ia, modo) {
  if (!excal?.getSceneElements().length) return notifica('La lavagna è vuota: disegna qualcosa prima.', { tipo: 'sempre' })
  try {
    const blob = await immagine()
    const png = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob) })
    const nome = `Lavagna ${oggiISO()} ${new Date().toTimeString().slice(0, 8).replaceAll(':', '-')}`
    const r = await api('/api/disegno/png', { nome, png, scena: X.serializeAsJSON(excal.getSceneElements(), excal.getAppState(), excal.getFiles(), 'local') })
    let negliAppunti = false
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); negliAppunti = true } catch { }
    await conIA.lavagna(r.png, ia, modo)
    if (modo !== 'code' && !String(ia).startsWith('claude') && ia !== 'codex') notifica(negliAppunti ? 'Il disegno è negli appunti: Ctrl+V nella chat, poi invio.' : `Il disegno è salvato in ${r.png}: trascinalo nella chat.`, { tipo: 'sempre', durata: 9000 })
  } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}

// foglio nuovo: quello di adesso resta nel vault con la data, e si riparte da bianco
async function nuovo () {
  if (foglio !== FOGLIO) { location.hash = 'lavagne'; await apriLavagna(FOGLIO) } // da una lavagna salvata: prima si torna al foglio di sempre
  clearTimeout(timer); pendente = null // un salvataggio in attesa non deve riscrivere il foglio vecchio sopra quello nuovo
  const els = excal?.getSceneElements() ?? []
  try {
    // il nome con i secondi: due fogli nuovi nello stesso minuto non si sovrascrivono
    if (els.length) await api('/api/disegno', { nome: `Lavagna ${oggiISO()} ${new Date().toTimeString().slice(0, 8).replaceAll(':', '-')}`, scena: X.serializeAsJSON(els, excal.getAppState(), excal.getFiles(), 'local') })
    await api('/api/disegno', { nome: FOGLIO, scena: X.serializeAsJSON([], {}, {}, 'local') })
  } catch (e) { return notifica('Non riesco a cominciare un foglio nuovo: ' + e.message + '. Il disegno di adesso resta qui.', { tipo: 'sempre' }) }
  monta(null, libreria)
  notifica(els.length ? 'Il foglio di prima è nel vault, in Lavagne/. Questo è nuovo.' : 'Foglio nuovo.')
}

// le lavagne salvate (Marco, 23-11: «fammele vedere a schermo intero con zoom»; 24-11 sera: il link che le riapre): quelle in Lavagne/,
// dalla più nuova; un clic la riapre qui, da modificare, e «Copia il link» dà il mirion:// da incollare dove si vuole. Le immagini
// mandate a Claude o condivise con la squadra restano sotto, da guardare a schermo intero
const linkDi = n => 'mirion://lavagna/' + encodeURIComponent(n)
async function galleria () {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const griglia = el('div', { class: 'galleria-lavagne' }, el('p', { class: 'vuoto', testo: 'Cerco le lavagne salvate…' }))
  const immagini = el('div', { class: 'galleria-lavagne' })
  const chiudi = () => fondo.remove()
  fondo.append(el('aside', { class: 'cassetto galleria-cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Le lavagne salvate' },
    el('header', {}, el('h2', { testo: 'Le lavagne salvate' }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: chiudi }, ic('x'))),
    el('p', { class: 'sopra', testo: 'Un clic: la lavagna si riapre qui e la modifichi. «Copia il link» la riapre in Mirion da Obsidian o da dove lo incolli.' }), griglia, immagini))
  fondo.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.visore')) chiudi() })
  document.body.append(fondo)
  try {
    const [salvate, { lavagne }] = await Promise.all([api('/api/disegni'), api('/api/lavagne-salvate')])
    const mie = salvate.filter(g => g.nome !== FOGLIO), nomi = new Set(mie.map(g => g.nome))
    griglia.replaceChildren(...(mie.length ? mie.map(g => {
      const img = el('img', { alt: '', loading: 'lazy' }), segno = el('span', { class: 'galleria-segno', 'aria-hidden': 'true' }, ic('pencil-simple'))
      api('/api/immagine?rel=' + encodeURIComponent(`Lavagne/${g.nome}.png`)).then(r => { img.src = r.src; segno.remove() }).catch(() => img.remove())
      const copia = el('button', { type: 'button', class: 'quieto piccolo', onclick: async e => { e.stopPropagation(); try { await navigator.clipboard.writeText(linkDi(g.nome)); notifica('Il link è negli appunti: ' + linkDi(g.nome)) } catch { notifica(linkDi(g.nome), { tipo: 'sempre' }) } } }, ic('copy'), 'Copia il link')
      return el('div', { class: 'galleria-voce', role: 'button', tabindex: 0, title: 'Riapri e modifica', onclick: () => { chiudi(); location.hash = 'lavagne?apri=' + encodeURIComponent(g.nome) }, onkeydown: e => { if (e.key === 'Enter') e.currentTarget.click() } },
        img, segno, el('b', { testo: g.nome }), el('small', { class: 'sopra', testo: new Date(g.modificato).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }), copia)
    }) : [el('p', { class: 'vuoto', testo: 'Ancora nessuna lavagna salvata: «Salva» la mette qui, con il link che la riapre.' })]))
    // le immagini senza una lavagna da riaprire (mandate a Claude, condivise con la squadra): solo da guardare
    const sole = lavagne.filter(g => !(g.rel.startsWith('Lavagne/') && nomi.has(g.nome)))
    if (!sole.length) return
    const { apriImmagine } = await import('./visore.js')
    immagini.replaceChildren(el('h3', { class: 'sopra', testo: 'Le immagini (mandate a Claude o condivise), da guardare' }), ...sole.map(g => {
      const img = el('img', { alt: g.nome, loading: 'lazy' })
      api('/api/immagine?rel=' + encodeURIComponent(g.rel)).then(r => { img.src = r.src }).catch(() => img.replaceWith(el('span', { class: 'sopra', testo: 'non disponibile' })))
      return el('button', { type: 'button', class: 'galleria-voce', title: 'Apri a schermo intero', onclick: () => img.src && apriImmagine(img.src, g.nome) },
        img, el('b', { testo: g.nome }), el('small', { class: 'sopra', testo: g.dove }))
    }))
  } catch (e) { griglia.replaceChildren(el('p', { class: 'vuoto', testo: 'Non riesco a leggere le lavagne salvate: ' + e.message })) }
}
