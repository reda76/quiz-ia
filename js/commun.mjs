// Ce que partagent les écrans d'animation et les téléphones des jeux : échapper un texte, le
// QR code, l'accueil (prénoms qui arrivent) et la façon de REJOINDRE une partie.

import { nettoyerPrenom, prenomsAffiches } from "./jeu.mjs";

export const $ = (id) => document.getElementById(id);
export const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const rang = (n) => `${n}${n === 1 ? "er" : "e"}`;
/** Clé où la page commune (jouer.html) dépose le prénom avant de rediriger vers un jeu. */
export const PRENOM_TRANSMIS = "quiz-ia-prenom-transmis";

/** L'adresse que scannent les téléphones pour ce jeu. */
export function urlJoueur(page, code, local) {
  const u = new URL(page, location.href);
  u.searchParams.set("p", code);
  if (local) u.searchParams.set("local", "1");
  return u.toString();
}

/** QR code, adresse et code de la partie sur l'accueil d'un écran d'animation. */
export function afficherAccueil(page, code, local) {
  const url = urlJoueur(page, code, local);
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  }
  $("adresse").textContent = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  $("code").textContent = code;
  document.querySelectorAll(".retour-choix").forEach((a) => { a.href = `animateur.html${local ? "?local=1" : ""}`; });
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
export async function brancherRejoindre({ t, racine, memo, montrer, rejoint }) {
  const params = new URLSearchParams(location.search);
  const souvenir = JSON.parse(sessionStorage.getItem(memo) || "null");
  const code = params.get("p") || souvenir?.code || "";
  $("code").value = code;
  if (code) $("code").classList.add("cache");
  if (souvenir && souvenir.code === code && (await t.lire(`${racine}/${code}/joueurs/${t.uid}`))) return rejoint(code, souvenir.prenom);

  $("form").onsubmit = async (e) => {
    e.preventDefault();
    $("erreur").textContent = "";
    const c = $("code").value.trim(), p = nettoyerPrenom($("prenom").value);
    if (!/^\d{6}$/.test(c)) return ($("erreur").textContent = "Le code de la partie a 6 chiffres.");
    if (!p) return ($("erreur").textContent = "Entre ton prénom.");
    $("entrer").disabled = true;
    try {
      if (!(await t.lire(`${racine}/${c}/hote`))) throw new Error("Partie introuvable : vérifie le code.");
      await t.ecrire(`${racine}/${c}/joueurs/${t.uid}`, { prenom: p, rejointLe: t.HORODATAGE });
      sessionStorage.setItem(memo, JSON.stringify({ code: c, prenom: p }));
      rejoint(c, p);
    } catch (err) {
      $("erreur").textContent = err.message.includes("PERMISSION") ? "Impossible de rejoindre cette partie." : err.message;
      $("entrer").disabled = false;
    }
  };
  montrer("rejoindre");
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
