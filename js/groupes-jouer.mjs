// « QUI SE RESSEMBLE S'ASSEMBLE » — le téléphone : deux curseurs pour se placer (le point bouge
// en direct, anonyme), puis le groupe dans lequel la machine l'a rangé.

import { creerTransport } from "./transport.mjs";
import { $, echapper, brancherRejoindre } from "./commun.mjs";
import { AXES, COULEURS } from "./groupes.mjs";
import { dessinerNuage } from "./nuage.mjs";

let t, code, prenom, etat = {}, points = {}, pointsLus = false, moi = null, resultat = null, enAttente = null, axes = AXES[0], valide = false;
const montrer = (v) => { for (const x of ["rejoindre", "message", "placement"]) $(`v-${x}`).classList.toggle("cache", x !== v); };
const message = (grand, moyen = "") => { montrer("message"); $("m-grand").textContent = grand; $("m-moyen").innerHTML = moyen; };
const fmt = (v, a) => `${String(v).replace(".", ",")}${a.unite ? ` ${a.unite}` : ""}`;

async function demarrer() {
  t = await creerTransport();
  await brancherRejoindre({ t, racine: "groupes", memo: "groupes-joueur", montrer, rejoint: suivre });
}

function suivre(c, p) {
  code = c; prenom = p;
  $("qui").innerHTML = `<strong>${echapper(prenom)}</strong>`;
  $("ou").textContent = `partie ${code}`;
  t.ecouter(`groupes/${code}/points`, (x) => {
    const premiereLecture = !pointsLus;
    points = x || {}; pointsLus = true;
    if (points[t.uid] && !enAttente) { moi = { x: points[t.uid].x, y: points[t.uid].y }; if (premiereLecture) valide = !!points[t.uid].valide; }
    if (etat.phase === "placement") { if (premiereLecture) afficher(); else dessiner(); }
  });
  t.ecouter(`groupes/${code}/resultat`, (r) => { resultat = r; afficher(); });
  t.ecouter(`groupes/${code}/etat`, (e) => {
    // Premier état reçu (arrivée, rechargement) : on règle les curseurs SANS effacer le point
    // déjà placé ; seule une NOUVELLE question (autres axes) repart du centre.
    const premier = etat.axes === undefined;
    const autresAxes = e?.axes && e.axes !== etat.axes;
    etat = e || {};
    if (autresAxes) {
      axes = AXES.find((a) => a.id === etat.axes) || AXES[0];
      preparerCurseurs();
      if (!premier) { moi = null; valide = false; }
    }
    afficher();
  });
}

function preparerCurseurs() {
  for (const [c, a] of [["x", axes.x], ["y", axes.y]]) {
    Object.assign($(`r${c}`), { min: a.min, max: a.max, step: a.pas });
    $(`l${c}`).textContent = a.label;
  }
}

function afficher() {
  if (!etat.phase || etat.phase === "attente") return message(`Bienvenue ${prenom} !`, "Regarde le grand écran : la carte va s'ouvrir.");
  if (etat.phase === "placement") {
    // Tant que la position enregistrée n'est pas lue, on n'écrit rien (sinon le centre l'écraserait).
    if (!pointsLus) return message("Un instant…", "");
    montrer("placement");
    const enregistre = points[t.uid];
    if (!moi && enregistre) { moi = { x: enregistre.x, y: enregistre.y }; valide = !!enregistre.valide; }
    if (!moi) { moi = { x: (axes.x.min + axes.x.max) / 2, y: (axes.y.min + axes.y.max) / 2 }; envoyer(); }
    $("rx").value = moi.x; $("ry").value = moi.y;
    $("vx").textContent = fmt(moi.x, axes.x); $("vy").textContent = fmt(moi.y, axes.y);
    majValider();
    return dessiner();
  }
  if (etat.phase === "regroupement") return message("La machine regroupe…", "Regarde le grand écran : elle ne sait pas qui est qui.");
  if (etat.phase === "fin" && resultat) {
    const g = resultat.affectations?.[t.uid];
    if (g === undefined) return message("Groupes formés", "Tu n'avais pas placé ton point à temps.");
    const port = resultat.portraits[g];
    montrer("message");
    $("m-grand").innerHTML = `Tu es dans le groupe<br><span class="nom-groupe-tel" style="background:${COULEURS[g]}">${echapper(resultat.noms?.[g] || "")}</span>`;
    $("m-moyen").innerHTML = `${port.effectif} personne${port.effectif > 1 ? "s" : ""} · en moyenne ${fmt(Math.round(port.x * 10) / 10, axes.x)} et ${fmt(Math.round(port.y * 10) / 10, axes.y)}<br>La machine t'a rangé là <b>sans connaître ton prénom</b>, seulement d'après tes deux réponses.`;
  }
}

function dessiner() {
  const autres = Object.entries(points).filter(([uid]) => uid !== t.uid).map(([, p]) => ({ ...p, pale: true }));
  dessinerNuage($("mini"), axes, [...autres, ...(moi ? [{ ...moi, moi: true }] : [])], [], { largeur: 600, hauteur: 420, police: 18 });
}

/** Envoi de la position, au plus toutes les 150 ms. */
function envoyer(tout_de_suite = false) {
  if (etat.phase !== "placement") return;
  const ecrire = async () => {
    enAttente = null;
    try { await t.ecrire(`groupes/${code}/points/${t.uid}`, { x: moi.x, y: moi.y, valide }); } catch { /* carte fermée */ }
  };
  if (tout_de_suite) { clearTimeout(enAttente); return ecrire(); }
  if (!enAttente) enAttente = setTimeout(ecrire, 150);
}

/** « Je valide » : quand tout le monde a validé, les groupes se forment sans attendre. */
function majValider() {
  $("valider").textContent = valide ? "Position validée ✓ (bouge un curseur pour la modifier)" : "✓ Je valide ma position";
  $("valider").classList.toggle("fait", valide);
}
$("valider").onclick = () => { if (etat.phase !== "placement" || !moi) return; valide = true; majValider(); envoyer(true); };

function regler(c, v) {
  if (etat.phase !== "placement") return;
  const a = axes[c];
  moi = { ...moi, [c]: Math.round(Math.min(a.max, Math.max(a.min, Number(v))) / a.pas) * a.pas };
  valide = false;
  majValider();
  $(`v${c}`).textContent = fmt(moi[c], a);
  dessiner();
  envoyer();
}
$("rx").oninput = (e) => regler("x", e.target.value);
$("ry").oninput = (e) => regler("y", e.target.value);
demarrer().catch((e) => message("Connexion impossible", e.message));
