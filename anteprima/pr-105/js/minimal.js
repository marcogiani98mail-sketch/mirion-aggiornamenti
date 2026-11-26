// Le scrivanie minimal (Marco, 25-11-2026: «l'intento è riuscire a fare il più minimal possibile… le card salvale in caso una persona
// voglia dei widget sul telefono» · «mirion fit fai la stessa cosa»): poche card, le altre unite in cartelle a schede (riquadri.js)
// o spente. Niente si cancella: le card spente si rimettono da Personalizza o da «Card tolte», e restano widget del telefono.
// Niente DOM: lo usano il server (disposizione.mjs, una volta sola) e la pagina (prodotto.js, per una scrivania di Mirion Fit nuova).

// una cartella con le card date, al posto della prima, larga quanto si chiede; una card già in un'altra cartella resta dov'è
function cartella (sc, id, nome, ids, dopo, larghezza = 12) {
  const r = sc.riquadri, dentro = ids.map(c => r.find(x => x.id === c)).filter(c => c && !c.gruppo && !c.nascosto)
  if (dentro.length < 2) return dopo
  for (const c of dentro) { r.splice(r.indexOf(c), 1); Object.assign(c, { gruppo: id, larghezza, altezza: null, piccolo: false }) }
  const i = dopo ? r.indexOf(dopo) + 1 : 0
  r.splice(i, 0, ...dentro)
  sc.gruppi = [...(sc.gruppi ?? []).filter(g => g.id !== id), { id, nome, scelto: dentro[0].id }]
  return dentro.at(-1)
}
// la card principale (Marco, 25-11 sera: «fai anche una card principale per la squadra e per Mirion Fit»): in cima, larga, accesa,
// fuori dalle cartelle; da lì si sa tutto, e le card singole restano per chi vuole il dettaglio
export function puntoInCima (sc, id) {
  const c = sc.riquadri.find(r => r.id === id)
  if (!c) return null
  sc.riquadri.splice(sc.riquadri.indexOf(c), 1)
  sc.riquadri.unshift(Object.assign(c, { nascosto: false, gruppo: null, larghezza: 12, altezza: null, piccolo: false }))
  return c
}
const spegni = (sc, ids) => { for (const r of sc.riquadri) if (ids.includes(r.id)) { r.nascosto = true; r.gruppo = null } }

// la scrivania di Mirion (Marco, 25-11: «fai rimanere le card però come le hai messe, quindi Agenda ci può stare; fai sì che possa
// mettere più card in una e darle un nome, non farle preimpostate»): card vere, a incastro. In cima «Adesso», larga; sotto, a
// sinistra, la cartella «Agenda» (i prossimi giorni, le task, i progetti), a destra le Notifiche. Conti e le altre card stanno fra le
// icone in cima alla scrivania e si aprono con un clic (Marco, 25-11 sera).
// «Agenda» è solo una cartella di partenza come le altre: si rinomina, si scioglie, e ogni card si unisce a un'altra trascinandola
// sopra o con «Metti in una cartella con» (riquadri.js, tasto-destro.js). La card «tutto» della 0.1.31 non c'è più (Marco, 25-11: «togli le card già unite»).
export function scrivaniaMinimal (sc) {
  const r = sc.riquadri, prendi = id => r.find(x => x.id === id)
  if (!prendi('adesso')) return sc
  for (const c of r) { c.nascosto = true; c.gruppo = null }
  sc.gruppi = []
  const misure = { adesso: 12, scadute: 8, notifiche: 4 } // «Le app sul telefono» è la stanza «Telefoni», sotto la Scrivania (26-11 notte); i prossimi giorni e i progetti stanno in cima ad «Adesso» (25-11 sera)
  const ordine = Object.keys(misure).map(prendi).filter(Boolean)
  for (const c of ordine) { r.splice(r.indexOf(c), 1); Object.assign(c, { nascosto: false, larghezza: misure[c.id], altezza: null, piccolo: false }) }
  r.unshift(...ordine)
  return sc
}

// la scrivania di prima (0.1.31) aveva accesa la sola card «tutto», una pagina fissa: si passa alle card vere una volta sola
export const soloTutto = sc => { const accese = sc.riquadri.filter(c => c && c.nascosto !== true); return accese.length === 1 && accese[0].id === 'tutto' }

// Mirion Fit: «Oggi», poi «Cibo» (i pasti in una card, 26-11-2026), poi due cartelle a due per riga: il corpo (peso, acqua, sonno, integratori), il movimento
// (allenamento, attività, la settimana); via Notizie
export function fitMinimal (sc) {
  const oggi = sc.riquadri.find(r => r.id === 'oggi')
  if (!oggi) return sc
  spegni(sc, ['notizie'])
  puntoInCima(sc, 'oggi')
  let dopo = oggi
  // il cibo è una card sola (26-11-2026): «Cibo», con i pasti da scegliere; i pasti uno per card restano spenti
  spegni(sc, ['colazione', 'pranzo', 'cena', 'spuntini', 'pasti'])
  const cibo = sc.riquadri.find(r => r.id === 'cibo')
  if (cibo) { sc.riquadri.splice(sc.riquadri.indexOf(cibo), 1); sc.riquadri.splice(sc.riquadri.indexOf(oggi) + 1, 0, Object.assign(cibo, { nascosto: false, gruppo: null, larghezza: 12, altezza: null, piccolo: false })); dopo = cibo }
  dopo = cartella(sc, 'gruppo-corpo', 'Il corpo', ['peso', 'acqua', 'sonno', 'integratori'], dopo, 6)
  cartella(sc, 'gruppo-movimento', 'Il movimento', ['allenamento', 'attivita', 'settimana'], dopo, 6)
  return sc
}

// la Squadra (Marco, 25-11: «sì, per il reparto squadra»): tre card invece di sei. In cima «Il lavoro» (assegna una task, il tuo
// lavoro); sotto, a due per riga, «La squadra» (la chat, lo storico) e «Le persone» (chi c'è, le tue squadre)
export function squadraMinimal (sc) {
  for (const r of sc.riquadri) if (!r.gruppo) r.nascosto = false
  const punto = puntoInCima(sc, 'punto')
  const lavoro = cartella(sc, 'gruppo-lavoro', 'Il lavoro', ['assegna', 'lavoro'], punto, 12)
  const dialogo = cartella(sc, 'gruppo-dialogo', 'La squadra', ['chat', 'storico'], lavoro, 7)
  cartella(sc, 'gruppo-persone', 'Le persone', ['persone', 'tue'], dialogo, 5)
  return sc
}
