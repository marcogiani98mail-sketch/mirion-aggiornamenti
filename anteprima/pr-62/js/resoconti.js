// I resoconti di Mirion nella nota del giorno (Marco, 24-11-2026 sera: «il diario dopo che mi fa il resoconto devo anche poter
// ritornare indietro a quello normale»). «Fai il resoconto di oggi» scrive in fondo alla nota un blocco «## Resoconto di Delion, HH:MM»;
// il diario lo mostra in una scheda a parte, e la scheda «Il diario» resta quella di sempre, senza i resoconti.
// Il file non si tocca: il diario si scrive solo aggiungendo in fondo (CLAUDE.md, regola 3). Niente DOM: lo usa anche il server.
const TITOLO = /^##\s+Resoconto di (Delion|Mirion)\b/

// divide il testo della nota: le righe del diario e i resoconti (un resoconto finisce al titolo dopo o alla prima riga «- HH:MM»)
export function dividiResoconti (testo) {
  const diario = [], resoconti = []
  let dentro = null
  for (const r of String(testo ?? '').split(/\r?\n/)) {
    if (TITOLO.test(r)) { dentro = [r]; resoconti.push(dentro); continue }
    if (dentro && (/^#{1,6}\s/.test(r) || /^- \d{1,2}[:.]\d{2}\b/.test(r))) dentro = null
    ;(dentro ?? diario).push(r)
  }
  return { diario: diario.join('\n').replace(/\n{3,}/g, '\n\n').trim(), resoconti: resoconti.map(x => x.join('\n').trim()) }
}

// il corpo di un resoconto, senza il titolo con l'ora: due resoconti con lo stesso corpo sono lo stesso resoconto
export const corpoResoconto = t => String(t ?? '').split(/\r?\n/).filter(r => !TITOLO.test(r)).join('\n').trim()
