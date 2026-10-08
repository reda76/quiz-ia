import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PAGES_JOUEUR, salleDeLAdresse, doitQuitter, adresseDeLaSalle, adresseDuJeu } from "../js/salle.mjs";

const BASE = "https://reda76.github.io/quiz-ia/animateur.html";

describe("la salle", () => {
  it("lit un code de salle valide dans l'adresse, et seulement lui", () => {
    assert.equal(salleDeLAdresse("?salle=123456"), "123456");
    assert.equal(salleDeLAdresse("?s=654321", "s"), "654321");
    assert.equal(salleDeLAdresse("?salle=12345"), null);
    assert.equal(salleDeLAdresse("?salle=abc123"), null);
    assert.equal(salleDeLAdresse(""), null);
  });
  it("un téléphone repart vers la salle quand le jeu change, s'arrête, ou repart à zéro", () => {
    assert.equal(doitQuitter({ type: "quiz", code: "111111" }, "quiz", "111111"), false);
    assert.equal(doitQuitter(null, "quiz", "111111"), true, "retour au choix des jeux");
    assert.equal(doitQuitter({ type: "machine", code: "222222" }, "quiz", "111111"), true, "autre jeu");
    assert.equal(doitQuitter({ type: "quiz", code: "333333" }, "quiz", "111111"), true, "nouvelle partie du même jeu");
  });
  it("adresses : le QR de la salle, et le jeu en cours pour chaque type", () => {
    assert.equal(adresseDeLaSalle(BASE, "123456"), "https://reda76.github.io/quiz-ia/salle.html?s=123456");
    assert.equal(adresseDeLaSalle(BASE, "123456", true), "https://reda76.github.io/quiz-ia/salle.html?s=123456&local=1");
    for (const [type, page] of Object.entries(PAGES_JOUEUR)) {
      assert.equal(adresseDuJeu(BASE, { type, code: "222222" }, "123456"), `https://reda76.github.io/quiz-ia/${page}?p=222222&salle=123456`);
    }
    assert.equal(adresseDuJeu(BASE, { type: "inconnu", code: "222222" }, "123456"), null);
    assert.equal(adresseDuJeu(BASE, { type: "quiz", code: "12" }, "123456"), null);
  });
});
