// « QUI SE RESSEMBLE S'ASSEMBLE » — logique PURE. Chaque étudiant se place (anonymement) sur
// deux axes ; puis les k-moyennes forment des groupes sans aucune étiquette, étape par étape.
// Cours 3.2 : regrouper sans étiquette — la machine trouve les groupes, la salle les nomme.

export const AXES = [
  {
    id: "sommeil-ecran",
    x: { label: "Heures de sommeil par nuit", min: 4, max: 10, pas: 0.5, unite: "h" },
    y: { label: "Heures d'écran par jour", min: 0, max: 12, pas: 0.5, unite: "h" },
  },
  {
    id: "cafe-trajet",
    x: { label: "Cafés par jour", min: 0, max: 6, pas: 1, unite: "" },
    y: { label: "Minutes de trajet pour venir", min: 0, max: 120, pas: 5, unite: "min" },
  },
  {
    id: "sport-jeux",
    x: { label: "Heures de sport par semaine", min: 0, max: 15, pas: 1, unite: "h" },
    y: { label: "Heures de jeux vidéo par semaine", min: 0, max: 30, pas: 1, unite: "h" },
  },
];

export const COULEURS = ["#6d5ae6", "#22b8a7", "#ff8a4c", "#e5487a", "#2f80ed"];
export const NOMS_COULEURS = ["Violet", "Turquoise", "Orange", "Rose", "Bleu"];

/** Ramène un point dans [0, 1]² selon les axes (les deux axes pèsent autant). */
export const normaliser = (p, axes) => ({ x: (p.x - axes.x.min) / (axes.x.max - axes.x.min), y: (p.y - axes.y.min) / (axes.y.max - axes.y.min) });
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** Centres de départ : k-means++ (le 1er au hasard, puis les suivants loin des précédents). */
export function centresInitiaux(points, k, aleatoire = Math.random) {
  if (!points.length) return [];
  const centres = [{ ...points[Math.floor(aleatoire() * points.length)] }];
  while (centres.length < Math.min(k, points.length)) {
    const poids = points.map((p) => Math.min(...centres.map((c) => d2(p, c))));
    const total = poids.reduce((a, b) => a + b, 0);
    if (total === 0) break;
    let r = aleatoire() * total, i = 0;
    for (; i < poids.length - 1; i++) { r -= poids[i]; if (r < 0) break; }
    centres.push({ ...points[i] });
  }
  return centres;
}

/** Une étape : chaque point rejoint le centre le plus proche. */
export const affecter = (points, centres) => points.map((p) => centres.reduce((m, c, j) => (d2(p, c) < d2(p, centres[m]) ? j : m), 0));

/** L'autre étape : chaque centre va au milieu de ses points (il reste en place s'il n'en a pas). */
export function recentrer(points, groupes, centres) {
  return centres.map((c, j) => {
    const siens = points.filter((_, i) => groupes[i] === j);
    return siens.length ? { x: siens.reduce((s, p) => s + p.x, 0) / siens.length, y: siens.reduce((s, p) => s + p.y, 0) / siens.length } : c;
  });
}

/**
 * Le déroulé complet, pour l'animer : [{ centres, groupes }] — d'abord les centres de départ
 * (groupes non encore formés), puis une entrée par étape, jusqu'à ce que plus rien ne bouge.
 */
export function kMoyennes(points, k, { aleatoire = Math.random, etapesMax = 20 } = {}) {
  let centres = centresInitiaux(points, k, aleatoire);
  const suite = [{ centres, groupes: null }];
  let groupes = null;
  for (let e = 0; e < etapesMax; e++) {
    const nouveaux = affecter(points, centres);
    const stable = groupes && nouveaux.every((g, i) => g === groupes[i]);
    groupes = nouveaux;
    centres = recentrer(points, groupes, centres);
    suite.push({ centres, groupes });
    if (stable) break;
  }
  return suite;
}

/** Ce que l'on dit de chaque groupe : son effectif et la moyenne de ses deux réponses. */
export function portraits(pointsBruts, groupes, k) {
  return Array.from({ length: k }, (_, j) => {
    const siens = pointsBruts.filter((_, i) => groupes[i] === j);
    const moy = (cle) => (siens.length ? siens.reduce((s, p) => s + p[cle], 0) / siens.length : 0);
    return { groupe: j, effectif: siens.length, x: moy("x"), y: moy("y") };
  });
}
