// Le GRAPHIQUE des courses (SVG), commun au grand écran et aux téléphones : les courses en
// points, et des droites prix = w × distance + b.

import { BORNES } from "./machine.mjs";

const NS = "http://www.w3.org/2000/svg";
const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * @param {SVGSVGElement} svg
 * @param {Array<{d:number,prix:number}>} courses
 * @param {Array<{w:number,b:number,couleur:string,epaisseur?:number,opacite?:number,etiquette?:string}>} droites
 * @param {{ largeur?:number, hauteur?:number, police?:number, residus?:{w:number,b:number}|null }} [o]
 */
export function dessiner(svg, courses, droites, o = {}) {
  const L = o.largeur || 1000, H = o.hauteur || 620, police = o.police || 18;
  const m = { g: police * 3.2, d: police * 1.2, h: police * 1.2, b: police * 2.8 };
  const X = (d) => m.g + (d / BORNES.distanceMax) * (L - m.g - m.d);
  const Y = (p) => H - m.b - (p / BORNES.prixMax) * (H - m.h - m.b);
  const morceaux = [];
  // Grille et axes
  for (let d = 0; d <= BORNES.distanceMax; d += 5) {
    morceaux.push(`<line x1="${X(d)}" y1="${Y(0)}" x2="${X(d)}" y2="${Y(BORNES.prixMax)}" class="grille"/>`);
    morceaux.push(`<text x="${X(d)}" y="${Y(0) + police * 1.3}" class="graduation" text-anchor="middle" font-size="${police * 0.8}">${d}</text>`);
  }
  for (let p = 0; p <= BORNES.prixMax; p += 10) {
    morceaux.push(`<line x1="${X(0)}" y1="${Y(p)}" x2="${X(BORNES.distanceMax)}" y2="${Y(p)}" class="grille"/>`);
    morceaux.push(`<text x="${X(0) - police * 0.5}" y="${Y(p) + police * 0.3}" class="graduation" text-anchor="end" font-size="${police * 0.8}">${p} €</text>`);
  }
  morceaux.push(`<text x="${(X(0) + X(BORNES.distanceMax)) / 2}" y="${H - police * 0.4}" class="axe" text-anchor="middle" font-size="${police * 0.9}">distance (km)</text>`);
  // Écarts de la droite suivie (les « erreurs » rendues visibles)
  if (o.residus) {
    for (const c of courses) {
      const p = o.residus.w * c.d + o.residus.b;
      morceaux.push(`<line x1="${X(c.d)}" y1="${Y(c.prix)}" x2="${X(c.d)}" y2="${Y(Math.max(0, Math.min(BORNES.prixMax, p)))}" class="residu"/>`);
    }
  }
  // Droites (les plus fines d'abord, la plus épaisse par-dessus)
  for (const dr of [...droites].sort((a, b) => (a.epaisseur || 2) - (b.epaisseur || 2))) {
    const y0 = dr.b, y1 = dr.w * BORNES.distanceMax + dr.b;
    morceaux.push(`<line x1="${X(0)}" y1="${Y(y0)}" x2="${X(BORNES.distanceMax)}" y2="${Y(y1)}" stroke="${dr.couleur}" stroke-width="${dr.epaisseur || 2}" stroke-opacity="${dr.opacite ?? 0.75}" stroke-linecap="round"/>`);
    if (dr.etiquette) {
      const d = Math.min(BORNES.distanceMax, (BORNES.prixMax - dr.b) / Math.max(dr.w, 1e-6));
      const xe = Math.min(X(d), X(BORNES.distanceMax)) - police * 0.3, ye = Y(Math.min(BORNES.prixMax, dr.w * Math.min(d, BORNES.distanceMax) + dr.b)) - police * 0.5;
      morceaux.push(`<text x="${xe}" y="${ye}" text-anchor="end" font-size="${police}" font-weight="700" fill="${dr.couleur}" class="etiquette">${echapper(dr.etiquette)}</text>`);
    }
  }
  // Les courses
  for (const c of courses) morceaux.push(`<circle cx="${X(c.d)}" cy="${Y(c.prix)}" r="${police * 0.38}" class="course"/>`);
  svg.setAttribute("viewBox", `0 0 ${L} ${H}`);
  svg.innerHTML = morceaux.join("");
}

export { NS };
