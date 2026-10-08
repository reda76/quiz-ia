// LA SALLE — un seul QR code et un seul code pour toute la séance. L'écran d'animation crée la
// salle ; chaque téléphone la rejoint une fois avec son prénom. Quand l'animateur lance un jeu,
// la salle publie `jeu: { type, code }` et tous les téléphones y basculent seuls ; quand il
// revient au choix des jeux, `jeu` redevient null et les téléphones attendent le suivant.
// Logique PURE (testée par `node --test`).

/** La page « joueur » de chaque jeu. */
export const PAGES_JOUEUR = { quiz: "jouer.html", machine: "machine-jouer.html", mots: "mots-jouer.html", groupes: "groupes-jouer.html" };

export const codeValide = (c) => /^\d{6}$/.test(String(c ?? ""));

/** Le code de salle porté par l'adresse (`?salle=` côté jeux, `?s=` sur la page de la salle). */
export function salleDeLAdresse(search, cle = "salle") {
  const s = new URLSearchParams(search).get(cle);
  return codeValide(s) ? s : null;
}

/** Un téléphone qui joue à `type`/`code` doit-il repartir vers la salle ? */
export function doitQuitter(jeu, type, code) {
  return !jeu || jeu.type !== type || String(jeu.code) !== String(code);
}

/** L'adresse de la salle, celle du QR code unique. */
export function adresseDeLaSalle(base, salle, local = false) {
  const u = new URL("salle.html", base);
  u.searchParams.set("s", salle);
  if (local) u.searchParams.set("local", "1");
  return u.toString();
}

/** L'adresse du jeu en cours, pour un téléphone de la salle. Null si le jeu est inconnu. */
export function adresseDuJeu(base, jeu, salle, local = false) {
  const page = jeu && PAGES_JOUEUR[jeu.type];
  if (!page || !codeValide(jeu.code)) return null;
  const u = new URL(page, base);
  u.searchParams.set("p", jeu.code);
  u.searchParams.set("salle", salle);
  if (local) u.searchParams.set("local", "1");
  return u.toString();
}
