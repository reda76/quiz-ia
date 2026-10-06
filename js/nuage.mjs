// Le NUAGE DE POINTS (SVG) de « Qui se ressemble s'assemble », commun à l'écran et aux
// téléphones : les étudiants (points), et pendant le regroupement les centres et les couleurs.

/**
 * @param {SVGSVGElement} svg
 * @param {{x:object,y:object}} axes
 * @param {Array<{x:number,y:number,couleur?:string,moi?:boolean,pale?:boolean}>} points  (valeurs brutes)
 * @param {Array<{x:number,y:number,couleur:string}>} centres (valeurs brutes)
 */
export function dessinerNuage(svg, axes, points, centres = [], o = {}) {
  const L = o.largeur || 1000, H = o.hauteur || 640, f = o.police || 18;
  const m = { g: f * 3.6, d: f * 1.4, h: f * 1.2, b: f * 3.4 };
  const X = (v) => m.g + ((v - axes.x.min) / (axes.x.max - axes.x.min)) * (L - m.g - m.d);
  const Y = (v) => H - m.b - ((v - axes.y.min) / (axes.y.max - axes.y.min)) * (H - m.h - m.b);
  const graduations = (a, n = 6) => Array.from({ length: n + 1 }, (_, i) => a.min + ((a.max - a.min) * i) / n);
  const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(1)).toString().replace(".", ",");
  const t = [];
  for (const v of graduations(axes.x)) t.push(`<line x1="${X(v)}" y1="${Y(axes.y.min)}" x2="${X(v)}" y2="${Y(axes.y.max)}" class="grille"/><text x="${X(v)}" y="${Y(axes.y.min) + f * 1.3}" text-anchor="middle" font-size="${f * 0.8}" class="graduation">${fmt(v)}</text>`);
  for (const v of graduations(axes.y)) t.push(`<line x1="${X(axes.x.min)}" y1="${Y(v)}" x2="${X(axes.x.max)}" y2="${Y(v)}" class="grille"/><text x="${X(axes.x.min) - f * 0.5}" y="${Y(v) + f * 0.3}" text-anchor="end" font-size="${f * 0.8}" class="graduation">${fmt(v)}</text>`);
  t.push(`<text x="${(X(axes.x.min) + X(axes.x.max)) / 2}" y="${H - f * 0.6}" text-anchor="middle" font-size="${f * 0.95}" class="axe">${axes.x.label}${axes.x.unite ? ` (${axes.x.unite})` : ""}</text>`);
  t.push(`<text transform="translate(${f * 1.1} ${(Y(axes.y.min) + Y(axes.y.max)) / 2}) rotate(-90)" text-anchor="middle" font-size="${f * 0.95}" class="axe">${axes.y.label}${axes.y.unite ? ` (${axes.y.unite})` : ""}</text>`);
  for (const p of points.filter((q) => !q.moi)) t.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${f * 0.5}" fill="${p.couleur || "#1e2459"}" fill-opacity="${p.pale ? 0.25 : 0.85}" stroke="#fff" stroke-width="2" class="point"/>`);
  for (const c of centres) {
    const cx = X(c.x), cy = Y(c.y), r = f * 1.1;
    t.push(`<g class="centre"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${c.couleur}" stroke-width="${f * 0.35}"/><line x1="${cx - r * 0.55}" y1="${cy}" x2="${cx + r * 0.55}" y2="${cy}" stroke="${c.couleur}" stroke-width="${f * 0.3}"/><line x1="${cx}" y1="${cy - r * 0.55}" x2="${cx}" y2="${cy + r * 0.55}" stroke="${c.couleur}" stroke-width="${f * 0.3}"/></g>`);
  }
  for (const p of points.filter((q) => q.moi)) t.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${f * 0.9}" fill="${p.couleur || "#ff8a4c"}" stroke="#1e2459" stroke-width="3"/><text x="${X(p.x)}" y="${Y(p.y) - f * 1.3}" text-anchor="middle" font-size="${f}" font-weight="800" class="moi">toi</text>`);
  svg.setAttribute("viewBox", `0 0 ${L} ${H}`);
  svg.innerHTML = t.join("");
}
