// Ce que partagent les écrans d'animation et les téléphones des jeux : échapper un texte, le
// QR code, l'accueil (prénoms qui arrivent) et la façon de REJOINDRE une partie.

import { nettoyerPrenom, prenomsAffiches } from "./jeu.mjs";
import { salleDeLAdresse, doitQuitter, adresseDeLaSalle } from "./salle.mjs";

export const $ = (id) => document.getElementById(id);
export const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const rang = (n) => `${n}${n === 1 ? "er" : "e"}`;
/** Clé où la page commune (jouer.html) dépose le prénom avant de rediriger vers un jeu. */
export const PRENOM_TRANSMIS = "quiz-ia-prenom-transmis";
/** Le prénom du téléphone, gardé pour toute la séance (la salle ne le redemande pas). */
export const PRENOM_GARDE = "quiz-ia-prenom";
// En mode local, chaque ONGLET joue un téléphone : le prénom est gardé par onglet.
const memoirePrenom = () => (new URLSearchParams(location.search).has("local") ? sessionStorage : localStorage);
export const garderPrenom = (p) => { try { memoirePrenom().setItem(PRENOM_GARDE, p); } catch { /* navigation privée */ } };
export const prenomGarde = () => { try { return memoirePrenom().getItem(PRENOM_GARDE) || ""; } catch { return ""; } };

// ─── La salle (un QR pour toute la séance, cf. salle.mjs) ─────────────────────
/** La salle dont fait partie cette page (`?salle=`), ou null hors salle. */
export const SALLE = salleDeLAdresse(location.search);

/** Écran d'un jeu : annonce à la salle le jeu en cours, pour que les téléphones y basculent. */
export async function annoncerALaSalle(t, type, code) {
  if (!SALLE) return;
  try { await t.maj(`salles/${SALLE}`, { jeu: { type, code } }); }
  catch (e) { console.warn("[salle] annonce impossible :", e.message); }
}

/** Téléphone d'un jeu : repart vers la salle dès que l'animateur change de jeu ou de partie. */
export function suivreLaSalle(t, type, code) {
  if (!SALLE) return;
  t.ecouter(`salles/${SALLE}/jeu`, (jeu) => {
    if (doitQuitter(jeu, type, code)) location.replace(adresseDeLaSalle(location.href, SALLE, t.local));
  });
}

/** L'adresse que scannent les téléphones pour ce jeu. */
export function urlJoueur(page, code, local) {
  const u = new URL(page, location.href);
  u.searchParams.set("p", code);
  if (local) u.searchParams.set("local", "1");
  return u.toString();
}

/** QR code, adresse et code de la partie sur l'accueil d'un écran d'animation. */
export function afficherAccueil(page, code, local) {
  const url = urlPourLesJoueurs(page, code, local);
  code = codePourLesJoueurs(code);
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  }
  $("adresse").textContent = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  $("code").textContent = code;
  poserQrRappel(url, code);
  brancherRetourAuChoix(local);
}

/** Dans une salle, le QR et le code de TOUS les jeux sont ceux de la salle. */
export function urlPourLesJoueurs(page, code, local) {
  return SALLE ? adresseDeLaSalle(location.href, SALLE, local) : urlJoueur(page, code, local);
}
export const codePourLesJoueurs = (code) => SALLE || code;

/** « Changer de jeu » : retour à l'écran de la salle (les téléphones attendent le jeu suivant). */
export function brancherRetourAuChoix(local) {
  const q = new URLSearchParams();
  if (SALLE) q.set("salle", SALLE);
  if (local) q.set("local", "1");
  document.querySelectorAll(".retour-choix").forEach((a) => { a.href = `animateur.html${q.toString() ? `?${q}` : ""}`; });
}

/** Les prénoms qui arrivent, et le bouton de lancement qui s'active au premier. */
export function majPrenoms(joueurs, bouton = $("lancer")) {
  const n = Object.keys(joueurs).length;
  $("compte").textContent = n ? `${n} joueur${n > 1 ? "s" : ""}` : "En attente des joueurs…";
  $("prenoms").innerHTML = Object.values(prenomsAffiches(joueurs)).map((p) => `<span>${echapper(p)}</span>`).join("");
  if (bouton) bouton.disabled = n === 0;
}

/**
 * Le formulaire « Rejoindre » d'un téléphone (ids : form, code, prenom, entrer, erreur).
 * Reprend la place d'un joueur déjà inscrit (rechargement), accepte un prénom transmis par la
 * page commune, puis appelle `rejoint(code, prenom)`.
 * @param {{ t:object, racine:string, memo:string, montrer:(vue:string)=>void, rejoint:(code:string, prenom:string)=>void }} o
 */
export async function brancherRejoindre({ t, racine, memo, montrer, rejoint: suivre }) {
  const type = { parties: "quiz", jeux: "machine", mots: "mots", groupes: "groupes" }[racine];
  const rejoint = (c, p) => { t.presence(`${racine}/${c}/presents/${t.uid}`); garderPrenom(p); suivreLaSalle(t, type, c); return suivre(c, p); };
  const params = new URLSearchParams(location.search);
  const souvenir = JSON.parse(sessionStorage.getItem(memo) || "null");
  const code = params.get("p") || souvenir?.code || "";
  $("code").value = code;
  if (code) $("code").classList.add("cache");
  // Déjà inscrit (rechargement, onglet refermé puis QR rescanné) : on reprend sa place.
  const place = code ? await t.lire(`${racine}/${code}/joueurs/${t.uid}`) : null;
  if (place) { sessionStorage.setItem(memo, JSON.stringify({ code, prenom: place.prenom })); return rejoint(code, place.prenom); }

  $("form").onsubmit = async (e) => {
    e.preventDefault();
    $("erreur").textContent = "";
    const c = $("code").value.trim(), p = nettoyerPrenom($("prenom").value);
    if (!/^\d{6}$/.test(c)) return ($("erreur").textContent = "Le code de la partie a 6 chiffres.");
    if (!p) return ($("erreur").textContent = "Entre ton prénom.");
    $("entrer").disabled = true;
    try {
      if (!(await t.lire(`${racine}/${c}/hote`))) throw new Error("Partie introuvable : vérifie le code.");
      const place = await t.lire(`${racine}/${c}/joueurs/${t.uid}`);
      if (!place) await t.ecrire(`${racine}/${c}/joueurs/${t.uid}`, { prenom: p, rejointLe: t.HORODATAGE });
      const prenom = place?.prenom || p;
      sessionStorage.setItem(memo, JSON.stringify({ code: c, prenom }));
      rejoint(c, prenom);
    } catch (err) {
      $("erreur").textContent = err.message.includes("PERMISSION") ? "Impossible de rejoindre cette partie." : err.message;
      $("entrer").disabled = false;
    }
  };
  montrer("rejoindre");
  $("prenom").value = prenomGarde();
  const transmis = sessionStorage.getItem(PRENOM_TRANSMIS);
  if (transmis && code) { sessionStorage.removeItem(PRENOM_TRANSMIS); $("prenom").value = transmis; $("form").requestSubmit(); }
}

/** Démarrage d'un écran d'animation : reprend la partie de cet onglet, ou en crée une. */
export async function partieAnimateur({ t, racine, memo, creer }) {
  const precedent = sessionStorage.getItem(memo);
  if (precedent && (await t.lire(`${racine}/${precedent}/hote`)) === t.uid) return precedent;
  const { genererCode } = await import("./jeu.mjs");
  const code = genererCode();
  await t.ecrire(`${racine}/${code}`, { hote: t.uid, creeLe: t.HORODATAGE, ...(await creer()) });
  sessionStorage.setItem(memo, code);
  return code;
}

/**
 * Le bouton « Nouvelle partie » du bandeau : l'écran oublie la partie de cet onglet et en crée
 * une autre (nouveau code, à rescanner). Deux clics : le premier arme, le second confirme ; sans
 * second clic, le bouton se désarme seul.
 */
export function brancherNouvellePartie(memo, bouton = $("nouvelle-partie"), recommencer = () => location.reload()) {
  if (!bouton) return;
  const libelle = bouton.textContent;
  let arme = null;
  const desarmer = () => { clearTimeout(arme); arme = null; bouton.textContent = libelle; bouton.classList.remove("armee"); };
  bouton.onclick = () => {
    if (!arme) {
      bouton.textContent = "Confirmer : nouvelle partie ?";
      bouton.classList.add("armee");
      arme = setTimeout(desarmer, 4000);
      return;
    }
    desarmer();
    sessionStorage.removeItem(memo);
    recommencer();
  };
}

/**
 * Le QR de RAPPEL : hors de l'accueil (où le grand QR est déjà là), un petit QR et le code
 * restent dans une colonne à droite, pour qu'un joueur qui a perdu le fil revienne à tout moment.
 */
export function poserQrRappel(url, code) {
  let coin = document.getElementById("qr-rappel");
  if (!coin) {
    coin = document.createElement("aside");
    coin.id = "qr-rappel";
    coin.className = "qr-rappel";
    coin.innerHTML = `<div class="qr-rappel-img"></div><div class="qr-rappel-texte">Rejoindre<br><b></b></div>`;
    document.body.appendChild(coin);
    const accueil = document.getElementById("v-accueil");
    const maj = () => document.body.classList.toggle("avec-qr-rappel", !!accueil && accueil.classList.contains("cache"));
    if (accueil) new MutationObserver(maj).observe(accueil, { attributes: true, attributeFilter: ["class"] });
    maj();
  }
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    coin.querySelector(".qr-rappel-img").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
  }
  coin.querySelector("b").textContent = code;
}
