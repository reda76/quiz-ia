// LE TÉLÉPHONE D'UN JOUEUR : il rejoint avec son prénom, puis suit l'état publié par l'écran
// d'animation — attente, question (gros boutons), résultat (juste ou faux, points, rang).
// Il n'écrit que deux choses : son prénom, et UNE réponse par question.

import { creerTransport } from "./transport.mjs";
import { nettoyerPrenom } from "./jeu.mjs";
import { PRENOM_TRANSMIS, garderPrenom, prenomGarde, suivreLaSalle } from "./commun.mjs";
import { adresseDeLaSalle } from "./salle.mjs";

const $ = (id) => document.getElementById(id);
const LETTRES = ["A", "B", "C", "D"];
const MEMO = "quiz-ia-joueur";

let t, code, prenom, etat = {}, monRang = null, dejaRepondu = false, monChoix = null;
let arretRang = null, arretReponse = null;

function montrer(vue) {
  for (const v of ["rejoindre", "message", "question", "resultat"]) $(`v-${v}`).classList.toggle("cache", v !== vue);
  $("v-question").style.display = vue === "question" ? "flex" : "none";
}
function message(grand, moyen = "") { montrer("message"); $("m-grand").textContent = grand; $("m-moyen").textContent = moyen; }

async function demarrer() {
  t = await creerTransport();
  const params = new URLSearchParams(location.search);
  const memo = JSON.parse(sessionStorage.getItem(MEMO) || "null");
  code = params.get("p") || memo?.code || "";
  $("code").value = code;
  if (code) $("code").classList.add("cache");
  // Rechargement en cours de partie : on reprend sans redemander le prénom.
  // Déjà inscrit (rechargement, onglet refermé puis QR rescanné) : on reprend sa place.
  const place = code ? await t.lire(`parties/${code}/joueurs/${t.uid}`) : null;
  if (place) {
    prenom = place.prenom;
    sessionStorage.setItem(MEMO, JSON.stringify({ code, prenom }));
    return suivre();
  }
  montrer("rejoindre");
  $("prenom").value = prenomGarde();
  // Arrivé depuis la salle (ou la page commune) avec un prénom : on rejoint directement.
  const transmis = sessionStorage.getItem(PRENOM_TRANSMIS);
  if (transmis && code) { sessionStorage.removeItem(PRENOM_TRANSMIS); $("prenom").value = transmis; return $("form").requestSubmit(); }
  setTimeout(() => $(code ? "prenom" : "code").focus(), 50);
}

$("form").onsubmit = async (e) => {
  e.preventDefault();
  $("erreur").textContent = "";
  const c = $("code").value.trim();
  const p = nettoyerPrenom($("prenom").value);
  if (!/^\d{6}$/.test(c)) return ($("erreur").textContent = "Le code de la partie a 6 chiffres.");
  if (!p) return ($("erreur").textContent = "Entre ton prénom.");
  $("entrer").disabled = true;
  try {
    // Le code d'une SALLE : on y entre, elle mène au jeu en cours.
    if (await t.lire(`salles/${c}/hote`)) { garderPrenom(p); return location.replace(adresseDeLaSalle(location.href, c, t.local)); }
    if (!(await t.lire(`parties/${c}/hote`))) {
      // Un seul endroit pour rejoindre : le code d'un autre jeu mène à ce jeu, prénom compris.
      for (const [racine, page] of [["jeux", "machine-jouer.html"], ["mots", "mots-jouer.html"], ["groupes", "groupes-jouer.html"]]) {
        if (await t.lire(`${racine}/${c}/hote`)) {
          const u = new URL(page, location.href);
          u.searchParams.set("p", c);
          if (t.local) u.searchParams.set("local", "1");
          sessionStorage.setItem("quiz-ia-prenom-transmis", p);
          return location.replace(u.toString());
        }
      }
      throw new Error("Partie introuvable : vérifie le code.");
    }
    const place = await t.lire(`parties/${c}/joueurs/${t.uid}`);
    if (!place && (await t.lire(`parties/${c}/etat/phase`)) === "fin") throw new Error("Cette partie est terminée.");
    if (!place) await t.ecrire(`parties/${c}/joueurs/${t.uid}`, { prenom: p, rejointLe: t.HORODATAGE });
    code = c; prenom = place?.prenom || p;
    sessionStorage.setItem(MEMO, JSON.stringify({ code, prenom }));
    suivre();
  } catch (err) {
    $("erreur").textContent = err.message.includes("PERMISSION") ? "Impossible de rejoindre cette partie." : err.message;
    $("entrer").disabled = false;
  }
};

function suivre() {
  t.presence(`parties/${code}/presents/${t.uid}`);
  garderPrenom(prenom);
  suivreLaSalle(t, "quiz", code);
  $("qui").innerHTML = `<strong>${prenom.replace(/</g, "&lt;")}</strong>`;
  $("ou").textContent = `partie ${code}`;
  arretRang = t.ecouter(`parties/${code}/classement`, (c) => { monRang = c ? { ...(c.rangs?.[t.uid] || {}), total: c.total, cle: c.cle } : null; afficher(); });
  t.ecouter(`parties/${code}/etat`, (e) => {
    const nouvelleQuestion = e?.cle !== etat?.cle;
    etat = e || {};
    if (nouvelleQuestion) suivreMaReponse();
    afficher();
  });
}

/** Ma réponse à la question en cours (pour ne pas répondre deux fois, même après un rechargement). */
function suivreMaReponse() {
  if (arretReponse) arretReponse();
  dejaRepondu = false; monChoix = null;
  if (etat.cle === undefined) return;
  arretReponse = t.ecouter(`parties/${code}/reponses/${etat.cle}/${t.uid}`, (r) => {
    dejaRepondu = !!r; monChoix = r?.choix ?? null;
    if (etat.phase === "question") afficher();
  });
}

function afficher() {
  if (!prenom) return;
  if (etat.phase === "attente" || !etat.phase) return message(`Bienvenue ${prenom} !`, "Regarde le grand écran : le quiz va commencer.");
  if (etat.phase === "question") {
    if (dejaRepondu) return message("Réponse envoyée ✓", `Tu as choisi ${LETTRES[monChoix] ?? ""}. Attends la révélation…`);
    return afficherQuestion();
  }
  if (etat.phase === "revelation" || etat.phase === "classement") return afficherResultat();
  if (etat.phase === "fin") {
    montrer("resultat");
    $("r-verdict").textContent = "🏁"; $("r-verdict").className = "verdict";
    $("r-titre").textContent = "Quiz terminé !";
    $("r-detail").textContent = monRang?.score !== undefined ? `${monRang.score} points` : "";
    $("r-rang").textContent = monRang?.rang ? `${monRang.rang}${monRang.rang === 1 ? "er" : "e"} sur ${monRang.total}` : "";
  }
}

function afficherQuestion() {
  montrer("question");
  const q = etat.question;
  $("q-texte").textContent = q.texte;
  $("q-code").textContent = q.code || "";
  $("q-code").classList.toggle("cache", !q.code);
  const b = $("q-boutons");
  b.className = `boutons${q.choix.length === 2 ? " deux" : q.choix.length === 3 ? " trois" : ""}`;
  b.innerHTML = q.choix.map((c, i) => `<button class="btn-choix c${i}" data-i="${i}"><span class="forme"></span><span class="${/^[\[\d"']|None|erreur/i.test(c) ? "mono" : ""}">${c.replace(/</g, "&lt;")}</span></button>`).join("");
  b.querySelectorAll("button").forEach((btn) => { btn.onclick = () => repondre(Number(btn.dataset.i)); });
}

async function repondre(i) {
  if (dejaRepondu || etat.phase !== "question") return;
  dejaRepondu = true; monChoix = i;
  message("Réponse envoyée ✓", `Tu as choisi ${LETTRES[i]}. Attends la révélation…`);
  try {
    await t.ecrire(`parties/${code}/reponses/${etat.cle}/${t.uid}`, { choix: i, t: t.HORODATAGE });
  } catch {
    message("Trop tard…", "La question était déjà fermée.");
  }
}

function afficherResultat() {
  montrer("resultat");
  const r = monRang && monRang.cle === etat.cle ? monRang : null;
  const v = $("r-verdict");
  if (!r || r.juste === null || r.juste === undefined) {
    v.textContent = "⏱"; v.className = "verdict";
    $("r-titre").textContent = "Pas de réponse";
    $("r-detail").textContent = `La bonne réponse était ${LETTRES[etat.bonne] ?? "?"}.`;
  } else if (r.juste) {
    v.textContent = "✓"; v.className = "verdict juste";
    $("r-titre").textContent = "Bonne réponse !";
    $("r-detail").textContent = `+${r.gain} points · total ${r.score}`;
  } else {
    v.textContent = "✗"; v.className = "verdict faux";
    $("r-titre").textContent = "Raté…";
    $("r-detail").textContent = `La bonne réponse était ${LETTRES[etat.bonne] ?? "?"}. Total : ${r.score} points`;
  }
  $("r-rang").textContent = r?.rang ? `${r.rang}${r.rang === 1 ? "er" : "e"} sur ${r.total}` : "";
  $("r-rang").classList.toggle("cache", !r?.rang);
}

demarrer().catch((e) => message("Connexion impossible", e.message));
