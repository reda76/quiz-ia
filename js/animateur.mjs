// L'ÉCRAN D'ANIMATION (grand écran). C'est lui qui mène la partie : il crée la partie, pose
// les questions, révèle les réponses, calcule et publie le classement. Les téléphones ne font
// qu'afficher l'état qu'il publie et envoyer leurs réponses.
//
// Tout ce qui compte vit dans la base (`parties/<code>`) : recharger cette page reprend la
// partie là où elle en était (même animateur, même navigateur).

import { creerTransport } from "./transport.mjs";
import { brancherNouvellePartie, poserQrRappel, annoncerALaSalle, urlPourLesJoueurs, codePourLesJoueurs, brancherRetourAuChoix } from "./commun.mjs";
import { classement, decompte, genererCode, joueursActifs, melanger, prenomsAffiches, repartition, verifierQuestions } from "./jeu.mjs";
import { QUESTIONS, TITRE } from "./questions.mjs";

const $ = (id) => document.getElementById(id);
// « Changer de jeu » garde le mode (local ou en ligne).
brancherRetourAuChoix(location.search.includes("local"));
const LETTRES = ["A", "B", "C", "D"];
const DUREE_DEFAUT = 20;
const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let t, code, questions = QUESTIONS, titre = TITRE;
let etat = { phase: "attente" };
let joueurs = {}, presents = {};
let reponsesCourantes = {};
let arretReponses = null;
let minuteur = null;

function montrer(vue) {
  for (const v of ["accueil", "question", "revelation", "classement", "fin"]) $(`v-${v}`).classList.toggle("cache", v !== vue);
}
function erreur(m) { $("erreur").textContent = m || ""; }

// ─── Démarrage : nouvelle partie, ou reprise après un rechargement ───────────
async function demarrer() {
  brancherNouvellePartie("quiz-ia-code");
  t = await creerTransport();
  const precedent = sessionStorage.getItem("quiz-ia-code");
  if (precedent && (await t.lire(`parties/${precedent}/hote`)) === t.uid) {
    code = precedent;
    const q = await t.lire(`parties/${code}/questions`);
    if (q) { questions = q.liste; titre = q.titre; }
  } else {
    code = genererCode();
    await t.ecrire(`parties/${code}`, { hote: t.uid, creeLe: t.HORODATAGE, etat: { phase: "attente" } });
    await publierQuestionsCachees();
    sessionStorage.setItem("quiz-ia-code", code);
  }
  await annoncerALaSalle(t, "quiz", code);
  $("titre-quiz").innerHTML = `<strong>${echapper(titre)}</strong>${t.local ? " · mode local" : ""}`;
  afficherAccueil();
  t.ecouter(`parties/${code}/joueurs`, (j) => { joueurs = j || {}; majJoueurs(); });
  t.ecouter(`parties/${code}/presents`, (p) => { presents = p || {}; if (etat.phase === "question") majReponsesRecues(); });
  t.ecouter(`parties/${code}/etat`, (e) => { etat = e || { phase: "attente" }; afficher(); });
}

/** Les questions sont gardées dans la partie (côté animateur) pour qu'un rechargement les retrouve. */
async function publierQuestionsCachees() {
  await t.ecrire(`parties/${code}/questions`, { titre, liste: questions });
}

/** L'adresse du QR : la salle s'il y en a une (un QR pour tous les jeux), sinon ce quiz. */
const urlJoueur = () => urlPourLesJoueurs("jouer.html", code, t.local);

function afficherAccueil() {
  const url = urlJoueur();
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  } else $("qr").textContent = url;
  $("adresse").textContent = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  $("code").textContent = codePourLesJoueurs(code);
  poserQrRappel(url, codePourLesJoueurs(code));
  $("nb-questions").textContent = `${questions.length} questions`;
}

function majJoueurs() {
  const noms = prenomsAffiches(joueurs);
  const n = Object.keys(joueurs).length;
  $("compte").textContent = n ? `${n} joueur${n > 1 ? "s" : ""}` : "En attente des joueurs…";
  $("prenoms").innerHTML = Object.values(noms).map((p) => `<span>${echapper(p)}</span>`).join("");
  $("lancer").disabled = n === 0;
  if (etat.phase === "question") majReponsesRecues();
}

// ─── Les étapes ──────────────────────────────────────────────────────────────
async function poserQuestion(index) {
  const q = questions[index];
  const cle = String(index);
  // Les choix sont MÉLANGÉS à chaque question : écran et téléphones montrent le même ordre, et
  // tout ce qui suit (réponses, bonne réponse, répartition) se compte dans cet ordre-là.
  const ordre = melanger(q.choix.length);
  await t.ecrire(`parties/${code}/etat`, {
    phase: "question", index, cle, total: questions.length, ordre,
    question: { texte: q.texte, choix: ordre.map((i) => q.choix[i]), duree: q.duree || DUREE_DEFAUT, ...(q.code ? { code: q.code } : {}) },
    debut: t.HORODATAGE,
  });
}

/** La bonne réponse dans l'ordre MONTRÉ (celui de la question en cours). */
function bonneMontree(q) {
  return Array.isArray(etat.ordre) ? etat.ordre.indexOf(q.bonne) : q.bonne;
}

let revelationEnCours = null;
/** Révèle UNE fois (la fin du temps et « tout le monde a répondu » peuvent arriver ensemble). */
function reveler() {
  if (etat.phase !== "question") return;
  if (!revelationEnCours) revelationEnCours = revelerUneFois().finally(() => { revelationEnCours = null; });
  return revelationEnCours;
}

async function revelerUneFois() {
  if (etat.phase !== "question") return;
  const q = questions[etat.index];
  const reponses = (await t.lire(`parties/${code}/reponses/${etat.cle}`)) || {};
  // La manche est archivée (bonne réponse, début, durée) : le classement se recalcule depuis la base.
  const bonne = bonneMontree(q);
  await t.ecrire(`parties/${code}/manches/${etat.cle}`, { bonne, debut: etat.debut, dureeMs: (q.duree || DUREE_DEFAUT) * 1000 });
  const manches = await toutesLesManches();
  const c = classement(joueurs, manches);
  const rangs = {};
  for (const l of c) rangs[l.uid] = { rang: l.rang, score: l.score, gain: l.gain, juste: l.juste };
  await t.ecrire(`parties/${code}/classement`, { rangs, total: c.length, cle: etat.cle });
  await t.maj(`parties/${code}/etat`, { phase: "revelation", bonne, explication: q.explication || "", repartition: repartition(reponses, q.choix.length) });
}

async function toutesLesManches() {
  const manches = (await t.lire(`parties/${code}/manches`)) || {};
  const reponses = (await t.lire(`parties/${code}/reponses`)) || {};
  return Object.keys(manches).sort((a, b) => Number(a) - Number(b)).map((k) => ({ ...manches[k], reponses: reponses[k] || {} }));
}

async function versClassement() { await t.maj(`parties/${code}/etat`, { phase: "classement" }); }

async function suivante() {
  if (etat.index + 1 < questions.length) await poserQuestion(etat.index + 1);
  else await t.maj(`parties/${code}/etat`, { phase: "fin" });
}

/** L'action principale de l'étape en cours (bouton ou barre d'espace). */
function etapeSuivante() {
  if (etat.phase === "attente" && Object.keys(joueurs).length) return poserQuestion(0);
  if (etat.phase === "question") return reveler();
  if (etat.phase === "revelation") return versClassement();
  if (etat.phase === "classement") return suivante();
}

// ─── Affichage selon l'état ──────────────────────────────────────────────────
function afficher() {
  clearInterval(minuteur);
  if (arretReponses && etat.phase !== "question") { arretReponses(); arretReponses = null; }
  const n = etat.total ? `Question ${etat.index + 1} / ${etat.total}` : "";
  $("etat-bandeau").innerHTML = `${n}${n ? " · " : ""}code <strong>${codePourLesJoueurs(code)}</strong>`;
  if (etat.phase === "attente") return montrer("accueil");
  if (etat.phase === "question") return afficherQuestion();
  if (etat.phase === "revelation") return afficherRevelation();
  if (etat.phase === "classement") return afficherClassement();
  if (etat.phase === "fin") return afficherFin();
}

function tuiles(choix, { nombres = null, bonne = null } = {}) {
  const total = nombres ? Math.max(1, ...nombres) : 1;
  return choix.map((c, i) => `
    <div class="tuile c${i}${bonne !== null && i !== bonne ? " eteinte" : ""}${i === bonne ? " bonne" : ""}">
      <span class="barre" data-h="${nombres ? (nombres[i] / total) * 100 : 0}"></span>
      <span class="forme"></span><span>${echapper(c)}</span>
      ${nombres ? `<span class="nombre">${nombres[i]}</span>` : ""}
    </div>`).join("");
}

function afficherQuestion() {
  montrer("question");
  const q = etat.question;
  $("q-texte").textContent = q.texte;
  afficherCode("q-code", q.code);
  $("q-choix").innerHTML = tuiles(q.choix);
  if (!arretReponses) arretReponses = t.ecouter(`parties/${code}/reponses/${etat.cle}`, (r) => { reponsesCourantes = r || {}; majReponsesRecues(); });
  const fin = (etat.debut || t.maintenant()) + q.duree * 1000;
  const tic = () => {
    const reste = Math.max(0, Math.ceil((fin - t.maintenant()) / 1000));
    $("q-temps").textContent = reste;
    $("q-temps").classList.toggle("urgent", reste <= 5);
    if (reste === 0) { clearInterval(minuteur); reveler(); }
  };
  tic();
  minuteur = setInterval(tic, 250);
}

/** Un extrait de code sous la question (questions de programmation). */
function afficherCode(id, code) {
  $(id).textContent = code || "";
  $(id).classList.toggle("cache", !code);
}

function majReponsesRecues() {
  // Seuls les téléphones encore connectés comptent : un étudiant parti ne bloque plus personne.
  const { faits: n, total } = decompte(joueursActifs(joueurs, presents), reponsesCourantes);
  $("q-recues").innerHTML = `${n} / ${total}<small>réponses</small>`;
  // Tout le monde a répondu : inutile d'attendre la fin du temps.
  if (etat.phase === "question" && total > 0 && n >= total) { clearInterval(minuteur); setTimeout(reveler, 700); }
}

function afficherRevelation() {
  montrer("revelation");
  const q = etat.question;
  $("r-texte").textContent = q.texte;
  afficherCode("r-code", q.code);
  $("r-choix").innerHTML = tuiles(q.choix, { nombres: etat.repartition || [], bonne: etat.bonne });
  requestAnimationFrame(() => document.querySelectorAll("#r-choix .barre").forEach((b) => { b.style.height = `${b.dataset.h}%`; }));
  $("r-explication").innerHTML = `<strong>${LETTRES[etat.bonne]} · ${echapper(q.choix[etat.bonne])}</strong><br>${echapper(etat.explication || "")}`;
}

async function lignesClassement() {
  const c = (await t.lire(`parties/${code}/classement`)) || { rangs: {} };
  const noms = prenomsAffiches(joueurs);
  return Object.entries(c.rangs || {}).map(([uid, r]) => ({ ...r, prenom: noms[uid] || "?" })).sort((a, b) => a.rang - b.rang || a.prenom.localeCompare(b.prenom, "fr"));
}

async function afficherClassement() {
  montrer("classement");
  const l = (await lignesClassement()).slice(0, 5);
  $("tableau").innerHTML = l.map((x) => `<li><span class="rang">${x.rang}</span><span>${echapper(x.prenom)}</span><span class="gain">${x.gain ? `+${x.gain}` : ""}</span><span class="score">${x.score}</span></li>`).join("");
  $("suivante").textContent = etat.index + 1 < questions.length ? "Question suivante" : "Résultats";
}

async function afficherFin() {
  montrer("fin");
  const l = await lignesClassement();
  $("podium").innerHTML = l.slice(0, 3).map((x, i) => `
    <div class="marche p${i + 1}"><div class="nom">${echapper(x.prenom)}</div><div class="points">${x.score} pts</div><div class="socle">${i + 1}</div></div>`).join("");
  $("tableau-fin").innerHTML = l.slice(3, 10).map((x) => `<li><span class="rang">${x.rang}</span><span>${echapper(x.prenom)}</span><span class="score">${x.score}</span></li>`).join("");
  sessionStorage.removeItem("quiz-ia-code");
}

// ─── Commandes ───────────────────────────────────────────────────────────────
$("lancer").onclick = () => etapeSuivante();
$("reveler").onclick = () => reveler();
$("vers-classement").onclick = () => versClassement();
$("suivante").onclick = () => suivante();
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); etapeSuivante(); }
});
$("fichier").onchange = async (e) => {
  try {
    const brut = JSON.parse(await e.target.files[0].text());
    const liste = Array.isArray(brut) ? brut : brut.questions;
    const pb = verifierQuestions(liste || []);
    if (!liste?.length || pb.length) throw new Error(pb[0] || "aucune question");
    questions = liste;
    if (brut.titre) titre = brut.titre;
    await publierQuestionsCachees();
    $("titre-quiz").innerHTML = `<strong>${echapper(titre)}</strong>`;
    afficherAccueil();
    erreur("");
  } catch (err) { erreur(`Fichier de questions refusé : ${err.message}`); }
};

demarrer().catch((e) => erreur(/PERMISSION/i.test(e.message) ? "Impossible de démarrer : les règles Firebase ne sont pas à jour. Publie le contenu de database.rules.json (console Firebase → Realtime Database → Règles → Publier), puis recharge." : `Impossible de démarrer : ${e.message}`));
