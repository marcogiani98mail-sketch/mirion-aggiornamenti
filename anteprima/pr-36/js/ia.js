// «Fallo con…»: le intelligenze artificiali che usi (quelle del tuo preset: Claude, ChatGPT, Gemini…), ognuna con il suo colore e la sua icona.
// La richiesta si apre già scritta dove il servizio lo permette, ed è sempre anche negli appunti (Ctrl+V).
// E «Apri in Obsidian», lo stesso pulsante dovunque c'è una nota.
import { el, api, notifica, STATO, apri } from './base.js'
import { MISURA, salva } from './su-misura.js'
import { apriMenu } from './menu.js'
import { ic } from './icone.js'

const CLAUDE = { id: 'claude', nome: 'Claude', colori: ['#d9643a', '#f2a37f'] }
export const mie = () => STATO.preset?.ia?.length ? STATO.preset.ia : [CLAUDE]
// Claude e Codex lavorano dentro il vault; le altre IA nella chat
export const sulVault = id => String(id ?? 'claude').startsWith('claude') || id === 'codex'
const copia = t => navigator.clipboard?.writeText(t).then(() => true, () => false) ?? Promise.resolve(false)

async function manda (url, corpo, { appunti = true } = {}) {
  try {
    const r = await api(url, corpo), nome = mie().find(m => m.id === corpo.ia)?.nome ?? 'Claude'
    const copiato = appunti && r.testo ? await copia(r.testo) : false
    notifica(corpo.modo === 'code' || sulVault(corpo.ia) ? `${corpo.ia === 'codex' ? 'Codex' : 'Claude'} si apre sul tuo cervello con la richiesta già scritta: conferma la cartella e premi invio.`
      : r.incolla ? `${nome} si apre: incolla la richiesta con Ctrl+V e premi invio.`
      : `${nome} si apre con la richiesta già scritta: premi invio.${copiato ? ' Se non la vedi, è negli appunti: Ctrl+V.' : ''}`, { tipo: 'sempre', durata: 7000 })
  } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
}

export const conIA = {
  compito: (k, ia, modo) => manda('/api/ia/compito', { nota: k.nota, riga: k.riga, testo: k.testo, ia, modo }),
  progetto: (cartella, ia) => manda('/api/ia/progetto', { cartella, ia }),
  testo: (testo, ia) => manda('/api/ia/testo', { testo, ia }),
  lavagna: (png, ia, modo) => manda('/api/ia/lavagna', { png, ia, modo }, { appunti: false }), // negli appunti c'è già il disegno
}

// un pulsante con i colori e l'icona dell'IA
export const pulsanteIA = (ia, testo, fai, piccolo) => el('button', { type: 'button', class: 'ia' + (piccolo ? ' piccolo' : ''), style: { '--c1': ia.colori[0], '--c2': ia.colori[1] }, title: `${testo} ${ia.nome}`, onclick: () => fai(ia.id) },
  el('img', { src: `./icone/${ia.id}.png`, alt: '' }), piccolo ? ia.nome : `${testo} ${ia.nome}`)

// la predefinita (Marco, 20-11: «rendi default il tasto fai con Claude, dai la possibilità di scegliere la predefinita e ogni volta,
// in ogni apparato, la selezione di quale si voglia usare»): si sceglie in Personalizza o dalla freccina; di partenza Claude
export const predefinita = () => mie().find(m => m.id === MISURA.d?.ia) ?? mie().find(m => m.id === 'claude') ?? mie()[0]
// tutte, la predefinita per prima (nei menu e in Ctrl K)
export const inOrdine = () => { const p = predefinita(); return [p, ...mie().filter(m => m.id !== p.id)] }

// la fila: «Fallo con» e la predefinita, la freccina per scegliere un'altra IA questa volta (o cambiare la predefinita).
// «Fallo con Claude» apre Claude dentro il vault (Marco, 21-11): non c'è più un pulsante a parte per Claude Code
export function pulsantiIA (fai, { testo = 'Fallo con' } = {}) {
  const pre = predefinita(), tutte = mie()
  const scegli = el('button', { type: 'button', class: 'ia-scegli', style: { '--c1': pre.colori[0] }, 'aria-haspopup': 'menu', 'aria-label': `${testo}: scegli l'intelligenza artificiale`, title: 'Scegli con quale IA, questa volta',
    onclick: () => {
      const r = scegli.getBoundingClientRect()
      apriMenu(r.left, r.bottom + 4, [
        ...tutte.map(ia => ({ testo: `${testo} ${ia.nome}`, img: `./icone/${ia.id}.png`, colore: ia.colori[1], scelta: ia.id === pre.id, fai: () => fai(ia.id) })),
        '-', { testo: 'La predefinita', segno: '✎', sotto: tutte.map(ia => ({ testo: ia.nome, img: `./icone/${ia.id}.png`, colore: ia.colori[1], scelta: ia.id === pre.id, fai: () => { MISURA.d.ia = ia.id; salva({ subito: true }); notifica(`${ia.nome} è la tua IA predefinita.`) } })) },
      ], 'Con quale IA')
    } }, ic('caret-down'))
  return [el('span', { class: 'ia-gruppo' }, pulsanteIA(pre, testo, fai), scegli)]
}

// «Apri in Obsidian»: grande con il testo, o piccolo con la sola icona
export const obsidian = (nota, testo = 'Apri in Obsidian') => el('button', { type: 'button', class: testo ? 'obsidian' : 'obsidian-icona', title: 'Apri in Obsidian', 'aria-label': `Apri «${nota}» in Obsidian`,
  onclick: e => { e.stopPropagation(); e.preventDefault(); apri.obsidian(nota).catch(err => notifica(err.message, { tipo: 'sempre' })) } }, el('img', { src: './icone/obsidian.png', alt: '' }), testo || null)
