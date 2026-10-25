// Every OSQD glyph, drawn from the primitives in geom.mjs and the numbers in params.mjs.
//
// A drawing gets a pen `g` and a body width `w` (the ink width the glyph should have: from the
// width table in proportional fonts, from the fixed advance in monospaced ones) and draws in
// local units with the baseline at y = 0 and the ink starting near x = 0. The builder then
// places the ink between side-bearings chosen by the shape of each side:
//   S straight, R round, D diagonal, T tight (overhanging), N none (the drawing positions itself).

import { bar, bbox, disc, ellipse, mirrorX, mirrorY, orient, pointAt, polygon, rect, ring, sector, stroke, transform } from "./geom.mjs";
import { SCRIPT_MODULES } from "./scripts/index.mjs";
import { scriptDigit } from "./scripts/symbols.mjs";

/** The stroke of a t or f curl: the stem up to Bold's, then growing at 0.4 of the stem's pace. */
const curlStroke = (S) => (S > 130 ? 130 + (S - 130) * 0.4 : S);

/** The pen a drawing works with. */
function pen(p) {
  const contours = [];
  const add = (c) => {
    if (Array.isArray(c)) contours.push(...c);
    else contours.push(c);
  };
  const g = {
    p,
    contours,
    add,
    rect: (x0, y0, x1, y1) => add(rect(x0, y0, x1, y1)),
    stroke: (x0, y0, x1, y1, t = p.S * 0.93) => add(stroke(x0, y0, x1, y1, t)),
    bar: (x0, y0, x1, y1, t = p.S) => add(bar(x0, y0, x1, y1, t)),
    poly: (pts) => add(polygon(pts)),
    ring: (x0, y0, x1, y1, sx = p.S, sy = p.H, k = p.k) => add(ring(x0, y0, x1, y1, sx, sy, k, k === p.k ? p.kin : k + 0.03)),
    // Every sector runs a hair past both ends: a join that only touches leaves a hairline
    // seam when the browser antialiases the two shapes separately.
    sector: (x0, y0, x1, y1, q0, q1, c0 = p.cut, c1 = c0, sx = p.S, sy = p.H, k = p.k) =>
      add(sector(x0, y0, x1, y1, sx, sy, k, q0 - 0.02, q1 + 0.02, c0, c1, k === p.k ? p.kin : k + 0.03)),
    dot: (cx, cy, d = p.S * 1.12) => {
      if (p.dot === "round") add(disc(cx - d * 0.56, cy - d * 0.56, cx + d * 0.56, cy + d * 0.56));
      else add(rect(cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2));
    },
    /**
     * The stem, capped at the monospaced Bold stem: what slab serifs are measured in. A heavier
     * weight thickens a slab but must not lengthen it, or the ink outgrows the fixed advance.
     */
    slab: Math.min(p.S, 134),
    /** Remember the ink box so accents added afterwards do not move the glyph. */
    mark: () => {
      g.base = bbox(contours);
    },
    base: null,
  };
  return g;
}

/** Horizontal half-width of a diagonal stroke of thickness t over (dx, dy). */
const hwOf = (t, dx, dy) => (t / 2) * (Math.hypot(dx, dy) / Math.abs(dy || 1));

/* ------------------------------------------------------------------ shared parts */

/** The n shoulder: an arch from the left stem over the x-height down into a right stem. */
function arch(g, x0, x1, top, depth) {
  const { S, O } = g.p;
  const cy = top - depth;
  g.sector(x0, cy - (top + O - cy), x1, top + O, 0, 1.62, "r", "r");
  g.rect(x1 - S, 0, x1, cy + 6);
  return cy;
}

function nShape(g, w, stemTop) {
  const { S, X } = g.p;
  g.rect(0, 0, S, stemTop);
  arch(g, 0, w, X, X * 0.36);
}

/** Two stacked half-rings joined by a spine: the s, S, $ and the bones of 3 and 8. */
function sShape(g, x0, x1, y0, y1, ap, H) {
  const { S, cut } = g.p;
  const m = y0 + (y1 - y0) * 0.52;
  const w = x1 - x0;
  const inset = w * 0.05;
  // Upper bowl: from the top-right terminal round the left side to the spine.
  g.sector(x0 + inset, m - H / 2, x1 - inset, y1, ap * 0.85, 3.0, cut, "r", S * 0.98, H);
  // Lower bowl: from the spine round the right side to the bottom-left terminal.
  g.sector(x0, y0, x1, m + H / 2, 2 + ap * 0.85, 5.0, cut, "r", S * 0.98, H);
}

function vShape(g, x0, x1, top, bottom, t) {
  const cx = (x0 + x1) / 2;
  const hw = hwOf(t, cx - x0, top - bottom);
  g.stroke(x0 + hw, top, cx, bottom, t);
  g.stroke(x1 - hw, top, cx, bottom, t);
}

/* ------------------------------------------------------------------ accents */

function acute(g, cx, top) {
  const { S } = g.p;
  const t = S * 0.9;
  g.add(bar(cx - S * 0.55, top + 40, cx + S * 0.95, top + 190, t));
}

function dotAbove(g, cx, top) {
  const { S } = g.p;
  g.dot(cx, top + 70 + S * 0.56);
}

function ogonek(g, x, base = 0) {
  const { S, H } = g.p;
  const r = 120;
  // A small hook hanging from the baseline, curling left then back to the right.
  g.sector(x - r * 1.05, base - 230, x + r * 0.15, base + 10, 1.0, 3.55, "r", "h", S * 0.82, H * 0.9);
}

/* ------------------------------------------------------------------ glyph table */
// name, code point(s), sides, width (regular OSQD Sans ink width), draw

const LOWER = {
  a: ["SS", 418, (g, w) => {
    const { S, H, X, O } = g.p;
    const cy = X * 0.62;
    g.sector(w * 0.02, cy - (X + O - cy), w, X + O, 0, 1.0 + 0.62 - g.p.ap * 0.25, "r", g.p.cut);
    g.rect(w - S, 0, w, cy + 1);
    // The bowl is drawn a little lighter than the stems, or its counter closes at Bold.
    g.ring(0, -O, w - S * 0.35, X * 0.57, S * 0.9, H * 0.88);
  }],
  b: ["SR", 440, (g, w) => {
    const { S, A, X, O } = g.p;
    g.rect(0, 0, S, A);
    g.ring(0, -O, w, X + O);
  }],
  c: ["RR", 404, (g, w) => {
    const { X, O, ap } = g.p;
    g.sector(0, -O, w, X + O, ap, 4 - ap);
  }],
  d: ["RS", 440, (g, w) => {
    const { S, A, X, O } = g.p;
    g.rect(w - S, 0, w, A);
    g.ring(0, -O, w, X + O);
  }],
  e: ["RR", 426, (g, w) => {
    const { S, H, X, O, ap } = g.p;
    g.sector(0, -O, w, X + O, 0, 4 - ap * 1.25, "r");
    const y = X * 0.45;
    g.rect(S * 0.5, y, w, y + H);
  }],
  // f: a diagonal-sized left side for the crossbar, and a tight right side (T) so the hook
  // overhangs the next letter the way it does in running text.
  f: ["DT", 262, (g, w) => {
    const { S, H, A, X, O } = g.p;
    const xs = w * 0.22;
    // A compact hook whose end sits above the end of the crossbar, so the f spaces from its
    // crossbar like every other letter instead of from a hook hanging far to the right. The
    // hook is the top of a full circle standing on the stem, so it keeps its shape at Bold.
    // The hook grows with the stroke only as fast as its inside needs to stay open: tied to the
    // stem outright, it ballooned at ExtraBold and pushed the crossbar (and the next letter) away.
    const r = Math.max(S * 1.08, g.p.mono ? Math.min(150, (w - xs) * 0.95) : 104 * (S / 84) ** 0.3);
    // As in t: thinner than the stem past Bold, with a fillet into it, so the hook stays open.
    const sx = curlStroke(S);
    const yJ = A + O - r + 6;
    g.rect(xs, 0, xs + S, yJ);
    g.sector(xs, A + O - 2 * r, xs + 2 * r, A + O, 0.5, 2.0, g.p.cut, "r", sx, H);
    if (sx < S) g.poly([[xs + S, yJ], [xs + sx, yJ], pointAt(ellipse(xs + sx, A + O - 2 * r + H, xs + 2 * r - sx, A + O - H, g.p.kin), 1.6)]);
    g.rect(0, X - H, g.p.mono ? w * 0.86 : xs + r * 1.78, X);
  }],
  g: ["RS", 440, (g, w) => {
    const { S, D, X, O } = g.p;
    const hr = 150;
    g.ring(0, -O, w, X + O);
    g.rect(w - S, D + hr - O - 8, w, X);
    g.sector(w * 0.06, D - O, w, D + 2 * hr, 2.55, 4.0, g.p.cut, "r");
  }],
  h: ["SS", 410, (g, w) => nShape(g, w, g.p.A)],
  i: ["SS", 0, (g) => {
    const { S, X } = g.p;
    if (g.p.mono) return monoI(g, X, true);
    g.rect(0, 0, S, X);
    g.mark();
    g.dot(S / 2, X + 130);
  }],
  j: ["TS", 0, (g, w) => {
    const { S, X, D, O } = g.p;
    const hr = 140;
    const x = g.p.mono ? w * 0.62 : 150;
    g.rect(x, D + hr - O - 8, x + S, X);
    g.sector(x - 2 * hr + S, D - O, x + S, D + 2 * hr, 2.6, 4.0, g.p.cut, "r");
    if (g.p.mono) g.rect(x - g.slab * 1.9, X - g.p.H, x + S, X);
    g.mark();
    g.dot(x + S / 2, X + 130);
  }],
  k: ["SD", 404, (g, w) => {
    const { S, A, X } = g.p;
    g.rect(0, 0, S, A);
    const t = S * 0.92;
    const hw = hwOf(t, w - S, X * 0.65);
    g.stroke(w - hw, X, S * 0.6 + hw, X * 0.3, t);
    g.stroke(S + w * 0.2, X * 0.5, w - hw, 0, t);
  }],
  l: ["SS", 0, (g, w) => {
    const { S, A, H } = g.p;
    if (g.p.mono) {
      const x = w * 0.42;
      g.stemX = x + S / 2;
      g.rect(x, 134, x + S, A);
      g.rect(x - g.slab * 1.6, A - H, x + S, A);
      g.sector(x, -g.p.O, x + 300, 280, 2.0, 3.6, "r", g.p.cut);
      return;
    }
    g.stemX = S / 2;
    if (g.p.tailL) {
      g.rect(0, 114, S, A);
      g.sector(0, -g.p.O, 250, 240, 2.0, 3.55, "r", g.p.cut);
      return;
    }
    g.rect(0, 0, S, A);
  }],
  m: ["SS", 660, (g, w) => {
    const { S, X } = g.p;
    // The mono cell does not grow with the stems: past Bold its three stems step down further.
    const s = g.p.mono ? S * (S > 130 ? 0.76 : 0.86) : S;
    const m1 = (w + s) / 2;
    g.rect(0, 0, s, X);
    g.add(sector(0, X - 2 * X * 0.36 - g.p.O, m1, X + g.p.O, s, g.p.H, g.p.k, 0, 1.62, "r", "r", g.p.kin));
    g.rect(m1 - s, 0, m1, X - X * 0.36 + 1);
    g.add(sector(m1 - s, X - 2 * X * 0.36 - g.p.O, w, X + g.p.O, s, g.p.H, g.p.k, 0, 1.62, "r", "r", g.p.kin));
    g.rect(w - s, 0, w, X - X * 0.36 + 1);
  }],
  n: ["SS", 410, (g, w) => nShape(g, w, g.p.X)],
  o: ["RR", 456, (g, w) => {
    const { X, O } = g.p;
    g.ring(0, -O, w, X + O);
  }],
  p: ["SR", 440, (g, w) => {
    const { S, X, D, O } = g.p;
    g.rect(0, D, S, X);
    g.ring(0, -O, w, X + O);
  }],
  q: ["RS", 440, (g, w) => {
    const { S, X, D, O } = g.p;
    g.rect(w - S, D, w, X);
    g.ring(0, -O, w, X + O);
  }],
  r: ["SN", 268, (g, w) => {
    const { S, X, O } = g.p;
    if (g.p.mono) {
      const x = w * 0.28;
      g.rect(x, 0, x + S, X);
      // Past Bold the arm pulls in by what the stem gained, so the ink keeps to the advance.
      g.add(sector(x, X - 2 * X * 0.4 - O, x + w * 0.95 - (S - g.slab) * 1.5, X + O, S, g.p.H, g.p.k, 0.55, 1.62, g.p.cut, "r", g.p.kin));
      g.rect(x - g.slab * 1.2, 0, x + S + g.slab * 1.2, g.p.H);
      return;
    }
    g.rect(0, 0, S, X);
    g.add(sector(0, X - 2 * X * 0.4 - O, w * 1.42, X + O, S, g.p.H, g.p.k, 0.6, 1.62, g.p.cut, "r", g.p.kin));
  }],
  s: ["RR", 380, (g, w) => {
    const { X, O, H, ap } = g.p;
    sShape(g, 0, w, -O, X + O, ap, H * 1.06);
  }],
  t: ["NR", 276, (g, w) => {
    const { S, H, X, A, O } = g.p;
    const xs = w * 0.24;
    // Never tighter than the stroke allows, or the inside of the curl collapses at Bold — but no
    // looser either: tied to the stem at 1.45, the curl ballooned at 700–800 and "attempts" read
    // as "at tempts".
    const r = Math.max(S * 1.12, Math.min(140, (w - xs) * 0.8));
    // Past Bold the curl is drawn thinner than the stem — a full-weight curl closes up into a
    // solid foot at ExtraBold and Black — and a fillet runs from the stem into the thinner curl,
    // so the join has no step. Below Bold, sx is the stem and nothing changes.
    const sx = curlStroke(S);
    const yJ = r - O - 8;
    g.rect(xs, yJ, xs + S, X + (A - X) * 0.4);
    g.sector(xs, -O, xs + 2 * r, 2 * r - O, 2.0, 3.48, "r", g.p.cut === "r" ? "r" : "v", sx, H);
    if (sx < S) g.poly([[xs + S, yJ], [xs + sx, yJ], pointAt(ellipse(xs + sx, -O + H, xs + 2 * r - sx, 2 * r - O - H, g.p.kin), 2.4)]);
    g.rect(0, X - H, w * 0.9, X);
  }],
  u: ["SS", 410, (g, w) => {
    const { X } = g.p;
    const tmp = pen(g.p);
    nShape(tmp, w, X);
    g.add(mirrorY(mirrorX(tmp.contours, w / 2), X / 2));
  }],
  v: ["DD", 446, (g, w) => vShape(g, 0, w, g.p.X, 0, g.p.S * 0.93)],
  w: ["DD", 668, (g, w) => {
    const { X, S } = g.p;
    const t = S * (g.p.mono ? 0.78 : 0.86);
    vShape(g, 0, w * 0.56, X, 0, t);
    vShape(g, w * 0.44, w, X, 0, t);
  }],
  x: ["DD", 440, (g, w) => {
    const { X, S } = g.p;
    const t = S * 0.93;
    const hw = hwOf(t, w, X);
    g.stroke(hw, X, w - hw, 0, t);
    g.stroke(w - hw, X, hw, 0, t);
  }],
  y: ["DD", 446, (g, w) => {
    const { X, D, S } = g.p;
    const t = S * 0.93;
    const cx = w * 0.47;
    const hw = hwOf(t, cx, X);
    g.stroke(hw, X, cx, 0, t);
    const x1 = w - hw;
    const slope = (x1 - cx) / X;
    g.stroke(x1, X, cx + slope * D, D, t);
  }],
  z: ["SS", 384, (g, w) => {
    const { X, H, S } = g.p;
    g.rect(w * 0.04, X - H, w, X);
    g.rect(0, 0, w, H);
    const t = S * 0.98;
    const hw = hwOf(t, w, X);
    g.stroke(w - hw - 2, X - H, hw + 2, H, t);
  }],
};

/** Monospaced i and l get slabs so they fill their cell; Clear's I always has them. */
function monoI(g, top, dot) {
  const { S, H } = g.p;
  const x = 230;
  g.rect(x, 0, x + S, top);
  g.rect(x - g.slab * 1.5, top - H, x + S, top);
  g.rect(x - g.slab * 1.5 - 30, 0, x + S + g.slab * 1.5 + 30, H);
  g.mark();
  if (dot) g.dot(x + S / 2, top + 130);
}

const UPPER = {
  A: ["DD", 600, (g, w) => {
    const { C, S, H } = g.p;
    const t = S * 0.98;
    const cx = w / 2;
    const hw = hwOf(t, cx, C);
    g.stroke(hw, 0, cx, C, t);
    g.stroke(w - hw, 0, cx, C, t);
    const y = C * 0.26;
    const xl = hw + (cx - hw) * (y / C);
    g.rect(xl, y, w - xl, y + H);
  }],
  B: ["SR", 486, (g, w) => {
    const { C, S, H, k } = g.p;
    g.rect(0, 0, S, C);
    const m = C * 0.53;
    const kk = Math.min(0.9, k + 0.16);
    const wu = w * 0.92;
    g.rect(0, C - H, wu * 0.56, C);
    g.rect(0, m - H / 2, w * 0.56, m + H / 2);
    g.rect(0, 0, w * 0.56, H);
    g.sector(wu * 0.02, m - H / 2, wu, C, 3, 5, "r", "r", S, H, kk);
    g.sector(0, 0, w, m + H / 2, 3, 5, "r", "r", S, H, kk);
  }],
  C: ["RR", 548, (g, w) => {
    const { C, OC, ap } = g.p;
    g.sector(0, -OC, w, C + OC, ap * 0.95, 4 - ap * 0.95);
  }],
  D: ["SR", 540, (g, w) => {
    const { C, S, H, k } = g.p;
    const kk = Math.min(0.92, k + 0.2);
    g.rect(0, 0, S, C);
    g.rect(0, C - H, w * 0.56, C);
    g.rect(0, 0, w * 0.56, H);
    g.sector(0, 0, w, C, 3, 5, "r", "r", S, H, kk);
  }],
  E: ["SS", 430, (g, w) => {
    const { C, S, H } = g.p;
    g.rect(0, 0, S, C);
    g.rect(0, C - H, w, C);
    g.rect(0, C * 0.48 - H / 2, w * 0.9, C * 0.48 + H / 2);
    g.rect(0, 0, w, H);
  }],
  F: ["SS", 416, (g, w) => {
    const { C, S, H } = g.p;
    g.rect(0, 0, S, C);
    g.rect(0, C - H, w, C);
    g.rect(0, C * 0.46 - H / 2, w * 0.9, C * 0.46 + H / 2);
  }],
  G: ["RS", 560, (g, w) => {
    const { C, OC, S, H, ap } = g.p;
    const y = C * 0.46;
    g.sector(0, -OC, w, C + OC, ap * 0.8, 4.0, g.p.cut, "r");
    g.rect(w - S, C * 0.12, w, y);
    g.rect(w * 0.54, y - H, w, y);
  }],
  H: ["SS", 512, (g, w) => {
    const { C, S, H } = g.p;
    g.rect(0, 0, S, C);
    g.rect(w - S, 0, w, C);
    g.rect(0, C * 0.48 - H / 2, w, C * 0.48 + H / 2);
  }],
  I: ["SS", 0, (g, w) => {
    const { C, S, H } = g.p;
    if (g.p.serifI) {
      const half = g.p.mono ? w * 0.36 : S * 1.65;
      const cx = g.p.mono ? w / 2 : half;
      g.rect(cx - S / 2, 0, cx + S / 2, C);
      g.rect(cx - half, C - H, cx + half, C);
      g.rect(cx - half, 0, cx + half, H);
      return;
    }
    g.rect(0, 0, S, C);
  }],
  J: ["NS", 400, (g, w) => {
    const { C, S, OC } = g.p;
    const r = w * 0.48;
    g.rect(w - S, r - OC - 6, w, C);
    g.sector(0, -OC, w, 2 * r - OC, 2.35, 4.0, g.p.cut, "r");
    if (g.p.serifI) g.rect(w * 0.3, C - g.p.H, w, C);
  }],
  K: ["SD", 520, (g, w) => {
    const { C, S } = g.p;
    const t = S * 0.98;
    g.rect(0, 0, S, C);
    const hw = hwOf(t, w - S, C * 0.7);
    g.stroke(w - hw, C, S * 0.6 + hw, C * 0.3, t);
    g.stroke(S + w * 0.24, C * 0.52, w - hw, 0, t);
  }],
  L: ["SS", 404, (g, w) => {
    const { C, S, H } = g.p;
    g.rect(0, 0, S, C);
    g.rect(0, 0, w, H);
  }],
  M: ["SS", 652, (g, w) => {
    const { C, S } = g.p;
    const s = g.p.mono ? S * 0.88 : S;
    const t = s * 0.92;
    g.rect(0, 0, s, C);
    g.rect(w - s, 0, w, C);
    const cx = w / 2;
    const hw = hwOf(t, cx, C);
    g.stroke(s * 0.4 + hw, C, cx, C * 0.08, t);
    g.stroke(w - s * 0.4 - hw, C, cx, C * 0.08, t);
  }],
  N: ["SS", 530, (g, w) => {
    const { C, S } = g.p;
    const t = S * 0.98;
    g.rect(0, 0, S, C);
    g.rect(w - S, 0, w, C);
    const hw = hwOf(t, w - 2 * S, C);
    g.stroke(S * 0.3 + hw, C, w - S * 0.3 - hw, 0, t);
  }],
  O: ["RR", 610, (g, w) => {
    const { C, OC } = g.p;
    g.ring(0, -OC, w, C + OC);
  }],
  P: ["SR", 474, (g, w) => {
    const { C, S, H, k } = g.p;
    const kk = Math.min(0.9, k + 0.16);
    const y0 = C * 0.4;
    g.rect(0, 0, S, C);
    g.rect(0, C - H, w * 0.56, C);
    g.rect(0, y0, w * 0.56, y0 + H);
    g.sector(0, y0, w, C, 3, 5, "r", "r", S, H, kk);
  }],
  Q: ["RR", 610, (g, w) => {
    const { C, OC, S } = g.p;
    g.ring(0, -OC, w, C + OC);
    g.add(bar(w * 0.6, C * 0.2, w * 1.0, -C * 0.09, S));
  }],
  R: ["SD", 496, (g, w) => {
    const { C, S, H, k } = g.p;
    const kk = Math.min(0.9, k + 0.16);
    const y0 = C * 0.42;
    const wb = w * 0.93;
    g.rect(0, 0, S, C);
    g.rect(0, C - H, wb * 0.56, C);
    g.rect(0, y0, wb * 0.56, y0 + H);
    g.sector(0, y0, wb, C, 3, 5, "r", "r", S, H, kk);
    const t = S;
    const hw = hwOf(t, w * 0.4, y0);
    g.stroke(wb * 0.5, y0 + H * 0.5, w - hw, 0, t);
  }],
  S: ["RR", 486, (g, w) => {
    const { C, OC, H, ap } = g.p;
    sShape(g, 0, w, -OC, C + OC, ap * 0.9, H * 1.08);
  }],
  T: ["NN", 520, (g, w) => {
    const { C, S, H } = g.p;
    g.rect(0, C - H, w, C);
    g.rect(w / 2 - S / 2, 0, w / 2 + S / 2, C);
  }],
  U: ["SS", 514, (g, w) => {
    const { C, S, OC } = g.p;
    const r = w / 2;
    g.rect(0, r - OC - 6, S, C);
    g.rect(w - S, r - OC - 6, w, C);
    g.sector(0, -OC, w, 2 * r - OC, 2, 4);
  }],
  V: ["DD", 580, (g, w) => vShape(g, 0, w, g.p.C, 0, g.p.S * 0.98)],
  W: ["DD", 860, (g, w) => {
    const { C, S } = g.p;
    const t = S * (g.p.mono ? 0.78 : 0.9);
    vShape(g, 0, w * 0.55, C, 0, t);
    vShape(g, w * 0.45, w, C, 0, t);
  }],
  X: ["DD", 556, (g, w) => {
    const { C, S } = g.p;
    const t = S * 0.98;
    const hw = hwOf(t, w, C);
    g.stroke(hw, C, w - hw, 0, t);
    g.stroke(w - hw, C, hw, 0, t);
  }],
  Y: ["DD", 556, (g, w) => {
    const { C, S } = g.p;
    const t = S * 0.98;
    const cx = w / 2;
    const y = C * 0.44;
    const hw = hwOf(t, cx, C - y);
    g.stroke(hw, C, cx, y, t);
    g.stroke(w - hw, C, cx, y, t);
    g.rect(cx - S / 2, 0, cx + S / 2, y + 2);
  }],
  Z: ["SS", 496, (g, w) => {
    const { C, H, S } = g.p;
    g.rect(w * 0.04, C - H, w, C);
    g.rect(0, 0, w, H);
    const t = S * 1.02;
    const hw = hwOf(t, w, C);
    g.stroke(w - hw - 2, C - H, hw + 2, H, t);
  }],
};

/* ------------------------------------------------------------------ figures */

function zero(g, w) {
  const { C, OC, S, H } = g.p;
  g.ring(0, -OC, w, C + OC, S, H);
  if (g.p.zero === "slashed") g.add(bar(w * 0.3, C * 0.24, w * 0.7, C * 0.76, S * 0.8));
  if (g.p.zero === "dotted") g.add(disc(w / 2 - S * 0.5, C / 2 - S * 0.62, w / 2 + S * 0.5, C / 2 + S * 0.62));
}

const FIGURES = {
  zero: ["0", zero],
  one: ["1", (g, w) => {
    const { C, S, H } = g.p;
    const x = w * 0.55;
    g.rect(x - S / 2, 0, x + S / 2, C);
    g.add(bar(x - S * 0.2, C - S * 0.38, w * 0.12, C * 0.76, S * 0.88));
    if (g.p.baseOne) g.rect(w * 0.14, 0, w * 0.9, H);
  }],
  two: ["2", (g, w) => {
    const { C, OC, S, H, k, kin } = g.p;
    const y0 = C * 0.36;
    const box = [w * 0.02, y0, w * 0.97, C + OC];
    const q = 3.6;
    g.sector(...box, q - 0.02, 5.72, "r", g.p.cut);
    // The diagonal continues straight out of the bowl's end: its two edges start at the
    // outer and inner ends of the curve and land on the base bar.
    const o = pointAt(ellipse(...box, k), q);
    const i = pointAt(ellipse(box[0] + S, box[1] + H, box[2] - S, box[3] - H, kin), q);
    const span = Math.hypot(o[0] - i[0], o[1] - i[1]) * 1.18;
    g.poly([i, o, [span, H * 0.5], [0, H * 0.5]]);
    g.rect(0, 0, w, H);
  }],
  three: ["3", (g, w) => {
    const { C, OC, H, S, cut } = g.p;
    const m = C * 0.55;
    g.sector(w * 0.06, m - H / 2, w * 0.94, C + OC, 2.86, 5.6, "r", cut, S * 0.98, H);
    g.sector(0, -OC, w, m + H / 2, 2.4, 5.0, cut, "r", S, H);
  }],
  four: ["4", (g, w) => {
    const { C, S, H } = g.p;
    const x = w * 0.72;
    const y = C * 0.28;
    g.rect(x - S / 2, 0, x + S / 2, C);
    g.rect(0, y - H / 2, w, y + H / 2);
    const t = S * 0.92;
    g.stroke(x - hwOf(t, x, C - y), C, hwOf(t, x, C - y), y, t);
  }],
  five: ["5", (g, w) => {
    const { C, OC, S, H, cut } = g.p;
    const box = [0, -OC, w, C * 0.66];
    const qe = 5.5;
    g.sector(...box, 2.45, qe, cut, "r");
    // The vertical stands on the bowl's end and the top bar starts from it, so the three
    // strokes meet without a step.
    const e = pointAt(ellipse(...box, g.p.k), qe);
    const xv = e[0] - S * 0.42;
    g.rect(xv, e[1] - H * 1.2, xv + S * 0.95, C);
    g.rect(xv, C - H, w * 0.92, C);
  }],
  six: ["6", (g, w) => {
    const { C, OC, S, H, cut } = g.p;
    const top = C * 0.62;
    g.ring(0, -OC, w, top, S, H);
    g.sector(0, -OC, w * 1.04, C + OC, 0.62, 2.0, cut, "r");
    g.rect(0, top * 0.4, S, C * 0.6);
  }],
  seven: ["7", (g, w) => {
    const { C, S, H } = g.p;
    g.rect(0, C - H, w, C);
    const t = S;
    const hw = hwOf(t, w * 0.6, C);
    g.stroke(w - hw, C - H, w * 0.28, 0, t);
  }],
  eight: ["8", (g, w) => {
    const { C, OC, S, H } = g.p;
    const m = C * 0.54;
    g.ring(w * 0.06, m - H / 2, w * 0.94, C + OC, S * 0.96, H);
    g.ring(0, -OC, w, m + H / 2, S, H);
  }],
  nine: ["9", (g, w) => {
    const { C } = g.p;
    const tmp = pen(g.p);
    FIGURES.six[1](tmp, w);
    g.add(mirrorY(mirrorX(tmp.contours, w / 2), C / 2));
  }],
};

/* ------------------------------------------------------------------ punctuation and symbols */

const SYM = {
  period: [".", "SS", (g) => g.dot(g.p.S * 0.56, g.p.S * 0.56)],
  comma: [",", "SS", (g) => {
    const { S } = g.p;
    g.dot(S * 0.56, S * 0.56);
    g.add(polygon([[S * 0.05, S * 0.2], [S * 1.12, S * 0.2], [S * 0.1, -S * 1.5], [-S * 0.3, -S * 1.5]]));
  }],
  colon: [":", "SS", (g) => {
    const { S, X } = g.p;
    g.dot(S * 0.56, S * 0.56);
    g.dot(S * 0.56, X - S * 0.56);
  }],
  semicolon: [";", "SS", (g) => {
    const { S, X } = g.p;
    SYM.comma[2](g);
    g.dot(S * 0.56, X - S * 0.56);
  }],
  exclam: ["!", "SS", (g) => {
    const { S, C } = g.p;
    g.add(polygon([[S * 0.1, C], [S * 1.02, C], [S * 0.86, C * 0.3], [S * 0.26, C * 0.3]]));
    g.dot(S * 0.56, S * 0.56);
  }],
  question: ["?", "NN", (g) => {
    const { S, H, C, OC, cut } = g.p;
    const w = 360;
    const y0 = C * 0.4;
    // The hook runs from the top-left terminal over the top and down to the middle.
    g.sector(0, y0, w, C + OC, 3.0, 5.68, "r", cut);
    g.rect(w / 2 - S / 2, C * 0.26, w / 2 + S / 2, y0 + H);
    g.dot(w / 2, S * 0.56);
  }],
  quotesingle: ["'", "SS", (g) => g.rect(0, g.p.C * 0.66, g.p.S * 0.9, g.p.C)],
  quotedbl: ['"', "SS", (g) => {
    const { S, C } = g.p;
    g.rect(0, C * 0.66, S * 0.9, C);
    g.rect(S * 2.1, C * 0.66, S * 3.0, C);
  }],
  grave: ["`", "NN", (g) => g.add(bar(g.p.S * 1.6, g.p.C + 10, 0, g.p.C + 150, g.p.S * 0.9))],
  hyphen: ["-", "SS", (g) => g.rect(0, g.p.X * 0.44, 240, g.p.X * 0.44 + g.p.H * 1.05)],
  underscore: ["_", "NN", (g) => g.rect(0, -150, 480, -150 + g.p.H)],
  parenleft: ["(", "NN", (g) => {
    const { S, H, A, D } = g.p;
    // Parentheses keep a round curve in every family: squared, they read as brackets.
    g.sector(0, D - 20, 760, A + 40, 1.42, 2.58, "a", "a", S * 0.95, H, 0.56);
  }],
  parenright: [")", "NN", (g) => {
    const tmp = pen(g.p);
    SYM.parenleft[2](tmp);
    const b = bbox(tmp.contours);
    g.add(mirrorX(tmp.contours, (b.x0 + b.x1) / 2));
  }],
  bracketleft: ["[", "SN", (g) => {
    const { S, H, A, D } = g.p;
    g.rect(0, D - 20, S, A + 40);
    g.rect(0, A + 40 - H, S + 120, A + 40);
    g.rect(0, D - 20, S + 120, D - 20 + H);
  }],
  bracketright: ["]", "NS", (g) => {
    const tmp = pen(g.p);
    SYM.bracketleft[2](tmp);
    g.add(mirrorX(tmp.contours, (g.p.S + 120) / 2));
  }],
  braceleft: ["{", "NN", (g) => {
    const { S, H, A, D } = g.p;
    const top = A + 40;
    const bot = D - 20;
    const m = (top + bot) / 2;
    const s2 = S * 0.92;
    // The curl's radius grows with the stroke, or a bold brace's counter closes up.
    const r = Math.max(110, s2 * 1.5);
    const x = 120 + (r - 110) * 0.4;
    g.rect(x, bot + r - 6, x + s2, top - r + 6);
    g.sector(x, top - 2 * r, x + 2 * r, top, 1.0, 2.0, "r", "r", s2, H);
    g.sector(x, bot, x + 2 * r, bot + 2 * r, 2.0, 3.0, "r", "r", s2, H);
    g.poly([[x + 4, m + 95], [x - 20, m + 40], [0, m], [x - 20, m - 40], [x + 4, m - 95]]);
  }],
  braceright: ["}", "NN", (g) => {
    const tmp = pen(g.p);
    SYM.braceleft[2](tmp);
    const b = bbox(tmp.contours);
    g.add(mirrorX(tmp.contours, (b.x0 + b.x1) / 2));
  }],
  slash: ["/", "DD", (g) => {
    const { S, A, D } = g.p;
    const t = S * 0.9;
    const hw = hwOf(t, 300, A - D);
    g.stroke(hw, D, 300 - hw, A + 20, t);
  }],
  backslash: ["\\", "DD", (g) => {
    const { S, A, D } = g.p;
    const t = S * 0.9;
    const hw = hwOf(t, 300, A - D);
    g.stroke(hw, A + 20, 300 - hw, D, t);
  }],
  bar: ["|", "SS", (g) => g.rect(0, g.p.D - 20, g.p.S * 0.95, g.p.A + 40)],
  at: ["@", "RR", (g) => {
    const { S, H, C, D } = g.p;
    const s = S * 0.8;
    const w = 760;
    g.sector(0, D * 0.75, w, C + 20, 3.45, 7.0, "r", "r", s, H * 0.8);
    g.ring(w * 0.27, C * 0.18, w * 0.66, C * 0.66, s, H * 0.8);
    g.rect(w * 0.66 - s, C * 0.12, w * 0.66, C * 0.66);
    g.sector(w * 0.66 - s, D * 0.75 + 10, w, C * 0.48, 3.0, 4.15, "r", "r", s, H * 0.8);
  }],
  numbersign: ["#", "NN", (g) => {
    const { S, H, C } = g.p;
    const t = S * 0.82;
    const w = 520;
    g.stroke(w * 0.38, C, w * 0.24, 0, t);
    g.stroke(w * 0.78, C, w * 0.64, 0, t);
    g.rect(w * 0.04, C * 0.66 - H / 2, w, C * 0.66 + H / 2);
    g.rect(0, C * 0.33 - H / 2, w * 0.96, C * 0.33 + H / 2);
  }],
  dollar: ["$", "RR", (g) => {
    const { C, OC, H, ap, S } = g.p;
    const w = 470;
    sShape(g, 0, w, -OC + 30, C + OC - 30, ap * 0.9, H * 1.05);
    g.rect(w / 2 - S * 0.42, -110, w / 2 + S * 0.42, C + 110);
  }],
  percent: ["%", "NN", (g) => {
    const { S, H, C } = g.p;
    const s = S * 0.82;
    const w = 760;
    g.ring(0, C * 0.5, w * 0.36, C, s, H * 0.85);
    g.ring(w * 0.64, 0, w, C * 0.5, s, H * 0.85);
    const t = S * 0.82;
    g.stroke(w * 0.78, C, w * 0.22, 0, t);
  }],
  asciicircum: ["^", "NN", (g) => {
    const { S, C } = g.p;
    const t = S * 0.82;
    const w = 440;
    const hw = hwOf(t, w / 2, C * 0.42);
    g.stroke(hw, C * 0.42, w / 2, C, t);
    g.stroke(w - hw, C * 0.42, w / 2, C, t);
  }],
  asciitilde: ["~", "NN", (g) => {
    const { H, X } = g.p;
    const y = X * 0.46;
    const t = H * 1.05;
    // A sine wave offset to both sides by half the stroke: a ring is too round for a
    // shallow wave this thick.
    const amp = 46;
    const len = 480;
    const n = 40;
    const top = [];
    const bot = [];
    for (let i = 0; i <= n; i++) {
      const x = (len * i) / n;
      const a = (Math.PI * 2 * i) / n;
      const yy = y + amp * Math.sin(a);
      const dy = amp * Math.cos(a) * ((Math.PI * 2) / len);
      const nl = Math.hypot(1, dy);
      top.push([x - (dy / nl) * (t / 2), yy + (1 / nl) * (t / 2)]);
      bot.push([x + (dy / nl) * (t / 2), yy - (1 / nl) * (t / 2)]);
    }
    g.poly([...top, ...bot.reverse()]);
  }],
  ampersand: ["&", "NN", (g) => {
    const { S, H, C, OC } = g.p;
    const w = 600;
    g.ring(w * 0.12, C * 0.56, w * 0.6, C + OC, S * 0.95, H);
    g.sector(0, -OC, w * 0.78, C * 0.62, 0.62, 3.75, "r", "r", S, H);
    const t = S;
    g.stroke(w * 0.22, C * 0.62, w - hwOf(t, w * 0.7, C * 0.62), 0, t);
  }],
  asterisk: ["*", "NN", (g) => {
    const { S, C } = g.p;
    const cx = 210;
    const cy = C * 0.74;
    const r = 175;
    const t = S * 0.8;
    for (const a of [90, 210, 330]) {
      const rad = (a * Math.PI) / 180;
      g.add(bar(cx, cy, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, t));
      g.add(bar(cx, cy, cx - Math.cos(rad) * r, cy - Math.sin(rad) * r, t));
    }
  }],
  plus: ["+", "NN", (g) => mathPlus(g)],
  equal: ["=", "NN", (g) => {
    const { H } = g.p;
    const cy = mathAxis(g);
    g.rect(0, cy + 70, 480, cy + 70 + H);
    g.rect(0, cy - 70 - H, 480, cy - 70);
  }],
  less: ["<", "NN", (g) => {
    const { S } = g.p;
    const cy = mathAxis(g);
    const t = S * 0.9;
    g.add(bar(440, cy + 190, 30, cy, t));
    g.add(bar(30, cy, 440, cy - 190, t));
  }],
  greater: [">", "NN", (g) => {
    const { S } = g.p;
    const cy = mathAxis(g);
    const t = S * 0.9;
    g.add(bar(40, cy + 190, 450, cy, t));
    g.add(bar(450, cy, 40, cy - 190, t));
  }],
  space: [" ", "NN", () => {}],
  nbspace: [" ", "NN", () => {}],
  endash: ["–", "NN", (g) => g.rect(0, g.p.X * 0.44, 500, g.p.X * 0.44 + g.p.H)],
  emdash: ["—", "NN", (g) => g.rect(0, g.p.X * 0.44, g.p.mono ? 560 : 920, g.p.X * 0.44 + g.p.H)],
  quoteleft: ["‘", "SS", (g) => quoteMark(g, 0, true)],
  quoteright: ["’", "SS", (g) => quoteMark(g, 0, false)],
  quotedblleft: ["“", "SS", (g) => {
    quoteMark(g, 0, true);
    quoteMark(g, g.p.S * 1.9, true);
  }],
  quotedblright: ["”", "SS", (g) => {
    quoteMark(g, 0, false);
    quoteMark(g, g.p.S * 1.9, false);
  }],
  quotedblbase: ["„", "SS", (g) => {
    quoteMark(g, 0, false, -g.p.C + g.p.S * 1.2);
    quoteMark(g, g.p.S * 1.9, false, -g.p.C + g.p.S * 1.2);
  }],
  ellipsis: ["…", "SS", (g) => {
    const { S } = g.p;
    const step = g.p.mono ? 170 : S * 2.6;
    for (let i = 0; i < 3; i++) g.dot(S * 0.56 + i * step, S * 0.56);
  }],
  bullet: ["•", "SS", (g) => {
    const cy = mathAxis(g);
    const r = g.p.S * 1.05;
    g.add(disc(0, cy - r, 2 * r, cy + r));
  }],
  periodcentered: ["·", "SS", (g) => g.dot(g.p.S * 0.56, mathAxis(g))],
  degree: ["°", "NN", (g) => {
    const { S, H, C } = g.p;
    g.ring(0, C - 290, 290, C, S * 0.82, H * 0.82);
  }],
  plusminus: ["±", "NN", (g) => {
    const { H } = g.p;
    mathPlus(g, 80);
    g.rect(0, 0, 480, H);
  }],
  multiply: ["×", "NN", (g) => {
    const { S } = g.p;
    const cy = mathAxis(g);
    const t = S * 0.9;
    g.add(bar(60, cy - 180, 420, cy + 180, t));
    g.add(bar(60, cy + 180, 420, cy - 180, t));
  }],
  divide: ["÷", "NN", (g) => {
    const { H, S } = g.p;
    const cy = mathAxis(g);
    g.rect(0, cy - H / 2, 480, cy + H / 2);
    g.dot(240, cy + 170, S * 1.05);
    g.dot(240, cy - 170, S * 1.05);
  }],
  Euro: ["€", "NN", (g) => {
    const { C, OC, ap, H } = g.p;
    const w = 520;
    g.sector(60, -OC, w + 60, C + OC, ap * 0.9, 4 - ap * 0.9);
    g.rect(0, C * 0.56, w * 0.72, C * 0.56 + H * 0.9);
    g.rect(0, C * 0.38 - H * 0.9, w * 0.66, C * 0.38);
  }],
  arrowleft: ["←", "NN", (g) => arrow(g, 0)],
  arrowup: ["↑", "NN", (g) => arrow(g, 1)],
  arrowright: ["→", "NN", (g) => arrow(g, 2)],
  arrowdown: ["↓", "NN", (g) => arrow(g, 3)],
  checkmark: ["✓", "NN", (g) => {
    const { S, C } = g.p;
    const t = S * 0.95;
    g.add(bar(40, C * 0.42, 210, C * 0.12, t));
    g.add(bar(185, C * 0.1, 560, C * 0.82, t));
  }],
};

function mathAxis(g) {
  return g.p.X * 0.48;
}

function mathPlus(g, lift = 0) {
  const { S, H } = g.p;
  const cy = mathAxis(g) + lift;
  g.rect(0, cy - H / 2, 480, cy + H / 2);
  g.rect(240 - S * 0.47, cy - 230, 240 + S * 0.47, cy + 230);
}

function quoteMark(g, x, open, dy = 0) {
  const { S, C } = g.p;
  const top = C + dy;
  const pts = open
    ? [[x + S * 0.35, top - S * 2.2], [x + S * 1.05, top - S * 2.2], [x + S * 1.05, top - S * 1.15], [x + S * 0.75, top], [x + S * 0.2, top], [x + S * 0.35, top - S * 1.15]]
    : [[x + S * 0.05, top - S * 2.2], [x + S * 0.6, top - S * 2.2], [x + S * 0.9, top - S * 1.05], [x + S * 0.9, top], [x + S * 0.2, top], [x + S * 0.2, top - S * 1.05]];
  g.poly(pts);
}

function arrow(g, dir) {
  const { S } = g.p;
  const t = S * 0.92;
  const tmp = pen(g.p);
  const cy = mathAxis(g);
  // Pointing left, then rotated by mirroring/transposing.
  tmp.rect(30, cy - t / 2, 620, cy + t / 2);
  tmp.add(bar(20 + t * 0.3, cy, 260, cy + 240, t));
  tmp.add(bar(20 + t * 0.3, cy, 260, cy - 240, t));
  let c = tmp.contours;
  if (dir === 2) c = mirrorX(c, 325);
  if (dir === 1 || dir === 3) {
    // Swap the axes around the centre: the left arrow becomes the down arrow. A swap flips
    // the winding, and an arrow has no counters, so every contour is ink again.
    c = transform(c, ([x, y]) => [325 + (y - cy), cy + (x - 325)]).map((ct) => orient(ct, true));
    if (dir === 1) c = mirrorY(c, cy);
  }
  g.add(c);
}

/* ------------------------------------------------------------------ Polish letters */

const POLISH = [
  ["aogonek", "ą", "a", (g, b) => ogonek(g, b.x1 - 18)],
  ["cacute", "ć", "c", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.X)],
  ["eogonek", "ę", "e", (g, b) => ogonek(g, (b.x0 + b.x1) / 2 + 60)],
  ["lslash", "ł", "l", (g, b) => slashOver(g, b, g.p.X * 0.62, 0.95)],
  ["nacute", "ń", "n", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.X)],
  ["oacute", "ó", "o", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.X)],
  ["sacute", "ś", "s", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.X)],
  ["zacute", "ź", "z", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.X)],
  ["zdotaccent", "ż", "z", (g, b) => dotAbove(g, (b.x0 + b.x1) / 2, g.p.X)],
  ["Aogonek", "Ą", "A", (g, b) => ogonek(g, b.x1 - 50)],
  ["Cacute", "Ć", "C", (g, b) => acute(g, (b.x0 + b.x1) / 2 + 20, g.p.C - 10)],
  ["Eogonek", "Ę", "E", (g, b) => ogonek(g, b.x1 - 60)],
  ["Lslash", "Ł", "L", (g, b) => slashOver(g, b, g.p.C * 0.52, 1.0)],
  ["Nacute", "Ń", "N", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.C - 10)],
  ["Oacute", "Ó", "O", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.C - 10)],
  ["Sacute", "Ś", "S", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.C - 10)],
  ["Zacute", "Ź", "Z", (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.C - 10)],
  ["Zdotaccent", "Ż", "Z", (g, b) => dotAbove(g, (b.x0 + b.x1) / 2, g.p.C - 10)],
];

function slashOver(g, b, y, scale) {
  const { S } = g.p;
  // Find the stem: the l and L stems sit at the left edge of the ink (or the slabbed stem in mono).
  const stemX = g.stemX ?? b.x0 + S / 2;
  g.add(bar(stemX - 130 * scale, y - 75 * scale, stemX + 130 * scale, y + 75 * scale, S * 0.85));
}

/* ------------------------------------------------------------------ building */

/** Draw one glyph and place it: returns { name, unicode, advance, contours }. */
function place(p, name, unicode, sides, width, draw, extra) {
  const g = pen(p);
  const mono = p.mono;
  const sbL = p.sb[sides[0]];
  const sbR = p.sb[sides[1]];
  const w = mono ? p.monoAdvance - sbL - sbR : Math.round(width * p.wf);
  draw(g, w);
  if (extra) {
    const b0 = g.base ?? bbox(g.contours);
    g.mark();
    extra(g, b0);
  }
  if (g.contours.length === 0) {
    const adv = mono ? p.monoAdvance : unicode === " " ? 1000 : Math.round(250 * p.wf);
    return { name, unicode, advance: adv, contours: [], spec: { sides, width, draw, extra } };
  }
  const b = g.base ?? bbox(g.contours);
  let shift;
  let advance;
  if (mono) {
    advance = p.monoAdvance;
    shift = (advance - (b.x1 - b.x0)) / 2 - b.x0;
    if (sides === "SN" || sides === "NS") shift = (advance - (b.x1 - b.x0)) / 2 - b.x0;
  } else if (unicode && /[0-9]/.test(unicode)) {
    advance = p.figureAdvance;
    shift = (advance - (b.x1 - b.x0)) / 2 - b.x0;
  } else {
    const l = sides[0] === "N" ? 40 : sbL;
    const r = sides[1] === "N" ? 40 : sbR;
    advance = Math.round(l + (b.x1 - b.x0) + r);
    shift = l - b.x0;
  }
  const contours = transform(g.contours, ([x, y]) => [Math.round((x + shift) * 10) / 10, Math.round(y * 10) / 10]);
  return { name, unicode, advance: Math.round(advance), contours, spec: { sides, width, draw, extra } };
}

/** What a script module's glyphs(api) gets: the font's numbers, the base drawings and the tools. */
function moduleApi(p) {
  return { p, defs: { ...LOWER, ...UPPER }, figures: FIGURES, sym: SYM, accents: { acute, dotAbove, ogonek, slashOver }, geom: { bar, bbox, disc, ellipse, mirrorX, mirrorY, orient, pointAt, polygon, rect, ring, sector, stroke, transform } };
}

/** Every glyph of one font. */
export function buildGlyphs(p) {
  // Tabular figures: one advance for all ten, wide enough for the widest.
  p.figureAdvance = Math.round(560 * p.wf + (p.S - 84) * 0.6);
  const figureW = Math.round((p.figureAdvance - 2 * 56) * (p.mono ? 1 : 0.98));
  p.figureW = figureW;
  const out = [];
  const lowerByChar = {};
  const add = (name, unicode, sides, width, draw, extra) => {
    const gl = place(p, name, unicode, sides, width, draw, extra);
    out.push(gl);
    return gl;
  };
  for (const [ch, [sides, width, draw]] of Object.entries(LOWER)) {
    const wd = width || (ch === "i" || ch === "l" ? p.S : ch === "j" ? 240 : width);
    lowerByChar[ch] = add(ch, ch, sides, wd, draw);
  }
  for (const [ch, [sides, width, draw]] of Object.entries(UPPER)) {
    add(ch, ch, sides, width || p.S, draw);
  }
  for (const [name, [ch, draw]] of Object.entries(FIGURES)) {
    const gl = place(p, name, ch, "NN", 0, (g) => draw(g, p.mono ? p.monoAdvance - 2 * 70 : figureW));
    out.push(gl);
  }
  for (const [name, [ch, sides, draw]] of Object.entries(SYM)) {
    add(name, ch, sides, 300, (g) => draw(g));
  }
  const defs = { ...LOWER, ...UPPER };
  for (const [name, ch, baseCh, accent] of POLISH) {
    const [sides, width, draw] = defs[baseCh];
    const wd = width || (baseCh === "l" ? p.S : p.S);
    add(name, ch, sides, wd, draw, accent);
  }
  // Further scripts and languages, one module each in scripts/ (see scripts/index.mjs): each
  // returns glyphs in the same shape as the Polish letters above, drawn with the same pen.
  const api = moduleApi(p);
  const seen = new Set(out.map((gl) => gl.unicode).filter(Boolean));
  // OSQD_FONT_MODULES=latin,cyrillic builds with only those modules — for working on one module, or
  // on the core while another is half-written. Unset, every module is built.
  const only = globalThis.process?.env?.OSQD_FONT_MODULES?.split(",").map((m) => m.trim());
  for (const mod of only ? SCRIPT_MODULES.filter((m) => only.includes(m.id)) : SCRIPT_MODULES) {
    for (const { name, unicode, sides, width, draw, accent } of mod.glyphs(api)) {
      if (seen.has(unicode)) throw new Error(`type: ${mod.id} draws U+${unicode.codePointAt(0).toString(16).toUpperCase()} (${name}), which another table already has`);
      seen.add(unicode);
      add(name, unicode, sides, width, draw, accent);
    }
  }
  return out;
}

/** Kerning pairs for proportional fonts, by character, in font units (plus each script module's `kerning`). */
const BASE_KERNING = [
  ["A", "V", -46], ["V", "A", -46], ["A", "T", -50], ["T", "A", -50], ["A", "Y", -50], ["Y", "A", -50],
  ["A", "W", -28], ["W", "A", -28], ["L", "T", -70], ["L", "Y", -70], ["L", "V", -56], ["L", "W", -36],
  ["T", "a", -60], ["T", "e", -60], ["T", "o", -60], ["T", "c", -60], ["T", "s", -50], ["T", "y", -40], ["T", "u", -40], ["T", "r", -40],
  ["Y", "a", -56], ["Y", "e", -60], ["Y", "o", -60], ["V", "a", -36], ["V", "e", -40], ["V", "o", -40],
  ["A", "v", -24], ["A", "y", -24], ["A", "w", -14], ["P", "A", -40], ["F", "A", -32],
  ["r", ".", -50], ["r", ",", -50], ["f", ".", -30], ["f", ",", -30], ["F", ".", -70], ["F", ",", -70],
  ["P", ".", -80], ["P", ",", -80], ["T", ".", -80], ["T", ",", -80], ["Y", ".", -70], ["Y", ",", -70], ["V", ".", -60], ["V", ",", -60],
  ["L", "'", -80], ["L", '"', -80], ["L", "’", -80], ["L", "”", -80],
  ['"', "A", -50], ["'", "A", -50], ["“", "A", -50], ["‘", "A", -50], ["A", '"', -50], ["A", "'", -50],
  ["v", ".", -40], ["v", ",", -40], ["y", ".", -40], ["y", ",", -40], ["w", ".", -30], ["w", ",", -30],
];

export const KERNING = [...BASE_KERNING, ...SCRIPT_MODULES.flatMap((mod) => mod.kerning ?? [])];

/* ------------------------------------------------------------------ OpenType alternates */

/**
 * The features the fonts carry, as GSUB lookups built in build.mjs from what this returns:
 *   pnum  proportional figures (tabular stay the default: UI first)   tnum  back to tabular
 *   zero  slashed zero (where the face's own zero is not slashed)     case  dashes, brackets,
 *   ss01  the Clear forms in Sans and Tech: serifed I, tailed l,            guillemets, bullets
 *         1 with a base                                                     and colon raised for
 *   sups, subs, numr, dnom  small figures above, below, for fractions       all-caps text
 *   frac  numerator / fraction slash / denominator, by context (build.mjs)
 */
export const FEATURE_TAGS = ["case", "dnom", "frac", "numr", "pnum", "ss01", "subs", "sups", "tnum", "zero"];

const DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const PNUM_SIDES = { zero: "RR", one: "SS", two: "RR", three: "RR", four: "DS", five: "SR", six: "RR", seven: "SD", eight: "RR", nine: "RR" };
/** What `case` raises: punctuation that sits on the x-height, moved to sit on the capitals. */
const CASE_CHARS = [..."-‐‑‒–—―()[]{}«»‹›·•:¡¿"];

/**
 * Every alternate glyph one font carries, and the substitutions each feature makes, by glyph name.
 * `drawn` is buildGlyphs(p)'s output: every placed glyph keeps the recipe it was drawn from
 * (`spec`), so a variant is the same recipe placed again with different numbers — which is how the
 * script modules' composites (Í, ĺ, Ł …) get their ss01 forms without knowing about it.
 * Each alternate carries `base`, the character whose subset file it ships in.
 */
export function buildAlternates(p, drawn) {
  const byChar = new Map(drawn.filter((d) => d.unicode).map((d) => [d.unicode, d]));
  const byName = new Map(drawn.map((d) => [d.name, d]));
  const glyphs = [];
  const subs = Object.fromEntries(FEATURE_TAGS.map((t) => [t, []]));
  const fig = Object.fromEntries(DIGITS.map((n) => [n, FIGURES[n][1]]));
  const r1 = (v) => Math.round(v * 10) / 10;
  /** Re-centres a placed glyph on the tabular figure advance (a mono's own advance already is). */
  const tab = (gl) => {
    if (p.mono || gl.contours.length === 0) return gl;
    const b = bbox(gl.contours);
    const shift = (p.figureAdvance - (b.x1 - b.x0)) / 2 - b.x0;
    return { ...gl, advance: p.figureAdvance, contours: transform(gl.contours, ([x, y]) => [r1(x + shift), y]) };
  };
  const push = (gl, base) => {
    glyphs.push({ ...gl, unicode: undefined, base });
    return gl.name;
  };
  const again = (pp, d, name) => place(pp, name, undefined, d.spec.sides, d.spec.width, d.spec.draw, d.spec.extra);

  // pnum / tnum: each figure spaced by its own shape. The monos have one advance, so no pnum.
  const pnum = {};
  if (!p.mono) {
    for (const n of DIGITS) {
      const w = n === "one" ? p.figureW : Math.round(p.figureW * 0.95);
      pnum[n] = push(place(p, `${n}.pnum`, undefined, PNUM_SIDES[n], 0, (g) => fig[n](g, w)), "0");
      subs.pnum.push([n, pnum[n]]);
      subs.tnum.push([pnum[n], n]);
    }
  }

  // zero: the slashed form, where the face's own zero is something else.
  if (p.zero !== "slashed" && byName.has("zero")) {
    const pz = { ...p, zero: "slashed" };
    subs.zero.push(["zero", push(tab(again(pz, byName.get("zero"), "zero.zero")), "0")]);
    if (pnum.zero) subs.zero.push([pnum.zero, push(place(pz, "zero.pnum.zero", undefined, "RR", 0, (g) => fig.zero(g, Math.round(p.figureW * 0.95))), "0")]);
  }

  // ss01: Clear's distinguishing forms for Sans and Tech — every glyph drawn from I, J, l or 1.
  if (!p.mono && !(p.serifI && p.tailL && p.baseOne)) {
    const ps = { ...p, serifI: true, tailL: true, baseOne: true };
    const from = new Set([UPPER.I[2], UPPER.J[2], LOWER.l[2]]);
    for (const d of drawn) {
      if (!d.unicode || !d.spec) continue;
      const base = d.unicode.normalize("NFD")[0];
      if (!(from.has(d.spec.draw) || "IJl".includes(base))) continue;
      const alt = again(ps, d, `${d.name}.ss01`);
      if (alt.contours.length === d.contours.length && alt.contours.every((c, i) => JSON.stringify(c) === JSON.stringify(d.contours[i]))) continue;
      subs.ss01.push([d.name, push(alt, d.unicode)]);
    }
    subs.ss01.push(["one", push(tab(place(ps, "one.ss01", undefined, "NN", 0, (g) => fig.one(g, p.figureW))), "1")]);
    if (pnum.one) subs.ss01.push([pnum.one, push(place(ps, "one.pnum.ss01", undefined, "SS", 0, (g) => fig.one(g, p.figureW)), "1")]);
  }

  // case: raised to sit on the capitals rather than the lowercase.
  const dy = Math.round((p.C - p.X) / 2);
  for (const ch of CASE_CHARS) {
    const d = byChar.get(ch);
    if (!d || d.contours.length === 0) continue;
    subs.case.push([d.name, push({ ...d, name: `${d.name}.case`, contours: transform(d.contours, ([x, y]) => [x, y + dy]) }, ch)]);
  }

  // Small figures: the symbols module's, so sups, subs, numr and dnom are the same drawings as the
  // encoded ⁰¹² … ₀₁₂ — drawn heavier and scaled there, so their stems are not starved.
  const api = moduleApi(p);
  const position = { sups: "sup", subs: "sub", numr: "numr", dnom: "dnom" };
  const smallAdvance = p.mono ? p.monoAdvance : Math.round(p.figureAdvance * 0.64);
  const smallNames = {};
  for (const tag of Object.keys(position)) {
    smallNames[tag] = {};
    for (const [i, n] of DIGITS.entries()) {
      const scaled = scriptDigit(api, String(i), position[tag]);
      const b = bbox(scaled);
      const shift = (smallAdvance - (b.x1 - b.x0)) / 2 - b.x0;
      const name = push({ name: `${n}.${tag}`, advance: smallAdvance, contours: transform(scaled, ([x, y]) => [r1(x + shift), r1(y)]) }, "0");
      smallNames[tag][n] = name;
      subs[tag].push([n, name]);
      if (pnum[n]) subs[tag].push([pnum[n], name]);
    }
  }
  // dnom also takes a numerator: frac turns numerators after a fraction slash into denominators.
  for (const n of DIGITS) subs.dnom.push([smallNames.numr[n], smallNames.dnom[n]]);
  // The other features run first (lookup order), so a figure may already be a slashed zero or
  // Clear's one when the small-figure and fraction lookups see it: they take those too.
  const variants = { zero: ["zero.zero", "zero.pnum.zero"], one: ["one.ss01", "one.pnum.ss01"] };
  const made = new Set(glyphs.map((gl) => gl.name));
  const extra = Object.entries(variants).flatMap(([n, names]) => names.filter((v) => made.has(v)).map((v) => [n, v]));
  for (const tag of Object.keys(position)) for (const [n, v] of extra) subs[tag].push([v, smallNames[tag][n]]);

  // frac: its own fraction slash, unencoded and shipped with "/", so the latin subset file has it
  // whichever subset an encoded U+2044 is served from (features cannot reach across files).
  // Steeper than the solidus and set tight, so the small figures tuck in towards it.
  const t = p.S * 0.78;
  const fraction = push(place(p, "fraction.frac", undefined, "TT", 0, (g) => g.stroke(0, -10, p.C * 0.3, p.C + 10, t)), "/");
  const digits = [...DIGITS, ...Object.values(pnum), ...extra.map(([, v]) => v)];
  const frac = {
    digits,
    numr: Object.values(smallNames.numr),
    dnom: Object.values(smallNames.dnom),
    slashes: ["slash", ...(byChar.has("\u2044") ? [byChar.get("\u2044").name] : [])],
    fraction,
  };
  return { glyphs, subs, frac };
}
