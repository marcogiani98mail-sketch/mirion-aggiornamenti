// «Da guardare oggi» di Mirion Trainer (Marco, 25-11-2026: «l'app da telefono per il trainer deve gestire questa cosa… e nella
// versione desktop usiamo le card»): dai clienti di /api/clienti esce l'elenco di quello che chiede una mano, in ordine di
// urgenza. Lo usano la dashboard a card del computer (clienti.js) e Mirion Trainer sul telefono (trainer-telefono.js).
// Niente DOM qui: si prova anche da node.
export const TEMI = { domanda: 'Domanda su un esercizio', dolore: 'Dolore o fastidio', scheda: 'Vuole cambiare la scheda', salto: 'Salta un allenamento', allenamento: 'Com’è andato l’allenamento' }
export const FASTIDI = { spalla: 'spalla', schiena: 'schiena', ginocchio: 'ginocchio', gomito: 'gomito o polso', anca: 'anca', altro: 'altro' }
const GIORNO = 864e5
export const giorniDa = q => q ? Math.floor((Date.now() - Date.parse(q)) / GIORNO) : Infinity
const dalGiorno = g => giorniDa(String(g).length === 10 ? g + 'T12:00' : g)

// un elemento: { id (del cliente), nome, tipo, peso (più alto = più urgente), icona, titolo, testo, quando }
export function daGuardare (clienti = [], { ore = 72 } = {}) {
  const fuori = []
  for (const c of clienti) {
    if (c.tolto && !c.demo) continue
    const a = c.piatto?.allena, base = { id: c.id, nome: c.nome }
    // gli avvisi scritti dal cliente nell'app: il dolore prima di tutto
    for (const v of a?.avvisi ?? []) {
      if (giorniDa(v.quando) * 24 > ore * 2) continue
      fuori.push({ ...base, tipo: 'avviso-' + v.tema, peso: v.tema === 'dolore' ? 100 : v.tema === 'scheda' ? 70 : v.tema === 'salto' ? 55 : 60,
        icona: v.tema === 'dolore' ? '🩹' : v.tema === 'salto' ? '⏸️' : v.tema === 'scheda' ? '📋' : '💬', titolo: TEMI[v.tema] ?? 'Un avviso', testo: v.testo, quando: v.quando })
    }
    // l'ultima seduta con un fastidio (se non l'ha già scritto come avviso di dolore)
    const u = a?.ultima
    if (u?.fastidio && dalGiorno(u.giorno) <= 3 && !(a?.avvisi ?? []).some(v => v.tema === 'dolore' && giorniDa(v.quando) <= 3)) {
      fuori.push({ ...base, tipo: 'fastidio', peso: 90, icona: '⚠️', titolo: `Fastidio: ${FASTIDI[u.fastidio] ?? u.fastidio}`, testo: [u.seduta, u.fatica ? `fatica ${u.fatica}/10` : null, u.nota].filter(Boolean).join(' · '), quando: u.giorno + 'T12:00' })
    } else if (u?.fatica >= 9 && dalGiorno(u.giorno) <= 2) {
      fuori.push({ ...base, tipo: 'fatica', peso: 50, icona: '🥵', titolo: `Seduta durissima: fatica ${u.fatica}/10`, testo: [u.seduta, u.nota].filter(Boolean).join(' · '), quando: u.giorno + 'T12:00' })
    }
    // un messaggio a cui non hai ancora risposto
    const m = c.ultimoMessaggio
    if (m && m.da === 'cliente' && giorniDa(m.quando) <= 7) fuori.push({ ...base, tipo: 'messaggio', peso: m.tema === 'dolore' ? 95 : 80, icona: '✉️', titolo: 'Aspetta una risposta', testo: m.testo, quando: m.quando })
    // i progressi condivisi ancora senza commento (26-11-2026): un grazie che il cliente aspetta
    if (c.progressiDaCommentare > 0) fuori.push({ ...base, tipo: 'progresso', peso: 65, icona: '🏆', titolo: c.progressiDaCommentare === 1 ? 'Un progresso da commentare' : `${c.progressiDaCommentare} progressi da commentare`, testo: 'L’ha condiviso da Mirion Fit: un commento lo motiva', quando: null })
    // fermo da 3 giorni o più
    const fermo = giorniDa(c.ultimo)
    if (fermo >= 3) fuori.push({ ...base, tipo: 'fermo', peso: 40 + Math.min(20, fermo), icona: '💤', titolo: c.ultimo ? `Fermo da ${fermo} giorni` : 'Non ha ancora mandato niente', testo: 'Un messaggio per rimetterlo in moto?', quando: c.ultimo })
    // il cerchio basso: un gruppo da spingere
    if (a?.punteggio != null && a.punteggio < 55) fuori.push({ ...base, tipo: 'cerchio', peso: 30, icona: '◔', titolo: `Cerchio a ${a.punteggio} su 100`, testo: a.debole ? `Da spingere: ${a.debole.toLowerCase()}` : `costanza ${a.costanza ?? '–'}%`, quando: null })
  }
  return fuori.sort((x, y) => y.peso - x.peso || (Date.parse(y.quando ?? 0) || 0) - (Date.parse(x.quando ?? 0) || 0))
}

// i numeri della squadra: quanti si sono allenati in settimana, il cerchio medio, le sedute con un fastidio
export function squadra (clienti = []) {
  const vivi = clienti.filter(c => !c.tolto || c.demo)
  const cerchi = vivi.map(c => c.piatto?.allena?.punteggio).filter(v => Number.isFinite(v))
  const allenati = vivi.filter(c => (c.piatto?.allenati7 ?? []).some(Boolean)).length
  return {
    clienti: vivi.length, allenati, fermi: vivi.filter(c => giorniDa(c.ultimo) >= 3).length,
    cerchio: cerchi.length ? Math.round(cerchi.reduce((t, v) => t + v, 0) / cerchi.length) : null,
    fastidi: vivi.reduce((t, c) => t + (c.piatto?.allena?.fastidi14 ?? 0), 0),
    classifica: vivi.filter(c => Number.isFinite(c.piatto?.allena?.punteggio)).map(c => ({ id: c.id, nome: c.nome, punteggio: c.piatto.allena.punteggio, costanza: c.piatto.allena.costanza, debole: c.piatto.allena.debole })).sort((a, b) => b.punteggio - a.punteggio),
  }
}

export const quandoBreve = q => {
  if (!q) return ''
  const g = giorniDa(q)
  if (g <= 0) { const m = Math.max(0, Math.round((Date.now() - Date.parse(q)) / 60000)); return m < 60 ? `${m} min fa` : `${Math.floor(m / 60)} h fa` }
  return g === 1 ? 'ieri' : `${g} giorni fa`
}
