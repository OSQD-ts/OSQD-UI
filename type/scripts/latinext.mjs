// The "latinext" glyph module: more languages in the scripts the font already has, and the
// phonetic alphabet.
//
//   Cyrillic for Tatar, Bashkir, Tajik, Chuvash and Moldovan (Җ Ҙ Ҫ Ҡ Ӣ Ӯ Ҳ Ҷ Ӑ Ӗ Ӳ Ӂ), drawn on
//     the cyrillic module's letters: a tail, a descender or a mark added to Ж З С К И У Х Ч А Е.
//   African Latin (Hausa, Yoruba, Igbo, Ewe, Akan, Fula, Lingala …): the hooked and open letters
//     Ɛ Ɔ Ɓ Ɗ Ƙ Ƴ Ɲ Ʒ Ǝ Ɣ Ʋ Ƒ Ɩ Ɖ and Ṣ ṣ; Ẹ Ọ Ị Ụ come from the latin module.
//   The IPA letters a transcription meets most, the length and stress marks, and ʰ ʲ ʷ.
//   The combining marks U+0300–U+0328 most used with them.
//
// Combining marks: without mark attachment (no GPOS here) a browser draws a combining mark where
// the font put it, so each is a zero-width glyph whose ink sits back over the previous letter's
// middle at x-height. That reads right over a lowercase letter of average width and is the
// fallback only: precomposed letters (é, ẹ, ṣ …) are always the better choice. In the monospaced
// faces every glyph keeps the one advance (the fonts test holds them to it), so there a combining
// mark is a spacing mark in a cell of its own.
//
// Most letters reuse a drawing that already exists — the base table's, or the latin, cyrillic or
// greek module's — moved, mirrored, turned, set at x-height (small capitals), or with a hook or a
// bar added, so they inherit every family's numbers, weight and width.

import { glyphs as cyrillicGlyphs } from "./cyrillic.mjs";
import { glyphs as greekGlyphs } from "./greek.mjs";
import { glyphs as latinGlyphs } from "./latin.mjs";

export const id = "latinext";

const nameOf = (ch) => `uni${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;

/** Horizontal half-width of a diagonal stroke of thickness t over (dx, dy), as in glyphs.mjs. */
const hwOf = (t, dx, dy) => (t / 2) * (Math.hypot(dx, dy) / Math.abs(dy || 1));

/** The pen with some of the font's numbers replaced: a capital drawn at x-height, say. */
const withP = (g, over) => Object.assign(Object.create(g), { p: { ...g.p, ...over } });

/** Runs `fn` on the pen, takes what it drew back out, and forgets any ink box it remembered. */
function capture(g, fn) {
  const n = g.contours.length;
  const base = g.base;
  fn();
  g.base = base;
  return g.contours.splice(n);
}

/* ------------------------------------------------------------------ the letters to draw on */

/** Every drawing this module may reuse, by character: the base table and the other modules. */
const library = new WeakMap();
function lib(api) {
  let m = library.get(api);
  if (m) return m;
  m = new Map();
  for (const [ch, [sides, width, draw]] of Object.entries(api.defs)) m.set(ch, { sides, width: width || api.p.S, draw });
  for (const mod of [latinGlyphs, cyrillicGlyphs, greekGlyphs]) for (const s of mod(api)) m.set(s.unicode, s);
  library.set(api, m);
  return m;
}

export function glyphs(api) {
  const { p } = api;
  const { bbox, transform, mirrorX, mirrorY } = api.geom;
  const L = lib(api);
  const out = [];
  const add = (ch, sides, width, draw, accent) => out.push({ name: nameOf(ch), unicode: ch, sides, width, draw, accent });

  /** Draws another glyph's drawing (and its own accent) into g with ink width w; returns the ink. */
  const put = (g, ch, w) => {
    const s = L.get(ch);
    if (!s) throw new Error(`latinext: nothing to draw ${ch} on`);
    return capture(g, () => {
      s.draw(g, w);
      if (s.accent) {
        const b0 = g.base ?? bbox(g.contours);
        g.mark();
        s.accent(g, b0);
      }
    });
  };
  /** A glyph as another glyph's drawing plus something: same sides and width as the source. */
  const on = (ch, src, extra, { width, sides, accent } = {}) => {
    const s = L.get(src);
    if (!s) throw new Error(`latinext: nothing to draw ${ch} on (${src})`);
    add(
      ch,
      sides ?? s.sides,
      width ?? s.width,
      (g, w) => {
        const ink = put(g, src, w);
        g.add(ink);
        if (extra) extra(g, w, bbox(ink), ink);
      },
      accent,
    );
  };
  /** Ink turned half round about the x-height's middle: ɐ ɥ ɯ ɹ ʌ ʍ ʎ. */
  const turned = (ink, b, mid = p.X / 2) => transform(ink, ([x, y]) => [b.x0 + b.x1 - x, 2 * mid - y]);
  const turn = (ch, src, { width, sides, mid } = {}) => {
    const s = L.get(src);
    add(ch, sides ?? [...s.sides].reverse().join(""), width ?? s.width, (g, w) => {
      const ink = put(g, src, w);
      g.add(turned(ink, bbox(ink), mid ?? g.p.X / 2));
    });
  };
  const reversed = (ch, src) => {
    const s = L.get(src);
    add(ch, [...s.sides].reverse().join(""), s.width, (g, w) => {
      const ink = put(g, src, w);
      const b = bbox(ink);
      g.add(mirrorX(ink, (b.x0 + b.x1) / 2));
    });
  };
  /** A capital at x-height, narrower: the IPA small capitals ɢ ɪ ɴ ʀ ʏ ʙ ʜ ʟ. */
  const smallCap = (ch, src, f = 0.84) => {
    const s = L.get(src);
    add(ch, s.sides, Math.round(s.width * f), (g, w) => {
      const sp = withP(g, { C: g.p.X, OC: g.p.O });
      g.add(capture(sp, () => s.draw(sp, w)));
    });
  };

  /* ---------------------------------------------------------------- marks */

  const markWidth = (g) => 66 + g.p.S * 0.52;
  /** A ^ (or v) with level-cut feet: the latin module's circumflex and caron. */
  const chevron = (g, cx, y0, h, a, t, down = false) => {
    const ht = (t * Math.hypot(a, h)) / h;
    const yt = y0 + h;
    const xl = Math.min(cx - 1, cx - a - ht / 2 + h * (a / h));
    const yi = y0 + Math.max(0, (a - ht / 2) * (h / a));
    let pts = [
      [cx - a - ht / 2, y0],
      [xl, yt],
      [2 * cx - xl, yt],
      [cx + a + ht / 2, y0],
      [cx + a - ht / 2, y0],
      [cx, Math.min(yi, yt - 1)],
      [cx - a + ht / 2, y0],
    ];
    if (down) pts = pts.map(([x, y]) => [x, 2 * y0 + h - y]);
    g.poly(pts);
  };
  const M = {
    acute: (g, cx, y0) => g.bar(cx - g.p.S * 0.55, y0, cx + g.p.S * 0.95, y0 + 150, g.p.S * 0.9),
    grave: (g, cx, y0) => g.bar(cx + g.p.S * 0.55, y0, cx - g.p.S * 0.95, y0 + 150, g.p.S * 0.9),
    dblacute: (g, cx, y0) => {
      const { S } = g.p;
      const off = S * 0.8 + 6;
      for (const x of [cx - off + S * 0.2, cx + off + S * 0.2]) g.bar(x - S * 0.45, y0, x + S * 0.55, y0 + 150, S * 0.8);
    },
    circumflex: (g, cx, y0) => chevron(g, cx, y0, 128, markWidth(g), g.p.S * 0.82),
    caron: (g, cx, y0) => chevron(g, cx, y0, 128, markWidth(g), g.p.S * 0.82, true),
    breve: (g, cx, y0) => {
      const a = markWidth(g);
      g.sector(cx - a, y0, cx + a, y0 + 220, 2, 4, "h", "h", g.p.S * 0.78, g.p.H * 0.85, 0.5523);
    },
    macron: (g, cx, y0) => {
      const a = markWidth(g) + 6;
      g.rect(cx - a, y0 + 18, cx + a, y0 + 18 + g.p.H * 0.95);
    },
    tilde: (g, cx, y0) => tildeAt(g, cx, y0 + 48, markWidth(g) + 14),
    ring: (g, cx, y0) => {
      const { S } = g.p;
      const sx = Math.min(S * 0.55, 26 + S * 0.28);
      const r = Math.max(sx + 30, Math.min(75, sx + 40));
      g.ring(cx - r, y0, cx + r, y0 + 2 * r, sx, sx * 0.92, 0.5523);
    },
    dotabove: (g, cx, y0) => g.dot(cx, y0 + 30 + g.p.S * 0.56, g.p.S * 1.12),
    dieresis: (g, cx, y0) => {
      const { S } = g.p;
      const dx = Math.max(S * 0.56 + 44, 92);
      g.dot(cx - dx, y0 + 30 + S * 0.56, S * 1.12);
      g.dot(cx + dx, y0 + 30 + S * 0.56, S * 1.12);
    },
    dotbelow: (g, cx) => g.dot(cx, -(64 + g.p.S * 0.56)),
    commabelow: (g, cx) => {
      const u = Math.min(g.p.S, 96) * 0.72;
      const d = u * 1.12;
      const cy = -58 - d / 2;
      g.dot(cx, cy, d);
      g.poly([
        [cx - u * 0.5, cy - u * 0.2],
        [cx + u * 0.56, cy - u * 0.2],
        [cx - u * 0.42, cy - u * 2.0],
        [cx - u * 0.86, cy - u * 2.0],
      ]);
    },
    cedilla: (g, cx) => {
      const { S, H } = g.p;
      const t = S * 0.74;
      const r = 66 + S * 0.15;
      const top = -86;
      const bot = top - 2 * (54 + S * 0.17);
      g.rect(cx - t / 2, top - 6, cx + t / 2, 16);
      g.sector(cx - r, bot, cx + r, top + H * 0.4, 3.0, 5.0, "h", "h", t, H * 0.78, 0.5523);
    },
    ogonek: (g, cx) => api.accents.ogonek(g, cx + 40),
  };
  /** A sine wave stroked to the pen's horizontal weight: the tilde, and the bar of ɫ. */
  function tildeAt(g, cx, yc, a, amp = Math.max(14, (96 - g.p.H * 0.95) / 2)) {
    const t = g.p.H * 0.95;
    const n = 28;
    const top = [];
    const bot = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = cx - a + 2 * a * u;
      const ph = Math.PI * 2 * u;
      const y = yc + amp * Math.sin(ph);
      const dy = amp * Math.cos(ph) * (Math.PI / a);
      const nl = Math.hypot(1, dy);
      top.push([x - (dy / nl) * (t / 2), y + (1 / nl) * (t / 2)]);
      bot.push([x + (dy / nl) * (t / 2), y - (1 / nl) * (t / 2)]);
    }
    g.poly([...top, ...bot.reverse()]);
  }
  /** The cyrillic module's breve, deeper than the Latin one, for Ӑ Ӗ Ӂ. */
  const cyrBreve = (g, cx, top) => {
    const { S, H } = g.p;
    const r = 112 + S * 0.25;
    g.sector(cx - r, top + 50, cx + r, top + 50 + 184, 2.06, 3.94, "h", "h", S * 0.82, H * 0.86);
  };
  const centre = (g, b) => g.stemX ?? (b.x0 + b.x1) / 2;
  /** An accent for `on`: a mark above, over a capital (C) or a lowercase letter (X). */
  const above = (mark, upper) => (g, b) => {
    const cx = centre(g, b);
    if (mark === "cyrBreve") cyrBreve(g, cx, upper ? g.p.C - 10 : g.p.X);
    else M[mark](g, cx, upper ? g.p.C + 30 : g.p.X + 40);
  };

  /* ---------------------------------------------------------------- shared parts */

  /** A descender tail at a right stem whose right edge is x1 (Җ Ҳ Ҷ), as the cyrillic module draws Қ Ң. */
  const tail = (g, x1) => {
    const { S, H, D } = g.p;
    g.rect(x1 - S * 0.86, -Math.round(Math.min(-D * 0.7, 150)), x1, H);
  };
  /** A stem top that curls right, as the f's does: the stem's left edge at x, its top at `top`. */
  const hookRight = (g, x, top) => {
    const { S, O } = g.p;
    const r = Math.max(S * 1.08, 104 * (S / 84) ** 0.3);
    g.sector(x, top + O - 2 * r, x + 2 * r, top + O, 0.5, 2.0, g.p.cut, "r");
    return top + O - r + 6;
  };
  /** A corner that runs on into a hook curling left and down (Ɓ Ɗ): the stem's right edge at x. */
  const hookLeft = (g, x, top) => {
    const { S, H, O } = g.p;
    const r = 70 + S * 0.75;
    g.sector(x - 2 * r, top + O - 2 * r, x, top + O, 0.0, 2.35, "r", g.p.cut, S * 0.9, H);
  };
  /** A stem running below the baseline into a hook that curls left, as the j's does. */
  const hookDown = (g, x) => {
    const { S, D, O } = g.p;
    const hr = 140;
    g.rect(x, D + hr - O - 8, x + S, 12);
    g.sector(x - 2 * hr + S, D - O, x + S, D + 2 * hr, 2.6, 4.0, g.p.cut, "r");
  };
  /** Two diagonals from the top corners (0, T) and (w, T) down to (cx, m). */
  const vShapeTo = (g, w, T, cx, m, t) => {
    const hw = hwOf(t, cx, T - m);
    g.stroke(hw, T, cx, m, t);
    g.stroke(w - hw, T, cx, m, t);
  };
  /** The IPA retroflex hook: a stem continued below the baseline, curling right. */
  const retroflex = (g, x) => {
    const { S, D, O } = g.p;
    const hr = 116;
    g.rect(x, D + hr - O - 8, x + S, 12);
    g.sector(x, D - O, x + 2 * hr, D + 2 * hr, 2.0, 3.42, "r", g.p.cut);
  };
  /** The ezh, top at T and bottom at B: a flat top, a diagonal, and the lower bowl of a 3. */
  const ezh = (g, w, T, B) => {
    const { S, H, O, cut } = g.p;
    const m = B + (T - B) * 0.52;
    const t = S * 0.98;
    g.rect(w * 0.06, T - H, w * 0.94, T);
    const hw = hwOf(t, w * 0.5, T - m);
    g.stroke(w * 0.94 - hw, T - H * 0.6, w * 0.4, m - H * 0.15, t);
    g.sector(0, B - O, w, m + H / 2, 2.4, 5.0, cut, "r", S, H);
  };

  /* ---------------------------------------------------------------- Cyrillic */

  const tailAt = (g, _w, b) => tail(g, b.x1);
  on("Җ", "Ж", tailAt);
  on("җ", "ж", tailAt);
  on("Ҳ", "Х", tailAt);
  on("ҳ", "х", tailAt);
  on("Ҷ", "Ч", tailAt);
  on("ҷ", "ч", tailAt);
  const cedillaAt = (g, _w, b) => M.cedilla(g, (b.x0 + b.x1) / 2);
  on("Ҙ", "З", cedillaAt);
  on("ҙ", "з", cedillaAt);
  on("Ҫ", "С", cedillaAt);
  on("ҫ", "с", cedillaAt);
  // Bashkir qa: the К with a bar running left from the top of its stem.
  const qaBar = (top) => (g, w, b) => g.rect(b.x0 - w * 0.34, top(g) - g.p.H, b.x0 + g.p.S, top(g));
  on("Ҡ", "К", qaBar((g) => g.p.C), { width: 600 });
  on("ҡ", "к", qaBar((g) => g.p.X), { width: 480 });
  on("Ӣ", "И", null, { accent: above("macron", true) });
  on("ӣ", "и", null, { accent: above("macron", false) });
  on("Ӯ", "У", null, { accent: above("macron", true) });
  on("ӯ", "у", null, { accent: above("macron", false) });
  on("Ӳ", "У", null, { accent: above("dblacute", true) });
  on("ӳ", "у", null, { accent: above("dblacute", false) });
  on("Ӑ", "А", null, { accent: above("cyrBreve", true) });
  on("ӑ", "а", null, { accent: above("cyrBreve", false) });
  on("Ӗ", "Е", null, { accent: above("cyrBreve", true) });
  on("ӗ", "е", null, { accent: above("cyrBreve", false) });
  on("Ӂ", "Ж", null, { accent: above("cyrBreve", true) });
  on("ӂ", "ж", null, { accent: above("cyrBreve", false) });

  /* ---------------------------------------------------------------- African Latin */

  // Open e and open o: the Greek epsilon (a cap at cap height), the C and c turned to face left.
  on("ɛ", "ε");
  add("Ɛ", "RR", 500, (g, w) => {
    const sp = withP(g, { X: g.p.C, O: g.p.OC });
    g.add(capture(sp, () => L.get("ε").draw(sp, w)));
  });
  reversed("Ɔ", "C");
  reversed("ɔ", "c");
  // Hooked letters: a stem top that curls (Ɓ ɓ Ɗ ɗ ƙ ɦ ɠ), or an arm that does (Ƙ Ƴ ƴ).
  add("Ɓ", "SR", 486, (g, w) => {
    // The top-left corner runs on into a hook that curls to the left.
    hookLeft(g, g.p.S, g.p.C);
    g.add(capture(g, () => L.get("B").draw(g, w)));
  });
  add("Ɗ", "SR", 540, (g, w) => {
    // The top-left corner runs on into a hook that curls to the left.
    hookLeft(g, g.p.S, g.p.C);
    g.add(capture(g, () => L.get("D").draw(g, w)));
  });
  const stemShort = (src, x) => (g, w) => {
    // The letter drawn with its ascender stopped short, then a hook on the stem's top.
    const top = hookRight(g, x(g, w), g.p.A);
    const sp = withP(g, { A: top });
    g.add(capture(sp, () => L.get(src).draw(sp, w)));
  };
  add("ɓ", "SR", 440, stemShort("b", () => 0));
  add("ɦ", "SS", 410, stemShort("h", () => 0));
  add("ƙ", "SD", 404, stemShort("k", () => 0));
  add("ɗ", "RS", 440, (g, w) => {
    const { S } = g.p;
    const top = hookRight(g, w - S, g.p.A);
    const sp = withP(g, { A: top });
    g.add(capture(sp, () => L.get("d").draw(sp, w)));
  });
  /** An arm whose top end, centred at (xe, top), runs on up, over and down to the right. */
  const armHook = (g, xe, top) => {
    const { S, H } = g.p;
    const r = 58 + S * 0.38;
    const x0 = xe - S * 0.45;
    g.sector(x0, top - r, x0 + 2 * r, top + r, -0.3, 2.0, "r", g.p.cut, S * 0.9, H);
  };
  // The arm ends where glyphs.mjs draws it: x = w − hw at the top.
  on("Ƙ", "K", (g, w) => armHook(g, w - hwOf(g.p.S * 0.98, w - g.p.S, g.p.C * 0.7), g.p.C));
  on("Ƴ", "Y", (g, w) => armHook(g, w - hwOf(g.p.S * 0.98, w / 2, g.p.C * 0.56), g.p.C));
  on("ƴ", "y", (g, w) => armHook(g, w - hwOf(g.p.S * 0.93, w * 0.47, g.p.X), g.p.X));
  // Ɲ ɲ: the left stem runs on below the baseline into a j's hook.
  on("Ɲ", "N", (g, _w, b) => hookDown(g, b.x0));
  on("ɲ", "n", (g, _w, b) => hookDown(g, b.x0));
  add("Ʒ", "RR", 470, (g, w) => ezh(g, w, g.p.C, 0));
  add("ʒ", "RR", 400, (g, w) => ezh(g, w, g.p.X, g.p.D));
  reversed("Ǝ", "E");
  turn("ǝ", "e");
  // Latin gamma: two diagonals meeting low, closed by a loop — not the Greek γ's stem, which
  // beside Latin letters reads as a y. The capital stands on the baseline.
  const gammaLoop = (g, w, T, B) => {
    const { S, H, O } = g.p;
    const t = S * 0.93;
    const cx = w / 2;
    const m = B + (T - B) * 0.34;
    vShapeTo(g, w, T, cx, m, t);
    const r = Math.max(w * 0.18, S * 1.05);
    g.ring(cx - r, B - O, cx + r, m + H * 0.7, S * 0.86, H * 0.86, 0.5523);
  };
  add("ɣ", "DD", 446, (g, w) => gammaLoop(g, w, g.p.X, g.p.D));
  add("Ɣ", "DD", 560, (g, w) => gammaLoop(g, w, g.p.C, 0));
  // Ʋ ʋ: a cup whose right arm runs up past the letter's top and curls over to the left.
  const vHooked = (g, w, T, O) => {
    const { S, H } = g.p;
    const r = w / 2;
    const rh = 60 + S * 0.42;
    const cy = T + rh * 0.35 - rh;
    g.rect(0, r - O - 6, S, T);
    g.rect(w - S, r - O - 6, w, cy + 6);
    g.sector(0, -O, w, 2 * r - O, 2, 4);
    g.sector(w - 2 * rh, cy - rh, w, cy + rh, 0.0, 1.9, "r", g.p.cut, S * 0.92, H);
  };
  add("ʋ", "SS", 430, (g, w) => vHooked(g, w, g.p.X, g.p.O));
  add("Ʋ", "SS", 514, (g, w) => vHooked(g, w, g.p.C, g.p.OC));
  // Ƒ ƒ: the stem runs on below the baseline into a j's hook.
  on("ƒ", "f", (g, w) => hookDown(g, w * 0.22));
  on("Ƒ", "F", (g, _w, b) => hookDown(g, b.x0));
  on("ɩ", "ι");
  add("Ɩ", "SN", 260, (g, w) => {
    const sp = withP(g, { X: g.p.C });
    g.add(capture(sp, () => L.get("ι").draw(sp, w)));
  });
  // Ɖ: the D with a bar, as Đ; ɖ: the d's stem on into a retroflex hook.
  on("Ɖ", "D", (g, _w, b) => {
    const { C, H, S } = g.p;
    g.rect(b.x0 - 70, C * 0.48 - H / 2, b.x0 + S + 130, C * 0.48 + H / 2);
  });
  on("ɖ", "d", (g, w) => retroflex(g, w - g.p.S));
  on("Ṣ", "S", (g, _w, b) => M.dotbelow(g, (b.x0 + b.x1) / 2));
  on("ṣ", "s", (g, _w, b) => M.dotbelow(g, (b.x0 + b.x1) / 2));

  /* ---------------------------------------------------------------- IPA */

  turn("ɐ", "a");
  add("ɑ", "RS", 440, (g, w) => {
    const { S, X, O } = g.p;
    g.ring(0, -O, w, X + O);
    g.rect(w - S, 0, w, X + O);
  });
  add("ɒ", "SR", 440, (g, w) => {
    const { S, X, O } = g.p;
    g.ring(0, -O, w, X + O);
    g.rect(0, -O, S, X);
  });
  // ɕ: the c's lower terminal closes into a small loop inside the opening. A curl hanging below
  // the baseline would read as the cedilla of ç.
  on("ɕ", "c", (g, w) => {
    const { S, H, X, O } = g.p;
    // Bigger than the stroke grows, so the loop keeps a hole at the heavy weights.
    const rx = Math.max(w * 0.22, S * 1.4);
    g.ring(w * 0.96 - 2 * rx, -O, w * 0.96, Math.max(X * 0.42, S * 2.3), S * 0.7, H * 0.72, 0.5523);
  });
  reversed("ɘ", "e");
  add("ɚ", "RR", 520, (g, w) => {
    const ink = capture(g, () => L.get("ə").draw(g, w * 0.82));
    g.add(ink);
    const b = bbox(ink);
    const { S, X, O } = g.p;
    g.sector(b.x1 - S * 0.9, X * 0.46, b.x1 + 130, X + O, 0.55, 1.95, g.p.cut, "r", S * 0.86, g.p.H * 0.9);
  });
  add("ɜ", "RR", 392, (g, w) => {
    const ink = capture(g, () => L.get("ε").draw(g, w));
    const b = bbox(ink);
    g.add(mirrorX(ink, (b.x0 + b.x1) / 2));
  });
  // ɟ: a dotless j with a bar across its stem.
  add("ɟ", "TS", 300, (g, w) => {
    const { S, X, H } = g.p;
    const x = g.p.mono ? w * 0.62 : 150;
    const ink = capture(g, () => L.get("j").draw(g, w));
    // The j's dot is the ink above the x-height.
    g.add(ink.filter((c) => bbox([c]).y0 < X));
    g.rect(x - 110, X * 0.5 - H / 2, x + S + 80, X * 0.5 + H / 2);
  });
  add("ɠ", "RS", 470, (g, w) => {
    const { S } = g.p;
    const top = hookRight(g, w - S, g.p.X + 170);
    g.add(capture(g, () => L.get("g").draw(g, w)));
    g.rect(w - S, g.p.X - 20, w, top);
  });
  on("ɡ", "g");
  smallCap("ɢ", "G");
  add("ɤ", "DD", 446, (g, w) => {
    const { S, X, H } = g.p;
    const t = S * 0.9;
    const cx = w / 2;
    const yb = X * 0.34;
    const hw = hwOf(t, cx, X - yb);
    g.stroke(hw, X, cx, yb, t);
    g.stroke(w - hw, X, cx, yb, t);
    const r = Math.max(70, S * 0.95);
    g.ring(cx - r, -g.p.O, cx + r, yb + H * 0.6, S * 0.82, H * 0.86, 0.5523);
  });
  turn("ɥ", "h");
  add("ɨ", "SS", 300, (g, w) => {
    const { S, X, H } = g.p;
    const ink = capture(g, () => L.get("ı").draw(g, w));
    g.add(ink);
    const b = bbox(ink);
    const cx = (b.x0 + b.x1) / 2;
    const half = Math.max(S * 1.3, 120);
    g.rect(cx - half, X * 0.5 - H / 2, cx + half, X * 0.5 + H / 2);
  });
  add("ɪ", "SS", 300, (g, w) => {
    const { S, X, H } = g.p;
    const half = g.p.mono ? w * 0.36 : S * 1.65;
    const cx = g.p.mono ? w / 2 : half;
    g.rect(cx - S / 2, 0, cx + S / 2, X);
    g.rect(cx - half, X - H, cx + half, X);
    g.rect(cx - half, 0, cx + half, H);
  });
  /** A plain l stem, positioned as the l's own (its tail in Clear left off: these letters add their own). */
  const lStem = (g, w, bottom = 0) => {
    const { S, A } = g.p;
    const x = g.p.mono ? w * 0.42 : 0;
    g.rect(x, bottom, x + S, A);
    if (g.p.mono) g.rect(x - g.slab * 1.6, A - g.p.H, x + S, A);
    return x;
  };
  add("ɫ", "SS", 300, (g, w) => {
    const x = lStem(g, g.p.mono ? w : g.p.S);
    tildeAt(g, x + g.p.S / 2, g.p.A * 0.47, 120, 30);
  });
  add("ɬ", "SS", 300, (g, w) => {
    const x = lStem(g, g.p.mono ? w : g.p.S);
    const { S, H, A } = g.p;
    const m = A * 0.5;
    const r = 62 + S * 0.3;
    g.ring(x - r * 1.5, m - r, x + S * 0.5, m + r, S * 0.8, H * 0.85, 0.5523);
    g.rect(x + S * 0.5, m - r, x + S + 90, m - r + H);
  });
  add("ɭ", "SS", 300, (g, w) => {
    const x = lStem(g, g.p.mono ? w : g.p.S, 12);
    retroflex(g, x);
  });
  add("ɮ", "SR", 520, (g, w) => {
    const { S, X, D } = g.p;
    const x = g.p.mono ? w * 0.05 : 0;
    const ws = g.p.mono ? w * 0.9 : w;
    g.rect(x, 0, x + S, g.p.A);
    const sp = capture(g, () => ezh(g, ws - S * 1.2, X, D));
    g.add(transform(sp, ([px, py]) => [px + x + S * 0.7, py]));
  });
  turn("ɯ", "m");
  add("ɰ", "SS", 660, (g, w) => {
    const ink = capture(g, () => L.get("m").draw(g, w));
    const b = bbox(ink);
    g.add(turned(ink, b));
    const s = g.p.mono ? g.p.S * 0.86 : g.p.S;
    g.rect(b.x1 - s, g.p.D, b.x1, 20);
  });
  on("ɱ", "m", (g, _w, b) => hookDown(g, b.x1 - (g.p.mono ? g.p.S * 0.86 : g.p.S)));
  on("ɳ", "n", (g, _w, b) => retroflex(g, b.x1 - g.p.S));
  smallCap("ɴ", "N");
  on("ɵ", "o", (g, w) => {
    const { S, X, H } = g.p;
    g.rect(S * 0.5, X / 2 - H / 2, w - S * 0.5, X / 2 + H / 2);
  });
  on("ɸ", "φ");
  turn("ɹ", "r");
  add("ɺ", "NS", 268, (g, w) => {
    const ink = capture(g, () => L.get("r").draw(g, w));
    const b = bbox(ink);
    const t = turned(ink, b);
    g.add(t);
    const tb = bbox(t);
    g.rect(tb.x1 - g.p.S, 0, tb.x1, g.p.A);
  });
  add("ɻ", "NS", 268, (g, w) => {
    const ink = capture(g, () => L.get("r").draw(g, w));
    const t = turned(ink, bbox(ink));
    g.add(t);
    retroflex(g, bbox(t).x1 - g.p.S);
  });
  on("ɽ", "r", (g, w, b) => retroflex(g, g.p.mono ? b.x0 + (w * 0.28 - b.x0) : b.x0));
  add("ɾ", "SN", 240, (g, w) => {
    const x = g.p.mono ? w * 0.36 : 0;
    const top = hookRight(g, x, g.p.X);
    g.rect(x, 0, x + g.p.S, top);
  });
  smallCap("ʀ", "R");
  add("ʁ", "SD", Math.round(L.get("R").width * 0.84), (g, w) => {
    const sp = withP(g, { C: g.p.X, OC: g.p.O });
    const ink = capture(sp, () => L.get("R").draw(sp, w));
    g.add(mirrorY(ink, g.p.X / 2));
  });
  on("ʂ", "s", (g, w) => retroflex(g, w * 0.04));
  // ʃ: a long stroke from a hooked top above the x-height to a j's hook below the baseline.
  add("ʃ", "DT", 300, (g, w) => {
    const xs = g.p.mono ? w * 0.4 : w * 0.3;
    const top = hookRight(g, xs, g.p.A);
    g.rect(xs, 0, xs + g.p.S, top);
    hookDown(g, xs);
  });
  add("ʈ", "NR", 276, (g, w) => {
    const { S, H, X, A } = g.p;
    const xs = w * 0.24;
    g.rect(xs, 12, xs + S, X + (A - X) * 0.4);
    g.rect(0, X - H, w * 0.9, X);
    retroflex(g, xs);
  });
  on("ʉ", "u", (g, w) => {
    const { X, H } = g.p;
    g.rect(-60, X * 0.46 - H / 2, w + 60, X * 0.46 + H / 2);
  });
  // ʊ: a horseshoe — a cup whose arms turn out at the top in short level strokes.
  add("ʊ", "SS", 440, (g, w) => {
    const { S, H, X, O } = g.p;
    const r = w / 2;
    const f = 40 + S * 0.55;
    g.sector(0, -O, w, 2 * r - O, 2, 4, "r", "r");
    g.rect(0, r - O - 6, S, X);
    g.rect(w - S, r - O - 6, w, X);
    g.rect(-f, X - H, S, X);
    g.rect(w - S, X - H, w + f, X);
  });
  turn("ʌ", "v");
  turn("ʍ", "w");
  turn("ʎ", "y");
  smallCap("ʏ", "Y");
  on("ʐ", "z", (g, w) => retroflex(g, w - g.p.S));
  on("ʑ", "z", (g, w) => {
    const { S, H } = g.p;
    const r = 56 + S * 0.25;
    g.ring(w - 2 * r - S * 0.2, -g.p.O - r, w - S * 0.2, r - g.p.O, S * 0.8, H * 0.8, 0.5523);
  });
  /** The question mark's hook without its dot, its stem down to the baseline: ʔ ʕ ʡ ʢ. */
  const glottal = (g, bar) => {
    const { S, H, A, O, cut } = g.p;
    const w = 340;
    const y0 = A * 0.42;
    g.sector(0, y0, w, A + O, 3.0, 5.68, "r", cut);
    g.rect(w / 2 - S / 2, 0, w / 2 + S / 2, y0 + H);
    if (bar) g.rect(w / 2 - 110, A * 0.2 - H / 2, w / 2 + 110, A * 0.2 + H / 2);
  };
  add("ʔ", "NN", 340, (g) => glottal(g, false));
  add("ʡ", "NN", 340, (g) => glottal(g, true));
  for (const [ch, bar] of [["ʕ", false], ["ʢ", true]]) {
    add(ch, "NN", 340, (g) => {
      const ink = capture(g, () => glottal(g, bar));
      g.add(mirrorX(ink, 170));
    });
  }
  on("ʘ", "O", (g, w) => {
    // Always round: the square dot of Sans and Tech turns the bullseye into a Θ.
    const d = Math.max(g.p.S * 0.8, 62);
    g.add(api.geom.disc(w / 2 - d, g.p.C / 2 - d, w / 2 + d, g.p.C / 2 + d));
  });
  smallCap("ʙ", "B");
  smallCap("ʜ", "H");
  on("ʝ", "j", (g, w) => {
    const { S, H, D } = g.p;
    const x = g.p.mono ? w * 0.62 : 150;
    g.rect(x - 120, D * 0.42 - H / 2, x + S + 40, D * 0.42 + H / 2);
  });
  smallCap("ʟ", "L");
  // Digraphs: ʤ d and ʒ, ʧ t and ʃ, sharing a stem's worth of space. A monospaced cell holds
  // both drawn narrower and lighter, as the latin module's æ and œ are.
  const pair = (ch, width, first, second) => {
    add(ch, "RT", width, (g, w) => {
      const sp = g.p.mono ? withP(g, { S: g.p.S * 0.72, H: g.p.H * 0.8 }) : g;
      const f = g.p.mono ? 0.52 : 0.5;
      const a = capture(sp, () => first(sp, Math.round(w * f)));
      g.add(a);
      const ba = bbox(a);
      const b = capture(sp, () => second(sp, Math.round(w * (g.p.mono ? 0.5 : 0.46))));
      const bb = bbox(b);
      g.add(transform(b, ([x, y]) => [x - bb.x0 + ba.x1 - sp.p.S * 0.6, y]));
    });
  };
  pair("ʤ", 840, (g, w) => L.get("d").draw(g, w), (g, w) => ezh(g, w, g.p.X, g.p.D));
  pair("ʧ", 640, (g, w) => L.get("t").draw(g, w), (g) => {
    const top = hookRight(g, 0, g.p.A);
    g.rect(0, 0, g.p.S, top);
    hookDown(g, 0);
  });
  // Modifier letters: h j w raised and smaller, drawn heavier first so they keep their weight.
  const raised = (ch, src) => {
    const s = L.get(src);
    add(ch, "NN", 0, (g) => {
      const k = 0.6;
      const heavy = withP(g, { S: g.p.S * 1.3, H: g.p.H * 1.3 });
      const w = g.p.mono ? (g.p.monoAdvance - 130) / k : Math.round((s.width || g.p.S) * g.p.wf);
      const ink = capture(heavy, () => {
        s.draw(heavy, w);
        if (s.accent) {
          const b0 = heavy.base ?? bbox(heavy.contours);
          heavy.mark();
          s.accent(heavy, b0);
        }
      });
      g.add(transform(ink, ([x, y]) => [x * k, y * k + g.p.X * 0.62]));
    });
  };
  raised("ʰ", "h");
  raised("ʲ", "j");
  raised("ʷ", "w");
  // Stress and length.
  add("ˈ", "SS", 100, (g) => g.rect(0, g.p.X + 30, g.p.S * 0.86, g.p.A + 40));
  add("ˌ", "SS", 100, (g) => g.rect(0, g.p.D + 20, g.p.S * 0.86, -10));
  const tri = (g, y, down) => {
    const a = Math.max(70, g.p.S * 1.05);
    const h = a * 1.15;
    g.poly(down ? [[0, y], [2 * a, y], [a, y - h]] : [[0, y], [2 * a, y], [a, y + h]]);
  };
  add("ː", "SS", 160, (g) => {
    tri(g, g.p.X, true);
    tri(g, 0, false);
  });
  add("ˑ", "SS", 160, (g) => tri(g, g.p.X, true));

  /* ---------------------------------------------------------------- combining marks */

  const COMBINING = [
    ["̀", "grave"], ["́", "acute"], ["̂", "circumflex"], ["̃", "tilde"], ["̄", "macron"], ["̆", "breve"],
    ["̇", "dotabove"], ["̈", "dieresis"], ["̊", "ring"], ["̋", "dblacute"], ["̌", "caron"],
    ["̣", "dotbelow"], ["̦", "commabelow"], ["̧", "cedilla"], ["̨", "ogonek"],
  ];
  for (const [ch, mark] of COMBINING) {
    add(ch, "NN", 200, (g) => {
      const below = ["dotbelow", "commabelow", "cedilla", "ogonek"].includes(mark);
      if (below) M[mark](g, 0);
      else M[mark](g, 0, g.p.X + 40);
      if (g.p.mono) return;
      // Zero advance, the ink centred back over the previous letter: place() spaces a glyph by
      // the ink box it is given, so it is given one whose width cancels the two 40-unit margins
      // of an "NN" glyph, starting where the ink should land.
      const b = bbox(g.contours);
      const back = Math.round((456 * g.p.wf) / 2 + g.p.sb.R);
      // shift = 40 − x0, so the ink drawn about x = 0 lands centred at −back.
      const x0 = 40 + back;
      g.base = { x0, x1: x0 - 80, y0: b.y0, y1: b.y1 };
    });
  }

  return out;
}

/** Kerning pairs this module adds: [left, right, units]. */
export const kerning = [
  ["Ƴ", "a", -50], ["Ƴ", "o", -54], ["Ƴ", "e", -54], ["Ɣ", "a", -30],
  ["Ҷ", "а", -10], ["Ҳ", "о", -20],
];
