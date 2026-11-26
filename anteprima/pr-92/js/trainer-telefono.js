// Mirion Trainer sul telefono (Marco, 25-11-2026: «l'app da telefono per il trainer deve gestire questa cosa, quindi creala»).
// Una pagina sola, pensata per il pollice, nello stile Spazio: «Oggi» (quello che chiede una mano: dolori, avvisi dall'app,
// messaggi senza risposta, chi è fermo), «Clienti», «Cerchio» (la squadra in classifica) e la pagina di ogni cliente con il
// cerchio delle prestazioni, com'è andata ogni seduta, il percorso, la scheda da mandare e la chat.
// Si apre dal telefono abbinato, sulla porta del telefono di Mirion (telefono.mjs): parla con lo stesso server del computer,
// con le stesse API della stanza Clienti (/api/clienti). Si installa come app con «Aggiungi a schermata Home» (trainer.webmanifest).
import { daGuardare, squadra, quandoBreve, giorniDa, TEMI, FASTIDI } from './trainer-oggi.js'
import { accendiStelle } from './spazio.js'
import { BASE_API } from './trainer-config.js' // '' = il server di Mirion sul computer; online, l'indirizzo del backend

const $ = s => document.querySelector(s)
function el (tag, attr = {}, ...figli) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attr)) {
    if (v == null || v === false) continue
    if (k === 'testo') e.textContent = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) e.style.setProperty(p, x)
    else e.setAttribute(k, v === true ? '' : v)
  }
  for (const f of figli.flat()) if (f != null && f !== false) e.append(f.nodeType ? f : String(f))
  return e
}
async function api (url, corpo) {
  const r = await fetch(BASE_API + url, corpo === undefined ? { credentials: BASE_API ? 'include' : 'same-origin' } : { method: 'POST', credentials: BASE_API ? 'include' : 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  const d = await r.json().catch(() => ({ errore: 'risposta illeggibile' }))
  if (r.status === 401 && !d.accesso && !BASE_API) { location.href = '/'; throw new Error('Abbina prima il telefono') } // la porta del telefono chiede il codice
  if (!r.ok || d?.errore) throw new Error(d?.errore ?? `errore ${r.status}`)
  return d
}
// le viste: quello che non c'è (null) non si mette
const metti = (v, ...x) => v.replaceChildren(...x.flat().filter(n => n != null && n !== false))
let avviso = null
function dimmi (testo) {
  avviso?.remove()
  avviso = el('div', { class: 't-avviso', role: 'status', testo }); document.body.append(avviso)
  setTimeout(() => avviso?.remove(), 3800)
}
const iniziali = s => String(s ?? '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()
const faccia = c => c.faccia ? el('img', { class: 't-faccia', src: c.faccia, alt: '' }) : el('span', { class: 't-faccia', 'aria-hidden': 'true', testo: iniziali(c.nome) })
const giornoCorto = g => new Date(g + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const carta = (titolo, sopra, ...dentro) => el('section', { class: 't-carta' }, el('header', {}, el('h2', { testo: titolo }), sopra ? el('small', { testo: sopra }) : null), ...dentro)

// il cerchio delle prestazioni: lo stesso disegno di Mirion Fit (sei spicchi pieni quanto le serie a settimana)
function cerchio (pr, piccolo = false) {
  const NS = 'http://www.w3.org/2000/svg', c = 110, r0 = 40, r1 = 96, gr = Array.isArray(pr?.gruppi) ? pr.gruppi.slice(0, 8) : [], giro = (2 * Math.PI) / Math.max(1, gr.length), gap = 0.035
  const pt = (r, a) => `${(c + r * Math.sin(a)).toFixed(1)},${(c - r * Math.cos(a)).toFixed(1)}`
  const sp = (ra, rb, a0, a1) => `M${pt(ra, a0)} L${pt(rb, a0)} A${rb},${rb} 0 0 1 ${pt(rb, a1)} L${pt(ra, a1)} A${ra},${ra} 0 0 0 ${pt(ra, a0)} Z`
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', piccolo ? '0 0 220 220' : '-14 -4 248 228'); s.setAttribute('class', 't-cerchio' + (piccolo ? ' piccolo' : ''))
  s.setAttribute('role', 'img'); s.setAttribute('aria-label', `Cerchio prestazioni: ${pr?.punteggio ?? '–'} su 100`)
  const nodo = (tag, a, testo) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); if (testo != null) n.textContent = testo; s.append(n); return n }
  gr.forEach((g, i) => {
    const a0 = i * giro + gap, a1 = (i + 1) * giro - gap, pieno = Math.max(0, Math.min(1, +g.pieno || 0))
    nodo('path', { d: sp(r0, r1, a0, a1), class: 'vuoto' })
    if (pieno > 0.01) nodo('path', { d: sp(r0, r0 + (r1 - r0) * pieno, a0, a1), class: 'pieno' + (g.id === pr.debole ? ' debole' : '') })
    if (!piccolo) { const [x, y] = pt(r1 + 14, (a0 + a1) / 2).split(','); nodo('text', { x, y, class: 'nome', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g.nome) }
  })
  nodo('text', { x: c, y: c + (piccolo ? 10 : -4), class: 'punti', 'text-anchor': 'middle' }, pr?.punteggio ?? '–')
  if (!piccolo) nodo('text', { x: c, y: c + 16, class: 'sotto', 'text-anchor': 'middle' }, 'su 100')
  return s
}

let dati = null, letti = 0
async function leggi (forza = false) {
  if (!forza && dati && Date.now() - letti < 30_000) return dati
  dati = await api('/api/clienti'); letti = Date.now()
  $('#club').textContent = dati.club ?? ''
  return dati
}

// ---- Oggi ----
async function vistaOggi (v) {
  const d = await leggi(), lista = daGuardare(d.clienti), sq = squadra(d.clienti)
  const ora = new Date().getHours(), saluto = ora < 13 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'
  metti(v, 
    el('h1', { class: 't-titolo', testo: saluto }),
    el('p', { class: 't-sotto', testo: lista.length ? `${lista.length} ${lista.length === 1 ? 'cosa chiede' : 'cose chiedono'} una mano` : 'Tutto tranquillo fra i tuoi clienti' }),
    el('div', { class: 't-cifre' },
      ...[[sq.clienti, 'clienti'], [sq.allenati, 'allenati in settimana'], [sq.cerchio ?? '–', 'cerchio medio'], [sq.fermi, 'fermi', sq.fermi ? 'presto' : '']].map(([n, t, cls]) =>
        el('div', { class: 't-cifra ' + (cls ?? '') }, el('b', { testo: String(n) }), el('span', { testo: t })))),
    carta('Da guardare oggi', lista.length ? 'le più urgenti in cima' : '',
      lista.length ? el('ul', { class: 't-guarda' }, ...lista.slice(0, 20).map(x => el('li', { class: x.peso >= 90 ? 'urgente' : '' },
        el('a', { href: '#cliente/' + encodeURIComponent(x.id) }, el('span', { class: 't-icona', 'aria-hidden': 'true', testo: x.icona }),
          el('div', {}, el('small', { testo: [x.nome, quandoBreve(x.quando)].filter(Boolean).join(' · ') }), el('b', { testo: x.titolo }), x.testo ? el('p', { testo: x.testo }) : null)))))
        : el('p', { class: 't-vuoto', testo: 'Quando un cliente scrive dall’app, segna un fastidio a fine seduta o si ferma, compare qui.' })),
    d.clienti.some(c => c.piatto?.allena?.percorso?.oggi) ? carta('Le sedute di oggi', 'dal percorso di ognuno',
      el('ul', { class: 't-righe' }, ...d.clienti.filter(c => c.piatto?.allena?.percorso?.oggi).map(c => { const p = c.piatto.allena.percorso; return el('li', {}, el('a', { href: '#cliente/' + encodeURIComponent(c.id) }, faccia(c), el('div', {}, el('b', { testo: c.nome }), el('small', { testo: `${p.oggi}${p.di ? ` · ${p.fatti}/${p.di} esercizi` : ''}` })))) }))) : null)
}

// ---- Invita un cliente (Marco, 26-11-2026: «manca la parte dove si invitano con QR code o link e codice le persone») ----
// lo stesso invito della stanza Clienti sul computer: online un link personale (vale finché lo segui), se no quello sulla Wi-Fi.
// Il cliente inquadra il QR; se non può, gli mandi il link o gli detti il codice (Mirion Fit → Trainer → incolla).
function cartaInvito (d) {
  const box = el('div', { class: 't-invito' })
  const fai = async () => {
    bottone.disabled = true
    try {
      const r = await api('/api/clienti', { azione: d.online?.acceso ? 'invita-online' : 'invita' })
      const qr = el('div', { class: 't-qr' }); qr.innerHTML = r.qr ?? ''
      const link = r.url ?? r.link ?? '', codice = !r.online ? '' : (/[?&]k=([\w.~-]+)/.exec(link) || /\/([\w-]{12,})\/?(?:[?#]|$)/.exec(link) || [])[1] ?? ''
      const copia = async (t, detto) => { try { await navigator.clipboard.writeText(t); dimmi(detto) } catch { dimmi('Non riesco a copiare: tieni premuto sul testo.') } }
      metti(box, qr,
        el('p', { class: 't-nota', testo: r.online ? 'Fallo inquadrare con la fotocamera: si apre Mirion Fit con il suo link personale, che vale finché lo segui. Compare fra i tuoi clienti quando dà il consenso.' : `Col telefono sulla stessa Wi-Fi del computer. Vale una volta, fino a domani alle ${r.scade ? new Date(r.scade).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'}.` }),
        el('small', { class: 't-etichetta', testo: 'Il link' }), el('code', { class: 't-codice', testo: link }),
        codice ? el('small', { class: 't-etichetta', testo: 'Il codice (Mirion Fit → Trainer → incollalo)' }) : null, codice ? el('code', { class: 't-codice grande', testo: codice }) : null,
        el('div', { class: 't-bottoni t-fila' },
          navigator.share ? el('button', { type: 'button', class: 't-primario', onclick: () => navigator.share({ title: 'Mirion Fit', text: 'Il tuo link per Mirion Fit, con me come trainer:', url: link }).catch(() => {}) }, 'Manda il link') : null,
          el('button', { type: 'button', onclick: () => copia(link, 'Link copiato.') }, 'Copia il link'),
          codice ? el('button', { type: 'button', onclick: () => copia(codice, 'Codice copiato.') }, 'Copia il codice') : null,
          el('button', { type: 'button', onclick: () => { metti(box); box.append(bottone); bottone.disabled = false } }, 'Fatto')))
    } catch (e) { dimmi(e.message); bottone.disabled = false }
  }
  const bottone = el('button', { type: 'button', class: 't-primario t-largo', onclick: fai }, '＋ Invita un cliente')
  box.append(bottone)
  return carta('Invita un cliente', 'QR, link o codice', box)
}

// ---- Clienti ----
async function vistaClienti (v) {
  const d = await leggi()
  const cerca = el('input', { type: 'search', class: 't-cerca', placeholder: 'Cerca un cliente', 'aria-label': 'Cerca un cliente', oninput: () => { const q = cerca.value.trim().toLowerCase(); for (const li of lista.children) li.hidden = q && !li.dataset.nome.includes(q) } })
  const lista = el('ul', { class: 't-righe t-clienti' }, ...d.clienti.map(c => {
    const a = c.piatto?.allena, g = giorniDa(c.ultimo), fermo = g >= 3
    return el('li', { 'data-nome': c.nome.toLowerCase() }, el('a', { href: '#cliente/' + encodeURIComponent(c.id) }, faccia(c),
      el('div', {}, el('b', { testo: c.nome }), el('small', { testo: [fermo ? (c.ultimo ? `fermo da ${g} giorni` : 'mai') : `attivo · ${quandoBreve(c.ultimo)}`, a?.percorso?.titolo].filter(Boolean).join(' · ') })),
      a?.punteggio != null ? el('span', { class: 't-punti' + (a.punteggio < 55 ? ' basso' : ''), title: 'Cerchio prestazioni', testo: a.punteggio }) : null,
      el('span', { class: 't-pallino ' + (fermo ? 'fermo' : 'vivo'), 'aria-label': fermo ? 'fermo' : 'attivo' })))
  }))
  metti(v, el('h1', { class: 't-titolo', testo: 'I clienti' }), el('p', { class: 't-sotto', testo: `${d.clienti.length} che condividono con te` }),
    cartaInvito(d),
    d.clienti.length > 5 ? cerca : null,
    d.clienti.length ? lista : el('p', { class: 't-vuoto', testo: 'Ancora nessun cliente: invitalo qui sopra.' }))
}

// ---- Cerchio della squadra ----
async function vistaSquadra (v) {
  const sq = squadra((await leggi()).clienti)
  metti(v, el('h1', { class: 't-titolo', testo: 'Il cerchio' }), el('p', { class: 't-sotto', testo: 'Le serie a settimana per gruppo muscolare e la costanza, ultime 4 settimane' }),
    el('div', { class: 't-media' }, el('b', { testo: sq.cerchio ?? '–' }), el('span', { testo: 'su 100, la media della squadra' }), sq.fastidi ? el('em', { testo: `${sq.fastidi} ${sq.fastidi === 1 ? 'seduta' : 'sedute'} con un fastidio in 14 giorni` }) : null),
    sq.classifica.length ? carta('La classifica', 'tocca per aprire', el('ol', { class: 't-classifica' }, ...sq.classifica.map(x => el('li', {},
      el('a', { href: '#cliente/' + encodeURIComponent(x.id) }, el('span', { testo: x.nome }), el('i', { style: { '--pieno': x.punteggio + '%' }, class: x.punteggio < 55 ? 'basso' : '' }), el('b', { testo: x.punteggio }),
        el('small', { testo: [x.costanza != null ? `costanza ${x.costanza}%` : null, x.debole ? `da spingere: ${x.debole.toLowerCase()}` : null].filter(Boolean).join(' · ') }))))))
      : el('p', { class: 't-vuoto', testo: 'Il cerchio arriva quando i clienti si allenano con Mirion Fit.' }))
}

// ---- Un cliente ----
async function vistaCliente (v, id) {
  const c = await api('/api/clienti/uno?id=' + encodeURIComponent(id)), p = c.piatto ?? {}, pr = p.prestazioni, pc = p.percorso
  const ses = Array.isArray(p.sessioni) ? p.sessioni : [], av = Array.isArray(p.avvisi) ? p.avvisi : []
  const deb = pr?.gruppi?.find(g => g.id === pr.debole)
  metti(v, 
    el('a', { class: 't-indietro', href: history.length > 1 ? 'javascript:history.back()' : '#clienti', testo: '‹ Indietro' }),
    el('header', { class: 't-persona' }, faccia(c), el('div', {}, el('h1', { testo: c.nome }), el('small', { testo: [giorniDa(c.ultimo) >= 3 ? 'fermo' : 'attivo', `aggiornato ${quandoBreve(c.ultimo) || 'mai'}`, p.peso?.attuale ? `${String(p.peso.attuale).replace('.', ',')} kg` : null].filter(Boolean).join(' · ') }))),
    av.length ? carta('Gli avvisi dall’app', `${av.length}`, el('ul', { class: 't-guarda' }, ...[...av].reverse().slice(0, 6).map(a => el('li', { class: a.tema === 'dolore' ? 'urgente' : '' },
      el('div', { class: 't-riga' }, el('span', { class: 't-icona', 'aria-hidden': 'true', testo: a.tema === 'dolore' ? '🩹' : a.tema === 'salto' ? '⏸️' : a.tema === 'scheda' ? '📋' : '💬' }),
        el('div', {}, el('small', { testo: [TEMI[a.tema], quandoBreve(a.quando)].filter(Boolean).join(' · ') }), el('p', { testo: a.testo }))))))) : null,
    pr?.serie ? carta('Cerchio prestazioni', `${pr.sedute} sedute · costanza ${pr.costanza}%`, cerchio(pr),
      el('p', { class: 't-nota', testo: `Multiarticolari ${pr.multi}% · carichi liberi ${pr.liberi}% · macchine ${pr.macchine}%.${deb ? ` Da spingere: ${deb.nome.toLowerCase()}.` : ''}` }),
      pr.record?.length ? el('ul', { class: 't-righe semplici' }, ...pr.record.map(r => el('li', {}, el('b', { testo: r.nome }), el('small', { testo: `massimale stimato ${String(r.kg).replace('.', ',')} kg${r.prima ? ` (${r.kg >= r.prima ? '+' : ''}${String(Math.round((r.kg - r.prima) * 10) / 10).replace('.', ',')})` : ''}` })))) : null) : null,
    ses.length ? carta('Com’è andata ogni seduta', 'fatica da 1 a 10', el('ul', { class: 't-sedute' }, ...ses.slice(0, 8).map(s => el('li', { class: s.fastidio ? 'fastidio' : '' },
      el('span', { class: 't-fatica', testo: s.fatica ?? '–' }),
      el('div', {}, el('small', { testo: [giornoCorto(s.giorno), s.seduta].filter(Boolean).join(' · ') }),
        el('p', { testo: [s.fatica ? `fatica ${s.fatica}/10` : 'non ha detto com’è andata', s.fastidio ? `fastidio: ${FASTIDI[s.fastidio] ?? s.fastidio}` : null].filter(Boolean).join(' · ') }),
        s.nota ? el('blockquote', { testo: s.nota }) : null))))) : null,
    pc ? carta('Il suo percorso', pc.oggi ? `oggi ${pc.oggi}` : '', el('p', { class: 't-nota forte', testo: pc.titolo }),
      el('ul', { class: 't-righe semplici percorso-sedute' }, ...(pc.sedute ?? []).map(s => el('li', {}, el('b', { testo: s.nome }), el('small', { testo: (s.esercizi ?? []).join(' · ') }))))) : null,
    cartaProgressi(c, () => vistaCliente(v, id)),
    cartaScheda(c),
    cartaChat(c))
}

// la scheda dal telefono: una riga per esercizio, «Squat 4x8 80» (nome, serie×ripetizioni, kg)
function cartaScheda (c) {
  if (!c.online) return carta('La scheda', '', el('p', { class: 't-nota', testo: 'La scheda e i messaggi si mandano ai clienti di Mirion Fit online. Invitalo dal computer: stanza Clienti → «Invita su Mirion Fit online».' }))
  const s = c.scheda
  const righe = el('textarea', { rows: 6, name: 'righe', placeholder: 'Squat 4x8 80\nPanca piana 4x8 60\nLat machine 3x10 50\nPlank 3x45', 'aria-label': 'Gli esercizi, uno per riga' })
  righe.value = (s?.esercizi ?? []).map(e => `${e.nome} ${e.serie ?? 3}x${e.rip ?? 10}${e.kg ? ' ' + String(e.kg).replace('.', ',') : ''}`).join('\n')
  const titolo = el('input', { name: 'titolo', placeholder: 'Il titolo (es. Forza A)', value: s?.titolo ?? '', maxlength: 60, 'aria-label': 'Il titolo della scheda' })
  // in base a come va (26-11-2026): «Proponi» riscrive le righe con i kg da provare (dall'ultima volta); se è vuota, con gli
  // esercizi che fa di più
  const andamento = Array.isArray(c.piatto?.andamento) ? c.piatto.andamento : []
  const rigaDi = a => `${a.nome} ${a.serie?.length || 3}x${a.rip ?? 10}${(a.proposta?.kg ?? a.kg) ? ' ' + String(a.proposta?.kg ?? a.kg).replace('.', ',') : ''}`
  const proponi = () => {
    const perNome = new Map(andamento.map(a => [a.nome.toLowerCase(), a]))
    const scritte = righe.value.split('\n').map(r => r.trim()).filter(Boolean)
    righe.value = scritte.length ? scritte.map(r => { const a = [...perNome.entries()].find(([n]) => r.toLowerCase().startsWith(n))?.[1]; return a ? rigaDi(a) : r }).join('\n') : andamento.slice(0, 6).map(rigaDi).join('\n')
    dimmi('Ecco i kg da provare, da come è andata l’ultima volta.')
  }
  const comeVa = andamento.length ? el('ul', { class: 't-righe semplici' }, ...andamento.slice(0, 6).map(a => el('li', {}, el('b', { testo: a.nome }),
    el('small', { testo: `ultima: ${(a.serie ?? []).map(x => x.kg ? `${String(x.kg).replace('.', ',')} kg × ${x.rip}` : `${x.rip} rip.`).join(' · ')}${a.proposta ? ` → ${String(a.proposta.kg).replace('.', ',')} kg` : ''}` })))) : null
  return carta('La scheda', s ? `ora: ${s.titolo || 'senza titolo'}` : 'nessuna', comeVa, el('form', { class: 't-modulo', onsubmit: async e => {
    e.preventDefault()
    const esercizi = righe.value.split('\n').map(r => r.trim()).filter(Boolean).slice(0, 20).map(r => {
      const m = /^(.*?)\s+(\d{1,2})\s*[x×]\s*([\d-]{1,7})(?:\s+(\d+(?:[.,]\d+)?))?\s*(?:kg)?$/i.exec(r)
      return m ? { esercizioId: '', nome: m[1].trim(), serie: +m[2], rip: m[3], kg: m[4] ? +m[4].replace(',', '.') : null, recupero: null, note: '' } : { esercizioId: '', nome: r, serie: 3, rip: '10', kg: null, recupero: null, note: '' }
    })
    if (!esercizi.length) return dimmi('Scrivi almeno un esercizio.')
    try { await api('/api/clienti', { azione: 'scheda', id: c.id, scheda: { titolo: titolo.value.trim(), nota: '', esercizi } }); dimmi(`La scheda è arrivata a ${c.nome}.`) } catch (err) { dimmi(err.message) }
  } }, titolo, righe, el('div', { class: 't-bottoni' }, andamento.length ? el('button', { type: 'button', onclick: proponi }, 'Proponi in base a come va') : null, el('button', { class: 't-primario' }, 'Manda la scheda'))))
}

// i progressi che il cliente condivide (26-11-2026): li commenti dal telefono, il commento gli arriva in Mirion Fit
function cartaProgressi (c, rifai) {
  if (!c.online) return null
  const lista = Array.isArray(c.progressi) ? c.progressi : []
  const da = lista.filter(x => !(x.commenti ?? []).length).length
  return carta('I progressi', lista.length ? (da ? `${da} da commentare` : 'tutti commentati') : 'nessuno ancora', lista.length ? el('ul', { class: 't-guarda' }, ...lista.slice(0, 8).map(x => {
    const testo = el('input', { maxlength: 600, placeholder: 'Il tuo commento', 'aria-label': 'Il commento' })
    return el('li', { class: (x.commenti ?? []).length ? '' : 'nuovo' },
      el('div', {}, el('small', { testo: quandoBreve(x.quando) }), el('p', {}, el('b', { testo: x.titolo })), x.testo ? el('small', { testo: x.testo }) : null, x.nota ? el('blockquote', { testo: x.nota }) : null,
        ...(x.commenti ?? []).map(k => el('div', { class: 't-bolla mia' }, el('p', { testo: k.testo }))),
        el('form', { class: 't-scrivi', onsubmit: async e => { e.preventDefault(); if (!testo.value.trim()) return; try { await api('/api/clienti', { azione: 'commenta', id: c.id, progresso: x.id, testo: testo.value }); dimmi(`Commento mandato a ${c.nome}.`); rifai() } catch (err) { dimmi(err.message) } } },
          testo, el('button', { class: 't-primario t-tondo', 'aria-label': 'Commenta' }, '➤'))))
  })) : el('p', { class: 't-vuoto', testo: `Quando ${c.nome} condivide un progresso da Mirion Fit, lo commenti da qui.` }))
}

// la chat con il cliente, con le risposte veloci per gli avvisi
function cartaChat (c) {
  if (!c.online) return null
  const fila = el('div', { class: 't-chat' })
  const ora = q => new Date(q).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const disegna = mm => { fila.replaceChildren(...(mm.length ? mm.slice(-40).map(m => el('div', { class: `t-bolla ${m.da === 'trainer' ? 'mia' : 'sua'} ${m.tema === 'dolore' ? 'dolore' : ''}` }, m.da !== 'trainer' && TEMI[m.tema] ? el('small', { testo: TEMI[m.tema] }) : null, el('p', { testo: m.testo }), el('time', { testo: ora(m.quando) }))) : [el('p', { class: 't-vuoto', testo: `Scrivi a ${c.nome}: gli arriva su Mirion Fit.` })])); fila.scrollTop = fila.scrollHeight }
  disegna(c.messaggi ?? [])
  const testo = el('textarea', { rows: 1, placeholder: `Scrivi a ${c.nome}`, 'aria-label': 'Il messaggio', maxlength: 1000 })
  const veloci = ['Come va il fastidio? Oggi scarica pure e salta gli esercizi che fanno male.', 'Grande seduta, continua così!', 'Ti aggiorno la scheda entro stasera.']
  const manda = async t => {
    if (!t.trim()) return
    try { await api('/api/clienti', { azione: 'messaggio', id: c.id, testo: t }); testo.value = ''; const n = await api('/api/clienti/uno?id=' + encodeURIComponent(c.id)); disegna(n.messaggi ?? []); letti = 0 } catch (err) { dimmi(err.message) }
  }
  return carta('I messaggi', 'su Mirion Fit', fila,
    el('div', { class: 't-veloci' }, ...veloci.map(t => el('button', { type: 'button', onclick: () => { testo.value = t; testo.focus() } }, t.split(/[.!?]/)[0]))),
    el('form', { class: 't-scrivi', onsubmit: e => { e.preventDefault(); manda(testo.value) } }, testo, el('button', { class: 't-primario t-tondo', 'aria-label': 'Manda' }, '➤')))
}

// ---- il giro delle viste ----
async function mostra () {
  const [nome, ...resto] = (location.hash.slice(1) || 'oggi').split('/'), v = $('#vista')
  for (const a of document.querySelectorAll('.t-barra a')) a.setAttribute('aria-current', String(a.dataset.v === nome || (nome === 'cliente' && a.dataset.v === 'clienti')))
  try {
    if (nome === 'cliente' && resto[0]) await vistaCliente(v, decodeURIComponent(resto.join('/')))
    else if (nome === 'clienti') await vistaClienti(v)
    else if (nome === 'squadra') await vistaSquadra(v)
    else await vistaOggi(v)
    scrollTo(0, 0)
  } catch (e) { metti(v, el('p', { class: 't-vuoto', testo: e.message || 'Il computer non risponde: Mirion è acceso?' })) }
}
addEventListener('hashchange', mostra)
// il tuo Mirion Fit (Marco, 26-11-2026: «al trainer lo puoi far collegare anche al suo Mirion Fit, che è incluso, e può passare a
// quello da trainer»): la prima volta un invito online per te, poi si apre sempre quello. Nel link c'è «tr», l'indirizzo di questa
// pagina: Mirion Fit lo tiene e mostra «Mirion Trainer» in alto per tornare qui
const MIO_FIT = 'mirion-trainer:mio-fit'
$('#mio-fit').addEventListener('click', async () => {
  let link = null; try { link = localStorage.getItem(MIO_FIT) } catch { }
  if (!link) {
    const d = await leggi().catch(() => null)
    if (!d?.online?.acceso) return dimmi('Il tuo Mirion Fit usa Mirion Fit online: accendilo in Mirion sul computer, stanza Clienti.')
    try { const r = await api('/api/clienti', { azione: 'invita-online', etichetta: 'Io, il trainer' }); link = r.url ?? r.link } catch (e) { return dimmi(e.message) }
    try { localStorage.setItem(MIO_FIT, link) } catch { }
  }
  // il link per tornare porta il gettone di rientro: da Mirion Fit si rientra senza rifare l'abbinamento (server/telefono.mjs)
  let g = null; if (!BASE_API) try { g = (await (await fetch('/telefono/rientro', { method: 'POST', credentials: 'same-origin' })).json()).g } catch { }
  const u = new URL(link); u.searchParams.set('tr', location.origin + location.pathname + (g ? '?g=' + g : '') + '#oggi'); location.href = u.href
})
$('#aggiorna').addEventListener('click', async () => { letti = 0; await leggi(true).catch(() => {}); mostra() })
// le novità ogni minuto, finché la pagina si vede (non nella pagina di un cliente, per non perdere quello che stai scrivendo)
setInterval(() => { if (!document.hidden && !location.hash.startsWith('#cliente/')) { letti = 0; mostra() } }, 60_000)
accendiStelle()
mostra()
