import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { points, repartition, classement, prenomsAffiches, nettoyerPrenom, genererCode, verifierQuestions, melanger, joueursActifs, decompte } from "../js/jeu.mjs";
import { connecterAnonyme } from "../js/transport.mjs";
import { QUESTIONS } from "../js/questions.mjs";

describe("points", () => {
  it("rien si faux ; 1000 instantané, 500 au dernier moment, entre les deux sinon", () => {
    assert.equal(points(false, 0, 20000), 0);
    assert.equal(points(true, 0, 20000), 1000);
    assert.equal(points(true, 20000, 20000), 500);
    assert.equal(points(true, 10000, 20000), 750);
    assert.equal(points(true, 99999, 20000), 500, "une réponse tardive juste vaut le minimum");
  });
});

describe("répartition et classement", () => {
  const joueurs = { a: { prenom: "Léa", rejointLe: 1 }, b: { prenom: "Tom", rejointLe: 2 }, c: { prenom: "Inès", rejointLe: 3 } };
  const m1 = { bonne: 1, debut: 1000, dureeMs: 20000, reponses: { a: { choix: 1, t: 1000 }, b: { choix: 1, t: 11000 }, c: { choix: 0, t: 2000 } } };
  const m2 = { bonne: 2, debut: 50000, dureeMs: 20000, reponses: { c: { choix: 2, t: 50000 }, b: { choix: 0, t: 51000 } } };

  it("compte les réponses par choix, en ignorant les choix invalides", () => {
    assert.deepEqual(repartition({ ...m1.reponses, z: { choix: 9 } }, 4), [1, 2, 0, 0]);
  });

  it("additionne les manches, dit le gain de la dernière, gère l'absence de réponse", () => {
    const c = classement(joueurs, [m1, m2]);
    assert.deepEqual(c.map((l) => [l.prenom, l.score, l.gain, l.juste, l.rang]), [
      ["Léa", 1000, 0, null, 1],
      ["Inès", 1000, 1000, true, 1],
      ["Tom", 750, 0, false, 3],
    ].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], "fr")));
  });

  it("deux prénoms identiques se distinguent", () => {
    assert.deepEqual(prenomsAffiches({ x: { prenom: "Léa", rejointLe: 1 }, y: { prenom: "léa", rejointLe: 2 } }), { x: "Léa", y: "léa (2)" });
  });
});

describe("saisies et questions", () => {
  it("prénom nettoyé, code à 6 chiffres", () => {
    assert.equal(nettoyerPrenom("  Jean   Marc  "), "Jean Marc");
    assert.equal(nettoyerPrenom("   "), null);
    assert.equal(nettoyerPrenom("x".repeat(40)).length, 20);
    assert.match(genererCode(), /^\d{6}$/);
  });

  it("les questions du cours sont valides", () => {
    assert.deepEqual(verifierQuestions(QUESTIONS), []);
    assert.equal(QUESTIONS.length, 20);
    assert.equal(QUESTIONS.filter((q) => q.code).length, 5, "cinq questions Python");
  });
});

describe("mélange des choix", () => {
  it("rend une permutation complète", () => {
    for (let k = 0; k < 50; k++) assert.deepEqual([...melanger(4)].sort(), [0, 1, 2, 3]);
    assert.deepEqual(melanger(1), [0]);
  });

  it("la bonne réponse tombe à peu près autant sur chaque lettre", () => {
    const n = [0, 0, 0, 0];
    for (let k = 0; k < 4000; k++) n[melanger(4).indexOf(1)]++;
    for (const x of n) assert.ok(x > 850 && x < 1150, `répartition ${n}`);
  });
});

describe("joueursActifs / decompte", () => {
  const joueurs = { a: { prenom: "A" }, b: { prenom: "B" }, c: { prenom: "C" } };
  it("sans marque de présence : tous les inscrits comptent (règles pas publiées)", () => {
    assert.deepEqual(joueursActifs(joueurs, null).sort(), ["a", "b", "c"]);
  });
  it("seuls les connectés comptent ; une réponse d'un parti ne fait pas croire que tout le monde a répondu", () => {
    const actifs = joueursActifs(joueurs, { a: true, b: true });
    assert.deepEqual(actifs.sort(), ["a", "b"]);
    assert.deepEqual(decompte(actifs, { a: { choix: 1 }, c: { choix: 0 } }), { faits: 1, total: 2 });
  });
});

describe("nettoyerPrenom", () => {
  it("majuscule initiale, espaces repliés", () => {
    assert.equal(nettoyerPrenom("  inès  "), "Inès");
    assert.equal(nettoyerPrenom("jean  marc"), "Jean marc");
    assert.equal(nettoyerPrenom("   "), null);
  });
});

describe("connecterAnonyme", () => {
  const sansAttente = { attente: async () => {} };
  it("réessaie après un refus en rafale, puis réussit", async () => {
    let n = 0;
    const r = await connecterAnonyme(async () => { if (++n < 3) throw Object.assign(new Error("x"), { code: "auth/too-many-requests" }); return "ok"; }, sansAttente);
    assert.equal(r, "ok"); assert.equal(n, 3);
  });
  it("au-delà des essais : un message qui dit quoi faire", async () => {
    await assert.rejects(connecterAnonyme(async () => { throw Object.assign(new Error("x"), { code: "auth/too-many-requests" }); }, sansAttente), /données mobiles/);
  });
  it("une autre erreur n'est pas réessayée", async () => {
    let n = 0;
    await assert.rejects(connecterAnonyme(async () => { n++; throw new Error("réseau"); }, sansAttente), /réseau/); assert.equal(n, 1);
  });
});
