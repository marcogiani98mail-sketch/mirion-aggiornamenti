// «Il tuo GitHub», in cima a «Porta dentro i file del computer» nell'edizione per un cliente (server/github-mio.mjs; Marco, 25-11:
// «il Mirion di Claudio deve essere diverso dal nostro, quindi il GitHub deve essere suo e glielo fai creare durante
// l'installazione»). Quattro passi, ognuno con il suo tasto: Git, l'account, la chiave, il repository privato. Niente parte da solo.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

const fatto = testo => el('p', { class: 'github-fatto' }, ic('check-circle'), el('span', { testo }))
const riga = (n, titolo, ok, ...corpo) => el('div', { class: 'github-riga' + (ok ? ' ok' : '') }, el('h3', {}, el('span', { class: 'importa-numero piccolo', testo: String(n) }), titolo), ...corpo)
const link = (href, testo, icona) => el('a', { class: 'secondario piccolo', href, target: '_blank', rel: 'noopener' }, icona ? ic(icona) : null, testo)

export async function sezioneGithub () {
  const sezione = el('section', { class: 'fascia importa-passo github-mio' })
  const mostra = async () => {
    let d; try { d = await api('/api/github-mio') } catch (e) { return sezione.replaceChildren(el('p', { class: 'problema', testo: e.message })) }
    const cima = el('h2', {}, el('span', { class: 'importa-numero' }, ic('users-three')), 'Il tuo GitHub')
    if (d.collegato) return sezione.replaceChildren(cima, fatto('Il tuo cervello è nel tuo GitHub, privato: «Manda il mio lavoro» lo manda lì, «Prendi le novità» lo riprende.'), el('p', { class: 'sopra piccolo' }, link(d.collegato.replace(/\.git$/, ''), d.collegato.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, ''), 'arrow-square-out')))

    // 1. Git
    const git = riga(1, d.mac ? 'Git (gli strumenti di Apple)' : 'Git', d.git,
      d.git ? fatto('Git c’è.') : el('div', { class: 'github-corpo' },
        el('p', { class: 'sopra', testo: d.mac ? 'Sul Mac Git arriva con gli strumenti per sviluppatori di Apple: si apre la finestra di Apple, premi «Installa» e aspetta che finisca (qualche minuto). Poi «Controlla».' : 'Mirion lo installa con un clic: Windows chiede il permesso, rispondi sì. Poi «Controlla».' }),
        d.installaGit?.inCorso ? el('p', { class: 'sopra piccolo', testo: 'Sta installando…' }) : null,
        el('div', { class: 'bottoni' },
          el('button', { type: 'button', class: 'primario', onclick: async () => { try { const r = await api('/api/github-mio', { azione: 'git' }); if (r.sito) window.open(r.sito, '_blank'); notifica(r.messaggio ?? (r.gia ? 'Gli strumenti risultano già installati: prova «Controlla».' : 'Installo Git…')) } catch (e) { notifica(e.message, { tipo: 'sempre' }) } } }, ic('arrow-down'), 'Installa Git'),
          el('button', { type: 'button', class: 'secondario', onclick: mostra }, 'Controlla'))))

    // 2. l'account
    const conChiave = Boolean(d.account)
    const account = riga(2, 'Il tuo account', conChiave,
      conChiave ? fatto(`Sei ${d.account} su GitHub.`) : el('div', { class: 'github-corpo' },
        el('p', { class: 'sopra', testo: 'Il tuo account su GitHub, gratuito: lì il tuo cervello sta al sicuro, privato, e lo ritrovi se cambi computer. Lo crei tu: email, una password tua, il nome utente. GitHub ti manda un codice per email.' }),
        el('div', { class: 'bottoni' }, link(d.pagine.account, 'Crea l’account su GitHub', 'user-plus'), el('span', { class: 'sopra piccolo', testo: 'Ce l’hai già? Vai al passo 3.' }))))

    // 3. la chiave
    const campo = el('input', { type: 'password', placeholder: 'ghp_…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'La chiave di GitHub' })
    const chiave = riga(3, 'La chiave per Mirion', conChiave,
      conChiave ? fatto('Mirion entra nel tuo GitHub con la tua chiave, tenuta nel portachiavi del computer.') : el('div', { class: 'github-corpo' },
        el('p', { class: 'sopra', testo: 'La chiave fa entrare Mirion nel tuo account per mandare il cervello. Si apre la pagina di GitHub già compilata:' }),
        el('ol', { class: 'sopra github-passi' },
          el('li', { testo: 'entra con il tuo account, se te lo chiede;' }),
          el('li', { testo: '«Expiration»: scegli «No expiration» (se no fra 30 giorni Mirion non manda più);' }),
          el('li', { testo: 'lascia spuntato «repo», scendi in fondo e premi «Generate token»;' }),
          el('li', { testo: 'copia la chiave (comincia con ghp_) e incollala qui sotto. GitHub la fa vedere una volta sola.' })),
        el('div', { class: 'bottoni' }, link(d.pagine.chiave, 'Apri la pagina della chiave', 'arrow-square-out')),
        el('div', { class: 'importa-altra' }, campo, el('button', { type: 'button', class: 'primario', disabled: !d.git, title: d.git ? '' : 'Prima Git (passo 1)', onclick: async e => {
          e.target.disabled = true
          try { const r = await api('/api/github-mio', { azione: 'chiave', chiave: campo.value }); campo.value = ''; notifica(`Entrato nel tuo GitHub come ${r.account}.`); mostra() } catch (er) { notifica(er.message, { tipo: 'sempre' }); e.target.disabled = false }
        } }, 'Collega'))))

    // 4. il repository
    const nome = el('input', { type: 'text', value: d.nome, spellcheck: 'false', 'aria-label': 'Il nome del repository' })
    const conferma = el('div', { class: 'github-conferma', hidden: true })
    const crea = async si => {
      try {
        const r = await api('/api/github-mio', { azione: 'crea', nome: nome.value, conferma: si })
        if (r.chiedi) {
          conferma.hidden = false
          return conferma.replaceChildren(el('p', { testo: r.chiedi }), el('div', { class: 'bottoni' },
            el('button', { type: 'button', class: 'primario', onclick: async e => { e.target.disabled = true; e.target.textContent = 'Creo e mando… (con tanti file ci vuole qualche minuto)'; await crea(true) } }, 'Sì, crea'),
            el('button', { type: 'button', class: 'secondario', onclick: () => { conferma.hidden = true } }, 'No')))
        }
        notifica('Il tuo cervello è nel tuo GitHub, privato.'); mostra()
      } catch (e) { conferma.hidden = true; notifica(e.message, { tipo: 'sempre' }) }
    }
    const repo = riga(4, 'Il tuo cervello su GitHub', false, el('div', { class: 'github-corpo' },
      el('p', { class: 'sopra', testo: 'Mirion crea nel tuo account un repository privato (lo vedi solo tu) e ci manda il cervello. La cartella «Importati», con le copie dei tuoi file, resta solo su questo computer; le note che scrive l’IA invece vanno su GitHub, nel tuo repository privato.' }),
      el('div', { class: 'importa-altra' }, nome, el('button', { type: 'button', class: 'primario', disabled: !d.git || !conChiave, title: conChiave ? '' : 'Prima la chiave (passo 3)', onclick: () => crea(false) }, ic('upload-simple'), 'Crea il mio cervello su GitHub')),
      conferma))
    if (!conChiave) repo.classList.add('spento')

    sezione.replaceChildren(cima,
      el('p', { class: 'sopra', testo: 'Il tuo Mirion è tuo: il cervello sta sul tuo computer e nel tuo GitHub, non nel nostro. Si fa una volta sola, all’inizio.' }),
      git, account, chiave, repo)
  }
  await mostra()
  return sezione
}
