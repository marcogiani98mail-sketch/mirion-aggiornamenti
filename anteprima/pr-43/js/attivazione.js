// Il collegamento al cervello alla prima apertura (server/attivazione.mjs, server/cervello.mjs): finché non è fatto, Mirion
// mostra solo questo. Due casi: l'installatore a una volta sola di una persona (con la licenza: «Attiva Mirion», chi sei è già
// scelto) e l'installatore di tutti, che collega il cervello di squadra a chi non l'ha ancora (Marco, 23-11: «fai anche
// nell'installer in caso qualcuno non ce l'ha il collegamento diretto e l'installazione del cervello digitale in git»).
// Tre passi: Git sul computer (Mirion lo installa con un clic; senza winget si apre il sito), l'accesso a GitHub (la persona,
// nella finestra di GitHub), poi il cervello: trovato sul computer o scaricato in Documenti\Delion. Con la licenza, appena Git
// c'è, il collegamento parte da solo.
import { el, api, notifica } from './base.js'
import { ic } from './icone.js'

export function attivazione (s) {
  const licenza = s.tipo !== 'cervello'
  const fondo = el('div', { class: 'cassetto-fondo attivazione-fondo' })
  const errore = el('p', { class: 'attivazione-errore', role: 'alert', hidden: true })
  const passoGit = el('li', {})
  let partito = false
  const disegnaGit = (c, testo = null) => passoGit.replaceChildren(...[
    el('b', {}, c ? ic('check-circle') : null, 'Git sul computer'),
    el('span', { testo: c ? 'C\'è.' : testo ?? 'Serve per scaricare e mandare il lavoro della squadra.' }),
    !c && !testo ? el('button', { type: 'button', class: 'secondario piccolo', onclick: installaGit }, ic('arrow-down'), 'Installa Git') : null].filter(Boolean))
  async function installaGit () {
    mostra('')
    const r = await api('/api/attivazione/git', {}).catch(e => ({ via: 'sito', sito: 'https://git-scm.com/download/win', perche: e.message }))
    if (r.via === 'winget') disegnaGit(false, 'Lo sto installando. Se Windows chiede il permesso, rispondi «Sì». Questa pagina se ne accorge da sola.')
    else { window.open(r.sito, '_blank', 'noopener'); disegnaGit(false, `${r.perche ? r.perche[0].toUpperCase() + r.perche.slice(1) + ': i' : 'I'}nstallalo dalla pagina che si è aperta (va bene tutto com'è proposto). Questa pagina se ne accorge da sola.`) }
    aspettaGit()
  }
  async function aspettaGit () {
    for (let i = 0; i < 180; i++) { // al più un quarto d'ora
      await new Promise(ok => setTimeout(ok, 5000))
      const t = await api('/api/attivazione').catch(() => null)
      if (t?.git) { disegnaGit(true); if (licenza) vai(); return }
      if (t?.installaGit?.esito && t.installaGit.esito !== 'fatto' && !t.installaGit.inCorso) { disegnaGit(false); mostra(`Git: ${t.installaGit.esito}. Riprova, o installalo da git-scm.com e riapri Mirion.`); return }
    }
    disegnaGit(false); mostra('Git non risulta installato. Riprova, o installalo da git-scm.com e riapri Mirion.')
  }
  // Obsidian (Marco, 23-11: «il collegamento a Obsidian con il cervello già strutturato dal git è automatico? se no rendilo fattibile
  // dall'installazione»): non serve per collegare, ma con un clic si installa come Git; il cervello è già nella sua lista, e
  // la prima volta che si apre Obsidian si apre lì
  const passoObsidian = el('li', {})
  const ASPETTA = 'Lo sto installando. Se Windows chiede il permesso, rispondi «Sì». Quando lo apri, si apre già sul cervello.'
  const disegnaObsidian = (c, testo = null) => passoObsidian.replaceChildren(...[
    el('b', {}, c ? ic('check-circle') : null, 'Obsidian'),
    el('span', { testo: c ? 'C’è: il cervello si apre in Obsidian da solo.' : testo ?? 'Per leggere e scrivere il cervello con le note collegate. Il cervello entra in Obsidian da solo: se non c’è, installalo qui.' }),
    !c && !testo ? el('button', { type: 'button', class: 'secondario piccolo', onclick: installaObsidian }, ic('arrow-down'), 'Installa Obsidian') : null].filter(Boolean))
  async function installaObsidian () {
    const r = await api('/api/attivazione/obsidian', {}).catch(e => ({ via: 'sito', sito: 'https://obsidian.md/download', perche: e.message }))
    if (r.via === 'winget') disegnaObsidian(false, ASPETTA)
    else { window.open(r.sito, '_blank', 'noopener'); disegnaObsidian(false, `${r.perche ? r.perche[0].toUpperCase() + r.perche.slice(1) + ': i' : 'I'}nstallalo dalla pagina che si è aperta. Quando lo apri, si apre già sul cervello.`) }
    for (let i = 0; i < 180; i++) {
      await new Promise(ok => setTimeout(ok, 5000))
      const t = await api('/api/attivazione').catch(() => null)
      if (t?.obsidian) return disegnaObsidian(true)
      if (t?.installaObsidian?.esito && t.installaObsidian.esito !== 'fatto' && !t.installaObsidian.inCorso) return disegnaObsidian(false, `Obsidian: ${t.installaObsidian.esito}. Lo trovi su obsidian.md/download.`)
      if (t && !t.serve) return // la finestra è già passata oltre
    }
  }
  disegnaObsidian(s.obsidian, s.installaObsidian?.inCorso ? ASPETTA : null)
  // Claude (Marco, 23-11: «nell'installazione ci deve essere tutto quello che riguarda l'utilizzo con Claude, anche il piano
  // gratuito»): l'app con un clic, e l'account, che per cominciare può essere quello gratuito
  const passoClaude = el('li', {})
  const ASPETTA_C = 'La sto installando. Se Windows chiede il permesso, rispondi «Sì».'
  const disegnaClaude = (c, testo = null) => passoClaude.replaceChildren(...[
    el('b', {}, c ? ic('check-circle') : null, 'Claude'),
    el('span', { testo: c ? 'C’è. Se non hai ancora l’account, crealo: per cominciare basta quello gratuito.' : testo ?? 'È l’intelligenza artificiale che lavora nel cervello. Installa l’app e crea l’account: per cominciare basta quello gratuito.' }),
    el('span', { class: 'bottoni' },
      !c && !testo ? el('button', { type: 'button', class: 'secondario piccolo', onclick: installaClaude }, ic('arrow-down'), 'Installa Claude') : null,
      el('button', { type: 'button', class: 'quieto piccolo', onclick: () => window.open('https://claude.ai/login', '_blank', 'noopener') }, 'Account gratuito'))].filter(Boolean))
  async function installaClaude () {
    const r = await api('/api/attivazione/claude', {}).catch(e => ({ via: 'sito', sito: 'https://claude.ai/download', perche: e.message }))
    if (r.via === 'winget') disegnaClaude(false, ASPETTA_C)
    else { window.open(r.sito, '_blank', 'noopener'); disegnaClaude(false, `${r.perche ? r.perche[0].toUpperCase() + r.perche.slice(1) + ': i' : 'I'}nstallala dalla pagina che si è aperta.`) }
    for (let i = 0; i < 180; i++) {
      await new Promise(ok => setTimeout(ok, 5000))
      const t = await api('/api/attivazione').catch(() => null)
      if (t?.claude) return disegnaClaude(true)
      if (t?.installaClaude && t.installaClaude !== 'in corso' && t.installaClaude !== 'finita') return disegnaClaude(false, `Claude: ${t.installaClaude}. La trovi su claude.ai/download.`)
      if (t && !t.serve) return
    }
  }
  disegnaClaude(s.claude === true, s.installaClaude === 'in corso' ? ASPETTA_C : null)
  const mostra = t => { errore.textContent = t; errore.hidden = !t }
  const vai = async () => {
    if (partito) return
    partito = true; mostra(''); attiva.disabled = true; attiva.replaceChildren(licenza ? 'Attivo… (si può aprire la finestra di GitHub)' : 'Collego… (si può aprire la finestra di GitHub)')
    try {
      const r = await api('/api/attivazione', {})
      notifica(licenza ? `Mirion è attiva: sei «${s.nome}» nella squadra.` : 'Il cervello è collegato.', { tipo: 'sempre', durata: 5000 })
      fondo.querySelector('.cassetto').replaceChildren(el('h2', { testo: 'Fatto' }),
        el('p', { testo: `${r.trovato ? 'Il cervello c’era già' : 'Il cervello è scaricato'}: ${r.cartella}. Mirion si riapre lì${licenza ? '' : ': nella Squadra della scrivania scegli chi sei'}.` }),
        r.avviso ? el('p', { class: 'sopra', testo: r.avviso }) : '',
        // senza Obsidian la finestra resta, con il tasto per installarlo: si va avanti con «Continua»
        s.obsidian === false ? el('ol', { class: 'passi-attivazione' }, passoObsidian) : '',
        s.obsidian === false ? el('div', { class: 'bottoni' }, el('button', { type: 'button', class: 'primario', onclick: () => location.reload() }, 'Continua')) : '')
      if (!licenza) location.hash = 'scrivania?sezione=squadra'
      if (s.obsidian !== false) setTimeout(() => location.reload(), r.avviso ? 5000 : 2000)
    } catch (e) { partito = false; mostra(e.message); attiva.disabled = false; attiva.replaceChildren('Riprova') }
  }
  const attiva = el('button', { type: 'button', class: 'primario grande', onclick: vai }, licenza ? 'Attiva' : 'Collega il cervello')
  const dopo = !licenza && el('button', { type: 'button', class: 'quieto', onclick: async () => { await api('/api/attivazione/piu-tardi', {}).catch(() => {}); location.reload() } }, 'Più tardi')
  const gitInCorso = s.installaGit?.inCorso
  disegnaGit(s.git, gitInCorso ? 'Lo sto installando. Se Windows chiede il permesso, rispondi «Sì». Questa pagina se ne accorge da sola.' : null)
  if (gitInCorso) aspettaGit()
  fondo.append(el('aside', { class: 'cassetto finestra-attivazione', role: 'dialog', 'aria-modal': 'true', 'aria-label': licenza ? 'Attiva Mirion' : 'Collega il cervello' },
    el('h2', { testo: licenza ? 'Attiva Mirion' : 'Collega il cervello' }),
    el('p', { class: 'sopra', testo: licenza ? `Questa copia è per «${s.nome}». Si attiva una volta sola, su questo computer: su un altro computer lo stesso installatore non funziona.`
      : `Mirion lavora con il cervello di squadra su GitHub (${s.repo.replace(/^https:\/\/github\.com\//, '')}). Se è già sul computer lo trova e lo usa così com'è; se no lo scarica.` }),
    el('ol', { class: 'passi-attivazione' },
      passoGit,
      el('li', {}, el('b', { testo: 'L\'accesso a GitHub' }), el('span', { testo: 'Si può aprire una finestra di GitHub: entra con l\'account invitato al repository e accetta. Mirion non chiede e non salva password.' })),
      el('li', {}, el('b', { testo: licenza ? 'Attiva' : 'Il cervello' }), el('span', { testo: `Mirion cerca il cervello sul computer (aree di Mirion, Obsidian, Documenti, Desktop): se c'è lo usa senza toccare il tuo lavoro, se no lo scarica in Documenti\\Delion${licenza ? ', ti mette nella tua postazione' : ''} e collega Obsidian.` })),
      passoClaude, passoObsidian),
    errore, el('div', { class: 'bottoni' }, attiva, dopo || '')))
  document.body.append(fondo)
  attiva.focus()
  if (licenza && s.git) vai() // con la licenza e Git già sul computer, il collegamento parte da solo
}
