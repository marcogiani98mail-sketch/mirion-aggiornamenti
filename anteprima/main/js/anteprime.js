// Le anteprime delle card (Marco, 25-11-2026: «la sezione Personalizza deve far capire tramite una grafica cosa aggiungo alla
// scrivania»): per ogni card una miniatura disegnata, che somiglia a quello che la card mostra davvero (i numeri dei Conti, i giorni
// in fila, le righe delle task…), e la mappa della scrivania, con le card che ci sono già e il posto dove finisce quella nuova.
// Solo SVG con i colori del tema (currentColor e le variabili di Mirion): nessuna immagine da caricare.
import { el } from './base.js'

// pezzi di disegno, in un riquadro di 120 x 72
const riga = (x, y, w, o = 0.35) => `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="currentColor" opacity="${o}"/>`
const scatola = (x, y, w, h, o = 0.12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="currentColor" opacity="${o}"/>`
const accento = (x, y, w, h, r = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="var(--viola)"/>`
const spunta = (x, y, piena) => piena ? `<rect x="${x}" y="${y}" width="7" height="7" rx="2" fill="var(--viola)"/>` : `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="2" fill="none" stroke="currentColor" opacity=".5"/>`
const cifra = (x, y, w) => scatola(x, y, w, 26) + riga(x + 5, y + 6, w * 0.45, 0.3) + `<rect x="${x + 5}" y="${y + 15}" width="${w * 0.55}" height="6" rx="2" fill="currentColor" opacity=".75"/>`

const DISEGNI = {
  adesso: () => riga(8, 10, 40, 0.3) + `<rect x="8" y="20" width="70" height="8" rx="3" fill="currentColor" opacity=".8"/>` + riga(8, 33, 50) +
    `<rect x="8" y="46" width="34" height="13" rx="4" fill="var(--accento-2, #ee793e)"/>` + accento(46, 46, 30, 13) + scatola(80, 46, 30, 13, 0.15),
  giorni: () => [0, 1, 2, 3, 4, 5, 6].map(i => i === 0 ? accento(8 + i * 15, 10, 12, 18, 3) : scatola(8 + i * 15, 10, 12, 18, 0.14)).join('') +
    spunta(8, 40) + riga(19, 41.5, 60) + spunta(8, 54) + riga(19, 55.5, 44),
  scadute: () => [12, 26, 40, 54].map((y, i) => spunta(8, y, i === 3) + riga(19, y + 1.5, [70, 52, 80, 40][i], i === 0 ? 0.7 : 0.35) + (i === 0 ? `<rect x="96" y="${y}" width="16" height="7" rx="3" fill="var(--scaduto, #feb0a9)" opacity=".8"/>` : '')).join(''),
  progetti: () => [10, 30, 50].map((y, i) => riga(8, y, 40, 0.6) + scatola(8, y + 8, 104, 5, 0.14) + accento(8, y + 8, [80, 46, 20][i], 5, 2.5)).join(''),
  conti: () => cifra(6, 6, 52) + cifra(62, 6, 52) + cifra(6, 38, 52).replace('opacity=".75"', 'opacity="1" style="fill:var(--scaduto, #feb0a9)"') + cifra(62, 38, 52),
  notifiche: () => `<rect x="6" y="6" width="108" height="14" rx="4" fill="var(--presto, #f6bb66)" opacity=".35"/>` + riga(12, 11, 50, 0.7) +
    [28, 44, 60].map(y => `<circle cx="11" cy="${y + 2}" r="2.5" fill="var(--viola)"/>` + riga(18, y, 90) + riga(18, y + 7, 60, 0.2)).join('').slice(0),
  cervello: () => [[6, 6], [62, 6], [6, 38], [62, 38]].map(([x, y]) => cifra(x, y, 52)).join(''),
  accessi: () => [0, 1, 2, 3].flatMap(c => [0, 1].map(r => `<rect x="${10 + c * 27}" y="${10 + r * 28}" width="20" height="20" rx="5" fill="${['var(--viola)', 'var(--accento-2, #ee793e)', 'var(--info, #48a0f4)', 'var(--bene, #87dea0)'][(c + r) % 4]}" opacity=".8"/>`)).join(''),
  cerca: () => `<rect x="6" y="8" width="108" height="16" rx="8" fill="none" stroke="currentColor" opacity=".45"/><circle cx="16" cy="16" r="3.5" fill="none" stroke="currentColor" opacity=".7"/>` + riga(24, 14, 40, 0.3) +
    riga(8, 34, 60, 0.6) + riga(8, 41, 90, 0.25) + riga(8, 54, 50, 0.6) + riga(8, 61, 80, 0.25),
  diario: () => riga(8, 8, 46, 0.7) + riga(8, 20, 100) + riga(8, 28, 90) + riga(8, 36, 96) + riga(8, 44, 60) + `<rect x="6" y="54" width="108" height="12" rx="4" fill="none" stroke="var(--viola)"/>`,
  lavagne: () => `<rect x="6" y="6" width="108" height="60" rx="5" fill="currentColor" opacity=".08"/><path d="M18 50 C 30 20, 46 58, 60 30 S 92 24, 100 44" fill="none" stroke="var(--viola)" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="70" y="12" width="20" height="16" rx="2" fill="var(--presto, #f6bb66)" opacity=".8"/>` + scatola(16, 14, 30, 10, 0.2),
  notizie: () => scatola(6, 6, 34, 26, 0.2) + riga(46, 8, 60, 0.7) + riga(46, 16, 50) + riga(46, 24, 36, 0.2) + scatola(6, 38, 34, 26, 0.2) + riga(46, 40, 64, 0.7) + riga(46, 48, 44) + riga(46, 56, 30, 0.2),
  programmi: () => [10, 26, 42, 58].map((y, i) => `<circle cx="11" cy="${y + 2}" r="3" fill="${i === 2 ? 'var(--presto, #f6bb66)' : 'var(--bene, #87dea0)'}"/>` + riga(19, y, [50, 64, 44, 58][i], 0.6) + riga(84, y, 26, 0.2)).join(''),
  nascoste: () => [12, 30, 48].map((y, i) => riga(8, y, [80, 64, 72][i]) + `<rect x="92" y="${y - 4}" width="22" height="9" rx="3" fill="none" stroke="var(--viola)" opacity=".6"/>`).join(''),
  'da-chiudere': () => [10, 26, 42, 58].map((y, i) => spunta(8, y - 1.5) + riga(19, y, [64, 50, 72, 40][i]) + (i < 2 ? `<rect x="96" y="${y - 2}" width="16" height="8" rx="3" fill="var(--viola)" opacity=".5"/>` : '')).join(''),
  gestionali: () => [0, 1, 2].map(c => scatola(8 + c * 36, 10, 30, 30, 0.14) + `<rect x="${16 + c * 36}" y="18" width="14" height="14" rx="4" fill="var(--viola)" opacity="${0.9 - c * 0.25}"/>` + riga(8 + c * 36, 48, 26, 0.5)).join(''),
  'senza-data': () => [12, 28, 44, 60].map((y, i) => spunta(8, y - 1.5) + riga(19, y, [60, 76, 48, 66][i])).join(''),
}

// la miniatura di una card: il suo disegno, o righe generiche per una card che un disegno suo non l'ha (un'estensione, un gestionale)
export function miniatura (id) {
  const corpo = (DISEGNI[id] ?? (() => riga(8, 12, 50, 0.7) + riga(8, 26, 100) + riga(8, 36, 84) + riga(8, 46, 92) + riga(8, 56, 60)))()
  const s = el('span', { class: 'miniatura', 'aria-hidden': 'true' })
  s.innerHTML = `<svg viewBox="0 0 120 72" xmlns="http://www.w3.org/2000/svg">${corpo}</svg>`
  return s
}

// la mappa della scrivania, in piccolo: le card accese nel loro ordine e con la loro larghezza (su 12), le cartelle con il loro
// nome; «nuova» è la card che si sta guardando, disegnata tratteggiata dove finirebbe (in fondo, come fa «Aggiungi»)
export function mappa (sc, titoli, nuova = null) {
  const caselle = [], fatte = new Set()
  for (const r of sc.riquadri) {
    if (r.nascosto || !titoli[r.id]) continue
    if (r.gruppo) {
      if (fatte.has(r.gruppo)) continue
      fatte.add(r.gruppo)
      const dentro = sc.riquadri.filter(x => x.gruppo === r.gruppo && !x.nascosto)
      caselle.push({ nome: sc.gruppi?.find(g => g.id === r.gruppo)?.nome ?? 'Cartella', larghezza: r.larghezza, cartella: dentro.length })
    } else caselle.push({ nome: titoli[r.id], larghezza: r.larghezza })
  }
  if (nuova) caselle.push({ nome: titoli[nuova], larghezza: 12, nuova: true })
  return el('div', { class: 'mappa-scrivania', role: 'img', 'aria-label': `La scrivania: ${caselle.map(c => c.nome).join(', ')}` },
    ...caselle.map(c => el('span', { class: 'mappa-casella' + (c.nuova ? ' nuova' : '') + (c.cartella ? ' cartella' : ''), style: { '--larghezza': Math.max(3, Math.min(12, c.larghezza || 12)) } },
      el('b', { testo: c.nome }), c.cartella ? el('small', { testo: `${c.cartella} card` }) : c.nuova ? el('small', { testo: 'finisce qui' }) : null)))
}
