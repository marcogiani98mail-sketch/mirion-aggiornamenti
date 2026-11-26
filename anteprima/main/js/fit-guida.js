// Copia di Mirion Fit (Piatto, public/guida.js), per la card «Allenamento» di Mirion sul computer: le due vanno tenute uguali.
// La guida animata di un esercizio (Marco, 26-11-2026: «fammi un'animazione specifica per un allenamento di un esercizio stile
// app»). Una figura vista di lato fa il movimento al ritmo giusto, conta le ripetizioni, segna le serie e fa partire il recupero
// con il conto alla rovescia. A fine esercizio le serie fatte tornano nel foglio, pronte da segnare.
// Premium (Marco, 26-11-2026 sera: «miglioriamo le animazioni più premium», scelta «la nostra figura, resa premium»): il corpo ha
// volume (arti affusolati con la luce), il lato lontano è più scuro (profondità), il muscolo che lavora si accende mentre spinge,
// una scia leggera segue il movimento, l'ombra a terra si sposta con il peso; ogni esercizio ha il suo attrezzo (bilanciere, manubri,
// kettlebell, panca, sbarra) e le sue frasi. Tutto disegnato qui (SVG), niente immagini di altri: nessuna licenza da rispettare.
// Le pose dicono dove stanno le anche, l'angolo del busto, i piedi e le mani: ginocchia e gomiti li trova la cinematica inversa,
// così le ossa restano della stessa lunghezza e i piedi restano a terra.

const rad = (g) => (g * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const morbido = (t) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;
const NS_ID = 'g2'; // i gradienti della figura (uguali in ogni svg della pagina)

// le ossa (le stesse per tutti gli esercizi)
const L = { coscia: 48, stinco: 46, busto: 58, braccio: 28, avambraccio: 25, collo: 23 };
const verso = (p, ang, lung) => ({ x: p.x + lung * Math.sin(rad(ang)), y: p.y - lung * Math.cos(rad(ang)) });

// —— Gli esercizi ——
// Una posa: anca [x, y]; busto in gradi (0 = in su, 90 = in avanti: la figura guarda a destra); piedi [vicino, lontano] (caviglie);
// mani: [x, y], { b: [lungo il busto, in avanti] } dalla spalla, o { ang: gradi } col braccio teso. a = la posa di partenza, b = l'altra.
// lati: da che parte si piegano ginocchia e gomiti (-1 o 1). ritmo: [fase, secondi, frase]; la «spinta» è la fase che fa fatica.
const PIEDI = [[100, 193]];
const RITMO_SCENDI = (giu, fermo, su, respira) => [['va', 2, giu], ['fermo-la', 0.4, fermo], ['torna', 1, su], ['fermo-qui', 0.6, respira]];
const RITMO_TIRA = (va, fermo, torna, respira) => [['va', 1, va], ['fermo-la', 0.4, fermo], ['torna', 2, torna], ['fermo-qui', 0.6, respira]];
const accosciata = (anca, busto, mani, attrezzo, extra = {}) => ({
  a: { anca: [96, 101], busto: 4, piedi: PIEDI, mani }, b: { anca, busto, piedi: PIEDI, mani }, attrezzo, parallelo: true,
  ritmo: RITMO_SCENDI('Scendi piano', 'Cosce parallele', 'Spingi su', 'Respira'), spinta: 'torna', lavora: ['coscia', 'glutei'], ...extra,
});

export const MOVIMENTI = {
  'es:squat': { ...accosciata([72, 147], 45, { b: [-3, -9] }, 'bilanciere', { lati: { braccio: -1 } }), muscoli: 'Lavorano quadricipiti e glutei' },
  'es:front-squat': { ...accosciata([78, 149], 22, { b: [-2, 9] }, 'bilanciere', { lati: { braccio: -1 } }), muscoli: 'Lavorano soprattutto i quadricipiti' },
  'es:goblet-squat': { ...accosciata([76, 149], 28, { b: [-15, 13] }, 'goblet', { lati: { braccio: 1 } }), muscoli: 'Lavorano quadricipiti e glutei' },
  'es:affondi': {
    a: { anca: [88, 106], busto: 3, piedi: [[122, 193], [52, 190]], mani: { b: [-50, 2] } }, b: { anca: [86, 143], busto: 3, piedi: [[122, 193], [52, 190]], mani: { b: [-50, 2] } },
    attrezzo: 'manubri', ritmo: RITMO_SCENDI('Scendi dritto', 'Ginocchio vicino a terra', 'Spingi col tallone', 'Respira'), spinta: 'torna', lavora: ['coscia', 'glutei'], muscoli: 'Lavorano quadricipiti e glutei della gamba davanti',
  },
  'es:bulgaro': {
    a: { anca: [98, 108], busto: 8, piedi: [[124, 193], [44, 148]], mani: { b: [-50, 2] } }, b: { anca: [92, 142], busto: 14, piedi: [[124, 193], [44, 148]], mani: { b: [-50, 2] } },
    attrezzo: 'manubri', panca: 'bassa', ritmo: RITMO_SCENDI('Scendi piano', 'Coscia parallela', 'Spingi su', 'Respira'), spinta: 'torna', lavora: ['coscia', 'glutei'], muscoli: 'Lavorano quadricipiti e glutei della gamba davanti',
  },
  'es:stacco': {
    a: { anca: [58, 160], busto: 60, piedi: PIEDI, mani: [106, 184] }, b: { anca: [94, 103], busto: 0, piedi: PIEDI, mani: [99, 97] },
    attrezzo: 'bilanciere', ritmo: [['va', 1.2, 'Spingi il pavimento'], ['fermo-la', 0.6, 'Stringi i glutei'], ['torna', 1.6, 'Giù controllato'], ['fermo-qui', 0.6, 'Schiena dritta']], spinta: 'va', lavora: ['glutei', 'coscia', 'busto'], muscoli: 'Lavorano glutei, femorali e schiena',
  },
  'es:stacco-rumeno': {
    a: { anca: [94, 103], busto: 0, piedi: PIEDI, mani: [99, 97] }, b: { anca: [80, 106], busto: 75, piedi: PIEDI, mani: [112, 137] },
    attrezzo: 'bilanciere', ritmo: RITMO_SCENDI('Anche indietro', 'Senti i femorali', 'Spingi le anche avanti', 'Respira'), spinta: 'torna', lavora: ['glutei', 'coscia'], muscoli: 'Lavorano femorali e glutei',
  },
  'es:hip-thrust': {
    a: { anca: [88, 178], busto: 300, piedi: [[130, 193]], mani: { b: [-10, 4] } }, b: { anca: [95, 139], busto: 260, piedi: [[130, 193]], mani: { b: [-10, 4] } },
    attrezzo: 'bilanciere-anche', panca: 'dietro', ritmo: RITMO_TIRA('Spingi le anche su', 'Stringi i glutei', 'Giù piano', 'Respira'), spinta: 'va', lavora: ['glutei'], lati: { braccio: 1 }, muscoli: 'Lavorano i glutei',
  },
  'es:panca': {
    a: { anca: [70, 144], busto: 90, piedi: [[50, 193]], mani: [126, 92] }, b: { anca: [70, 144], busto: 90, piedi: [[50, 193]], mani: [121, 126] },
    attrezzo: 'bilanciere', panca: 'piana', ritmo: RITMO_SCENDI('Giù al petto', 'Tocca', 'Spingi', 'Braccia tese'), spinta: 'torna', lavora: ['alto', 'braccio'], lati: { gamba: 1, braccio: -1 }, muscoli: 'Lavorano petto, spalle e tricipiti',
  },
  'es:piegamenti': {
    a: { anca: [111, 161], busto: 72, piedi: [[22, 190]], mani: [166, 196] }, b: { anca: [116, 183], busto: 86, piedi: [[22, 190]], mani: [166, 196] },
    ritmo: RITMO_SCENDI('Giù tutto insieme', 'Petto vicino a terra', 'Spingi', 'Corpo dritto'), spinta: 'torna', lavora: ['alto', 'braccio'], lati: { braccio: 1 }, muscoli: 'Lavorano petto e tricipiti',
  },
  'es:military': {
    a: { anca: [98, 101], busto: 2, piedi: PIEDI, mani: { b: [-2, 11] } }, b: { anca: [98, 101], busto: -3, piedi: PIEDI, mani: [98, -9] },
    attrezzo: 'bilanciere', ritmo: RITMO_TIRA('Spingi su', 'Braccia tese', 'Giù piano', 'Addome stretto'), spinta: 'va', lavora: ['braccio', 'alto'], lati: { braccio: 1 }, muscoli: 'Lavorano spalle e tricipiti',
  },
  'es:curl': {
    a: { anca: [98, 101], busto: 0, piedi: PIEDI, mani: { b: [-52, 3] } }, b: { anca: [98, 101], busto: 0, piedi: PIEDI, mani: [108, 47] },
    attrezzo: 'manubri', ritmo: RITMO_TIRA('Piega', 'Stringi', 'Scendi piano', 'Gomiti fermi'), spinta: 'va', lavora: ['braccio'], lati: { braccio: 1 }, muscoli: 'Lavorano i bicipiti',
  },
  'es:rematore-bilanciere': {
    a: { anca: [78, 110], busto: 70, piedi: PIEDI, mani: [128, 142] }, b: { anca: [78, 110], busto: 70, piedi: PIEDI, mani: [106, 118] },
    attrezzo: 'bilanciere', ritmo: RITMO_TIRA('Tira alla pancia', 'Scapole strette', 'Giù piano', 'Schiena dritta'), spinta: 'va', lavora: ['busto', 'braccio'], lati: { braccio: 1 }, muscoli: 'Lavorano dorsali e bicipiti',
  },
  'es:trazioni': {
    a: { anca: [98, 131], busto: 0, piedi: [[90, 212], [86, 210]], mani: [100, 20] }, b: { anca: [96, 88], busto: 4, piedi: [[88, 170], [84, 168]], mani: [100, 20] },
    sbarra: true, ritmo: RITMO_TIRA('Tira su', 'Mento sopra la sbarra', 'Scendi piano', 'Braccia tese'), spinta: 'va', lavora: ['busto', 'braccio'], lati: { braccio: 1, gamba: -1 }, muscoli: 'Lavorano dorsali e bicipiti',
  },
  'es:kettlebell-swing': {
    a: { anca: [74, 120], busto: 72, piedi: PIEDI, mani: { ang: 200 } }, b: { anca: [96, 101], busto: -2, piedi: PIEDI, mani: { ang: 92 } },
    attrezzo: 'kettlebell', ritmo: [['va', 0.6, 'Anche avanti!'], ['fermo-la', 0.3, 'Su all’altezza del petto'], ['torna', 0.7, 'Lascia scendere'], ['fermo-qui', 0.2, 'Carica']], spinta: 'va', lavora: ['glutei', 'coscia'], muscoli: 'Lavorano glutei e femorali',
  },
  'es:calf': {
    a: { anca: [98, 101], busto: 0, piedi: PIEDI, mani: { b: [-50, 2] } }, b: { anca: [98, 92], busto: 0, piedi: [[100, 184]], mani: { b: [-50, 2] } },
    attrezzo: 'manubri', ritmo: RITMO_TIRA('Sulle punte', 'Tieni', 'Scendi piano', 'Tallone giù'), spinta: 'va', lavora: ['stinco'], muscoli: 'Lavorano i polpacci',
  },
  'es:crunch': {
    a: { anca: [90, 190], busto: 268, piedi: [[140, 193]], mani: { b: [8, 7] } }, b: { anca: [90, 190], busto: 302, piedi: [[140, 193]], mani: { b: [8, 7] } },
    ritmo: RITMO_TIRA('Arrotola su', 'Stringi l’addome', 'Giù piano', 'Respira'), spinta: 'va', lavora: ['busto'], lati: { braccio: -1 }, muscoli: 'Lavora l’addome',
  },
};
MOVIMENTI['es:front-squat'].ritmo = MOVIMENTI['es:squat'].ritmo;
MOVIMENTI['es:curl-martello'] = { ...MOVIMENTI['es:curl'], muscoli: 'Lavorano bicipiti e avambracci' };
MOVIMENTI['es:curl-bilanciere'] = { ...MOVIMENTI['es:curl'], attrezzo: 'bilanciere' };
MOVIMENTI['es:panca-manubri'] = { ...MOVIMENTI['es:panca'], attrezzo: 'manubri' };
MOVIMENTI['es:trap-bar'] = { ...MOVIMENTI['es:stacco'], muscoli: 'Lavorano quadricipiti, glutei e schiena' };
export const haGuida = (id) => Boolean(MOVIMENTI[id]);

// —— La posa a un istante: t = 0 la posa a, t = 1 la posa b ——
function ik(a, b, l1, l2, lato) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy)));
  const fi = Math.atan2(dy, dx), al = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const g = { x: a.x + l1 * Math.cos(fi + lato * al), y: a.y + l1 * Math.sin(fi + lato * al) };
  // la punta: arriva dove può (se il bersaglio è troppo lontano il braccio resta teso verso di lui)
  const fi2 = Math.atan2(b.y - g.y, b.x - g.x);
  return [g, { x: g.x + l2 * Math.cos(fi2), y: g.y + l2 * Math.sin(fi2) }];
}
const mix = (x, y, t) => Array.isArray(x) ? x.map((v, i) => mix(v, y[i] ?? v, t)) : typeof x === 'object' && x ? Object.fromEntries(Object.keys(x).map((k) => [k, mix(x[k], y?.[k] ?? x[k], t)])) : typeof x === 'number' ? lerp(x, y ?? x, t) : x;
function posa(m, t) {
  const p = mix(m.a, m.b, t), lati = { gamba: -1, braccio: 1, ...(m.lati || {}) };
  const anca = { x: p.anca[0], y: p.anca[1] }, spalla = verso(anca, p.busto, L.busto), testa = verso(spalla, p.busto - 4, L.collo);
  const u = { x: Math.sin(rad(p.busto)), y: -Math.cos(rad(p.busto)) }, n = { x: Math.sin(rad(p.busto + 90)), y: -Math.cos(rad(p.busto + 90)) };
  const dove = (x) => Array.isArray(x) ? { x: x[0], y: x[1] } : x.b ? { x: spalla.x + u.x * x.b[0] + n.x * x.b[1], y: spalla.y + u.y * x.b[0] + n.y * x.b[1] } : verso(spalla, x.ang, L.braccio + L.avambraccio);
  const caviglie = [p.piedi[0], p.piedi[1] ?? [p.piedi[0][0] - 5, p.piedi[0][1]]].map(([x, y]) => ({ x, y }));
  const gambe = caviglie.map((c) => ik(anca, c, L.coscia, L.stinco, lati.gamba));
  // le mani: se le due pose le dicono nello stesso modo si mescolano i numeri; se no si va in linea retta da un punto all'altro
  const tipo = (x) => Array.isArray(x) ? 'punto' : x.b ? 'b' : 'ang';
  let mano;
  if (tipo(m.a.mani) === tipo(m.b.mani)) mano = dove(p.mani);
  else { const qa = t < 1 ? posa({ ...m, b: m.a }, 0).mani[0] : null, qb = t > 0 ? posa({ ...m, a: m.b }, 0).mani[0] : null; mano = !qa ? qb : !qb ? qa : { x: lerp(qa.x, qb.x, t), y: lerp(qa.y, qb.y, t) }; }
  const mani = [mano, { x: mano.x - 4, y: mano.y }];
  const braccia = mani.map((h) => ik(spalla, h, L.braccio, L.avambraccio, lati.braccio));
  return { anca, spalla, testa, u, n, ginocchia: gambe.map((g) => g[0]), caviglie: gambe.map((g) => g[1]), gomiti: braccia.map((b) => b[0]), mani: braccia.map((b) => b[1]), peso: braccia[0][1], busto: p.busto };
}

// —— Il disegno ——
// un osso con volume: due cerchi uniti dalle tangenti (più largo da una parte)
function capsula(a, b, ra, rb) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const f = (v) => v.toFixed(1);
  return `M${f(a.x + nx * ra)} ${f(a.y + ny * ra)}L${f(b.x + nx * rb)} ${f(b.y + ny * rb)}A${rb} ${rb} 0 0 0 ${f(b.x - nx * rb)} ${f(b.y - ny * rb)}L${f(a.x - nx * ra)} ${f(a.y - ny * ra)}A${ra} ${ra} 0 0 0 ${f(a.x + nx * ra)} ${f(a.y + ny * ra)}Z`;
}
const piede = (c) => capsula({ x: c.x - 4, y: Math.min(196, c.y + 3) }, { x: c.x + 12, y: 197 }, 3.6, 2.6);
function corpo(p, lavora, cl) {
  // i pezzi: [nome, path, lato] (lato 1 = lontano, più scuro, sotto)
  const pezzi = [];
  for (const i of [1, 0]) {
    pezzi.push(['stinco', capsula(p.ginocchia[i], p.caviglie[i], 7, 4.5), i], ['piede', piede(p.caviglie[i]), i], ['coscia', capsula(p.anca, p.ginocchia[i], 10.5, 7), i]);
    if (i === 1) pezzi.push(['braccio', capsula(p.spalla, p.gomiti[1], 6, 4.5), 1], ['avambraccio', capsula(p.gomiti[1], p.mani[1], 4.5, 3.4), 1]);
  }
  const petto = { x: p.spalla.x - p.u.x * 18, y: p.spalla.y - p.u.y * 18 };
  pezzi.push(['busto', capsula(p.anca, p.spalla, 10, 11.5), 0], ['alto', capsula(petto, p.spalla, 10.5, 11.5), 0], ['glutei', capsula({ x: p.anca.x - p.n.x * 2, y: p.anca.y - p.n.y * 2 }, { x: p.anca.x - p.n.x * 3 - p.u.x * 4, y: p.anca.y - p.n.y * 3 - p.u.y * 4 }, 9.5, 8), 0],
    ['collo', capsula(p.spalla, { x: lerp(p.spalla.x, p.testa.x, 0.6), y: lerp(p.spalla.y, p.testa.y, 0.6) }, 4.5, 4), 0],
    ['braccio', capsula(p.spalla, p.gomiti[0], 6.5, 4.8), 0], ['avambraccio', capsula(p.gomiti[0], p.mani[0], 4.8, 3.6), 0]);
  const accesi = new Set(lavora.chi);
  return pezzi.map(([nome, d, lato]) => `<path class="g-pezzo ${cl} ${lato ? 'lontano' : 'vicino'}" d="${d}" fill="url(#${NS_ID}-${lato ? 'lontano' : nome === 'alto' || nome === 'glutei' ? 'nulla' : 'corpo'})"/>` +
    (accesi.has(nome) ? `<path class="g-lavora" d="${d}" fill="url(#${NS_ID}-lavora)" style="opacity:${(lato ? 0.35 : 1) * (0.25 + 0.75 * lavora.quanto)}"/>` : '')).join('') +
    `<circle class="g-testa ${cl}" cx="${p.testa.x.toFixed(1)}" cy="${p.testa.y.toFixed(1)}" r="9.5" fill="url(#${NS_ID}-testa)"/>` +
    p.mani.map((h, i) => `<circle class="g-mano ${i ? 'lontano' : ''}" cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="3.8" fill="url(#${NS_ID}-${i ? 'lontano' : 'corpo'})"/>`).join('');
}
function attrezzo(m, p) {
  const f = (v) => v.toFixed(1), h = p.peso;
  if (m.attrezzo === 'bilanciere' || m.attrezzo === 'bilanciere-anche') {
    const c = m.attrezzo === 'bilanciere-anche' ? { x: p.anca.x - p.n.x * 4 + p.u.x * 9, y: p.anca.y - p.n.y * 4 + p.u.y * 9 - 4 } : h;
    return `<g class="g-disco"><circle cx="${f(c.x)}" cy="${f(c.y)}" r="14.5" fill="url(#${NS_ID}-disco)"/><circle cx="${f(c.x)}" cy="${f(c.y)}" r="13" fill="none" stroke="url(#${NS_ID}-lavora)" stroke-width="1.6" opacity=".9"/><circle cx="${f(c.x)}" cy="${f(c.y)}" r="8.5" fill="none" stroke="rgb(255 255 255 / 12%)" stroke-width="1"/><circle cx="${f(c.x)}" cy="${f(c.y)}" r="3" fill="#e9e3f5"/><path d="M${f(c.x - 9)} ${f(c.y - 8)}A12 12 0 0 1 ${f(c.x + 6)} ${f(c.y - 11)}" stroke="rgb(255 255 255 / 35%)" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
  }
  if (m.attrezzo === 'manubri') return p.mani.map((x, i) => `<g class="g-manubrio ${i ? 'lontano' : ''}"><rect x="${f(x.x - 7)}" y="${f(x.y - 2)}" width="14" height="4" rx="2" fill="#bfb6d1"/><rect x="${f(x.x - 9)}" y="${f(x.y - 6)}" width="5" height="12" rx="2" fill="url(#${NS_ID}-disco)" stroke="url(#${NS_ID}-lavora)" stroke-width=".8"/><rect x="${f(x.x + 4)}" y="${f(x.y - 6)}" width="5" height="12" rx="2" fill="url(#${NS_ID}-disco)" stroke="url(#${NS_ID}-lavora)" stroke-width=".8"/></g>`).reverse().join('');
  if (m.attrezzo === 'goblet') return `<g class="g-manubrio"><rect x="${f(h.x - 2)}" y="${f(h.y - 9)}" width="4" height="18" rx="2" fill="#bfb6d1"/><rect x="${f(h.x - 7)}" y="${f(h.y - 13)}" width="14" height="6" rx="2.5" fill="url(#${NS_ID}-disco)" stroke="url(#${NS_ID}-lavora)" stroke-width=".9"/><rect x="${f(h.x - 7)}" y="${f(h.y + 7)}" width="14" height="6" rx="2.5" fill="url(#${NS_ID}-disco)" stroke="url(#${NS_ID}-lavora)" stroke-width=".9"/></g>`;
  if (m.attrezzo === 'kettlebell') return `<g class="g-kb"><path d="M${f(h.x - 5)} ${f(h.y + 4)}Q${f(h.x)} ${f(h.y - 4)} ${f(h.x + 5)} ${f(h.y + 4)}" stroke="#bfb6d1" stroke-width="2.4" fill="none"/><circle cx="${f(h.x)}" cy="${f(h.y + 11)}" r="8.5" fill="url(#${NS_ID}-disco)" stroke="url(#${NS_ID}-lavora)" stroke-width="1.2"/></g>`;
  return '';
}
function scena(m) {
  let s = '';
  if (m.panca === 'piana') s += `<rect class="g-panca" x="26" y="152" width="130" height="8" rx="4"/><rect class="g-panca-gamba" x="40" y="160" width="5" height="39"/><rect class="g-panca-gamba" x="134" y="160" width="5" height="39"/>`;
  if (m.panca === 'dietro') s += `<rect class="g-panca" x="0" y="151" width="62" height="8" rx="4"/><rect class="g-panca-gamba" x="14" y="159" width="5" height="40"/><rect class="g-panca-gamba" x="48" y="159" width="5" height="40"/>`;
  if (m.panca === 'bassa') s += `<rect class="g-panca" x="14" y="150" width="50" height="8" rx="4"/><rect class="g-panca-gamba" x="24" y="158" width="5" height="41"/><rect class="g-panca-gamba" x="52" y="158" width="5" height="41"/>`;
  if (m.sbarra) s += `<line class="g-sbarra" x1="56" x2="146" y1="20" y2="20"/><line class="g-panca-gamba-l" x1="58" x2="58" y1="20" y2="-30"/><line class="g-panca-gamba-l" x1="144" x2="144" y1="20" y2="-30"/>`;
  return s;
}
// il riquadro che contiene tutto il movimento, con le proporzioni dello spazio (200 × 210)
function riquadro(m) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i <= 10; i++) {
    const p = posa(m, i / 10);
    for (const q of [p.anca, p.spalla, ...p.ginocchia, ...p.caviglie, ...p.gomiti, ...p.mani]) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    y0 = Math.min(y0, p.testa.y - 12); x0 = Math.min(x0, p.testa.x - 12); x1 = Math.max(x1, p.testa.x + 12);
  }
  if (!m.sbarra) y1 = Math.max(y1, 203); else y0 = Math.min(y0, 12);
  const pad = 16, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2, scala = Math.max(w / 200, h / 210), W = 200 * scala, H = 210 * scala;
  return [(x0 + x1) / 2 - W / 2, Math.max(y1 + pad - H, (y0 + y1) / 2 - H / 2), W, H].map((v) => +v.toFixed(1));
}
const viste = new Map();
const vista = (m) => { if (!viste.has(m)) viste.set(m, riquadro(m)); return viste.get(m); };

function figuraSvg(grande, m) {
  const [x, y, w, h] = vista(m);
  return `<svg class="guida-svg${grande ? ' grande' : ''}" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="La figura che fa il movimento">
    <defs>
      <linearGradient id="${NS_ID}-corpo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2d2ff"/><stop offset=".45" stop-color="#b48cff"/><stop offset="1" stop-color="#7d4dff"/></linearGradient>
      <linearGradient id="${NS_ID}-nulla" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9c6ff"/><stop offset="1" stop-color="#8f5fff"/></linearGradient>
      <linearGradient id="${NS_ID}-lontano" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5bc4"/><stop offset="1" stop-color="#3f2a7d"/></linearGradient>
      <radialGradient id="${NS_ID}-testa" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#f1e8ff"/><stop offset=".5" stop-color="#b993ff"/><stop offset="1" stop-color="#7448f0"/></radialGradient>
      <linearGradient id="${NS_ID}-lavora" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc06b"/><stop offset=".5" stop-color="#ff8a6b"/><stop offset="1" stop-color="#ff5d8f"/></linearGradient>
      <radialGradient id="${NS_ID}-disco" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#4a3c6b"/><stop offset=".6" stop-color="#241b3a"/><stop offset="1" stop-color="#120d20"/></radialGradient>
      <radialGradient id="${NS_ID}-alone" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9d6bff" stop-opacity=".32"/><stop offset=".6" stop-color="#ff8a6b" stop-opacity=".06"/><stop offset="1" stop-color="#9d6bff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${NS_ID}-ombra" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <linearGradient id="${NS_ID}-terra" x1="0" x2="1"><stop offset="0" stop-color="#9d6bff" stop-opacity="0"/><stop offset=".5" stop-color="#9d6bff" stop-opacity=".55"/><stop offset="1" stop-color="#9d6bff" stop-opacity="0"/></linearGradient>
      <filter id="${NS_ID}-luce" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle class="g-alone" cx="${(x + w / 2).toFixed(1)}" cy="${(y + h * 0.58).toFixed(1)}" r="${(Math.min(w, h) * 0.46).toFixed(1)}" fill="url(#${NS_ID}-alone)"/>
    ${m.sbarra ? '' : `<ellipse class="g-ombra" cx="100" cy="199" rx="44" ry="5" fill="url(#${NS_ID}-ombra)"/>`}
    ${m.sbarra ? '' : `<line class="g-terra" x1="${x}" x2="${x + w}" y1="199" y2="199" stroke="url(#${NS_ID}-terra)"/>`}
    ${m.parallelo ? '<line class="g-parallelo" x1="20" x2="180" y1="0" y2="0" /><text class="g-parallelo-t" x="22" y="0">parallelo</text>' : ''}
    <g class="g-scena">${scena(m)}</g>
    <g class="g-scia" aria-hidden="true"></g>
    <g class="g-fig"></g>
  </svg>`;
}

function disegna(svg, m, t, lavora, scia = null) {
  const p = posa(m, t), $ = (s) => svg.querySelector(s);
  const quanto = { chi: m.lavora || [], quanto: lavora };
  $('.g-fig').innerHTML = corpo(p, quanto, '') + attrezzo(m, p);
  // la scia: la posa di un attimo fa, trasparente, solo mentre si muove
  const sc = $('.g-scia');
  if (scia !== null && Math.abs(scia - t) > 0.02) { sc.innerHTML = corpo(posa(m, scia), { chi: [], quanto: 0 }, 'scia'); sc.style.opacity = String(Math.min(0.22, Math.abs(scia - t) * 2.2)); }
  else if (sc.innerHTML) sc.innerHTML = '';
  // l'ombra segue il peso del corpo
  const om = $('.g-ombra') || document.createElementNS('http://www.w3.org/2000/svg', 'ellipse'), cx = (p.anca.x + p.caviglie[0].x + p.spalla.x) / 3, alto = Math.max(0, 199 - Math.max(p.caviglie[0].y, p.anca.y));
  om.setAttribute('cx', cx.toFixed(1)); om.setAttribute('rx', (40 + Math.abs(p.spalla.x - p.caviglie[0].x) * 0.3).toFixed(1)); om.style.opacity = String(Math.max(0.35, 1 - alto / 120));
  if (m.parallelo) {
    const giu = posa(m, 1).ginocchia[0].y, arrivato = t > 0.94;
    for (const s of ['.g-parallelo']) { $(s).setAttribute('y1', giu); $(s).setAttribute('y2', giu); $(s).classList.toggle('preso', arrivato); }
    $('.g-parallelo-t').setAttribute('y', giu - 4); $('.g-parallelo-t').classList.toggle('preso', arrivato);
  }
}

// dove si è dentro una ripetizione, dal tempo (secondi) passato: la posa (0-1), la frase da leggere, quanto lavora il muscolo
const durata = (m) => (m.ritmo || []).reduce((s, r) => s + r[1], 0);
function momento(m, sec) {
  const ritmo = m.ritmo, D = durata(m);
  let x = ((sec % D) + D) % D;
  for (const [fase, d, frase] of ritmo) {
    if (x < d) {
      const f = x / d, spinge = fase === m.spinta;
      if (fase === 'va') return { t: morbido(f), frase, fase, resta: d - x, lavora: spinge ? 0.6 + 0.4 * f : 0.35 };
      if (fase === 'fermo-la') return { t: 1, frase, fase, resta: d - x, lavora: 0.85 };
      if (fase === 'torna') return { t: 1 - morbido(f), frase, fase, resta: d - x, lavora: spinge ? 1 : 0.35 };
      return { t: 0, frase, fase, resta: d - x, lavora: 0.1 };
    }
    x -= d;
  }
  return { t: 0, frase: '', fase: 'fermo-qui', resta: 0, lavora: 0 };
}
const fermo = (m, ora) => 0.03 + 0.02 * Math.sin(ora / 600); // la figura respira, ferma

// —— L'anteprima: la figura che ripete il movimento, nel foglio dell'esercizio ——
export function htmlAnteprima(id) {
  const m = MOVIMENTI[id]; if (!m) return '';
  const lento = m.ritmo.find((r) => r[0] !== m.spinta && (r[0] === 'va' || r[0] === 'torna')), forte = m.ritmo.find((r) => r[0] === m.spinta);
  return `<div class="guida-anteprima" data-guida-anteprima="${id}">${figuraSvg(false, m)}<div class="guida-anteprima-testo"><b data-g-frase>${m.ritmo[0][2]}</b><small class="tenue">${m.muscoli}. ${forte ? `Spinta in ${String(forte[1]).replace('.', ',')} s` : ''}${lento ? `, ritorno in ${String(lento[1]).replace('.', ',')} s` : ''}.</small></div></div>`;
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
    const g = gira(el, (ora) => { const sec = (ora - g.inizio) / 1000, k = momento(m, sec); disegna(svg, m, k.t, k.lavora, momento(m, sec - 0.12).t); if (frase.textContent !== k.frase) frase.textContent = k.frase; });
  }
}

// —— La guida intera: ripetizioni, serie, recupero ——
// opz: { id, nome, serie (quante), rip (per serie), recupero (secondi), kg }; fine(fatte): fatte = ripetizioni di ogni serie
export function htmlGuida(o) {
  return `<div class="guida-es" data-guida>
    <div class="guida-palco">${figuraSvg(true, MOVIMENTI[o.id])}
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
      const sec = (ora - s.inizio - s.tempoFermo) / 1000, k = momento(m, sec);
      disegna(svg, m, k.t, k.lavora, momento(m, sec - 0.12).t);
      const fatte = Math.floor(sec / durata(m));
      if (fatte !== s.ultimaRip) { s.ultimaRip = fatte; s.rip = fatte; q('[data-g-rip]').textContent = String(fatte); if (fatte) vibra(30); }
      const frase = s.rip >= o.rip - 1 && k.fase === m.spinta ? 'Ultima: spingi!' : k.frase;
      if (q('[data-g-frase]').textContent !== frase) q('[data-g-frase]').textContent = frase;
      if (s.rip >= o.rip) chiudiSerie();
    } else if (s.stato === 'riposo') {
      const resta = Math.max(0, (s.riposoFine - ora) / 1000);
      q('[data-g-secondi]').textContent = String(Math.ceil(resta));
      q('[data-g-anello]').style.strokeDashoffset = String(100 - (resta / o.recupero) * 100);
      // la figura respira in piedi
      disegna(svg, m, fermo(m, ora), 0);
      const frase = resta <= 5 ? 'Pronto, si riparte' : 'Recupera: respira e bevi';
      if (q('[data-g-frase]').textContent !== frase) q('[data-g-frase]').textContent = frase;
      if (resta <= 0) { vibra([80, 60, 80]); comincia(ora); }
    } else if (s.stato === 'pronto') {
      disegna(svg, m, fermo(m, ora), 0);
    }
  });
  return g;
}
// per le prove: la posa di un esercizio a un istante, e il disegno fermo
export const _posa = (id, t) => posa(MOVIMENTI[id], t);
export const _prova = (svg, id, t) => disegna(svg, MOVIMENTI[id], t, t, null);
