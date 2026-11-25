// Il pannello «Personalizza» (Marco, 20-11: «dargli la possibilità di aggiungerle o toglierle in base a come si lavora» ·
// «una sezione diario… devo avere la scelta sia di metterle nella casella di sinistra… che metterle in scrivania»):
// ogni sezione (Task, Lavoro, Lavagne, Cerca, Diario) ha due interruttori, a sinistra e sulla scrivania;
// poi le caselle che stanno solo sulla scrivania, la barra stretta, la grandezza delle icone.
// Spostare e fare cartelle non sta qui: si trascina direttamente.
import { $$, el, STATO, notifica } from './base.js'
import { ic } from './icone.js'
import { MISURA, salva, rimettiComEra, scrivania } from './su-misura.js'
import { TITOLI, segno } from './riquadri.js'
import { COSA } from './libreria.js'
import { miniatura, mappa } from './anteprime.js'
import * as aree from './aree.js'
import { mie, predefinita } from './ia.js'
import { SFUMATURE, DI_BASE, STILI, hex, numeri, applica as applicaColori } from './colori.js'
import { LOGHI, COPPIE, DI_BASE as LOGO_BASE, svg as disegnoLogo, applica as applicaLogo, rimpicciolisci } from './logo.js'

// le aree di lavoro: ognuna una cartella; «Passa qui» riapre Delion su quella, ✎ ne cambia nome e cartella
function areeNelPannello (chiudi) {
  const d = aree.attiva() ? aree : null, a0 = aree.attiva()
  return el('div', {},
    el('ul', { class: 'aree-pannello' }, ...(d ? aree.menuAree().filter(v => v && v !== '-' && v.scelta != null) : []).map(v => {
      const voce = v
      return el('li', { class: voce.scelta ? 'attiva' : '' }, el('b', { testo: voce.testo + (voce.scelta ? ' · questa' : '') }), el('small', { testo: voce.spenta ? 'la cartella non c\'è più' : '' }),
        el('span', { class: 'bottoni' }, !voce.scelta && el('button', { type: 'button', class: 'secondario piccolo', disabled: voce.spenta, testo: 'Passa qui', onclick: () => { chiudi(); voce.fai() } })))
    })),
    el('div', { class: 'bottoni', style: { marginTop: '.5rem' } },
      el('button', { type: 'button', class: 'secondario piccolo', onclick: () => { chiudi(); aree.finestra(null) } }, ic('plus'), 'Nuova area di lavoro'),
      a0 && el('button', { type: 'button', class: 'quieto', testo: `Impostazioni di «${a0.nome}»`, onclick: () => { chiudi(); aree.finestra(a0) } })))
}

const GRANDEZZE = { piccola: 'Piccole', media: 'Medie', grande: 'Grandi' }
// i colori di Aurora (Marco, 22-11-2026: «mettilo con tutte le sfumature di colore… che un po' sceglierle… e falle più trasparenti
// le caselle»): le sfumature pronte (colori.js), poi i ritocchi fini. Si vede subito; si salva nella disposizione, come il resto
function coloriDiAurora (d) {
  const k = numeri(d), ritocca = (chiave, v) => { d.colori = { ...(d.colori ?? {}), [chiave]: v }; applicaColori(d); salva() }
  const cursore = (chiave, testo, min, max, valore, fmt, tono) => {
    const out = el('output', { testo: fmt(valore) }), r = el('input', { type: 'range', min, max, value: valore, 'aria-label': testo })
    const pieno = () => r.style.setProperty('--pieno', ((r.value - min) / (max - min) * 100) + '%'); pieno()
    r.addEventListener('input', () => { out.textContent = fmt(+r.value); pieno(); ritocca(chiave, +r.value) })
    return el('label', { class: 'sfumatura' + (tono ? ' tono' : '') }, el('span', { class: 'sfumatura-testa' }, el('span', { testo }), out), r)
  }
  const gradi = x => x + '°', per = x => x + '%'
  return el('div', {},
    el('div', { class: 'temi', role: 'radiogroup', 'aria-label': 'Le sfumature di Aurora' }, ...Object.entries(SFUMATURE).map(([id, [nome, a, b, forza, buio]]) =>
      el('button', { type: 'button', role: 'radio', 'aria-checked': String((d.tema ?? 'aurora') === id), style: { '--c': buio ? hex(0.62 - buio / 250, forza, a) : hex(0.64, forza, a), '--c2': buio ? hex(0.12, 0, 0) : hex(0.7, forza * 0.95, b) },
        onclick: () => { d.tema = id; const { trasparenza, aurora } = d.colori ?? {}; d.colori = { trasparenza, aurora }; salva({ subito: true }) } }, el('i', { 'aria-hidden': 'true' }), nome))),
    el('div', { class: 'sfumature-fine' },
      cursore('accento', 'Il colore principale', 0, 360, k.accento, gradi, true),
      cursore('secondo', 'Il secondo colore, nelle sfumature', 0, 360, k.secondo, gradi, true),
      cursore('saturazione', 'La saturazione', 0, 200, k.saturazione, x => x === 0 ? '0% · in grigio' : x === 100 ? '100% · com\'è' : per(x)),
      cursore('buio', 'Quanto è nero lo sfondo', 0, 100, k.buio, x => x === 0 ? '0% · come sempre' : x === 100 ? '100% · nero' : per(x)),
      cursore('trasparenza', 'Quanto coprono le caselle', 20, 100, k.trasparenza, x => x <= 45 ? `${x}% · molto trasparenti` : x >= 90 ? `${x}% · piene` : per(x)),
      cursore('aurora', 'Quanto si vede l\'aurora', 0, 100, k.aurora, per),
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'quieto', testo: 'Rimetti la sfumatura com\'era', onclick: () => { d.colori = { trasparenza: DI_BASE.trasparenza, aurora: DI_BASE.aurora }; salva({ subito: true }) } }))))
}
// i temi (Marco, 23-11: «questo potrebbe essere quello classico e poi fanne altri due per capire dove possiamo spaziare»)
const COSA_STILE = { classica: 'Aurora: scura, vetro e luci sullo sfondo', carta: 'chiara e calda, i titoli con le grazie', netto: 'scura e piatta, angoli vivi, a macchina', spazio: 'il cielo di notte: stelle che scorrono, nebulose, vetro scuro' }
function temaNelPannello (d) {
  return el('div', { class: 'stili-scelta', role: 'radiogroup', 'aria-label': 'Il tema di Mirion' }, ...Object.entries(STILI).map(([id, nome]) =>
    el('button', { type: 'button', role: 'radio', class: 'stile-voce', 'aria-checked': String((d.stile ?? 'classica') === id), onclick: () => { d.stile = id; salva({ subito: true }) } },
      el('span', { class: 'stile-mini ' + id, 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('i'), el('i')), el('b', { testo: nome }), el('small', { testo: COSA_STILE[id] }))))
}

// il logo (Marco, 23-11: «il logo… da rendere modificabile… altre tre varianti… che si differenzino»): quattro varianti; il
// Monogramma si fa come su Discord. Ogni cambio si vede subito in alto (applicaLogo) e si salva come il resto
function logoNelPannello (d) {
  const l = d.logo = { ...LOGO_BASE, ...(d.logo ?? {}) }
  const cambia = (campi, subito = false) => { Object.assign(l, campi); applicaLogo(l); salva(subito ? { subito: true } : undefined) }
  const disegno = x => { const s = disegnoLogo(x); if (!s) return el('img', { src: './marchio.svg', alt: '' }); const t = document.createElement('template'); t.innerHTML = s; return t.content.firstChild }
  const scelta = el('div', { class: 'loghi-scelta', role: 'radiogroup', 'aria-label': 'Il logo' }, ...Object.entries(LOGHI).map(([id, nome]) =>
    el('button', { type: 'button', role: 'radio', class: 'logo-voce', 'aria-checked': String(l.tipo === id), onclick: () => cambia({ tipo: id }, true) }, disegno({ ...l, tipo: id }), el('span', { testo: nome }))))
  const editor = el('div', { class: 'logo-editor' }, el('div', { class: 'riga' }, el('span', { testo: 'Il nome in alto' }),
    el('input', { type: 'text', value: l.nome, maxlength: 24, 'aria-label': 'Il nome accanto al logo', onchange: e => cambia({ nome: e.target.value.trim() || 'Mirion' }, true) }),
    el('button', { type: 'button', class: 'quieto piccolo', testo: 'Rimetti «Mirion»', onclick: () => cambia({ nome: 'Mirion' }, true) })))
  const pillole = (testo, campo, voci) => el('div', { class: 'riga' }, el('span', { testo }), ...Object.entries(voci).map(([v, n]) =>
    el('button', { type: 'button', class: 'pillola', 'aria-pressed': String(l[campo] === v), testo: n, onclick: () => cambia({ [campo]: v }, true) })))
  // i colori valgono per Linea, Orbita e Monogramma: «di Mirion» segue la sfumatura scelta qui sotto
  if (l.tipo !== 'mirion') editor.append(el('div', { class: 'riga' }, el('span', { testo: 'I colori' }),
    el('button', { type: 'button', class: 'tinta di-mirion', title: 'Quelli di Mirion (seguono la sfumatura)', 'aria-label': 'I colori di Mirion', 'aria-pressed': String(!l.a), onclick: () => cambia({ a: null, b: null }, true) }),
    ...COPPIE.map(([a, b], i) => el('button', { type: 'button', class: 'tinta', style: { background: 'linear-gradient(135deg, ' + a + ', ' + b + ')' }, 'aria-label': 'Colore ' + (i + 1), 'aria-pressed': String(l.a === a), onclick: () => cambia({ a, b }, true) }))))
  if (l.tipo === 'monogramma') {
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, onchange: async e => {
      const f = e.target.files[0]; if (!f) return
      try { cambia({ img: await rimpicciolisci(f), usa: 'immagine' }, true) } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
    } })
    editor.append(
      pillole('Dentro', 'usa', { iniziali: 'Le iniziali', immagine: 'Un\'immagine' }),
      l.usa === 'iniziali'
        ? el('div', { class: 'riga' }, el('span', { testo: 'Le iniziali' }), el('input', { type: 'text', value: l.iniziali, maxlength: 3, 'aria-label': 'Le iniziali del logo', style: { width: '5rem' }, oninput: e => cambia({ iniziali: e.target.value.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase().slice(0, 3) || 'M' }) }))
        : el('div', { class: 'riga' }, el('span', { testo: 'L\'immagine' }), file, el('button', { type: 'button', class: 'secondario piccolo', onclick: () => file.click() }, ic('upload-simple'), l.img ? 'Cambia immagine' : 'Scegli un\'immagine'), el('small', { class: 'sopra', testo: 'si taglia al centro, quadrata' })),
      pillole('Il fondo', 'sfondo', { sfumato: 'Sfumato', pieno: 'Pieno', aurora: 'Aurora' }),
      pillole('La forma', 'forma', { quadrato: 'Quadrato', tondo: 'Tondo', squircle: 'Morbido', esagono: 'Esagono' }),
      pillole('La cornice', 'cornice', { nessuna: 'Nessuna', sottile: 'Sottile', aurora: 'Aurora' }),
      pillole('Il bollino', 'bollino', { nessuno: 'Nessuno', online: 'Online', nuovo: 'Nuovo', stella: 'Stella' }))
  }
  return el('div', {}, scelta, editor)
}

// la stanza a sinistra e la casella sulla scrivania che le corrisponde
const SEZIONI = [
  { stanza: 'scadute', casella: 'scadute', cosa: 'le task, per stato' },
  { stanza: 'lavoro', casella: 'accessi', cosa: 'i siti e le app, a un clic' },
  { stanza: 'lavagne', casella: 'lavagne', cosa: 'i fogli da disegnare' },
  { stanza: 'calendario', casella: null, cosa: 'il mese, con le task e gli impegni (si apre anche con il doppio clic sui prossimi giorni)' },
  { stanza: 'cerca', casella: 'cerca', cosa: 'le note per parola (c\'è anche in alto, con Ctrl K)' },
  { stanza: 'diario', casella: 'diario', cosa: 'la nota di oggi, e una riga da scriverci' },
]

let fondo = null, scheda = 'card'

// in fondo al pannello, il consiglio per chi fa Delion (Marco, 20-11: «un feedback che mi arriva tramite email, mettilo in basso
// per la personalizzazione»). Va all'indirizzo di impostazioni.json → feedback, con il programma di posta del computer o con Gmail
// nel browser; Delion non manda niente da sola, e nel testo non mette percorsi né note.
function feedback () {
  const f = STATO.feedback
  if (!f?.email) return null
  const testo = el('textarea', { rows: 4, maxlength: 4000, placeholder: 'Cosa ti manca, cosa non va, cosa vorresti diverso…', 'aria-label': 'Il tuo consiglio per Mirion' })
  const corpo = () => `${testo.value.trim()}\n\n— Mirion, ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const manda = come => {
    if (!testo.value.trim()) { testo.focus(); return notifica('Scrivi prima il consiglio.') }
    const su = encodeURIComponent(f.oggetto ?? 'Mirion: un consiglio'), b = encodeURIComponent(corpo())
    location.href = come === 'gmail' ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(f.email)}&su=${su}&body=${b}` : `mailto:${f.email}?subject=${su}&body=${b}`
    notifica(come === 'gmail' ? 'Gmail si apre con il consiglio già scritto: premi «Invia».' : 'Il programma di posta si apre con il consiglio già scritto: premi «Invia».', { tipo: 'sempre', durata: 6000 })
  }
  return el('section', { class: 'feedback-pannello' },
    el('h3', { testo: 'Un consiglio per Mirion' }),
    el('p', { class: 'sopra piccolo', testo: `Arriva per email a ${f.email}. Si apre la mail già scritta: la mandi tu.` }),
    testo,
    el('div', { class: 'bottoni' },
      el('button', { type: 'button', class: 'secondario', onclick: () => manda('posta') }, ic('paper-plane-tilt'), 'Manda per email'),
      el('button', { type: 'button', class: 'quieto', onclick: () => manda('gmail') }, 'Con Gmail')))
}

export function pannello () {
  fondo?.remove()
  fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) chiudi() } })
  const chiudi = () => { fondo?.remove(); fondo = null; removeEventListener('su-misura', ridisegna) }
  const ridisegna = () => { if (fondo) { const su = fondo.querySelector('.cassetto')?.scrollTop ?? 0; fondo.replaceChildren(corpo(chiudi)); fondo.querySelector('.cassetto').scrollTop = su } }
  addEventListener('su-misura', ridisegna)
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { chiudi(); removeEventListener('keydown', esc) } })
  fondo.append(corpo(chiudi))
  document.body.append(fondo)
  fondo.querySelector('.chiudi').focus()
}

const interruttore = (testo, acceso, cambia, { piccolo, disattivo } = {}) => el('label', { class: 'interruttore voce-pannello' },
  el('input', { type: 'checkbox', checked: acceso, disabled: disattivo, onchange: e => cambia(e.target.checked) }), el('span', {}, testo, piccolo && el('small', { testo: piccolo })))
const piccolo = (testo, acceso, cambia, etichetta) => el('label', { class: 'spunta-dove' }, el('input', { type: 'checkbox', checked: acceso, 'aria-label': etichetta, onchange: e => cambia(e.target.checked) }), el('span', { testo }))

function corpo (chiudi) {
  const d = MISURA.d, sc = scrivania(), riq = id => sc.riquadri.find(r => r.id === id)
  const nomi = Object.fromEntries($$('[data-stanze] a[data-stanza]').map(a => [a.dataset.stanza, a.querySelector('span')?.textContent ?? a.dataset.stanza]))
  const aSinistra = (id, si) => { d.stanze.nascoste = si ? d.stanze.nascoste.filter(x => x !== id) : [...d.stanze.nascoste, id]; salva({ subito: true }) }
  const sullaScrivania = (id, si) => { const r = riq(id); if (r) { r.nascosto = !si; if (!si) r.gruppo = null; salva({ subito: true }) } }
  const sezioni = el('table', { class: 'sezioni-pannello' },
    el('thead', {}, el('tr', {}, el('th', { testo: 'Sezione' }), el('th', { testo: 'A sinistra' }), el('th', { testo: `Su «${sc.nome}»` }))),
    el('tbody', {}, ...SEZIONI.map(s => el('tr', {},
      el('th', { scope: 'row' }, el('b', { testo: nomi[s.stanza] ?? TITOLI[s.casella] }), el('small', { testo: s.cosa })),
      el('td', {}, piccolo('', !d.stanze.nascoste.includes(s.stanza), si => aSinistra(s.stanza, si), `${nomi[s.stanza]} nella barra a sinistra`)),
      el('td', {}, s.casella ? piccolo('', !riq(s.casella)?.nascosto, si => sullaScrivania(s.casella, si), `${TITOLI[s.casella]} sulla scrivania ${sc.nome}`) : el('span', { class: 'sopra', testo: '—' }))))))
  // le card, con la grafica (Marco, 25-11: «la sezione Personalizza deve far capire tramite una grafica cosa aggiungo alla scrivania»):
  // in cima la mappa della scrivania com'è adesso; sotto tutte le card, ognuna con la sua miniatura, cosa mostra e se c'è già.
  // Qui non si aggiunge più (Marco, 25-11 sera: «levi dalla personalizzazione l'aggiungimento»): le card che non sono sulla scrivania
  // stanno fra le icone in cima alla scrivania, e un clic le rimette (riquadri.js, iconeCard).
  const titoli = Object.fromEntries(Object.entries(TITOLI).filter(([id]) => id !== 'studio-pt' && riq(id))) // Claudio, per ora, no (23-11 sera)
  const pianta = mappa(sc, titoli)
  const nomeCartella = r => r.gruppo && sc.gruppi?.find(g => g.id === r.gruppo)?.nome
  const carte = Object.keys(titoli).map(id => {
    const r = riq(id), c = !r.nascosto, dove = nomeCartella(r)
    return el('li', { class: 'carta-anteprima' + (c ? ' accesa' : '') },
      miniatura(id),
      el('b', { testo: titoli[id] }), el('small', { testo: COSA[id] ?? '' }),
      c ? el('div', { class: 'carta-stato' }, el('span', { class: 'sopra piccolo' }, ic('check'), dove ? `Dentro «${dove}»` : 'Sulla scrivania'),
        el('button', { type: 'button', class: 'quieto piccolo', 'aria-label': `Togli ${titoli[id]} dalla scrivania e mettila fra le icone`, onclick: () => sullaScrivania(id, false) }, 'Fra le icone'))
        : el('div', { class: 'carta-stato' }, el('span', { class: 'sopra piccolo' }, ic(segno(id)), 'Fra le icone in cima')))
  })
  const lecard = el('section', { class: 'card-pannello' }, pianta,
    el('p', { class: 'sopra piccolo', testo: 'La tua scrivania com\'è adesso. Le card che non ci sono stanno fra le icone in cima alla scrivania: un clic e tornano qui.' }),
    el('ul', { class: 'carte-anteprima' }, ...carte))
  // a schede (Marco, 25-11: «tramite finestre scompartimenti: il tema con il logo e i colori in uno, le card in un altro»):
  // ogni scheda è una finestra sua; quella scelta resta finché Mirion è aperta
  const SCHEDE = {
    card: ['Le card', () => [el('h3', { testo: `Le card di «${sc.nome}»` }), lecard,
      el('p', { class: 'sopra piccolo', testo: 'Per spostare una card, trascinala sulla scrivania. Lasciala sopra un\'altra per fare una cartella, e scrivi sul nome per chiamarla come vuoi. Passandoci sopra: ⛶ schermo intero, − rimpicciolisci, ✕ togli.' })]],
    tema: ['Tema e logo', () => [el('h3', { testo: 'Il tema' }), temaNelPannello(d),
      el('h3', { testo: 'Il logo' }), logoNelPannello(d),
      el('p', { class: 'sopra piccolo', testo: 'Il logo e il nome si vedono in alto e nell\'icona della finestra. Valgono solo per te: chi lavora con te vede il suo.' }),
      el('h3', { testo: 'I colori di Aurora' }), coloriDiAurora(d),
      el('p', { class: 'sopra piccolo', testo: 'La sfumatura cambia il colore di tutta Mirion e dei suoi gestionali; i cursori la ritoccano e si vede subito. I testi restano sempre leggibili: i colori sono misurati. Una card sola si colora dal suo pulsante ✦, passandoci sopra. Se sbagli: ↶ Annulla, in cima alla scrivania, o Ctrl+Z.' })]],
    barra: ['Barra e sezioni', () => [el('h3', { testo: 'Le sezioni: a sinistra, sulla scrivania, o tutte e due' }), sezioni,
      el('h3', { testo: 'La barra a sinistra' }),
      interruttore('Barra stretta', d.stanze.strette, si => { d.stanze.strette = si; salva({ subito: true }) }, { piccolo: 'solo le icone, senza i nomi' }),
      el('h3', { testo: 'Le icone in alto' }),
      el('div', { class: 'scelte', role: 'radiogroup', 'aria-label': 'Grandezza delle icone' }, ...Object.entries(GRANDEZZE).map(([g, nome]) =>
        el('button', { type: 'button', role: 'radio', 'aria-checked': String(d.strumenti === g), testo: nome, onclick: () => { d.strumenti = g; salva({ subito: true }) } })))]],
    altro: ['Altro', () => [el('h3', { testo: 'Le aree di lavoro' }), areeNelPannello(chiudi),
      // l'IA predefinita dei pulsanti «Fallo con…»; accanto a ogni pulsante la freccina sceglie un'altra IA, quella volta
      el('h3', { testo: 'L\'intelligenza artificiale predefinita' }),
      el('div', { class: 'ia-caselle', role: 'radiogroup', 'aria-label': 'L\'intelligenza artificiale predefinita' }, ...mie().map(ia =>
        el('button', { type: 'button', role: 'radio', class: 'ia-casella', style: { '--c1': ia.colori[0], '--c2': ia.colori[1] }, 'aria-checked': String(predefinita().id === ia.id), onclick: () => { d.ia = ia.id; salva({ subito: true }) } },
          el('img', { src: `./icone/${ia.id}.png`, alt: '' }), el('b', { testo: ia.nome }), el('small', { testo: predefinita().id === ia.id ? 'la predefinita' : 'scegli' })))),
      el('p', { class: 'sopra piccolo', testo: 'Le IA sono quelle del tuo preset (stanza Lavoro). Accanto a ogni «Fallo con…» la freccina sceglie un\'altra IA, quella volta.' }),
      feedback()]],
  }
  if (!SCHEDE[scheda]) scheda = 'card'
  const dentro = el('div', { class: 'pannello-scheda', role: 'tabpanel', id: 'pannello-scheda', 'aria-label': SCHEDE[scheda][0] }, ...SCHEDE[scheda][1]())
  const barraSchede = el('div', { class: 'viste schede-pannello', role: 'tablist', 'aria-label': 'Cosa personalizzare' }, ...Object.entries(SCHEDE).map(([id, [nome]]) =>
    el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === scheda), 'aria-controls': 'pannello-scheda', testo: nome, onclick: () => { scheda = id; fondo?.replaceChildren(corpo(chiudi)) } })))
  return el('aside', { class: 'cassetto pannello-misura', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Personalizza' },
    el('header', {}, el('div', {}, el('h2', { testo: 'Personalizza' })),
      el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: chiudi }, ic('x'))),
    barraSchede, dentro,
    el('div', { class: 'bottoni piede-pannello' }, el('button', { type: 'button', class: 'secondario', testo: 'Rimetti tutto com\'era', onclick: rimettiComEra }), el('button', { type: 'button', class: 'primario', testo: 'Fatto', onclick: chiudi })))
}
