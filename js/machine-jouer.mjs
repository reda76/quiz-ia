// « BATTEZ LA MACHINE » — le téléphone d'un joueur : deux curseurs (b et w), sa droite sur un
// petit graphique, son écart moyen et son rang en direct. Il n'écrit que son prénom et SA droite
// (pendant la manche seulement).

import { creerTransport } from "./transport.mjs";
import { nettoyerPrenom } from "./jeu.mjs";
import { BORNES, borner, ecartMoyen, couleurDe, fr } from "./machine.mjs";
import { dessiner } from "./graphique.mjs";

const $ = (id) => document.getElementById(id);
const MEMO = "machine-joueur";
let t, code, prenom, etat = {}, courses = [], rang = null, machine = null;
let w = 0, b = 0, enAttente = null;

function montrer(vue) { for (const v of ["rejoindre", "message", "jeu"]) $(`v-${v}`).classList.toggle("cache", v !== vue); }
function message(grand, moyen = "") { montrer("message"); $("m-grand").textContent = grand; $("m-moyen").innerHTML = moyen; }

async function demarrer() {
  t = await creerTransport();
  const params = new URLSearchParams(location.search);
  const memo = JSON.parse(sessionStorage.getItem(MEMO) || "null");
  code = params.get("p") || memo?.code || "";
  $("code").value = code;
  if (code) $("code").classList.add("cache");
  for (const c of ["w", "b"]) Object.assign($(`r-${c}`), { min: BORNES[c].min, max: BORNES[c].max, step: BORNES[c].pas });
  if (memo && memo.code === code && (await t.lire(`jeux/${code}/joueurs/${t.uid}`))) { prenom = memo.prenom; return suivre(); }
  montrer("rejoindre");
  // Arrivé depuis la page commune avec un prénom déjà saisi : on rejoint directement.
  const prenomTransmis = sessionStorage.getItem("machine-prenom");
  if (prenomTransmis && code) { sessionStorage.removeItem("machine-prenom"); $("prenom").value = prenomTransmis; $("form").requestSubmit(); }
}

$("form").onsubmit = async (e) => {
  e.preventDefault();
  $("erreur").textContent = "";
  const c = $("code").value.trim(), p = nettoyerPrenom($("prenom").value);
  if (!/^\d{6}$/.test(c)) return ($("erreur").textContent = "Le code de la partie a 6 chiffres.");
  if (!p) return ($("erreur").textContent = "Entre ton prénom.");
  $("entrer").disabled = true;
  try {
    if (!(await t.lire(`jeux/${c}/hote`))) throw new Error("Partie introuvable : vérifie le code.");
    await t.ecrire(`jeux/${c}/joueurs/${t.uid}`, { prenom: p, rejointLe: t.HORODATAGE });
    code = c; prenom = p;
    sessionStorage.setItem(MEMO, JSON.stringify({ code, prenom }));
    suivre();
  } catch (err) {
    $("erreur").textContent = err.message.includes("PERMISSION") ? "Impossible de rejoindre cette partie." : err.message;
    $("entrer").disabled = false;
  }
};

function suivre() {
  $("qui").innerHTML = `<strong>${prenom.replace(/</g, "&lt;")}</strong>`;
  $("ou").textContent = `partie ${code}`;
  t.ecouter(`jeux/${code}/courses`, (c) => { courses = c || []; afficher(); });
  t.ecouter(`jeux/${code}/classement`, (c) => { rang = c ? { ...(c.rangs?.[t.uid] || {}), total: c.total } : null; majScore(); afficher(); });
  t.ecouter(`jeux/${code}/machine`, (m) => { machine = m; afficher(); });
  t.ecouter(`jeux/${code}/droites/${t.uid}`, (d) => { if (d && !enAttente) { w = d.w; b = d.b; } });
  t.ecouter(`jeux/${code}/etat`, (e) => {
    // Seule une NOUVELLE manche (numéro qui change) remet les curseurs à zéro ; un simple
    // changement de phase ne touche jamais la droite du joueur.
    const nouvelleManche = etat?.manche !== undefined && e?.manche !== etat.manche;
    etat = e || {};
    if (nouvelleManche && etat.phase === "jeu") { w = 0; b = 0; envoyer(); }
    afficher();
  });
}

function afficher() {
  if (!prenom) return;
  if (!etat.phase || etat.phase === "attente") return message(`Bienvenue ${prenom} !`, "Regarde le grand écran : la manche va commencer.");
  if (etat.phase === "jeu") return afficherJeu();
  const monEcart = courses.length ? ecartMoyen(courses, w, b) : 0;
  if (etat.phase === "stop") return message("Temps écoulé !", `Ton écart moyen : <b>${fr(monEcart)} €</b>${rang?.rang ? ` · ${rang.rang}${rang.rang === 1 ? "er" : "e"} sur ${rang.total}` : ""}<br>Regarde l'écran : la machine va jouer.`);
  if (etat.phase === "machine") return message("La machine apprend…", `Son écart : <b>${machine ? fr(machine.ecart) : "…"} €</b><br>Le tien : <b>${fr(monEcart)} €</b>`);
  if (etat.phase === "resultat") {
    const m = machine ? machine.ecart : null;
    const gagne = m !== null && monEcart < m;
    return message(gagne ? "Tu as battu la machine ! 🎉" : "La machine t'a battu",
      `Ton écart : <b>${fr(monEcart)} €</b> · la machine : <b>${m !== null ? fr(m) : "…"} €</b>${rang?.rang ? `<br>${rang.rang}${rang.rang === 1 ? "er" : "e"} sur ${rang.total}, machine comprise` : ""}`);
  }
}

function afficherJeu() {
  montrer("jeu");
  $("r-w").value = w; $("r-b").value = b;
  $("v-w").textContent = `${fr(w)} €/km`;
  $("v-b").textContent = `${fr(b)} €`;
  if (courses.length) dessiner($("mini"), courses, [{ w, b, couleur: couleurDe(t.uid), epaisseur: 5, opacite: 1 }], { largeur: 600, hauteur: 380, police: 22, residus: { w, b } });
  majScore();
}

function majScore() {
  if (!courses.length) return;
  $("j-ecart").innerHTML = `${fr(ecartMoyen(courses, w, b))} €<small>ton écart moyen</small>`;
  $("j-rang").textContent = rang?.rang ? `${rang.rang}${rang.rang === 1 ? "er" : "e"} / ${rang.total}` : "";
}

/** Envoi de la droite, au plus toutes les 150 ms (les curseurs bougent en continu). */
function envoyer() {
  if (enAttente || etat.phase !== "jeu") return;
  enAttente = setTimeout(async () => {
    enAttente = null;
    try { await t.ecrire(`jeux/${code}/droites/${t.uid}`, { w, b }); } catch { /* manche finie : refusé, c'est normal */ }
  }, 150);
}

function regler(c, v) {
  if (etat.phase !== "jeu") return;
  if (c === "w") w = borner("w", v); else b = borner("b", v);
  afficherJeu();
  envoyer();
}
$("r-w").oninput = (e) => regler("w", e.target.value);
$("r-b").oninput = (e) => regler("b", e.target.value);
document.querySelectorAll(".pas button").forEach((btn) => {
  btn.onclick = () => regler(btn.dataset.c, (btn.dataset.c === "w" ? w : b) + Number(btn.dataset.s) * BORNES[btn.dataset.c].pas);
});

demarrer().catch((e) => message("Connexion impossible", e.message));
