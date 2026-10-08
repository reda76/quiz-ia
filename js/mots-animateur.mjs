// « LA SALLE EST UN CHATGPT » — l'écran d'animation. Il pose le début de la phrase, ouvre chaque
// tour de propositions, montre les probabilités en direct, tire le mot (au hasard selon les
// probabilités, ou le plus probable) et allonge la phrase, jusqu'à ce que la salle la finisse.

import { creerTransport } from "./transport.mjs";
import { $, echapper, afficherAccueil, majPrenoms, partieAnimateur, brancherNouvellePartie, annoncerALaSalle, codePourLesJoueurs } from "./commun.mjs";
import { DEBUTS, FIN, distribution, tirer, ajouter, suiteDuTour } from "./mots.mjs";
import { decompte, joueursActifs } from "./jeu.mjs";

const TOURS_MAX = 25;
let t, code, etat = { phase: "attente" }, joueurs = {}, presents = {}, propositions = {}, arretProps = null, minuteur = null, tirageEnCours = null;
const chemin = (s = "") => `mots/${code}${s ? `/${s}` : ""}`;
const montrer = (v) => { for (const x of ["accueil", "jeu"]) $(`v-${x}`).classList.toggle("cache", x !== v); };
const pct = (p) => `${Math.round(p * 100)} %`;

async function demarrer() {
  brancherNouvellePartie("mots-code");
  t = await creerTransport();
  $("mode-local").textContent = t.local ? " · mode local" : "";
  // Le début est libre ; les suggestions le remplissent d'un clic.
  $("debut").value = DEBUTS[0];
  $("suggestions").innerHTML = DEBUTS.map((d, i) => `<button type="button" class="suggestion" data-i="${i}">${echapper(d)}…</button>`).join("");
  document.querySelectorAll(".suggestion").forEach((b) => { b.onclick = () => { $("debut").value = DEBUTS[b.dataset.i]; $("debut").focus(); }; });
  code = await partieAnimateur({ t, racine: "mots", memo: "mots-code", creer: async () => ({ etat: { phase: "attente" } }) });
  await annoncerALaSalle(t, "mots", code);
  afficherAccueil("mots-jouer.html", code, t.local);
  t.ecouter(chemin("joueurs"), (j) => { joueurs = j || {}; majPrenoms(joueurs); majRecues(); });
  t.ecouter(chemin("presents"), (p) => { presents = p || {}; majRecues(); });
  t.ecouter(chemin("etat"), (e) => { etat = e || { phase: "attente" }; afficher(); });
}

// ─── Les étapes ──────────────────────────────────────────────────────────────
async function commencer() {
  const debut = $("debut").value.trim() || DEBUTS[0];
  await t.ecrire(chemin("propositions"), null); // les tours de la phrase précédente
  await t.ecrire(chemin("etat"), {
    phase: "saisie", tour: 1, cle: "1", phrase: debut.replace(/\s+/g, " "),
    mode: $("mode").value, duree: Number($("duree").value) || 15, debut: t.HORODATAGE,
  });
}

/** Ferme le tour : on calcule la distribution et on tire le mot (une seule fois). */
function fermerTour() {
  if (etat.phase !== "saisie") return;
  if (!tirageEnCours) tirageEnCours = (async () => {
    const props = (await t.lire(chemin(`propositions/${etat.cle}`))) || {};
    const dist = distribution(props);
    const choisi = tirer(dist, etat.mode);
    await t.maj(chemin("etat"), { phase: "tirage", dist: dist.slice(0, 10), choisi: choisi || null });
  })().finally(() => { tirageEnCours = null; });
  return tirageEnCours;
}

async function tourSuivant() {
  const suite = suiteDuTour(etat.choisi, etat.tour, TOURS_MAX);
  const phrase = ajouter(etat.phrase, etat.choisi?.mot);
  if (suite === "fin") return t.maj(chemin("etat"), { phase: "fin", phrase });
  // Rejouer = même mot, nouveau compte à rebours ; la clé change pour que les téléphones
  // repartent d'une saisie vierge.
  const tour = suite === "rejouer" ? etat.tour : etat.tour + 1;
  const cle = suite === "rejouer" ? `${tour}-${Date.now().toString(36)}` : String(tour);
  await t.ecrire(chemin("etat"), { ...etat, phase: "saisie", tour, cle, phrase, debut: t.HORODATAGE, dist: null, choisi: null });
}

async function finir() {
  const phrase = etat.phase === "tirage" ? ajouter(etat.phrase, etat.choisi?.mot) : etat.phrase;
  await t.maj(chemin("etat"), { phase: "fin", phrase });
}

function etapeSuivante() {
  if (etat.phase === "attente" && Object.keys(joueurs).length) return commencer();
  if (etat.phase === "saisie") return fermerTour();
  if (etat.phase === "tirage") return tourSuivant();
}

// ─── Affichage ───────────────────────────────────────────────────────────────
function afficher() {
  clearInterval(minuteur);
  if (arretProps && etat.phase !== "saisie") { arretProps(); arretProps = null; }
  $("etat-bandeau").innerHTML = `${etat.tour ? `mot ${etat.tour} · ` : ""}code <strong>${codePourLesJoueurs(code)}</strong>`;
  if (etat.phase === "attente") return montrer("accueil");
  montrer("jeu");
  $("morale").classList.add("cache");
  document.querySelector(".barres-cadre").classList.toggle("cache", etat.phase === "fin");
  $("finir").classList.toggle("cache", etat.phase === "fin");
  $("action").classList.remove("cache");
  if (etat.phase === "saisie") {
    $("phrase").innerHTML = `${echapper(etat.phrase)} <span class="curseur-texte">▍</span>`;
    $("tire").classList.add("cache");
    $("b-titre").textContent = "Le mot suivant, selon la salle";
    $("action").textContent = "Tirer le mot";
    $("action").onclick = fermerTour;
    if (!arretProps) arretProps = t.ecouter(chemin(`propositions/${etat.cle}`), (p) => { propositions = p || {}; dessinerBarres(distribution(propositions)); majRecues(); });
    const fin = (etat.debut || t.maintenant()) + etat.duree * 1000;
    const tic = () => {
      const reste = Math.max(0, Math.ceil((fin - t.maintenant()) / 1000));
      $("temps").textContent = reste;
      $("temps").classList.toggle("urgent", reste <= 3);
      if (reste === 0) fermerTour();
    };
    tic();
    minuteur = setInterval(tic, 250);
  } else if (etat.phase === "tirage") {
    $("temps").textContent = "";
    $("action").textContent = "Mot suivant";
    $("action").onclick = tourSuivant;
    animerTirage();
  } else if (etat.phase === "fin") {
    $("phrase").innerHTML = `${echapper(etat.phrase)}.`;
    $("temps").textContent = "";
    $("recues").textContent = "";
    $("tire").classList.add("cache");
    $("b-titre").textContent = "";
    $("barres").innerHTML = "";
    $("action").textContent = "Nouvelle phrase";
    $("action").onclick = () => t.ecrire(chemin("etat"), { phase: "attente" });
    $("morale").classList.remove("cache");
  }
}

function majRecues() {
  if (etat.phase !== "saisie") return;
  const { faits: n, total } = decompte(joueursActifs(joueurs, presents), propositions);
  $("recues").innerHTML = `<b>${n}</b> / ${total} propositions`;
  if (total > 0 && n >= total) { clearInterval(minuteur); setTimeout(fermerTour, 600); }
}

function dessinerBarres(dist, surligne = null) {
  $("barres").innerHTML = dist.slice(0, 8).map((d) => `
    <li class="${surligne === d.mot ? "choisi" : ""}${d.mot === FIN ? " fin" : ""}">
      <span class="mot">${d.mot === FIN ? "⏹ fin de phrase" : echapper(d.mot)}</span>
      <span class="jauge"><span style="width:${Math.max(3, d.p * 100)}%"></span></span>
      <span class="proba">${pct(d.p)}</span>
    </li>`).join("") || `<li class="vide">Les propositions arrivent…</li>`;
}

/** La « roulette » : le surlignage passe sur les mots, de plus en plus lentement, puis s'arrête. */
function animerTirage() {
  const dist = etat.dist || [];
  const choisi = etat.choisi;
  $("phrase").innerHTML = `${echapper(etat.phrase)} <span class="curseur-texte">▍</span>`;
  if (!choisi) {
    dessinerBarres([]);
    $("tire").classList.remove("cache");
    $("tire").innerHTML = `Personne n'a proposé de mot. <small>On rejoue ce mot.</small>`;
    const tourVide = etat.cle;
    setTimeout(() => { if (etat.phase === "tirage" && etat.cle === tourVide) tourSuivant(); }, 2500);
    return;
  }
  $("tire").classList.add("cache");
  const mots = dist.slice(0, 8).map((d) => d.mot);
  let i = 0, delai = 70;
  const tour = () => {
    if (etat.phase !== "tirage") return;
    if (delai > 380 || mots.length <= 1) {
      dessinerBarres(dist, choisi.mot);
      const mot = choisi.mot === FIN ? "fin de phrase" : `« ${choisi.mot} »`;
      $("tire").innerHTML = `${echapper(mot)} <small>tiré avec ${pct(choisi.p)} de chances${etat.mode === "probable" ? " — le plus probable" : ""}</small>`;
      $("tire").classList.remove("cache");
      if (choisi.mot !== FIN) $("phrase").innerHTML = `${echapper(etat.phrase)} <span class="nouveau-mot">${echapper(choisi.mot)}</span>`;
      // On enchaîne seul au mot suivant (le bouton permet d'aller plus vite).
      const tourTire = etat.tour;
      setTimeout(() => { if (etat.phase === "tirage" && etat.tour === tourTire) tourSuivant(); }, 3500);
      return;
    }
    dessinerBarres(dist, mots[i++ % mots.length]);
    delai *= 1.18;
    setTimeout(tour, delai);
  };
  tour();
}

// ─── Commandes ───────────────────────────────────────────────────────────────
$("lancer").onclick = commencer;
$("finir").onclick = finir;
document.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT"].includes(e.target.tagName)) return;
  if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); etapeSuivante(); }
});
demarrer().catch((e) => { $("erreur").textContent = /PERMISSION/i.test(e.message) ? "Impossible de démarrer : les règles Firebase ne connaissent pas encore ce jeu. Publie le contenu de database.rules.json (console Firebase → Realtime Database → Règles → Publier), puis recharge." : `Impossible de démarrer : ${e.message}`; });
