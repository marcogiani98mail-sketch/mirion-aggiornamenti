// Le squadre, meglio (Marco, 21-11: «dammi la possibilità di creare più squadre… visualizzare lo storico… chattare con l'altra
// persona tramite il programma, o comunque caricando su GitHub»). Nella stanza Squadra: le tue squadre (e una nuova), lo storico
// degli invii, i messaggi con le persone della squadra. Una squadra nuova si collega a un repository vuoto creato su github.com.
import { el, api, notifica } from './base.js'
import { fermaCartella, boxCartella } from './cartella.js'
import { ic } from './icone.js'
import * as aree from './aree.js'
import { apriInvio } from './invio.js'

const ORA = iso => new Date(iso.replace(' ', 'T')).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
let con = 'tutti'

// gli allegati della chat (Marco, 26-11 sera: «dammi la possibilità di allegare file e immagini sulla chat di gruppo»): le immagini
// si vedono nella bolla, gli altri file si salvano con un clic. Arrivano dal server solo per chi può leggere il messaggio.
const PESO = n => n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`
const prendiAllegato = rel => api('/api/squadra/allegato?rel=' + encodeURIComponent(rel))
function salvaAllegato (al) {
  prendiAllegato(al.rel).then(r => { const a = el('a', { href: r.src, download: r.nome }); document.body.append(a); a.click(); a.remove() }).catch(e => notifica(e.message, { tipo: 'sempre' }))
}
function vediAllegati (lista) {
  return el('div', { class: 'bolla-allegati' }, ...lista.map(al => {
    if (!al.immagine) return el('button', { type: 'button', class: 'allegato-file', title: 'Salva ' + al.nome, onclick: () => salvaAllegato(al) }, ic('file'), el('span', { testo: al.nome }), el('small', { testo: PESO(al.byte) }), ic('download-simple'))
    const img = el('img', { alt: al.nome, class: 'allegato-immagine', loading: 'lazy' })
    prendiAllegato(al.rel).then(r => { img.src = r.src }).catch(() => { img.replaceWith(el('span', { class: 'sopra piccolo', testo: al.nome + ' (non ancora arrivato)' })) })
    return el('button', { type: 'button', class: 'allegato-foto', title: 'Apri ' + al.nome, onclick: () => { if (img.src) { const v = el('dialog', { class: 'allegato-grande', onclick: () => v.remove() }, el('img', { src: img.src, alt: al.nome }), el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'secondario piccolo', onclick: e => { e.stopPropagation(); salvaAllegato(al) } }, ic('download-simple'), 'Salva'))); document.body.append(v); v.showModal() } } }, img)
  }))
}
const leggiFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] ?? ''); r.onerror = () => no(new Error('non riesco a leggere ' + f.name)); r.readAsDataURL(f) })

// le tue squadre (le aree di gruppo) e il pulsante per crearne una
// dall'area personale (Marco, 25-11: «dentro squadra, nella stessa area personale, cambiare squadra, che gira su un git diverso»):
// un clic sceglie quale squadra guardare qui, e Mirion resta nell'area personale; «Apri come area» ci passa del tutto
export async function leTueSquadre (rifai) {
  const d = await api('/api/aree').catch(() => ({ aree: [] })), gruppi = d.aree.filter(a => a.tipo === 'squadra')
  const personale = d.aree.find(a => a.id === d.attiva)?.tipo !== 'squadra', scelta = personale ? d.squadraVista : d.attiva
  const vedi = async a => {
    if (a.id === scelta) return
    if (!personale) return aree.passa(a.id)
    try { await api('/api/squadra/vista', { id: a.id }); rifai ? rifai() : location.reload() } catch (e) { notifica(e.message, { tipo: 'sempre' }) }
  }
  return el('section', { class: 'fascia squadre-tue' }, el('header', {}, el('h2', { testo: 'Le tue squadre' }),
    personale && gruppi.length ? el('span', { class: 'sopra piccolo', testo: 'scegli quale guardare: resti nell’area personale' }) : null),
    el('div', { class: 'bottoni' }, ...gruppi.map(a => el('button', { type: 'button', class: a.id === scelta ? 'primario piccolo' : 'secondario piccolo', 'aria-pressed': String(a.id === scelta), title: a.repo || 'non ancora su GitHub', onclick: () => vedi(a) }, ic('users-three'), a.nome)),
      el('button', { type: 'button', class: 'quieto piccolo', onclick: nuova }, ic('plus'), 'Nuova squadra'),
      personale && scelta ? el('button', { type: 'button', class: 'quieto piccolo', title: 'Mirion passa a quest’area di gruppo, con le sue task e la sua scrivania', onclick: () => aree.passa(scelta) }, ic('arrow-square-out'), 'Apri come area') : null))
}

export function nuova () {
  const fondo = el('div', { class: 'cassetto-fondo', onclick: e => { if (e.target === fondo) fondo.remove() } })
  const nome = el('input', { placeholder: 'Es. La software house', required: true, maxlength: 40 }), io = el('input', { placeholder: 'Il tuo nome', required: true, maxlength: 40 })
  const altri = el('input', { placeholder: 'Gli altri, separati da virgole (es. Sava, Giulia)', maxlength: 400 })
  const esitoNuova = boxCartella() // la cartella controllata prima (cartella.js)
  // la cartella si può lasciare vuota: Mirion la fa in Documenti\Delion\<nome della squadra> (24-11)
  // dall'area personale la cartella è dentro la sua (Squadre\<nome>, 25-11): il segnaposto dice dove, mentre si scrive il nome
  const cartella = el('input', { placeholder: 'Vuota: Documenti\\Delion\\<nome della squadra>', class: 'campo-lungo' })
  const dove = () => api('/api/squadra/dove?nome=' + encodeURIComponent(nome.value.trim() || 'La squadra')).then(r => { cartella.placeholder = 'Vuota: ' + r.cartella }).catch(() => {})
  nome.addEventListener('input', () => { clearTimeout(nome.t); nome.t = setTimeout(dove, 250) }); dove()
  const apri = el('input', { type: 'checkbox', checked: true })
  const scegli = window.delionApp?.scegliCartella && el('button', { type: 'button', class: 'secondario', testo: 'Scegli…', onclick: async () => { const c = await window.delionApp.scegliCartella('Dove mettere la squadra'); if (c) cartella.value = c + '\\' + (nome.value.trim() || 'La squadra') } })
  fondo.append(el('aside', { class: 'cassetto', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Una squadra nuova' },
    el('header', {}, el('h2', { testo: 'Una squadra nuova' }), el('button', { type: 'button', class: 'quieto chiudi', 'aria-label': 'Chiudi', onclick: () => fondo.remove() }, ic('x'))),
    el('p', { class: 'sopra', testo: 'Mirion prepara la squadra sul tuo computer: la cartella (dall’area personale, dentro la sua cartella), git, le regole per Claude e Obsidian. Tu sei il titolare, gli altri collaboratori. Dopo Mirion crea il repository su GitHub (o lo colleghi tu), e gli altri la scaricano dalla loro Mirion.' }),
    el('form', { class: 'campi-area', onsubmit: async e => {
      e.preventDefault(); const b = e.submitter; b.disabled = true
      try { const r = await api('/api/squadra/nuova', { nome: nome.value, io: io.value, altri: altri.value, cartella: cartella.value, apriObsidian: apri.checked }); if (fermaCartella(r, { box: esitoNuova, campo: cartella, riprova: () => e.target.requestSubmit() })) { b.disabled = false; return } notifica(r.resta ? `La squadra è pronta in ${r.cartella}. Resti nell’area personale: ora collegala a GitHub.` : 'La squadra è pronta. Mirion si riapre lì: ora collegala a GitHub.', { tipo: 'sempre', durata: 9000 }); setTimeout(() => { location.hash = 'scrivania?sezione=squadra'; location.reload() }, 700) }
      catch (err) { notifica(err.message, { tipo: 'sempre' }); b.disabled = false }
    } }, el('label', {}, el('span', { testo: 'Il nome della squadra' }), nome), el('label', {}, el('span', { testo: 'Tu' }), io), el('label', {}, el('span', { testo: 'Gli altri' }), altri),
      el('label', {}, el('span', { testo: 'La cartella (nuova o vuota)' }), el('span', { class: 'riga-cartella' }, cartella, scegli)), esitoNuova,
      el('label', { class: 'scelta-spunta' }, apri, el('span', { testo: 'apri la squadra in Obsidian appena è pronta' })),
      el('button', { class: 'primario', testo: 'Crea la squadra' }))))
  document.body.append(fondo); nome.focus()
}

// lo storico e i messaggi della squadra aperta: tre parti, che la stanza Squadra mette nelle sue caselle (squadra.js)
export async function storicoEMessaggi (d, rifai) {
  const [s, m] = await Promise.all([api('/api/squadra/storico').catch(e => ({ errore: e.message, storico: [] })), api('/api/squadra/messaggi').catch(() => ({ messaggi: [] }))])
  const persone = d.persone.filter(p => p.id !== d.io?.id)
  // il repository lo crea Mirion, con l'accesso a GitHub di questo computer (cervello-nuovo.mjs): al primo clic dice cosa farà,
  // al secondo lo fa; creare su GitHub è un'azione fuori dal computer, quindi sempre con il sì di chi usa Mirion (24-11)
  const nomeRepo = el('input', { value: String(d.nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-|-$/g, ''), 'aria-label': 'Il nome del repository', maxlength: 100 })
  const chiede = el('p', { class: 'sopra', hidden: true })
  let pronto = null
  const rimetti = () => { pronto = null; chiede.hidden = true; crea.textContent = 'Crea il repository su GitHub' }
  const crea = el('button', { type: 'button', class: 'primario', testo: 'Crea il repository su GitHub', onclick: async () => {
    if (crea.disabled) return; crea.disabled = true
    try {
      if (pronto !== nomeRepo.value) {
        const r = await api('/api/squadra/github-nuovo', { nome: nomeRepo.value })
        pronto = nomeRepo.value; chiede.textContent = r.chiedi; chiede.hidden = false; crea.textContent = `Sì, crea «${r.nome}»`; return
      }
      crea.textContent = 'Creo… (si può aprire la finestra di GitHub)'
      const r = await api('/api/squadra/github-nuovo', { nome: nomeRepo.value, conferma: true })
      notifica(`Creato ${r.repo} (${r.privato ? 'privato' : 'pubblico'}) e mandata la squadra. Ora invita gli altri: nel repository, Settings → Collaborators.`, { tipo: 'sempre', durata: 12000 }); rifai()
    } catch (err) { notifica(err.message, { tipo: 'sempre', durata: 12000 }); rimetti() } finally { crea.disabled = false }
  } })
  nomeRepo.addEventListener('input', rimetti)
  const github = !s.remoto && el('section', { class: 'pannello squadra-github' }, el('h2', { testo: 'Collega la squadra a GitHub' }),
    el('p', { class: 'sopra', testo: 'Mirion crea il repository privato nel tuo account GitHub e ci manda la squadra. Se non sei ancora entrato, si apre la finestra di GitHub.' }),
    el('div', { class: 'riga-form' }, nomeRepo, crea), chiede,
    el('details', { class: 'squadra-github-mano' }, el('summary', { testo: 'Oppure collegalo tu, a mano' }),
      el('ol', {}, el('li', {}, 'Su GitHub crea un repository ', el('b', { testo: 'privato e vuoto' }), ' (senza README): ', el('a', { href: 'https://github.com/new', target: '_blank', rel: 'noopener', testo: 'github.com/new' }), '.'),
        el('li', { testo: 'Invita gli altri: nel repository, Settings → Collaborators.' }), el('li', { testo: 'Incolla qui l\'indirizzo del repository e premi Collega.' })),
      el('form', { class: 'riga-form', onsubmit: async e => { e.preventDefault(); const b = e.target.querySelector('button'); if (b.disabled) return; b.disabled = true; try { await api('/api/squadra/github', { repo: e.target.repo.value }); notifica('Collegata: la squadra è su GitHub.', { tipo: 'sempre' }); rifai() } catch (err) { notifica(err.message, { tipo: 'sempre' }) } finally { b.disabled = false } } },
        el('input', { name: 'repo', placeholder: 'https://github.com/nome/repository', class: 'campo-lungo', required: true }), el('button', { class: 'primario', testo: 'Collega' }))))
  const fila = el('div', { class: 'chat-fila squadra-messaggi', 'aria-live': 'polite' })
  const disegna = () => {
    const qui = m.messaggi.filter(x => con === 'tutti' ? x.a === 'tutti' : (x.da === con && x.a === d.io?.id) || (x.a === con && x.da === d.io?.id))
    fila.replaceChildren(...qui.map(x => el('div', { class: `bolla ${x.da === d.io?.id ? 'mia' : 'sua'}` }, x.da === d.io?.id ? null : el('small', { class: 'strumenti', testo: x.daNome }), x.testo ? el('p', { testo: x.testo }) : null, x.allegati?.length ? vediAllegati(x.allegati) : null, el('time', { testo: ORA(x.quando) }))),
      qui.length ? '' : el('p', { class: 'vuoto', testo: 'Nessun messaggio. Scrivi il primo.' }))
    fila.scrollTop = fila.scrollHeight
  }
  const scelta = el('select', { 'aria-label': 'Con chi', onchange: e => { con = e.target.value; disegna() } }, el('option', { value: 'tutti', testo: 'Tutta la squadra' }), ...persone.map(p => el('option', { value: p.id, selected: p.id === con, testo: p.nome })))
  const testo = el('textarea', { rows: 1, placeholder: 'Scrivi un messaggio', 'aria-label': 'Il messaggio', onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit() } } })
  // gli allegati da mandare: dal tasto con la graffetta, incollati (Ctrl V) o trascinati sulla chat
  let inAttesa = []
  const pronti = el('div', { class: 'chat-allegati', hidden: true })
  const mostraPronti = () => {
    pronti.hidden = !inAttesa.length
    pronti.replaceChildren(...inAttesa.map((f, i) => el('span', { class: 'allegato-pronto' }, ic(/^image\//.test(f.type) ? 'paperclip' : 'file'), el('span', { testo: f.name }), el('small', { testo: PESO(f.size) }),
      el('button', { type: 'button', class: 'quieto', 'aria-label': 'Togli ' + f.name, onclick: () => { inAttesa.splice(i, 1); mostraPronti() } }, ic('x')))))
  }
  const aggiungi = files => {
    for (const f of files) {
      if (inAttesa.length >= 6) { notifica('Al più 6 allegati per messaggio.', { tipo: 'sempre' }); break }
      if (f.size > 20 * 1024 * 1024) { notifica(`«${f.name}» è troppo grande: al più 20 MB per file.`, { tipo: 'sempre' }); continue }
      inAttesa.push(f.name ? f : new File([f], `immagine-${Date.now()}.png`, { type: f.type }))
    }
    mostraPronti()
  }
  const scegli = el('input', { type: 'file', multiple: true, hidden: true, onchange: e => { aggiungi([...e.target.files]); e.target.value = '' } })
  testo.addEventListener('paste', e => { const f = [...(e.clipboardData?.files ?? [])]; if (f.length) { e.preventDefault(); aggiungi(f) } })
  disegna()
  return { github: github || null,
    messaggi: el('section', { class: 'fascia squadra-chat' }, el('header', {}, el('h2', { testo: 'La chat' })), d.io ? scelta : el('p', { class: 'sopra', testo: 'Dimmi chi sei, per scrivere.' }), fila,
        // un messaggio alla volta (Invio premuto due volte non lo manda due volte); se è scritto ma non partito la chat si rifà
        // lo stesso, così il messaggio si vede e non si riscrive (analisi del 23-11)
        d.io && pronti,
        d.io && el('form', { class: 'chat-scrivi', ondragover: e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); e.currentTarget.classList.add('ci-cade') } }, ondragleave: e => e.currentTarget.classList.remove('ci-cade'),
          ondrop: e => { e.currentTarget.classList.remove('ci-cade'); const f = [...(e.dataTransfer?.files ?? [])]; if (f.length) { e.preventDefault(); aggiungi(f) } },
          onsubmit: async e => {
            e.preventDefault(); const f = e.target, b = f.querySelector('button.primario'); if (b.disabled || (!testo.value.trim() && !inAttesa.length)) return; b.disabled = true
            try {
              const allegati = await Promise.all(inAttesa.map(async x => ({ nome: x.name, dati: await leggiFile(x) })))
              await api('/api/squadra/messaggio', { a: scelta.value, testo: testo.value, ...(allegati.length ? { allegati } : {}) }); inAttesa = []; rifai()
            } catch (err) { notifica(err.message, { tipo: 'sempre' }); if (/scritto/.test(err.message)) rifai() } finally { b.disabled = false }
          } },
          el('button', { type: 'button', class: 'quieto tondo chat-graffetta', title: 'Allega file o immagini (anche incollate o trascinate qui)', 'aria-label': 'Allega file o immagini', onclick: () => scegli.click() }, ic('paperclip')), scegli,
          testo, el('button', { class: 'primario tondo', 'aria-label': 'Manda' }, ic('paper-plane-right'))),
        el('p', { class: 'sopra piccolo', testo: 'I messaggi viaggiano con GitHub: partono subito e arrivano agli altri quando la loro Mirion prende le novità (da sola, ogni minuto).' })),
    // ogni invio si apre: il lavoro fatto e i file (invio.js; Marco, 22-11)
    storico: el('section', { class: 'fascia squadra-storico' }, el('header', {}, el('h2', { testo: 'Lo storico' })), // niente istruzioni (Marco, 25-11 sera: «nello storico togli la descrizione»)
      s.storico.length ? el('ul', { class: 'storico-squadra' }, ...s.storico.map(c => el('li', {}, el('button', { type: 'button', class: 'invio-apri', title: 'Apri: il lavoro fatto e i file', onclick: () => apriInvio(c.sha) },
        el('div', { class: 'novita-testa' }, el('b', { testo: c.chi }), el('small', { testo: ORA(c.quando) })),
        c.vede ? el('small', { class: 'storico-vede', testo: 'solo per ' + c.vede.map(id => d.persone.find(p => p.id === id)?.nome ?? id).join(' e ') }) : null,
        el('p', { testo: c.titolo }), el('small', { class: 'sopra', testo: `${c.file.length} file${c.file.length ? ': ' + c.file.slice(0, 3).map(f => f.split('/').pop()).join(', ') + (c.file.length > 3 ? '…' : '') : ''} ›` })))))
        : el('p', { class: 'vuoto', testo: s.errore ?? 'Ancora niente.' })) }
}
