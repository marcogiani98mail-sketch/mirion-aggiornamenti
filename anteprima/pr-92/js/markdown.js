// Un lettore di note Obsidian: titoli, elenchi, caselle, citazioni, codice, tabelle, grassetto, corsivo, link e [[wikilink]].
// Costruisce elementi veri (niente innerHTML): il testo di una nota non diventa mai codice.
import { el } from './base.js'

export function leggiNota (testo, { apriNota, apriLink } = {}) {
  const t = testo.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '') // le proprietà in cima non si mostrano
  const righe = t.split(/\r?\n/), out = el('div', { class: 'nota-letta' })
  let lista = null, codice = null, tabella = null
  const chiudi = () => { lista = null; tabella = null }
  for (const r of righe) {
    if (codice) { if (/^```/.test(r)) { out.append(codice); codice = null } else codice.firstChild.textContent += r + '\n'; continue }
    if (/^```/.test(r)) { chiudi(); codice = el('pre', {}, el('code')); continue }
    let m
    if (!r.trim()) { chiudi(); continue }
    if ((m = r.match(/^(#{1,4})\s+(.*)$/))) { chiudi(); out.append(el('h' + Math.min(4, m[1].length + 1), {}, ...riga(m[2], apriNota, apriLink))); continue }
    if (/^\s*\|/.test(r)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(r)) continue
      const celle = r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim())
      if (!tabella) { tabella = el('table'); out.append(el('div', { class: 'tabella' }, tabella)); tabella.append(el('tr', {}, ...celle.map(c => el('th', {}, ...riga(c, apriNota, apriLink))))) }
      else tabella.append(el('tr', {}, ...celle.map(c => el('td', {}, ...riga(c, apriNota, apriLink)))))
      continue
    }
    if ((m = r.match(/^\s*>\s?(.*)$/))) { chiudi(); out.append(el('blockquote', {}, ...riga(m[1], apriNota, apriLink))); continue }
    if ((m = r.match(/^(\s*)[-*+] (\[( |x|X|-)\] )?(.*)$/)) || (m = r.match(/^(\s*)\d+[.)] ()()(.*)$/))) {
      if (!lista) { lista = el('ul'); out.append(lista) }
      const stato = m[3], li = el('li', { class: stato === undefined || stato === '' ? '' : stato === ' ' ? 'casella' : stato === '-' ? 'casella annullata' : 'casella fatta', style: { marginLeft: Math.min(4, Math.floor(m[1].length / 2)) * 1.2 + 'rem' } }, ...riga(m[4], apriNota, apriLink))
      lista.append(li); continue
    }
    if (/^(-{3,}|\*{3,})$/.test(r.trim())) { chiudi(); out.append(el('hr')); continue }
    chiudi(); out.append(el('p', {}, ...riga(r, apriNota, apriLink)))
  }
  if (codice) out.append(codice)
  return out
}

// dentro una riga: [[nota|testo]], [testo](link), **grassetto**, *corsivo*, `codice`
function riga (s, apriNota, apriLink) {
  const pezzi = [], re = /\[\[([^\]|#]+)(#[^\]|]*)?(\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`/g
  let i = 0, m
  while ((m = re.exec(s))) {
    if (m.index > i) pezzi.push(s.slice(i, m.index))
    // la nota e il link si leggono adesso: al clic «m» è già null (il giro è finito), e il link non si apriva (25-11)
    const nota = m[1]?.trim(), link = m[6]
    if (m[1]) pezzi.push(el('a', { href: '#', class: 'wikilink', onclick: e => { e.preventDefault(); apriNota?.(nota) } }, m[4] ?? m[1]))
    else if (m[5]) pezzi.push(el('a', { href: '#', onclick: e => { e.preventDefault(); apriLink?.(link) } }, m[5]))
    else if (m[7]) pezzi.push(el('strong', { testo: m[7] }))
    else if (m[8]) pezzi.push(el('em', { testo: m[8] }))
    else if (m[9]) pezzi.push(el('code', { testo: m[9] }))
    i = re.lastIndex
  }
  if (i < s.length) pezzi.push(s.slice(i))
  return pezzi
}
