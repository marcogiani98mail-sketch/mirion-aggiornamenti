// Delion: le stanze, l'orologio, il dock delle app e Ctrl+K. Ogni stanza è un modulo che si carica quando la apri.
import { $, $$, api, STATO, notifica } from './base.js'
import { comandi } from './comandi.js'
import { dock } from './dock.js'
import { guida } from './guida.js'
import { carica, pulsante } from './su-misura.js'
import { preparaBarre } from './barra.js'
import { tastoDestro } from './tasto-destro.js'
import * as aree from './aree.js'
import { pulsanteIndietro, ricorda } from './indietro.js'
import { notificheSquadra } from './notifiche-squadra.js'
import { pulsanteAggiornami } from './aggiornami.js'

const SOLO_TRAINER = ['clienti', 'impostazioni'] // le stanze della Mirion di un trainer
const STANZE = {
  scrivania: () => import('./scrivania.js'), telefoni: () => import('./telefoni.js'), // «Le app sul telefono», sotto la Scrivania (26-11 notte)
  scadute: () => import('./task.js'), lavoro: () => import('./lavoro.js'),
  lavagne: () => import('./lavagne.js'), cerca: () => import('./cerca.js'), notizie: () => import('./notizie.js'), // le notizie (notizie.js, 23-11)
  prodotto: () => import('./prodotto.js'), // la scrivania di un software (prodotto.js, 23-11)
  diario: () => import('./diario.js'), ia: () => import('./spazio-ia.js'), calendario: () => import('./calendario.js'), impostazioni: () => import('./impostazioni.js'),
  gestionale: () => import('./gestionali.js'),
  importa: () => import('./importa.js'), // i file del computer nel cervello (importa.js, 24-11)
  conti: () => import('./conti.js'), // clienti e conti: il nucleo di Mirion (conti.js, 25-11)
  claude: () => import('./claude.js'), // Claude via API: la chat sul cervello e i consumi (claude.js, 25-11)
  clienti: () => import('./clienti.js'), // i clienti del personal trainer (clienti.js, 23-11 sera) // un gestionale aperto dentro Mirion (gestionali.js)
}
const aperte = {}

async function vai () {
  let [nome, resto] = location.hash.slice(1).split('?')
  if (nome === 'task') nome = 'scadute' // la stanza Task vive nella sezione che era «scadute»
  // la Squadra è una sezione della scrivania (Marco, 23-11): i vecchi indirizzi «#squadra» portano lì
  if (nome === 'squadra') { nome = 'scrivania'; resto = 'sezione=squadra'; history.replaceState(null, '', '#scrivania?sezione=squadra') }
  if (!STANZE[nome]) nome = 'scrivania'
  // la Mirion di un trainer (server/profilo.mjs, 25-11 notte: «Claudio deve visualizzare solo Mirion Trainer»): i clienti e le impostazioni
  if (STATO.profilo === 'trainer' && !SOLO_TRAINER.includes(nome)) { nome = 'clienti'; resto = ''; history.replaceState(null, '', '#clienti') }
  document.body.classList.toggle('modo-widget', /[?&]widget=/.test(location.hash)) // una card sola, a tutto schermo (widget.js)
  for (const s of $$('[data-sezione]')) s.hidden = s.id !== nome
  for (const a of $$('[data-stanze] a')) { if (a.getAttribute('href') === '#' + nome) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current') }
  document.body.dataset.stanza = nome
  ricorda() // per il tasto «indietro» (indietro.js)
  try {
    const qui = $('#' + nome)
    if (!qui.childElementCount) qui.replaceChildren(Object.assign(document.createElement('p'), { className: 'vuoto caricamento', textContent: 'Leggo il vault…' }))
    const m = aperte[nome] ??= await STANZE[nome]()
    await m.mostra($('#' + nome), new URLSearchParams(resto ?? ''))
  } catch (e) {
    // la stanza non si apre: al posto di «Leggo il vault…» il motivo e un tasto per riprovare (prima restava lì per sempre)
    notifica(`${nome}: ${e.message}`, { tipo: 'sempre' }); console.error(e)
    const qui = $('#' + nome), p = Object.assign(document.createElement('p'), { className: 'vuoto', textContent: `Non riesco ad aprire questa parte: ${e.message} ` })
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Riprova' }); b.onclick = () => { delete aperte[nome]; qui.replaceChildren(); vai() }
    p.append(b); qui?.replaceChildren(p)
  }
}

function orologio () {
  const t = $('[data-orologio]'), giro = () => { const d = new Date(); t.textContent = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); t.dateTime = d.toISOString() }
  giro(); setInterval(giro, 15_000)
  t.before(pulsanteAggiornami({ cima: true })) // «Aggiornami» in ogni pagina, accanto all'ora (Marco, 24-11)
}

export async function bollino () {
  // il numerino su «Task»: solo le scadute che non hai ancora visto nella stanza (Marco, 20-11: «non mettermi più il banner, solo se ne arrivano di nuove»)
  try {
    const s = await api('/api/scrivania'); avvisaCalendario(s)
    const b = $('[data-bollino]'), n = s.scaduteNuove ?? 0
    b.textContent = n > 99 ? '99+' : n; b.hidden = !n; b.title = `${n} ${n === 1 ? 'scaduta nuova' : 'scadute nuove'}`
    return s
  } catch { return null }
}

// gli impegni del calendario appena diventati cose da fare: li porta la prima richiesta che arriva (bollino o scrivania), una volta sola
export function avvisaCalendario (s) {
  const nuove = s.calendario?.aggiunte?.length
  if (nuove) notifica(`Dal calendario: ${nuove} ${nuove === 1 ? 'impegno è diventato una cosa da fare' : 'impegni sono diventati cose da fare'}, nella nota «Delion/Dal calendario».`, { tipo: 'sempre', durata: 7000 })
}

// la pagina che si aggiorna da sola: il server dice quando un file del vault cambia (Obsidian, Claude, un'altra IA, git);
// dopo un attimo di calma si rifanno il bollino, il numerino delle sessioni con l'IA e la stanza aperta, se non stai scrivendo
// o trascinando. EventSource si ricollega da solo se il server si riavvia.
// dove sei scorso, prima di ridisegnare: la finestra, il palco e ogni riquadro scorso dentro (riconosciuto dalle sue classi e
// da quale è fra quelli uguali). Dopo il disegno si rimette tutto com'era
function segnaScorrimento (stanza) {
  const palco = $('[data-palco]'), chiave = e => e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).map(c => CSS.escape(c)).join('.') : null
  const dentro = []
  for (const e of stanza?.querySelectorAll('*') ?? []) if (e.scrollTop > 0 || e.scrollLeft > 0) { const k = chiave(e); if (k) dentro.push({ k, i: [...stanza.querySelectorAll(k)].indexOf(e), su: e.scrollTop, lato: e.scrollLeft }) }
  // l'altezza resta quella di prima finché le card non si sono riempite (le loro cose arrivano dopo, una per una): se la pagina
  // si accorcia anche solo per un attimo, il palco salta su
  if (stanza) { clearTimeout(stanza.sblocca); stanza.style.minHeight = stanza.offsetHeight + 'px' }
  return { stanza, x: scrollX, y: scrollY, palco: palco?.scrollTop ?? 0, dentro }
}
function rimettiScorrimento ({ stanza, x, y, palco, dentro }) {
  const fai = () => {
    scrollTo(x, y); const p = $('[data-palco]'); if (p) p.scrollTop = palco
    for (const d of dentro) { try { const e = stanza.querySelectorAll(d.k)[d.i]; if (e) { e.scrollTop = d.su; e.scrollLeft = d.lato } } catch { /* una classe strana */ } }
  }
  fai(); requestAnimationFrame(fai)
  if (stanza) stanza.sblocca = setTimeout(() => { stanza.style.minHeight = '' }, 4000)
}

function ascoltaIlVault () {
  if (!window.EventSource) return
  let timer = null, ultimoGiro = 0, inAttesa = false
  // ogni mezz'ora, non a ogni file (Marco, 25-11 notte: «è importante che venga sempre aggiornata, ma lo fa ogni minuto, a me fa
  // strano… oppure fallo fare a me manualmente e tu ogni mezz'ora»): dopo un cambiamento nel vault la scrivania si rimette in
  // pari al più una volta ogni 30 minuti; quando vuoi tu, «Aggiornami» in alto lo fa subito. Quello che fai in Mirion si vede subito
  const OGNI = 30 * 60_000, CALMA = 1500
  const rimanda = () => {
    inAttesa = true
    if (timer) return // il giro è già in programma
    timer = setTimeout(() => { timer = null; giro() }, Math.max(CALMA, ultimoGiro + OGNI - Date.now()))
  }
  const giro = async () => {
    inAttesa = false; ultimoGiro = Date.now()
    bollino()
    try {
      const d = await api('/api/ia/sessioni'), n = d.sessioni.filter(s => s.attiva).length, b = $('[data-bollino-ia]')
      if (b) { b.textContent = n; b.hidden = !n; b.title = `${n} ${n === 1 ? 'sessione con l\'IA aperta' : 'sessioni con l\'IA aperte'}` }
    } catch { /* il bollino aspetta il prossimo giro */ }
    const a = document.activeElement, nome = document.body.dataset.stanza
    const occupato = a?.matches?.('input, textarea, select, [contenteditable="true"]') || document.querySelector('.si-trascina, .si-allarga, .cassetto-fondo, .menu-destro, dialog[open]')
    // con quello che c'è dopo «?» nell'indirizzo: la scrivania resta nella sezione in cui sei (la Squadra, o le caselle)
    // la pagina resta dove l'avevi lasciata (Marco, 25-11 sera: «continua ad aggiornarsi il programma quando sono sul vault
    // Cervello e mi riporta in alto»): con un vault che cambia spesso (Claude, git) ogni giro ridisegnava la stanza da capo
    if (!occupato && aperte[nome] && ['scrivania', 'scadute', 'diario', 'ia'].includes(nome)) {
      const posti = segnaScorrimento($('#' + nome))
      await aperte[nome].mostra($('#' + nome), new URLSearchParams(location.hash.split('?')[1] ?? '')).catch(() => {})
      rimettiScorrimento(posti)
    }
    STATO.allineato = Date.now(); dispatchEvent(new Event('delion-allineato')) // per «Aggiornami» (aggiornami.js): in pari alle…
  }
  const sorgente = new EventSource('/api/eventi')
  sorgente.onmessage = e => {
    // un avviso del server, non un file cambiato: quello che hai fatto sulla scrivania non è arrivato su GitHub (rotte-squadra.mjs)
    let d = null; try { d = JSON.parse(e.data) } catch { /* un file cambiato */ }
    if (d?.legame) { if (!d.legame.ok && d.legame.errore) notifica('Non è ancora arrivato agli altri: ' + d.legame.errore, { tipo: 'sempre', durata: 9000 }); return }
    rimanda()
  }
  sorgente.onopen = () => { if (STATO.allineato === false) giro() } // il server è tornato: ci si rimette in pari
  sorgente.onerror = () => { STATO.allineato = false; dispatchEvent(new Event('delion-allineato')) } // il server non risponde: non si è in pari
  addEventListener('delion-aggiornami', () => { clearTimeout(timer); timer = null; giro() }) // il tasto «Aggiornami»
  giro()
}

async function parti () {
  orologio()
  // gli aggiornamenti: un controllo dopo l'avvio, se c'è l'indirizzo; il sì è il clic su «Aggiorna» (server/aggiornamenti.mjs).
  // Si prepara per primo: se qualcosa più sotto si inceppa, una versione nuova che lo ripara arriva lo stesso (23-11)
  // l'avviso resta finché non premi «Aggiorna» o «Dopo», e l'aggiornamento si vede fino in fondo (aggiornamento.js, 23-11);
  // e in alto, al posto del numero, il tasto «0.1.y · Aggiorna» che resta anche dopo «Dopo» (segnaVersione, 25-11)
  setTimeout(() => api('/api/aggiornamenti').then(r => { if (r.nuova) import('./aggiornamento.js').then(m => { m.segnaVersione(r); m.avvisaVersione(r) }) }).catch(() => {}), 20_000)
  // l'installatore del collaboratore: finché la licenza non è attivata su questo computer, si vede solo l'attivazione;
  // poi, a ogni apertura, nome utente e password (accesso.js), prima di chiedere qualunque altra cosa al server
  const att = await api('/api/attivazione').catch(() => null)
  if (att?.serve) { (await import('./attivazione.js')).attivazione(att); return }
  const porta = await api('/api/accesso').catch(() => null)
  if (porta?.serve && !porta.dentro) { (await import('./accesso.js')).accesso(porta); return }
  // la scelta all'avvio (Marco, 22-11): il workspace di squadra o un prodotto (scelta.js, server/prodotti.mjs);
  // un cervello senza .delion/prodotti.json non ce l'ha, e Mirion si apre come prima
  const prodotti = await api('/api/prodotti').catch(() => null)
  // aperta da un widget (una card sola, dalla schermata Home del telefono): niente scelta, si va dritti alla card
  if (prodotti?.prodotti?.length) { STATO.prodotti = true; if (!/[?&]widget=/.test(location.hash)) await (await import('./scelta.js')).scelta(prodotti) }
  try {
    const [stato, preset] = await Promise.all([api('/api/stato'), api('/api/preset')])
    Object.assign(STATO, stato, { preset })
    // la Mirion di un trainer: si chiama Mirion Trainer e mostra solo i clienti (stili.css, body.solo-trainer)
    if (stato.profilo === 'trainer') {
      document.body.classList.add('solo-trainer'); document.title = 'Mirion Trainer'
      const m = $('.marchio'); if (m) { m.href = '#clienti'; m.setAttribute('aria-label', 'Mirion Trainer, i tuoi clienti'); const t = m.querySelector('span'); if (t) t.textContent = 'Mirion Trainer' }
    }
    // il numero della versione accanto al nome, in alto (Marco, 23-11: «metti anche da ora in poi il numero della versione»)
    // «alpha» finché Marco non dice che è pronta (23-11: «dai una versione alpha»); il numero resta quello vero, così gli aggiornamenti si confrontano come prima
    // cliccato, apre le versioni e le loro novità (Marco, 25-11: «le versioni mettile cliccando la versione attuale in alto a sinistra»):
    // sta accanto al marchio e non dentro, perché il marchio è già un link alla scrivania
    if (stato.versione) $('.marchio').after(Object.assign(document.createElement('a'), { className: 'versione-attuale', href: '#scrivania?pagina=versioni', textContent: `v${stato.versione} alpha`, title: `Mirion ${stato.versione}, alpha: funziona, ma cambia spesso. Clicca per vedere le versioni e le novità` }))
  } catch (e) { notifica('Il server di Mirion non risponde: ' + e.message, { tipo: 'sempre' }) }
  await Promise.all([carica(), aree.carica()]) // la disposizione su misura e le aree di lavoro, prima di disegnare
  dock(); comandi(); bollino(); pulsante(); aree.pulsanteArea(); pulsanteIndietro(); preparaBarre(); tastoDestro(); notificheSquadra()
  import('./prodotto.js').then(m => m.vociProdotti()).catch(() => {}) // i software nella barra a sinistra (Marco, 23-11)
  // l'edizione per un cliente: la prima volta si parte da «Porta dentro i file del computer» (importa.js, 24-11)
  if (STATO.edizione?.tipo === 'cliente' && !/^#\w/.test(location.hash) && !leggiSegno('mirion-importa-visto')) { history.replaceState(null, '', '#importa'); scriviSegno('mirion-importa-visto') }
  addEventListener('hashchange', vai)
  await vai()
  ascoltaIlVault()
  // la guida si apre da sola solo se manca qualcosa e non l'hai saltata; quando non serve, la prima volta c'è il primo sguardo.
  // Un'area di lavoro mai letta (nuova, o con la cartella cambiata) parte con il primo sguardo, come la prima volta.
  if (STATO.profilo === 'trainer') return // la Mirion di un trainer non ha il vault da preparare: niente guida e niente primo sguardo
  const area = aree.attiva()
  if (!await guida(false)) import('./primo-sguardo.js').then(m => { m.primoSguardo(area && !area.letta); if (area && !area.letta) api('/api/aree/letta', { id: area.id }).catch(() => {}) })
}
function leggiSegno (k) { try { return localStorage.getItem(k) } catch { return null } }
function scriviSegno (k) { try { localStorage.setItem(k, new Date().toISOString()) } catch { /* niente: la prossima volta si riparte da lì */ } }
parti()
