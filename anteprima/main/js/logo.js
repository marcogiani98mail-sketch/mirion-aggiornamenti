// Il logo di Mirion, modificabile (Marco, 23-11-2026: «il logo oltre questa variante, quella online adesso sul gestionale in uso,
// da rendere modificabile: dobbiamo fare altre tre varianti, una è quello che hai inviato, che si differenzino»).
// Quattro: «Mirion» (il marchio di adesso, app/marchio.svg), «Linea» (solo l'onda, nel colore di Mirion), «Orbita» (un tondo pieno
// con l'onda e un'orbita) e «Monogramma» (come su Discord: iniziali o immagine, fondo, colori, forma, cornice, bollino; la proposta
// Condiviso/Proposte/Stile di Mirion/Layout e logo.html). Accanto, il nome che si legge in alto. Si sceglie in Personalizza e si
// salva nella disposizione (server/disposizione.mjs → logo). Niente DOM in cima, così le prove lo usano anche dal server.

export const LOGHI = { mirion: 'Mirion', linea: 'Linea', orbita: 'Orbita', monogramma: 'Monogramma' }
export const COPPIE = [['#b666ce', '#ebacff'], ['#6d5dfc', '#a5b4fc'], ['#0ea5e9', '#67e8f9'], ['#10b981', '#a7f3d0'], ['#f59e0b', '#fde68a'], ['#ef4444', '#fca5a5'], ['#ec4899', '#fbcfe8'], ['#334155', '#94a3b8']]
export const DI_BASE = { tipo: 'mirion', nome: 'Mirion', usa: 'iniziali', iniziali: 'M', img: null, sfondo: 'sfumato', a: null, b: null, forma: 'quadrato', cornice: 'nessuna', bollino: 'nessuno' }

const ONDA = 'M8.6 23C9.7 10 12.9 9.4 16 17 19.1 9.4 22.3 10 23.4 23'
const FORME = {
  quadrato: 'M9.5 1h13A8.5 8.5 0 0 1 31 9.5v13a8.5 8.5 0 0 1-8.5 8.5h-13A8.5 8.5 0 0 1 1 22.5v-13A8.5 8.5 0 0 1 9.5 1z',
  tondo: 'M16 1a15 15 0 1 1 0 30 15 15 0 1 1 0-30z',
  squircle: 'M16 1c11 0 15 4 15 15s-4 15-15 15S1 27 1 16 5 1 16 1z',
  esagono: 'M16 1.2 29.2 8.6v14.8L16 30.8 2.8 23.4V8.6z',
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
let numero = 0 // ogni disegno ha i suoi id, così due loghi nella stessa pagina non si rubano le sfumature

// il logo → il disegno (SVG, 32×32). colori: { a, b } veri o var(--…) (dentro la pagina); per l'icona della finestra servono veri
export function svg (l = {}, colori = {}) {
  const x = { ...DI_BASE, ...l }, id = 'lg' + (++numero)
  const a = x.a ?? colori.a ?? 'var(--viola)', b = x.b ?? colori.b ?? 'var(--accento-2)', fondo = colori.fondo ?? '#150e18'
  const sf = `<linearGradient id="${id}s" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:${a}"/><stop offset="1" style="stop-color:${b}"/></linearGradient>`
  const apri = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="logo-disegno" aria-hidden="true">`
  if (x.tipo === 'linea') {
    return apri + `<defs>${sf}</defs><path d="M5.5 25.5C7 7.5 11.4 6.6 16 18.2 20.6 6.6 25 7.5 26.5 25.5" fill="none" stroke="url(#${id}s)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }
  if (x.tipo === 'orbita') {
    return apri + `<defs>${sf}</defs><circle cx="16" cy="16" r="14.6" fill="url(#${id}s)"/>` +
      `<ellipse cx="16" cy="16" rx="15.4" ry="6.2" transform="rotate(-24 16 16)" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/>` +
      `<circle cx="28.9" cy="10.3" r="1.9" fill="#fff"/>` +
      `<path d="${ONDA}" transform="translate(16 16.6) scale(.78) translate(-16 -16)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }
  if (x.tipo === 'monogramma') {
    const forma = FORME[x.forma] ?? FORME.quadrato
    const pieno = x.sfondo === 'pieno' ? `style="fill:${a}"` : x.sfondo === 'aurora' ? `fill="${fondo}"` : `fill="url(#${id}s)"`
    const luci = x.sfondo === 'aurora' ? `<radialGradient id="${id}l1" cx="6" cy="4" r="20" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:${a};stop-opacity:.75"/><stop offset="1" style="stop-color:${a};stop-opacity:0"/></radialGradient><radialGradient id="${id}l2" cx="28" cy="30" r="20" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:${b};stop-opacity:.6"/><stop offset="1" style="stop-color:${b};stop-opacity:0"/></radialGradient>` : ''
    const sopra = x.sfondo === 'aurora' ? `<path d="${forma}" fill="url(#${id}l1)"/><path d="${forma}" fill="url(#${id}l2)"/>` : ''
    let dentro
    if (x.usa === 'immagine' && x.img) dentro = `<image href="${esc(x.img)}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)"/>`
    else {
      const t = String(x.iniziali || 'M').slice(0, 3), grande = t.length === 1 ? 17 : t.length === 2 ? 13.5 : 10.5
      dentro = `<text x="16" y="16.5" text-anchor="middle" dominant-baseline="central" font-family="Bricolage Grotesque, Inter, Segoe UI, sans-serif" font-weight="700" font-size="${grande}" ${x.sfondo === 'aurora' ? `fill="url(#${id}s)"` : 'fill="#fff"'}>${esc(t)}</text>`
    }
    const cornice = x.cornice === 'sottile' ? `<path d="${forma}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" transform="translate(16 16) scale(.94) translate(-16 -16)"/>`
      : x.cornice === 'aurora' ? `<path d="${forma}" fill="none" stroke="url(#${id}s)" stroke-width="2.2" transform="translate(16 16) scale(.93) translate(-16 -16)"/>` : ''
    const bollini = { online: '#57e39b', nuovo: '#ff6f7d', stella: '#f6bb66' }
    const bollino = bollini[x.bollino] ? `<circle cx="26.2" cy="26.2" r="5" fill="${bollini[x.bollino]}" stroke="${colori.cornice ?? '#0f0a11'}" stroke-width="1.8"/>` +
      (x.bollino === 'stella' ? '<path d="M26.2 23.6l.8 1.7 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.7.9.4-1.8-1.3-1.2 1.8-.2z" fill="#fff"/>' : x.bollino === 'nuovo' ? '<path d="M26.2 23.8v2.6M26.2 28.1v.1" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>' : '') : ''
    return apri + `<defs>${sf}${luci}<clipPath id="${id}c"><path d="${forma}"/></clipPath></defs><path d="${forma}" ${pieno}/>${sopra}${dentro}${cornice}${bollino}</svg>`
  }
  return null // «mirion»: il marchio di sempre, app/marchio.svg
}

// il logo in alto (al posto dell'immagine del marchio), il nome accanto e l'icona della finestra
export function applica (l) {
  if (typeof document === 'undefined') return
  const x = { ...DI_BASE, ...(l ?? {}) }, marchio = document.querySelector('.marchio')
  // la Mirion di un trainer si chiama Mirion Trainer, qualunque nome ci sia nel logo (app.js, server/profilo.mjs)
  if (document.body.classList.contains('solo-trainer')) x.nome = 'Mirion Trainer'
  if (!marchio) return
  const vecchio = marchio.querySelector('img, .logo-disegno'), disegno = svg(x)
  if (disegno) { const t = document.createElement('template'); t.innerHTML = disegno; vecchio?.replaceWith(t.content.firstChild) }
  else if (!vecchio || vecchio.tagName !== 'IMG') { const i = Object.assign(document.createElement('img'), { src: './marchio.svg', alt: '', width: 26, height: 26 }); vecchio ? vecchio.replaceWith(i) : marchio.prepend(i) }
  const nome = marchio.querySelector('span'); if (nome) nome.textContent = x.nome || 'Mirion'
  marchio.setAttribute('aria-label', `${x.nome || 'Mirion'}, la scrivania`)
  document.title = x.nome && x.nome !== 'Mirion' && x.nome !== 'Mirion Trainer' ? `${x.nome} · Mirion` : (x.nome || 'Mirion')
  // l'icona della finestra: lo stesso disegno, con i colori veri di adesso (le var(--…) fuori dalla pagina non valgono)
  const st = getComputedStyle(document.body), v = k => st.getPropertyValue(k).trim()
  const icona = disegno ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(x, { a: x.a ?? v('--viola'), b: x.b ?? v('--accento-2'), fondo: '#150e18' }).replace(/var\(--viola\)/g, v('--viola')).replace(/var\(--accento-2\)/g, v('--accento-2'))) : './marchio.svg'
  const link = document.querySelector('link[rel="icon"]'); if (link && link.getAttribute('href') !== icona) link.setAttribute('href', icona)
}

// un'immagine scelta dal computer → un quadrato piccolo (128 px), così il logo resta leggero nella disposizione
export function rimpicciolisci (file, lato = 128) {
  return new Promise((ok, no) => {
    const r = new FileReader()
    r.onerror = () => no(new Error('Non riesco a leggere l\'immagine.'))
    r.onload = () => {
      const im = new Image()
      im.onerror = () => no(new Error('Questo file non è un\'immagine che Mirion sa leggere (va bene PNG, JPG o WebP).'))
      im.onload = () => {
        const c = Object.assign(document.createElement('canvas'), { width: lato, height: lato }), g = c.getContext('2d')
        const s = Math.min(im.width, im.height), sx = (im.width - s) / 2, sy = (im.height - s) / 2
        g.drawImage(im, sx, sy, s, s, 0, 0, lato, lato)
        ok(c.toDataURL('image/webp', 0.86).startsWith('data:image/webp') ? c.toDataURL('image/webp', 0.86) : c.toDataURL('image/png'))
      }
      im.src = r.result
    }
    r.readAsDataURL(file)
  })
}
