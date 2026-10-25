// The "symbols" glyph module: the technical and UI signs terminals, logs and tables need — box
// drawing, block elements, geometric shapes, arrows, keyboard keys, maths, superscript and
// subscript digits, dashes and spaces — drawn with the same pen as glyphs.mjs.
//
// Designed for the monospaced faces first and present in every face.
//
// Box drawing and block elements fill a cell exactly:
//   - horizontally from 0 to the advance (the mono's 600; a proportional face uses its figure
//     advance and lets the strokes run 8 units past each side so neighbours overlap);
//   - vertically from p.lineDescender to p.lineAscender (−260 to 960), which is the font's
//     line box at line-height: normal (1.22).
// So they join seamlessly cell to cell at any line-height up to 1.22 — 1.2 overlaps by 20
// units — and leave a gap above that. Italics shear them, so vertical runs do not join there.
// Each box glyph is pinned at both cell edges by two zero-area anchor contours, because the
// builder centres a mono glyph on its ink and a corner (┌) would otherwise drift.
//
// scriptDigit(api, ch, position) is exported for the OpenType sups/subs/numr/dnom features: it
// returns the contours of one small character (0–9, + − = ( ) n), its ink starting at x = 0,
// placed for `position`:
//   "sup"  top at cap height (the same drawing as ¹ ² ³),
//   "sub"  hanging below the baseline,
//   "numr" fraction numerator, top at cap height, half size,
//   "dnom" fraction denominator, sitting on the baseline, half size.
// The superscript and subscript code points below (⁰ ⁴–⁹ ⁺ ⁻ ⁼ ⁽ ⁾ ⁿ ₀–₉ ₊ ₋ ₌ ₍ ₎) are drawn
// with it.

export const id = "symbols";

const nameOf = (ch) => `uni${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
const r1 = (v) => Math.round(v * 10) / 10;

/** A circle's cubic handle. Symbols take true circles whatever the family's curve. */
const K = 0.5523;

/* ------------------------------------------------------------------ geometry helpers */

/** Cubics for a circular arc from a0 to a1 (radians, either direction), at most 90° each. */
function arcCubics(cx, cy, r, a0, a1) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9));
  const step = (a1 - a0) / n;
  const k = (4 / 3) * Math.tan(step / 4);
  const out = [];
  for (let i = 0; i < n; i++) {
    const b0 = a0 + step * i;
    const b1 = b0 + step;
    const p0 = [cx + r * Math.cos(b0), cy + r * Math.sin(b0)];
    const p3 = [cx + r * Math.cos(b1), cy + r * Math.sin(b1)];
    const c1 = [p0[0] - k * r * Math.sin(b0), p0[1] + k * r * Math.cos(b0)];
    const c2 = [p3[0] + k * r * Math.sin(b1), p3[1] - k * r * Math.cos(b1)];
    out.push([p0, c1, c2, p3]);
  }
  return out;
}

const segsOf = (cubics) => cubics.map((c) => ({ C: [c[1], c[2], c[3]] }));

/** A stroked circular arc with square ends. */
function thickArc(api, cx, cy, r, t, a0, a1) {
  const outer = arcCubics(cx, cy, r + t / 2, a0, a1);
  const inner = arcCubics(cx, cy, r - t / 2, a1, a0);
  return api.geom.orient({ start: outer[0][0], segs: [...segsOf(outer), { L: inner[0][0] }, ...segsOf(inner)] }, true);
}

/** A filled circular segment: the arc from a0 to a1 closed by its chord. */
function segment(api, cx, cy, r, a0, a1) {
  const arc = arcCubics(cx, cy, r, a0, a1);
  return api.geom.orient({ start: arc[0][0], segs: segsOf(arc) }, true);
}

const disc = (api, cx, cy, r) => api.geom.disc(cx - r, cy - r, cx + r, cy + r, K);
const hoop = (api, cx, cy, r, t) => api.geom.ring(cx - r, cy - r, cx + r, cy + r, t, t, K, K);

/** Zero-area contour: widens the ink box to x without drawing anything. */
const anchor = (x, y) => ({ start: [x, y], segs: [{ L: [x, y] }] });

const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
const ccw = (pts) => (area(pts) < 0 ? [...pts].reverse() : pts);

/** The polygon moved inward by t along every edge (convex or star-shaped), CCW. */
function inset(pts, t) {
  const p = ccw(pts);
  const n = p.length;
  const lines = p.map((a, i) => {
    const b = p[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    return { x: a[0] - (dy / len) * t, y: a[1] + (dx / len) * t, dx, dy };
  });
  return lines.map((l, i) => {
    const m = lines[(i - 1 + n) % n];
    const den = m.dx * l.dy - m.dy * l.dx;
    const s = ((l.x - m.x) * l.dy - (l.y - m.y) * l.dx) / den;
    return [m.x + m.dx * s, m.y + m.dy * s];
  });
}

/** A polygon drawn as an outline of thickness t. */
const outline = (api, pts, t) => [api.geom.polygon(ccw(pts)), api.geom.orient(api.geom.polygon(inset(pts, t)), false)];

const rotate = (api, contours, cx, cy, deg) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return api.geom.transform(contours, ([x, y]) => [r1(cx + (x - cx) * c - (y - cy) * s), r1(cy + (x - cx) * s + (y - cy) * c)]);
};
const moved = (api, contours, dx, dy, s = 1, sy = s) => api.geom.transform(contours, ([x, y]) => [r1(x * s + dx), r1(y * sy + dy)]);

/** A pen of our own, for drawing into a scratch list (or with other numbers). */
function scratch(api, p = api.p) {
  const { rect, stroke, bar, polygon, ring, sector, disc: dsc } = api.geom;
  const contours = [];
  const add = (c) => {
    if (Array.isArray(c)) contours.push(...c);
    else contours.push(c);
  };
  return {
    p,
    contours,
    add,
    rect: (x0, y0, x1, y1) => add(rect(x0, y0, x1, y1)),
    stroke: (x0, y0, x1, y1, t = p.S * 0.93) => add(stroke(x0, y0, x1, y1, t)),
    bar: (x0, y0, x1, y1, t = p.S) => add(bar(x0, y0, x1, y1, t)),
    poly: (pts) => add(polygon(pts)),
    ring: (x0, y0, x1, y1, sx = p.S, sy = p.H, k = p.k) => add(ring(x0, y0, x1, y1, sx, sy, k, k === p.k ? p.kin : k + 0.03)),
    sector: (x0, y0, x1, y1, q0, q1, c0 = p.cut, c1 = c0, sx = p.S, sy = p.H, k = p.k) =>
      add(sector(x0, y0, x1, y1, sx, sy, k, q0 - 0.02, q1 + 0.02, c0, c1, k === p.k ? p.kin : k + 0.03)),
    dot: (cx, cy, d = p.S * 1.12) => {
      if (p.dot === "round") add(dsc(cx - d * 0.56, cy - d * 0.56, cx + d * 0.56, cy + d * 0.56));
      else add(rect(cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2));
    },
    slab: Math.min(p.S, 134),
    mark: () => {},
    base: null,
  };
}

/** A drawing done at heavier numbers and scaled down, so small signs keep a readable stroke. */
function small(api, draw, scale, weight = 1.3) {
  const { p } = api;
  const sp = scratch(api, { ...p, S: p.S * weight, H: p.H * weight });
  draw(sp);
  return api.geom.transform(sp.contours, ([x, y]) => [x * scale, y * scale]);
}

const mathAxis = (p) => p.X * 0.48;

/* ------------------------------------------------------------------ scriptDigit */

const FIGURE_NAMES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** The full-size drawing a small character is made from. */
function scriptSource(api, ch) {
  const { figures, sym, defs } = api;
  const i = "0123456789".indexOf(ch);
  if (i >= 0) return (sp) => figures[FIGURE_NAMES[i]][1](sp, 448);
  if (ch === "+") return (sp) => sym.plus[2](sp);
  if (ch === "=") return (sp) => sym.equal[2](sp);
  if (ch === "(") return (sp) => sym.parenleft[2](sp);
  if (ch === ")") return (sp) => sym.parenright[2](sp);
  if (ch === "n") return (sp) => defs.n[2](sp, 410);
  if (ch === "-" || ch === "−") {
    return (sp) => {
      const cy = mathAxis(sp.p);
      sp.rect(0, cy - sp.p.H / 2, 420, cy + sp.p.H / 2);
    };
  }
  throw new Error(`symbols: scriptDigit has no drawing for "${ch}"`);
}

/**
 * One small character as contours, ink from x = 0, placed for `position` ("sup", "sub",
 * "numr" or "dnom"). See the module header.
 */
export function scriptDigit(api, ch, position = "sup") {
  const { C } = api.p;
  const half = position === "numr" || position === "dnom";
  const scale = half ? 0.5 : 0.6;
  const c = small(api, scriptSource(api, ch), scale);
  const b = api.geom.bbox(c);
  // Figures align their ink with ¹ ² ³ (top at cap height); signs and n keep their place on
  // the scaled line, so a small "+" sits on the small figures' axis as a full one does.
  const figure = "0123456789".includes(ch);
  let dy;
  if (position === "sup" || position === "numr") dy = figure ? C - b.y1 : C - C * scale;
  else if (position === "sub") dy = -C * 0.16;
  else dy = 0;
  return moved(api, c, -b.x0, dy);
}

/* ------------------------------------------------------------------ the cell */

/**
 * A box-drawing cell: width, height and centre, the strokes of the three line weights, and the
 * overlap `e`. Whatever reaches a cell edge runs e = 40 units past it, on all four sides: a
 * browser places glyphs at fractional pixels, and two antialiased edges that only touch leave
 * a light seam. The overlap is symmetric, so the mono builder's centring keeps the cell exact,
 * and 960 + 40 / −260 − 40 is still inside usWinAscent / usWinDescent (1000 / 300).
 */
function cell(p) {
  const e = 40;
  const W = p.mono ? p.monoAdvance : p.figureAdvance - 2 * p.sb.T - 2 * e;
  const yA = p.lineAscender;
  const yD = p.lineDescender;
  const t1 = Math.max(36, Math.round(p.S * 0.7));
  return {
    W,
    yA,
    yD,
    e,
    x0: -e,
    x1: W + e,
    top: yA + e,
    bot: yD - e,
    cx: W / 2,
    cy: (yA + yD) / 2,
    t1,
    t2: Math.round(t1 * 1.9),
    tD: Math.max(28, Math.round(t1 * 0.78)),
    d: Math.round(t1 * 1.05),
  };
}

const pin = (g, c) => g.add([anchor(c.x0, c.cy), anchor(c.x1, c.cy)]);

/* ------------------------------------------------------------------ box drawing */

// Arms per code point: [up, right, down, left], each 0 none, 1 light, 2 heavy, 3 double.
const ARMS = {
  0x2500: [0, 1, 0, 1], 0x2501: [0, 2, 0, 2], 0x2502: [1, 0, 1, 0], 0x2503: [2, 0, 2, 0],
  0x250c: [0, 1, 1, 0], 0x250d: [0, 2, 1, 0], 0x250e: [0, 1, 2, 0], 0x250f: [0, 2, 2, 0],
  0x2510: [0, 0, 1, 1], 0x2511: [0, 0, 1, 2], 0x2512: [0, 0, 2, 1], 0x2513: [0, 0, 2, 2],
  0x2514: [1, 1, 0, 0], 0x2515: [1, 2, 0, 0], 0x2516: [2, 1, 0, 0], 0x2517: [2, 2, 0, 0],
  0x2518: [1, 0, 0, 1], 0x2519: [1, 0, 0, 2], 0x251a: [2, 0, 0, 1], 0x251b: [2, 0, 0, 2],
  0x251c: [1, 1, 1, 0], 0x251d: [1, 2, 1, 0], 0x251e: [2, 1, 1, 0], 0x251f: [1, 1, 2, 0],
  0x2520: [2, 1, 2, 0], 0x2521: [2, 2, 1, 0], 0x2522: [1, 2, 2, 0], 0x2523: [2, 2, 2, 0],
  0x2524: [1, 0, 1, 1], 0x2525: [1, 0, 1, 2], 0x2526: [2, 0, 1, 1], 0x2527: [1, 0, 2, 1],
  0x2528: [2, 0, 2, 1], 0x2529: [2, 0, 1, 2], 0x252a: [1, 0, 2, 2], 0x252b: [2, 0, 2, 2],
  0x252c: [0, 1, 1, 1], 0x252d: [0, 1, 1, 2], 0x252e: [0, 2, 1, 1], 0x252f: [0, 2, 1, 2],
  0x2530: [0, 1, 2, 1], 0x2531: [0, 1, 2, 2], 0x2532: [0, 2, 2, 1], 0x2533: [0, 2, 2, 2],
  0x2534: [1, 1, 0, 1], 0x2535: [1, 1, 0, 2], 0x2536: [1, 2, 0, 1], 0x2537: [1, 2, 0, 2],
  0x2538: [2, 1, 0, 1], 0x2539: [2, 1, 0, 2], 0x253a: [2, 2, 0, 1], 0x253b: [2, 2, 0, 2],
  0x253c: [1, 1, 1, 1], 0x253d: [1, 1, 1, 2], 0x253e: [1, 2, 1, 1], 0x253f: [1, 2, 1, 2],
  0x2540: [2, 1, 1, 1], 0x2541: [1, 1, 2, 1], 0x2542: [2, 1, 2, 1], 0x2543: [2, 1, 1, 2],
  0x2544: [2, 2, 1, 1], 0x2545: [1, 1, 2, 2], 0x2546: [1, 2, 2, 1], 0x2547: [2, 2, 1, 2],
  0x2548: [1, 2, 2, 2], 0x2549: [2, 1, 2, 2], 0x254a: [2, 2, 2, 1], 0x254b: [2, 2, 2, 2],
  0x2550: [0, 3, 0, 3], 0x2551: [3, 0, 3, 0], 0x2552: [0, 3, 1, 0], 0x2553: [0, 1, 3, 0],
  0x2554: [0, 3, 3, 0], 0x2555: [0, 0, 1, 3], 0x2556: [0, 0, 3, 1], 0x2557: [0, 0, 3, 3],
  0x2558: [1, 3, 0, 0], 0x2559: [3, 1, 0, 0], 0x255a: [3, 3, 0, 0], 0x255b: [1, 0, 0, 3],
  0x255c: [3, 0, 0, 1], 0x255d: [3, 0, 0, 3], 0x255e: [1, 3, 1, 0], 0x255f: [3, 1, 3, 0],
  0x2560: [3, 3, 3, 0], 0x2561: [1, 0, 1, 3], 0x2562: [3, 0, 3, 1], 0x2563: [3, 0, 3, 3],
  0x2564: [0, 3, 1, 3], 0x2565: [0, 1, 3, 1], 0x2566: [0, 3, 3, 3], 0x2567: [1, 3, 0, 3],
  0x2568: [3, 1, 0, 1], 0x2569: [3, 3, 0, 3], 0x256a: [1, 3, 1, 3], 0x256b: [3, 1, 3, 1],
  0x256c: [3, 3, 3, 3],
  0x2574: [0, 0, 0, 1], 0x2575: [1, 0, 0, 0], 0x2576: [0, 1, 0, 0], 0x2577: [0, 0, 1, 0],
  0x2578: [0, 0, 0, 2], 0x2579: [2, 0, 0, 0], 0x257a: [0, 2, 0, 0], 0x257b: [0, 0, 2, 0],
  0x257c: [0, 2, 0, 1], 0x257d: [1, 0, 2, 0], 0x257e: [0, 1, 0, 2], 0x257f: [2, 0, 1, 0],
};

/**
 * Draws one box-drawing glyph from its arms. Single and heavy arms run to the centre and past
 * it by half the widest crossing stroke; a double arm is two lines, and each line stops at the
 * nearer or the farther line of a crossing double arm, which is what makes ╔ ╦ ╬ ╠ read as
 * pipes rather than as grids.
 */
function drawArms(g, c, [U, R, D, L]) {
  const { x0, x1, top, bot, cx, cy, t1, t2, tD, d } = c;
  const th = (v) => (v === 2 ? t2 : t1);
  const single = (v) => v === 1 || v === 2;
  // How far a single/heavy arm runs past the centre, given the arms across it.
  const reach = (across, opposite) => {
    if (across.some((v) => v === 3)) return d + tD / 2;
    const m = Math.max(0, ...across.filter(single).map(th));
    if (m > 0) return m / 2;
    if (single(opposite)) return th(opposite) / 2;
    if (opposite === 3) return d + tD / 2;
    return 0;
  };
  // Where one line of a double arm stops, measured past the centre (negative: short of it).
  const lineStop = (near, far, across) => {
    if (near === 3) return -d + tD / 2;
    if (far === 3) return d + tD / 2;
    if (across.some(single)) return t1 / 2;
    return tD / 2;
  };
  // Left and right arms.
  for (const [side, v, opposite] of [
    [-1, L, R],
    [1, R, L],
  ]) {
    if (v === 0) continue;
    if (v !== 3) {
      const e = reach([U, D], opposite);
      const t = th(v);
      if (side < 0) g.rect(x0, cy - t / 2, cx + e, cy + t / 2);
      else g.rect(cx - e, cy - t / 2, x1, cy + t / 2);
      continue;
    }
    // Upper line: near side U; lower line: near side D.
    for (const [y, near, far] of [
      [cy + d, U, D],
      [cy - d, D, U],
    ]) {
      const e = lineStop(near, far, [U, D]);
      if (side < 0) g.rect(x0, y - tD / 2, cx + e, y + tD / 2);
      else g.rect(cx - e, y - tD / 2, x1, y + tD / 2);
    }
  }
  // Up and down arms.
  for (const [side, v, opposite] of [
    [1, U, D],
    [-1, D, U],
  ]) {
    if (v === 0) continue;
    if (v !== 3) {
      const e = reach([L, R], opposite);
      const t = th(v);
      if (side > 0) g.rect(cx - t / 2, cy - e, cx + t / 2, top);
      else g.rect(cx - t / 2, bot, cx + t / 2, cy + e);
      continue;
    }
    // Left line: near side L; right line: near side R.
    for (const [x, near, far] of [
      [cx - d, L, R],
      [cx + d, R, L],
    ]) {
      const e = lineStop(near, far, [L, R]);
      if (side > 0) g.rect(x - tD / 2, cy - e, x + tD / 2, top);
      else g.rect(x - tD / 2, bot, x + tD / 2, cy + e);
    }
  }
}

/** Dashed lines: n dashes per cell, each centred in its slot, so the pattern runs on. */
function drawDashes(g, c, n, heavy, vertical) {
  const t = heavy ? c.t2 : c.t1;
  if (!vertical) {
    const slot = c.W / n;
    const len = slot * 0.6;
    for (let i = 0; i < n; i++) {
      const x0 = slot * i + (slot - len) / 2;
      g.rect(x0, c.cy - t / 2, x0 + len, c.cy + t / 2);
    }
  } else {
    const h = c.yA - c.yD;
    const slot = h / n;
    const len = slot * 0.6;
    for (let i = 0; i < n; i++) {
      const y0 = c.yD + slot * i + (slot - len) / 2;
      g.rect(c.cx - t / 2, y0, c.cx + t / 2, y0 + len);
    }
  }
}

const DASHES = {
  0x2504: [3, false, false], 0x2505: [3, true, false], 0x2506: [3, false, true], 0x2507: [3, true, true],
  0x2508: [4, false, false], 0x2509: [4, true, false], 0x250a: [4, false, true], 0x250b: [4, true, true],
  0x254c: [2, false, false], 0x254d: [2, true, false], 0x254e: [2, false, true], 0x254f: [2, true, true],
};

/** ╭ ╮ ╯ ╰: a quarter circle of radius half the cell, with straight runs to the far edge. */
function drawRound(api, g, c, corner) {
  const { W, x0, x1, top, bot, cx, cy, t1 } = c;
  const R = W / 2;
  // [arc centre, from angle, to angle, vertical run from (cy ± R) to the top or bottom edge]
  const spec = {
    "╭": [cx + R, cy - R, Math.PI / 2, Math.PI, -1],
    "╮": [cx - R, cy - R, 0, Math.PI / 2, -1],
    "╯": [cx - R, cy + R, -Math.PI / 2, 0, 1],
    "╰": [cx + R, cy + R, Math.PI, (3 * Math.PI) / 2, 1],
  }[corner];
  const [ax, ay, a0, a1, dir] = spec;
  // Exactly a quarter: the arc's end at the cell edge must not pass it (the builder measures
  // control points too); the straight run overlaps the other end.
  g.add(thickArc(api, ax, ay, R, t1, a0, a1));
  if (dir < 0) g.rect(cx - t1 / 2, bot, cx + t1 / 2, cy - R + 2);
  else g.rect(cx - t1 / 2, cy + R - 2, cx + t1 / 2, top);
  // The arc meets its cell edge level: a short run carries it into the overlap.
  if (corner === "╭" || corner === "╰") g.rect(W - 2, cy - t1 / 2, x1, cy + t1 / 2);
  else g.rect(x0, cy - t1 / 2, 2, cy + t1 / 2);
}

/** ╱ ╲: a diagonal corner to corner, cut level at the top and bottom of the cell. */
function drawDiagonal(g, c, rising) {
  const { W, yA, yD, t1 } = c;
  const hw = (t1 / 2) * (Math.hypot(W, yA - yD) / (yA - yD));
  if (rising) g.poly([[0, yD], [2 * hw, yD], [W, yA], [W - 2 * hw, yA]]);
  else g.poly([[0, yA], [W - 2 * hw, yD], [W, yD], [2 * hw, yA]]);
}

function boxGlyphs(api) {
  const out = [];
  const add = (cp, draw) =>
    out.push({
      name: nameOf(String.fromCodePoint(cp)),
      unicode: String.fromCodePoint(cp),
      sides: "TT",
      width: 500,
      draw: (g) => {
        const c = cell(g.p);
        draw(g, c);
        pin(g, c);
      },
    });
  for (let cp = 0x2500; cp <= 0x257f; cp++) {
    const ch = String.fromCodePoint(cp);
    if (ARMS[cp]) add(cp, (g, c) => drawArms(g, c, ARMS[cp]));
    else if (DASHES[cp]) add(cp, (g, c) => drawDashes(g, c, ...DASHES[cp]));
    else if ("╭╮╯╰".includes(ch)) add(cp, (g, c) => drawRound(api, g, c, ch));
    else if (ch === "╱") add(cp, (g, c) => drawDiagonal(g, c, true));
    else if (ch === "╲") add(cp, (g, c) => drawDiagonal(g, c, false));
    else if (ch === "╳")
      add(cp, (g, c) => {
        drawDiagonal(g, c, true);
        drawDiagonal(g, c, false);
      });
    else throw new Error(`symbols: no box drawing for U+${cp.toString(16)}`);
  }
  return out;
}

/* ------------------------------------------------------------------ block elements */

function blockGlyphs(api) {
  const out = [];
  // Every edge drawn on the cell's boundary is moved out into the overlap (see cell()); the
  // shades keep their grid, so their pattern tiles evenly.
  const snap = (c, contours) =>
    api.geom.transform(contours, ([x, y]) => [x === 0 ? c.x0 : x === c.W ? c.x1 : x, y === c.yD ? c.bot : y === c.yA ? c.top : y]);
  const add = (ch, draw, overlap = true) =>
    out.push({
      name: nameOf(ch),
      unicode: ch,
      sides: "TT",
      width: 500,
      draw: (g) => {
        const c = cell(g.p);
        const sp = scratch(api, g.p);
        draw(sp, c);
        g.add(overlap ? snap(c, sp.contours) : sp.contours);
        pin(g, c);
      },
    });
  const H = (c) => c.yA - c.yD;
  // Bottom eighths ▁ … █ and the halves.
  add("▀", (g, c) => g.rect(0, c.cy, c.W, c.yA));
  "▁▂▃▄▅▆▇█".split("").forEach((ch, i) => add(ch, (g, c) => g.rect(0, c.yD, c.W, c.yD + (H(c) * (i + 1)) / 8)));
  "▉▊▋▌▍▎▏".split("").forEach((ch, i) => add(ch, (g, c) => g.rect(0, c.yD, (c.W * (7 - i)) / 8, c.yA)));
  add("▐", (g, c) => g.rect(c.cx, c.yD, c.W, c.yA));
  add("▔", (g, c) => g.rect(0, c.yA - H(c) / 8, c.W, c.yA));
  add("▕", (g, c) => g.rect((c.W * 7) / 8, c.yD, c.W, c.yA));
  // Shades: a 4 × 8 grid (squares about 150 units: about 2 px at 14 px), in a 2 × 2 pattern that
  // repeats across cells and lines. Light 25 %, medium 50 % (checker), dark 75 % (light inverted).
  const grid = (c, fn) => {
    const cw = c.W / 4;
    const ch = H(c) / 8;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) fn(col, row, col * cw, c.yD + row * ch, cw, ch);
  };
  add(
    "░",
    (g, c) =>
      grid(c, (col, row, x, y, w, h) => {
        if (col % 2 === 0 && row % 2 === 0) g.rect(x, y, x + w, y + h);
      }),
    false,
  );
  add(
    "▒",
    (g, c) =>
      grid(c, (col, row, x, y, w, h) => {
        if ((col + row) % 2 === 0) g.rect(x, y, x + w, y + h);
      }),
    false,
  );
  add("▓", (g, c) => {
    g.rect(c.x0, c.bot, c.x1, c.top);
    grid(c, (col, row, x, y, w, h) => {
      if (col % 2 === 0 && row % 2 === 0) g.add(api.geom.orient(api.geom.rect(x, y, x + w, y + h), false));
    });
  });
  // Quadrants, drawn as one outline each so no seam runs through a filled run.
  const q = (c) => ({ x0: 0, x1: c.W, xm: c.cx, y0: c.yD, y1: c.yA, ym: c.cy });
  add("▖", (g, c) => g.rect(0, c.yD, c.cx, c.cy));
  add("▗", (g, c) => g.rect(c.cx, c.yD, c.W, c.cy));
  add("▘", (g, c) => g.rect(0, c.cy, c.cx, c.yA));
  add("▝", (g, c) => g.rect(c.cx, c.cy, c.W, c.yA));
  add("▚", (g, c) => {
    g.rect(0, c.cy, c.cx, c.yA);
    g.rect(c.cx, c.yD, c.W, c.cy);
  });
  add("▞", (g, c) => {
    g.rect(c.cx, c.cy, c.W, c.yA);
    g.rect(0, c.yD, c.cx, c.cy);
  });
  add("▙", (g, c) => {
    const { x0, x1, xm, y0, y1, ym } = q(c);
    g.poly([[x0, y1], [x0, y0], [x1, y0], [x1, ym], [xm, ym], [xm, y1]]);
  });
  add("▛", (g, c) => {
    const { x0, x1, xm, y0, y1, ym } = q(c);
    g.poly([[x0, y0], [xm, y0], [xm, ym], [x1, ym], [x1, y1], [x0, y1]]);
  });
  add("▜", (g, c) => {
    const { x0, x1, xm, y0, y1, ym } = q(c);
    g.poly([[x0, ym], [xm, ym], [xm, y0], [x1, y0], [x1, y1], [x0, y1]]);
  });
  add("▟", (g, c) => {
    const { x0, x1, xm, y0, y1, ym } = q(c);
    g.poly([[x0, y0], [x1, y0], [x1, y1], [xm, y1], [xm, ym], [x0, ym]]);
  });
  return out;
}

/* ------------------------------------------------------------------ shapes */

/** Common numbers for the signs: the maths axis, an outline stroke, a shape size. */
const sign = (p) => ({ cy: mathAxis(p), t: p.S * 0.85, s: p.C * 0.6 });

function shapeGlyphs(api) {
  const out = [];
  const add = (ch, sides, draw) => out.push({ name: nameOf(ch), unicode: ch, sides, width: 500, draw: (g) => draw(g, sign(g.p)) });
  const square = (k, filled) => (g, { cy, t, s }) => {
    const a = (s * k) / 2;
    const pts = [[0, cy - a], [2 * a, cy - a], [2 * a, cy + a], [0, cy + a]];
    g.add(filled ? api.geom.polygon(pts) : outline(api, pts, t * (k < 0.7 ? 0.8 : 1)));
  };
  add("■", "SS", square(0.92, true));
  add("□", "SS", square(0.92, false));
  add("▪", "SS", square(0.55, true));
  add("▫", "SS", square(0.55, false));
  add("▬", "SS", (g, { cy, s }) => g.rect(0, cy - s * 0.22, s * 1.3, cy + s * 0.22));
  // Triangles: pointing up, right, down, left; full and small (▴ ▸ ▾ ◂ at 0.6).
  const tri = (dir, k, filled) => (g, { cy, t, s }) => {
    const h = s * k;
    const b = h * 1.15;
    let pts = [[0, -b / 2], [h, 0], [0, b / 2]]; // pointing right, about (0, 0)
    pts = pts.map(([x, y]) => {
      if (dir === "r") return [x, y];
      if (dir === "l") return [h - x, y];
      if (dir === "u") return [y + b / 2, x];
      return [y + b / 2, h - x];
    });
    const lift = dir === "u" || dir === "d" ? cy - h / 2 + (dir === "u" ? -h * 0.04 : h * 0.04) : cy;
    pts = pts.map(([x, y]) => [x, y + lift]);
    g.add(filled ? api.geom.polygon(pts) : outline(api, pts, t * (k < 0.7 ? 0.8 : 1)));
  };
  const tris = [
    ["▲", "u", 1, true], ["△", "u", 1, false], ["▴", "u", 0.6, true], ["▵", "u", 0.6, false],
    ["▶", "r", 1, true], ["▷", "r", 1, false], ["▸", "r", 0.6, true], ["▹", "r", 0.6, false],
    ["▼", "d", 1, true], ["▽", "d", 1, false], ["▾", "d", 0.6, true], ["▿", "d", 0.6, false],
    ["◀", "l", 1, true], ["◁", "l", 1, false], ["◂", "l", 0.6, true], ["◃", "l", 0.6, false],
  ];
  for (const [ch, dir, k, filled] of tris) add(ch, "DD", tri(dir, k, filled));
  // Pointers: flatter and longer than the triangles.
  const pointer = (right) => (g, { cy, s }) => {
    const w = s * 1.15;
    const h = s * 0.62;
    g.poly(right ? [[0, cy - h / 2], [w, cy], [0, cy + h / 2]] : [[w, cy - h / 2], [w, cy + h / 2], [0, cy]]);
  };
  add("►", "DD", pointer(true));
  add("◄", "DD", pointer(false));
  // Diamonds.
  const diamond = (k) => (cy, s) => {
    const a = (s * k) / 2;
    return [[0, cy], [a, cy - a * 1.15], [2 * a, cy], [a, cy + a * 1.15]];
  };
  add("◆", "DD", (g, { cy, s }) => g.poly(diamond(1.05)(cy, s)));
  add("◇", "DD", (g, { cy, t, s }) => g.add(outline(api, diamond(1.05)(cy, s), t)));
  add("◈", "DD", (g, { cy, t, s }) => {
    g.add(outline(api, diamond(1.05)(cy, s), t));
    const a = (s * 1.05) / 2;
    const k = a * 0.36;
    g.poly([[a - k, cy], [a, cy - k * 1.15], [a + k, cy], [a, cy + k * 1.15]]);
  });
  // Circles.
  const round = (ch, draw) => add(ch, "RR", draw);
  round("○", (g, { cy, t, s }) => g.add(hoop(api, s * 0.52, cy, s * 0.52, t)));
  round("●", (g, { cy, s }) => g.add(disc(api, s * 0.52, cy, s * 0.52)));
  round("◎", (g, { cy, t, s }) => {
    g.add(hoop(api, s * 0.52, cy, s * 0.52, t));
    g.add(hoop(api, s * 0.52, cy, s * 0.26, t * 0.85));
  });
  round("◯", (g, { cy, t, s }) => g.add(hoop(api, s * 0.8, cy + s * 0.05, s * 0.8, t)));
  // Half-black circles: the ring, and a half disc on the named side.
  const half = (a0) => (g, { cy, t, s }) => {
    const r = s * 0.52;
    g.add(hoop(api, r, cy, r, t));
    g.add(segment(api, r, cy, r - t / 2, a0, a0 + Math.PI));
  };
  round("◐", half(Math.PI / 2));
  round("◑", half(-Math.PI / 2));
  round("◒", half(Math.PI));
  round("◓", half(0));
  // Stars: five points, inner radius 0.4 of the outer.
  const star = (r) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.4;
      pts.push([r + rr * Math.cos(a), rr * Math.sin(a)]);
    }
    return pts;
  };
  add("★", "DD", (g, { cy, s }) => g.poly(star(s * 0.6).map(([x, y]) => [x, y + cy + s * 0.04])));
  add("☆", "DD", (g, { cy, t, s }) =>
    g.add(
      outline(
        api,
        star(s * 0.6).map(([x, y]) => [x, y + cy + s * 0.04]),
        t * 0.82,
      ),
    ),
  );
  return out;
}

/* ------------------------------------------------------------------ arrows */

/**
 * An arrow: shaft and two square-ended head strokes at 45°, the base table's proportions.
 * `tip` is where the head strokes start (a third of a stroke inside the point), `dir` the unit
 * vector it points along.
 */
function arrowAt(g, tip, dir, len, t, head = 240) {
  const u = [-dir[0], -dir[1]];
  const v = [-u[1], u[0]];
  const at = (k, m) => [tip[0] + u[0] * k + v[0] * m, tip[1] + u[1] * k + v[1] * m];
  g.bar(...at(t * 0.3, 0), ...at(len, 0), t);
  g.bar(...tip, ...at(head, head), t);
  g.bar(...tip, ...at(head, -head), t);
}

/** A double-stroke arrow (⇒): two shafts meeting a wider head. */
function doubleArrowAt(g, tip, dir, len, t, both = false) {
  const head = 260;
  const off = t * 1.35;
  const u = [-dir[0], -dir[1]];
  const v = [-u[1], u[0]];
  const at = (base, k, m) => [base[0] + u[0] * k + v[0] * m, base[1] + u[1] * k + v[1] * m];
  const tail = at(tip, len, 0);
  const heads = (p, uu) => {
    const vv = [-uu[1], uu[0]];
    const a = (k, m) => [p[0] + uu[0] * k + vv[0] * m, p[1] + uu[1] * k + vv[1] * m];
    g.bar(...p, ...a(head, head), t);
    g.bar(...p, ...a(head, -head), t);
  };
  heads(tip, u);
  // Each shaft starts where it meets the head strokes (at 45°, as far in as it is out).
  const s0 = off + t * 0.4;
  const s1 = both ? len - off - t * 0.4 : len;
  for (const m of [off, -off]) g.bar(...at(tip, s0, m), ...at(tip, s1, m), t * 0.82);
  if (both) heads(tail, dir);
}

function arrowGlyphs(api) {
  const out = [];
  const add = (ch, draw, sides = "NN") => out.push({ name: nameOf(ch), unicode: ch, sides, width: 500, draw: (g) => draw(g, g.p) });
  const T = (p) => p.S * 0.92;
  // Horizontal and vertical arrows span 600 along their axis, like ← ↑ → ↓.
  // Double-headed: two heads need room for a shaft between them, so a proportional face gives
  // these 820 units; a mono keeps its cell with smaller heads.
  add("↔", (g, p) => {
    const cy = mathAxis(p);
    const L = p.mono ? 600 : 820;
    const hd = p.mono ? 170 : 210;
    arrowAt(g, [20 + T(p) * 0.3, cy], [-1, 0], L - 40, T(p), hd);
    arrowAt(g, [L - 20 - T(p) * 0.3, cy], [1, 0], L / 2, T(p), hd);
  });
  add("↕", (g, p) => {
    const cy = mathAxis(p);
    const L = p.mono ? 600 : 700;
    const hd = p.mono ? 170 : 200;
    arrowAt(g, [300, cy + L / 2 - 20], [0, 1], L - 40, T(p), hd);
    arrowAt(g, [300, cy - L / 2 + 20], [0, -1], L / 2, T(p), hd);
  });
  // Diagonals: on the 45°, inside a 480 square about the axis.
  const diagArrow = (dx, dy) => (g, p) => {
    const cy = mathAxis(p);
    const h = 240;
    const d = [dx / Math.SQRT2, dy / Math.SQRT2];
    const tip = [h + dx * (h - 40), cy + dy * (h - 40)];
    const len = Math.hypot(2 * (h - 40), 2 * (h - 40));
    arrowAt(g, tip, d, len, T(p), 210);
  };
  add("↖", diagArrow(-1, 1));
  add("↗", diagArrow(1, 1));
  add("↘", diagArrow(1, -1));
  add("↙", diagArrow(-1, -1));
  // Double-stroke arrows.
  add("⇐", (g, p) => doubleArrowAt(g, [20 + T(p) * 0.3, mathAxis(p)], [-1, 0], 580, T(p)));
  add("⇒", (g, p) => doubleArrowAt(g, [600 - 20 - T(p) * 0.3, mathAxis(p)], [1, 0], 580, T(p)));
  add("⇑", (g, p) => doubleArrowAt(g, [300, mathAxis(p) + 290], [0, 1], 580, T(p)));
  add("⇓", (g, p) => doubleArrowAt(g, [300, mathAxis(p) - 290], [0, -1], 580, T(p)));
  add("⇔", (g, p) => doubleArrowAt(g, [20 + T(p) * 0.3, mathAxis(p)], [-1, 0], 560, T(p), true));
  // Hooked arrows: ↩ points left with a hook rising on the right; ↪ is its mirror.
  const hooked = (mirror) => (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const r = 120;
    const y0 = cy - r;
    const sp = scratch(api, p);
    arrowAt(sp, [30 + t * 0.3, y0], [-1, 0], 420 - 30, t, 200);
    sp.add(thickArc(api, 420, cy, r, t, -Math.PI / 2 - 0.02, Math.PI / 2 + 0.02));
    sp.rect(300, cy + r - t / 2, 422, cy + r + t / 2);
    g.add(mirror ? api.geom.mirrorX(sp.contours, 300) : sp.contours);
  };
  add("↩", hooked(false));
  add("↪", hooked(true));
  // Circle arrows: ↺ anticlockwise, ↻ clockwise; a 300° arc with the head on its end.
  const circleArrow = (clockwise) => (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const r = 220;
    const cx = 300;
    const a0 = Math.PI / 2 + 0.55;
    const a1 = a0 + Math.PI * 2 - 1.1;
    const sp = scratch(api, p);
    sp.add(thickArc(api, cx, cy, r, t, a0, a1));
    // The head at a1, pointing along the anticlockwise tangent.
    const end = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const tan = [-Math.sin(a1), Math.cos(a1)];
    const u = [-tan[0], -tan[1]];
    const v = [-u[1], u[0]];
    const hd = 150;
    const tip = [end[0] + tan[0] * 40, end[1] + tan[1] * 40];
    sp.bar(...tip, tip[0] + u[0] * hd + v[0] * hd, tip[1] + u[1] * hd + v[1] * hd, t);
    sp.bar(...tip, tip[0] + u[0] * hd - v[0] * hd, tip[1] + u[1] * hd - v[1] * hd, t);
    g.add(clockwise ? api.geom.mirrorX(sp.contours, cx) : sp.contours);
  };
  add("↺", circleArrow(false));
  add("↻", circleArrow(true));
  // Long arrows: the shaft runs 900 in proportional faces; a mono cell keeps 600.
  add("⟵", (g, p) => {
    const L = p.mono ? 560 : 860;
    arrowAt(g, [20 + T(p) * 0.3, mathAxis(p)], [-1, 0], L, T(p));
  });
  add("⟶", (g, p) => {
    const L = p.mono ? 560 : 860;
    arrowAt(g, [20 + L - T(p) * 0.3, mathAxis(p)], [1, 0], L - 20, T(p));
  });
  // Paired arrows: ⇄ right over left, ⇅ up beside down.
  add("⇄", (g, p) => {
    const t = T(p) * 0.85;
    const cy = mathAxis(p);
    arrowAt(g, [580 - t * 0.3, cy + 130], [1, 0], 560, t, 150);
    arrowAt(g, [20 + t * 0.3, cy - 130], [-1, 0], 560, t, 150);
  });
  add("⇅", (g, p) => {
    const t = T(p) * 0.85;
    const cy = mathAxis(p);
    arrowAt(g, [170, cy + 280], [0, 1], 560, t, 150);
    arrowAt(g, [430, cy - 280], [0, -1], 560, t, 150);
  });
  return out;
}

/* ------------------------------------------------------------------ keys and UI */

function keyGlyphs(api) {
  const out = [];
  const add = (ch, sides, draw) => out.push({ name: nameOf(ch), unicode: ch, sides, width: 500, draw: (g) => draw(g, g.p) });
  const T = (p) => p.S * 0.85;
  // ⌘: the four loops are the sides of a square run on past its corners and curled back.
  add("⌘", "RR", (g, p) => {
    const t = T(p) * 0.92;
    const cy = mathAxis(p) + 20;
    const a = 125; // half the inner square
    const r = 95; // loop radius (centre line)
    const cx = a + 2 * r;
    const L = cx - a;
    const R = cx + a;
    const B = cy - a;
    const Tt = cy + a;
    g.rect(L - r, Tt - t / 2, R + r, Tt + t / 2);
    g.rect(L - r, B - t / 2, R + r, B + t / 2);
    g.rect(L - t / 2, B - r, L + t / 2, Tt + r);
    g.rect(R - t / 2, B - r, R + t / 2, Tt + r);
    // Each loop is three quarters of a circle outside its corner.
    // Each skips the quarter facing the square.
    g.add(thickArc(api, L - r, Tt + r, r, t, 0, (3 * Math.PI) / 2));
    g.add(thickArc(api, R + r, Tt + r, r, t, -Math.PI / 2, Math.PI));
    g.add(thickArc(api, L - r, B - r, r, t, Math.PI / 2, 2 * Math.PI));
    g.add(thickArc(api, R + r, B - r, r, t, Math.PI, (5 * Math.PI) / 2));
  });
  // ⌥: a step down from the upper left to the lower right, and a separate upper-right bar.
  add("⌥", "SS", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const top = cy + 190;
    const bot = cy - 190;
    g.rect(0, top - t / 2, 180, top + t / 2);
    g.add(api.geom.stroke(150, top, 370, bot, t));
    g.rect(340, bot - t / 2, 540, bot + t / 2);
    g.rect(330, top - t / 2, 540, top + t / 2);
  });
  // ⇧ ⇪: the outlined upward arrow (⇪ stands it on a bar).
  const shiftArrow = (cx, base, top) => [
    [cx, top],
    [cx + 250, top - 250],
    [cx + 120, top - 250],
    [cx + 120, base],
    [cx - 120, base],
    [cx - 120, top - 250],
    [cx - 250, top - 250],
  ];
  add("⇧", "DD", (g, p) => {
    const cy = mathAxis(p);
    g.add(outline(api, shiftArrow(250, cy - 230, cy + 260), T(p) * 0.85));
  });
  add("⇪", "DD", (g, p) => {
    const cy = mathAxis(p);
    g.add(outline(api, shiftArrow(250, cy - 120, cy + 300), T(p) * 0.85));
    g.rect(130, cy - 300, 370, cy - 300 + T(p) * 0.85);
  });
  // ⌃: an upward chevron above the axis.
  add("⌃", "DD", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p) + 90;
    g.bar(0, cy - 110, 220, cy + 110, t);
    g.bar(440, cy - 110, 220, cy + 110, t);
  });
  // ⏎: down from the upper right, then left into an arrowhead.
  add("⏎", "NN", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p) - 90;
    g.rect(540 - t, cy - t / 2, 540, cy + 330);
    arrowAt(g, [30 + t * 0.3, cy], [-1, 0], 540 - t / 2 - 30, t, 170);
  });
  // ⌫ ⌦: a key shape pointing the way it erases, with a cross inside.
  const erase = (mirror) => (g, p) => {
    const t = T(p) * 0.85;
    const cy = mathAxis(p);
    const sp = scratch(api, p);
    sp.add(outline(api, [[0, cy], [170, cy + 210], [600, cy + 210], [600, cy - 210], [170, cy - 210]], t));
    const xc = 375;
    const k = 95;
    sp.bar(xc - k, cy - k, xc + k, cy + k, t);
    sp.bar(xc - k, cy + k, xc + k, cy - k, t);
    g.add(mirror ? api.geom.mirrorX(sp.contours, 300) : sp.contours);
  };
  add("⌫", "DD", erase(false));
  add("⌦", "DD", erase(true));
  // ⎋: a circle broken at the upper left, with an arrow leaving through the gap.
  add("⎋", "RR", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const r = 230;
    const cx = r + 10;
    const gap = 0.55;
    g.add(thickArc(api, cx, cy, r, t, (3 * Math.PI) / 4 + gap, (3 * Math.PI) / 4 + 2 * Math.PI - gap));
    const d = [-Math.SQRT1_2, Math.SQRT1_2];
    const tip = [cx + d[0] * (r + 10), cy + d[1] * (r + 10)];
    arrowAt(g, tip, d, r + 30, t, 130);
  });
  // ⇥ ⇤: an arrow into a bar.
  add("⇥", "NN", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    arrowAt(g, [500 - t * 0.4, cy], [1, 0], 480, t, 200);
    g.rect(560 - t, cy - 230, 560, cy + 230);
  });
  add("⇤", "NN", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    arrowAt(g, [60 + t * 1.4, cy], [-1, 0], 480, t, 200);
    g.rect(0, cy - 230, t, cy + 230);
  });
  // ⏏: a triangle over a bar.
  add("⏏", "DD", (g, p) => {
    const cy = mathAxis(p);
    g.poly([[0, cy - 20], [500, cy - 20], [250, cy + 260]]);
    g.rect(0, cy - 260, 500, cy - 150);
  });
  // ⏻ power: a broken circle with a bar through the gap. ⏼ on/off: the bar inside a full ring.
  // ⏾ sleep: a crescent.
  add("⏻", "RR", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p) - 10;
    const r = 220;
    g.add(thickArc(api, r + 20, cy, r, t, Math.PI / 2 + 0.62, Math.PI / 2 + 2 * Math.PI - 0.62));
    g.rect(r + 20 - t / 2, cy + 20, r + 20 + t / 2, cy + r + t * 0.9);
  });
  add("⏼", "RR", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const r = 240;
    g.add(hoop(api, r, cy, r, t));
    g.rect(r - t / 2, cy - r * 0.55, r + t / 2, cy + r * 0.55);
  });
  add("⏾", "RR", (g, p) => {
    const cy = mathAxis(p);
    const R = 240;
    const rb = 200;
    const dx = 170;
    // Intersections of the outer disc (centre 0) and the bite (centre dx).
    const x0 = (R * R - rb * rb + dx * dx) / (2 * dx);
    const y0 = Math.sqrt(R * R - x0 * x0);
    const th = Math.atan2(y0, x0);
    const phi = Math.atan2(y0, x0 - dx);
    const outer = arcCubics(R, cy, R, th, 2 * Math.PI - th);
    const inner = arcCubics(R + dx, cy, rb, 2 * Math.PI - phi, phi);
    const ct = { start: outer[0][0], segs: [...segsOf(outer), ...segsOf(inner)] };
    g.add(rotate(api, [api.geom.orient(ct, true)], R, cy, 30));
  });
  // Checks and crosses.
  const heavyPen = (p, k) => scratch(api, { ...p, S: p.S * k, H: p.H * k });
  add("✔", "DD", (g, p) => {
    const sp = heavyPen(p, 1.55);
    api.sym.checkmark[2](sp);
    g.add(sp.contours);
  });
  const cross = (k) => (g, p) => {
    const t = T(p) * k;
    const cy = mathAxis(p);
    g.bar(20, cy - 220, 440, cy + 220, t);
    g.bar(20, cy + 220, 440, cy - 220, t);
  };
  add("✗", "DD", cross(1));
  add("✘", "DD", cross(1.6));
  return out;
}

/* ------------------------------------------------------------------ bullets */

function bulletGlyphs(api) {
  const out = [];
  const add = (ch, sides, draw) => out.push({ name: nameOf(ch), unicode: ch, sides, width: 300, draw: (g) => draw(g, g.p) });
  add("◦", "RR", (g, p) => g.add(hoop(api, 120, mathAxis(p), 120, p.S * 0.72)));
  add("‣", "DD", (g, p) => {
    const cy = mathAxis(p);
    g.poly([[0, cy - 130], [220, cy], [0, cy + 130]]);
  });
  add("⁃", "SS", (g, p) => {
    const cy = mathAxis(p);
    g.rect(0, cy - p.H * 0.55, 200, cy + p.H * 0.55);
  });
  add("∙", "RR", (g, p) => g.dot(p.S * 0.7, mathAxis(p), p.S * 1.25));
  return out;
}

/* ------------------------------------------------------------------ maths */

function mathGlyphs(api) {
  const out = [];
  const add = (ch, sides, draw) => out.push({ name: nameOf(ch), unicode: ch, sides, width: 500, draw: (g) => draw(g, g.p) });
  const T = (p) => p.S * 0.85;
  // Big operators run from below the baseline to above cap height.
  add("∑", "SS", (g, p) => {
    const t = T(p);
    const top = p.C + 60;
    const bot = -150;
    const mid = (top + bot) / 2;
    g.rect(0, top - p.H, 520, top);
    g.rect(0, bot, 520, bot + p.H);
    g.add(api.geom.stroke(20, top - p.H / 2, 300, mid, t * 1.05));
    g.add(api.geom.stroke(300, mid, 20, bot + p.H / 2, t * 1.05));
  });
  add("∏", "SS", (g, p) => {
    const t = T(p);
    const top = p.C + 60;
    g.rect(0, top - p.H, 560, top);
    g.rect(60, -150, 60 + t * 1.05, top);
    g.rect(500 - t * 1.05, -150, 500, top);
  });
  add("√", "DD", (g, p) => {
    const t = T(p);
    const top = p.C + 40;
    g.bar(0, 260, 70, 300, t * 0.8);
    g.add(api.geom.stroke(70, 300, 180, -20, t));
    g.add(api.geom.stroke(180, -20, 400, top, t * 0.9));
    g.rect(380, top - p.H, 600, top);
  });
  add("∂", "RR", (g, p) => {
    const t = T(p);
    g.add(api.geom.ring(0, -10, 400, p.X * 0.95, t, p.H, K, K));
    // The back curls up from the bowl's right side and over to the left at the top.
    g.add(api.geom.sector(-20, -10, 400, p.C + 10, t, p.H, K, 0, 1.75, "r", "r", K));
  });
  add("∆", "DD", (g, p) => g.add(outline(api, [[0, 0], [560, 0], [280, p.C]], T(p) * 1.05)));
  add("∇", "DD", (g, p) => g.add(outline(api, [[0, p.C], [280, 0], [560, p.C]], T(p) * 1.05)));
  add("∫", "NN", (g, p) => {
    const t = T(p);
    const top = p.A + 40;
    const bot = p.D - 30;
    const x = 200;
    g.rect(x, bot + 120, x + t, top - 120);
    g.add(api.geom.sector(x, top - 240, x + 240, top, t, p.H, K, 0.55, 2.02, "r", "r", K));
    g.add(api.geom.sector(x + t - 240, bot, x + t, bot + 240, t, p.H, K, 2.55, 4.02, "r", "r", K));
  });
  // Set membership and relations around the maths axis.
  const cupShape = (g, p, up) => {
    const t = T(p);
    const cy = mathAxis(p);
    const h = 230;
    const sp = scratch(api, p);
    const w = 440;
    // ∪: stems from the top down to a half ring at the bottom.
    const ey = cy - h * 0.4; // the bowl's centre line, where the stems meet it
    sp.rect(0, ey - 2, t, cy + h);
    sp.rect(w - t, ey - 2, w, cy + h);
    sp.add(api.geom.sector(0, cy - h, w, cy + h * 0.2, t, p.H, K, 2, 4, "r", "r", K));
    g.add(up ? api.geom.mirrorY(sp.contours, cy) : sp.contours);
  };
  add("∪", "SS", (g, p) => cupShape(g, p, false));
  add("∩", "SS", (g, p) => cupShape(g, p, true));
  const subset = (mirror, under, member, slashed) => (g, p) => {
    const t = T(p);
    const cy = mathAxis(p) + (under ? 60 : 0);
    const h = 220;
    const w = 460;
    const sp = scratch(api, p);
    sp.add(api.geom.sector(0, cy - h, 2 * h, cy + h, t, p.H, K, 1, 3, "r", "r", K));
    sp.rect(h - 2, cy + h - p.H, w, cy + h);
    sp.rect(h - 2, cy - h, w, cy - h + p.H);
    if (member) sp.rect(0 + t * 0.5, cy - p.H / 2, w - 40, cy + p.H / 2);
    if (under) sp.rect(0, cy - h - 150, w, cy - h - 150 + p.H);
    if (slashed) sp.add(api.geom.stroke(100, cy - h - 80, 380, cy + h + 80, t * 0.85));
    g.add(mirror ? api.geom.mirrorX(sp.contours, w / 2) : sp.contours);
  };
  add("⊂", "RS", subset(false, false, false, false));
  add("⊃", "SR", subset(true, false, false, false));
  add("⊆", "RS", subset(false, true, false, false));
  add("⊇", "SR", subset(true, true, false, false));
  add("∈", "RS", subset(false, false, true, false));
  add("∉", "RS", subset(false, false, true, true));
  add("∧", "DD", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    g.add(api.geom.stroke(0, cy - 240, 230, cy + 240, t));
    g.add(api.geom.stroke(230, cy + 240, 460, cy - 240, t));
  });
  add("∨", "DD", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    g.add(api.geom.stroke(0, cy + 240, 230, cy - 240, t));
    g.add(api.geom.stroke(230, cy - 240, 460, cy + 240, t));
  });
  const circled = (times) => (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const r = 250;
    g.add(hoop(api, r, cy, r, t));
    if (times) {
      const k = (r - t / 2) * Math.SQRT1_2;
      g.bar(r - k, cy - k, r + k, cy + k, t * 0.9);
      g.bar(r - k, cy + k, r + k, cy - k, t * 0.9);
    } else {
      g.rect(t / 2, cy - p.H / 2, 2 * r - t / 2, cy + p.H / 2);
      g.rect(r - t / 2, cy - r + t / 2, r + t / 2, cy + r - t / 2);
    }
  };
  add("⊕", "RR", circled(false));
  add("⊗", "RR", circled(true));
  add("∀", "DD", (g, p) => {
    const t = T(p);
    g.add(api.geom.stroke(0, p.C, 270, 0, t));
    g.add(api.geom.stroke(270, 0, 540, p.C, t));
    g.rect(110, p.C * 0.52, 430, p.C * 0.52 + p.H);
  });
  add("∃", "NS", (g, p) => {
    const t = T(p);
    g.rect(400 - t, 0, 400, p.C);
    g.rect(0, p.C - p.H, 400, p.C);
    g.rect(0, 0, 400, p.H);
    g.rect(60, p.C * 0.5 - p.H / 2, 400, p.C * 0.5 + p.H / 2);
  });
  add("∅", "RR", (g, p) => {
    const t = T(p);
    const cy = p.C * 0.5;
    const r = 260;
    g.add(hoop(api, r + 40, cy, r, t));
    g.add(api.geom.stroke(40, cy - r - 70, 2 * r + 40, cy + r + 70, t * 0.9));
  });
  add("⌀", "RR", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    const r = 190;
    g.add(hoop(api, r + 50, cy, r, t));
    g.add(api.geom.stroke(40, cy - r - 60, 2 * r + 60, cy + r + 60, t * 0.85));
  });
  add("∝", "RS", (g, p) => {
    const t = T(p);
    const cy = mathAxis(p);
    g.add(api.geom.ring(0, cy - 150, 320, cy + 150, t, p.H, K, K));
    g.add(api.geom.sector(300, cy - 150, 820, cy + 150, t, p.H, K, 1, 3, "v", "v", K));
  });
  add("∠", "DD", (g, p) => {
    const t = T(p);
    g.rect(0, 0, 560, p.H);
    g.add(api.geom.stroke(t * 0.5, 0, 460, p.C * 0.92, t));
  });
  add("⊥", "SS", (g, p) => {
    const t = T(p);
    g.rect(0, 0, 520, p.H);
    g.rect(260 - t / 2, 0, 260 + t / 2, p.C);
  });
  const par = (k, top, bot) => (g, p) => {
    const t = T(p) * k;
    g.rect(0, bot, t, top);
    g.rect(170, bot, 170 + t, top);
  };
  add("∥", "SS", (g, p) => par(1, mathAxis(p) + 300, mathAxis(p) - 300)(g, p));
  add("‖", "SS", (g, p) => par(1, p.A, p.D)(g, p));
  add("≡", "SS", (g, p) => {
    const cy = mathAxis(p);
    for (const dy of [-170, 0, 170]) g.rect(0, cy + dy - p.H / 2, 520, cy + dy + p.H / 2);
  });
  add("≅", "SS", (g, p) => {
    const cy = mathAxis(p) - 60;
    g.rect(0, cy - 90 - p.H / 2, 520, cy - 90 + p.H / 2);
    g.rect(0, cy + 70 - p.H / 2, 520, cy + 70 + p.H / 2);
    const sp = scratch(api, p);
    api.sym.asciitilde[2](sp);
    const b = api.geom.bbox(sp.contours);
    const k = 520 / (b.x1 - b.x0);
    g.add(moved(api, sp.contours, -b.x0 * k, cy + 250 - (b.y0 + b.y1) / 2, k, 1));
  });
  const twice = (which) => (g, p) => {
    const sp = scratch(api, p);
    api.sym[which][2](sp);
    const b = api.geom.bbox(sp.contours);
    const w = b.x1 - b.x0;
    const c = moved(api, sp.contours, -b.x0, 0);
    g.add(c);
    g.add(moved(api, c, w * 0.62, 0));
  };
  add("≪", "DD", twice("less"));
  add("≫", "DD", twice("greater"));
  // Ceiling and floor: a bracket with only its top or its bottom foot.
  const ceilFloor = (mirror, topFoot) => (g, p) => {
    const t = T(p);
    const sp = scratch(api, p);
    sp.rect(0, p.D + 20, t, p.A + 20);
    if (topFoot) sp.rect(0, p.A + 20 - p.H, 220, p.A + 20);
    else sp.rect(0, p.D + 20, 220, p.D + 20 + p.H);
    g.add(mirror ? api.geom.mirrorX(sp.contours, 110) : sp.contours);
  };
  add("⌈", "SN", ceilFloor(false, true));
  add("⌉", "NS", ceilFloor(true, true));
  add("⌊", "SN", ceilFloor(false, false));
  add("⌋", "NS", ceilFloor(true, false));
  return out;
}

/* ------------------------------------------------------------------ superscripts and subscripts */

function scriptGlyphs(api) {
  const out = [];
  const sup = { "⁰": "0", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")", "ⁿ": "n" };
  const sub = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")" };
  for (const [ch, src] of Object.entries(sup)) out.push({ name: nameOf(ch), unicode: ch, sides: "NN", width: 300, draw: (g) => g.add(scriptDigit(api, src, "sup")) });
  for (const [ch, src] of Object.entries(sub)) out.push({ name: nameOf(ch), unicode: ch, sides: "NN", width: 300, draw: (g) => g.add(scriptDigit(api, src, "sub")) });
  return out;
}

/* ------------------------------------------------------------------ dashes, spaces, misc */

function miscGlyphs(api) {
  const out = [];
  const add = (ch, sides, draw) => out.push({ name: nameOf(ch), unicode: ch, sides, width: 500, draw: (g) => draw(g, g.p) });
  const T = (p) => p.S * 0.85;
  // Hyphens: the base table's drawing under their own code points.
  add("\u2010", "SS", (g) => api.sym.hyphen[2](g));
  add("\u2011", "SS", (g) => api.sym.hyphen[2](g));
  // ‒ figure dash: as wide as a figure, at the hyphen's height.
  add("\u2012", "NN", (g, p) => {
    const sp = scratch(api, p);
    api.sym.hyphen[2](sp);
    const b = api.geom.bbox(sp.contours);
    const w = p.mono ? p.monoAdvance - 80 : p.figureAdvance - 80;
    g.rect(0, b.y0, w, b.y1);
  });
  // ⁄ fraction slash and ∕ division slash.
  add("⁄", "TT", (g, p) => g.add(api.geom.stroke(0, -20, 300, p.C + 20, T(p) * 0.85)));
  add("∕", "DD", (g) => api.sym.slash[2](g));
  // Spaces: nothing drawn, only the advance, set by two anchors (the builder spaces a glyph by
  // its ink box). In a mono every space is one cell.
  const space = (ch, adv) =>
    out.push({
      name: nameOf(ch),
      unicode: ch,
      sides: "NN",
      width: 300,
      draw: (g) => {
        const a = typeof adv === "function" ? adv(g.p) : adv;
        g.add([anchor(0, 0), anchor(Math.max(1, a - 80), 0)]);
      },
    });
  space("\u2007", (p) => p.figureAdvance);
  space("\u2009", (p) => Math.round(200 * p.wf));
  space("\u200A", (p) => Math.round(100 * p.wf));
  // ⌂ house.
  add("⌂", "SS", (g, p) => {
    const t = T(p);
    g.add(outline(api, [[0, 0], [460, 0], [460, 300], [230, 520], [0, 300]], t));
  });
  // ⌛ ⏳ hourglasses; ⏳ shows sand falling into the lower half.
  const hourglass = (sand) => (g, p) => {
    const t = T(p) * 0.85;
    const top = p.C;
    const bot = 0;
    const mid = (top + bot) / 2;
    g.rect(0, top - p.H, 440, top);
    g.rect(0, bot, 440, bot + p.H);
    // The glass: two strokes crossing at the neck.
    g.add(api.geom.stroke(70, top - p.H, 370, bot + p.H, t));
    g.add(api.geom.stroke(370, top - p.H, 70, bot + p.H, t));
    if (sand) {
      g.poly([[130, bot + p.H], [310, bot + p.H], [220, bot + p.H + 130]]);
      g.rect(220 - t * 0.28, mid - 150, 220 + t * 0.28, mid);
    }
  };
  add("⌛", "SS", hourglass(false));
  add("⏳", "SS", hourglass(true));
  // ⌚ watch: a ring with straps and hands. ⏱ stopwatch: a ring with a crown and one hand.
  add("⌚", "RR", (g, p) => {
    const t = T(p);
    const cy = p.C * 0.45;
    const r = 200;
    g.add(hoop(api, r, cy, r, t));
    // Straps: narrower than the face and tapering away from it.
    const top = cy + r - t * 0.4;
    const bot = cy - r + t * 0.4;
    g.poly([[r - 105, top], [r + 105, top], [r + 80, p.C + 40], [r - 80, p.C + 40]]);
    g.poly([[r - 80, -40], [r + 80, -40], [r + 105, bot], [r - 105, bot]]);
    g.rect(r - t * 0.35, cy, r + t * 0.35, cy + r * 0.62);
    g.rect(r, cy - t * 0.35, r + r * 0.48, cy + t * 0.35);
  });
  add("⏱", "RR", (g, p) => {
    const t = T(p);
    const cy = p.C * 0.42;
    const r = 230;
    g.add(hoop(api, r, cy, r, t));
    g.rect(r - 60, cy + r - 10, r + 60, cy + r + 70);
    g.rect(r - 110, cy + r + 70, r + 110, cy + r + 70 + p.H);
    g.add(api.geom.bar(r, cy, r + r * 0.42, cy + r * 0.42, t * 0.8));
  });
  // ⚠ a warning triangle with an exclamation mark.
  add("⚠", "DD", (g, p) => {
    const t = T(p);
    const top = p.C + 20;
    g.add(outline(api, [[0, -10], [620, -10], [310, top]], t * 0.95));
    g.rect(310 - t * 0.48, top * 0.36, 310 + t * 0.48, top * 0.7);
    g.dot(310, top * 0.2, t * 1.05);
  });
  return out;
}

/* ------------------------------------------------------------------ the module */

export function glyphs(api) {
  return [...boxGlyphs(api), ...blockGlyphs(api), ...shapeGlyphs(api), ...arrowGlyphs(api), ...keyGlyphs(api), ...bulletGlyphs(api), ...mathGlyphs(api), ...scriptGlyphs(api), ...miscGlyphs(api)];
}

/** Kerning pairs this module adds: [left, right, units]. */
export const kerning = [];
