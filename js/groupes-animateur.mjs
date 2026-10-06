// « QUI SE RESSEMBLE S'ASSEMBLE » — l'écran d'animation. Les étudiants se placent (points
// anonymes) ; puis les k-moyennes forment des groupes étape par étape, sous les yeux de la
// salle ; chaque groupe est décrit (effectif, moyennes) et la salle le nomme.

import { creerTransport } from "./transport.mjs";
import { $, echapper, afficherAccueil, majPrenoms, partieAnimateur } from "./commun.mjs";
import { AXES, COULEURS, NOMS_COULEURS, kMoyennes, normaliser, portraits } from "./groupes.mjs";
import { dessinerNuage } from "./nuage.mjs";

let t, code, etat = { phase: "attente" }, joueurs = {}, points = {}, animation = null;
const chemin = (s = "") => `groupes/${code}${s ? `/${s}` : ""}`;
const montrer = (v) => { for (const x of ["accueil", "jeu"]) $(`v-${x}`).classList.toggle("cache", x !== v); };
const axesDe = (id) => AXES.find((a) => a.id === id) || AXES[0];
const fmt = (v, a) => `${(Math.round(v * 10) / 10).toString().replace(".", ",")}${a.unite ? ` ${a.unite}` : ""}`;

async function demarrer() {
  t = await creerTransport();
  $("mode-local").textContent = t.local ? " · mode local" : "";
  $("axes").innerHTML = AXES.map((a) => `<option value="${a.id}">${echapper(a.x.label)} × ${echapper(a.y.label)}</option>`).join("");
  code = await partieAnimateur({ t, racine: "groupes", memo: "groupes-code", creer: async () => ({ etat: { phase: "attente" } }) });
  afficherAccueil("groupes-jouer.html", code, t.local);
  t.ecouter(chemin("joueurs"), (j) => { joueurs = j || {}; majPrenoms(joueurs); majPlaces(); });
  t.ecouter(chemin("points"), (p) => { points = p || {}; if (etat.phase === "placement") dessinerPlacement(); majPlaces(); });
  t.ecouter(chemin("etat"), (e) => { etat = e || { phase: "attente" }; afficher(); });
}

async function ouvrir(axesId = $("axes").value) {
  await t.ecrire(chemin("points"), null);
  await t.ecrire(chemin("etat"), { phase: "placement", axes: axesId });
}

/** Les points placés, dans un ordre stable (celui des identifiants). */
function liste() {
  return Object.entries(points).filter(([uid]) => joueurs[uid]).sort(([a], [b]) => a.localeCompare(b)).map(([uid, p]) => ({ uid, x: p.x, y: p.y }));
}

async function regrouper() {
  const k = Number($("k").value) || 3;
  const pts = liste();
  if (pts.length < k) { $("erreur").textContent = `Il faut au moins ${k} points placés pour former ${k} groupes.`; return; }
  $("erreur").textContent = "";
  const axes = axesDe(etat.axes);
  const suite = kMoyennes(pts.map((p) => normaliser(p, axes)), k);
  const fin = suite.at(-1).groupes;
  const affectations = Object.fromEntries(pts.map((p, i) => [p.uid, fin[i]]));
  const descr = portraits(pts, fin, k);
  // Les étapes partent dans l'état : l'écran les anime, et un rechargement retombe sur la fin.
  await t.maj(chemin("etat"), { phase: "regroupement", k, suite: suite.map((s) => ({ centres: s.centres, groupes: s.groupes })), ordre: pts.map((p) => p.uid) });
  await t.ecrire(chemin("resultat"), { k, affectations, portraits: descr, noms: NOMS_COULEURS.slice(0, k) });
}

function etapeSuivante() {
  if (etat.phase === "attente" && Object.keys(joueurs).length) return ouvrir();
  if (etat.phase === "placement") return regrouper();
}

// ─── Affichage ───────────────────────────────────────────────────────────────
function afficher() {
  clearTimeout(animation);
  $("etat-bandeau").innerHTML = `code <strong>${code}</strong>`;
  if (etat.phase === "attente") return montrer("accueil");
  montrer("jeu");
  $("autre").classList.toggle("cache", etat.phase !== "fin");
  $("k-choix").classList.toggle("cache", etat.phase === "regroupement");
  if (etat.phase === "placement") {
    $("titre").innerHTML = `Placez-vous !<small>sur votre téléphone</small>`;
    $("etape").classList.add("cache");
    $("liste").innerHTML = "";
    $("action").textContent = "Former les groupes";
    $("action").onclick = regrouper;
    $("action").classList.remove("cache");
    dessinerPlacement();
    majPlaces();
  } else if (etat.phase === "regroupement") {
    $("titre").innerHTML = `La machine regroupe<small>sans savoir qui est qui</small>`;
    $("action").classList.add("cache");
    animer();
  } else if (etat.phase === "fin") {
    afficherFin();
  }
}

function majPlaces() {
  if (etat.phase !== "placement") return;
  const n = liste().length, total = Object.keys(joueurs).length;
  $("places").innerHTML = `<b>${n}</b> / ${total} placés`;
}

function dessinerPlacement() {
  dessinerNuage($("nuage"), axesDe(etat.axes), liste().map((p) => ({ x: p.x, y: p.y })), [], { largeur: 1100, hauteur: 680, police: 20 });
}

/** Les étapes des k-moyennes, une par seconde : centres, puis couleurs, puis centres qui bougent. */
function animer() {
  const axes = axesDe(etat.axes);
  const pts = (etat.ordre || []).map((uid) => points[uid]).filter(Boolean);
  const brut = (c) => ({ x: axes.x.min + c.x * (axes.x.max - axes.x.min), y: axes.y.min + c.y * (axes.y.max - axes.y.min) });
  const suite = etat.suite || [];
  let i = 0;
  const pas = async () => {
    if (etat.phase !== "regroupement") return;
    const s = suite[i];
    const centres = s.centres.map((c, j) => ({ ...brut(c), couleur: COULEURS[j] }));
    dessinerNuage($("nuage"), axes, pts.map((p, n) => ({ x: p.x, y: p.y, couleur: s.groupes ? COULEURS[s.groupes[n]] : "#1e2459", pale: !s.groupes })), centres, { largeur: 1100, hauteur: 680, police: 20 });
    $("etape").classList.remove("cache");
    $("etape").innerHTML = i === 0
      ? `<strong>Étape 0</strong>${etat.k} centres posés au hasard`
      : `<strong>Étape ${i}</strong>chacun rejoint le centre le plus proche, puis chaque centre va au milieu de son groupe`;
    i++;
    if (i < suite.length) animation = setTimeout(pas, i === 1 ? 1600 : 1200);
    else animation = setTimeout(() => t.maj(chemin("etat"), { phase: "fin" }), 1400);
  };
  pas();
}

async function afficherFin() {
  const r = await t.lire(chemin("resultat"));
  if (!r) return;
  const axes = axesDe(etat.axes);
  const pts = (etat.ordre || []).map((uid) => ({ uid, ...points[uid] })).filter((p) => p.x !== undefined);
  const centres = r.portraits.map((g, j) => ({ x: g.x, y: g.y, couleur: COULEURS[j] }));
  dessinerNuage($("nuage"), axes, pts.map((p) => ({ x: p.x, y: p.y, couleur: COULEURS[r.affectations[p.uid]] })), centres, { largeur: 1100, hauteur: 680, police: 20 });
  $("titre").innerHTML = `${r.k} groupes trouvés<small>À vous de les nommer</small>`;
  $("etape").classList.add("cache");
  $("places").textContent = "";
  $("liste").innerHTML = r.portraits.map((g, j) => `
    <li style="--c:${COULEURS[j]}">
      <input class="nom-groupe" data-j="${j}" value="${echapper(r.noms?.[j] || NOMS_COULEURS[j])}" aria-label="Nom du groupe" />
      <span class="effectif">${g.effectif} pers.</span>
      <span class="portrait">≈ ${fmt(g.x, axes.x)} · ${fmt(g.y, axes.y)}</span>
    </li>`).join("");
  document.querySelectorAll(".nom-groupe").forEach((inp) => {
    inp.onchange = () => t.ecrire(chemin(`resultat/noms/${inp.dataset.j}`), inp.value.trim().slice(0, 40) || NOMS_COULEURS[inp.dataset.j]);
  });
  $("action").classList.remove("cache");
  $("action").textContent = "Refaire avec un autre nombre de groupes";
  $("action").onclick = () => t.maj(chemin("etat"), { phase: "placement" });
}

// ─── Commandes ───────────────────────────────────────────────────────────────
$("lancer").onclick = () => ouvrir();
$("autre").onclick = () => t.ecrire(chemin("etat"), { phase: "attente" });
document.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT"].includes(e.target.tagName)) return;
  if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); etapeSuivante(); }
});
demarrer().catch((e) => { $("erreur").textContent = `Impossible de démarrer : ${e.message}`; });
