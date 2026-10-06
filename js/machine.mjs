// « BATTEZ LA MACHINE » — logique PURE : les courses de taxi, l'écart d'une droite, la descente
// de la machine. Aucune dépendance au navigateur ni à Firebase (testée par `node --test`).
//
// Le jeu : chaque étudiant règle w (prix au km) et b (prise en charge) pour que SA droite passe
// au plus près des courses passées ; le classement se fait à l'écart moyen en euros (celui du
// cours, 2.7). Puis la machine fait la même chose seule, pas à pas : apprendre, c'est réduire
// l'erreur (2.5).

export const BORNES = { w: { min: 0, max: 4, pas: 0.05 }, b: { min: 0, max: 15, pas: 0.1 }, distanceMax: 25, prixMax: 70 };

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function aleatoire(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tirage gaussien (Box-Muller). */
function gauss(r) {
  const u = Math.max(r(), 1e-9), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Les courses passées : un vrai tarif (caché aux joueurs), et le prix réellement payé, qui s'en
 * écarte à cause du trafic — surtout vers le haut (un bouchon coûte, il ne rembourse pas).
 * @returns {{ tarif: {w:number,b:number}, courses: Array<{d:number, prix:number}> }}
 */
export function genererCourses(graine, n = 24) {
  const r = aleatoire(graine);
  const tarif = { w: Math.round((1.2 + r() * 1.2) * 20) / 20, b: Math.round((2.5 + r() * 4) * 10) / 10 };
  const courses = [];
  for (let i = 0; i < n; i++) {
    const d = Math.round((1 + r() * (BORNES.distanceMax - 2)) * 10) / 10;
    const trafic = Math.abs(gauss(r)) * 0.12 * d * (r() < 0.7 ? 1 : -0.6);
    const prix = Math.max(tarif.b, tarif.w * d + tarif.b + trafic + gauss(r) * 1.2);
    courses.push({ d, prix: Math.round(prix * 10) / 10 });
  }
  courses.sort((a, b) => a.d - b.d);
  return { tarif, courses };
}

/** Écart moyen (€) entre la droite w·d + b et les prix payés. */
export function ecartMoyen(courses, w, b) {
  if (!courses.length) return 0;
  return courses.reduce((s, c) => s + Math.abs(w * c.d + b - c.prix), 0) / courses.length;
}

/**
 * La MACHINE : descente de gradient sur l'erreur quadratique, en partant de w = 0, b = 0. Les
 * distances sont ramenées entre 0 et 1 pour que le pas convienne aux deux réglages ; on rend
 * w et b dans les unités du jeu. Chaque étape : { etape, w, b, ecart }.
 */
export function descente(courses, { etapes = 240, pas = 0.5 } = {}) {
  const echelle = BORNES.distanceMax;
  const xs = courses.map((c) => c.d / echelle), ys = courses.map((c) => c.prix);
  let a = 0, b = 0; // prix ≈ a·x + b, x = d / échelle
  const n = xs.length;
  const suite = [{ etape: 0, w: 0, b: 0, ecart: ecartMoyen(courses, 0, 0) }];
  for (let k = 1; k <= etapes; k++) {
    let ga = 0, gb = 0;
    for (let i = 0; i < n; i++) {
      const e = a * xs[i] + b - ys[i];
      ga += (2 / n) * e * xs[i];
      gb += (2 / n) * e;
    }
    a -= pas * ga;
    b -= pas * gb;
    const w = a / echelle;
    suite.push({ etape: k, w, b, ecart: ecartMoyen(courses, w, b) });
  }
  return suite;
}

/**
 * Le classement : les joueurs (et la machine, si elle a joué) par écart croissant.
 * @param {Record<string,{prenom:string}>} joueurs
 * @param {Record<string,{w:number,b:number}>} droites
 */
export function classementDroites(courses, joueurs, droites, machine = null) {
  const lignes = Object.entries(droites || {})
    .filter(([uid]) => joueurs?.[uid])
    .map(([uid, d]) => ({ uid, prenom: joueurs[uid].prenom, w: d.w, b: d.b, ecart: ecartMoyen(courses, d.w, d.b) }));
  if (machine) lignes.push({ uid: "machine", prenom: "La machine", machine: true, w: machine.w, b: machine.b, ecart: ecartMoyen(courses, machine.w, machine.b) });
  lignes.sort((x, y) => x.ecart - y.ecart);
  lignes.forEach((l, i) => { l.rang = i + 1; });
  return lignes;
}

/** Une couleur stable par joueur (sa droite garde sa couleur d'un écran à l'autre). */
export function couleurDe(uid) {
  let h = 0;
  for (const c of String(uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

/** Valeur de curseur ramenée dans ses bornes et sur son pas. */
export function borner(cle, v) {
  const { min, max, pas } = BORNES[cle];
  const x = Math.min(max, Math.max(min, Number(v) || 0));
  return Math.round(x / pas) * pas;
}

/** « 1,50 » — nombre à la française. */
export const fr = (x, chiffres = 2) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: chiffres, maximumFractionDigits: chiffres });
