import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { genererCourses, ecartMoyen, descente, classementDroites, borner, aleatoire, BORNES } from "../js/machine.mjs";

describe("les journées du glacier", () => {
  it("sont reproductibles, dans les bornes, et proches de leur vrai rythme de ventes", () => {
    const a = genererCourses(42), b = genererCourses(42);
    assert.deepEqual(a, b, "même graine, mêmes journées");
    assert.notDeepEqual(genererCourses(43).courses, a.courses);
    assert.equal(a.courses.length, 24);
    for (const c of a.courses) {
      assert.ok(c.d >= 3 && c.d <= BORNES.distanceMax, `température ${c.d}`);
      assert.ok(c.prix >= 0 && c.prix <= BORNES.prixMax, `litres ${c.prix}`);
    }
    // Le vrai rythme colle aux journées, sans les traverser exactement (week-ends, orages).
    const e = ecartMoyen(a.courses, a.tarif.w, a.tarif.b);
    assert.ok(e > 0.3 && e < 6, `écart du vrai rythme : ${e}`);
  });
});

describe("l'écart moyen", () => {
  it("vaut la moyenne des écarts absolus, en litres", () => {
    const c = [{ d: 10, prix: 23 }, { d: 5, prix: 15 }];
    assert.equal(ecartMoyen(c, 2, 3), (0 + 2) / 2);
    assert.equal(ecartMoyen([], 1, 1), 0);
  });
});

describe("la machine", () => {
  it("part de zéro et réduit l'écart jusqu'à battre une droite réglée à la main", () => {
    for (const graine of [1, 7, 42, 2026]) {
      const { courses } = genererCourses(graine);
      const s = descente(courses);
      assert.equal(s[0].w, 0);
      assert.equal(s[0].b, 0);
      const fin = s.at(-1);
      assert.ok(fin.ecart < s[0].ecart / 5, "l'erreur a fondu");
      // Une droite « à l'œil », un peu à côté : la machine fait mieux.
      assert.ok(fin.ecart <= ecartMoyen(courses, fin.w + 0.15, fin.b - 1), `graine ${graine}`);
      assert.ok(fin.w > 0.5 && fin.w < 4 && fin.b >= 0 && fin.b < 15, `réglages plausibles ${fin.w} ${fin.b}`);
    }
  });

  it("descend presque toujours : l'erreur finale est la plus basse du parcours, à peu près", () => {
    const s = descente(genererCourses(5).courses);
    const min = Math.min(...s.map((x) => x.ecart));
    assert.ok(s.at(-1).ecart - min < 0.2);
  });
});

describe("classement et curseurs", () => {
  it("classe par écart croissant, machine comprise, et ignore les inconnus", () => {
    const courses = [{ d: 10, prix: 23 }];
    const c = classementDroites(courses, { a: { prenom: "Léa" }, b: { prenom: "Tom" } }, { a: { w: 2, b: 3 }, b: { w: 1, b: 3 }, z: { w: 2, b: 3 } }, { w: 2, b: 2.5 });
    assert.deepEqual(c.map((l) => [l.prenom, l.rang]), [["Léa", 1], ["La machine", 2], ["Tom", 3]]);
  });

  it("borne et arrondit les curseurs", () => {
    assert.equal(borner("w", 9), BORNES.w.max);
    assert.equal(borner("b", -2), 0);
    assert.ok(Math.abs(borner("w", 1.513) - 1.5) < 1e-9);
    assert.equal(typeof aleatoire(1)(), "number");
  });
});

describe("les journées du glacier, sur 200 parties", () => {
  it("restent dans le graphique et dans les bornes des règles Firebase (w ≤ 4, b ≤ 15)", () => {
    for (let g = 1; g <= 200; g++) {
      const { tarif, courses } = genererCourses(g);
      assert.ok(tarif.w <= BORNES.w.max && tarif.b <= BORNES.b.max, `graine ${g}`);
      for (const c of courses) assert.ok(c.prix >= 0 && c.prix <= BORNES.prixMax && c.d <= BORNES.distanceMax, `graine ${g}`);
    }
  });
});
