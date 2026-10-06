// « BATTEZ LA MACHINE » — l'écran d'animation. Il crée la partie (les courses de taxi), lance la
// manche, montre en direct la droite de chaque joueur et le classement à l'écart moyen, puis fait
// jouer la machine (descente de gradient, pas à pas) et révèle le résultat.
//
// Tout l'état vit dans `jeux/<code>` : recharger cette page reprend la partie.

import { creerTransport } from "./transport.mjs";
import { genererCode, prenomsAffiches } from "./jeu.mjs";
import { genererCourses, descente, classementDroites, couleurDe, fr } from "./machine.mjs";
import { dessiner } from "./graphique.mjs";

const $ = (id) => document.getElementById(id);
// « Changer de jeu » garde le mode (local ou en ligne).
document.querySelectorAll(".retour-choix").forEach((a) => { a.href = `animateur.html${location.search.includes("local") ? "?local=1" : ""}`; });
const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ORANGE = "#ff8a4c";

let t, code, base;
let etat = { phase: "attente" }, joueurs = {}, droites = {}, courses = [], machine = null, tarif = null;
let minuteur = null, publication = null, animation = null;

const chemin = (s = "") => `jeux/${code}${s ? `/${s}` : ""}`;
function montrer(vue) { for (const v of ["accueil", "jeu"]) $(`v-${v}`).classList.toggle("cache", v !== vue); }

// ─── Démarrage ───────────────────────────────────────────────────────────────
async function demarrer() {
  t = await creerTransport();
  $("mode").textContent = t.local ? " · mode local" : "";
  const precedent = sessionStorage.getItem("machine-code");
  if (precedent && (await t.lire(`jeux/${precedent}/hote`)) === t.uid) {
    code = precedent;
    tarif = await t.lire(chemin("tarif"));
  } else {
    code = genererCode();
    const partie = genererCourses(Math.floor(Math.random() * 1e9));
    tarif = partie.tarif;
    await t.ecrire(chemin(), { hote: t.uid, creeLe: t.HORODATAGE, courses: partie.courses, tarif, etat: { phase: "attente", manche: 1 } });
    sessionStorage.setItem("machine-code", code);
  }
  afficherAccueil();
  t.ecouter(chemin("courses"), (c) => { courses = c || []; rafraichir(); });
  t.ecouter(chemin("joueurs"), (j) => { joueurs = j || {}; majJoueurs(); rafraichir(); });
  t.ecouter(chemin("droites"), (d) => { droites = d || {}; rafraichir(); });
  t.ecouter(chemin("machine"), (m) => { if (!animation) { machine = m; rafraichir(); } });
  t.ecouter(chemin("etat"), (e) => { etat = e || { phase: "attente" }; changerDePhase(); });
}

function afficherAccueil() {
  const u = new URL("machine-jouer.html", location.href);
  u.searchParams.set("p", code);
  if (t.local) u.searchParams.set("local", "1");
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(u.toString());
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  }
  $("adresse").textContent = u.toString().replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  $("code").textContent = code;
}

function majJoueurs() {
  const n = Object.keys(joueurs).length;
  $("compte").textContent = n ? `${n} joueur${n > 1 ? "s" : ""}` : "En attente des joueurs…";
  $("prenoms").innerHTML = Object.values(prenomsAffiches(joueurs)).map((p) => `<span>${echapper(p)}</span>`).join("");
  $("lancer").disabled = n === 0;
}

// ─── Les phases ──────────────────────────────────────────────────────────────
async function lancerManche() {
  const duree = Number($("duree").value) || 90;
  await t.ecrire(chemin("etat"), { phase: "jeu", manche: etat.manche || 1, debut: t.HORODATAGE, duree });
}

async function arreter() {
  if (etat.phase !== "jeu") return;
  await publierClassement();
  await t.maj(chemin("etat"), { phase: "stop" });
}

async function lancerMachine() { await t.maj(chemin("etat"), { phase: "machine" }); }

async function nouvelleManche() {
  const partie = genererCourses(Math.floor(Math.random() * 1e9));
  tarif = partie.tarif;
  await t.maj(chemin(), { courses: partie.courses, tarif, droites: null, machine: null, classement: null });
  await t.ecrire(chemin("etat"), { phase: "jeu", manche: (etat.manche || 1) + 1, debut: t.HORODATAGE, duree: etat.duree || Number($("duree").value) || 90 });
}

/** Le classement que voient les téléphones (rang et écart de chacun). */
async function publierClassement(avecMachine = false) {
  const lignes = classementDroites(courses, joueurs, droites, avecMachine ? machine : null);
  const rangs = {};
  for (const l of lignes) rangs[l.uid] = { rang: l.rang, ecart: Math.round(l.ecart * 100) / 100 };
  await t.ecrire(chemin("classement"), { rangs, total: lignes.length });
}

function changerDePhase() {
  clearInterval(minuteur);
  clearInterval(publication);
  $("etat-bandeau").innerHTML = `${etat.manche ? `manche ${etat.manche} · ` : ""}code <strong>${code}</strong>`;
  if (etat.phase === "attente") return montrer("accueil");
  montrer("jeu");
  $("action").classList.remove("cache");
  $("p-tarif").classList.add("cache");
  $("rejouer").classList.add("cache");
  $("p-machine").classList.add("cache");
  $("courbe").classList.add("cache");
  $("p-titre").textContent = "Classement";
  if (etat.phase === "jeu") {
    $("action").textContent = "Arrêter maintenant";
    $("action").onclick = arreter;
    const fin = (etat.debut || t.maintenant()) + etat.duree * 1000;
    const tic = () => {
      const reste = Math.max(0, Math.ceil((fin - t.maintenant()) / 1000));
      $("p-temps").innerHTML = `${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, "0")}<small>Réglez w et b sur votre téléphone</small>`;
      $("p-temps").classList.toggle("urgent", reste <= 10);
      if (reste === 0) arreter();
    };
    tic();
    minuteur = setInterval(tic, 250);
    publication = setInterval(publierClassement, 1000);
  } else if (etat.phase === "stop") {
    $("p-temps").innerHTML = `Temps écoulé<small>À la machine de jouer</small>`;
    $("p-temps").classList.remove("urgent");
    $("action").textContent = "Lancer la machine";
    $("action").onclick = lancerMachine;
  } else if (etat.phase === "machine") {
    $("p-temps").innerHTML = `La machine apprend<small>Elle part de w = 0 et b = 0</small>`;
    $("action").classList.add("cache");
    jouerMachine();
  } else if (etat.phase === "resultat") {
    afficherResultat();
  }
  rafraichir();
}

// ─── La machine, pas à pas ───────────────────────────────────────────────────
function jouerMachine() {
  if (animation) return;
  const debutCalcul = performance.now();
  const suite = descente(courses);
  const dureeCalculMs = performance.now() - debutCalcul;
  $("p-machine").classList.remove("cache");
  $("courbe").classList.remove("cache");
  let k = 0, derniereEcriture = 0;
  // Les premiers pas, lentement (on voit la droite pivoter) ; puis on accélère.
  const prochain = () => (k < 12 ? 1 : k < 40 ? 2 : 6);
  animation = setInterval(async () => {
    k = Math.min(suite.length - 1, k + prochain());
    machine = suite[k];
    $("p-machine").innerHTML = `<strong>${fr(machine.ecart)} €</strong>écart moyen · étape ${machine.etape} / ${suite.length - 1}<br>w = ${fr(machine.w)} €/km · b = ${fr(machine.b)} €`;
    dessinerCourbe(suite.slice(0, k + 1));
    rafraichir();
    if (performance.now() - derniereEcriture > 300 || k === suite.length - 1) {
      derniereEcriture = performance.now();
      t.ecrire(chemin("machine"), { w: machine.w, b: machine.b, etape: machine.etape, ecart: machine.ecart });
    }
    if (k === suite.length - 1) {
      clearInterval(animation);
      animation = null;
      await publierClassement(true);
      await t.maj(chemin("etat"), { phase: "resultat", calculMs: Math.max(1, Math.round(dureeCalculMs)), etapes: suite.length - 1 });
    }
  }, 120);
}

function dessinerCourbe(points) {
  const svg = $("courbe");
  const L = 400, H = 120, max = points[0].ecart || 1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i / 239) * L},${H - 8 - (p.ecart / max) * (H - 16)}`).join(" ");
  svg.setAttribute("viewBox", `0 0 ${L} ${H}`);
  svg.innerHTML = `<path d="${d}"/>`;
}

function afficherResultat() {
  $("courbe").classList.add("cache");
  const lignes = classementDroites(courses, joueurs, droites, machine);
  const humains = lignes.filter((l) => !l.machine);
  const m = lignes.find((l) => l.machine);
  const meilleur = humains[0];
  const victoire = meilleur && m && meilleur.ecart < m.ecart;
  $("p-temps").innerHTML = victoire ? `${echapper(meilleur.prenom)} bat la machine !<small>Bravo</small>` : `La machine gagne<small>Elle a appris seule</small>`;
  $("p-machine").classList.remove("cache");
  $("p-machine").innerHTML = `<strong>${fr(m?.ecart ?? 0)} €</strong>écart de la machine : ${etat.etapes} étapes, calculées en ${etat.calculMs} ms`;
  $("p-titre").textContent = "Classement final";
  $("action").textContent = "Révéler le vrai tarif";
  $("action").onclick = () => {
    $("p-tarif").innerHTML = `Le vrai tarif : <b>b = ${fr(tarif.b)} €</b> et <b>w = ${fr(tarif.w)} €/km</b>. Même lui ne passe pas par tous les points : le trafic fait varier chaque course.`;
    $("p-tarif").classList.remove("cache");
    $("action").classList.add("cache");
  };
  $("action").classList.remove("cache");
  $("rejouer").classList.remove("cache");
  $("rejouer").onclick = () => { $("action").classList.remove("cache"); nouvelleManche(); };
  sessionStorage.setItem("machine-code", code);
}

// ─── Le graphique et le classement ───────────────────────────────────────────
function rafraichir() {
  if (etat.phase === "attente" || !courses.length) return;
  const lignes = classementDroites(courses, joueurs, droites, ["machine", "resultat"].includes(etat.phase) ? machine : null);
  const noms = prenomsAffiches(joueurs);
  const enMachine = ["machine", "resultat"].includes(etat.phase);
  const top = new Set(lignes.filter((l) => !l.machine).slice(0, 3).map((l) => l.uid));
  const traits = Object.entries(droites)
    .filter(([uid]) => joueurs[uid])
    .map(([uid, d]) => ({
      w: d.w, b: d.b, couleur: couleurDe(uid),
      epaisseur: top.has(uid) ? 4 : 2.5,
      opacite: enMachine ? 0.25 : top.has(uid) ? 0.95 : 0.55,
      etiquette: !enMachine && top.has(uid) ? noms[uid] : "",
    }));
  if (enMachine && machine) traits.push({ w: machine.w, b: machine.b, couleur: ORANGE, epaisseur: 8, opacite: 1, etiquette: "La machine" });
  dessiner($("graphique"), courses, traits, { largeur: 1100, hauteur: 680, police: 20, residus: enMachine && machine ? machine : null });
  $("p-classement").innerHTML = lignes.slice(0, etat.phase === "resultat" ? 5 : 8).map((l) => `
    <li class="${l.machine ? "machine" : ""}"><span class="rang">${l.rang}</span>
      <span class="pastille" style="background:${l.machine ? "#fff" : couleurDe(l.uid)}"></span>
      <span>${echapper(l.machine ? "La machine" : noms[l.uid] || l.prenom)}</span>
      <span class="ecart">${fr(l.ecart)} €</span></li>`).join("") || `<li>Les droites arrivent…</li>`;
}

// ─── Commandes ───────────────────────────────────────────────────────────────
$("lancer").onclick = lancerManche;
demarrer().catch((e) => { $("erreur").textContent = /PERMISSION/i.test(e.message) ? "Impossible de démarrer : les règles Firebase ne connaissent pas encore ce jeu. Publie le contenu de database.rules.json (console Firebase → Realtime Database → Règles → Publier), puis recharge." : `Impossible de démarrer : ${e.message}`; });
