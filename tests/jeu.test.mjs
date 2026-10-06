import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { points, repartition, classement, prenomsAffiches, nettoyerPrenom, genererCode, verifierQuestions } from "../js/jeu.mjs";
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
    assert.ok(QUESTIONS.length >= 10);
  });
});
