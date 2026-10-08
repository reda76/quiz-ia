// « LA SALLE EST UN CHATGPT » — le téléphone : la phrase en cours, et UNE proposition par tour.

import { creerTransport } from "./transport.mjs";
import { $, echapper, brancherRejoindre } from "./commun.mjs";
import { FIN, nettoyerMot } from "./mots.mjs";

let t, code, prenom, etat = {}, monMot = null, arretMoi = null;
const montrer = (v) => { for (const x of ["rejoindre", "message", "saisie"]) $(`v-${x}`).classList.toggle("cache", x !== v); };
const message = (grand, moyen = "") => { montrer("message"); $("m-grand").textContent = grand; $("m-moyen").innerHTML = moyen; };

async function demarrer() {
  t = await creerTransport();
  await brancherRejoindre({ t, racine: "mots", memo: "mots-joueur", montrer, rejoint: suivre });
}

function suivre(c, p) {
  code = c; prenom = p;
  $("qui").innerHTML = `<strong>${echapper(prenom)}</strong>`;
  $("ou").textContent = `partie ${code}`;
  t.ecouter(`mots/${code}/etat`, (e) => {
    const nouveauTour = e?.cle !== etat?.cle;
    etat = e || {};
    if (nouveauTour) suivreMonMot();
    afficher();
  });
}

function suivreMonMot() {
  if (arretMoi) arretMoi();
  monMot = null;
  if (!etat.cle) return;
  arretMoi = t.ecouter(`mots/${code}/propositions/${etat.cle}/${t.uid}`, (r) => { monMot = r?.mot ?? null; if (etat.phase === "saisie") afficher(); });
}

function afficher() {
  if (!etat.phase || etat.phase === "attente") return message(`Bienvenue ${prenom} !`, "Regarde le grand écran : la phrase va commencer.");
  if (etat.phase === "saisie") {
    if (monMot) return message("Envoyé ✓", `Ta proposition : <b>${monMot === FIN ? "fin de phrase" : echapper(monMot)}</b><br>Attends le tirage…`);
    montrer("saisie");
    $("s-phrase").innerHTML = `${echapper(etat.phrase)} <span class="trou">…</span>`;
    return;
  }
  if (etat.phase === "tirage") {
    const c = etat.choisi;
    if (!c) return message("Personne n'a proposé…", "");
    const moi = monMot && monMot === c.mot;
    return message(moi ? "C'était ton mot ! 🎉" : c.mot === FIN ? "Fin de phrase" : `« ${c.mot} »`,
      `${c.mot === FIN ? "La salle a choisi de finir la phrase" : "La salle a choisi ce mot"} (${Math.round(c.p * 100)} % des propositions).${monMot && !moi ? `<br>Toi, tu avais proposé <b>${monMot === FIN ? "la fin" : echapper(monMot)}</b>.` : ""}`);
  }
  if (etat.phase === "fin") return message("La phrase de la salle", `<span class="phrase-finale">${echapper(etat.phrase)}.</span>`);
}

/** Rend vrai si la proposition est partie (le champ peut alors être vidé). */
async function envoyer(brut) {
  const mot = nettoyerMot(brut);
  // Un emoji ou de la ponctuation seule ne fait pas un mot : on le DIT, au lieu de vider le champ en silence.
  $("s-erreur").textContent = !mot && String(brut).trim() ? "Écris un mot avec des lettres (pas seulement un emoji)." : "";
  if (!mot || etat.phase !== "saisie" || monMot) return false;
  monMot = mot;
  afficher();
  try { await t.ecrire(`mots/${code}/propositions/${etat.cle}/${t.uid}`, { mot, t: t.HORODATAGE }); }
  catch { message("Trop tard…", "Le tour était déjà fermé."); }
}

$("f-mot").onsubmit = (e) => { e.preventDefault(); const brut = $("mot").value; envoyer(brut).then((parti) => { if (parti !== false) $("mot").value = ""; }); };
$("fin-phrase").onclick = () => envoyer(FIN);
demarrer().catch((e) => message("Connexion impossible", e.message));
