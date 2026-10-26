// Builds the OSQD typefaces from type/params.mjs and type/glyphs.mjs into assets/fonts/.
//
//   node type/build.mjs            write the fonts
//   node type/build.mjs --check    fail when a committed font differs from what the source builds
//   node type/build.mjs --otf DIR  also write the uncompressed .otf files to DIR (for inspection)
//
// Every face — family × optical size × weight × upright/italic — is written twice:
//   assets/fonts/<face>.woff2                    the complete font, for offline and desktop use
//   assets/fonts/subsets/<face>.<subset>.woff2   one file per unicode-range subset, which is what
//                                                styles/fonts.css serves, so a page downloads only
//                                                the scripts it renders
//
// The output is deterministic — fixed timestamps, glyphs in table order, kerning sorted — so
// --check can compare bytes. opentype.js writes CFF outlines but no kerning, so a legacy `kern`
// table is added to the font file here; every current browser applies it.
//
// Outlines are cleaned on the way out (see `outline` below): the drawings overlap by design — a
// stem runs into its bowl so no join merely touches — and overlaps are unioned away here, every
// coordinate is rounded to a whole unit before opentype.js sees it, and contour directions are
// made consistent. Both the overlaps and opentype.js's own rounding left the shipped outlines
// ragged at text sizes; the comment on `outline` says how.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { transform } from "./geom.mjs";
import { buildAlternates, buildGlyphs, FEATURE_TAGS, KERNING } from "./glyphs.mjs";
import { FAMILIES, ITALIC_ANGLE, OPTICAL, resolve, WEIGHT_NAMES, WEIGHTS, WIDTHS } from "./params.mjs";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");
const wawoff2 = require("wawoff2");
// Skia's path operations, for the union of overlapping contours: exact on cubic curves (a curve is
// split where it crosses another, never flattened). Loaded once per thread.
const PathKitInit = require("pathkit-wasm/bin/pathkit.js");
const PK = await PathKitInit({ wasmBinary: readFileSync(require.resolve("pathkit-wasm/bin/pathkit.wasm")) });

const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = join(root, "assets/fonts");
const subsetDir = join(outDir, "subsets");
const CREATED = Date.UTC(2026, 9, 25) / 1000; // fixed, so the bytes only change with the drawings
const VERSION = "Version 1.000";
const COPYRIGHT = "Copyright 2026 The OSQD Authors. Licensed under the SIL Open Font License, Version 1.1.";

/* ------------------------------------------------------------------ outlines */

// PathKit's path verbs (toCmds): move, line, quadratic, conic, cubic, close.
const VERB = { move: 0, line: 1, quad: 2, conic: 3, cubic: 4, close: 5 };

/** Twice the signed area of a contour, from its on-curve and control points (enough for a sign). */
function signedArea(ct) {
  const pts = [ct.start, ...ct.segs.flatMap((s) => (s.L ? [s.L] : s.C))];
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a;
}

/** The same contour drawn the other way round. */
function reversed(ct) {
  const ends = [ct.start, ...ct.segs.map((s) => s.L ?? s.C[2])];
  const segs = [];
  for (let i = ct.segs.length - 1; i >= 0; i--) {
    const s = ct.segs[i];
    segs.push(s.L ? { L: ends[i] } : { C: [s.C[1], s.C[0], ends[i]] });
  }
  return { start: ends[ends.length - 1], segs };
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/**
 * A glyph's contours as they are written to the font. Two things made the shipped outlines ragged
 * at text sizes, and both are dealt with here:
 *
 * - Overlaps. The drawings overlap on purpose (a stem runs into its bowl), which a rasteriser
 *   fills correctly but anti-aliases badly: where two contours share or nearly share an edge, both
 *   add coverage to the same pixel and the join comes out too dark, notched. The contours are
 *   unioned into one non-overlapping outline (which also drops zero-area anchor contours a drawing
 *   used for placement only — the glyph is already placed by then).
 * - Rounding. opentype.js writes a CFF curve as three relative steps, each rounded separately and
 *   measured from the unrounded previous point, then assumes the pen landed on the rounded end:
 *   every curve can leave the pen up to 1.5 units off, and the error walks along the contour —
 *   the closing line then jumps back to the start, and control points stop lining up with their
 *   curve ends. Measured on 0.7.0's Sans Regular: 3,031 points off by more than 2 units, up to 18
 *   on a brace. Rounding every coordinate to a whole unit first makes each step exact.
 *
 * Directions end up consistent: outlines counter-clockwise and counters clockwise, as PostScript
 * outlines expect and as nonzero filling needs.
 */
function outline(contours) {
  if (contours.length === 0) return [];
  const path = PK.NewPath();
  path.setFillType(PK.FillType.WINDING);
  for (const ct of contours) {
    path.moveTo(ct.start[0], ct.start[1]);
    for (const s of ct.segs) {
      if (s.L) path.lineTo(s.L[0], s.L[1]);
      else path.cubicTo(s.C[0][0], s.C[0][1], s.C[1][0], s.C[1][1], s.C[2][0], s.C[2][1]);
    }
    path.close();
  }
  path.simplify();
  const cmds = path.toCmds();
  path.delete();
  const r = (x, y) => [Math.round(x), Math.round(y)];
  const raw = [];
  let cur;
  let pen = [0, 0];
  for (const c of cmds) {
    const v = c[0];
    if (v === VERB.move) {
      cur = { start: r(c[1], c[2]), segs: [] };
      raw.push(cur);
      pen = [c[1], c[2]];
    } else if (v === VERB.line) {
      cur.segs.push({ L: r(c[1], c[2]) });
      pen = [c[1], c[2]];
    } else if (v === VERB.quad) {
      // Raised to a cubic: the control points two thirds of the way to the quadratic's one.
      const [x0, y0] = pen;
      const [qx, qy, x, y] = [c[1], c[2], c[3], c[4]];
      cur.segs.push({ C: [r(x0 + (2 / 3) * (qx - x0), y0 + (2 / 3) * (qy - y0)), r(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y)), r(x, y)] });
      pen = [x, y];
    } else if (v === VERB.cubic) {
      cur.segs.push({ C: [r(c[1], c[2]), r(c[3], c[4]), r(c[5], c[6])] });
      pen = [c[5], c[6]];
    } else if (v === VERB.conic) {
      throw new Error("type: a union produced a conic, which no drawing should");
    }
  }
  // Whole units can collapse a tiny segment to nothing; such segments, and contours left with no
  // area, are dropped.
  const out = [];
  for (const ct of raw) {
    const segs = [];
    let last = ct.start;
    for (const s of ct.segs) {
      const end = s.L ?? s.C[2];
      if (same(end, last) && (s.L || (same(s.C[0], last) && same(s.C[1], last)))) continue;
      segs.push(s);
      last = end;
    }
    const cleaned = { start: ct.start, segs };
    // Under 8 square units (on the curve, not its control polygon) is a sliver the union left
    // where two edges nearly met — invisible, but a contour a rasteriser still has to walk.
    if (segs.length >= 2 && Math.abs(polygonArea(flatten(cleaned))) >= 8) out.push(cleaned);
  }
  // The union comes back with no direction convention (its result is even-odd), so each contour
  // is oriented by how deeply it nests: an outline counter-clockwise, a counter inside it
  // clockwise, an island inside that counter-clockwise again. The contours no longer cross, so
  // one point on a contour tells which others contain it.
  const polys = out.map(flatten);
  return out.map((ct, i) => {
    const probe = within(polys[i]);
    const depth = polys.reduce((n, poly, j) => n + (j !== i && inside(probe, poly) ? 1 : 0), 0);
    const ccw = signedArea(ct) > 0;
    return ccw === (depth % 2 === 0) ? ct : reversed(ct);
  });
}

/** The signed area of a polygon. */
function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** A contour as a polygon, curves sampled finely enough to test containment. */
function flatten(ct) {
  const pts = [ct.start];
  let p0 = ct.start;
  for (const s of ct.segs) {
    if (s.L) pts.push(s.L);
    else {
      const [c1, c2, p3] = s.C;
      for (let t = 1; t <= 12; t++) {
        const u = t / 12;
        const v = 1 - u;
        pts.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p3[1]]);
      }
    }
    p0 = s.L ?? s.C[2];
  }
  return pts;
}

/**
 * A point just inside a polygon, half a unit in from the middle of its longest edge: not on the
 * edge itself, where contours that touch (a shade's dots meet at their corners) would make the
 * containment test ambiguous.
 */
function within(poly) {
  let best = 0;
  let len = -1;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const l = Math.hypot(bx - ax, by - ay);
    if (l > len) {
      len = l;
      best = i;
    }
  }
  const [ax, ay] = poly[best];
  const [bx, by] = poly[(best + 1) % poly.length];
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const nx = -(by - ay) / (len || 1);
  const ny = (bx - ax) / (len || 1);
  const a = [mx + nx * 0.5, my + ny * 0.5];
  return inside(a, poly) ? a : [mx - nx * 0.5, my - ny * 0.5];
}

/** Even-odd point-in-polygon. */
function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The cleaned outline of a drawing, computed once: the full font and its subsets share glyphs. */
const outlines = new WeakMap();
function cleaned(contours) {
  let done = outlines.get(contours);
  if (done === undefined) {
    done = outline(contours);
    outlines.set(contours, done);
  }
  return done;
}

function toPath(contours) {
  const path = new opentype.Path();
  for (const ct of cleaned(contours)) {
    path.moveTo(ct.start[0], ct.start[1]);
    for (const s of ct.segs) {
      if (s.L) path.lineTo(s.L[0], s.L[1]);
      else path.curveTo(s.C[0][0], s.C[0][1], s.C[1][0], s.C[1][1], s.C[2][0], s.C[2][1]);
    }
    path.close();
  }
  return path;
}

/**
 * gasp: smooth (grey-scale, symmetric) at every size and never grid-fit. These outlines carry no
 * hints, and a renderer that reads gasp should not try to snap them.
 */
const GASP = Buffer.from([0x00, 0x01, 0x00, 0x01, 0xff, 0xff, 0x00, 0x0a]);

/* ------------------------------------------------------------------ italic */

/**
 * The italic stage, applied to placed glyphs so every table — including the script modules' —
 * gets it for free. The upright drawing is narrowed (proportional faces only; a mono keeps its
 * advance) and sheared about half the x-height, so the x-height band stays where it was and the
 * glyph stays centred on its advance. Accents shear with their letter, so they stay over it.
 * The shear thins a vertical stem by cos(angle) measured across the stroke; resolve() thickens
 * italic stems by the same factor before drawing.
 */
export function italicize(glyphs, p) {
  const t = Math.tan((ITALIC_ANGLE * Math.PI) / 180);
  const narrow = p.mono ? 1 : 0.975;
  const yc = p.X / 2;
  const r1 = (v) => Math.round(v * 10) / 10;
  return glyphs.map((g) => ({
    ...g,
    advance: p.mono ? g.advance : Math.round(g.advance * narrow),
    contours: transform(g.contours, ([x, y]) => [r1(x * narrow + (y - yc) * t), y]),
  }));
}

/* ------------------------------------------------------------------ subsets */

/** Inclusive code point ranges per subset; anything unlisted is "latin". First match wins. */
const SUBSET_RANGES = {
  vietnamese: [[0x01a0, 0x01a1], [0x01af, 0x01b0], [0x1ea0, 0x1ef9], [0x20ab, 0x20ab]],
  cyrillic: [[0x0400, 0x052f], [0x1c80, 0x1c8f], [0x2de0, 0x2dff], [0xa640, 0xa69f], [0x20b4, 0x20b4], [0x20bd, 0x20bd], [0x2116, 0x2116]],
  greek: [[0x0370, 0x03ff], [0x1f00, 0x1fff]],
  armenian: [[0x0530, 0x058f], [0xfb13, 0xfb17]],
  georgian: [[0x10a0, 0x10ff], [0x1c90, 0x1cbf], [0x2d00, 0x2d2f]],
  hebrew: [[0x0590, 0x05ff], [0xfb1d, 0xfb4f]],
  "latin-ext": [[0x0100, 0x024f], [0x0250, 0x02af], [0x02b0, 0x02ff], [0x1d00, 0x1dbf], [0x0259, 0x0259], [0x0300, 0x036f], [0x1e00, 0x1eff], [0x20a0, 0x20aa], [0x20ac, 0x20ac], [0x20ad, 0x20cf], [0x2113, 0x2113], [0x2c60, 0x2c7f], [0xa720, 0xa7ff]],
  // Box drawing, blocks, shapes, arrows, technical and maths signs, super- and subscripts: a page
  // that draws none of them never downloads them.
  symbols: [[0x2007, 0x2007], [0x2009, 0x200a], [0x2010, 0x2012], [0x2016, 0x2016], [0x2023, 0x2023], [0x2043, 0x2044], [0x2070, 0x209f], [0x2150, 0x218f], [0x2190, 0x21ff], [0x2200, 0x22ff], [0x2300, 0x23ff], [0x2400, 0x24ff], [0x2500, 0x259f], [0x25a0, 0x25ff], [0x2600, 0x26ff], [0x2700, 0x27bf], [0x27c0, 0x27ff], [0x2900, 0x297f], [0x2b00, 0x2bff]],
};
/** The order subsets are declared in; latin first, since every page needs it. */
export const SUBSETS = ["latin", "latin-ext", "vietnamese", "cyrillic", "greek", "armenian", "georgian", "hebrew", "symbols"];

/**
 * Which subsets each cut ships. The Text cuts carry everything; the others carry what they are for, and every role's font stack falls back to the Text cut ("OSQD Sans Display",
 * "OSQD Sans", …), so a character a cut does not carry is set from Text rather than missing.
 * Condensed is for tables in the European scripts; Display and Caption set headings and labels.
 * This is what keeps the npm package under 8 MB; the complete fonts (assets/fonts/*.woff2, in the
 * repository only) still carry every glyph.
 */
export function subsetsFor(face) {
  // The monos set code and logs: every script but Armenian, Georgian and Hebrew, which fall back
  // to the platform's monospace there.
  if (face.mono) return SUBSETS.filter((s) => !["armenian", "georgian", "hebrew"].includes(s));
  if (face.opsz === "text" && face.width === "normal") return SUBSETS;
  if (face.width === "condensed") return ["latin", "latin-ext", "vietnamese", "cyrillic", "greek"];
  return ["latin", "latin-ext", "vietnamese"];
}

/**
 * Code points that stay in latin wherever their block is: € and the signs the kit's own UI sets
 * (the four arrows and the check of the base table, the minus and the comparison signs numbers
 * come with), so an ordinary page needs one file.
 */
const LATIN_ALWAYS = new Set([0x20ac, 0x2190, 0x2191, 0x2192, 0x2193, 0x2713, 0x2212, 0x2264, 0x2265, 0x2260, 0x2248, 0x221e]);

/** Which subset a code point is served from. */
export function subsetOf(cp) {
  if (LATIN_ALWAYS.has(cp)) return "latin";
  for (const [name, ranges] of Object.entries(SUBSET_RANGES)) if (ranges.some(([a, b]) => cp >= a && cp <= b)) return name;
  return "latin";
}

/** A CSS unicode-range for exactly these code points: consecutive ones merged into runs. */
export function unicodeRange(cps) {
  const sorted = [...new Set(cps)].sort((a, b) => a - b);
  const runs = [];
  for (const cp of sorted) {
    const last = runs[runs.length - 1];
    if (last && cp === last[1] + 1) last[1] = cp;
    else runs.push([cp, cp]);
  }
  const hex = (n) => n.toString(16).toUpperCase();
  return runs.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(",");
}

/* ------------------------------------------------------------------ fonts */

/**
 * Kerning pairs by character, extended to accented letters: a pair written for A and V also
 * applies to Á, Ą, Ǎ … whose canonical decomposition starts with A, so every language a module
 * adds kerns like the base letters do. Values scale with the face's width and stem.
 */
function kerningFor(chars, p) {
  const byBase = new Map();
  for (const ch of chars) {
    const base = ch.normalize("NFD")[0];
    if (base === undefined) continue;
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(ch);
  }
  const scale = (1 + (p.S - 84) / 400) * (p.italic && !p.mono ? 0.975 : 1) * (p.opsz === "caption" ? 0.94 : 1);
  const out = new Map();
  for (const [a, b, v] of KERNING) {
    for (const l of byBase.get(a) ?? []) {
      for (const r of byBase.get(b) ?? []) {
        // An accent above a capital can collide with an overhanging neighbour; halve those pairs.
        const accented = l !== a || r !== b;
        out.set(`${l}\u0000${r}`, Math.round(v * scale * (accented ? 0.7 : 1)));
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ GSUB */

/** A coverage table: the glyph ids, sorted and unique. */
const coverage = (ids) => ({ format: 1, glyphs: [...new Set(ids.filter((v) => v !== undefined))].sort((a, b) => a - b) });

/**
 * The GSUB table for one font: the alternates buildAlternates() made, as single substitutions,
 * and `frac` as three chained-context lookups over them. Only substitutions whose glyphs are both
 * in this font are kept — a subset file carries the alternates of its own characters — and a font
 * with none at all gets no GSUB.
 *
 * Lookup order is application order:
 *   0 pnum  1 tnum  2 zero  3 ss01  4 case  5 sups  6 subs  7 numr  8 dnom  9 fraction slash
 *   10 frac numerators: a figure followed by up to three figures and a slash becomes a numerator
 *   11 frac slash: a slash between a numerator and a figure becomes the fraction slash
 *   12 frac denominators: a figure after the fraction slash (and up to three denominators) becomes
 *      a denominator
 */
function gsubTable(index, alts) {
  if (!alts) return null;
  const id = (n) => index.get(n);
  const single = (pairs) => {
    const m = new Map();
    for (const [a, b] of pairs) {
      const ia = id(a);
      const ib = id(b);
      if (ia !== undefined && ib !== undefined && !m.has(ia)) m.set(ia, ib);
    }
    const cov = [...m.keys()].sort((x, y) => x - y);
    return { lookupType: 1, lookupFlag: 0, subtables: [{ substFormat: 2, coverage: { format: 1, glyphs: cov }, substitute: cov.map((g) => m.get(g)) }] };
  };
  const order = ["pnum", "tnum", "zero", "ss01", "case", "sups", "subs", "numr", "dnom"];
  const lookups = order.map((tag) => single(alts.subs[tag]));
  const f = alts.frac;
  lookups.push(single(f.slashes.map((s) => [s, f.fraction])));
  if (lookups.every((l) => l.subtables[0].coverage.glyphs.length === 0)) return null;
  const digits = coverage(f.digits.map(id));
  const slashes = coverage(f.slashes.map(id));
  const numr = coverage(f.numr.map(id));
  const dnom = coverage(f.dnom.map(id));
  const fraction = coverage([id(f.fraction)]);
  const digitsOrNumr = coverage([...f.digits, ...f.numr].map(id));
  const chain = (back, input, ahead, lookup) => ({ substFormat: 3, backtrackCoverage: back, inputCoverage: [input], lookaheadCoverage: ahead, lookupRecords: [{ sequenceIndex: 0, lookupListIndex: lookup }] });
  const upTo = [0, 1, 2, 3];
  lookups.push({ lookupType: 6, lookupFlag: 0, subtables: upTo.map((k) => chain([], digits, [...Array(k).fill(digits), slashes], 7)) });
  lookups.push({ lookupType: 6, lookupFlag: 0, subtables: [chain([numr], slashes, [digits], 9)] });
  lookups.push({ lookupType: 6, lookupFlag: 0, subtables: upTo.map((k) => chain([...Array(k).fill(dnom), fraction], digitsOrNumr, [], 8)) });
  const lookupOf = { pnum: [0], tnum: [1], zero: [2], ss01: [3], case: [4], sups: [5], subs: [6], numr: [7], dnom: [8], frac: [10, 11, 12] };
  const features = FEATURE_TAGS.map((tag) => ({ tag, feature: { featureParams: 0, lookupListIndexes: lookupOf[tag] } }));
  const all = features.map((_, i) => i);
  const scripts = ["DFLT", "armn", "cyrl", "geor", "grek", "hebr", "latn"].map((tag) => ({ tag, script: { defaultLangSys: { reqFeatureIndex: 0xffff, featureIndexes: all }, langSysRecords: [] } }));
  return { version: 1, scripts, features, lookups };
}

/** One font from placed glyphs, as the bytes of an OpenType (CFF) file with a kern table added. */
function makeFont(p, drawn, alts) {
  const notdef = new opentype.Glyph({ name: ".notdef", advanceWidth: p.mono ? p.monoAdvance : 500, path: toPath([]) });
  const glyphs = [notdef];
  for (const d of drawn) {
    glyphs.push(new opentype.Glyph({ name: d.name, ...(d.unicode ? { unicode: d.unicode.codePointAt(0) } : {}), advanceWidth: d.advance, path: toPath(d.contours) }));
  }
  const weightName = WEIGHT_NAMES[p.weight];
  const style = p.italic ? (p.weight === 400 ? "Italic" : `${weightName} Italic`) : weightName;
  const font = new opentype.Font({
    familyName: p.name,
    styleName: style,
    unitsPerEm: p.upm,
    ascender: p.lineAscender,
    descender: p.lineDescender,
    createdTimestamp: CREATED,
    weightClass: p.weight,
    copyright: COPYRIGHT,
    version: VERSION,
    designer: "The OSQD Authors",
    manufacturer: "OSQD",
    license: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
    licenseURL: "https://openfontlicense.org",
    glyphs,
  });
  const byName = new Map(glyphs.map((g, i) => [g.name, i]));
  const gsub = gsubTable(byName, alts);
  if (gsub) font.tables.gsub = gsub;
  // USE_TYPO_METRICS (bit 7), ITALIC (bit 0), and REGULAR (bit 6) or BOLD (bit 5); one line gap
  // of 0 in every table, so the line box is the same on every platform.
  const selection = 128 | (p.italic ? 1 : 0) | (p.weight >= 700 ? 32 : p.weight === 400 && !p.italic ? 64 : 0);
  font.tables.os2 = {
    fsSelection: selection,
    usWinAscent: 1000,
    usWinDescent: 300,
    sTypoAscender: p.lineAscender,
    sTypoDescender: p.lineDescender,
    sTypoLineGap: 0,
    sxHeight: p.X,
    sCapHeight: p.C,
    usWeightClass: p.weight,
    ...(p.mono ? { xAvgCharWidth: p.monoAdvance } : {}),
  };
  // opentype.js writes italicAngle as it is given: a 16.16 fixed-point number.
  font.tables.post = { ...(p.mono ? { isFixedPitch: 1 } : {}), ...(p.italic ? { italicAngle: -ITALIC_ANGLE * 65536 } : {}) };
  // head.macStyle: bit 0 bold, bit 1 italic — what macOS reads to group the styles.
  const macStyle = (p.weight >= 700 ? 1 : 0) | (p.italic ? 2 : 0);
  const otf = Buffer.from(font.toArrayBuffer());
  if (p.mono) return rewrite(otf, [{ tag: "gasp", data: GASP }], macStyle);
  const index = new Map();
  glyphs.forEach((g, i) => {
    if (g.unicode !== undefined) index.set(String.fromCodePoint(g.unicode), i);
  });
  const pairs = [];
  for (const [key, v] of kerningFor([...index.keys()], p)) {
    if (v === 0) continue;
    const [a, b] = key.split("\u0000");
    pairs.push([index.get(a), index.get(b), v]);
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  // A format-0 subtable holds at most 10920 pairs (its length is 16 bits); keep the largest.
  if (pairs.length > 10920) {
    pairs.sort((x, y) => Math.abs(y[2]) - Math.abs(x[2]) || x[0] - y[0] || x[1] - y[1]);
    pairs.length = 10920;
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  }
  // A subset with no pair in it (a script with nothing in the table) gets no kern table at all.
  const extra = [{ tag: "gasp", data: GASP }];
  if (pairs.length > 0) extra.push({ tag: "kern", data: kernTable(pairs) });
  return rewrite(otf, extra, macStyle);
}

/** One face: its complete font and its subset fonts, as OpenType bytes. */
export function buildFace(face) {
  const p = resolve(face.key, face.weight, face.mono, { opsz: face.opsz, italic: face.italic, width: face.width });
  const base = buildGlyphs(p);
  const alts = buildAlternates(p, base);
  let drawn = [...base, ...alts.glyphs];
  if (face.italic) drawn = italicize(drawn, p);
  const full = makeFont(p, drawn, alts);
  const subsets = [];
  // An alternate ships with the character it stands for (`base`), so a subset file carries the
  // features of its own characters.
  const subsetFor = (d) => subsetOf((d.unicode ?? d.base).codePointAt(0));
  for (const name of subsetsFor(face)) {
    const part = drawn.filter((d) => subsetFor(d) === name);
    if (!part.some((d) => d.unicode)) continue;
    subsets.push({ name, cps: part.filter((d) => d.unicode).map((d) => d.unicode.codePointAt(0)), otf: makeFont(p, part, alts) });
  }
  return { p, full, subsets };
}

function kernTable(pairs) {
  const n = pairs.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  const sub = Buffer.alloc(14 + 6 * n);
  sub.writeUInt16BE(0, 0); // subtable version
  sub.writeUInt16BE(sub.length, 2);
  sub.writeUInt16BE(0x0001, 4); // horizontal, format 0
  sub.writeUInt16BE(n, 6);
  sub.writeUInt16BE(pow * 6, 8);
  sub.writeUInt16BE(log, 10);
  sub.writeUInt16BE(n * 6 - pow * 6, 12);
  pairs.forEach(([l, r, v], i) => {
    sub.writeUInt16BE(l, 14 + i * 6);
    sub.writeUInt16BE(r, 16 + i * 6);
    sub.writeInt16BE(v, 18 + i * 6);
  });
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(1, 2);
  return Buffer.concat([head, sub]);
}

const checksum = (buf) => {
  const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
};

/**
 * Rewrites an sfnt — optionally with one more table — with the directory sorted by tag and
 * offsets and checksums recomputed. head.modified is set to head.created on the way: the
 * writer stamps the current time there, which would make every build differ. head.macStyle is
 * set there too: the writer leaves it 0.
 */
function rewrite(font, extra = [], macStyle = 0) {
  const num = font.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < num; i++) {
    const rec = 12 + i * 16;
    const t = font.toString("latin1", rec, rec + 4);
    const off = font.readUInt32BE(rec + 8);
    const len = font.readUInt32BE(rec + 12);
    const data = Buffer.from(font.subarray(off, off + len));
    // makeFont sets USE_TYPO_METRICS (fsSelection bit 7), which is only defined from OS/2 version
    // 4; the writer emits version 3, which leaves a renderer free to ignore the bit and take the
    // line height from the Windows metrics. Versions 3 and 4 have the same fields.
    if (t === "OS/2" && data.readUInt16BE(0) < 4) data.writeUInt16BE(4, 0);
    tables.push({ tag: t, data });
  }
  tables.push(...extra.map(({ tag, data }) => ({ tag, data: Buffer.from(data) })));
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const n = tables.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  const header = Buffer.alloc(12 + 16 * n);
  font.copy(header, 0, 0, 4); // sfnt version (OTTO)
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(log, 8);
  header.writeUInt16BE(n * 16 - pow * 16, 10);
  let offset = header.length;
  const bodies = [];
  let headOffset = 0;
  tables.forEach((t, i) => {
    if (t.tag === "head") {
      t.data.writeUInt32BE(0, 8); // checkSumAdjustment is computed over the whole file below
      t.data.copy(t.data, 28, 20, 28); // modified = created
      t.data.writeUInt16BE(macStyle, 44);
      headOffset = offset;
    }
    const rec = 12 + i * 16;
    header.write(t.tag, rec, 4, "latin1");
    header.writeUInt32BE(checksum(t.data), rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(t.data.length, rec + 12);
    const pad = Buffer.alloc((4 - (t.data.length % 4)) % 4);
    bodies.push(t.data, pad);
    offset += t.data.length + pad.length;
  });
  const out = Buffer.concat([header, ...bodies]);
  out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headOffset + 8);
  return out;
}

/**
 * Every face: the three Sans families in three optical sizes, the three monos, each weight its
 * size has, upright and italic. `file` is the complete font; `base` names its subset files.
 */
export function fontList() {
  const list = [];
  for (const key of Object.keys(FAMILIES)) {
    const kinds = [
      ...Object.keys(OPTICAL).map((opsz) => ({ mono: false, opsz, width: "normal" })),
      ...(WIDTHS.condensed.families.includes(key) ? [{ mono: false, opsz: "text", width: "condensed" }] : []),
      { mono: true, opsz: "text", width: "normal" },
    ];
    for (const { mono, opsz, width } of kinds) {
      for (const weight of mono ? WEIGHTS : OPTICAL[opsz].weights) {
        for (const italic of OPTICAL[opsz].italics === false && !mono ? [false] : [false, true]) {
          const p = resolve(key, weight, mono, { opsz, italic, width });
          const base = `${p.file}-${weight}${italic ? "-italic" : ""}`;
          list.push({ key, mono, opsz: p.opsz, width, weight, italic, name: p.name, base, file: `${base}.woff2` });
        }
      }
    }
  }
  return list;
}

const STACK = { sans: "system-ui, sans-serif", mono: "ui-monospace, monospace" };

/** The condensed family a family's `.oq-condensed` uses: its own, or Sans Condensed for Clear. */
const condensedOf = (key) => `${FAMILIES[WIDTHS.condensed.families.includes(key) ? key : "sans"].name}${WIDTHS.condensed.suffix}`;

/** The five role variables for one family key; `condensed` sets the condensed cut as the sans. */
function roleVars(key, condensed = false) {
  const f = FAMILIES[key];
  const sans = condensed ? `"${condensedOf(key)}", "${f.name}"` : `"${f.name}"`;
  return [
    `--oq-font-sans: ${sans}, ${STACK.sans};`,
    `--oq-font-mono: "${f.monoName}", ${STACK.mono};`,
    `--oq-font-caption: ${condensed ? sans : `"${f.name}${OPTICAL.caption.suffix}", "${f.name}"`}, ${STACK.sans};`,
    `--oq-font-display: "${f.name}${OPTICAL.display.suffix}", "${f.name}", ${STACK.sans};`,
    `--oq-font-condensed: "${condensedOf(key)}", "${f.name}", ${STACK.sans};`,
  ];
}

/** styles/fonts.css: one @font-face per face and subset, the optical-size roles, and the data-font switch. */
export function fontsCss(faces) {
  const lines = [
    "/* GENERATED by type/build.mjs from type/params.mjs — do not edit by hand. */",
    "",
    "/*",
    " * The OSQD typefaces. Each face is split into unicode-range subsets, so a page downloads only",
    " * the scripts it renders. Sans and Mono are the defaults (src/theme/index.ts); the Caption cut",
    " * sets the kit's small text and the Display cut its large headings. data-font on any element",
    ' * switches the subtree to another family: "tech", "clear", "sans", "condensed" (Sans',
    ' * Condensed), "tech-condensed", or "system" for the platform\'s own fonts. .oq-condensed sets',
    " * a subtree in the current family's condensed cut, and the .oq-pnum … .oq-subs utilities turn",
    " * on the fonts' OpenType features. Paths are relative to this file and to dist/osqd-ui.css alike.",
    " */",
    "",
  ];
  for (const f of faces) {
    for (const s of f.subsets) {
      lines.push(
        `@font-face{font-family:"${f.name}";font-style:${f.italic ? "italic" : "normal"};font-weight:${f.weight};font-display:swap;src:url("../assets/fonts/subsets/${f.base}.${s.name}.woff2") format("woff2");unicode-range:${unicodeRange(s.cps)}}`,
      );
    }
  }
  lines.push("");
  lines.push(`/* The roles. Caption and Display fall back to the Text cut, then to the platform's sans. */`);
  lines.push(`:root,\n:host {\n  ${roleVars("sans").slice(2).join("\n  ")}\n}`);
  for (const key of Object.keys(FAMILIES)) {
    lines.push(`[data-font="${key}"],\n[data-font="${key}"] [data-theme],\n:host([data-font="${key}"]) {\n  ${roleVars(key).join("\n  ")}\n}`);
  }
  for (const key of WIDTHS.condensed.families) {
    const tag = key === "sans" ? "condensed" : `${key}-condensed`;
    lines.push(`[data-font="${tag}"],\n[data-font="${tag}"] [data-theme],\n:host([data-font="${tag}"]) {\n  ${roleVars(key, true).join("\n  ")}\n}`);
  }
  lines.push(
    `[data-font="system"],\n[data-font="system"] [data-theme],\n:host([data-font="system"]) {\n  --oq-font-sans: ${STACK.sans};\n  --oq-font-mono: ${STACK.mono};\n  --oq-font-caption: ${STACK.sans};\n  --oq-font-display: ${STACK.sans};\n  --oq-font-condensed: ${STACK.sans};\n}`,
  );
  lines.push("");
  lines.push("/* font-family inherits as a resolved value, so it has to be set again where the variable changes. */");
  lines.push("[data-font] {\n  font-family: var(--oq-font-sans);\n}");
  lines.push("");
  lines.push("/* Small text is set in the Caption cut, drawn to stay open at 12 px and below; the largest headings in Display. */");
  lines.push(
    ".oq :where(.oq-tiny, .oq-overline, .oq-help, .oq-chip, .oq-badge, .oq-table thead th, .oq-stat__label, .oq-tab .oq-badge):not(.oq-mono, code, kbd, pre) {\n  font-family: var(--oq-font-caption, var(--oq-font-sans));\n}",
  );
  lines.push(".oq :where(.oq-h1, .oq-h2):not(.oq-mono) {\n  font-family: var(--oq-font-display, var(--oq-font-sans));\n}");
  lines.push("");
  lines.push("/* The condensed cut for dense tables and panels: OSQD Sans Condensed, Tech Condensed (Clear sets Sans Condensed). */");
  lines.push(".oq-condensed {\n  --oq-font-caption: var(--oq-font-condensed, var(--oq-font-sans));\n  font-family: var(--oq-font-condensed, var(--oq-font-sans));\n}");
  lines.push("");
  lines.push("/*");
  lines.push(" * OpenType features. Figures are tabular by default (UI first); these switch them per element.");
  lines.push(" * font-variant-* rather than font-feature-settings, so they combine instead of overriding each other.");
  lines.push(" */");
  lines.push(".oq :where(.oq-num, .oq-mono, code, kbd, pre, .oq-table td) {\n  font-variant-numeric: tabular-nums;\n}");
  lines.push(".oq-pnum {\n  font-variant-numeric: proportional-nums;\n}");
  lines.push(".oq-zero {\n  font-variant-numeric: slashed-zero;\n}");
  lines.push(".oq-frac {\n  font-variant-numeric: diagonal-fractions;\n}");
  lines.push(".oq-sups {\n  font-variant-position: super;\n}");
  lines.push(".oq-subs {\n  font-variant-position: sub;\n}");
  lines.push("/* ss01: Clear's distinguishing forms (serifed I, tailed l, 1 with a base) in Sans and Tech. */");
  lines.push(".oq-ss01 {\n  font-variant-alternates: normal;\n  font-feature-settings: \"ss01\";\n}");
  lines.push("/* case: dashes, brackets and colons raised to sit on capitals — automatic on the kit's upper-case labels. */");
  lines.push(".oq-case,\n.oq :where(.oq-overline) {\n  font-feature-settings: \"case\";\n}");
  lines.push("");
  return lines.join("\n");
}

const OFL = `${COPYRIGHT.replace(" Licensed under the SIL Open Font License, Version 1.1.", "")}
OSQD Sans, OSQD Mono, OSQD Tech, OSQD Tech Mono, OSQD Clear and OSQD Clear Mono,
with their Caption and Display optical sizes.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) and the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
`;

async function main() {
  const check = process.argv.includes("--check");
  const otfIdx = process.argv.indexOf("--otf");
  const otfDir = otfIdx > 0 ? process.argv[otfIdx + 1] : "";
  const started = Date.now();
  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return "";
    }
  };
  const stale = [];
  if (!check) mkdirSync(subsetDir, { recursive: true });
  const faces = [];
  let bytes = 0;
  const compare = (path, data, label) => {
    bytes += data.length;
    if (!check) return writeFileSync(path, data);
    let current = null;
    try {
      current = readFileSync(path);
    } catch {}
    if (!current || !current.equals(data)) stale.push(label);
  };
  const list = fontList();
  const built = new Map((await buildInWorkers(list)).map((r) => [r.file, r]));
  for (const f of list) {
    const { full, woff2, subsets } = built.get(f.file);
    if (otfDir) {
      mkdirSync(otfDir, { recursive: true });
      writeFileSync(join(otfDir, f.file.replace(".woff2", ".otf")), Buffer.from(full));
    }
    compare(join(outDir, f.file), Buffer.from(woff2), f.file);
    for (const s of subsets) {
      const name = `${f.base}.${s.name}.woff2`;
      compare(join(subsetDir, name), Buffer.from(s.woff2), `subsets/${name}`);
    }
    faces.push({ ...f, subsets: subsets.map(({ name, cps }) => ({ name, cps })) });
  }
  // A face no longer built leaves its old files behind (nothing here deletes); say so, since the
  // package ships the whole subsets directory.
  const made = new Set(faces.flatMap((f) => [f.file, ...f.subsets.map((sub) => `subsets/${f.base}.${sub.name}.woff2`)]));
  const leftover = [...readdirSync(outDir).filter((n) => n.endsWith(".woff2")), ...readdirSync(subsetDir).map((n) => `subsets/${n}`)].filter((n) => !made.has(n));
  if (leftover.length) console.warn(`type: ${leftover.length} font file(s) in assets/fonts are not built any more and should be removed: ${leftover.slice(0, 4).join(", ")}${leftover.length > 4 ? ", …" : ""}`);
  // `--list-stale` prints every one of them, one path per line relative to assets/fonts, and stops:
  // what a person (or a script) needs before moving them out of the way.
  if (process.argv.includes("--list-stale")) {
    for (const n of leftover) console.log(n);
    process.exit(0);
  }
  const css = fontsCss(faces);
  // fonts.html shows what the fonts carry; the coverage is written into it so it works from disk.
  const ref = faces.find((f) => f.key === "sans" && !f.mono && f.opsz === "text" && f.weight === 400 && !f.italic);
  const coverage = Object.fromEntries(ref.subsets.map((sub) => [sub.name, [...sub.cps].sort((a, b) => a - b)]));
  const specimenPath = join(root, "fonts.html");
  const specimen = read(specimenPath).replace(/<!-- FONTS:COVERAGE:START -->[\s\S]*?<!-- FONTS:COVERAGE:END -->/, `<!-- FONTS:COVERAGE:START -->${JSON.stringify(coverage)}<!-- FONTS:COVERAGE:END -->`);
  const oflPath = join(outDir, "OFL.txt");
  const cssPath = join(root, "styles/fonts.css");
  const files = faces.reduce((n, f) => n + 1 + f.subsets.length, 0);
  const summary = `${faces.length} faces, ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB, ${((Date.now() - started) / 1000).toFixed(1)} s`;
  if (check) {
    if (read(oflPath) !== OFL) stale.push("OFL.txt");
    if (read(cssPath) !== css) stale.push("styles/fonts.css");
    if (read(specimenPath) !== specimen) stale.push("fonts.html (coverage)");
    if (stale.length) {
      console.error(`assets/fonts is out of date (${stale.slice(0, 8).join(", ")}${stale.length > 8 ? `, and ${stale.length - 8} more` : ""}) — run \`npm run fonts\`.`);
      process.exit(1);
    }
    console.log(`assets/fonts is up to date (${summary}).`);
  } else {
    writeFileSync(oflPath, OFL);
    writeFileSync(cssPath, css);
    writeFileSync(specimenPath, specimen);
    console.log(`wrote assets/fonts (${summary})`);
  }
}

/**
 * Builds and compresses the faces on worker threads — the output does not depend on which
 * worker built what, so the bytes stay deterministic. OSQD_FONT_WORKERS caps the count.
 */
function buildInWorkers(list) {
  const n = Math.max(1, Math.min(availableParallelism(), Number(process.env.OSQD_FONT_WORKERS) || 8, list.length));
  const chunks = Array.from({ length: n }, (_, i) => list.filter((_, j) => j % n === i));
  return Promise.all(
    chunks.map(
      (faces) =>
        new Promise((done, fail) => {
          const out = [];
          const worker = new Worker(new URL(import.meta.url), { workerData: { faces } });
          worker.on("message", (m) => out.push(m));
          worker.on("error", fail);
          worker.on("exit", (code) => (code === 0 ? done(out) : fail(new Error(`a font worker exited with ${code}`))));
        }),
    ),
  ).then((parts) => parts.flat());
}

async function work() {
  for (const f of workerData.faces) {
    const { full, subsets } = buildFace(f);
    // wawoff2 returns a view into its WebAssembly memory, which the next compress() overwrites:
    // copy each result out before compressing the next.
    const woff2 = Buffer.from(await wawoff2.compress(full));
    const parts = [];
    for (const s of subsets) parts.push({ name: s.name, cps: s.cps, woff2: Buffer.from(await wawoff2.compress(s.otf)) });
    parentPort.postMessage({ file: f.file, full, woff2, subsets: parts });
  }
}

if (!isMainThread && workerData?.faces) await work();
else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
