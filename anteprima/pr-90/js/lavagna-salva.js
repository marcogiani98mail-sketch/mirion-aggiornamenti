// Salvare la lavagna con un nome e condividerla con la squadra (Marco, 21-11: «nella lavagna fammi salvare quello che faccio
// e dammi il modo di condividere facilmente le cose sul GitHub di Delion come se lo facessi da Claude»).
// «Salva» (Marco, 24-11 sera: «la lavagna quando salvi salva non l'immagine ma il link apribile della lavagna»): il disegno in
// Lavagne/ dell'area che stai usando, con una nota e il link mirion://lavagna/<nome> che la riapre in Mirion (anche da Obsidian);
// il link va anche negli appunti. «Condividi con la squadra»: il disegno e la sua immagine nella tua postazione dell'area di
// gruppo scelta, e su GitHub in un clic (lavagna-squadra.mjs). Il foglio di lavoro resta quello di sempre.
import { el, api, notifica, oggiISO } from './base.js'
import { ic } from './icone.js'

// opz: { vuota: () => bool, nome: () => il nome della lavagna aperta (o null), scena: () => testo della scena, png: async () => immagine in data URL }
export const pulsantiSalva = opz => [
  el('button', { type: 'button', class: 'secondario', title: 'Il disegno in Lavagne/, con il link che lo riapre in Mirion', onclick: () => finestra(opz, false) }, ic('check'), 'Salva'),
  el('button', { type: 'button', class: 'secondario condividi-squadra', title: 'Nella tua postazione dell\'area di gruppo, e su GitHub', onclick: () => finestra(opz, true) }, ic('users-three'), 'Condividi con la squadra'),
]

const ora = () => new Date().toTimeString().slice(0, 8).replaceAll(':', '-') // con i secondi: due lavagne nello stesso minuto non si sovrascrivono

async function finestra (opz, condividi) {
  if (opz.vuota()) return notifica('La lavagna è vuota: disegna qualcosa prima.', { tipo: 'sempre' })
  const d = condividi ? await api('/api/aree').catch(() => ({ aree: [] })) : null
  const gruppi = d?.aree.filter(a => a.tipo === 'squadra') ?? []
  if (condividi && !gruppi.length) { notifica('Non hai ancora un\'area di gruppo: collegala dalla Squadra della scrivania.', { tipo: 'sempre' }); location.hash = 'scrivania?sezione=squadra'; return }
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const nome = el('input', { value: (!condividi && opz.nome?.()) || `Lavagna ${oggiISO()} ${ora()}`, 'aria-label': 'Nome della lavagna', maxlength: 80, required: true })
  const dove = condividi && el('select', { 'aria-label': 'L\'area di gruppo' }, ...gruppi.map(a => el('option', { value: a.id, selected: a.id === d.attiva, testo: a.nome + (a.io ? '' : ' (scegli prima chi sei)') })))
  const vai = el('button', { class: 'primario', testo: condividi ? 'Condividi' : 'Salva' })
  const manda = async e => {
    e.preventDefault(); vai.disabled = true; vai.textContent = condividi ? 'Mando su GitHub…' : 'Salvo…'
    try {
      const scena = opz.scena()
      if (!condividi) {
        const r = await api('/api/lavagna/salva', { nome: nome.value, scena })
        let appunti = false; try { await navigator.clipboard.writeText(r.link); appunti = true } catch { }
        notifica(`Salvata «${r.nome}». ${appunti ? 'Il link che la riapre è negli appunti' : 'Il link che la riapre: ' + r.link}, e nella nota ${r.nota}.`, { tipo: 'sempre', durata: 9000 })
      } else {
        const png = await opz.png()
        const r = await api('/api/lavagna/condividi', { area: dove.value, nome: nome.value, png, scena })
        notifica(r.mandata ? `Condivisa in «${r.area}»: ${r.png}. Gli altri la vedono fra le novità.` : r.errore, { tipo: 'sempre', durata: 9000 })
      }
      fondo.remove()
    } catch (err) { notifica(err.message, { tipo: 'sempre' }); vai.disabled = false; vai.textContent = condividi ? 'Condividi' : 'Salva' }
  }
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': condividi ? 'Condividi la lavagna con la squadra' : 'Salva la lavagna' },
    el('header', {}, el('h2', { testo: condividi ? 'Condividi con la squadra' : 'Salva la lavagna' }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    el('p', { class: 'sopra', testo: condividi ? 'Il disegno e la sua immagine vanno nella tua postazione, in Lavagne/, e partono su GitHub: chi è nella squadra li vede fra le novità.' : 'Il disegno resta nell\'area che stai usando, in Lavagne/, con una nota e il link che lo riapre in Mirion (anche da Obsidian). Il link va negli appunti. Il foglio di lavoro non cambia.' }),
    el('form', { class: 'campi-area', onsubmit: manda },
      el('label', {}, el('span', { testo: 'Nome' }), nome),
      dove ? el('label', {}, el('span', { testo: 'Area di gruppo' }), dove) : null, vai)))
  document.body.append(fondo); nome.select()
  addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { fondo.remove(); removeEventListener('keydown', esc) } })
}
