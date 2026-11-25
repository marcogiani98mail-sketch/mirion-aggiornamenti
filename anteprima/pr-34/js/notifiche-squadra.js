// Le notifiche della squadra (Marco, 20-11: «una notifica quando l'altra persona svolge il lavoro, con le caratteristiche, e un
// resoconto che mi faccia capire cos'ha fatto»). Se sei in un'area della squadra, ogni minuto Delion prende le novità da GitHub;
// per ogni invio di un'altra persona arriva una notifica di Windows (chi, cosa ha chiuso, quanti file) e il numerino su «Squadra».
// Un clic apre la Squadra della scrivania (Marco, 23-11: non è più una stanza della barra), con il lavoro degli altri.
import { $, api, STATO } from './base.js'

const IN_SQUADRA = () => /^#scrivania\?(.*&)?sezione=squadra/.test(location.hash)
// il numerino: tenuto in STATO, perché la scrivania ridisegna la fila spesso (scrivania.js lo rimette)
export function numerino (n) {
  STATO.novitaSquadra = n
  const b = $('[data-bollino-squadra]'); if (!b) return
  b.textContent = n > 99 ? '99+' : n; b.hidden = !n || IN_SQUADRA()
}

const OGNI = 60_000
let giro = null, giri = 0

export function notificheSquadra () {
  clearTimeout(giro); const mio = ++giri // se si riparte, il giro di prima si ferma
  // un controllo alla volta: il prossimo parte un minuto dopo la fine di questo. Prima ne partiva uno ogni minuto anche se il
  // precedente era ancora fermo su GitHub (2 minuti), e si accodavano davanti a «Manda» (analisi del 23-11)
  let fermo = false
  const controlla = async () => {
    try {
      const s = await api('/api/squadra'); if (!s.attiva) { fermo = true; return }
      await api('/api/squadra/prendi', {})
      const n = await api('/api/squadra/novita?per=notifica')
      const nome = id => s.persone.find(p => p.id === id)?.nome ?? id ?? 'Qualcuno'
      for (const c of [...n.novita].reverse()) {
        const corpo = [c.chiuse.length ? `Ha chiuso ${c.chiuse.length}: ${c.chiuse.slice(0, 3).join(' · ')}` : null, c.nuove.length ? `Ha aggiunto ${c.nuove.length} cose da fare` : null, `${c.file.length} file cambiati${c.resoconto ? ' · c\'è il resoconto del giorno' : ''}`].filter(Boolean).join('\n')
        try { const x = new Notification(`${nome(c.persona)} ha mandato il suo lavoro`, { body: corpo, tag: c.sha }); x.onclick = () => { window.focus(); location.hash = 'scrivania?sezione=squadra' } } catch { /* senza notifiche resta il numerino */ }
        api('/api/notifiche', { testo: `${nome(c.persona)} ha mandato il suo lavoro: ${corpo}`, fonte: 'squadra', dove: '#scrivania?sezione=squadra' }).catch(() => {}) // anche fra le notifiche (23-11)
        api('/api/fuori/notifica', { titolo: `${nome(c.persona)} ha mandato il suo lavoro`, corpo }).catch(() => {}) // e su Telegram, se è collegato (telegram.mjs)
      }
      if (n.ultimo) await api('/api/squadra/visto', { per: 'notifica', sha: n.ultimo })
      numerino((await api('/api/squadra/novita')).novita.length)
    } catch { /* senza rete si riprova al giro dopo */ }
  }
  const avanti = async () => { await controlla(); if (!fermo && mio === giri) giro = setTimeout(avanti, OGNI) }
  avanti()
  addEventListener('hashchange', () => { if (IN_SQUADRA()) $('[data-bollino-squadra]')?.setAttribute('hidden', '') })
}
