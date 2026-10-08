// LE TÉLÉPHONE DANS LA SALLE : le prénom une seule fois, puis il suit la salle. Dès que
// l'animateur lance un jeu, il y bascule (prénom transmis, aucune saisie) ; entre deux jeux,
// il attend ici. Un retardataire qui scanne le QR arrive directement dans le jeu en cours.

import { creerTransport } from "./transport.mjs";
import { nettoyerPrenom } from "./jeu.mjs";
import { $, echapper, PRENOM_TRANSMIS, garderPrenom, prenomGarde } from "./commun.mjs";
import { salleDeLAdresse, adresseDuJeu, codeValide } from "./salle.mjs";

const MEMO = "salle-joueur";
let t, salle, prenom;
const montrer = (v) => { for (const x of ["rejoindre", "message"]) $(`v-${x}`).classList.toggle("cache", x !== v); };
const message = (grand, moyen = "") => { montrer("message"); $("m-grand").textContent = grand; $("m-moyen").innerHTML = moyen; };

async function demarrer() {
  t = await creerTransport();
  salle = salleDeLAdresse(location.search, "s") || sessionStorage.getItem(MEMO) || "";
  $("code").value = salle;
  if (salle) $("code").classList.add("cache");
  const place = codeValide(salle) ? await t.lire(`salles/${salle}/joueurs/${t.uid}`) : null;
  if (place) { prenom = place.prenom; return entrer(); }
  $("prenom").value = prenomGarde();
  montrer("rejoindre");
  // Prénom déjà connu (un jeu précédent de la séance) : on entre sans rien redemander.
  if (salle && $("prenom").value) $("form").requestSubmit();
}

$("form").onsubmit = async (e) => {
  e.preventDefault();
  $("erreur").textContent = "";
  const c = $("code").value.trim(), p = nettoyerPrenom($("prenom").value);
  if (!codeValide(c)) return ($("erreur").textContent = "Le code de la salle a 6 chiffres.");
  if (!p) return ($("erreur").textContent = "Entre ton prénom.");
  $("entrer").disabled = true;
  try {
    if (!(await t.lire(`salles/${c}/hote`))) throw new Error("Salle introuvable : vérifie le code.");
    const place = await t.lire(`salles/${c}/joueurs/${t.uid}`);
    if (!place) await t.ecrire(`salles/${c}/joueurs/${t.uid}`, { prenom: p, rejointLe: t.HORODATAGE });
    salle = c; prenom = place?.prenom || p;
    entrer();
  } catch (err) {
    $("erreur").textContent = err.message.includes("PERMISSION") ? "Impossible de rejoindre cette salle." : err.message;
    $("entrer").disabled = false;
    $("code").classList.remove("cache");
  }
};

function entrer() {
  sessionStorage.setItem(MEMO, salle);
  garderPrenom(prenom);
  $("qui").innerHTML = `<strong>${echapper(prenom)}</strong>`;
  $("ou").textContent = `salle ${salle}`;
  t.ecouter(`salles/${salle}/jeu`, (jeu) => {
    const url = jeu && adresseDuJeu(location.href, jeu, salle, t.local);
    if (url) { sessionStorage.setItem(PRENOM_TRANSMIS, prenom); return location.replace(url); }
    message(`Bienvenue ${prenom} !`, "Regarde le grand écran : le prochain jeu arrive.<br>Ton téléphone y passera tout seul.");
  });
}

demarrer().catch((e) => message("Connexion impossible", echapper(e.message)));
