// Le task per persona, nella squadra (Marco, 22-11: «devo capire quali task sono di sava e quali sono mie e per operatore
// guardare»): Mie, Di Sava (una scelta per ogni altra persona), Libere (di tutti e due, nessuno l'ha presa), Tutte.
// Fuori dalla squadra non c'è niente da scegliere. Di chi è ogni task lo dice server/chi-fa.mjs.
import { el } from './base.js'

export const scelte = sq => sq ? [['mie', 'Mie'], ...sq.persone.filter(p => p.id !== sq.io).map(p => ['di:' + p.id, 'Di ' + p.nome]), ['libere', 'Libere'], ['tutte', 'Tutte']] : []

export const diChi = scelta => k => scelta === 'tutte' || !scelta ? true
  : scelta === 'mie' ? k.mia === true
  : scelta === 'libere' ? Boolean(k.condivisa && !k.chi)
  : k.chi === scelta.slice(3)

// i pulsanti: uno premuto alla volta; conta(s) dà quante task ha ogni scelta
export function pulsantiChi (sq, scelta, cambia, conta) {
  const lista = scelte(sq)
  if (!lista.length) return null
  return el('div', { class: 'per-persona', role: 'group', 'aria-label': 'Di chi sono le task' },
    ...lista.map(([id, nome]) => el('button', { type: 'button', 'aria-pressed': String(id === scelta), onclick: () => cambia(id) }, nome, conta ? el('small', { testo: ' ' + conta(id) }) : null)))
}
