// I colori di Aurora (Marco, 22-11-2026: «scelgo aurora e mettilo con tutte le sfumature di colore anche su mirion… e falle più
// trasparenti le caselle»). Una sfumatura sono pochi numeri (il tono dell'accento, il secondo colore delle sfumature, quanto sono
// trasparenti le caselle, quanto si vede l'aurora): da lì escono tutte le variabili di Mirion, in OKLCH, a 12 gradini come Radix
// Colors. È lo stesso metodo della proposta «Stile di Mirion» (Condiviso/Proposte), adattato ai nomi di Mirion (--fondo, --carta,
// --viola, --lilla…), così i fogli di stile che ci sono non si toccano. Le sfumature si scelgono in Personalizza (pannello.js)
// e si salvano nella disposizione (server/disposizione.mjs); qui niente DOM in cima, così lo usa anche il server nelle prove.

// le sfumature pronte: [nome, tono dell'accento, secondo colore, forza dell'accento]. Gli id vecchi (viola, oceano…) restano
// validi: chi li aveva scelti ritrova lo stesso colore, nello stile Aurora
export const SFUMATURE = {
  aurora: ['Aurora', 318, 45, 0.17], boreale: ['Boreale', 160, 295, 0.15], viola: ['Viola', 286, 330, 0.19],
  oceano: ['Oceano', 255, 195, 0.16], ghiacciaio: ['Ghiacciaio', 220, 175, 0.12], laguna: ['Laguna', 185, 150, 0.13],
  foresta: ['Foresta', 150, 95, 0.15], ambra: ['Ambra', 75, 40, 0.15], tramonto: ['Tramonto', 50, 15, 0.17],
  corallo: ['Corallo', 18, 340, 0.17], rosa: ['Rosa', 345, 290, 0.17], grafite: ['Grafite', 270, 270, 0.05],
}
export const DI_BASE = { trasparenza: 58, aurora: 70 } // caselle al 58% di copertura, aurora al 70%

// ---- OKLCH → sRGB (Björn Ottosson, Oklab, 2020) e il contrasto WCAG 2 ----
const gamma = x => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
function rgb (L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
}
export function hex (L, C, h) { // fuori dallo schermo si toglie croma, la luminosità resta
  let c = C, x = rgb(L, c, h)
  while (!x.every(v => v >= -0.0005 && v <= 1.0005) && c > 0) { c = Math.max(0, c - 0.002); x = rgb(L, c, h) }
  return '#' + x.map(v => Math.round(Math.min(1, Math.max(0, gamma(v))) * 255).toString(16).padStart(2, '0')).join('')
}
const canale = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * canale(n >> 16) + 0.7152 * canale((n >> 8) & 255) + 0.0722 * canale(n & 255) }
export const contrasto = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

// le luminosità dei 12 gradini, tema scuro (quello di Mirion)
const L_GRIGI = [0.155, 0.178, 0.208, 0.232, 0.256, 0.288, 0.335, 0.425, 0.58, 0.62, 0.79, 0.955]
const L_ACCENTO = [0.18, 0.205, 0.245, 0.275, 0.305, 0.345, 0.4, 0.48, 0.64, 0.69, 0.83, 0.955]
const PROFILO = [0.1, 0.16, 0.26, 0.34, 0.4, 0.46, 0.55, 0.68, 1, 1, 0.82, 0.32]
// il tema Carta (Marco, 23-11: «questo potrebbe essere quello classico e poi fanne altri due»): gli stessi 12 gradini, ma chiari
// in basso e scuri in alto; l'accento si scurisce dove fa da testo (lilla), perché si legga sul bianco
const L_GRIGI_CHIARI = [0.962, 0.978, 0.995, 0.948, 0.93, 0.9, 0.85, 0.78, 0.64, 0.52, 0.4, 0.21]
const L_ACCENTO_CHIARI = [0.985, 0.97, 0.945, 0.92, 0.89, 0.85, 0.79, 0.7, 0.57, 0.52, 0.45, 0.28]
const scala = (h, C, neutra, chiaro = false) => (neutra ? (chiaro ? L_GRIGI_CHIARI : L_GRIGI) : (chiaro ? L_ACCENTO_CHIARI : L_ACCENTO)).map((L, i) => hex(L, neutra ? C * (i < 8 ? 1 : i < 10 ? 1.1 : 0.7) : C * PROFILO[i], h))
// i temi (stili) di Mirion: Classica è Aurora com'era; Carta è chiara; Netto è scura, piatta, senza aurora (stili.css)
export const STILI = { classica: 'Classica', carta: 'Carta', netto: 'Netto' }

// la scelta salvata ({ tema, colori }) → i numeri veri
export function numeri ({ tema, colori, stile } = {}) {
  const [, accento, secondo, forza] = SFUMATURE[tema] ?? SFUMATURE.aurora
  const c = colori ?? {}, n = (v, min, max, base) => Number.isFinite(+v) && v !== null && v !== '' ? Math.min(max, Math.max(min, +v)) : base
  return {
    accento: n(c.accento, 0, 360, accento), secondo: n(c.secondo, 0, 360, secondo), forza,
    trasparenza: n(c.trasparenza, 20, 100, DI_BASE.trasparenza), aurora: n(c.aurora, 0, 100, DI_BASE.aurora), stile: STILI[stile] ? stile : 'classica',
  }
}

// i numeri → le variabili di Mirion
export function variabili (scelta) {
  const k = numeri(scelta)
  const chiaro = k.stile === 'carta', netto = k.stile === 'netto'
  const grigio = scala(k.accento, netto ? 0.004 : k.forza < 0.08 ? 0.008 : chiaro ? 0.012 : 0.018, true, chiaro), a = scala(k.accento, k.forza, false, chiaro)
  const stato = h => scala(h, 0.15, false, chiaro), verde = stato(152), ambra = stato(75), rosso = stato(25), blu = stato(250)
  // Netto: caselle piene e niente aurora; Carta: caselle quasi piene e l'aurora appena accennata
  if (netto) { k.trasparenza = 100; k.aurora = 0 } else if (chiaro) { k.trasparenza = Math.max(92, k.trasparenza); k.aurora = Math.round(k.aurora * 0.45) }
  // i pulsanti pieni: lo stesso accento, un po' più profondo finché il bianco si legge (almeno 4,8:1), come faceva premium.css
  let Lt = 0.6, tasto = hex(Lt, k.forza, k.accento)
  while (contrasto('#ffffff', tasto) < 4.8 && Lt > 0.3) { Lt -= 0.01; tasto = hex(Lt, k.forza, k.accento) }
  const suAccento = '#ffffff', tastoSu = hex(Lt - 0.04, k.forza, k.accento) // al passaggio del mouse si fa più profondo
  const v = {
    '--fondo': grigio[0], '--alto': grigio[1], '--carta': grigio[2], '--carta-2': grigio[3],
    '--linea': grigio[5], '--linea-forte': grigio[6], '--testo': grigio[11], '--testo-2': grigio[10], '--tenue': grigio[9],
    '--viola': a[8], '--lilla': a[10], '--tinta': a[8],
    '--viola-tenue': `color-mix(in oklch, ${a[8]} 16%, transparent)`, '--viola-bordo': `color-mix(in oklch, ${a[8]} 48%, transparent)`,
    '--tasto': tasto, '--tasto-su': tastoSu, '--tasto-bordo': `color-mix(in oklch, ${tasto} 78%, black)`, '--su-accento': suAccento,
    '--bene': verde[10], '--presto': ambra[10], '--scaduto': rosso[10], '--info': blu[9],
    '--accento-2': hex(chiaro ? 0.62 : 0.7, k.forza * 0.95, k.secondo),
    '--menu': `color-mix(in oklch, ${grigio[1]} 90%, transparent)`,
    '--trasparenza': k.trasparenza + '%', '--aurora-forza': (k.aurora / 100).toFixed(2),
  }
  // le misure, per le prove: il testo deve leggersi su ogni sfumatura
  const misure = { testo: contrasto(v['--testo'], v['--carta']), secondario: contrasto(v['--testo-2'], v['--carta']), tenue: contrasto(v['--tenue'], v['--carta']), tasti: contrasto(suAccento, tasto), tastiSopra: contrasto(suAccento, tastoSu) }
  return { variabili: v, misure, numeri: k }
}

// applica la scelta a tutta la pagina: le variabili vanno sul body, sopra i temi di prima (su-misura.css)
export function applica (scelta, dove = typeof document !== 'undefined' ? document.body : null) {
  if (!dove) return
  for (const [k, x] of Object.entries(variabili(scelta).variabili)) dove.style.setProperty(k, x)
  dispatchEvent(new Event('mirion-colori')) // i gestionali aperti prendono anche loro la sfumatura (gestionali.js)
}
