// La SYNCHRONISATION entre l'écran d'animation et les téléphones, derrière une interface unique :
//   init() → { uid } · ecouter(chemin, rappel) → arrêter · ecrire(chemin, valeur)
//   maj(chemin, objet) · lire(chemin) · HORODATAGE (heure du serveur à l'écriture)
//
// Deux réalisations :
//   • Firebase Realtime Database (le vrai jeu, sur GitHub Pages) — `config.mjs` ;
//   • LOCALE (`?local=1`) : plusieurs onglets du même navigateur partagent l'état par
//     localStorage + BroadcastChannel. Pour essayer et tester sans compte Firebase.

import { FIREBASE_CONFIG } from "./config.mjs";

const VERSION_SDK = "10.12.2";

export function modeLocal() {
  return new URLSearchParams(location.search).has("local") || !FIREBASE_CONFIG?.databaseURL;
}

export async function creerTransport() {
  return modeLocal() ? transportLocal() : transportFirebase();
}

// ─── Firebase ────────────────────────────────────────────────────────────────
async function transportFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${VERSION_SDK}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const { getAuth, signInAnonymously, onAuthStateChanged } = await import(`${base}/firebase-auth.js`);
  const db = await import(`${base}/firebase-database.js`);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const base_ = db.getDatabase(app);
  const uid = await new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (u) => { if (u) { stop(); resolve(u.uid); } });
    signInAnonymously(auth).catch(reject);
  });
  let decalage = 0;
  db.onValue(db.ref(base_, ".info/serverTimeOffset"), (s) => { decalage = s.val() || 0; });
  return {
    uid,
    local: false,
    HORODATAGE: db.serverTimestamp(),
    maintenant: () => Date.now() + decalage,
    ecouter: (chemin, rappel) => db.onValue(db.ref(base_, chemin), (s) => rappel(s.val())),
    ecrire: (chemin, valeur) => db.set(db.ref(base_, chemin), valeur),
    maj: (chemin, objet) => db.update(db.ref(base_, chemin), objet),
    lire: async (chemin) => (await db.get(db.ref(base_, chemin))).val(),
  };
}

// ─── Local (onglets du même navigateur) ─────────────────────────────────────
// Une CASE de localStorage par chemin écrit (« quiz-ia-local:jeux/123456/droites/abc »), et non
// un seul bloc : deux onglets qui écrivent en même temps à des chemins différents (deux joueurs
// qui bougent leur droite) ne s'écrasent plus. Écrire un chemin efface les cases en dessous ;
// on relit l'arbre en posant les cases de la moins profonde à la plus profonde.
const CLE = "quiz-ia-local";
const HORODATAGE_LOCAL = { ".sv": "timestamp" };
const morceaux = (chemin) => chemin.split("/").filter(Boolean);

function cases() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(`${CLE}:`)) out.push(k.slice(CLE.length + 1));
  }
  return out;
}
function lireTout() {
  const racine = {};
  for (const c of cases().sort((a, b) => morceaux(a).length - morceaux(b).length)) {
    try { poser(racine, c, JSON.parse(localStorage.getItem(`${CLE}:${c}`))); } catch { /* case illisible : ignorée */ }
  }
  return racine;
}
function obtenir(racine, chemin) {
  let n = racine;
  for (const m of morceaux(chemin)) { if (n == null || typeof n !== "object") return null; n = n[m]; }
  return n ?? null;
}
function remplacerHorodatages(v) {
  if (v && typeof v === "object") {
    if (v[".sv"] === "timestamp") return Date.now();
    for (const k of Object.keys(v)) v[k] = remplacerHorodatages(v[k]);
  }
  return v;
}
function poser(racine, chemin, valeur) {
  const ms = morceaux(chemin);
  let n = racine;
  ms.slice(0, -1).forEach((m) => { if (n[m] == null || typeof n[m] !== "object") n[m] = {}; n = n[m]; });
  if (valeur === null) delete n[ms.at(-1)]; else n[ms.at(-1)] = valeur;
}
function ecrireCase(chemin, valeur) {
  const c = morceaux(chemin).join("/");
  for (const k of cases()) if (k === c || k.startsWith(`${c}/`)) localStorage.removeItem(`${CLE}:${k}`);
  if (valeur !== null && valeur !== undefined) localStorage.setItem(`${CLE}:${c}`, JSON.stringify(valeur));
}

function transportLocal() {
  const canal = new BroadcastChannel(CLE);
  const auditeurs = new Set();
  const notifier = () => { const tout = lireTout(); for (const a of auditeurs) a(tout); };
  // Le message peut arriver AVANT que les cases écrites par l'autre onglet soient visibles
  // ici : on relit aussitôt, puis encore un peu plus tard.
  canal.onmessage = () => { notifier(); setTimeout(notifier, 120); setTimeout(notifier, 600); };
  // Pas d'écoute de l'événement « storage » : il arrive case par case, PENDANT une écriture, et
  // montrerait aux autres onglets des états intermédiaires (une phase périmée, par exemple).
  const apres = () => { canal.postMessage("change"); queueMicrotask(notifier); };
  let uid = sessionStorage.getItem(`${CLE}-uid`);
  if (!uid) { uid = `local-${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem(`${CLE}-uid`, uid); }
  return {
    uid,
    local: true,
    HORODATAGE: HORODATAGE_LOCAL,
    maintenant: () => Date.now(),
    ecouter(chemin, rappel) {
      let dernier;
      const a = (tout) => { const v = JSON.stringify(obtenir(tout, chemin)); if (v !== dernier) { dernier = v; rappel(JSON.parse(v ?? "null")); } };
      auditeurs.add(a);
      a(lireTout());
      return () => auditeurs.delete(a);
    },
    ecrire: async (chemin, valeur) => { ecrireCase(chemin, remplacerHorodatages(structuredClone(valeur))); apres(); },
    maj: async (chemin, objet) => {
      for (const [k, v] of Object.entries(objet)) ecrireCase(`${chemin}/${k}`, remplacerHorodatages(structuredClone(v)));
      apres();
    },
    lire: async (chemin) => obtenir(lireTout(), chemin),
  };
}
