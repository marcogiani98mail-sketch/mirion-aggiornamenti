// La stanza Diario (Marco, 20-11: «metti anche una sezione diario»): a sinistra i giorni, a destra la nota del giorno,
// letta come in Cerca; in cima, oggi, un campo per scrivere una riga, che va in fondo alla nota di oggi con l'ora.
import { el, api, notifica, quando } from './base.js'
import { leggiNota } from './markdown.js'
import { obsidian } from './ia.js'
import { dividiResoconti } from './resoconti.js'

let giornoScelto = null
// la scheda della nota: «diario» (le righe di sempre) o «resoconto» (l'ultimo resoconto di Mirion); dopo «Fai il resoconto» si va lì
let vista = 'diario'

export async function mostra (stanza, parametri) {
  if (parametri?.get('g')) { giornoScelto = parametri.get('g'); vista = 'diario' }
  const [d, sq] = await Promise.all([api('/api/diario' + (giornoScelto ? '?g=' + giornoScelto : '')), squadra()])
  const ridisegna = () => mostra(stanza)
  const giorni = d.giorni.some(g => g.data === d.oggi) ? d.giorni : [{ data: d.oggi, nota: d.nota }, ...d.giorni]
  // il diario e i resoconti (resoconti.js): due schede; il file resta com'è
  const parti = dividiResoconti((d.testo ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')), conResoconti = parti.resoconti.length > 0
  if (!conResoconti) vista = 'diario'
  const scheda = (quale, testo) => el('button', { type: 'button', class: vista === quale ? 'attiva' : '', 'aria-pressed': String(vista === quale), onclick: () => { vista = quale; ridisegna() } }, testo)
  const schede = conResoconti ? el('nav', { class: 'schede-fit diario-schede', 'aria-label': 'Il diario o il resoconto' },
    scheda('diario', 'Il diario'), scheda('resoconto', parti.resoconti.length > 1 ? `Il resoconto (l’ultimo di ${parti.resoconti.length})` : 'Il resoconto')) : null
  const corpo = d.testo == null ? null : vista === 'resoconto' && conResoconti ? parti.resoconti.at(-1) : parti.diario
  stanza.replaceChildren(
    el('div', { class: 'testata' }, el('div', {}, el('p', { class: 'sopra', testo: `Le note del giorno, in «${d.cartella}»` }), el('h1', { testo: 'Diario' }))),
    el('div', { class: 'diario' },
      el('nav', { class: 'diario-giorni pannello', 'aria-label': 'I giorni' }, el('ul', {}, ...giorni.map(g => el('li', {},
        el('button', { type: 'button', 'aria-current': g.data === d.giorno ? 'date' : null, onclick: () => { giornoScelto = g.data; vista = 'diario'; ridisegna() } },
          el('b', { testo: g.data === d.oggi ? 'Oggi' : quando(g.data) }), el('small', { testo: new Date(g.data + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) })))))),
      el('article', { class: 'diario-nota pannello' },
        d.giorno === d.oggi && el('div', { class: 'diario-azioni' }, scrivi(() => { vista = 'diario'; ridisegna() }, true), pulsanteResoconto(() => { vista = 'resoconto'; ridisegna() }), sq && pulsanteManda(sq)),
        el('div', { class: 'diario-testa' }, el('h2', { testo: new Date(d.giorno + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }), d.testo != null && obsidian(d.nota)),
        schede,
        corpo != null ? el('div', { class: 'lettore-testo' }, corpo ? leggiNota(corpo) : el('p', { class: 'vuoto', testo: 'Oggi, a parte il resoconto, non hai ancora scritto niente.' })) : el('p', { class: 'vuoto', testo: d.giorno === d.oggi ? 'Oggi non hai ancora scritto niente.' : 'Quel giorno non c\'è una nota.' }))))
}

// il campo per scrivere: una riga, Invio, ed è nel diario di oggi (anche dalla casella della scrivania)
export function scrivi (dopo, grande = false) {
  const campo = el('input', { type: 'text', class: grande ? 'campo-grande' : '', placeholder: 'Scrivi nel diario di oggi e premi Invio…', 'aria-label': 'Scrivi nel diario di oggi', maxlength: 2000 })
  const manda = async e => {
    e.preventDefault()
    const t = campo.value.trim(); if (!t) return
    campo.disabled = true
    try { await api('/api/diario', { testo: t }); campo.value = ''; notifica('Scritto nel diario di oggi.'); dopo?.() } catch (err) { notifica(err.message, { tipo: 'sempre' }) } finally { campo.disabled = false; campo.focus() }
  }
  return el('form', { class: 'diario-scrivi', onsubmit: manda }, campo, el('button', { class: 'secondario', testo: 'Scrivi' }))
}

// «Fai il resoconto di oggi» (Marco, 20-11: «mettilo un pulsante per fare un resoconto»): Delion raccoglie la giornata
// (cose chiuse, rimandate, sessioni, lavagne, note toccate, le personalizzazioni) e la scrive in fondo alla nota di oggi
export function pulsanteResoconto (dopo, classe = 'secondario') {
  const b = el('button', { type: 'button', class: classe + ' resoconto', title: 'Scrive in fondo alla nota di oggi quello che hai fatto oggi', testo: 'Fai il resoconto di oggi',
    onclick: async () => {
      b.disabled = true
      try {
        const r = await api('/api/diario/resoconto', {}), n = r.resoconto.split(/\r?\n/).filter(x => x.startsWith('- ')).length
        notifica(r.uguale ? 'Il resoconto è uguale all’ultimo: non l’ho riscritto.' : `Resoconto scritto nel diario di oggi: ${n} ${n === 1 ? 'riga' : 'righe'}. «Il diario» torna alla nota di sempre.`); dopo?.()
      }
      catch (e) { notifica(e.message, { tipo: 'sempre' }) } finally { b.disabled = false }
    } })
  return b
}

// nella squadra il diario si manda da qui (Marco, 20-11: «dimmi come invia diario»): scrive il resoconto di oggi e manda su GitHub
// il diario, il resoconto e il resto della propria postazione, come «Manda il mio lavoro» nella Squadra della scrivania (squadra.mjs)
// dall'area personale (la squadra solo guardata, 25-11) il diario è personale: niente «Manda il diario»
export const squadra = () => api('/api/squadra').then(s => s.attiva && s.io && !s.daFuori ? s : null).catch(() => null)
// mentre si manda il pulsante resta spento, anche se la pagina si ridisegna (Marco, 22-11: «se cliccato più volte deve inviare una sola»)
let mandando = null
export function pulsanteManda (sq, classe = 'primario') {
  const b = el('button', { disabled: Boolean(mandando), type: 'button', class: classe + ' manda-diario', title: `Manda a ${sq.persone.find(p => p.id === sq.io.sopra)?.nome ?? 'la squadra'} il diario e il resoconto di oggi`, testo: 'Manda il diario alla squadra',
    onclick: async () => {
      if (mandando) return
      b.disabled = true
      try {
        const r = await (mandando = api('/api/squadra/manda', {})); if (r.errore) throw new Error(r.errore)
        notifica(r.mandati ? `Mandato: ${r.mandati} file. Arriva alla squadra entro un minuto.` : 'Niente di nuovo da mandare.', { tipo: 'sempre' })
      } catch (e) { notifica(e.message, { tipo: 'sempre' }) } finally { mandando = null; document.querySelectorAll('.manda-diario').forEach(x => { x.disabled = false }) }
    } })
  return b
}
