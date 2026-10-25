/**
 * Drawing primitives for the icon set: each returns one SVG element as markup for a 24×24 grid.
 * Shared by src/icons/index.ts and every file in src/icons/sets/.
 *
 * Rules every icon follows: stroke-only (the root <svg> carries stroke, fill none, 1.75 width,
 * round caps and joins), 2 px of padding inside the 24 grid, whole or half pixels, `dot()` for
 * single points so they match the stroke weight, `fr()`/`fp()` only for small solid accents.
 */

export const p = (d: string) => `<path d="${d}"/>`;
export const c = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
export const l = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
export const r = (x: number, y: number, w: number, h: number, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ""}/>`;
export const pl = (points: string) => `<polyline points="${points}"/>`;
export const pg = (points: string) => `<polygon points="${points}"/>`;
export const e = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
/** A filled point, the size of a stroke end. */
export const dot = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="0.6" fill="currentColor"/>`;
/** A filled block (battery charge, heat-map cells). */
export const fr = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.5" fill="currentColor"/>`;
/** A filled path (half-filled star, record dot). */
export const fp = (d: string) => `<path d="${d}" fill="currentColor"/>`;
