// La dashboard del personal trainer (Marco, 23-11-2026 sera: «visualizzare i dati di Evolution Fit Club tutti in un'unica dashboard…
// dashboard animata… inviare direttamente i dati nelle card di Piatto così che lui possa starci dietro e visualizzarle tutte in
// un'anteprima misurata come quella che abbiamo creato; se ci sono dati in più aggiungi la card apposita»).
// #clienti: una card animata per cliente (le calorie di oggi in un anello, i macro, l'acqua, il peso con la sua linea, gli
// allenamenti della settimana, l'ultimo check-in); #clienti?id=…: la pagina completa del cliente, con le card come le pagine di
// Piatto e quelle in più dei check-in (come sta, i messaggi). I dati arrivano dai clienti (server/clienti.mjs) e stanno nel cervello.
// Ci sono anche i clienti di Claudio, l'app per palestre (server/claudio.mjs; Marco: «non tutti usano l'app… farli processare nel
// grafico, in caso ce li hanno»): peso e misure, allenamenti, record, abbonamento e ingressi. Ognuno ha le card di quello che ha.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'
import { carta, barra, colonne, grafico } from './pagine-piatto.js'
import { schedeTrainer, eTitolare, accendiVoce, NOME as TRAINER } from './schede-trainer.js'
import { conIA, pulsantiIA, obsidian } from './ia.js'
import { leggiNota } from './markdown.js'
import { daGuardare, squadra, quandoBreve } from './trainer-oggi.js'
import { colorabile } from './colora.js'

const n = v => Number.isFinite(+v) ? Math.round(+v).toLocaleString('it-IT') : '—'
const virgola = v => Number.isFinite(+v) ? (+v).toLocaleString('it-IT', { maximumFractionDigits: 1 }) : '—'
const UMORI = ['', '😣', '😕', '😐', '🙂', '😄']
const iniziali = s => String(s ?? '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()
const giorniDa = iso => iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400_000) : null
const quando = iso => { if (!iso) return 'mai'; const g = giorniDa(iso), d = new Date(iso); return g === 0 ? 'oggi ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : g === 1 ? 'ieri' : `${g} giorni fa` }
const fermo = c => { const g = giorniDa(c.ultimo); return g == null || g >= 3 }
const giorno = g => {
  const d = new Date(g + 'T12:00'), oggi = new Date(); oggi.setHours(12, 0, 0, 0)
  const tra = Math.round((d - oggi) / 86400_000)
  return tra === 0 ? 'oggi' : tra === 1 ? 'domani' : tra === -1 ? 'ieri' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}
// da dove arrivano i dati di un cliente
const fonti = c => [c.piatto ? 'Mirion Fit' : null, c.claudio ? 'gestionale' : null, c.checkin?.length ? 'check-in' : null, c.daNota ? 'la sua nota' : null].filter(Boolean)
// il pallino di Mirion Trainer (Marco, 24-11 sera): verde chi ha l'app Mirion Fit (online o Piatto collegato), grigio chi c'è solo nelle note
const conApp = c => Boolean(c.online || c.collegato)
const pallino = c => el('span', { class: 'pallino-fit ' + (conApp(c) ? 'si' : 'no'), title: conApp(c) ? 'Ha l’app Mirion Fit' : 'Senza l’app Mirion Fit: i dati arrivano dalla sua nota', 'aria-label': conApp(c) ? 'con Mirion Fit' : 'senza Mirion Fit' })
// tutte le pesate, una per giorno: dai check-in, da Piatto e da Claudio (vince Claudio: lì le misure le prende il trainer)
function pesiDi (c, daPiatto) {
  const per = new Map()
  for (const p of c.daNota?.pesi ?? []) per.set(p.data, { data: p.data, kg: +p.kg }) // dalla sua nota (le altre fonti, più fresche, vincono)
  for (const k of (c.checkin ?? []).filter(k => k.peso)) per.set(k.quando.slice(0, 10), { data: k.quando.slice(0, 10), kg: +k.peso })
  for (const p of daPiatto ?? []) per.set(p.data, { data: p.data, kg: +p.kg })
  for (const p of c.claudio?.pesi ?? []) per.set(p.data, { data: p.data, kg: +p.kg })
  return [...per.values()].sort((a, b) => a.data.localeCompare(b.data))
}
// quanto è cambiato il peso in 30 giorni (dalla prima pesata dentro i 30 giorni, se ce ne sono due)
function in30 (pesi) {
  const da = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10), dentro = pesi.filter(p => p.data >= da)
  return dentro.length >= 2 ? Math.round((dentro.at(-1).kg - dentro[0].kg) * 10) / 10 : null
}
const segno = v => `${v > 0 ? '+' : ''}${virgola(v)}`
// l'abbonamento di Claudio in una riga: «10 sedute · 4 su 10 sedute · scade fra 5 g», e se è da guardare
function abbonamento (a) {
  if (!a) return null
  const quandoScade = a.scaduto ? `scaduto da ${-a.giorniAllaScadenza} g` : a.giorniAllaScadenza != null && a.giorniAllaScadenza <= 30 ? (a.giorniAllaScadenza === 0 ? 'scade oggi' : `scade fra ${a.giorniAllaScadenza} g`) : null
  const periodo = a.tipo === 'periodo'
  const presto = a.scaduto || a.esaurito || (!periodo && a.rimaste <= 2) || (a.giorniAllaScadenza != null && a.giorniAllaScadenza <= 7)
  return { testo: [a.nome, periodo ? null : a.rimaste === 1 ? `ne resta 1 su ${a.totale}` : `ne restano ${a.rimaste} su ${a.totale}`, quandoScade ?? (periodo && a.scadenza ? `fino al ${new Date(a.scadenza + 'T12:00').toLocaleDateString('it-IT')}` : null)].filter(Boolean).join(' · '),
    presto, fatto: periodo ? null : a.rimaste, su: periodo ? null : a.totale }
}
const UNITA = { peso: 'kg', grasso: '%' }
const NOMI_MISURE = { vita: 'Vita', fianchi: 'Fianchi', collo: 'Collo', grasso: 'Massa grassa', braccio: 'Braccio', coscia: 'Coscia', petto: 'Petto' }

// i numeri che contano fino al loro valore, e l'anello che si riempie (niente se chi usa Mirion vuole meno movimento)
const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function conta (nodo, fino) {
  if (!Number.isFinite(+fino) || calmo()) { nodo.textContent = n(fino); return nodo }
  const t0 = performance.now(), dura = 900
  const passo = t => { const k = Math.min(1, (t - t0) / dura), e = 1 - Math.pow(1 - k, 3); nodo.textContent = n(fino * e); if (k < 1) requestAnimationFrame(passo) }
  requestAnimationFrame(passo); return nodo
}
function anello (fatto, obiettivo, grande = false) {
  const r = grande ? 54 : 34, lato = (r + 8) * 2, giro = 2 * Math.PI * r, pc = obiettivo ? Math.min(1.25, fatto / obiettivo) : 0
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', `0 0 ${lato} ${lato}`); s.setAttribute('class', 'anello-cliente' + (grande ? ' grande' : '') + (pc > 1.1 ? ' oltre' : ''))
  s.setAttribute('role', 'img'); s.setAttribute('aria-label', `${n(fatto)} kcal su ${n(obiettivo)}`)
  s.innerHTML = `<circle cx="${lato / 2}" cy="${lato / 2}" r="${r}" class="fondo"/><circle cx="${lato / 2}" cy="${lato / 2}" r="${r}" class="pieno" stroke-dasharray="${giro}" stroke-dashoffset="${giro}" transform="rotate(-90 ${lato / 2} ${lato / 2})"/>`
  const pieno = s.querySelector('.pieno'), fine = giro * (1 - Math.min(1, pc))
  requestAnimationFrame(() => requestAnimationFrame(() => { pieno.style.strokeDashoffset = fine }))
  return el('div', { class: 'anello-box' + (grande ? ' grande' : '') }, s, el('div', { class: 'anello-centro' }, conta(el('b'), fatto), el('small', { testo: `/ ${n(obiettivo)} kcal` })))
}
// la linea del peso, piccola
function linea (pesi) {
  if (!pesi || pesi.length < 2) return null
  const ks = pesi.map(p => +p.kg), lo = Math.min(...ks), hi = Math.max(...ks), L = 120, A = 32
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', `0 0 ${L} ${A}`); s.setAttribute('class', 'linea-peso'); s.setAttribute('aria-hidden', 'true')
  s.innerHTML = `<polyline points="${ks.map((k, i) => `${Math.round(i / (ks.length - 1) * (L - 4) + 2)},${Math.round(A - 3 - (k - lo) / Math.max(0.1, hi - lo) * (A - 6))}`).join(' ')}"/>`
  return s
}

export async function mostra (stanza, params) {
  const id = params?.get('id')
  if (id) return paginaCliente(stanza, id)
  scrollTo(0, 0)
  stanza.replaceChildren(el('p', { class: 'vuoto', testo: 'Leggo i clienti…' }))
  let d
  try { d = await api('/api/clienti') } catch (e) { return stanza.replaceChildren(el('p', { class: 'vuoto', testo: e.message })) }
  const rifai = () => mostra(stanza, params)
  if (params?.get('vista') === 'palestra' && d.online?.io?.titolare) return vistaPalestra(stanza, d, rifai)
  const fai = async (corpo, detto) => { try { const r = await api('/api/clienti', corpo); if (detto) notifica(detto); return r } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  const clienti = d.clienti, demo = clienti.some(c => c.demo)
  const attivi = clienti.filter(c => !fermo(c)).length, fermi = clienti.length - attivi
  const novita = clienti.reduce((t, c) => t + (c.checkin ?? []).filter(k => giorniDa(k.quando) <= 1 && k.messaggio).length, 0)
  const nome = el('h1', { class: 'clienti-club', testo: d.club, title: 'Il nome del club: clic per cambiarlo', tabindex: 0,
    onclick: async () => { const campo = el('input', { value: d.club, maxlength: 60, 'aria-label': 'Il nome del club', onkeydown: async e => { if (e.key === 'Enter') { await fai({ azione: 'club', nome: campo.value }); rifai() } if (e.key === 'Escape') rifai() } }); nome.replaceWith(campo); campo.focus(); campo.select() } })
  const porta = d.porta?.acceso
  stanza.replaceChildren(el('div', { class: 'clienti' },
    schedeFit(d, 'clienti'),
    el('header', { class: 'clienti-cima' },
      el('div', {}, el('p', { class: 'sopra', testo: d.online?.io && !d.online.io.titolare ? `I tuoi clienti · trainer di ${d.online.io.club ?? 'Mirion Fit online'}` : d.claudio?.clienti ? 'I clienti che condividono con te e quelli del gestionale della palestra' : 'I clienti che condividono con te' }), nome),
      el('div', { class: 'bottoni' },
        // Piatto online (24-11): il link personale, da fuori casa; l'invito di sempre resta per chi è sulla stessa Wi-Fi
        d.online?.acceso ? el('button', { type: 'button', class: 'primario', title: 'Un link personale per Mirion Fit online: il cliente lo apre dal telefono, ovunque', onclick: () => invita(fai, 'invita-online') }, ic('user-plus'), 'Invita su Mirion Fit online') : null,
        d.online?.errore ? el('span', { class: 'sopra piccolo attenzione', testo: d.online.errore }) : null,
        porta ? el('button', { type: 'button', class: d.online?.acceso ? 'secondario' : 'primario', onclick: () => invita(fai) }, ic('user-plus'), d.online?.acceso ? 'Invita sulla Wi-Fi' : 'Invita un cliente')
          : el('button', { type: 'button', class: 'primario', title: 'Il QR porta alla porta del telefono (Impostazioni → «Il telefono»)', onclick: async () => { await api('/api/telefono', { azione: 'accendi' }).catch(e => notifica(e.message, { tipo: 'sempre' })); rifai() } }, ic('user-plus'), 'Accendi la porta per invitare'),
        // l'app Mirion Fit per Android: il QR porta alla pagina su GitHub, che la scarica e la installa (25-11, senza Netlify né porta)
        el('button', { type: 'button', class: 'secondario', title: 'Un QR che il cliente inquadra col telefono (iPhone o Android): apre e installa Mirion Fit da GitHub, già attiva', onclick: () => qrApp(fai) }, ic('arrow-down'), 'QR per installare l’app'),
        el('button', { type: 'button', class: 'secondario', title: 'Mirion Trainer sul telefono: i clienti, quello da guardare oggi, la chat e le schede', onclick: () => trainerTelefono(fai) }, ic('device-mobile'), 'Sul telefono'),
        // «Prova con clienti inventati» tolto il 26-11 sera (Marco: «togli i clienti prova dalla trainer»): la prova sta nell'anteprima web
        demo ? el('button', { type: 'button', class: 'secondario', onclick: async () => { await fai({ azione: 'via-demo' }, 'Tolti i clienti inventati.'); rifai() } }, 'Togli la prova') : null)),
    el('div', { class: 'clienti-cifre' },
      ...[[clienti.length, 'clienti'], [attivi, 'attivi negli ultimi 3 giorni'], [fermi, 'fermi da 3 giorni o più', fermi ? 'presto' : ''], [novita, 'messaggi nelle ultime 24 ore', novita ? 'bene' : '']].map(([v, t, cls], i) =>
        el('div', { class: 'cifra clienti-cifra ' + (cls ?? ''), style: { '--i': i } }, conta(el('b'), v), el('span', { testo: t })))),
    clienti.length ? cruscotto(clienti) : null,
    clienti.some(c => !conApp(c)) && clienti.some(conApp) || clienti.some(c => c.soloNota) ? el('p', { class: 'sopra piccolo legenda-fit' },
      el('span', { class: 'pallino-fit si' }), ` ${clienti.filter(conApp).length} con l’app Mirion Fit`, ' · ', el('span', { class: 'pallino-fit no' }), ` ${clienti.filter(c => !conApp(c)).length} senza (i dati dai check-in, dal gestionale o dalla sua nota)`) : null,
    clienti.length ? el('div', { class: 'clienti-griglia' }, ...clienti.map((c, i) => cartaCliente(c, i)))
      : el('section', { class: 'fascia clienti-vuoto' }, el('h2', { testo: 'Ancora nessun cliente' }), el('p', { class: 'sopra', testo: porta ? 'Premi «Invita un cliente»: esce un QR, il cliente lo inquadra col telefono, scrive il nome e dà il consenso. Da lì ti manda peso, allenamenti e come sta, e può collegare il suo Mirion Fit.' : 'Per invitare i clienti serve la porta del telefono accesa: il QR porta lì. Vanno sulla stessa rete Wi-Fi del computer.' })),
    el('p', { class: 'sopra piccolo clienti-nota', testo: `I dati di chi condivide da qui stanno solo su questo computer, in «Delion/Clienti PT/<nome>» (non vanno su GitHub, non li vede nessun altro): la scheda e i check-in si leggono anche in Obsidian. ${d.claudio?.ce ? 'Quelli del gestionale della palestra (peso e misure, allenamenti, abbonamento) Mirion li legge dal gestionale su questo computer, senza copiarli nel cervello; lo stesso cliente si unisce dal nome. ' : ''}Sono dati sulla salute: si condividono solo con il consenso del cliente, che può smettere quando vuole.` }),
    d.claudio?.errore ? el('p', { class: 'sopra piccolo presto', testo: d.claudio.errore }) : null))
}

// la dashboard a card (Marco, 25-11-2026: «nella versione desktop usiamo le card»): sopra i clienti, tre card che dicono subito
// cosa fare: quello da guardare oggi (dolori, avvisi dall'app, messaggi senza risposta, chi è fermo), il cerchio della squadra
// e le sedute di oggi del percorso di ognuno. Gli stessi conti di Mirion Trainer sul telefono (trainer-oggi.js)
// ogni card con data-carta prende il suo ✦ per il colore (colora.js)
const colorate = box => { for (const c of box.querySelectorAll('[data-carta]')) colorabile(c, c.dataset.carta); return box }
function cruscotto (clienti) {
  const lista = daGuardare(clienti), sq = squadra(clienti)
  const oggi = clienti.filter(c => c.piatto?.allena?.percorso?.oggi)
  const vai = id => '#clienti?id=' + encodeURIComponent(id)
  return colorate(el('div', { class: 'clienti-cruscotto' },
    el('section', { class: 'fascia cruscotto-carta cruscotto-guarda', 'data-carta': 'trainer.guarda', 'aria-label': 'Da guardare oggi' },
      el('header', {}, el('h2', { testo: 'Da guardare oggi' }), el('span', { class: 'sopra piccolo', testo: lista.length ? `${lista.length} ${lista.length === 1 ? 'cosa' : 'cose'} · le più urgenti in cima` : 'tutto tranquillo' })),
      lista.length ? el('ul', { class: 'guarda-elenco' }, ...lista.slice(0, 6).map(v => el('li', { class: 'guarda-' + v.tipo.split('-')[0] + (v.peso >= 90 ? ' urgente' : '') },
        el('a', { href: vai(v.id) }, el('span', { class: 'guarda-icona', 'aria-hidden': 'true', testo: v.icona }),
          el('div', {}, el('small', { class: 'sopra', testo: [v.nome, quandoBreve(v.quando)].filter(Boolean).join(' · ') }), el('b', { testo: v.titolo }), v.testo ? el('p', { testo: v.testo }) : null)))))
        : el('p', { class: 'sopra', testo: 'Nessun dolore, nessun avviso, nessuno fermo. Quando un cliente scrive dall’app o segna un fastidio a fine seduta, compare qui.' })),
    el('section', { class: 'fascia cruscotto-carta cruscotto-cerchio', 'data-carta': 'trainer.cerchio', 'aria-label': 'Il cerchio della squadra' },
      el('header', {}, el('h2', { testo: 'Il cerchio della squadra' }), el('span', { class: 'sopra piccolo', testo: `${sq.allenati} su ${sq.clienti} allenati in settimana` })),
      el('div', { class: 'cruscotto-media' }, el('b', { testo: sq.cerchio ?? '–' }), el('span', { class: 'sopra', testo: sq.cerchio != null ? 'su 100, in media' : 'ancora nessun cerchio' }),
        sq.fastidi ? el('em', { class: 'presto', testo: `${sq.fastidi} ${sq.fastidi === 1 ? 'seduta' : 'sedute'} con un fastidio in 14 giorni` }) : null),
      sq.classifica.length ? el('ol', { class: 'cruscotto-classifica' }, ...sq.classifica.slice(0, 6).map(x => el('li', {},
        el('a', { href: vai(x.id) }, el('span', { testo: x.nome }), el('i', { style: { '--pieno': x.punteggio + '%' }, class: x.punteggio < 55 ? 'basso' : '' }), el('b', { testo: x.punteggio }))))) : null),
    el('section', { class: 'fascia cruscotto-carta cruscotto-oggi', 'data-carta': 'trainer.oggi', 'aria-label': 'Le sedute di oggi' },
      el('header', {}, el('h2', { testo: 'Le sedute di oggi' }), el('span', { class: 'sopra piccolo', testo: oggi.length ? 'dal percorso di ognuno' : '' })),
      oggi.length ? el('ul', { class: 'pasto-voci' }, ...oggi.slice(0, 7).map(c => { const pc = c.piatto.allena.percorso; return el('li', {}, el('a', { href: vai(c.id) }, el('span', { testo: c.nome }), el('small', { class: 'sopra', testo: `${pc.oggi}${pc.di ? ` · ${pc.fatti}/${pc.di} esercizi` : ''}` }))) }))
        : el('p', { class: 'sopra', testo: 'Quando i clienti scelgono un percorso in Mirion Fit (la scheda «Allena»), qui vedi la seduta di oggi di ognuno.' }))))
}

// Mirion Trainer sul telefono: l'indirizzo e il QR della pagina del trainer, sulla porta del telefono (Impostazioni → «Il telefono»)
async function trainerTelefono (fai) {
  const r = await fai({ azione: 'trainer-telefono' }); if (!r) return
  const chiudi = () => fondo.remove()
  const corpo = []
  // senza il computer (Marco, 26-11-2026 sera: «non può funzionare separatamente?» → «Sì, online da solo»): la web app su GitHub
  // Pages con una chiave per questo telefono; va da qualunque rete e a computer spento. Ogni QR è una chiave nuova (valgono le ultime 3)
  if (r.online) {
    const box = el('div', { class: 'trainer-online' })
    const crea = el('button', { type: 'button', class: 'primario', onclick: async () => {
      crea.disabled = true
      const o = await fai({ azione: 'trainer-online' }).catch(e => { notifica(e.message, { tipo: 'sempre' }); return null }); crea.disabled = false; if (!o) return
      const t = document.createElement('template'); t.innerHTML = o.qr
      box.replaceChildren(el('div', { class: 'invito-qr' }, t.content.firstChild),
        el('ol', { class: 'sopra trainer-passi' }, el('li', { testo: 'Inquadra il QR con la fotocamera del telefono: si apre Mirion Trainer, da qualunque rete.' }),
          el('li', { testo: 'Su iPhone: Condividi → «Aggiungi alla schermata Home». Su Android: menu ⋮ → «Aggiungi a schermata Home».' }),
          el('li', { testo: 'Funziona anche con il computer spento. Ogni QR vale per un telefono; restano validi gli ultimi 3.' })),
        el('button', { type: 'button', class: 'secondario', onclick: async () => { try { await navigator.clipboard.writeText(o.url); notifica('Link copiato: mandalo al tuo telefono.') } catch { notifica('Non riesco a copiare.') } } }, 'Copia il link'))
    } }, 'Crea il QR per il telefono')
    box.append(el('p', { class: 'sopra', testo: 'Consigliato: Mirion Trainer passa da Mirion Fit online, quindi si apre ovunque, anche fuori casa e mentre il computer si aggiorna. Vedi i clienti di Mirion Fit online.' }), crea)
    corpo.push(el('h3', { class: 'trainer-titoletto', testo: 'Senza il computer' }), box, el('h3', { class: 'trainer-titoletto', testo: 'Sulla Wi-Fi di casa' }))
  }
  if (!r.acceso) corpo.push(el('p', { class: 'sopra', testo: 'Prima accendi la porta del telefono: il telefono deve stare sulla stessa Wi-Fi del computer.' }),
    el('button', { type: 'button', class: 'primario', onclick: async () => { await fai({ azione: 'accendi' }).catch(() => {}); await api('/api/telefono', { azione: 'accendi' }).catch(e => notifica(e.message, { tipo: 'sempre' })); chiudi(); trainerTelefono(fai) } }, 'Accendi la porta del telefono'))
  else if (!r.url) corpo.push(el('p', { class: 'sopra', testo: 'Il computer non è su una rete Wi-Fi di casa: collegalo alla stessa rete del telefono e riprova.' }))
  else {
    const t = document.createElement('template'); t.innerHTML = r.qr
    corpo.push(el('div', { class: 'invito-qr' }, t.content.firstChild), el('code', { class: 'telefono-indirizzo invito-url', testo: r.url }),
      el('ol', { class: 'sopra trainer-passi' }, el('li', { testo: 'Inquadra il QR con il telefono (stessa Wi-Fi del computer).' }),
        el('li', { testo: r.telefoni ? 'Se il telefono è già abbinato si apre Mirion Trainer; se no scrivi il codice da Impostazioni → «Il telefono» → «Abbina un telefono».' : 'La prima volta chiede un codice: lo trovi in Impostazioni → «Il telefono» → «Abbina un telefono».' }),
        el('li', { testo: 'Dal menu del browser scegli «Aggiungi a schermata Home»: Mirion Trainer diventa un’app.' })))
  }
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo', onclick: e => { if (e.target === fondo) chiudi() } },
    el('section', { class: 'invito-scatola', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mirion Trainer sul telefono' },
      el('h2', { testo: 'Mirion Trainer sul telefono' }), el('p', { class: 'sopra piccolo', testo: 'I tuoi clienti, quello da guardare oggi, il cerchio, le sedute, la chat e la scheda: tutto dal telefono.' }), ...corpo,
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario', onclick: chiudi }, 'Chiudi'))))
  document.body.append(fondo)
}

// la card di un cliente: l'anteprima di Piatto, misurata come le card di Piatto
function cartaCliente (c, i) {
  const p = c.piatto, ck = c.checkin?.at(-1), f = fermo(c), k = c.claudio, pesi = pesiDi(c, p?.pesi), d30 = in30(pesi)
  const ab = abbonamento(k?.abbonamenti?.[0]), pross = k?.prossimi?.[0]
  const settimana = p?.allenati7 || k?.inPalestra7 ? Array.from({ length: 7 }, (_, j) => Boolean(p?.allenati7?.[j] || k?.inPalestra7?.[j])) : null
  return el('a', { class: 'cliente-carta fascia' + (f ? ' fermo' : ''), href: '#clienti?id=' + encodeURIComponent(c.id), style: { '--i': i }, 'aria-label': `${c.nome}: apri la sua pagina` },
    el('header', { class: 'cliente-testa' },
      el('span', { class: 'cliente-faccia-box' }, faccia(c), pallino(c)),
      el('div', {}, el('b', { testo: c.nome }), el('small', { class: 'sopra', testo: `${f ? 'fermo · ' : ''}aggiornato ${quando(c.ultimo)}` })),
      c.demo ? el('em', { class: 'cliente-demo', testo: 'prova' }) : null,
      f ? el('span', { class: 'cliente-stato presto', testo: c.ultimo ? `fermo da ${giorniDa(c.ultimo)} g` : 'mai' }) : el('span', { class: 'cliente-stato bene', testo: 'attivo' })),
    el('div', { class: 'cliente-fonti', title: 'Da dove arrivano i suoi dati' }, ...fonti(c).map(t => el('span', { testo: t })), k?.obiettivo ? el('small', { class: 'sopra', testo: k.obiettivo }) : null),
    p ? el('div', { class: 'cliente-piatto' },
      anello(p.mangiato?.kcal ?? 0, p.obiettivo?.kcal),
      el('div', { class: 'cliente-macro' }, ...[['proteine', 'P'], ['carboidrati', 'C'], ['grassi', 'G']].map(([k, t]) =>
        el('div', {}, el('small', { class: 'sopra', testo: `${t} ${n(p.mangiato?.[k])}/${n(p.obiettivo?.[k])} g` }), barra(p.mangiato?.[k], p.obiettivo?.[k], k))),
        el('div', {}, el('small', { class: 'sopra', testo: `Acqua ${virgola((p.acqua ?? 0) / 1000)}/${virgola((p.obiettivo?.acqua ?? 2000) / 1000)} l` }), barra(p.acqua, p.obiettivo?.acqua ?? 2000, 'acqua'))))
      : c.soloNota ? rigaNota(c.daNota) : k ? null : el('p', { class: 'sopra cliente-senza', testo: 'Mirion Fit non collegato: arrivano solo i check-in.' }),
    k ? el('div', { class: 'cliente-palestra' + (ab?.presto ? ' presto' : '') },
      ab ? el('div', {}, el('small', { class: 'sopra', testo: ab.testo }), ab.su ? barra(ab.fatto, ab.su, 'abbonamento') : null) : el('small', { class: 'sopra', testo: 'Nessun abbonamento nel gestionale' }),
      el('small', { class: 'sopra', testo: [`${k.ingressi28} ${k.ingressi28 === 1 ? 'giorno' : 'giorni'} in palestra in 4 settimane`, pross ? `prossimo: ${giorno(pross.data)}${pross.ora ? ' ' + pross.ora : ''}, ${pross.cosa}` : null].filter(Boolean).join(' · ') })) : null,
    el('div', { class: 'cliente-fila' },
      el('div', {}, el('small', { class: 'sopra', testo: 'Peso' }), el('b', { testo: `${virgola(pesi.at(-1)?.kg ?? p?.peso?.attuale)} kg` }),
        d30 != null ? el('small', { class: 'sopra', testo: `${segno(d30)} in 30 g` }) : null),
      linea(pesi.slice(-12)),
      settimana ? el('div', { class: 'cliente-settimana', title: 'Gli ultimi 7 giorni: allenamenti in Mirion Fit, ingressi e allenamenti nel gestionale' }, el('small', { class: 'sopra', testo: 'Allenamenti' }), el('span', {}, ...settimana.map(si => el('i', { class: si ? 'si' : '' })))) : null),
    fitRiga(p),
    ck ? el('div', { class: 'cliente-checkin' }, el('span', { class: 'cliente-umore', testo: UMORI[ck.umore] || '💬' }),
      el('div', {}, el('small', { class: 'sopra', testo: 'Check-in · ' + quando(ck.quando) }), el('p', { testo: ck.messaggio || [ck.allenamento, ck.peso ? ck.peso + ' kg' : null].filter(Boolean).join(' · ') || 'senza note' }))) : null)
}

// un allievo dalle note del cervello (server/clienti.mjs, allieviDalleNote): nella card l'obiettivo, il pacchetto e l'ultima seduta
function rigaNota (a) {
  const pac = a?.pacchetto
  return el('div', { class: 'cliente-nota' },
    a?.obiettivo ? el('small', { class: 'sopra', testo: '🎯 ' + a.obiettivo }) : null,
    pac ? el('div', {}, el('small', { class: 'sopra', testo: [pac.nome, pac.sedute ? `${pac.fatte ?? 0} fatte su ${pac.sedute}` : null, pac.scade ? `scade il ${giorno(pac.scade)}` : null].filter(Boolean).join(' · ') }), pac.sedute ? barra(pac.fatte ?? 0, pac.sedute, 'abbonamento') : null) : null,
    el('small', { class: 'sopra', testo: [a?.ultimaSeduta ? `ultima seduta ${giorno(a.ultimaSeduta)}` : null, 'senza Mirion Fit: invitalo con il QR'].filter(Boolean).join(' · ') }))
}
// la card «Dalla sua nota» nella pagina del cliente: quello che l'IA ha trovato nei file del trainer, e la nota da aprire
function cartaNota (a) {
  const pac = a.pacchetto, m = [...(a.misure ?? [])].sort((x, y) => x.data.localeCompare(y.data)), u = m.at(-1)
  const MIS = [['vita', 'Vita', 'cm'], ['fianchi', 'Fianchi', 'cm'], ['petto', 'Petto', 'cm'], ['braccio', 'Braccio', 'cm'], ['coscia', 'Coscia', 'cm'], ['grasso', 'Massa grassa', '%']]
  return carta('Dalla sua nota', { larga: true, sopra: 'dai file del trainer, ordinati dall’IA' },
    el('ul', { class: 'pasto-voci' },
      a.obiettivo ? el('li', {}, el('span', { testo: 'Obiettivo' }), el('small', { class: 'sopra', testo: a.obiettivo })) : null,
      pac ? el('li', {}, el('span', { testo: 'Pacchetto' }), el('small', { class: 'sopra', testo: [pac.nome, pac.sedute ? `${pac.fatte ?? 0} fatte su ${pac.sedute}` : null, pac.scade ? `scade il ${giorno(pac.scade)}` : null].filter(Boolean).join(' · ') })) : null,
      a.ultimaSeduta ? el('li', {}, el('span', { testo: 'Ultima seduta' }), el('small', { class: 'sopra', testo: giorno(a.ultimaSeduta) })) : null,
      a.telefono ? el('li', {}, el('span', { testo: 'Telefono' }), el('small', { class: 'sopra', testo: a.telefono })) : null),
    u ? el('div', { class: 'cliente-misure' }, ...MIS.filter(([k]) => Number.isFinite(u[k])).map(([k, t, unita]) => {
      const s = m.filter(x => Number.isFinite(x[k])), diff = s.length >= 2 ? Math.round((u[k] - s[0][k]) * 10) / 10 : null
      return el('div', { class: 'cliente-misura' }, el('small', { class: 'sopra', testo: t }), el('b', { testo: `${virgola(u[k])} ${unita}` }), el('small', { class: 'sopra', testo: diff != null ? `${diff === 0 ? 'uguale' : segno(diff)} dal ${giorno(s[0].data)}` : giorno(u.data) }))
    })) : null,
    el('div', { class: 'bottoni' }, obsidian(a.nota)))
}

// le schede di Mirion Trainer (schede-trainer.js): «I tuoi clienti» e, per il titolare della palestra, «La palestra»
function schedeFit (d, attiva) { eTitolare(d); accendiVoce(); return schedeTrainer(attiva) }

// La palestra (Marco, 24-11: «la parte palestra dove vede tutti i personal trainer… come sta seguendo i suoi clienti deve rimanere
// suo, privato»): i personal trainer, ognuno con i suoi numeri (quanti clienti, quanti attivi, gli inviti in attesa, quando la sua
// Mirion si è collegata). Chi sono i clienti e come li segue lo vede solo lui: qui non arriva nessun nome e nessun dato dei clienti
function vistaPalestra (stanza, d, rifai) {
  const fai = async (corpo, detto) => { try { const r = await api('/api/clienti', corpo); if (detto) notifica(detto); return r } catch (e) { notifica(e.message, { tipo: 'sempre' }) } }
  // il cruscotto di Marco (26-11: «vedo quanti utenti la stanno usando e le informazioni… per togliere o dare accessi»): quanti usano
  // Mirion Fit (solo numeri), e per ogni trainer come entra e gli accessi da sospendere, spegnere, togliere o riaprire
  const tutti = d.online?.trainer ?? [], lista = tutti.filter(t => !t.tolto), tolti = tutti.filter(t => t.tolto)
  const zero = { clienti: 0, attivi1: 0, attivi7: 0, attivi30: 0, invitati: 0 }, mie = { ...zero, ...(d.online?.io?.numeri ?? {}) }
  const tot = lista.reduce((t, x) => Object.fromEntries(Object.keys(zero).map(k => [k, t[k] + (x[k] ?? 0)])), { ...mie })
  const attivi = lista.filter(t => !t.sospeso)
  stanza.replaceChildren(el('div', { class: 'clienti palestra-fit' },
    schedeFit(d, 'palestra'),
    el('header', { class: 'clienti-cima' }, el('div', {}, el('p', { class: 'sopra', testo: TRAINER + ' · la palestra' }), el('h1', { class: 'clienti-club', testo: d.club })),
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario', title: 'La licenza di Mirion Trainer per un altro trainer: dentro «Dai la licenza a un altro trainer»', onclick: () => qrApp(fai) }, ic('user-plus'), 'Dai una licenza'))),
    el('div', { class: 'clienti-cifre' },
      ...[[tot.attivi1, 'clienti attivi oggi', tot.attivi1 ? 'bene' : ''], [tot.attivi7, 'attivi negli ultimi 7 giorni'], [tot.attivi30, 'attivi negli ultimi 30 giorni'], [tot.clienti, 'clienti in tutto'],
        [attivi.length + 1, 'personal trainer attivi, tu compreso'], [tot.invitati, 'inviti non ancora accettati', tot.invitati ? 'presto' : '']].map(([v, t, cls], i) =>
        el('div', { class: 'cifra clienti-cifra ' + (cls ?? ''), style: { '--i': i } }, conta(el('b'), v), el('span', { testo: t })))),
    el('section', { class: 'fascia clienti-trainer' },
      el('header', {}, el('h2', { testo: 'I personal trainer e i loro accessi' }), el('span', { class: 'sopra piccolo', testo: 'come entrano e quando si sono collegati' })),
      el('ul', { class: 'trainer-lista' },
        el('li', { class: 'trainer-tu' }, el('b', { testo: 'Tu (' + d.club + ')' }), el('small', { class: 'sopra', testo: numeriTrainer(mie) }), el('a', { class: 'secondario piccolo', href: '#clienti' }, 'I tuoi clienti')),
        ...lista.map(t => trainerRiga(t, fai, rifai))),
      lista.length ? null : el('p', { class: 'vuoto', testo: 'Ancora nessun personal trainer: dagli una licenza (in alto) o aggiungilo qui sotto con una chiave.' }),
      aggiungiTrainer(fai, rifai)),
    tolti.length ? el('section', { class: 'fascia clienti-trainer' },
      el('header', {}, el('h2', { testo: 'Tolti' }), el('span', { class: 'sopra piccolo', testo: 'chi entrava con la licenza si può riaprire (senza i clienti di prima)' })),
      el('ul', { class: 'trainer-lista' }, ...tolti.map(t => trainerRiga(t, fai, rifai)))) : null,
    el('p', { class: 'sopra piccolo clienti-nota', testo: 'Qui vedi solo numeri: quanti clienti ha ogni trainer e quanti usano l’app. Chi sono i clienti, i loro dati e i messaggi li vede solo il loro trainer: i clienti hanno dato il consenso a lui. Sospendere ferma il trainer e lascia i clienti; togliere chiude anche i link dei suoi clienti e cancella i loro dati online.' })))
}
const numeriTrainer = x => `${x.clienti} ${x.clienti === 1 ? 'cliente' : 'clienti'} · ${x.attivi7} attivi in 7 giorni${x.invitati ? ` · ${x.invitati} inviti in attesa` : ''}`
export function aggiungiTrainer (fai, rifai) {
  const campo = el('input', { placeholder: 'Il nome del personal trainer, es. Luca Rossi', maxlength: 40, 'aria-label': 'Il nome del personal trainer nuovo' })
  const aggiungi = async () => { const nome = campo.value.trim(); if (!nome) return campo.focus(); const r = await fai({ azione: 'trainer-aggiungi', nome }); if (r?.chiave) chiaveTrainer(r, rifai) }
  return el('form', { class: 'trainer-nuovo', onsubmit: e => { e.preventDefault(); aggiungi() } }, campo, el('button', { type: 'submit', class: 'secondario' }, ic('user-plus'), 'Aggiungi un personal trainer'))
}

// i trainer della palestra (Marco, 24-11: «fai che Piatto regga più trainer»): solo nella Mirion del titolare. Ogni trainer ha la
// sua Mirion e i suoi clienti; qui il nome, come entra (licenza o chiave), i numeri e i bottoni degli accessi (26-11)
export function trainerRiga (t, fai, rifai) {
  const quando = x => new Date(x).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const bottone = (testo, corpo, detto, conferma) => {
    let sicuro = !conferma
    const b = el('button', { type: 'button', class: 'secondario piccolo', testo })
    b.onclick = async () => {
      if (!sicuro) { sicuro = true; b.textContent = conferma; return }
      b.disabled = true; const r = await fai(corpo, detto); if (r) rifai(); else b.disabled = false
    }
    return b
  }
  const entra = t.firma ? (t.scade ? `licenza fino al ${new Date(t.scade).toLocaleDateString('it-IT')}` : 'licenza senza scadenza') : 'chiave'
  const stato = t.tolto ? `tolto il ${new Date(t.tolto).toLocaleDateString('it-IT')}` : t.sospeso ? `sospeso dal ${new Date(t.sospeso).toLocaleDateString('it-IT')}` : t.visto ? 'collegato ' + quando(t.visto) : 'non si è ancora collegato'
  const testo = [t.tolto ? null : numeriTrainer({ clienti: t.clienti ?? 0, attivi7: t.attivi7 ?? 0, invitati: t.invitati ?? 0 }), entra, stato, `dal ${new Date(t.creato).toLocaleDateString('it-IT')}`].filter(Boolean).join(' · ')
  const bottoni = t.tolto
    ? [t.firma ? bottone('Riapri', { azione: 'trainer-riattiva', id: t.id }, `${t.nome} può entrare di nuovo.`) : null]
    : [t.sospeso ? bottone('Riattiva', { azione: 'trainer-riattiva', id: t.id }, `${t.nome} può entrare di nuovo.`) : bottone('Sospendi', { azione: 'trainer-sospendi', id: t.id }, `${t.nome} è sospeso: i suoi clienti restano.`, `Sì, sospendi ${t.nome}`),
      bottone('Togli', { azione: 'trainer-togli', id: t.id }, `${t.nome} non è più nella palestra.`, t.clienti ? `Sì, togli ${t.nome}: i suoi ${t.clienti} clienti perdono il link` : `Sì, togli ${t.nome}`)]
  return el('li', { class: t.sospeso || t.tolto ? 'trainer-fermo' : '' }, el('b', { testo: t.nome }), el('small', { class: 'sopra', testo }), ...bottoni.filter(Boolean))
}
// la chiave del trainer nuovo: si vede solo adesso, va scritta nella sua Mirion
function chiaveTrainer (r, rifai) {
  const chiudi = () => { fondo.remove(); rifai() }
  const copia = el('button', { type: 'button', class: 'secondario', onclick: async () => { try { await navigator.clipboard.writeText(`${r.sito}\n${r.chiave}`); copia.textContent = 'Copiati' } catch { copia.textContent = 'Non riesco a copiarli: selezionali a mano' } } }, 'Copia i due valori')
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo', onclick: e => { if (e.target === fondo) chiudi() } },
    el('section', { class: 'invito-scatola', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Il trainer nuovo' },
      el('h2', { testo: `${r.nome} è nella palestra` }),
      el('p', { class: 'sopra', testo: `Nella Mirion di ${r.nome}: Impostazioni → «Collegamenti e chiavi» → Mirion Fit online. Scrivi questi due valori e salva: da lì invita i suoi clienti, e li vede solo lui.` }),
      el('small', { class: 'sopra', testo: 'L’indirizzo di Mirion Fit online' }), el('code', { class: 'telefono-indirizzo invito-url', testo: r.sito }),
      el('small', { class: 'sopra', testo: 'La chiave del trainer' }), el('code', { class: 'telefono-indirizzo invito-url', testo: r.chiave }),
      el('p', { class: 'sopra piccolo presto', testo: 'La chiave si vede solo adesso: dagliela di persona o in un messaggio privato. Se la perde, toglilo e aggiungilo di nuovo.' }),
      el('div', { class: 'bottoni' }, copia, el('button', { type: 'button', class: 'primario', onclick: chiudi }, 'Fatto'))))
  document.body.append(fondo)
}

// l'invito: il QR da far inquadrare, grande, e l'indirizzo per chi preferisce scriverlo
async function invita (fai, azione = 'invita') {
  const r = await fai({ azione }); if (!r) return
  const t = document.createElement('template'); t.innerHTML = r.qr
  const codice = r.online ? ((/[?&]k=([\w.~-]+)/.exec(r.url) || [])[1] ?? '') : ''
  const copia = async (x, detto) => { try { await navigator.clipboard.writeText(x); notifica(detto) } catch { notifica('Non riesco a copiare: seleziona il testo e copialo.', { tipo: 'sempre' }) } }
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } },
    el('section', { class: 'invito-scatola', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Invita un cliente' },
      el('h2', { testo: 'Fallo inquadrare al cliente' }),
      el('div', { class: 'invito-qr' }, t.content.firstChild),
      el('p', { class: 'sopra', testo: r.online ? 'Mirion Fit online: è il suo link personale, vale finché non smetti di seguirlo. Su iPhone lo apre con Safari e lo aggiunge alla schermata Home; su Android «Installa». Compare qui quando ha dato il consenso.' : `Col telefono sulla stessa rete Wi-Fi. Vale una volta, fino a domani alle ${new Date(r.scade).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.` }),
      el('code', { class: 'telefono-indirizzo invito-url', testo: r.url }),
      // il codice, come sul telefono (26-11-2026): chi ha già Mirion Fit lo incolla in «Trainer»
      codice ? el('p', { class: 'sopra piccolo', testo: 'Il codice (Mirion Fit → Trainer → incollalo):' }) : null, codice ? el('code', { class: 'telefono-indirizzo invito-url invito-codice', testo: codice }) : null,
      el('div', { class: 'bottoni' },
        el('button', { type: 'button', class: 'secondario', onclick: () => copia(r.url, 'Link copiato: mandalo al cliente.') }, ic('copy'), 'Copia il link'),
        codice ? el('button', { type: 'button', class: 'secondario', onclick: () => copia(codice, 'Codice copiato.') }, ic('copy'), 'Copia il codice') : null,
        el('button', { type: 'button', class: 'primario', onclick: () => { fondo.remove(); location.hash = '#clienti'; dispatchEvent(new HashChangeEvent('hashchange')) } }, 'Fatto'))))
  document.body.append(fondo)
}

// il QR che installa e apre l'app Mirion Fit per Android (25-11, Marco: «il qr code lo metti in mirion trainer, assicurati che
// nessuno possa copiare l'app»): porta alla pagina su GitHub con dentro il codice firmato che apre l'app (server/licenza-fit.mjs).
// L'app scaricata senza questo QR resta chiusa. Senza licenza qui si vede il codice trainer da mandare a Marco e dove incollarla;
// sulla Mirion di Marco anche come dare la licenza a un altro trainer.
export async function qrApp (fai) {
  const r = await fai({ azione: 'qr-app' }); if (!r) return
  const chiudi = () => fondo.remove()
  const corpo = []
  if (r.qr) {
    const t = document.createElement('template'); t.innerHTML = r.qr
    corpo.push(el('div', { class: 'invito-qr' }, t.content.firstChild),
      el('p', { class: 'sopra', testo: 'Il cliente lo inquadra con il telefono, iPhone o Android: si apre Mirion Fit già attiva e la aggiunge alla schermata Home. Il QR vale 14 giorni; senza QR l’app resta chiusa.' }))
  } else {
    const s = r.stato ?? {}, campo = el('textarea', { rows: 3, class: 'licenza-campo', placeholder: 'Incolla qui la licenza che ti ha dato Marco', 'aria-label': 'La licenza di Mirion Trainer' })
    corpo.push(el('p', { class: 'sopra', testo: s.licenza?.scaduta ? `La tua licenza di Mirion Trainer è scaduta il ${s.licenza.scade}: chiedine una nuova a Marco.` : 'Per dare l’app ai tuoi clienti serve la licenza di Mirion Trainer. Manda a Marco questo codice trainer: lui ti dà la licenza da incollare qui sotto.' }),
      el('code', { class: 'telefono-indirizzo invito-url', testo: s.codiceTrainer ?? '' }),
      campo,
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'primario', onclick: async () => { if (await fai({ azione: 'licenza-fit', licenza: campo.value }, 'Licenza salvata.')) { chiudi(); qrApp(fai) } } }, 'Salva la licenza')))
  }
  // sulla Mirion di Marco: la licenza per un altro trainer
  if (r.stato?.marco) {
    const codice = el('input', { placeholder: 'Il codice trainer (43 caratteri)', 'aria-label': 'Il codice del trainer' }), nome = el('input', { placeholder: 'Il nome del trainer', maxlength: 60, 'aria-label': 'Il nome del trainer' })
    const scade = el('input', { type: 'date', 'aria-label': 'Vale fino al' }), esito = el('code', { class: 'telefono-indirizzo invito-url', hidden: true })
    corpo.push(el('details', { class: 'licenza-altro' }, el('summary', { testo: 'Dai la licenza a un altro trainer' }),
      el('p', { class: 'sopra piccolo', testo: 'Lui ti manda il codice trainer che vede nella sua Mirion; tu gli mandi la licenza. Senza data vale per sempre.' }),
      codice, nome, scade,
      el('button', { type: 'button', class: 'secondario', onclick: async () => { const x = await fai({ azione: 'licenza-fit-per', codice: codice.value, nome: nome.value, scade: scade.value }); if (x) { esito.textContent = x.licenza; esito.hidden = false; navigator.clipboard?.writeText(x.licenza).then(() => notifica('Licenza copiata: mandala al trainer.')).catch(() => {}) } } }, 'Fai la licenza'),
      esito))
  }
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo', onclick: e => { if (e.target === fondo) chiudi() } },
    el('section', { class: 'invito-scatola', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Installa Mirion Fit' },
      el('h2', { testo: 'Installa Mirion Fit' }), ...corpo,
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: r.qr ? 'primario' : 'secondario', onclick: chiudi }, r.qr ? 'Fatto' : 'Chiudi'))))
  document.body.append(fondo)
}

// la pagina completa di un cliente: le card di Piatto (solo da leggere) e quelle dei check-in
async function paginaCliente (stanza, id) {
  scrollTo(0, 0)
  accendiVoce()
  stanza.replaceChildren(el('p', { class: 'vuoto', testo: 'Leggo…' }))
  let c
  try { c = await api('/api/clienti/uno?id=' + encodeURIComponent(id)) } catch (e) { return stanza.replaceChildren(el('p', { class: 'vuoto', testo: e.message }), el('a', { href: '#clienti', testo: 'Torna ai clienti' })) }
  const p = c.piatto, comp = p?.completo ?? {}, ck = c.checkin ?? [], ob = p?.obiettivo ?? {}, m = p?.mangiato ?? {}, k = c.claudio
  const giorni = comp.giorni ?? [], PASTI = [['colazione', 'Colazione'], ['pranzo', 'Pranzo'], ['cena', 'Cena'], ['spuntini', 'Spuntini']]
  const pesi = pesiDi(c, comp.pesi), d30 = in30(pesi)
  const settimane = [0, 1, 2, 3].map(i => giorni.slice(-28).slice(i * 7, i * 7 + 7))
  const carte = [
    p ? carta('Oggi', { sopra: `${p.giorno ?? ''} · arrivato ${quando(p.ricevuto)}` }, el('div', { class: 'cliente-oggi' }, anello(m.kcal ?? 0, ob.kcal, true),
      el('div', { class: 'pagina-macro' }, ...[['proteine', 'Proteine'], ['carboidrati', 'Carboidrati'], ['grassi', 'Grassi']].map(([k, t]) => el('div', {}, el('small', { class: 'sopra', testo: `${t} ${n(m[k])} / ${n(ob[k])} g` }), barra(m[k], ob[k], k))),
        el('div', {}, el('small', { class: 'sopra', testo: `Acqua ${virgola((p.acqua ?? 0) / 1000)} / ${virgola((ob.acqua ?? 2000) / 1000)} l` }), barra(p.acqua, ob.acqua ?? 2000, 'acqua'))))) : null,
    p ? carta('I pasti di oggi', { larga: true }, el('div', { class: 'cliente-pasti' }, ...PASTI.map(([k, t]) => el('div', {}, el('b', { testo: `${t} · ${n(p.perPasto?.[k]?.kcal)} kcal` }),
      (p.pasti?.[k] ?? []).length ? el('ul', { class: 'pasto-voci' }, ...p.pasti[k].map(v => el('li', {}, el('span', { testo: `${v.nome} · ${n(v.grammi)} g` }), el('small', { class: 'sopra', testo: `${n(v.kcal)} kcal` })))) : el('p', { class: 'vuoto', testo: 'niente' }))))) : null,
    giorni.length ? carta('Calorie giorno per giorno', { larga: true, sopra: ob.kcal ? 'la linea è l’obiettivo' : '' }, colonne(giorni.slice(-28).map(x => ({ etichetta: String(Number(x.giorno.slice(8))), valore: x.kcal, titolo: `${x.giorno}: ${n(x.kcal)} kcal` })), ob.kcal)) : null,
    pesi.length || !k ? carta('Peso', { sopra: [d30 != null ? `${segno(d30)} kg in 30 giorni` : null, `da ${fonti(c).join(', ')}`].filter(Boolean).join(' · ') }, grafico(pesi, p?.peso?.obiettivo)) : null,
    ...carteAllenamenti(p),
    ...carteFit(c, p, comp, () => paginaCliente(stanza, id)),
    ...(k ? carteClaudio(k) : []),
    giorni.length ? carta(k ? 'Allenamenti in Mirion Fit: 4 settimane' : 'Allenamento: le ultime 4 settimane', { sopra: 'kg sollevati per settimana' }, colonne(settimane.map((s, i) => ({ etichetta: i === 3 ? 'questa' : `−${3 - i}`, valore: s.reduce((t, x) => t + (+x.allenamento?.volume || 0), 0) })))) : null,
    p?.esercizi?.length ? carta('Gli esercizi di oggi', {}, el('ul', { class: 'pasto-voci' }, ...p.esercizi.map(e => el('li', {}, el('span', { testo: e.nome }), el('small', { class: 'sopra', testo: (e.elenco ?? []).map(s => `${s.ripetizioni}×${s.kg || 0}`).join(', ') || `${e.serie} serie` }))))) : null,
    giorni.length ? carta('Acqua: gli ultimi 7 giorni', { sopra: 'litri' }, colonne(giorni.slice(-7).map(x => ({ etichetta: new Date(x.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'narrow' }), valore: x.acqua })), ob.acqua)) : null,
    // le card in più, dai check-in: come sta, e quello che scrive
    ck.some(k => k.umore) ? carta('Come sta', { sopra: 'dai check-in' }, colonne(ck.filter(k => k.umore).slice(-14).map(k => ({ etichetta: UMORI[k.umore], valore: k.umore, titolo: `${k.quando.slice(0, 10)}: ${k.umore}/5` })), 5)) : null,
    c.daNota ? cartaNota(c.daNota) : null,
    c.soloClaudio || c.soloNota ? null : carta('I check-in', { larga: true, sopra: `${ck.length} in tutto` }, ck.length ? el('ul', { class: 'cliente-checkin-elenco' }, ...[...ck].reverse().slice(0, 30).map(k => el('li', {},
      el('span', { class: 'cliente-umore', testo: UMORI[k.umore] || '💬' }),
      el('div', {}, el('small', { class: 'sopra', testo: new Date(k.quando).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }),
        el('p', { testo: [k.peso ? `${virgola(k.peso)} kg` : null, k.allenamento ? `${k.allenamento}${k.minuti ? ` (${k.minuti} min)` : ''}` : (k.minuti ? `${k.minuti} min di allenamento` : null)].filter(Boolean).join(' · ') || '' }),
        k.messaggio ? el('blockquote', { testo: k.messaggio }) : null)))) : el('p', { class: 'vuoto', testo: 'Ancora nessuno.' })),
  ]
  stanza.replaceChildren(el('div', { class: 'pagina-completa pagina-piatto' },
    el('header', { class: 'pagina-cima pagina-piatto-cima' },
      el('a', { class: 'secondario piccolo', href: '#clienti' }, ic('arrow-left'), 'Clienti'),
      el('span', { class: 'cliente-faccia-box grande' }, faccia(c, true), pallino(c)),
      el('div', {}, el('h1', { testo: c.nome }), el('small', { class: 'sopra', testo: [c.soloClaudio ? 'nel gestionale della palestra' : c.soloNota ? 'dalla sua nota nel cervello · senza l’app Mirion Fit' : `condivide dal ${new Date(c.consenso).toLocaleDateString('it-IT')}`, `dati da ${fonti(c).join(', ') || 'niente, per ora'}`, k?.obiettivo || null, c.cartella, c.demo ? 'inventato, per la prova' : null].filter(Boolean).join(' · ') })),
      c.soloClaudio || c.soloNota ? null : el('button', { type: 'button', class: 'quieto piccolo', style: { marginLeft: 'auto' }, onclick: async () => { try { await api('/api/clienti', { azione: 'togli', id: c.id }); notifica(`Non segui più ${c.nome}: i suoi dati restano nel cervello.`); location.hash = '#clienti' } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, 'Smetti di seguire')),
    c.online ? chatCliente(c, id) : null,
    el('div', { class: 'pagina-griglia clienti-pagina' }, ...carte.filter(Boolean).map((x, i) => { x.style.setProperty('--i', i); return x })),
    c.soloClaudio ? el('p', { class: 'sopra piccolo clienti-nota', testo: 'Questi dati arrivano dal gestionale della palestra (Mirion Fit · Palestra): si cambiano lì. Se questa persona condivide anche da Mirion (con il QR), le due schede si uniscono da sole quando il nome è lo stesso; se no lo scegli nella sua pagina.' })
      : c.scelte?.length ? abbinaClaudio(c, stanza, id) : null))
}

// ——— Gli allenamenti di Mirion Fit (Marco, 25-11-2026: «delineiamo la parte della comunicazione con il trainer», «cerchio
// prestazioni in base agli allenamenti»): il cerchio, il percorso del cliente, com'è andata ogni seduta e gli avvisi ———
const TEMI = { domanda: 'Domanda su un esercizio', dolore: 'Dolore o fastidio', scheda: 'Vuole cambiare la scheda', salto: 'Salta un allenamento', allenamento: 'Com’è andato l’allenamento' }
const FASTIDI = { spalla: 'spalla', schiena: 'schiena', ginocchio: 'ginocchio', gomito: 'gomito o polso', anca: 'anca', altro: 'altro' }
const escSvg = v => String(v ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]))
// lo stesso disegno di Mirion Fit (card.js, cerchio): sei spicchi pieni quanto le serie a settimana, al centro il punteggio
// Il cerchio delle prestazioni a esagono, come su Mirion Fit (Marco, 26-11-2026: «diagramma esagonale sul cerchio prestazione e
// suddividilo in sotto settori per muscoli presi, stile stats … fasce di colori più specifiche»): ogni gruppo è uno spicchio, diviso
// nei suoi muscoli; ogni muscolo si riempie verso il bordo con il colore della sua fascia; la linea bianca unisce i gruppi.
export const FASCE_FIT = [[0.25, 'f1', 'da cominciare'], [0.5, 'f2', 'poco'], [0.75, 'f3', 'a metà'], [1, 'f4', 'quasi'], [Infinity, 'f5', 'pieno']]
const fascia5 = p => FASCE_FIT.find(([x]) => p < x)[1]
const virg = v => String(Math.round((+v || 0) * 10) / 10).replace('.', ',')
export function cerchioSvg (pr) {
  const c = 110, R = 92, gr = Array.isArray(pr.gruppi) ? pr.gruppi.slice(0, 8) : [], n = Math.max(3, gr.length)
  const vert = (i, r = R) => { const a = (i * 2 * Math.PI) / n - Math.PI / 2 - Math.PI / n; return [c + r * Math.cos(a), c + r * Math.sin(a)] }
  const P = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`, lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const pieno = v => Math.max(0, Math.min(1, +v || 0))
  const griglia = [0.25, 0.5, 0.75, 1].map(f => `<polygon class="esa-riga ${f === 1 ? 'bordo' : ''}" points="${Array.from({ length: n }, (_, i) => P(vert(i, R * f))).join(' ')}"/>`).join('')
  const raggi = Array.from({ length: n }, (_, i) => { const [x, y] = vert(i); return `<line class="esa-raggio" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>` }).join('')
  const parti = gr.map((g, i) => {
    const A = vert(i), B = vert(i + 1), mus = Array.isArray(g.muscoli) && g.muscoli.length ? g.muscoli : [{ nome: g.nome, serie: g.serie, obiettivo: g.obiettivo, pieno: g.pieno }]
    const sotto = mus.map((m, j) => {
      const a = lerp(A, B, j / mus.length), b = lerp(A, B, (j + 1) / mus.length), f = pieno(m.pieno)
      return `<polygon class="esa-sotto" points="${c},${c} ${P(a)} ${P(b)}"/>${f > 0.01 ? `<polygon class="esa-pieno ${fascia5(+m.pieno || 0)}" points="${c},${c} ${P(lerp([c, c], a, f))} ${P(lerp([c, c], b, f))}"><title>${escSvg(m.nome)}: ${virg(m.serie)} serie a settimana su ${virg(m.obiettivo)}</title></polygon>` : ''}${j ? `<line class="esa-taglio" x1="${c}" y1="${c}" x2="${a[0].toFixed(1)}" y2="${a[1].toFixed(1)}"/>` : ''}`
    }).join('')
    const et = lerp([c, c], lerp(A, B, 0.5), 1.2)
    return `<g class="esa-gruppo ${g.id === pr.debole ? 'debole' : ''}">${sotto}<text x="${et[0].toFixed(1)}" y="${et[1].toFixed(1)}" class="cerchio-nome" text-anchor="middle" dominant-baseline="middle">${escSvg(g.nome)}</text></g>`
  }).join('')
  const linea = gr.map((g, i) => P(lerp([c, c], lerp(vert(i), vert(i + 1), 0.5), Math.max(0.04, pieno(g.pieno))))).join(' ')
  const box = el('figure', { class: 'cerchio-fit esagono' })
  box.innerHTML = `<svg viewBox="-18 -6 256 232" role="img" aria-label="Cerchio prestazioni: ${escSvg(pr.punteggio)} su 100">${parti}${griglia}${raggi}${gr.length ? `<polygon class="esa-linea" points="${linea}"/>` : ''}<circle cx="${c}" cy="${c}" r="25" class="esa-centro"/><text x="${c}" y="${c + 4}" class="cerchio-punti" text-anchor="middle">${escSvg(pr.punteggio)}</text><text x="${c}" y="${c + 17}" class="cerchio-sotto" text-anchor="middle">su 100</text></svg>` +
    `<figcaption class="esa-legenda">${FASCE_FIT.map(([x, k, nome], i) => `<span><i class="${k}"></i>${i < 4 ? `fino al ${Math.round(x * 100)}%` : '100%'} · ${nome}</span>`).join('')}</figcaption>`
  return box
}
const giornoCorto = g => new Date(g + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
function carteAllenamenti (p) {
  if (!p) return []
  const pr = p.prestazioni, pc = p.percorso, ses = Array.isArray(p.sessioni) ? p.sessioni : [], av = Array.isArray(p.avvisi) ? p.avvisi : []
  const deb = pr?.gruppi?.find(g => g.id === pr.debole)
  const fastidi = ses.filter(s => s.fastidio)
  return [
    av.length ? carta('Gli avvisi dall’app', { sopra: `${av.length} · i più recenti in cima` }, el('ul', { class: 'cliente-checkin-elenco' }, ...[...av].reverse().slice(0, 8).map(a => el('li', {},
      el('span', { class: 'cliente-umore', testo: a.tema === 'dolore' ? '🩹' : a.tema === 'salto' ? '⏸️' : a.tema === 'scheda' ? '📋' : '💬' }),
      el('div', {}, el('small', { class: 'sopra', testo: [TEMI[a.tema], a.quando ? new Date(a.quando).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · ') }), el('p', { testo: a.testo })))))) : null,
    pr?.serie ? carta('Cerchio prestazioni', { sopra: `ultime ${pr.settimane ?? 4} settimane · ${pr.sedute} sedute · costanza ${pr.costanza}%` }, cerchioSvg(pr),
      el('p', { class: 'sopra piccolo', testo: `Multiarticolari ${pr.multi}% delle serie · carichi liberi ${pr.liberi}% · macchine ${pr.macchine}%.${deb ? ` Da spingere: ${deb.nome.toLowerCase()} (${String(deb.serie).replace('.', ',')} serie a settimana su ${deb.obiettivo}).` : ''}` }),
      pr.record?.length ? el('ul', { class: 'pasto-voci' }, ...pr.record.map(r => el('li', {}, el('span', { testo: r.nome }), el('small', { class: 'sopra', testo: `massimale stimato ${String(r.kg).replace('.', ',')} kg${r.prima ? ` (${r.kg >= r.prima ? '+' : ''}${String(Math.round((r.kg - r.prima) * 10) / 10).replace('.', ',')})` : ''}` })))) : null) : null,
    ses.length ? carta('Com’è andata ogni seduta', { larga: true, sopra: fastidi.length ? `${fastidi.length} con un fastidio` : 'fatica da 1 a 10' }, el('ul', { class: 'cliente-checkin-elenco' }, ...ses.slice(0, 10).map(s => el('li', { class: s.fastidio ? 'con-fastidio' : '' },
      el('span', { class: 'cliente-umore', testo: s.fatica ? String(s.fatica) : '–', title: 'fatica' }),
      el('div', {}, el('small', { class: 'sopra', testo: [giornoCorto(s.giorno), s.seduta].filter(Boolean).join(' · ') }),
        el('p', { testo: [s.fatica ? `fatica ${s.fatica}/10` : 'non ha detto com’è andata', s.fastidio ? `fastidio: ${FASTIDI[s.fastidio] ?? s.fastidio}` : null].filter(Boolean).join(' · ') }),
        s.nota ? el('blockquote', { testo: s.nota }) : null))))) : null,
    pc ? carta('Il suo percorso', { sopra: [pc.libreria ? 'dalla libreria' : pc.scelte ? 'su misura' : null, pc.oggi ? `oggi ${pc.oggi}: ${pc.fatti}/${pc.di}` : null].filter(Boolean).join(' · ') },
      el('p', { testo: pc.titolo }),
      el('ul', { class: 'percorso-sedute' }, ...(pc.sedute ?? []).map(s => el('li', {}, el('b', { testo: s.nome }), el('small', { class: 'sopra', testo: (s.esercizi ?? []).join(' · ') })))),
      el('p', { class: 'sopra piccolo', testo: 'Il cliente l’ha scelto in Mirion Fit. Se gli mandi una scheda tua, vale prima del percorso.' })) : null,
  ]
}

// ——— Mirion Fit (24-11): sonno, integratori, misure, check della settimana e il piano, dai dati di Piatto ———
const QUALITA = ['', 'male', 'così così', 'normale', 'bene', 'benissimo']
const MOMENTI = { mattina: 'al mattino', pranzo: 'a pranzo', sera: 'la sera', prima: 'prima dell’allenamento', dopo: 'dopo l’allenamento', bisogno: 'quando serve' }
const DOMANDE = [['energia', 'Energia'], ['fame', 'Fame (5 = mai)'], ['stress', 'Stress (5 = niente)'], ['motivazione', 'Voglia di allenarsi'], ['piano', 'Ha seguito il piano']]
const MISURE_FIT = [['vita', 'Vita'], ['fianchi', 'Fianchi'], ['petto', 'Petto'], ['braccio', 'Braccio'], ['coscia', 'Coscia']]
const ore = h => { if (!Number.isFinite(+h)) return '—'; let o = Math.floor(+h), m = Math.round((+h - o) * 60); if (m === 60) { o++; m = 0 } return m ? `${o} h ${String(m).padStart(2, '0')}` : `${o} h` }

// la riga in più nella card del cliente: il sonno della notte e gli integratori di oggi
function fitRiga (p) {
  if (!p?.sonno && !p?.integratori && !p?.scheda?.di) return null
  return el('div', { class: 'cliente-fit' },
    p.scheda?.di ? el('span', { class: p.scheda.fatti >= p.scheda.di ? 'bene' : '', title: p.scheda.titolo ?? 'La scheda' }, ic('check-circle'), `Scheda ${p.scheda.fatti ?? 0}/${p.scheda.di} oggi`) : null,
    p.sonno ? el('span', { class: p.sonno.ore < 7 ? 'presto' : '', title: p.sonno7 ? `media ${ore(p.sonno7.ore)} in ${p.sonno7.notti} notti` : '' }, ic('clock'), `Sonno ${ore(p.sonno.ore)}`) : null,
    p.integratori ? el('span', { class: p.integratori.finiscono ? 'presto' : '' }, ic('check-circle'), `Integratori ${p.integratori.presi}/${p.integratori.di}${p.integratori.finiscono ? ' · uno sta finendo' : ''}`) : null)
}

function carteFit (c, p, comp, rifai) {
  const giorni = comp.giorni ?? [], notti = giorni.slice(-28)
  const conSonno = notti.filter(g => Number.isFinite(g.sonno)), media = conSonno.length ? conSonno.reduce((t, g) => t + g.sonno, 0) / conSonno.length : null
  const passi = giorni.slice(-7).filter(g => Number.isFinite(g.passi))
  const misure = comp.misure ?? [], check = comp.check ?? []
  return [
    conSonno.length ? carta('Sonno: 4 settimane', { sopra: `media ${ore(media)} · ${conSonno.filter(g => g.sonno < 7).length} notti sotto le 7 ore` }, colonne(notti.map(g => ({ etichetta: String(Number(g.giorno.slice(8))), valore: g.sonno ?? 0, titolo: `${g.giorno}: ${Number.isFinite(g.sonno) ? ore(g.sonno) : 'non segnato'}${g.qualitaSonno ? ', ' + QUALITA[g.qualitaSonno] : ''}` })), 7)) : null,
    passi.length ? carta('Passi: gli ultimi 7 giorni', { sopra: 'dal telefono del cliente' }, colonne(passi.map(g => ({ etichetta: new Date(g.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'narrow' }), valore: g.passi, titolo: `${g.giorno}: ${n(g.passi)} passi` })))) : null,
    // il battito dall'orologio (Health Connect): il minimo di ogni giorno, che scende quando la forma migliora
    giorni.slice(-28).some(g => g.battito?.minimo || g.battito?.medio) ? carta('Battito: 4 settimane', { sopra: 'il minimo di ogni giorno, dall’orologio del cliente' }, colonne(giorni.slice(-28).filter(g => g.battito?.minimo || g.battito?.medio).map(g => ({ etichetta: String(Number(g.giorno.slice(8))), valore: g.battito.minimo ?? g.battito.medio, titolo: `${g.giorno}: ${[g.battito.minimo ? 'minimo ' + g.battito.minimo : null, g.battito.medio ? 'medio ' + g.battito.medio : null, g.battito.massimo ? 'massimo ' + g.battito.massimo : null].filter(Boolean).join(' · ')} bpm` })))) : null,
    comp.integratori?.length ? carta('Integratori di oggi', { sopra: `${comp.integratori.filter(i => i.presi >= i.dosi).length} di ${comp.integratori.length} presi` }, el('ul', { class: 'pasto-voci' }, ...comp.integratori.map(i => el('li', { class: 'fit-voce' },
      el('span', { testo: `${i.presi >= i.dosi ? '✓ ' : ''}${i.nome}${i.dose ? ' · ' + i.dose : ''}` }),
      el('small', { class: 'sopra' + (i.finisce ? ' presto' : ''), testo: [MOMENTI[i.quando], i.dosi > 1 ? `${i.presi}/${i.dosi} dosi` : null, i.scorta != null ? `restano ${i.scorta}` : null, i.finisce ? 'sta finendo' : null].filter(Boolean).join(' · ') }))))) : null,
    misure.length ? carta('Le misure', { sopra: `da Mirion Fit · ${misure.length} ${misure.length === 1 ? 'volta' : 'volte'}` }, el('div', { class: 'cliente-misure' }, ...MISURE_FIT.filter(([k]) => misure.some(m => Number.isFinite(m[k]))).map(([k, t]) => {
      const s = misure.filter(m => Number.isFinite(m[k])), u = s.at(-1), diff = s.length >= 2 ? Math.round((u[k] - s[0][k]) * 10) / 10 : null
      return el('div', { class: 'cliente-misura' }, el('small', { class: 'sopra', testo: t }), el('b', { testo: `${virgola(u[k])} cm` }), el('small', { class: 'sopra', testo: diff != null ? `${diff === 0 ? 'uguale' : segno(diff)} dal ${new Date(s[0].data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}` : 'una volta sola' }))
    }))) : null,
    check.length ? carta('I check della settimana', { larga: true, sopra: `l’ultimo ${new Date(check[0].data + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}` }, el('div', { class: 'tabella-check' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', { testo: 'Settimana' }), ...DOMANDE.map(([, t]) => el('th', { testo: t })))),
      el('tbody', {}, ...check.slice(0, 6).map(x => el('tr', {}, el('td', { testo: new Date(x.data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) }), ...DOMANDE.map(([k]) => el('td', { class: x[k] <= 2 ? 'presto' : '', testo: x[k] ?? '–' }))))))),
      ...check.filter(x => x.nota).slice(0, 3).map(x => el('blockquote', { testo: x.nota }))) : null,
    c.soloNota ? null : cartaReport(c, rifai),
    c.online ? cartaPiano(c, rifai) : null,
    c.online ? cartaProgressi(c, rifai) : null,
    c.online ? cartaScheda(c, rifai) : null,
  ]
}

// Mirion Trainer (Marco, 24-11 sera: «la disponibilità di usare una analisi tramite Claude del cliente Mirion Fit e di regolazione
// tramite lui via reportistica da Mirion Trainer a Mirion Fit»). «Analizza con Claude» apre Claude sul cervello con la richiesta
// pronta (server/clienti.mjs, richiestaAnalisi): legge i file del cliente nella sua cartella privata e scrive il report in Analisi/.
// Qui si legge l'ultimo report; «Metti nel piano» porta la proposta nel modulo qui sotto, e la manda il trainer. Niente parte da solo.
const PROPOSTA = [['kcal', 'kcal', ''], ['proteine', 'proteine', ' g'], ['carboidrati', 'carboidrati', ' g'], ['grassi', 'grassi', ' g'], ['acqua', 'acqua', ' l'], ['sonno', 'sonno', ' h']]
function cartaReport (c, rifai) {
  const r = c.report
  const analizza = async ia => {
    try {
      const q = await api('/api/clienti', { azione: 'analisi', id: c.id })
      await conIA.testo(q.testo, ia)
      notifica(`Claude scrive il report di ${c.nome} in ${q.file}. Quando ha finito, «Rileggi il report».`, { durata: 9000 })
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  const metti = r?.piano && c.online ? el('button', { type: 'button', class: 'primario', onclick: () => {
    const f = document.querySelector('.piano-modulo'); if (!f) return
    for (const [k] of PROPOSTA) if (r.piano[k] != null && f.elements[k]) f.elements[k].value = String(r.piano[k]).replace('.', ',')
    if (r.piano.nota && f.elements.nota) f.elements.nota.value = r.piano.nota
    f.scrollIntoView({ behavior: 'smooth', block: 'center' })
    notifica('La proposta è nel piano: controllala e premi «Manda il piano». Arriva a Mirion Fit solo allora.', { durata: 8000 })
  } }, ic('arrow-down'), 'Metti nel piano') : null
  // il messaggio «Per il cliente»: si manda solo con due clic (il secondo conferma)
  const manda = r?.perCliente && c.online ? el('button', { type: 'button', class: 'secondario', onclick: async () => {
    if (manda.dataset.pronto !== '1') { manda.dataset.pronto = '1'; manda.textContent = 'Clicca ancora per mandarlo'; setTimeout(() => { if (manda.isConnected) { manda.dataset.pronto = ''; manda.textContent = 'Manda il messaggio' } }, 5000); return }
    try { await api('/api/clienti', { azione: 'messaggio', id: c.id, testo: r.perCliente }); notifica(`Il messaggio è arrivato a ${c.nome} in Mirion Fit.`); rifai() } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  } }, 'Manda il messaggio') : null
  const proposta = r?.piano ? PROPOSTA.filter(([k]) => r.piano[k] != null).map(([k, t, u]) => `${t} ${String(r.piano[k]).replace('.', ',')}${u}`).join(' · ') : ''
  return carta('Analisi con Claude', { larga: true, sopra: r ? `l’ultimo report è del ${new Date(r.data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : 'il report del cliente, e la proposta per Mirion Fit' },
    el('p', { class: 'sopra piccolo', testo: `Claude legge quello che ${c.nome} condivide (nella sua cartella privata, che non va su GitHub) e scrive un report con una proposta di piano e un messaggio. Decidi tu cosa mandare a Mirion Fit. I dati passano dal tuo account di Claude.` }),
    r ? el('details', { class: 'report-testo' }, el('summary', { testo: 'Leggi il report' }), leggiNota(r.testo)) : el('p', { class: 'vuoto', testo: 'Ancora nessun report.' }),
    proposta ? el('p', {}, el('small', { class: 'sopra', testo: 'La proposta di piano: ' }), proposta) : null,
    r?.perCliente ? el('blockquote', { testo: r.perCliente }) : null,
    r && !c.online ? el('p', { class: 'sopra piccolo', testo: 'Il piano e il messaggio si mandano ai clienti di Mirion Fit online; questo cliente condivide dalla Wi-Fi: diglieli tu.' }) : null,
    el('div', { class: 'bottoni' }, ...pulsantiIA(analizza, { testo: r ? 'Rifai l’analisi con' : 'Analizza con' }), metti, manda,
      el('button', { type: 'button', class: 'quieto', onclick: rifai }, 'Rileggi il report')))
}

// i progressi che il cliente condivide da Mirion Fit (26-11-2026, Marco: «Claudio può commentare i progressi quando li
// condividono»): un record, il peso, una seduta finita, i giorni di fila, il cerchio, con la riga del cliente; sotto ognuno i
// commenti e il campo per commentare. Il commento arriva al cliente in Mirion Fit, con la notifica
function cartaProgressi (c, rifai) {
  const lista = Array.isArray(c.progressi) ? c.progressi : []
  const da = lista.filter(x => !(x.commenti ?? []).length).length
  const giorno = q => new Date(q).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  const ICONE = { record: 'sparkle', peso: 'arrows-vertical', seduta: 'check-circle', fila: 'calendar-dots', cerchio: 'target' }
  return carta('I progressi', { larga: true, sopra: lista.length ? (da ? `${da} da commentare` : 'tutti commentati') : 'quelli che condivide da Mirion Fit' },
    lista.length ? el('ul', { class: 'progressi-trainer' }, ...lista.slice(0, 12).map(x => {
      const testo = el('input', { name: 'testo', maxlength: 600, placeholder: (x.commenti ?? []).length ? 'Un altro commento' : `Commenta, es. «Grande ${c.nome.split(' ')[0]}!»`, 'aria-label': 'Il commento' })
      return el('li', { class: 'progresso' + ((x.commenti ?? []).length ? '' : ' da-commentare') },
        el('div', { class: 'progresso-testa' }, ic(ICONE[x.tipo] ?? 'sparkle', { duo: true }), el('div', {}, el('b', { testo: x.titolo }), el('small', { class: 'sopra', testo: [giorno(x.quando), x.testo].filter(Boolean).join(' · ') }))),
        x.nota ? el('blockquote', { testo: x.nota }) : null,
        ...(x.commenti ?? []).map(k => el('div', { class: 'bolla mia' }, el('p', { testo: k.testo }), el('time', { testo: giorno(k.quando) }))),
        el('form', { class: 'riga-form progresso-commenta', onsubmit: async e => {
          e.preventDefault(); if (!testo.value.trim()) return testo.focus()
          try { const r = await api('/api/clienti', { azione: 'commenta', id: c.id, progresso: x.id, testo: testo.value }); notifica(r.notifiche ? `Commento mandato: ${c.nome} lo vede in Mirion Fit.` : `Mandato. ${c.nome} lo vede quando apre Mirion Fit.`); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
        } }, testo, el('button', { class: 'primario piccolo', testo: 'Commenta' })))
    })) : el('p', { class: 'vuoto', testo: `Quando ${c.nome} condivide un progresso da Mirion Fit (un record, il peso, una seduta finita), lo trovi qui e lo commenti.` }))
}

// la scheda di allenamento (24-11 sera, Mirion Trainer → Mirion Fit online): un titolo, una nota e fino a 20 esercizi con serie,
// ripetizioni («8» o «8-10»), kg (vuoto = corpo libero), recupero in secondi e una nota. Il cliente la trova nel diario come «La tua
// scheda», con «Fai» che apre l'esercizio con serie e kg già scritti. Il nome si lega da solo all'esercizio di Mirion Fit (l'elenco
// arriva da /api/clienti/esercizi, se sul computer c'è la cartella di Piatto)
let eserciziFit = null
const elencoEsercizi = () => eserciziFit ??= api('/api/clienti/esercizi').then(d => d.esercizi ?? []).catch(() => [])
function cartaScheda (c, rifai) {
  const s = c.scheda ?? { titolo: '', nota: '', esercizi: [] }
  const lista = 'esercizi-fit-' + c.id
  const elenco = el('datalist', { id: lista })
  elencoEsercizi().then(es => elenco.replaceChildren(...es.map(e => el('option', { value: e.nome }))))
  const righe = el('div', { class: 'scheda-righe' })
  const riga = (e = {}) => {
    const r = el('div', { class: 'scheda-riga' },
      el('input', { name: 'nome', list: lista, placeholder: 'Esercizio, es. Squat', value: e.nome ?? '', maxlength: 60, 'aria-label': 'Esercizio' }),
      el('input', { name: 'serie', inputmode: 'numeric', placeholder: 'serie', value: e.serie ?? '', 'aria-label': 'Serie' }),
      el('input', { name: 'rip', placeholder: 'rip. 8-10', value: e.rip ?? '', 'aria-label': 'Ripetizioni' }),
      el('input', { name: 'kg', inputmode: 'decimal', placeholder: 'kg', value: e.kg ?? '', 'aria-label': 'Chili (vuoto: corpo libero)' }),
      el('input', { name: 'recupero', inputmode: 'numeric', placeholder: 'rec. s', value: e.recupero ?? '', 'aria-label': 'Recupero in secondi' }),
      el('input', { name: 'note', placeholder: 'nota', value: e.note ?? '', maxlength: 160, 'aria-label': 'Nota' }),
      el('button', { type: 'button', class: 'quieto piccolo', title: 'Togli questo esercizio', 'aria-label': 'Togli questo esercizio', onclick: () => r.remove() }, ic('x')))
    r.dataset.id = e.esercizioId ?? ''
    return r
  }
  for (const e of s.esercizi?.length ? s.esercizi : [{}, {}, {}]) righe.append(riga(e))
  // come va (26-11-2026, Marco: «Claudio può inviare schedine in Mirion Trainer in base a come fanno»): esercizio per esercizio
  // l'ultima volta e i kg da proporre (la stessa regola della progressione di Mirion Fit). «Proponi in base a come va» rifà la
  // scheda: gli esercizi che ci sono prendono i kg proposti; se la scheda è vuota, entrano i suoi esercizi più fatti. «+» ne aggiunge uno
  const andamento = Array.isArray(c.piatto?.andamento) ? c.piatto.andamento : []
  const virgola = v => String(v).replace('.', ',')
  const daAndamento = a => ({ esercizioId: a.esercizioId, nome: a.nome, serie: a.serie?.length || 3, rip: String(a.rip ?? 10), kg: a.proposta?.kg ?? a.kg ?? '', note: '' })
  const proponi = () => {
    const perId = new Map(andamento.map(a => [a.esercizioId || a.nome.toLowerCase(), a]))
    const scritte = [...righe.children].filter(r => r.querySelector('[name="nome"]').value.trim())
    if (!scritte.length) { righe.replaceChildren(...andamento.slice(0, 6).map(a => riga(daAndamento(a)))); return notifica(andamento.length ? `Scheda proposta dai ${Math.min(6, andamento.length)} esercizi che ${c.nome} fa di più, con i kg da provare.` : 'Non ci sono ancora allenamenti da cui partire.') }
    let cambiati = 0
    for (const r of scritte) {
      const a = perId.get(r.dataset.id) ?? perId.get(r.querySelector('[name="nome"]').value.trim().toLowerCase())
      if (a?.proposta?.kg != null) { r.querySelector('[name="kg"]').value = virgola(a.proposta.kg); cambiati++ }
    }
    notifica(cambiati ? `Aggiornati i kg di ${cambiati} ${cambiati === 1 ? 'esercizio' : 'esercizi'} in base a come va.` : 'Per questi esercizi non ci sono ancora i kg dell’ultima volta.')
  }
  const comeVa = andamento.length ? el('details', { class: 'scheda-come-va', open: true },
    el('summary', {}, el('b', { testo: 'Come va' }), el('small', { class: 'sopra', testo: ` · gli esercizi delle ultime 4 settimane, l’ultima volta e i kg da provare` })),
    el('ul', { class: 'come-va' }, ...andamento.slice(0, 10).map(a => el('li', {},
      el('span', {}, el('b', { testo: a.nome }), el('small', { class: 'sopra', testo: ` · ${new Date(a.giorno + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}: ${(a.serie ?? []).map(x => x.kg ? `${virgola(x.kg)} kg × ${x.rip}` : `${x.rip} rip.`).join(' · ')} · ${a.volte} ${a.volte === 1 ? 'volta' : 'volte'}` })),
      a.proposta ? el('span', { class: a.proposta.kg > (a.kg ?? 0) ? 'bene' : 'sopra', title: a.proposta.motivo, testo: a.proposta.kg > (a.kg ?? 0) ? `→ ${virgola(a.proposta.kg)} kg` : `resta ${virgola(a.proposta.kg)} kg` }) : el('span'),
      el('button', { type: 'button', class: 'quieto piccolo', title: 'Mettilo nella scheda con i kg da provare', 'aria-label': `Metti ${a.nome} nella scheda`, onclick: () => { if (righe.children.length >= 20) return notifica('Al massimo 20 esercizi.'); const vuota = [...righe.children].find(r => !r.querySelector('[name="nome"]').value.trim()); const n = riga(daAndamento(a)); if (vuota) vuota.replaceWith(n); else righe.append(n) } }, ic('plus'))))))
    : el('p', { class: 'sopra piccolo', testo: `Quando ${c.nome} segna gli allenamenti in Mirion Fit, qui vedi come va esercizio per esercizio e la scheda si propone da sola.` })
  const leggi = async () => {
    const es = await elencoEsercizi(), perNome = new Map(es.map(e => [e.nome.toLowerCase(), e.id]))
    const valore = (r, k) => r.querySelector(`[name="${k}"]`).value.trim()
    const num = v => { const n = Number(String(v).replace(',', '.')); return v === '' || !Number.isFinite(n) ? null : n }
    const esercizi = [...righe.children].map(r => ({ nome: valore(r, 'nome'), r })).filter(x => x.nome).map(({ nome, r }) => ({
      esercizioId: perNome.get(nome.toLowerCase()) ?? r.dataset.id ?? '', nome, serie: num(valore(r, 'serie')) ?? 3, rip: valore(r, 'rip') || '10',
      kg: num(valore(r, 'kg')), recupero: num(valore(r, 'recupero')), note: valore(r, 'note') }))
    return { titolo: modulo.elements.titolo.value.trim(), nota: modulo.elements.nota.value.trim(), esercizi }
  }
  const modulo = el('form', { class: 'piano-modulo', onsubmit: async e => {
    e.preventDefault()
    const scheda = await leggi()
    if (!scheda.esercizi.length) return notifica('Scrivi almeno un esercizio.')
    try { const r = await api('/api/clienti', { azione: 'scheda', id: c.id, scheda }); notifica(`La scheda «${r.scheda?.titolo ?? scheda.titolo}» è arrivata a ${c.nome} in Mirion Fit.`); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  } },
  el('div', { class: 'piano-campi' },
    el('label', { class: 'campo-piano' }, el('small', { class: 'sopra', testo: 'Titolo' }), el('input', { name: 'titolo', value: s.titolo ?? '', maxlength: 60, placeholder: 'es. Forza A' })),
    el('label', { class: 'campo-piano' }, el('small', { class: 'sopra', testo: 'Una nota per il cliente' }), el('input', { name: 'nota', value: s.nota ?? '', maxlength: 400, placeholder: 'es. riscaldamento 10 minuti prima' }))),
  elenco,
  comeVa,
  el('div', { class: 'scheda-riga scheda-intestazione', 'aria-hidden': 'true' }, ...['Esercizio', 'Serie', 'Ripetizioni', 'kg', 'Rec. (s)', 'Nota', ''].map(t => el('small', { class: 'sopra', testo: t }))),
  righe,
  el('div', { class: 'bottoni' },
    el('button', { type: 'button', class: 'secondario', onclick: () => { if (righe.children.length >= 20) return notifica('Al massimo 20 esercizi.'); righe.append(riga()); righe.lastChild.querySelector('input').focus() } }, ic('plus'), 'Un esercizio'),
    andamento.length ? el('button', { type: 'button', class: 'secondario', title: 'I kg da provare per ogni esercizio, da come è andata l’ultima volta', onclick: proponi }, ic('sparkle'), 'Proponi in base a come va') : null,
    el('button', { type: 'submit', class: 'primario' }, c.scheda ? 'Aggiorna la scheda' : 'Manda la scheda'),
    c.scheda ? el('button', { type: 'button', class: 'quieto', onclick: async () => { try { await api('/api/clienti', { azione: 'scheda', id: c.id, scheda: null }); notifica(`Scheda tolta: ${c.nome} non la vede più.`); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) } } }, 'Togli la scheda') : null))
  return carta('La scheda', { larga: true, sopra: c.scheda?.quando ? `mandata il ${new Date(c.scheda.quando).toLocaleDateString('it-IT')}` : 'gli esercizi per Mirion Fit' },
    el('p', { class: 'sopra piccolo', testo: 'Il cliente la trova nel diario come «La tua scheda»: con «Fai» apre l’esercizio con serie e kg già scritti. Ripetizioni come «8» o «8-10»; kg vuoto vuol dire corpo libero; il recupero è in secondi.' }), modulo)
}

// il piano del cliente (solo Piatto online): calorie, macro, acqua, sonno e una nota; vale al posto del calcolo di Piatto
function cartaPiano (c, rifai) {
  const pi = c.piano ?? {}
  const campo = (nome, etichetta, valore, extra = {}) => el('label', { class: 'campo-piano' }, el('small', { class: 'sopra', testo: etichetta }), el('input', { name: nome, inputmode: 'decimal', value: valore ?? '', ...extra }))
  const modulo = el('form', { class: 'piano-modulo', onsubmit: async e => {
    e.preventDefault()
    const f = new FormData(modulo), num = k => { const v = String(f.get(k) ?? '').trim().replace(',', '.'); return v === '' ? null : +v }
    const piano = { kcal: num('kcal'), proteine: num('proteine'), carboidrati: num('carboidrati'), grassi: num('grassi'), acqua: num('acqua') != null ? Math.round(num('acqua') * 1000) : null, sonno: num('sonno'), nota: String(f.get('nota') ?? '') }
    try { await api('/api/clienti', { azione: 'piano', id: c.id, piano }); notifica(`Il piano è arrivato a ${c.nome}: lo vede alla prossima apertura di Mirion Fit.`); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  } },
  el('div', { class: 'piano-campi' }, campo('kcal', 'Calorie al giorno', pi.kcal, { placeholder: 'es. 1800' }), campo('proteine', 'Proteine (g)', pi.proteine), campo('carboidrati', 'Carboidrati (g)', pi.carboidrati), campo('grassi', 'Grassi (g)', pi.grassi),
    campo('acqua', 'Acqua (litri)', pi.acqua ? pi.acqua / 1000 : null, { placeholder: 'es. 2,5' }), campo('sonno', 'Sonno (ore)', pi.sonno, { placeholder: 'es. 8' })),
  el('label', { class: 'campo-piano' }, el('small', { class: 'sopra', testo: 'Una nota per il cliente' }), el('textarea', { name: 'nota', rows: 2, maxlength: 600, placeholder: 'es. pasta solo a pranzo, niente alcol in settimana', testo: pi.nota ?? '' })),
  el('div', { class: 'bottoni' }, el('button', { type: 'submit', class: 'primario' }, pi.kcal || pi.sonno || pi.acqua ? 'Aggiorna il piano' : 'Manda il piano'),
    c.piano ? el('button', { type: 'button', class: 'secondario', onclick: async () => { try { await api('/api/clienti', { azione: 'piano', id: c.id, piano: null }); notifica('Piano tolto: Mirion Fit torna ai suoi calcoli.'); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) } } }, 'Togli il piano') : null))
  return carta('Il piano', { larga: true, sopra: c.piano?.quando ? `mandato il ${new Date(c.piano.quando).toLocaleDateString('it-IT')}` : 'calorie, macro, acqua e sonno per Mirion Fit' },
    el('p', { class: 'sopra piccolo', testo: 'Quello che scrivi vale in Mirion Fit al posto del calcolo: i campi vuoti restano calcolati (con le sole calorie, grassi e carboidrati si rifanno). Il cliente lo vede nella scheda «Io».' }), modulo)
}

// il QR con gli integratori (un protocollo): il cliente lo inquadra in Piatto, nella card Integratori, e li trova già scritti
// Marco, 24-11 sera: «gli integratori (l'area apposita) mettila in Mirion Fit, non in Mirion Trainer»: si apre dalla scrivania di
// Mirion Fit (prodotto.js), non più dai clienti
export function qrIntegratori () {
  const righe = el('div', { class: 'qr-int-righe' })
  const riga = () => el('div', { class: 'qr-int-riga' },
    el('input', { name: 'nome', placeholder: 'Nome, es. Creatina', maxlength: 60, 'aria-label': 'Nome' }), el('input', { name: 'dose', placeholder: 'Dose, es. 3 g', maxlength: 40, 'aria-label': 'Dose' }),
    el('select', { name: 'quando', 'aria-label': 'Quando' }, ...Object.entries(MOMENTI).map(([k, t]) => el('option', { value: k, testo: t }))),
    el('input', { name: 'note', placeholder: 'Nota (facoltativa)', maxlength: 200, 'aria-label': 'Nota' }))
  righe.append(riga())
  const titolo = el('input', { placeholder: 'Il nome del protocollo (facoltativo), es. Massa inverno', maxlength: 60, 'aria-label': 'Il nome del protocollo' })
  const esito = el('div', { class: 'invito-qr' })
  const fai = async () => {
    const voci = [...righe.children].map(r => Object.fromEntries([...r.querySelectorAll('input, select')].map(i => [i.name, i.value]))).filter(v => v.nome.trim())
    try {
      const r = await api('/api/clienti', { azione: 'qr-integratori', titolo: titolo.value, voci })
      const t = document.createElement('template'); t.innerHTML = r.qr
      esito.replaceChildren(t.content.firstChild, el('p', { class: 'sopra piccolo', testo: `${voci.length} ${voci.length === 1 ? 'integratore' : 'integratori'}: il cliente apre Mirion Fit → Integratori → + → «Inquadra il codice» e li trova già scritti. Si può anche stampare.` }))
    } catch (err) { notifica(err.message, { tipo: 'sempre' }) }
  }
  const fondo = el('div', { class: 'cassetto-fondo invito-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } },
    el('section', { class: 'invito-scatola qr-int', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Il QR degli integratori' },
      el('h2', { testo: 'Il QR degli integratori' }),
      el('p', { class: 'sopra', testo: 'Scrivi quello che il cliente deve prendere: nome, dose e quando. Solo quello che decidi tu, niente proprietà sulla salute.' }),
      titolo, righe,
      el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario', onclick: () => { if (righe.children.length < 8) righe.append(riga()) } }, ic('plus'), 'Un altro'),
        el('button', { type: 'button', class: 'primario', onclick: fai }, 'Fai il QR'), el('button', { type: 'button', class: 'secondario', onclick: () => fondo.remove() }, 'Chiudi')),
      esito))
  document.body.append(fondo)
}

// le card di Claudio: misure, abbonamento e ingressi, allenamenti con i carichi, record, i prossimi appuntamenti
function carteClaudio (k) {
  const meno = g => new Date(Date.parse(k.oggi + 'T12:00') - g * 86400_000).toISOString().slice(0, 10)
  const campi = Object.keys(NOMI_MISURE).filter(x => k.misure.some(m => m[x] != null))
  const settimane = [3, 2, 1, 0].map(i => k.allenamenti.filter(a => a.data > meno(7 * i + 7) && a.data <= meno(7 * i)))
  const serie = e => { const kg = Math.max(0, ...e.serie.map(s => s.kg ?? 0)), rip = Math.max(0, ...e.serie.map(s => s.rip ?? 0)); return `${e.nome} ${e.serie.length}×${rip || '?'}${kg ? ` · ${virgola(kg)} kg` : ''}` }
  return [
    campi.length ? carta('Le misure', { sopra: `dal gestionale · ${k.misure.length} ${k.misure.length === 1 ? 'controllo' : 'controlli'}` }, el('div', { class: 'cliente-misure' }, ...campi.map(x => {
      const serieMisura = k.misure.filter(m => m[x] != null).map(m => ({ data: m.data, kg: m[x] })), ultima = serieMisura.at(-1), diff = serieMisura.length >= 2 ? Math.round((ultima.kg - serieMisura[0].kg) * 10) / 10 : null
      return el('div', { class: 'cliente-misura' }, el('small', { class: 'sopra', testo: NOMI_MISURE[x] }), el('b', { testo: `${virgola(ultima.kg)} ${UNITA[x] ?? 'cm'}` }),
        el('small', { class: 'sopra', testo: diff != null ? `${diff === 0 ? 'uguale' : segno(diff)} dal ${new Date(serieMisura[0].data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}` : 'una sola misura' }), linea(serieMisura))
    }))) : null,
    carta('L’abbonamento', { sopra: `${k.ingressi28} ${k.ingressi28 === 1 ? 'giorno' : 'giorni'} in palestra nelle ultime 4 settimane` }, k.abbonamenti.length ? el('ul', { class: 'pasto-voci cliente-abbonamenti' }, ...k.abbonamenti.map(a => {
      const ab = abbonamento(a)
      return el('li', { class: ab.presto ? 'presto' : '' }, el('div', {}, el('span', { testo: ab.testo }), ab.su ? barra(ab.fatto, ab.su, 'abbonamento') : null,
        a.prenotate ? el('small', { class: 'sopra', testo: `${a.prenotate} già ${a.prenotate === 1 ? 'prenotata' : 'prenotate'}` }) : null), a.daPagare ? el('small', { class: 'sopra presto', testo: `da incassare ${a.daPagare.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}` }) : null)
    })) : el('p', { class: 'vuoto', testo: 'Nessun abbonamento nel gestionale.' })),
    k.prossimi.length ? carta('I prossimi appuntamenti', {}, el('ul', { class: 'pasto-voci' }, ...k.prossimi.map(x => el('li', {}, el('span', { testo: x.cosa }), el('small', { class: 'sopra', testo: `${giorno(x.data)}${x.ora ? ' · ' + x.ora : ''}` }))))) : null,
    k.allenamenti.length ? carta('Allenamenti nel gestionale: 4 settimane', { sopra: 'kg sollevati per settimana' }, colonne(settimane.map((l, i) => ({ etichetta: i === 3 ? 'questa' : `−${3 - i}`, valore: l.reduce((t, a) => t + a.volume, 0), titolo: `${l.length} allenamenti` })))) : null,
    k.allenamenti.length ? carta('Gli ultimi allenamenti', { larga: true, sopra: 'segnati nel gestionale, dal cliente o dal trainer' }, el('ul', { class: 'cliente-checkin-elenco' }, ...[...k.allenamenti].reverse().slice(0, 6).map(a => el('li', {},
      el('span', { class: 'cliente-umore', title: a.fatica ? `fatica ${a.fatica}/5` : '', testo: ['🏋️', '😌', '🙂', '😤', '🥵', '💀'][Math.round(a.fatica ?? 0)] ?? '🏋️' }),
      el('div', {}, el('small', { class: 'sopra', testo: [giorno(a.data), a.giorno, a.minuti ? a.minuti + ' min' : null, `${n(a.volume)} kg sollevati`].filter(Boolean).join(' · ') }),
        el('p', { testo: (a.elenco ?? []).map(serie).join(' — ') || `${a.esercizi} esercizi, ${a.serie} serie` })))))) : null,
    k.record.length ? carta('I record', { sopra: 'il carico più alto e il massimale stimato' }, el('ul', { class: 'pasto-voci' }, ...k.record.slice(0, 8).map(r => el('li', {}, el('span', { testo: `${r.nome} · ${virgola(r.kg)} kg × ${r.rip}` }), el('small', { class: 'sopra', testo: `1RM ≈ ${virgola(r.massimale)} kg` }))))) : null,
  ]
}

// chi è in Claudio: dal nome, o scelto dal trainer
function abbinaClaudio (c, stanza, id) {
  const scelta = el('select', { 'aria-label': 'Chi è nel gestionale', onchange: async () => { try { await api('/api/clienti', { azione: 'claudio', id: c.id, claudio: scelta.value }); notifica('Fatto.'); paginaCliente(stanza, id) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } },
    el('option', { value: '', testo: c.claudio && !c.sceltaClaudio ? `Dal nome (adesso: ${c.claudio.nome})` : 'Dal nome' }),
    ...c.scelte.map(x => el('option', { value: x.id, testo: x.nome })),
    el('option', { value: 'no', testo: 'Non è nel gestionale' }))
  scelta.value = c.sceltaClaudio ?? ''
  return el('p', { class: 'sopra piccolo clienti-nota cliente-abbina' }, 'Nel gestionale è: ', scelta)
}

// i messaggi con un cliente di Piatto online (Marco, 24-11: «un'area messaggi sia sull'app desktop sia sul cellulare di Claudio»):
// le bolle della chat della squadra; quello che scrivi gli arriva anche come notifica, se le ha attivate. La conversazione si
// rilegge ogni 30 secondi finché la pagina è aperta (Mirion prende le novità da Piatto online ogni minuto)
function chatCliente (c, id) {
  const fila = el('div', { class: 'chat-fila squadra-messaggi cliente-chat', 'aria-live': 'polite' })
  const ora = q => new Date(q).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const disegna = messaggi => {
    fila.replaceChildren(...messaggi.map(m => el('div', { class: `bolla ${m.da === 'trainer' ? 'mia' : 'sua'} ${m.tema === 'dolore' ? 'bolla-dolore' : ''}` }, m.da === 'trainer' ? null : el('small', { class: 'strumenti', testo: c.nome + (TEMI[m.tema] ? ' · ' + TEMI[m.tema] : '') }), el('p', { testo: m.testo }), el('time', { testo: ora(m.quando) }))),
      messaggi.length ? '' : el('p', { class: 'vuoto', testo: `Ancora nessun messaggio. Scrivi a ${c.nome}: gli arriva su Mirion Fit.` }))
    fila.scrollTop = fila.scrollHeight
  }
  disegna(c.messaggi ?? [])
  const giro = async () => {
    if (!fila.isConnected) return
    try { await api('/api/clienti'); const n = await api('/api/clienti/uno?id=' + encodeURIComponent(id)); disegna(n.messaggi ?? []) } catch { /* al prossimo giro */ }
    setTimeout(giro, 30_000)
  }
  setTimeout(giro, 30_000)
  const testo = el('textarea', { rows: 1, placeholder: `Scrivi a ${c.nome}`, 'aria-label': 'Il messaggio', maxlength: 1000, onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit() } } })
  return el('section', { class: 'fascia squadra-chat cliente-messaggi' },
    el('header', {}, el('h2', { testo: 'I messaggi' }), el('span', { class: 'sopra piccolo', testo: 'su Mirion Fit online' })), fila,
    el('form', { class: 'chat-scrivi', onsubmit: async e => {
      e.preventDefault(); const b = e.target.querySelector('button'); if (b.disabled || !testo.value.trim()) return; b.disabled = true
      try { const r = await api('/api/clienti', { azione: 'messaggio', id, testo: testo.value }); testo.value = ''; const n = await api('/api/clienti/uno?id=' + encodeURIComponent(id)); disegna(n.messaggi ?? []); if (!r.notifiche) notifica(`Mandato. ${c.nome} lo vede quando apre Mirion Fit (non ha le notifiche attive).`) }
      catch (err) { notifica(err.message, { tipo: 'sempre' }) } finally { b.disabled = false }
    } }, testo, el('button', { class: 'primario tondo', 'aria-label': 'Manda' }, ic('paper-plane-right'))))
}

// la faccia del cliente: la foto che ha messo in Piatto (Marco, 24-11), se no le iniziali
function faccia (c, grande = false) {
  const cls = 'cliente-faccia' + (grande ? ' grande' : '')
  return c.faccia ? el('img', { class: cls + ' con-foto', src: c.faccia, alt: '' }) : el('span', { class: cls, 'aria-hidden': 'true', testo: iniziali(c.nome) })
}
