// Copia di Mirion Fit (Piatto, public/guida.js), per la card «Allenamento» di Mirion sul computer: le due vanno tenute uguali.
// La guida animata di un esercizio (Marco, 26-11-2026: «fammi un'animazione specifica per un allenamento di un esercizio stile
// app»). Una figura vista di lato fa il movimento al ritmo giusto (giù in 2 secondi, su in 1), conta le ripetizioni, segna le
// serie e fa partire il recupero con il conto alla rovescia. A fine esercizio le serie fatte tornano nel foglio, pronte da segnare.
// Si comincia dallo squat (con bilanciere dietro, davanti, o con il manubrio al petto): MOVIMENTI dice quali esercizi ce l'hanno.
// La figura è disegnata qui (SVG), con gli angoli delle articolazioni: le ossa restano della stessa lunghezza mentre si muove.

const rad = (g) => (g * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const morbido = (t) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;

// Le pose: angoli assoluti in gradi, 0 = verso l'alto, positivo = in avanti (la figura guarda a destra).
// stinco (caviglia → ginocchio), coscia (ginocchio → anca), busto (anca → spalle), braccio (spalla → gomito), avambraccio (gomito → mano)
const SQUAT = {
  su: { stinco: 0, coscia: 0, busto: 4, braccio: 205, avambraccio: 20 },
  giu: { stinco: 32, coscia: -98, busto: 44, braccio: 230, avambraccio: 60 },
};
const FRONT = {
  su: { stinco: 0, coscia: 0, busto: 2, braccio: 150, avambraccio: 20 },
  giu: { stinco: 36, coscia: -100, busto: 24, braccio: 160, avambraccio: 40 },
};
const GOBLET = {
  su: { stinco: 0, coscia: 0, busto: 3, braccio: 170, avambraccio: 15 },
  giu: { stinco: 34, coscia: -100, busto: 28, braccio: 178, avambraccio: 35 },
};

// il ritmo di una ripetizione, in secondi: scendi, fermo giù, sali, fermo su
const RITMO = [['giu', 2, 'Scendi piano'], ['fermo-giu', 0.4, 'Cosce parallele'], ['su', 1, 'Spingi su'], ['fermo-su', 0.6, 'Respira']];

export const MOVIMENTI = {
  'es:squat': { pose: SQUAT, attrezzo: 'dietro', muscoli: 'Lavorano quadricipiti e glutei' },
  'es:front-squat': { pose: FRONT, attrezzo: 'davanti', muscoli: 'Lavorano soprattutto i quadricipiti' },
  'es:goblet-squat': { pose: GOBLET, attrezzo: 'goblet', muscoli: 'Lavorano quadricipiti e glutei' },
};
export const haGuida = (id) => Boolean(MOVIMENTI[id]);

// —— La figura ——
const L = { stinco: 46, coscia: 48, busto: 58, collo: 15, braccio: 26, avambraccio: 24 };
const verso = (p, ang, lung) => ({ x: p.x + lung * Math.sin(rad(ang)), y: p.y - lung * Math.cos(rad(ang)) });

function posa(m, t) {
  // t: 0 = in piedi, 1 = giù
  const a = {}; for (const k of Object.keys(m.pose.su)) a[k] = lerp(m.pose.su[k], m.pose.giu[k], t);
  const caviglia = { x: 104, y: 196 };
  const ginocchio = verso(caviglia, a.stinco, L.stinco);
  const anca = verso(ginocchio, a.coscia, L.coscia);
  const spalla = verso(anca, a.busto, L.busto);
  const testa = verso(spalla, a.busto - 6, L.collo + 9);
  const gomito = verso(spalla, a.braccio, L.braccio);
  let mano = verso(gomito, a.avambraccio, L.avambraccio);
  let peso = null;
  if (m.attrezzo === 'dietro') { peso = verso(spalla, a.busto - 90, 5); mano = peso; }
  if (m.attrezzo === 'davanti') { peso = verso(spalla, a.busto + 80, 7); mano = peso; }
  if (m.attrezzo === 'goblet') { peso = verso(spalla, a.busto + 150, 18); peso = { x: peso.x + 10, y: peso.y }; mano = peso; }
  return { caviglia, ginocchio, anca, spalla, testa, gomito, mano, peso };
}

const NS = 'http://www.w3.org/2000/svg';
function figuraSvg(grande) {
  return `<svg class="guida-svg${grande ? ' grande' : ''}" viewBox="0 0 200 210" role="img" aria-label="La figura che fa il movimento">
    <defs>
      <linearGradient id="g-corpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a8ff"/><stop offset="1" stop-color="#9d6bff"/></linearGradient>
      <linearGradient id="g-lavora" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a6b"/><stop offset="1" stop-color="#ff6b8a"/></linearGradient>
      <radialGradient id="g-alone" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9d6bff" stop-opacity=".35"/><stop offset="1" stop-color="#9d6bff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle class="g-alone" cx="100" cy="130" r="92" fill="url(#g-alone)"/>
    <line class="g-parallelo" x1="20" x2="180" y1="0" y2="0" />
    <text class="g-parallelo-t" x="22" y="0">parallelo</text>
    <ellipse class="g-ombra" cx="104" cy="199" rx="40" ry="5"/>
    <line class="g-terra" x1="20" x2="180" y1="199" y2="199"/>
    <g class="g-fig" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path class="g-osso g-gamba" stroke="url(#g-corpo)" stroke-width="11"/>
      <path class="g-osso g-coscia" stroke="url(#g-lavora)" stroke-width="12"/>
      <path class="g-osso g-busto" stroke="url(#g-corpo)" stroke-width="14"/>
      <path class="g-osso g-braccio" stroke="#b892ff" stroke-width="8"/>
      <path class="g-piede" stroke="#9d6bff" stroke-width="8"/>
      <circle class="g-testa" r="10" fill="url(#g-corpo)" stroke="none"/>
      <g class="g-peso"></g>
    </g>
  </svg>`;
}

function disegna(svg, m, t, lavora) {
  const p = posa(m, t), q = (a) => `${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
  const $ = (s) => svg.querySelector(s);
  $('.g-gamba').setAttribute('d', `M ${q(p.caviglia)} L ${q(p.ginocchio)}`);
  $('.g-coscia').setAttribute('d', `M ${q(p.ginocchio)} L ${q(p.anca)}`);
  $('.g-coscia').style.opacity = String(0.55 + 0.45 * lavora);
  $('.g-busto').setAttribute('d', `M ${q(p.anca)} L ${q(p.spalla)}`);
  $('.g-braccio').setAttribute('d', `M ${q(p.spalla)} L ${q(p.gomito)} L ${q(p.mano)}`);
  $('.g-piede').setAttribute('d', `M ${p.caviglia.x - 7} 197 L ${p.caviglia.x + 20} 197`);
  const testa = $('.g-testa'); testa.setAttribute('cx', p.testa.x.toFixed(1)); testa.setAttribute('cy', p.testa.y.toFixed(1));
  // la linea del parallelo all'altezza delle ginocchia quando si è giù
  const giu = posa(m, 1).ginocchio.y;
  $('.g-parallelo').setAttribute('y1', giu); $('.g-parallelo').setAttribute('y2', giu); $('.g-parallelo-t').setAttribute('y', giu - 4);
  const arrivato = t > 0.94; $('.g-parallelo').classList.toggle('preso', arrivato); $('.g-parallelo-t').classList.toggle('preso', arrivato);
  const g = $('.g-peso');
  if (m.attrezzo === 'goblet') g.innerHTML = `<rect x="${(p.peso.x - 7).toFixed(1)}" y="${(p.peso.y - 9).toFixed(1)}" width="14" height="18" rx="4" fill="#ff9a6b"/>`;
  else g.innerHTML = `<line x1="${(p.peso.x - 3).toFixed(1)}" y1="${p.peso.y.toFixed(1)}" x2="${(p.peso.x + 3).toFixed(1)}" y2="${p.peso.y.toFixed(1)}" stroke="#ddd" stroke-width="4"/><circle cx="${p.peso.x.toFixed(1)}" cy="${p.peso.y.toFixed(1)}" r="13" fill="#2a2140" stroke="#ff9a6b" stroke-width="3"/><circle cx="${p.peso.x.toFixed(1)}" cy="${p.peso.y.toFixed(1)}" r="3" fill="#ff9a6b"/>`;
}

// dove si è dentro una ripetizione, dal tempo (secondi) passato: la posa (0-1), la frase da leggere, quanto lavorano le gambe
const DURATA = RITMO.reduce((s, r) => s + r[1], 0);
function momento(sec) {
  let x = sec % DURATA;
  for (const [fase, d, frase] of RITMO) {
    if (x < d) {
      const f = x / d;
      if (fase === 'giu') return { t: morbido(f), frase, fase, resta: d - x, lavora: 0.4 };
      if (fase === 'fermo-giu') return { t: 1, frase, fase, resta: d - x, lavora: 0.8 };
      if (fase === 'su') return { t: 1 - morbido(f), frase, fase, resta: d - x, lavora: 1 };
      return { t: 0, frase, fase, resta: d - x, lavora: 0 };
    }
    x -= d;
  }
  return { t: 0, frase: '', fase: 'fermo-su', resta: 0, lavora: 0 };
}

// —— L'anteprima: la figura che ripete il movimento, nel foglio dell'esercizio ——
export function htmlAnteprima(id) {
  const m = MOVIMENTI[id]; if (!m) return '';
  return `<div class="guida-anteprima" data-guida-anteprima="${id}">${figuraSvg(false)}<div class="guida-anteprima-testo"><b data-g-frase>Scendi piano</b><small class="tenue">${m.muscoli}. Giù in 2 secondi, su in 1.</small></div></div>`;
}

const giri = new Set();
function gira(el, passo) {
  const g = { el, passo, inizio: performance.now() };
  giri.add(g);
  if (giri.size === 1) requestAnimationFrame(tic);
  return g;
}
function tic(ora) {
  for (const g of giri) { if (!g.el.isConnected) { giri.delete(g); continue; } g.passo(ora); }
  if (giri.size) requestAnimationFrame(tic);
}

export function montaAnteprime(radice) {
  for (const el of radice.querySelectorAll('[data-guida-anteprima]')) {
    const m = MOVIMENTI[el.dataset.guidaAnteprima], svg = el.querySelector('svg'), frase = el.querySelector('[data-g-frase]');
    if (!m || el.dataset.montata) continue; el.dataset.montata = '1';
    const g = gira(el, (ora) => { const k = momento((ora - g.inizio) / 1000); disegna(svg, m, k.t, k.lavora); if (frase.textContent !== k.frase) frase.textContent = k.frase; });
  }
}

// —— La guida intera: ripetizioni, serie, recupero ——
// opz: { id, nome, serie (quante), rip (per serie), recupero (secondi), kg }; fine(fatte): fatte = ripetizioni di ogni serie
export function htmlGuida(o) {
  return `<div class="guida-es" data-guida>
    <div class="guida-palco">${figuraSvg(true)}
      <div class="guida-riposo" data-g-riposo hidden>
        <svg viewBox="0 0 120 120" class="guida-anello"><circle cx="60" cy="60" r="52" class="fondo"/><circle cx="60" cy="60" r="52" class="avanza" data-g-anello pathLength="100"/></svg>
        <div class="guida-riposo-testo"><small>Recupero</small><b data-g-secondi>90</b><small data-g-dopo></small></div>
      </div>
    </div>
    <p class="guida-frase" data-g-frase aria-live="polite">Pronto?</p>
    <div class="guida-numeri">
      <div class="guida-rip"><b data-g-rip>0</b><span>di ${o.rip} ripetizioni</span></div>
      <div class="guida-serie"><span data-g-serie-t>Serie 1 di ${o.serie}</span><span class="guida-puntini">${Array.from({ length: o.serie }, (_, i) => `<i data-g-punto="${i}"></i>`).join('')}</span>${o.kg ? `<small class="tenue">${String(o.kg).replace('.', ',')} kg</small>` : ''}</div>
    </div>
    <div class="guida-bottoni" data-g-bottoni></div>
  </div>`;
}

export function montaGuida(radice, o, fine) {
  const m = MOVIMENTI[o.id]; if (!m) return;
  const el = radice.querySelector('[data-guida]'), svg = el.querySelector('.guida-svg');
  const q = (s) => el.querySelector(s);
  const s = { stato: 'pronto', serie: 0, rip: 0, fatte: [], pausaDa: 0, tempoFermo: 0, inizio: 0, riposoFine: 0, ultimaRip: -1 };
  const vibra = (x) => { try { navigator.vibrate?.(x); } catch {} };
  const bottoni = (lista) => { q('[data-g-bottoni]').innerHTML = lista.map(([az, testo, cl]) => `<button type="button" class="btn ${cl || 'secondario'}" data-g="${az}">${testo}</button>`).join(''); };
  const puntini = () => el.querySelectorAll('[data-g-punto]').forEach((p, i) => { p.className = i < s.serie ? 'fatto' : i === s.serie && s.stato !== 'finito' ? 'adesso' : ''; });
  function comincia(ora) {
    s.stato = 'conta'; s.rip = 0; s.ultimaRip = -1; s.inizio = ora ?? performance.now(); s.tempoFermo = 0;
    q('[data-g-riposo]').hidden = true; svg.classList.remove('spenta');
    q('[data-g-serie-t]').textContent = `Serie ${s.serie + 1} di ${o.serie}`; q('[data-g-rip]').textContent = '0';
    bottoni([['pausa', 'Pausa'], ['serie-fatta', 'Serie fatta', 'primario']]); puntini();
  }
  function chiudiSerie() {
    s.fatte.push(s.rip || o.rip); s.serie++; vibra(120); puntini();
    if (s.serie >= o.serie) {
      s.stato = 'finito'; svg.classList.add('spenta'); q('[data-g-riposo]').hidden = true;
      q('[data-g-frase]').textContent = `Fatto! ${o.serie} serie di ${o.nome.toLowerCase()}`;
      q('[data-g-serie-t]').textContent = `${o.serie} serie su ${o.serie}`;
      bottoni([['ancora', 'Ancora una serie'], ['fine', 'Segna le serie', 'primario']]); puntini(); return;
    }
    s.stato = 'riposo'; s.riposoFine = performance.now() + o.recupero * 1000;
    q('[data-g-serie-t]').textContent = `Serie ${s.serie} di ${o.serie} fatta`;
    q('[data-g-riposo]').hidden = false; svg.classList.add('spenta');
    q('[data-g-dopo]').textContent = `poi serie ${s.serie + 1}`;
    bottoni([['piu15', '+15 s'], ['salta', 'Riparto ora', 'primario']]);
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return; e.preventDefault();
    const az = b.dataset.g, ora = performance.now();
    if (az === 'via') comincia(ora);
    else if (az === 'pausa') { s.stato = 'pausa'; s.pausaDa = ora; q('[data-g-frase]').textContent = 'In pausa'; bottoni([['riprendi', 'Riprendi', 'primario'], ['serie-fatta', 'Serie fatta']]); }
    else if (az === 'riprendi') { s.tempoFermo += ora - s.pausaDa; s.stato = 'conta'; bottoni([['pausa', 'Pausa'], ['serie-fatta', 'Serie fatta', 'primario']]); }
    else if (az === 'serie-fatta') chiudiSerie();
    else if (az === 'piu15') s.riposoFine += 15000;
    else if (az === 'salta') comincia(ora);
    else if (az === 'ancora') { o.serie++; el.querySelector('.guida-puntini').insertAdjacentHTML('beforeend', `<i data-g-punto="${o.serie - 1}"></i>`); comincia(ora); }
    else if (az === 'fine') fine(s.fatte.slice());
  });
  bottoni([['via', 'Comincia', 'primario']]);
  disegna(svg, m, 0, 0);
  const g = gira(el, (ora) => {
    if (s.stato === 'conta') {
      const sec = (ora - s.inizio - s.tempoFermo) / 1000, k = momento(sec);
      disegna(svg, m, k.t, k.lavora);
      const fatte = Math.floor(sec / DURATA);
      if (fatte !== s.ultimaRip) { s.ultimaRip = fatte; s.rip = fatte; q('[data-g-rip]').textContent = String(fatte); if (fatte) vibra(30); }
      const frase = s.rip >= o.rip - 1 && k.fase === 'su' ? 'Ultima: spingi!' : k.frase;
      if (q('[data-g-frase]').textContent !== frase) q('[data-g-frase]').textContent = frase;
      if (s.rip >= o.rip) chiudiSerie();
    } else if (s.stato === 'riposo') {
      const resta = Math.max(0, (s.riposoFine - ora) / 1000);
      q('[data-g-secondi]').textContent = String(Math.ceil(resta));
      q('[data-g-anello]').style.strokeDashoffset = String(100 - (resta / o.recupero) * 100);
      // la figura respira in piedi
      disegna(svg, m, 0.04 + 0.03 * Math.sin(ora / 600), 0);
      const frase = resta <= 5 ? 'Pronto, si riparte' : 'Recupera: respira e bevi';
      if (q('[data-g-frase]').textContent !== frase) q('[data-g-frase]').textContent = frase;
      if (resta <= 0) { vibra([80, 60, 80]); comincia(ora); }
    } else if (s.stato === 'pronto') {
      disegna(svg, m, 0.04 + 0.03 * Math.sin(ora / 600), 0);
    }
  });
  return g;
}
