// « LA SALLE EST UN CHATGPT » — logique PURE. La salle propose le mot suivant d'une phrase ;
// les propositions deviennent des probabilités ; on tire un mot comme le fait un modèle de
// langage (au hasard selon les probabilités, ou toujours le plus probable), et on recommence.
// Cours 6.4 : un immense réseau entraîné à deviner le mot suivant.

export const FIN = "⏹"; // proposition spéciale : « la phrase est finie »
export const MOT_MAX = 24;

export const DEBUTS = [
  "Le machine learning, c'est",
  "Demain, l'intelligence artificielle va",
  "Pour réussir ses partiels, il faut",
  "Le prof d'IA est",
  "Un modèle apprend quand",
];

/**
 * Un mot proposé, nettoyé : un seul mot (lettres, chiffres, apostrophe, trait d'union), en
 * minuscules, sans ponctuation autour. « ⏹ » termine la phrase. Rend null si rien de valable.
 */
export function nettoyerMot(brut) {
  const s = String(brut ?? "").trim();
  if (s === FIN) return FIN;
  const premier = s.split(/\s+/)[0] || "";
  const mot = premier
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .replace(/[^\p{L}\p{N}'’-]/gu, "")
    .toLowerCase()
    .slice(0, MOT_MAX);
  return mot || null;
}

/**
 * Les propositions → la distribution du mot suivant, la plus probable d'abord.
 * @returns {Array<{mot:string, n:number, p:number}>}
 */
export function distribution(propositions) {
  const compte = new Map();
  for (const x of Object.values(propositions || {})) {
    const m = nettoyerMot(x?.mot);
    if (m) compte.set(m, (compte.get(m) || 0) + 1);
  }
  const total = [...compte.values()].reduce((a, b) => a + b, 0);
  return [...compte.entries()]
    .map(([mot, n]) => ({ mot, n, p: total ? n / total : 0 }))
    .sort((a, b) => b.n - a.n || a.mot.localeCompare(b.mot, "fr"));
}

/**
 * Le mot retenu. `mode` : « hasard » (proportionnellement aux probabilités, comme un modèle
 * qu'on laisse créatif) ou « probable » (toujours le plus fréquent, comme un modèle prudent).
 */
export function tirer(dist, mode = "hasard", aleatoire = Math.random) {
  if (!dist.length) return null;
  if (mode === "probable") return dist[0];
  let r = aleatoire();
  for (const d of dist) { r -= d.p; if (r < 0) return d; }
  return dist[dist.length - 1];
}

/** La phrase avec un mot de plus (sans espace avant une virgule ou un point). */
export function ajouter(phrase, mot) {
  if (!mot || mot === FIN) return phrase;
  return /^[,.;:!?]/.test(mot) ? `${phrase}${mot}` : `${phrase} ${mot}`;
}
