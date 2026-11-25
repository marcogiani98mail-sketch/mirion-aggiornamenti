// Una cosa da fare del vault, con quello che ci puoi fare: fatta, rimanda, non serve più, archivia, aprila, darla a Claude.
// Ogni gesto scrive nella nota, nella riga giusta (il server controlla che il testo sia ancora quello).
import { el, api, notifica, festa, apri, quando, piu, oggiISO, nomeNota, STATO } from './base.js'
import { ic } from './icone.js'
import { conIA, mie, inOrdine, obsidian } from './ia.js'
import { attiva } from './aree.js'

// scegli: se c'è, un clic sul testo la manda altrove (sulla scrivania, in «Adesso»)
// figlia: è una sotto task mostrata sotto la sua principale (task.js), un po' rientrata
// esci: se c'è, fa uscire la cosa al posto della riga che sfuma (il banner «Adesso» passa alla prossima)
export function casella (k, { dopo, mostraData = true, scegli, figlia = false, esci } = {}) {
  const riga = el('li', { class: 'casella-riga' + (k.data && k.data < oggiISO() ? ' scaduta' : '') + (figlia ? ' casella-figlia' : '') })
  const segna = async (stato, data, evento, ora) => {
    try {
      await api('/api/casella', { nota: k.nota, riga: k.riga, testo: k.testo, stato, data, ora })
      if (stato === 'fatta' && evento) festa(evento.clientX, evento.clientY)
      if (esci) esci(stato); else { riga.classList.add('uscita'); setTimeout(() => { riga.remove(); dopo?.(stato) }, 380) }
      const detto = { fatta: 'Fatta', annullata: 'Segnata come «non serve più»', archivia: 'Archiviata in «Archivio/Cose da fare archiviate»', rimanda: `Rimandata a ${quando(data)}`,
        pausa: 'In pausa: non te la ripropongo finché non la riprendi', valutare: 'Da valutare: la trovi in Task, «Da valutare»', valutata: 'Valutata: torna fra le cose da fare', riprendi: 'Ripresa: torna fra le cose da fare', riapri: 'Riaperta: torna fra le cose da fare', ora: ora ? `Alle ${ora}: scritto anche nella nota` : 'Tolta l’ora' }[stato]
      // fatta per sbaglio: «Annulla» la riapre nella nota (Marco, 22-11), e la lista si rifà
      const torna = () => api('/api/casella', { nota: k.nota, riga: k.riga, testo: k.testo, stato: 'riapri' }).then(() => { notifica('Tornata da fare, anche nella nota.'); dopo?.('torna') }).catch(e => notifica(e.message, { tipo: 'sempre' }))
      notifica(detto, stato === 'fatta' ? { azione: { testo: 'Annulla', fai: torna }, durata: 9000 } : undefined)
    } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  // lo stato decide i gesti: una ferma (in pausa o archiviata) si riprende; se a fermarla è la nota, si cambia nella nota
  // una già fatta (la vista «Fatte» di Task) si riapre, come un'archiviata
  const ferma = ['pausa', 'archiviata', 'fatta'].includes(k.stato), dallaNota = ferma && k.stato !== 'fatta' && k.perche === 'nota'
  // nella squadra (chi-fa.mjs): di chi è la task; quella di un altro non si fa e non si spunta da qui; una di tutti e due
  // si prende prima di farla (anche «Fallo con» la prende), così su GitHub l'altro la vede presa e non la fa anche lui
  const altrui = k.mia === false, libera = k.condivisa && !k.chi
  const prendi = async via => {
    try { await api('/api/casella/' + via, { nota: k.nota, riga: k.riga, testo: k.testo }); notifica(via === 'prendi' ? 'Presa: su GitHub ora è tua, l’altro la vede presa' : 'Lasciata: torna libera per tutti e due'); dopo?.('chi'); return true } catch (e) { notifica(e.message, { tipo: 'sempre' }); return false }
  }
  const chiTesto = k.insieme ? 'insieme' : libera ? 'di tutti e due · libera' : k.condivisa ? (k.mia ? `presa da ${k.chiNome}` : `la sta facendo ${k.chiNome}`) : k.chi ? `di ${k.chiNome}` : null // il nome di chi la fa (Marco, 22-11)
  const perche = dallaNota && el('p', { class: 'casella-perche', testo: `È ${k.stato === 'pausa' ? 'in pausa' : 'archiviata'} perché la nota è «${k.statoNota}»: si riprende cambiando lo stato nella nota.` })
  const valutare = k.stato === 'valutare' // «#da-valutare» nella riga (Marco, 25-11): si decide se farla
  const menu = el('div', { class: 'casella-menu', hidden: true },
    ...(valutare ? [el('button', { type: 'button', testo: 'È da fare', onclick: () => segna('valutata') }), el('hr')] : []),
    ...(ferma ? [perche || el('button', { type: 'button', testo: k.stato === 'pausa' ? 'Riprendila' : 'Riaprila', onclick: () => segna(k.stato === 'pausa' ? 'riprendi' : 'riapri') }), el('hr')] : [
      el('button', { type: 'button', testo: 'Domani', onclick: () => segna('rimanda', piu(oggiISO(), 1)) }),
      el('button', { type: 'button', testo: 'Fra una settimana', onclick: () => segna('rimanda', piu(oggiISO(), 7)) }),
      el('label', {}, 'Il giorno ', el('input', { type: 'date', min: oggiISO(), onchange: e => e.target.value && segna('rimanda', e.target.value) })),
      // l'ora (Marco, 25-11): si mette o si cambia a mano; Claude la scrive solo se qualcosa la dice
      el('button', { type: 'button', class: 'voce-ora', testo: k.ora ? `Cambia l’ora (${k.ora})…` : 'Metti un’ora…', onclick: () => scegliOra(posto(), k.ora, o => segna('ora', null, null, o)) }),
      k.ora ? el('button', { type: 'button', testo: 'Togli l’ora', onclick: () => segna('ora', null, null, '') }) : null,
      el('hr'),
      el('button', { type: 'button', testo: 'Metti in pausa', onclick: () => segna('pausa') }),
      valutare ? null : el('button', { type: 'button', testo: 'Da valutare', onclick: () => segna('valutare') }),
      el('button', { type: 'button', testo: 'Non serve più', onclick: () => segna('annullata') }),
      el('button', { type: 'button', testo: 'Archivia', onclick: () => segna('archivia') }),
      el('hr')]),
    ...(ferma ? [] : [el('button', { type: 'button', class: 'voce-sotto', testo: 'Aggiungi una sotto task…', onclick: () => sottoTask(k, posto(), dopo) })]),
    ...(k.condivisa && !ferma ? [libera ? el('button', { type: 'button', testo: 'La prendo io', onclick: () => prendi('prendi') }) : k.mia ? el('button', { type: 'button', testo: 'Lasciala: torna libera', onclick: () => prendi('lascia') }) : null].filter(Boolean) : []),
    // dalla a qualcuno della squadra (Marco, 25-11): solo nell'area di gruppo, dove le note viaggiano con GitHub
    ...(!ferma && !valutare && attiva()?.tipo === 'squadra' ? [el('button', { type: 'button', testo: 'Dalla a…', onclick: () => daiA(k, posto(), dopo) })] : []),
    el('button', { type: 'button', class: 'voce-obsidian', testo: 'Apri la nota in Obsidian', onclick: () => apri.obsidian(k.nota).catch(e => notifica(e.message)) }),
    ...(altrui ? [] : inOrdine()).map(ia => el('button', { type: 'button', class: 'voce-ia', style: { '--c': ia.colori[1] }, onclick: async () => { if (!libera || await prendi('prendi')) conIA.compito(k, ia.id) } }, el('img', { src: `./icone/${ia.id}.png`, alt: '' }), `Fallo con ${ia.nome}`)),
    // Claude ci lavora da solo (Marco, 25-11: «quando si apre una task, così poi Claude lavora in automatico»): con l'abbonamento
    // Claude Code parte sul vault senza invio da premere (server/claude-code.mjs); con l'API parte la chat della task (claude.js)
    ...(altrui || ferma ? [] : [
      STATO.app?.claude !== false ? el('button', { type: 'button', class: 'voce-ia', style: { '--c': '#f2a37f' }, testo: 'Claude lavora da solo (abbonamento)', onclick: async () => {
        if (libera && !await prendi('prendi')) return
        try { await api('/api/claude/compito', { nota: k.nota, riga: k.riga, testo: k.testo }); notifica(`Claude lavora da solo su «${pulitoTesto(k.testo)}»: ti avviso quando ha finito. Lo segui in «Lavoro con l'IA».`, { tipo: 'sempre', durata: 7000 }) } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
      } }) : null,
      STATO.claudeApi && STATO.claudeApiAttiva ? el('button', { type: 'button', class: 'voce-ia', style: { '--c': '#f2a37f' }, testo: 'Claude lavora da solo (API)', onclick: async () => { if (libera && !await prendi('prendi')) return; (await import('./claude.js')).lavoraConAPI(k) } }) : null].filter(Boolean)))
  // il ⋯ (e il tasto destro sulla riga) apre lo stesso menu come menu che galleggia sopra tutto (menu.js): dentro una casella
  // con l'altezza fissa il menu di prima restava tagliato. Le voci sono quelle di «menu», che resta nascosto e fa i gesti.
  let qui = null; const posto = () => qui ?? tre // vicino a chi si aprono il campo della sotto task e il calendario
  const voci = () => [...menu.children].map(x => x.tagName === 'HR' ? '-'
    : x.tagName === 'LABEL' ? { testo: 'Rimanda a un giorno…', segno: '→', fai: () => scegliGiorno(posto(), d => segna('rimanda', d)) }
    : x.tagName === 'BUTTON' ? { testo: x.textContent, fai: () => x.click() } : null).filter(Boolean)
  const tre = el('button', { type: 'button', class: 'casella-piu', 'aria-label': 'Altro su questa cosa da fare', 'aria-haspopup': 'menu',
    onclick: e => { e.stopPropagation(); qui = null; const r = tre.getBoundingClientRect(); import('./menu.js').then(m => m.apriMenu(r.left - 200, r.bottom + 4, voci(), pulitoTesto(k.testo))) } }, ic('dots-three'))
  // l'archiviata non si spunta: a sinistra il pulsante per riaprirla (o niente, se la ferma la nota)
  const sinistra = altrui && !ferma ? el('span', { class: 'spunta ferma', title: `È di ${k.chiNome}: la spunta ${k.chiNome}`, 'aria-label': `Di ${k.chiNome}` })
    : k.stato === 'archiviata' || k.stato === 'fatta'
    ? (dallaNota ? el('span', { class: 'spunta ferma', 'aria-hidden': 'true' }) : el('button', { type: 'button', class: 'spunta riapri', title: 'Riaprila', 'aria-label': `Riapri: ${k.testo}`, testo: '↺', onclick: () => segna('riapri') }))
    : el('button', { type: 'button', class: 'spunta', 'aria-label': `Fatta: ${k.testo}`, onclick: e => segna('fatta', null, e) })
  // lo stesso menu aperto da un altro pulsante (il «⋯ Altro» di «Adesso», 23-11), anche se la riga non è sulla pagina
  riga.apriMenu = vicino => { qui = vicino; const r = vicino.getBoundingClientRect(); import('./menu.js').then(m => m.apriMenu(Math.max(8, r.left), r.bottom + 4, voci(), pulitoTesto(k.testo))) }
  if (k.stato) riga.classList.add('stato-' + k.stato)
  riga.append(sinistra,
    el(scegli ? 'button' : 'div', scegli ? { type: 'button', class: 'casella-testo', title: 'Mettila in «Adesso», in alto', onclick: () => scegli(k, riga) } : { class: 'casella-testo' }, el('span', { testo: k.testo.replace(/📅\s*\d{4}-\d{2}-\d{2}/, '').replace(ORA_NEL_TESTO, '').replace(/\s?👤\s?[a-z0-9-]+/, '').replace(/\s?#da-valutare\b/, '').trim() }),
      el('small', {}, mostraData && k.data ? el('b', { testo: quando(k.data) + (k.ora ? '' : ' · ') }) : null, k.ora ? el('b', { class: 'casella-ora', testo: (mostraData && k.data ? ' alle ' : '') + k.ora + ' · ' }) : null, nomeNota(k.nota), chiTesto ? el('span', { class: 'chi-fa' + (altrui ? ' altrui' : libera ? ' libera' : ''), testo: ' · ' + chiTesto }) : null,
        k.sotto ? el('span', { class: 'sotto-conto' + (k.sotto.fatte === k.sotto.totali ? ' tutte' : ''), testo: ` · ${k.sotto.fatte}/${k.sotto.totali} sotto task` }) : null)),
    el('div', { class: 'casella-lati' }, obsidian(k.nota, ''), tre), menu)
  return riga
}
document.addEventListener('click', e => { if (!e.target.closest('.casella-menu')) document.querySelectorAll('.casella-menu').forEach(m => { m.hidden = true }) })

// «Aggiungi una sotto task…»: un campo vicino al ⋯, con la data se c'è; la sotto task va nella nota, rientrata sotto la principale
function sottoTask (k, vicino, dopo) {
  const r = vicino.getBoundingClientRect(), t = el('input', { placeholder: 'La sotto task', 'aria-label': 'La sotto task', required: true, maxlength: 300 }), d = el('input', { type: 'date', 'aria-label': 'Entro il' }), o = el('input', { type: 'time', 'aria-label': 'Alle (se c’è un’ora)' })
  const f = el('form', { class: 'sotto-al-volo', style: { position: 'fixed', left: Math.max(8, Math.min(innerWidth - 380, r.left - 300)) + 'px', top: Math.min(innerHeight - 70, r.bottom + 4) + 'px', zIndex: 80 },
    onsubmit: async e => { e.preventDefault(); try { await api('/api/casella/sotto', { nota: k.nota, riga: k.riga, testo: k.testo, nuova: t.value, data: d.value || null, ora: o.value || null }); f.remove(); notifica('Sotto task aggiunta nella nota.'); dopo?.('sotto') } catch (err) { notifica(err.message, { tipo: 'sempre' }) } } },
    t, d, o, el('button', { class: 'primario piccolo', testo: 'Aggiungi' }), el('button', { type: 'button', class: 'quieto', 'aria-label': 'Annulla', onclick: () => f.remove() }, ic('x')))
  f.addEventListener('keydown', e => { if (e.key === 'Escape') f.remove() })
  document.body.append(f); t.focus()
}

// «Dalla a…»: le persone a cui puoi darla (te, chi sta sotto; il titolare tutti), in un menu vicino al ⋯
async function daiA (k, vicino, dopo) {
  try {
    const { persone = [] } = await api('/api/squadra/a-chi')
    if (!persone.length) return notifica('Il tuo ruolo non dà task ad altri.', { tipo: 'sempre' })
    const r = vicino.getBoundingClientRect(), m = await import('./menu.js')
    m.apriMenu(Math.max(8, r.left - 200), r.bottom + 4, persone.map(p => ({ testo: p.nome + (p.reparto ? ` · ${p.reparto}` : ''), scelta: p.id === k.chi, fai: async () => {
      try { await api('/api/casella/dai', { nota: k.nota, riga: k.riga, testo: k.testo, persona: p.id }); notifica(`Data a ${p.nome}: su GitHub la vede sua.`); dopo?.('chi') } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
    } })), 'A chi la dai')
  } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}

// l'ora nella riga (vault.mjs, oraDellaRiga): «⏰ 15:30» non si legge nel testo, si mostra sotto
export const ORA_NEL_TESTO = /\s?⏰\s*(?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}[:.]\d{2}/u
const pulitoTesto = t => t.replace(/📅\s*\d{4}-\d{2}-\d{2}/, '').replace(ORA_NEL_TESTO, '').replace(/\s?👤\s?[a-z0-9-]+/, '').replace(/\s?#da-valutare\b/, '').trim().slice(0, 60)
// «Metti un'ora…»: un campo dell'ora vicino al ⋯, con l'ora di adesso se non ce n'è una; Invio (o «Va bene») la scrive nella nota
function scegliOra (vicino, prima, fai) {
  const r = vicino.getBoundingClientRect()
  const i = el('input', { type: 'time', value: prima ?? '', 'aria-label': 'L’ora', required: true })
  const f = el('form', { class: 'sotto-al-volo ora-al-volo', style: { position: 'fixed', left: Math.max(8, Math.min(innerWidth - 260, r.left - 160)) + 'px', top: Math.min(innerHeight - 70, r.bottom + 4) + 'px', zIndex: 80 },
    onsubmit: e => { e.preventDefault(); if (i.value) { f.remove(); fai(i.value) } } },
    i, el('button', { class: 'primario piccolo', testo: 'Va bene' }), el('button', { type: 'button', class: 'quieto', 'aria-label': 'Annulla', onclick: () => f.remove() }, ic('x')))
  f.addEventListener('keydown', e => { if (e.key === 'Escape') f.remove() })
  document.body.append(f); i.focus()
}
// «Rimanda a un giorno…»: il calendario del sistema, aperto vicino al ⋯; un giorno scelto rimanda la cosa da fare
function scegliGiorno (vicino, fai) {
  const r = vicino.getBoundingClientRect()
  const i = el('input', { type: 'date', min: oggiISO(), class: 'giorno-al-volo', 'aria-label': 'Il giorno', style: { position: 'fixed', left: Math.max(8, r.left - 160) + 'px', top: r.bottom + 4 + 'px', zIndex: 80 } })
  const via = () => setTimeout(() => i.remove(), 0)
  i.addEventListener('change', () => { if (i.value) fai(i.value); via() })
  i.addEventListener('blur', via)
  document.body.append(i); i.focus()
  try { i.showPicker() } catch { /* senza il calendario del sistema resta il campo, da scrivere */ }
}
