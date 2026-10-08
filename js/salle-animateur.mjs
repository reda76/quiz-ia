// L'ÉCRAN DE LA SALLE (animateur.html) : un QR code et un code pour toute la séance, les prénoms
// arrivés, et le choix du jeu. Lancer un jeu ouvre son écran avec `?salle=` : il annonce sa
// partie à la salle et tous les téléphones y basculent. Revenir ici remet la salle en attente.

import { creerTransport } from "./transport.mjs";
import { $, majPrenoms, partieAnimateur, brancherNouvellePartie } from "./commun.mjs";
import { adresseDeLaSalle, salleDeLAdresse } from "./salle.mjs";

const MEMO = "salle-code";
let t, code;

async function demarrer() {
  // Nouvelle salle : on repart d'une adresse SANS `?salle=` (sinon on retrouverait l'ancienne).
  brancherNouvellePartie(MEMO, $("nouvelle-partie"), () => {
    const q = new URLSearchParams(location.search); q.delete("salle");
    location.replace(`animateur.html${q.toString() ? `?${q}` : ""}`);
  });
  t = await creerTransport();
  $("mode-local").textContent = t.local ? " · mode local" : "";
  // Retour d'un jeu (`?salle=`) : on garde cette salle si c'est la nôtre.
  const voulue = salleDeLAdresse(location.search) || sessionStorage.getItem(MEMO);
  if (voulue && (await t.lire(`salles/${voulue}/hote`)) === t.uid) { code = voulue; sessionStorage.setItem(MEMO, code); }
  else code = await partieAnimateur({ t, racine: "salles", memo: MEMO, creer: async () => ({}) });
  // Ici, aucun jeu n'est en cours : les téléphones attendent le prochain.
  await t.maj(`salles/${code}`, { jeu: null });

  const url = adresseDeLaSalle(location.href, code, t.local);
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  }
  $("adresse").textContent = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  $("code").textContent = code;
  for (const a of document.querySelectorAll(".carte-jeu")) {
    const q = new URLSearchParams({ salle: code }); if (t.local) q.set("local", "1");
    a.href = `${a.dataset.jeu === "quiz" ? "quiz" : a.dataset.jeu}.html?${q}`;
  }
  t.ecouter(`salles/${code}/joueurs`, (j) => majPrenoms(j || {}, null));
}

demarrer().catch((e) => { $("erreur").textContent = /PERMISSION/i.test(e.message) ? "Impossible de créer la salle : les règles Firebase ne la connaissent pas encore. Publie le contenu de database.rules.json (console Firebase → Realtime Database → Règles → Publier), puis recharge." : `Impossible de créer la salle : ${e.message}`; });
