// The "cyrillic" glyph module: Russian, Ukrainian, Belarusian, Bulgarian, Serbian, Macedonian
// and Kazakh, drawn with the same pen as glyphs.mjs.
//
// Letters whose Cyrillic form is the Latin one (А В Е К М Н О Р С Т Х, а е о р с у х, І Ј Ѕ …)
// call the Latin drawing, but are their own glyphs: each code point is added separately. The
// rest are drawn here once, parameterised by height, so a capital and its lowercase share one
// construction: the lowercase к л м н п т ш … are the capitals' shapes at x-height, as upright
// Cyrillic lowercase is, rather than look-alikes of Latin letters.
//
// glyphs(api) returns [{ name, unicode, sides, width, draw, accent? }] in the shape of the Polish
// table in glyphs.mjs; widths are the regular OSQD Sans ink widths, scaled per family and weight
// by the builder. A code point another table already has throws.

export const id = "cyrillic";

/** Horizontal half-width of a diagonal stroke of thickness t over (dx, dy), as in glyphs.mjs. */
const hwOf = (t, dx, dy) => (t / 2) * (Math.hypot(dx, dy) / Math.abs(dy || 1));

/** The pen with some of the font's numbers replaced: a capital drawing at x-height, say. */
const withP = (g, over) => Object.assign(Object.create(g), { p: { ...g.p, ...over } });

/** Runs `fn`, takes the contours it drew back out of the pen, and returns them. */
function capture(g, fn) {
  const n = g.contours.length;
  fn();
  return g.contours.splice(n);
}

/** How far a descender tail (Д Ц Щ Қ Ң Џ …) drops: shorter than a full descender. */
const tailDepth = (p) => Math.round(Math.min(-p.D * 0.7, 150));

/** Stem width for letters with three stems, so Ш Щ Ж keep an even colour (and fit in mono). */
// In the mono, past Bold, the three stems step down further: the cell does not grow with them.
const stem3 = (p) => (p.mono ? p.S * (p.S > 130 ? 0.7 : 0.8) : p.S * 0.94);

export function glyphs(api) {
  const { p, defs, accents } = api;
  const { mirrorX, mirrorY } = api.geom;
  const { acute } = accents;

  const latin = (ch) => {
    const [sides, width, draw] = defs[ch];
    return { sides, width: width || p.S, draw };
  };

  /* ---------------------------------------------------------------- accents */

  const centre = (g, b) => g.stemX ?? (b.x0 + b.x1) / 2;
  const diaeresis = (g, cx, top) => {
    const { S } = g.p;
    const gap = S * 0.72 + 40;
    g.dot(cx - gap, top + 70 + S * 0.56);
    g.dot(cx + gap, top + 70 + S * 0.56);
  };
  const breve = (g, cx, top) => {
    const { S, H } = g.p;
    const r = 112 + S * 0.25;
    const h = 92;
    g.sector(cx - r, top + 50, cx + r, top + 50 + 2 * h, 2.06, 3.94, "h", "h", S * 0.82, H * 0.86);
  };
  const upper = (fn) => (g, b) => fn(g, centre(g, b), g.p.C - 10);
  const lower = (fn) => (g, b) => fn(g, centre(g, b), g.p.X);

  /* ---------------------------------------------------------------- shared parts */

  /** A descender tail whose right edge is x1, joined at the baseline. */
  const tail = (g, x1) => {
    const { S, H } = g.p;
    g.rect(x1 - S * 0.86, -tailDepth(g.p), x1, H);
  };

  /** The soft-sign bowl: from a stem whose left edge is xs to xe, top of the bowl at m. */
  const softBowl = (g, xs, xe, m) => {
    const { S, H, k } = g.p;
    const kk = Math.min(0.9, k + 0.16);
    const bw = xe - xs;
    g.rect(xs, m - H, xs + bw * 0.56, m);
    g.rect(xs, 0, xs + bw * 0.56, H);
    g.sector(xs, 0, xe, m, 3, 5, "r", "r", S, H, kk);
  };

  /** The two arms of a К to the right of a stem whose right edge is xs. */
  const kArms = (g, xs, xr, T, t) => {
    const { S } = g.p;
    const hw = hwOf(t, xr - xs, T * 0.66);
    g.stroke(xr - hw, T, xs - S * 0.42 + hw, T * 0.31, t);
    g.stroke(xs + (xr - xs) * 0.22, T * 0.5, xr - hw, 0, t);
  };

  /** The h shoulder of Ћ Ђ Һ: from a stem whose left edge is x0 over to a right stem at x1. */
  const shoulder = (g, x0, x1, top, bottom) => {
    const { S, O } = g.p;
    const depth = (top - bottom) * 0.42;
    const cy = top - depth;
    g.sector(x0, cy - (top + O - cy), x1, top + O, 0, 1.62, "r", "r");
    g.rect(x1 - S, bottom, x1, cy + 6);
  };

  /** A hook from a right stem at x1 curling left under the baseline (Ђ ђ). */
  const hookBelow = (g, x1) => {
    const { S, D, O } = g.p;
    const hr = 120;
    g.rect(x1 - S, D + hr - O - 8, x1, 10);
    g.sector(x1 - 2 * hr, D - O, x1, D + 2 * hr, 3.0, 4.0, g.p.cut, "r");
  };

  /* ---------------------------------------------------------------- drawings by height */
  // Each takes the pen, the ink width, the letter's height T (C for capitals, X for lowercase)
  // and the overshoot for that height.

  const ge = (g, w, T) => {
    const { S, H } = g.p;
    g.rect(0, 0, S, T);
    g.rect(0, T - H, w, T);
  };

  const pe = (g, w, T) => {
    const { S, H } = g.p;
    g.rect(0, 0, S, T);
    g.rect(w - S, 0, w, T);
    g.rect(0, T - H, w, T);
  };

  const i = (g, w, T, up) => {
    const { S } = g.p;
    const t = S * (up ? 0.98 : 0.93);
    g.rect(0, 0, S, T);
    g.rect(w - S, 0, w, T);
    const hw = hwOf(t, w - 2 * S, T);
    g.stroke(S * 0.3 + hw, 0, w - S * 0.3 - hw, T, t);
  };

  const el = (g, w, T, up) => {
    const { S, H } = g.p;
    const t = S * (up ? 0.98 : 0.93);
    const lx = w * 0.2;
    const hw = hwOf(t, lx, T);
    g.rect(w - S, 0, w, T);
    g.rect(lx, T - H, w, T);
    g.stroke(lx + hw, T, hw, 0, t);
  };

  const de = (g, w, T, up) => {
    const { S, H } = g.p;
    const t = S * (up ? 0.96 : 0.9);
    const pad = S * 0.6;
    const lx = pad + w * 0.18;
    const hw = hwOf(t, lx - pad, T - H);
    g.rect(w - pad - S, H, w - pad, T);
    g.rect(lx, T - H, w - pad, T);
    g.stroke(lx + hw, T, pad + hw, H, t);
    g.rect(0, 0, w, H);
    g.rect(0, -tailDepth(g.p), S * 0.86, H);
    tail(g, w);
  };

  const zhe = (g, w, T, up) => {
    const s = stem3(g.p);
    const t = s * (up ? 0.98 : 0.93);
    const cx = w / 2;
    g.rect(cx - s / 2, 0, cx + s / 2, T);
    const arms = capture(g, () => kArms(g, cx + s / 2, w, T, t));
    g.add(arms);
    g.add(mirrorX(arms, cx));
  };

  const ze = (g, w, T, up) => {
    const { S, H, cut, ap } = g.p;
    const ov = up ? g.p.OC : g.p.O;
    const m = T * 0.54;
    // Two right-facing bowls with a short spine reaching in from the left: the spine is what
    // tells З from the figure 3, which has none.
    g.sector(w * 0.08, m - H / 2, w * 0.92, T + ov, 3.0, 5.6 - ap * 0.15, "r", cut, S * 0.96, H);
    g.sector(0, -ov, w, m + H / 2, 2.4 + ap * 0.1, 5.0, cut, "r", S, H);
    g.rect(w * 0.3, m - H / 2, w * 0.62, m + H / 2);
  };

  const u = (g, w, T, up) => {
    const { S } = g.p;
    const t = S * (up ? 0.98 : 0.93);
    const xb = w * 0.24;
    const hwr = hwOf(t, w - xb, T);
    const xr = w - hwr;
    g.stroke(xr, T, xb, 0, t);
    const yj = T * 0.36;
    const xj = xb + (xr - xb) * (yj / T);
    const hwl = hwOf(t, xj, T - yj);
    g.stroke(hwl, T, xj, yj, t);
  };

  const ef = (g, w, T, up) => {
    const { S, H } = g.p;
    const s = g.p.mono ? S * (S > 130 ? 0.76 : 0.86) : S;
    const cx = w / 2;
    if (up) {
      g.rect(cx - s / 2, 0, cx + s / 2, T);
      g.ring(0, T * 0.14, w, T * 0.86, s * 0.94, H * 0.94);
    } else {
      g.rect(cx - s / 2, g.p.D, cx + s / 2, g.p.A);
      g.ring(0, -g.p.O, w, T + g.p.O, s * 0.94, H * 0.94);
    }
  };

  const tse = (g, w, T) => {
    const { S, H } = g.p;
    const xr = w - S * 0.55;
    g.rect(0, 0, S, T);
    g.rect(xr - S, 0, xr, T);
    g.rect(0, 0, w, H);
    tail(g, w);
  };

  const che = (g, w, T) => {
    const { S, H } = g.p;
    g.rect(w - S, 0, w, T);
    const yb = T * 0.36;
    const r = Math.max(S * 1.3, w * 0.3);
    g.rect(0, yb + r - 6, S, T);
    g.sector(0, yb, 2 * r, yb + 2 * r, 2.0, 3.02, "r", "r");
    g.rect(r - 4, yb, w - S * 0.5, yb + H);
  };

  const sha = (g, w, T) => {
    const { H } = g.p;
    const s = stem3(g.p);
    g.rect(0, 0, s, T);
    g.rect((w - s) / 2, 0, (w + s) / 2, T);
    g.rect(w - s, 0, w, T);
    g.rect(0, 0, w, H);
  };

  const shcha = (g, w, T) => {
    const { S, H } = g.p;
    const s = stem3(g.p);
    const ws = w - S * 0.55;
    g.rect(0, 0, s, T);
    g.rect((ws - s) / 2, 0, (ws + s) / 2, T);
    g.rect(ws - s, 0, ws, T);
    g.rect(0, 0, w, H);
    tail(g, w);
  };

  const soft = (g, w, T) => {
    const { S } = g.p;
    g.rect(0, 0, S, T);
    softBowl(g, 0, w, T * 0.56);
  };

  const hard = (g, w, T) => {
    const { S, H } = g.p;
    const xs = w * 0.26;
    g.rect(0, T - H, xs + S, T);
    g.rect(xs, 0, xs + S, T);
    softBowl(g, xs, w, T * 0.56);
  };

  const yeru = (g, w, T) => {
    const { S } = g.p;
    const s = g.p.mono ? S * (S > 130 ? 0.76 : 0.86) : S;
    const wb = w * 0.64;
    g.rect(0, 0, s, T);
    softBowl(withP(g, { S: s }), 0, wb, T * 0.56);
    g.rect(w - s, 0, w, T);
  };

  const be = (g, w, T) => {
    const { S, H } = g.p;
    g.rect(0, 0, S, T);
    g.rect(0, T - H, w * 0.9, T);
    softBowl(g, 0, w, T * 0.56);
  };

  const yu = (g, w, T, up) => {
    const { S, H } = g.p;
    const ov = up ? g.p.OC : g.p.O;
    const s = g.p.mono ? S * (S > 130 ? 0.76 : 0.86) : S;
    const x0 = w * (g.p.mono ? 0.34 : 0.3);
    const m = T / 2;
    g.rect(0, 0, s, T);
    g.rect(s * 0.5, m - H / 2, x0 + s * 0.5, m + H / 2);
    g.ring(x0, -ov, w, T + ov, s * 0.94, H * 0.94);
  };

  /** Э Є and their lowercase: the C (or c) mirrored or not, with a bar through the middle. */
  const barredC = (g, w, T, ch, mirrored) => {
    const { S, H } = g.p;
    const ink = capture(g, () => latin(ch).draw(g, w));
    g.add(mirrored ? mirrorX(ink, w / 2) : ink);
    const m = T * (T === g.p.C ? 0.5 : 0.48);
    if (mirrored) g.rect(w * 0.32, m - H / 2, w - S * 0.5, m + H / 2);
    else g.rect(S * 0.5, m - H / 2, w * 0.68, m + H / 2);
  };

  const ya = (g, w, T) => {
    const ink = capture(g, () => latin("R").draw(withP(g, { C: T }), w));
    g.add(mirrorX(ink, w / 2));
  };

  const ve = (g, w, T) => latin("B").draw(withP(g, { C: T }), w);

  /** Ђ Ћ: a T-like bar over a stem, with an h shoulder; Ђ ends in a hook under the baseline. */
  const tshe = (g, w, T, hook) => {
    const { S, H } = g.p;
    const xs = w * 0.18;
    g.rect(0, T - H, w * 0.7, T);
    g.rect(xs, 0, xs + S, T);
    shoulder(g, xs, w, T * 0.6, hook ? 10 : 0);
    if (hook) hookBelow(g, w);
  };

  /** ђ ћ: h with a bar through the ascender; ђ ends in a hook under the baseline. */
  const tsheLower = (g, w, hook) => {
    const { S, H, A, X } = g.p;
    const xs = g.p.mono ? w * 0.16 : 0;
    const yb = A - (A - X) * 0.55;
    g.rect(xs, 0, xs + S, A);
    g.rect(Math.max(0, xs - S * 0.7), yb - H / 2, xs + S * 2.6, yb + H / 2);
    shoulder(g, xs, w, X, hook ? 10 : 0);
    if (hook) hookBelow(g, w);
  };

  /** Љ љ: Л with a soft-sign bowl on its right stem. */
  const lje = (g, w, T, up) => {
    const { S, H } = g.p;
    const t = S * (up ? 0.96 : 0.9);
    const wl = w * 0.54;
    const lx = wl * 0.24;
    const hw = hwOf(t, lx, T);
    g.rect(wl - S, 0, wl, T);
    g.rect(lx, T - H, wl, T);
    g.stroke(lx + hw, T, hw, 0, t);
    softBowl(g, wl - S, w, T * 0.56);
  };

  /** Њ њ: Н whose right stem carries a soft-sign bowl. */
  const nje = (g, w, T) => {
    const { S, H } = g.p;
    const xs = w * 0.46;
    const m = T * 0.56;
    g.rect(0, 0, S, T);
    g.rect(xs, 0, xs + S, T);
    g.rect(0, m - H, xs + S, m);
    softBowl(g, xs, w, m);
  };

  const dzhe = (g, w, T) => {
    const { S, H } = g.p;
    g.rect(0, 0, S, T);
    g.rect(w - S, 0, w, T);
    g.rect(0, 0, w, H);
    g.rect(w / 2 - S * 0.43, -tailDepth(g.p), w / 2 + S * 0.43, H);
  };

  const gheUp = (g, w, T, up) => {
    const { S, H } = g.p;
    ge(g, w, T);
    g.rect(w - S * 0.9, T - H, w, T + (up ? 130 : 110));
  };

  const gheBar = (g, w, T) => {
    const { S, H } = g.p;
    ge(g, w, T);
    const y = T * 0.46;
    g.rect(0, y - H / 2, Math.min(w * 0.72, S * 2.6), y + H / 2);
  };

  /** Қ қ: К with a tail at the foot of the leg. */
  const kaTail = (g, w, T, up) => {
    const { S, H } = g.p;
    const t = S * (up ? 0.98 : 0.92);
    const wa = w - S * 0.5;
    g.rect(0, 0, S, T);
    kArms(g, S, wa, T, t);
    g.rect(wa - S * 1.2, 0, w, H);
    tail(g, w);
  };

  /** Ң ң: Н with a foot and a tail at the right stem. */
  const enTail = (g, w, T) => {
    const { S, H } = g.p;
    const xr = w - S * 0.55;
    g.rect(0, 0, S, T);
    g.rect(xr - S, 0, xr, T);
    g.rect(0, T * 0.48 - H / 2, xr, T * 0.48 + H / 2);
    g.rect(xr - S, 0, w, H);
    tail(g, w);
  };

  const obar = (g, w, T, up) => {
    const { S, H } = g.p;
    const ov = up ? g.p.OC : g.p.O;
    g.ring(0, -ov, w, T + ov);
    g.rect(S * 0.5, T / 2 - H / 2, w - S * 0.5, T / 2 + H / 2);
  };

  /** ү: a v on a stem that drops to the descender. */
  const ue = (g, w, bar) => {
    const { S, H, X, D } = g.p;
    const t = S * 0.93;
    const cx = w / 2;
    const yj = X * 0.06;
    const hw = hwOf(t, cx, X - yj);
    g.stroke(hw, X, cx, yj, t);
    g.stroke(w - hw, X, cx, yj, t);
    g.rect(cx - S / 2, D, cx + S / 2, yj + S * 0.6);
    if (bar) g.rect(cx - w * 0.3, D * 0.45 - H / 2, cx + w * 0.3, D * 0.45 + H / 2);
  };

  const ha = (g, w, T) => {
    const { S } = g.p;
    g.rect(0, 0, S, T);
    shoulder(g, 0, w, T * 0.62, 0);
  };

  /** ә Ә: the e turned over; the capital is the same construction at cap height. */
  const schwa = (g, w, T, up) => {
    const pp = up ? withP(g, { X: T, O: g.p.OC }) : g;
    const ink = capture(g, () => latin("e").draw(pp, w));
    g.add(mirrorY(mirrorX(ink, w / 2), T / 2));
  };

  const dotlessI = (g) => {
    const { S, H, X } = g.p;
    if (!g.p.mono) {
      g.rect(0, 0, S, X);
      g.stemX = S / 2;
      return;
    }
    const x = 230;
    g.rect(x, 0, x + S, X);
    g.rect(x - S * 1.5, X - H, x + S, X);
    g.rect(x - S * 1.5 - 30, 0, x + S * 2.5 + 30, H);
    g.stemX = x + S / 2;
  };

  /* ---------------------------------------------------------------- the table */

  const C = p.C;
  const X = p.X;
  const out = [];
  const add = (name, unicode, sides, width, draw, accent) => out.push({ name, unicode, sides, width, draw, accent });
  /** A letter whose form is the Latin one: same drawing, its own code point. */
  const same = (name, unicode, ch, accent) => {
    const l = latin(ch);
    add(name, unicode, l.sides, l.width, l.draw, accent);
  };
  /** A capital and its lowercase drawn by one construction at their two heights. */
  const pair = (nameU, cu, nameL, cl, sides, widthU, widthL, draw) => {
    add(nameU, cu, sides, widthU, (g, w) => draw(g, w, C, true));
    add(nameL, cl, sides, widthL, (g, w) => draw(g, w, X, false));
  };

  // Russian and the letters every Cyrillic alphabet shares.
  same("uni0410", "А", "A");
  same("uni0430", "а", "a");
  add("uni0411", "Б", "SR", 486, (g, w) => be(g, w, C));
  // б is not the capital's shape at x-height: a bowl with a flag-topped stem rising to the
  // ascender, flat on top so it never reads as a 6.
  add("uni0431", "б", "SR", 456, (g, w) => {
    const { S, H, X: x, A, O } = g.p;
    g.ring(0, -O, w, x + O);
    g.rect(0, x * 0.45, S, A);
    g.rect(0, A - H, w * 0.86, A);
  });
  same("uni0412", "В", "B");
  add("uni0432", "в", "SR", 418, (g, w) => ve(g, w, X));
  pair("uni0413", "Г", "uni0433", "г", "SS", 400, 330, ge);
  pair("uni0414", "Д", "uni0434", "д", "SS", 600, 470, de);
  same("uni0415", "Е", "E");
  same("uni0435", "е", "e");
  same("uni0401", "Ё", "E", upper(diaeresis));
  same("uni0451", "ё", "e", lower(diaeresis));
  pair("uni0416", "Ж", "uni0436", "ж", "DD", 800, 640, zhe);
  pair("uni0417", "З", "uni0437", "з", "RR", 474, 382, ze);
  pair("uni0418", "И", "uni0438", "и", "SS", 530, 420, i);
  add("uni0419", "Й", "SS", 530, (g, w) => i(g, w, C, true), upper(breve));
  add("uni0439", "й", "SS", 420, (g, w) => i(g, w, X, false), lower(breve));
  same("uni041A", "К", "K");
  add("uni043A", "к", "SD", 404, (g, w) => {
    g.rect(0, 0, g.p.S, X);
    kArms(g, g.p.S, w, X, g.p.S * 0.92);
  });
  pair("uni041B", "Л", "uni043B", "л", "DS", 530, 420, el);
  same("uni041C", "М", "M");
  add("uni043C", "м", "SS", 520, (g, w) => latin("M").draw(withP(g, { C: X }), w));
  same("uni041D", "Н", "H");
  add("uni043D", "н", "SS", 410, (g, w) => latin("H").draw(withP(g, { C: X }), w));
  same("uni041E", "О", "O");
  same("uni043E", "о", "o");
  pair("uni041F", "П", "uni043F", "п", "SS", 512, 410, pe);
  same("uni0420", "Р", "P");
  same("uni0440", "р", "p");
  same("uni0421", "С", "C");
  same("uni0441", "с", "c");
  same("uni0422", "Т", "T");
  add("uni0442", "т", "NN", 410, (g, w) => latin("T").draw(withP(g, { C: X }), w));
  add("uni0423", "У", "DD", 560, (g, w) => u(g, w, C, true));
  same("uni0443", "у", "y");
  pair("uni0424", "Ф", "uni0444", "ф", "RR", 640, 600, ef);
  same("uni0425", "Х", "X");
  same("uni0445", "х", "x");
  pair("uni0426", "Ц", "uni0446", "ц", "SS", 540, 432, tse);
  pair("uni0427", "Ч", "uni0447", "ч", "SS", 480, 390, che);
  pair("uni0428", "Ш", "uni0448", "ш", "SS", 740, 610, sha);
  pair("uni0429", "Щ", "uni0449", "щ", "SS", 770, 640, shcha);
  pair("uni042A", "Ъ", "uni044A", "ъ", "SR", 560, 470, hard);
  pair("uni042B", "Ы", "uni044B", "ы", "SS", 660, 560, yeru);
  pair("uni042C", "Ь", "uni044C", "ь", "SR", 470, 390, soft);
  add("uni042D", "Э", "RR", 548, (g, w) => barredC(g, w, C, "C", true));
  add("uni044D", "э", "RR", 404, (g, w) => barredC(g, w, X, "c", true));
  pair("uni042E", "Ю", "uni044E", "ю", "SR", 790, 640, yu);
  add("uni042F", "Я", "DS", 496, (g, w) => ya(g, w, C));
  add("uni044F", "я", "DS", 410, (g, w) => ya(g, w, X));

  // Ukrainian and Belarusian.
  add("uni0404", "Є", "RR", 548, (g, w) => barredC(g, w, C, "C", false));
  add("uni0454", "є", "RR", 404, (g, w) => barredC(g, w, X, "c", false));
  same("uni0406", "І", "I");
  same("uni0456", "і", "i");
  same("uni0407", "Ї", "I", (g, b) => {
    if (!g.p.mono && !g.p.serifI) g.stemX = g.p.S / 2;
    diaeresis(g, centre(g, b), g.p.C - 10);
  });
  add("uni0457", "ї", "SS", p.S, dotlessI, lower(diaeresis));
  pair("uni0490", "Ґ", "uni0491", "ґ", "SS", 400, 330, gheUp);
  add("uni040E", "Ў", "DD", 560, (g, w) => u(g, w, C, true), upper(breve));
  same("uni045E", "ў", "y", lower(breve));

  // Serbian and Macedonian.
  add("uni0402", "Ђ", "SS", 620, (g, w) => tshe(g, w, C, true));
  add("uni0452", "ђ", "SS", 430, (g, w) => tsheLower(g, w, true));
  add("uni040B", "Ћ", "SS", 620, (g, w) => tshe(g, w, C, false));
  add("uni045B", "ћ", "SS", 430, (g, w) => tsheLower(g, w, false));
  same("uni0408", "Ј", "J");
  same("uni0458", "ј", "j");
  pair("uni0409", "Љ", "uni0459", "љ", "DR", 790, 640, lje);
  pair("uni040A", "Њ", "uni045A", "њ", "SR", 760, 620, nje);
  pair("uni040F", "Џ", "uni045F", "џ", "SS", 512, 410, dzhe);
  add("uni0403", "Ѓ", "SS", 400, (g, w) => ge(g, w, C), upper(acute));
  add("uni0453", "ѓ", "SS", 330, (g, w) => ge(g, w, X), lower(acute));
  same("uni040C", "Ќ", "K", upper(acute));
  add("uni045C", "ќ", "SD", 404, (g, w) => {
    g.rect(0, 0, g.p.S, X);
    kArms(g, g.p.S, w, X, g.p.S * 0.92);
  }, (g, b) => acute(g, (b.x0 + b.x1) / 2, g.p.X));
  same("uni0405", "Ѕ", "S");
  same("uni0455", "ѕ", "s");

  // Kazakh.
  pair("uni04D8", "Ә", "uni04D9", "ә", "RR", 560, latin("e").width, schwa);
  pair("uni0492", "Ғ", "uni0493", "ғ", "SS", 430, 350, gheBar);
  pair("uni049A", "Қ", "uni049B", "қ", "SD", 560, 432, kaTail);
  pair("uni04A2", "Ң", "uni04A3", "ң", "SS", 548, 440, enTail);
  pair("uni04E8", "Ө", "uni04E9", "ө", "RR", 610, 456, obar);
  same("uni04AE", "Ү", "Y");
  add("uni04AF", "ү", "DD", 446, (g, w) => ue(g, w, false));
  add("uni04B0", "Ұ", "DD", 556, (g, w) => {
    latin("Y").draw(g, w);
    const { H } = g.p;
    const y = C * 0.3;
    g.rect(w / 2 - w * 0.26, y - H / 2, w / 2 + w * 0.26, y + H / 2);
  });
  add("uni04B1", "ұ", "DD", 446, (g, w) => ue(g, w, true));
  add("uni04BA", "Һ", "SS", 500, (g, w) => ha(g, w, C));
  same("uni04BB", "һ", "h");


  return out;
}

/** Kerning pairs this module adds: [left, right, units]. */
export const kerning = [
  ["Г", "а", -60], ["Г", "о", -60], ["Г", "е", -60], ["Г", "с", -60], ["Г", "у", -40], ["Г", "д", -40], ["Г", "л", -40],
  ["Г", ".", -80], ["Г", ",", -80], ["Г", "А", -50], ["Г", "Д", -36], ["Г", "Л", -36],
  ["Т", "а", -60], ["Т", "о", -60], ["Т", "е", -60], ["Т", "с", -60], ["Т", "у", -40], ["Т", ".", -80], ["Т", ",", -80],
  ["Т", "А", -50], ["А", "Т", -50], ["А", "У", -50], ["У", "А", -50], ["А", "Ч", -40], ["А", "Ъ", -40],
  ["У", "а", -50], ["У", "о", -50], ["У", "е", -50], ["У", ".", -70], ["У", ",", -70],
  ["Ф", "А", -24], ["А", "Ф", -24], ["Р", "А", -40], ["Р", ".", -80], ["Р", ",", -80],
  ["г", ".", -50], ["г", ",", -50], ["т", ".", -30], ["т", ",", -30],
  ["Ь", "Т", -40], ["Ъ", "Т", -40], ["ь", "т", -24], ["Л", "Т", -20],
];
