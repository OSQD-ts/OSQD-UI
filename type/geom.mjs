// Geometry for the OSQD typefaces: every glyph is a union of a few filled primitives —
// rectangles, slanted strokes, polygons and ring sectors built from quarter-ellipse cubics.
//
// A contour is { start: [x, y], segs: [{ L: [x, y] } | { C: [[x1, y1], [x2, y2], [x, y]] }] }.
// Ink is wound counter-clockwise and counters clockwise, so the nonzero fill rule turns
// overlapping ink into a union and every ring keeps its hole. Overlaps are left in the
// outlines on purpose: browsers rasterise them correctly and the sources stay readable.

/** One quarter of an ellipse as a cubic, CCW from quadrant q (0 = right, 1 = top, 2 = left, 3 = bottom). */
function quarter(e, q) {
  const { cx, cy, rx, ry, k } = e;
  const pts = [
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
    [cx, cy - ry],
  ];
  const a = pts[q % 4];
  const b = pts[(q + 1) % 4];
  // The handle of each end runs along that end's tangent, towards the corner of the box.
  const corner = [a[0] === cx ? b[0] : a[0], a[1] === cy ? b[1] : a[1]];
  const c1 = [a[0] + (corner[0] - a[0]) * k, a[1] + (corner[1] - a[1]) * k];
  const c2 = [b[0] + (corner[0] - b[0]) * k, b[1] + (corner[1] - b[1]) * k];
  return [a, c1, c2, b];
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** De Casteljau split of a cubic at t: returns [left, right]. */
function split(c, t) {
  const [p0, p1, p2, p3] = c;
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const d = lerp(p2, p3, t);
  const e = lerp(a, b, t);
  const f = lerp(b, d, t);
  const g = lerp(e, f, t);
  return [
    [p0, a, e, g],
    [g, f, d, p3],
  ];
}

/** The part of a cubic between t0 and t1. */
function sub(c, t0, t1) {
  if (t0 <= 0 && t1 >= 1) return c;
  let x = c;
  if (t0 > 0) x = split(x, t0)[1];
  if (t1 < 1) x = split(x, (t1 - t0) / (1 - t0))[0];
  return x;
}

/** Cubics covering the ellipse arc from q0 to q1 (q in quarter turns, CCW, q1 > q0, may exceed 4). */
export function arc(e, q0, q1) {
  const out = [];
  for (let q = Math.floor(q0); q < q1; q++) {
    const a = Math.max(q0, q) - q;
    const b = Math.min(q1, q + 1) - q;
    if (b - a < 1e-6) continue;
    out.push(sub(quarter(e, ((q % 4) + 4) % 4), a, b));
  }
  return out;
}

export function pointAt(e, q) {
  const qq = Math.floor(q);
  const c = quarter(e, ((qq % 4) + 4) % 4);
  const t = q - qq;
  return t === 0 ? c[0] : split(c, t)[0][3];
}

/** Find q near q0 on ellipse e where the coordinate axis (0 = x, 1 = y) equals v. */
function solve(e, q0, axis, v) {
  let best = q0;
  let bestD = Infinity;
  const steps = 400;
  for (let i = 0; i <= steps; i++) {
    const q = q0 - 0.6 + (1.2 * i) / steps;
    const d = Math.abs(pointAt(e, q)[axis] - v);
    // Prefer the nearest crossing to q0 among near-equal candidates.
    if (d < bestD - 0.01 || (Math.abs(d - bestD) <= 0.01 && Math.abs(q - q0) < Math.abs(best - q0))) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

/**
 * The q on ellipse e closest to point pt, searched near q0: a cut from pt to there runs
 * square across the stroke. The same q on both curves only does that on a thin ring.
 */
function nearest(e, q0, pt) {
  let best = q0;
  let bestD = Infinity;
  for (let n = 0; n <= 480; n++) {
    const q = q0 - 0.6 + (1.2 * n) / 480;
    const p = pointAt(e, q);
    const d = (p[0] - pt[0]) ** 2 + (p[1] - pt[1]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

export const ellipse = (x0, y0, x1, y1, k) => ({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, k });

function contourFromCubics(cubics, closeTo) {
  const segs = cubics.map((c) => ({ C: [c[1], c[2], c[3]] }));
  return { start: cubics[0][0], segs, closeTo };
}

/** Signed area by sampling (positive = counter-clockwise). */
function area(ct) {
  const pts = [ct.start];
  let cur = ct.start;
  for (const s of ct.segs) {
    if (s.L) {
      pts.push(s.L);
      cur = s.L;
    } else {
      const c = [cur, ...s.C];
      for (let i = 1; i <= 8; i++) pts.push(split(c, i / 8)[0][3]);
      cur = s.C[2];
    }
  }
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function reverse(ct) {
  const pts = [ct.start];
  for (const s of ct.segs) pts.push(s.L ?? s.C[2]);
  const out = { start: pts[pts.length - 1], segs: [] };
  for (let i = ct.segs.length - 1; i >= 0; i--) {
    const s = ct.segs[i];
    const to = pts[i];
    out.segs.push(s.L ? { L: to } : { C: [s.C[1], s.C[0], to] });
  }
  return out;
}

export function orient(ct, ccw) {
  const a = area(ct);
  return (a > 0) === ccw ? ct : reverse(ct);
}

export function polygon(pts) {
  return orient({ start: pts[0], segs: pts.slice(1).map((p) => ({ L: p })) }, true);
}

export function rect(x0, y0, x1, y1) {
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 < y0) [y0, y1] = [y1, y0];
  return polygon([
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]);
}

/**
 * A straight stroke between two points, thickness measured perpendicular to it,
 * cut horizontally at both ends (the cut every diagonal of a sans takes at the baseline,
 * the x-height and the cap height).
 */
export function stroke(x0, y0, x1, y1, t) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.abs(dy) < 1e-6) return rect(Math.min(x0, x1), y0 - t / 2, Math.max(x0, x1), y0 + t / 2);
  const len = Math.hypot(dx, dy);
  // Below 30° from the horizontal a level cut grows without limit (its half-width is t/2 ÷ sin),
  // so a near-flat stroke is cut square instead, across the stroke.
  if (Math.abs(dy) / len < 0.5) {
    const nx = (-dy / len) * (t / 2);
    const ny = (dx / len) * (t / 2);
    return polygon([
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny],
    ]);
  }
  const hw = (t / 2) * (len / Math.abs(dy)); // horizontal half-width of the cut
  return polygon([
    [x0 - hw, y0],
    [x0 + hw, y0],
    [x1 + hw, y1],
    [x1 - hw, y1],
  ]);
}

/** A stroke with perpendicular (square) ends, for strokes that are not cut at a line. */
export function bar(x0, y0, x1, y1, t) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (t / 2);
  const ny = (dx / len) * (t / 2);
  return polygon([
    [x0 + nx, y0 + ny],
    [x1 + nx, y1 + ny],
    [x1 - nx, y1 - ny],
    [x0 - nx, y0 - ny],
  ]);
}

/** A filled ellipse (dots). */
export function disc(x0, y0, x1, y1, k = 0.5523) {
  const e = ellipse(x0, y0, x1, y1, k);
  return orient(contourFromCubics(arc(e, 0, 4)), true);
}

/** A full ring: outer box, stroke widths sx (sides) and sy (top and bottom). */
export function ring(x0, y0, x1, y1, sx, sy, k, kin = k) {
  const o = ellipse(x0, y0, x1, y1, k);
  const i = ellipse(x0 + sx, y0 + sy, x1 - sx, y1 - sy, kin);
  return [orient(contourFromCubics(arc(o, 0, 4)), true), orient(contourFromCubics(arc(i, 0, 4)), false)];
}

/**
 * A ring sector from q0 to q1 (CCW quarter turns). Each end is cut by `cut`:
 *   "r" square to the stroke, "h" horizontal, "v" vertical, "a" chosen from the slope.
 */
export function sector(x0, y0, x1, y1, sx, sy, k, q0, q1, cut0 = "r", cut1 = cut0, kin = k) {
  const o = ellipse(x0, y0, x1, y1, k);
  const i = ellipse(x0 + sx, y0 + sy, x1 - sx, y1 - sy, kin);
  const inner = (q, cut) => {
    // "a" cuts across the stroke the way a terminal is cut by hand: horizontally where the
    // curve runs steeply (the c and C), vertically where it runs flat (the tails of t, j, g).
    if (cut === "a") {
      const p0 = pointAt(o, q - 0.01);
      const p1 = pointAt(o, q + 0.01);
      const deg = (Math.atan2(Math.abs(p1[1] - p0[1]), Math.abs(p1[0] - p0[0])) * 180) / Math.PI;
      // Between the two, a level cut makes a long sliver: cut square to the stroke instead.
      cut = deg < 28 ? "v" : deg > 62 ? "h" : "r";
    }
    if (cut === "h") return solve(i, q, 1, pointAt(o, q)[1]);
    if (cut === "v") return solve(i, q, 0, pointAt(o, q)[0]);
    return nearest(i, q, pointAt(o, q));
  };
  let i0 = inner(q0, cut0);
  let i1 = inner(q1, cut1);
  if (i1 <= i0) [i0, i1] = [q0, q1];
  const outer = arc(o, q0, q1);
  const inn = arc(i, i0, i1);
  const segs = outer.map((c) => ({ C: [c[1], c[2], c[3]] }));
  segs.push({ L: pointAt(i, i1) });
  for (let n = inn.length - 1; n >= 0; n--) {
    const c = inn[n];
    segs.push({ C: [c[2], c[1], c[0]] });
  }
  return orient({ start: outer[0][0], segs }, true);
}

/** Moves and mirrors contours. */
export function transform(contours, f) {
  return contours.map((ct) => {
    const out = { start: f(ct.start), segs: ct.segs.map((s) => (s.L ? { L: f(s.L) } : { C: s.C.map(f) })) };
    return out;
  });
}

export function mirrorX(contours, axis) {
  // Mirroring flips winding; flip it back so ink stays CCW and counters CW.
  return transform(contours, ([x, y]) => [2 * axis - x, y]).map(reverse);
}

export function mirrorY(contours, axis) {
  return transform(contours, ([x, y]) => [x, 2 * axis - y]).map(reverse);
}

export function bbox(contours) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ct of contours) {
    for (const p of [ct.start, ...ct.segs.flatMap((s) => (s.L ? [s.L] : s.C))]) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
  }
  return { x0, y0, x1, y1 };
}
