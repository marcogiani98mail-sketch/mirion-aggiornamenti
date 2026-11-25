// «Le app sul telefono» sulla scrivania (Marco, 25-11-2026: «sulla mia dashboard in cervello fammi visualizzare la versione da
// telefono di Fit e di Trainer»): due telefoni uno accanto all'altro, vivi e da usare con il mouse. A sinistra Mirion Fit (il
// programma su questo computer, acceso se serve, come nella stanza del gestionale; senza programma la versione online), a destra
// Mirion Trainer sul telefono (trainer.html, la stessa pagina che si apre dal telefono abbinato).
import { el, api } from './base.js'
import { ic } from './icone.js'

const telefono = (nome, sotto, riquadro, apri) => el('figure', { class: 'telefono-finto' },
  el('div', { class: 'telefono-scocca' }, el('span', { class: 'telefono-isola', 'aria-hidden': 'true' }), riquadro),
  el('figcaption', {}, el('b', { testo: nome }), el('small', { class: 'sopra', testo: sotto }), apri))

async function indirizzoFit () {
  const { prodotti = [] } = await api('/api/prodotti')
  const p = prodotti.find(x => x.id === 'piatto') ?? prodotti.find(x => /fit|piatto/i.test(`${x.id} ${x.nome}`))
  if (!p) throw new Error('Mirion Fit non è fra i software di questo cervello.')
  if (p.programma?.ce || !p.online) {
    const r = await api('/api/prodotti/apri', { id: p.id, dentro: true })
    const u = new URL(r.aperto)
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) { u.hostname = location.hostname; u.port = String(+u.port + 10000) } // dal telefono abbinato
    return u.href
  }
  return p.online
}

export function casellaTelefoni () {
  const fit = el('iframe', { class: 'telefono-schermo', title: 'Mirion Fit, versione telefono', referrerpolicy: 'no-referrer', loading: 'lazy' })
  const trainer = el('iframe', { class: 'telefono-schermo', title: 'Mirion Trainer, versione telefono', src: '/trainer.html#oggi', loading: 'lazy' })
  const statoFit = el('small', { class: 'sopra', testo: 'accendo…' })
  indirizzoFit().then(u => { fit.src = u; statoFit.textContent = 'quello che vede il cliente' })
    .catch(e => { statoFit.textContent = e.message; fit.replaceWith(el('p', { class: 'vuoto telefono-schermo', testo: e.message })) })
  const ricarica = () => { for (const f of [fit, trainer]) if (f.src) f.src = f.src }
  return el('div', { class: 'telefoni-casella' },
    el('header', { class: 'telefoni-cima' }, el('p', { class: 'sopra piccolo', testo: 'Le due app come sul telefono: si usano anche da qui.' }),
      el('button', { type: 'button', class: 'quieto piccolo', onclick: ricarica, title: 'Ricarica i due telefoni' }, ic('arrows-clockwise'), 'Ricarica')),
    el('div', { class: 'telefoni-fila' },
      el('figure', { class: 'telefono-finto' },
        el('div', { class: 'telefono-scocca' }, el('span', { class: 'telefono-isola', 'aria-hidden': 'true' }), fit),
        el('figcaption', {}, el('b', { testo: 'Mirion Fit' }), statoFit, el('a', { class: 'quieto piccolo', href: '#prodotto?id=piatto' }, ic('arrow-up-right'), 'Le card'))),
      telefono('Mirion Trainer', 'quello che vedi tu dal telefono', trainer, el('a', { class: 'quieto piccolo', href: '#clienti' }, ic('arrow-up-right'), 'I clienti'))))
}
