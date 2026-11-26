// Dove Mirion Trainer sul telefono chiede i dati (25-11-2026). Vuoto: allo stesso server che serve la pagina, cioè Mirion sul
// computer del trainer attraverso la porta del telefono (telefono.mjs). La versione pubblicata su GitHub Pages (telefono/crea-web.mjs)
// riscrive questo file con l'indirizzo del backend online, che risponde alle stesse strade: GET /api/clienti, GET /api/clienti/uno?id=
// e POST /api/clienti (azioni «messaggio» e «scheda»). Senza «/» in fondo.
export const BASE_API = ''
// ONLINE (26-11-2026 sera): la web app di Mirion Trainer su GitHub Pages, senza il computer; i dati da Mirion Fit online
// (trainer-online.js). telefono/crea-trainer-web.mjs lo mette a true nella copia che pubblica.
export const ONLINE = false
