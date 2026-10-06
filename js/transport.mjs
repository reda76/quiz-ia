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
const CLE = "quiz-ia-local";
const HORODATAGE_LOCAL = { ".sv": "timestamp" };

function lireTout() {
  try { return JSON.parse(localStorage.getItem(CLE) || "{}"); } catch { return {}; }
}
const morceaux = (chemin) => chemin.split("/").filter(Boolean);
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

function transportLocal() {
  const canal = new BroadcastChannel(CLE);
  const auditeurs = new Set();
  const notifier = () => { const tout = lireTout(); for (const a of auditeurs) a(tout); };
  canal.onmessage = notifier;
  const ecrireTout = (modif) => {
    const tout = lireTout();
    modif(tout);
    localStorage.setItem(CLE, JSON.stringify(tout));
    canal.postMessage("change");
    queueMicrotask(notifier);
  };
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
    ecrire: async (chemin, valeur) => ecrireTout((t) => poser(t, chemin, remplacerHorodatages(structuredClone(valeur)))),
    maj: async (chemin, objet) => ecrireTout((t) => { for (const [k, v] of Object.entries(objet)) poser(t, `${chemin}/${k}`, remplacerHorodatages(structuredClone(v))); }),
    lire: async (chemin) => obtenir(lireTout(), chemin),
  };
}
