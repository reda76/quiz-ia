import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nettoyerMot, distribution, tirer, ajouter, FIN } from "../js/mots.mjs";
import { kMoyennes, normaliser, portraits, AXES, affecter } from "../js/groupes.mjs";
import { aleatoire } from "../js/machine.mjs";

describe("la salle est un ChatGPT", () => {
  it("garde UN mot propre, en minuscules", () => {
    assert.equal(nettoyerMot("  Apprendre !"), "apprendre");
    assert.equal(nettoyerMot("des maths"), "des", "un seul mot");
    assert.equal(nettoyerMot("«magique»"), "magique");
    assert.equal(nettoyerMot("aujourd'hui"), "aujourd'hui");
    assert.equal(nettoyerMot("!!!"), null);
    assert.equal(nettoyerMot(FIN), FIN);
  });

  it("fait des probabilités à partir des propositions, la plus fréquente d'abord", () => {
    const d = distribution({ a: { mot: "Apprendre" }, b: { mot: "apprendre" }, c: { mot: "magique" }, d: { mot: "" } });
    assert.deepEqual(d.map((x) => [x.mot, x.n]), [["apprendre", 2], ["magique", 1]]);
    assert.ok(Math.abs(d[0].p - 2 / 3) < 1e-9);
  });

  it("tire selon les probabilités, ou prend toujours le plus probable", () => {
    const d = distribution({ a: { mot: "x" }, b: { mot: "x" }, c: { mot: "x" }, e: { mot: "y" } });
    assert.equal(tirer(d, "probable").mot, "x");
    const r = aleatoire(3), n = { x: 0, y: 0 };
    for (let i = 0; i < 4000; i++) n[tirer(d, "hasard", r).mot]++;
    assert.ok(n.x / 4000 > 0.7 && n.x / 4000 < 0.8, `x tiré ${n.x} fois sur 4000 (attendu ~75 %)`);
    assert.equal(tirer([], "hasard"), null);
  });

  it("allonge la phrase", () => {
    assert.equal(ajouter("Le machine learning, c'est", "apprendre"), "Le machine learning, c'est apprendre");
    assert.equal(ajouter("Bonjour", FIN), "Bonjour");
  });
});

describe("qui se ressemble s'assemble", () => {
  // Trois paquets bien séparés
  const r = aleatoire(11);
  const paquets = [[0.15, 0.2], [0.8, 0.25], [0.5, 0.85]];
  const points = paquets.flatMap(([x, y]) => Array.from({ length: 10 }, () => ({ x: x + (r() - 0.5) * 0.1, y: y + (r() - 0.5) * 0.1 })));

  it("retrouve les trois paquets, sans aucune étiquette", () => {
    const suite = kMoyennes(points, 3, { aleatoire: aleatoire(5) });
    const fin = suite.at(-1).groupes;
    assert.equal(suite[0].groupes, null, "on montre d'abord les centres de départ");
    for (let p = 0; p < 3; p++) {
      const siens = fin.slice(p * 10, p * 10 + 10);
      assert.ok(siens.every((g) => g === siens[0]), `paquet ${p} entier dans un même groupe`);
    }
    assert.equal(new Set(fin).size, 3);
  });

  it("s'arrête quand plus rien ne bouge, et décrit chaque groupe", () => {
    const suite = kMoyennes(points, 3, { aleatoire: aleatoire(5) });
    assert.ok(suite.length < 20);
    const avant = suite.at(-2).groupes, apres = suite.at(-1).groupes;
    assert.deepEqual(avant, apres);
    const bruts = [{ x: 6, y: 2 }, { x: 8, y: 4 }, { x: 5, y: 10 }];
    const port = portraits(bruts, [0, 0, 1], 2);
    assert.deepEqual(port.map((g) => [g.effectif, g.x, g.y]), [[2, 7, 3], [1, 5, 10]]);
  });

  it("normalise les axes et affecte au centre le plus proche", () => {
    const axes = AXES[0];
    assert.deepEqual(normaliser({ x: axes.x.min, y: axes.y.max }, axes), { x: 0, y: 1 });
    assert.deepEqual(affecter([{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 0.9, y: 0.9 }, { x: 0.1, y: 0 }]), [1, 0]);
  });
});
