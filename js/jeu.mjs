// Logique PURE du quiz : points, répartition des réponses, classement. Aucune dépendance au
// navigateur ni à Firebase — testée par `node --test tests/`.

export const POINTS_MAX = 1000;
export const POINTS_MIN_JUSTE = 500;

/**
 * Points d'une réponse : rien si elle est fausse ; juste, entre 500 et 1000 selon la rapidité
 * (1000 si instantanée, 500 au dernier moment).
 */
export function points(juste, delaiMs, dureeMs) {
  if (!juste) return 0;
  const reste = Math.max(0, Math.min(1, 1 - delaiMs / dureeMs));
  return Math.round(POINTS_MIN_JUSTE + (POINTS_MAX - POINTS_MIN_JUSTE) * reste);
}

/** Combien de joueurs ont choisi chaque réponse : [nbA, nbB, …]. */
export function repartition(reponses, nbChoix) {
  const n = new Array(nbChoix).fill(0);
  for (const r of Object.values(reponses || {})) if (Number.isInteger(r?.choix) && r.choix >= 0 && r.choix < nbChoix) n[r.choix]++;
  return n;
}

/**
 * Le classement après une série de questions.
 * @param {Record<string,{prenom:string}>} joueurs
 * @param {Array<{reponses:Record<string,{choix:number,t:number}>, bonne:number, debut:number, dureeMs:number}>} manches
 * @returns {Array<{uid:string, prenom:string, score:number, gain:number, juste:boolean|null, rang:number}>}
 *   `gain` et `juste` portent sur la DERNIÈRE manche (null : pas de réponse).
 */
export function classement(joueurs, manches) {
  const lignes = Object.entries(joueurs || {}).map(([uid, j]) => ({ uid, prenom: j.prenom, score: 0, gain: 0, juste: null }));
  manches.forEach((m, i) => {
    const derniere = i === manches.length - 1;
    for (const l of lignes) {
      const r = m.reponses?.[l.uid];
      const juste = r ? r.choix === m.bonne : null;
      const g = r ? points(juste, Math.max(0, (r.t ?? m.debut) - m.debut), m.dureeMs) : 0;
      l.score += g;
      if (derniere) { l.gain = g; l.juste = juste; }
    }
  });
  lignes.sort((a, b) => b.score - a.score || a.prenom.localeCompare(b.prenom, "fr"));
  // Ex æquo : même rang.
  lignes.forEach((l, i) => { l.rang = i > 0 && l.score === lignes[i - 1].score ? lignes[i - 1].rang : i + 1; });
  return lignes;
}

/** Deux joueurs au même prénom se distinguent à l'écran : « Léa », « Léa (2) ». */
export function prenomsAffiches(joueurs) {
  const vus = new Map();
  const out = {};
  const ordre = Object.entries(joueurs || {}).sort((a, b) => (a[1].rejointLe ?? 0) - (b[1].rejointLe ?? 0));
  for (const [uid, j] of ordre) {
    const cle = j.prenom.trim().toLowerCase();
    const n = (vus.get(cle) || 0) + 1;
    vus.set(cle, n);
    out[uid] = n > 1 ? `${j.prenom} (${n})` : j.prenom;
  }
  return out;
}

/** Prénom saisi → prénom propre (1 à 20 caractères), ou null s'il est vide. */
export function nettoyerPrenom(s) {
  const p = String(s || "").replace(/\s+/g, " ").trim().slice(0, 20);
  return p || null;
}

/** Code de partie à 6 chiffres. */
export function genererCode(aleatoire = Math.random) {
  return String(Math.floor(aleatoire() * 900000) + 100000);
}

/** Questions valides : texte, 2 à 4 choix, une bonne réponse, durée raisonnable. */
export function verifierQuestions(questions) {
  const erreurs = [];
  questions.forEach((q, i) => {
    if (!q.texte) erreurs.push(`question ${i + 1} : texte manquant`);
    if (!Array.isArray(q.choix) || q.choix.length < 2 || q.choix.length > 4) erreurs.push(`question ${i + 1} : 2 à 4 choix`);
    if (!Number.isInteger(q.bonne) || q.bonne < 0 || q.bonne >= (q.choix?.length || 0)) erreurs.push(`question ${i + 1} : bonne réponse invalide`);
    if (q.duree !== undefined && !(q.duree >= 5 && q.duree <= 120)) erreurs.push(`question ${i + 1} : durée entre 5 et 120 s`);
  });
  return erreurs;
}
