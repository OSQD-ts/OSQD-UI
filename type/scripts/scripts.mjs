// The "scripts" glyph module: Armenian, Georgian (Mkhedruli) and Hebrew, drawn with the same pen
// and numbers as the Latin, so each family keeps its character in every script.
//
// Every letter is built here from the same few parts the Latin uses — stems, arches (the top of
// an n), cups (the bottom of a u), rings, bars and diagonals — so stems, curves and terminals
// match. A handful of letters whose form is genuinely the Latin one reuse the Latin drawing
// (Armenian Լ Ս Տ Օ ո ս օ ց, Georgian ხ), each under its own code point.
//
// Armenian lowercase sits on the x-height with the Latin ascender and descender. Georgian is
// unicameral: an x-height a touch above the Latin one, with ascenders and descenders on the Latin
// extents, so it sets beside Latin without clipping the line. Hebrew letters stand between the
// baseline and a letter height between the x-height and the cap height; ל rises to the ascender
// and ק ך ן ף ץ descend. Right-to-left order is the browser's business; the glyphs are spaced as
// usual. Niqqud (Hebrew vowel points) and Georgian Mtavruli capitals are not drawn.

export const id = "scripts";

export function glyphs(api) {
  const { defs } = api;
  const out = [];
  const add = (name, unicode, sides, width, draw) => out.push({ name, unicode, sides, width, draw });
  const latin = (name, unicode, ch) => {
    const [sides, width, draw] = defs[ch];
    add(name, unicode, sides, width || api.p.S, draw);
  };

  /* ---------------------------------------------------------------- parts */

  // Letters with three stems (ա խ պ տ փ, ო ლ, ש) step their strokes down in a monospaced font,
  // as the Latin m does: the cell does not grow with the stems, and past Bold they would clog.
  let thin = 1;
  const crowded = (draw) => (g, w) => {
    thin = g.p.mono ? (g.p.S > 130 ? 0.76 : 0.86) : 1;
    try {
      draw(g, w);
    } finally {
      thin = 1;
    }
  };
  const sw = (g) => g.p.S * thin;

  /** A stem with its left edge at x, from y0 to y1. */
  const stem = (g, x, y0, y1) => g.rect(x, Math.min(y0, y1), x + sw(g), Math.max(y0, y1));
  /** A horizontal bar whose top edge is at `top`. */
  const bar = (g, x0, x1, top) => g.rect(Math.min(x0, x1), top - g.p.H, Math.max(x0, x1), top);
  /** A horizontal bar whose bottom edge is at `bot`. */
  const foot = (g, x0, x1, bot) => g.rect(Math.min(x0, x1), bot, Math.max(x0, x1), bot + g.p.H);
  const depthOf = (g, x0, x1, room) => Math.max(g.p.S * 1.05, Math.min(g.p.X * 0.4, (x1 - x0) * 0.5, room * 0.62));

  /**
   * An arch (the top of an n) over x0..x1 with its top at `top`; its legs run down to yl and yr
   * (undefined leaves that leg out). Returns the height where the curve meets the legs.
   */
  function arch(g, x0, x1, top, yl, yr, depth) {
    const { O, H } = g.p;
    const S = sw(g);
    const low = Math.max(yl ?? -1e4, yr ?? -1e4, top - g.p.X);
    const d = depth ?? depthOf(g, x0, x1, top - low);
    const cy = top + O - d;
    g.sector(x0, cy - d, x1, top + O, 0, 2, "h", "h", S, H);
    if (yl !== undefined && yl < cy + 6) g.rect(x0, yl, x0 + S, cy + 6);
    if (yr !== undefined && yr < cy + 6) g.rect(x1 - S, yr, x1, cy + 6);
    return cy;
  }

  /** A cup (the bottom of a u) over x0..x1 sitting on `bot`; its legs rise to yl and yr. */
  function cup(g, x0, x1, bot, yl, yr, depth) {
    const { O, H } = g.p;
    const S = sw(g);
    const high = Math.min(yl ?? 1e4, yr ?? 1e4, bot + g.p.X);
    const d = depth ?? depthOf(g, x0, x1, high - bot);
    const cy = bot - O + d;
    g.sector(x0, bot - O, x1, cy + d, 2, 4, "h", "h", S, H);
    if (yl !== undefined && yl > cy - 6) g.rect(x0, cy - 6, x0 + S, yl);
    if (yr !== undefined && yr > cy - 6) g.rect(x1 - S, cy - 6, x1, yr);
    return cy;
  }

  /** A hook leaving the top of a stem at x (its left edge) and curling to the right (dir 1) or left (dir -1). */
  function hookTop(g, x, top, r, dir = 1, end = 1.75) {
    const { S, O } = g.p;
    // The stem side of the curl is the arc's west (dir 1) or east (dir -1) end at height top - r.
    if (dir > 0) g.sector(x, top + O - 2 * r, x + 2 * r, top + O, 2 - end, 2, "v", "h");
    else g.sector(x + S - 2 * r, top + O - 2 * r, x + S, top + O, 0, end, "h", "v");
  }

  /** A hook leaving the bottom of a stem at x and curling left (dir -1) or right (dir 1): the tail of j or t. */
  function hookBottom(g, x, bot, r, dir = -1, end = 1.6) {
    const { S, O } = g.p;
    if (dir < 0) g.sector(x + S - 2 * r, bot - O, x + S, bot - O + 2 * r, 4 - end, 4, "v", "h");
    else g.sector(x, bot - O, x + 2 * r, bot - O + 2 * r, 2, 2 + end, "h", "v");
  }

  /**
   * A diagonal stroke between two centre points, cut level at both ends. A stroke flatter than
   * about 30° gets square ends instead: a level cut on a near-level stroke runs out to infinity
   * (its half-width is t/2 · length/|dy|), which once made one heavy glyph sixteen ems wide.
   */
  const diag = (g, x0, y0, x1, y1, t) => {
    const thick = t ?? sw(g) * 0.93;
    if (Math.abs(y1 - y0) < Math.abs(x1 - x0) * 0.58) g.bar(x0, y0, x1, y1, thick);
    else g.stroke(x0, y0, x1, y1, thick);
  };
  /** A stroke with square ends, for flicks and short slanted bars. */
  const flick = (g, x0, y0, x1, y1, t) => g.bar(x0, y0, x1, y1, t ?? g.p.S * 0.9);
  /**
   * The ink width of a narrow letter. In a monospaced font every letter is handed the whole
   * cell; a narrow one (ו י ן ւ …) keeps its own width there and is centred, or ו turns into ר.
   */
  const narrow = (g, w, natural) => (g.p.mono ? Math.min(w, Math.round(natural * 1.1)) : w);

  /* ================================================================ Armenian */

  const AU = {
    // Ա: a u whose right side stops short of the top, with a foot turned out at the base.
    Ayb: ["Ա", "SS", 560, (g, w) => {
      const { C, S } = g.p;
      const xr = w - S * 1.6;
      cup(g, 0, xr + S, 0, C, C);
      flick(g, xr + S * 0.55, S * 0.9, w - S * 0.35, g.p.H * 0.5, S * 0.85);
    }],
    // Բ: a stem with a bowl closed by a bar halfway down.
    Ben: ["Բ", "SR", 470, (g, w) => {
      const { C } = g.p;
      stem(g, 0, 0, C);
      arch(g, 0, w, C, undefined, C * 0.5, C * 0.24);
      bar(g, 0, w, C * 0.53);
    }],
    // Գ: a closed bowl up top on a stem, with a short foot to the right.
    Gim: ["Գ", "RS", 520, (g, w) => {
      const { C, S } = g.p;
      const xs = w - S * 1.55;
      g.ring(0, C * 0.38, xs + S, C + g.p.OC);
      stem(g, xs, 0, C * 0.7);
      foot(g, xs, w, 0);
    }],
    // Դ: an arch with a short left leg, its right leg down to the base with a tick.
    Da: ["Դ", "SS", 530, (g, w) => {
      const { C, S } = g.p;
      const xs = w - S * 1.6;
      arch(g, 0, xs + S, C, C * 0.6, 0);
      bar(g, xs, w, C * 0.32);
    }],
    // Ե: a bar across the top of a u whose right side stops halfway.
    Ech: ["Ե", "SS", 520, (g, w) => {
      const { C } = g.p;
      cup(g, 0, w, 0, C, C * 0.55);
      bar(g, 0, w * 0.86, C);
    }],
    // Զ: a ring on a two-legged base, joined by one stroke.
    Za: ["Զ", "SS", 540, (g, w) => {
      const { C, S, H } = g.p;
      g.ring(w * 0.04, C * 0.42, w * 0.96, C + g.p.OC);
      diag(g, w * 0.66, C * 0.47, w * 0.3, C * 0.22);
      bar(g, 0, w, C * 0.22 + H * 0.5);
      stem(g, 0, 0, C * 0.22);
      stem(g, w - S, 0, C * 0.22);
    }],
    // Է: a stem with an arm halfway and a base that turns down.
    Eh: ["Է", "SN", 470, (g, w) => {
      const { C, S, H } = g.p;
      stem(g, 0, 0, C);
      bar(g, 0, w * 0.86, C * 0.64);
      foot(g, 0, w * 0.82, 0);
      stem(g, w * 0.82 - S, -C * 0.14, H);
    }],
    // Ը: an arch with a short right leg, standing on a base bar.
    Et: ["Ը", "SS", 520, (g, w) => {
      const { C } = g.p;
      arch(g, 0, w, C, 0, C * 0.6);
      foot(g, 0, w, 0);
    }],
    // Թ: a stem, an arch to the right that turns into a small bowl, and a bar out of the bowl.
    To: ["Թ", "SR", 580, (g, w) => {
      const { C, S } = g.p;
      const xr = w - S * 0.7;
      arch(g, 0, xr, C, 0, C * 0.44);
      g.ring(w * 0.36, C * 0.16, xr, C * 0.66);
      bar(g, w * 0.62, w, C * 0.42 + g.p.H * 0.5);
    }],
    // Ժ: a ring low down with a stem rising from its right shoulder, crossed by a slanted bar.
    Zhe: ["Ժ", "RS", 540, (g, w) => {
      const { C, S, OC } = g.p;
      g.ring(0, -OC, w * 0.84, C * 0.72);
      stem(g, w * 0.84 - S * 1.25, C * 0.5, C);
      flick(g, w * 0.38, C * 0.76, w - S * 0.3, C * 0.88, g.p.H);
    }],
    // Ի: a stem with a small arch whose leg stops in mid-air.
    Ini: ["Ի", "SS", 470, (g, w) => {
      const { C } = g.p;
      stem(g, 0, 0, C);
      arch(g, 0, w, C * 0.72, undefined, C * 0.3);
    }],
    // Խ: a stem with a u hanging off it in the upper half.
    Xeh: ["Խ", "SS", 520, (g, w) => {
      const { C } = g.p;
      stem(g, 0, 0, C);
      cup(g, 0, w, C * 0.26, undefined, C * 0.72);
    }],
    // Ծ: a ring with two horns.
    Ca: ["Ծ", "RR", 560, (g, w) => {
      const { C, OC } = g.p;
      g.ring(0, -OC, w, C * 0.72);
      diag(g, w * 0.5, C * 0.66, w * 0.12, C);
      diag(g, w * 0.5, C * 0.66, w * 0.88, C);
    }],
    // Կ: a short left stem joined low to a full right stem (the shape of Ч).
    Ken: ["Կ", "SS", 500, (g, w) => {
      const { C, S } = g.p;
      cup(g, 0, w, C * 0.36, C, C);
      stem(g, w - S, 0, C * 0.5);
    }],
    // Հ: a curve opening right from a hooked top, and a base that turns down.
    Ho: ["Հ", "SS", 480, (g, w) => {
      const { C, S } = g.p;
      flick(g, w * 0.3, C - g.p.H * 0.5, w * 0.86, C - g.p.H * 1.2, g.p.H);
      diag(g, w * 0.33, C - g.p.H, S * 0.55, C * 0.2);
      flick(g, S * 0.3, C * 0.2, w * 0.68, C * 0.13, g.p.H);
      stem(g, w * 0.68 - S * 0.6, 0, C * 0.16);
    }],
    // Ձ: a ring over a smaller bowl, with a tail out to the right.
    Ja: ["Ձ", "RR", 540, (g, w) => {
      const { C, OC } = g.p;
      g.ring(w * 0.08, C * 0.4, w * 0.92, C + OC);
      g.ring(0, -OC, w * 0.68, C * 0.44);
      diag(g, w * 0.5, C * 0.36, w - g.p.S * 0.5, 0);
    }],
    // Ղ: an arch with a short left leg and a full right leg with a foot.
    Ghad: ["Ղ", "SS", 530, (g, w) => {
      const { C, S } = g.p;
      const xs = w - S * 1.6;
      arch(g, 0, xs + S, C, C * 0.6, 0);
      foot(g, xs, w, 0);
    }],
    // Ճ: a u with a round left side under a slanted top bar.
    Cheh: ["Ճ", "SS", 560, (g, w) => {
      const { C } = g.p;
      cup(g, 0, w, 0, C * 0.64, C * 0.86, C * 0.36);
      flick(g, g.p.S * 0.3, C * 0.88, w - g.p.S * 0.2, C - g.p.H * 0.5, g.p.H);
      diag(g, w * 0.5, C * 0.9, g.p.S * 0.55, C * 0.62);
    }],
    // Մ: a u whose right side rises to a hook curled to the left.
    Men: ["Մ", "SS", 560, (g, w) => {
      const { C, S } = g.p;
      // A hook big enough to survive small sizes: without it Մ reads as Ս.
      const r = Math.max(S * 1.3, w * 0.3);
      cup(g, 0, w, 0, C, C - r);
      hookTop(g, w - S, C, r, -1, 1.95);
    }],
    // Յ: a small upper bowl and a large lower one, the bar between them reaching to the left.
    Yi: ["Յ", "RR", 500, (g, w) => {
      const { C, OC, H } = g.p;
      const m = C * 0.52;
      g.sector(w * 0.06, m - H * 0.5, w * 0.86, C + OC, -1, 1.7, "h", g.p.cut);
      bar(g, 0, w * 0.6, m + H * 0.5);
      g.sector(0, -OC, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // Ն: a u whose left side ends in a curl up and to the left.
    Now: ["Ն", "SS", 520, (g, w) => {
      const { C, S } = g.p;
      const x0 = w * 0.16;
      cup(g, x0, w, 0, C * 0.7, C);
      diag(g, x0 + S * 0.5, C * 0.7, S * 0.5, C * 0.86);
      diag(g, S * 0.5, C * 0.86, w * 0.3, C);
    }],
    // Շ: a slanted top bar, a round left side, and a right side that stops halfway.
    Sha: ["Շ", "RS", 520, (g, w) => {
      const { C, OC } = g.p;
      flick(g, g.p.S * 0.3, C - g.p.H * 0.5, w - g.p.S * 0.3, C * 0.86, g.p.H);
      g.sector(0, -OC, w, C * 0.92, 1.35, 4, g.p.cut, "h");
      stem(g, w - g.p.S, C * 0.3, C * 0.46);
    }],
    // Ո: an arch with both legs to the base.
    Vo: ["Ո", "SS", 520, (g, w) => {
      arch(g, 0, w, g.p.C, 0, 0);
    }],
    // Չ: a hooked top bowl swinging down to the left, crossed by a stroke down to the right.
    Cha: ["Չ", "RS", 520, (g, w) => {
      const { C, OC } = g.p;
      g.sector(w * 0.04, C * 0.38, w * 0.92, C + OC, -0.55, 1.75, "a", g.p.cut);
      diag(g, w * 0.66, C * 0.42, w * 0.22, g.p.H * 0.5);
      diag(g, g.p.S * 0.5, C * 0.36, w - g.p.S * 0.5, 0, g.p.S * 0.86);
    }],
    // Պ: an arch with a short left leg, a full right leg, and a stem hanging from its middle.
    Peh: ["Պ", "SS", 560, (g, w) => {
      const { C, S } = g.p;
      arch(g, 0, w, C, C * 0.5, 0);
      stem(g, w * 0.5 - S * 0.5, C * 0.22, C - S * 0.4);
    }],
    // Ջ: a ring standing on an inverted V and a two-legged base.
    Jheh: ["Ջ", "SS", 540, (g, w) => {
      const { C, S, H } = g.p;
      g.ring(w * 0.1, C * 0.44, w * 0.9, C + g.p.OC);
      diag(g, w * 0.5, C * 0.47, w * 0.2, C * 0.2);
      diag(g, w * 0.5, C * 0.47, w * 0.8, C * 0.2);
      bar(g, 0, w, C * 0.2 + H * 0.5);
      stem(g, 0, 0, C * 0.2);
      stem(g, w - S, 0, C * 0.2);
    }],
    // Ռ: an arch on two legs, the right leg crossed by a tick.
    Ra: ["Ռ", "SS", 540, (g, w) => {
      const { C, S } = g.p;
      const xs = w - S * 1.6;
      arch(g, 0, xs + S, C, 0, 0);
      bar(g, xs, w, C * 0.3);
    }],
    // Վ: a u with a short left side and a full right stem with a foot.
    Vew: ["Վ", "SS", 540, (g, w) => {
      const { C, S } = g.p;
      const xs = w - S * 1.6;
      cup(g, 0, xs + S, 0, C * 0.62, C);
      foot(g, xs, w, 0);
    }],
    // Ր: an arch with a full left leg and a short right one.
    Reh: ["Ր", "SS", 500, (g, w) => {
      arch(g, 0, w, g.p.C, 0, g.p.C * 0.62);
    }],
    // Ց: two rings, the upper one smaller, with a slanted waist.
    Co: ["Ց", "RR", 540, (g, w) => {
      const { C, OC } = g.p;
      g.ring(w * 0.08, C * 0.46, w * 0.92, C + OC);
      g.ring(0, -OC, w, C * 0.54);
      flick(g, g.p.S * 0.2, C * 0.42, w - g.p.S * 0.2, C * 0.57, g.p.H);
    }],
    // Ւ: a stem with a stroke stepping down and out to the right.
    Yiwn: ["Ւ", "SS", 480, (g, w) => {
      const { C, S } = g.p;
      stem(g, 0, 0, C);
      diag(g, S * 0.9, C * 0.64, w * 0.66, C * 0.36);
      bar(g, w * 0.62, w, C * 0.36 + g.p.H * 0.5);
    }],
    // Փ: a ring with a stem through it.
    Piwr: ["Փ", "RR", 640, (g, w) => {
      const { C, S, H } = g.p;
      g.ring(0, C * 0.13, w, C * 0.87, S, H);
      stem(g, w * 0.5 - S * 0.5, 0, C);
    }],
    // Ք: a bowl on a stem, the stem crossed low by a bar.
    Keh: ["Ք", "SR", 520, (g, w) => {
      const { C } = g.p;
      const xs = w * 0.16;
      g.ring(xs, C * 0.4, w, C + g.p.OC);
      stem(g, xs, 0, C * 0.72);
      bar(g, 0, w * 0.86, C * 0.28);
    }],
    // Ֆ: a stem with a bowl up on its left, a bowl down on its right, and a foot to the left.
    Feh: ["Ֆ", "RR", 560, (g, w) => {
      const { C, S, OC } = g.p;
      const xs = w * 0.44;
      stem(g, xs, 0, C);
      g.ring(0, C * 0.5, xs + S, C + OC);
      g.sector(xs - (w - xs) + S, -OC, w, C * 0.6, 3, 5, "v", "v");
      foot(g, 0, xs + S, 0);
    }],
  };

  const AL = {
    // ա: two cups on three stems.
    ayb: ["ա", "SS", 640, crowded((g, w) => {
      const { X } = g.p;
      const S = sw(g);
      const xm = w / 2 - S / 2;
      cup(g, 0, xm + S, 0, X, X);
      cup(g, xm, w, 0, undefined, X);
    })],
    // բ: a stem down to the descender, a shoulder that stops short, and a base to the right.
    ben: ["բ", "SS", 420, (g, w) => {
      const { X, D } = g.p;
      stem(g, 0, D, X);
      arch(g, 0, w, X, undefined, X * 0.44);
      foot(g, 0, w, 0);
    }],
    // գ: a bowl on a stem to the descender, ticked to the right at the base.
    gim: ["գ", "RS", 470, (g, w) => {
      const { X, D, S, O } = g.p;
      const xs = w - S * 1.6;
      g.ring(0, -O, xs + S, X + O);
      stem(g, xs, D, X);
      bar(g, xs, w, g.p.H * 0.35);
    }],
    // դ: an n whose right leg goes down to the descender, ticked at the base.
    da: ["դ", "SS", 460, (g, w) => {
      const { X, D, S } = g.p;
      const xs = w - S * 1.6;
      arch(g, 0, xs + S, X, 0, D);
      bar(g, xs, w, g.p.H * 0.35);
    }],
    // ե: a tall left stem with an arm at the x-height, and a u whose right side stops halfway.
    ech: ["ե", "SS", 440, (g, w) => {
      const { X, A } = g.p;
      cup(g, 0, w, 0, A, X * 0.62);
      bar(g, 0, w * 0.86, X);
    }],
    // զ: a bowl on a stem to the descender, with a foot to the right.
    za: ["զ", "RS", 470, (g, w) => {
      const { X, D, S, O } = g.p;
      const xs = w - S * 1.6;
      g.ring(0, -O, xs + S, X + O);
      stem(g, xs, D, X);
      foot(g, xs, w, D);
    }],
    // է: a tall stem with an arm at the x-height and a base that turns down.
    eh: ["է", "SN", 410, (g, w) => {
      const { X, A, S, H } = g.p;
      stem(g, 0, 0, A);
      bar(g, 0, w * 0.8, X);
      foot(g, 0, w * 0.84, 0);
      stem(g, w * 0.84 - S, -X * 0.24, H);
    }],
    // ը: an n with a short right leg, its left leg dropping to a bar below the base.
    et: ["ը", "SS", 450, (g, w) => {
      const { X } = g.p;
      const low = -X * 0.36;
      arch(g, 0, w, X, low, X * 0.08);
      foot(g, 0, w, low);
    }],
    // թ: a stem to the descender, a shoulder turning into a small bowl, and a bar out of it.
    to: ["թ", "SR", 520, (g, w) => {
      const { X, D, S } = g.p;
      const xr = w - S * 0.6;
      stem(g, 0, D, X);
      arch(g, 0, xr, X, undefined, X * 0.4);
      g.ring(w * 0.34, -g.p.O, xr, X * 0.64);
      bar(g, w * 0.6, w, X * 0.42 + g.p.H * 0.5);
    }],
    // ժ: a ring with a stem rising from its right shoulder, crossed by a slanted bar.
    zhe: ["ժ", "RS", 470, (g, w) => {
      const { X, A, S, O } = g.p;
      g.ring(0, -O, w * 0.84, X * 0.84);
      stem(g, w * 0.84 - S * 1.25, X * 0.5, A);
      flick(g, w * 0.4, X + 26, w - S * 0.3, X + 110, g.p.H);
    }],
    // ի: a stem from the ascender to the descender with an n shoulder.
    ini: ["ի", "SS", 440, (g, w) => {
      const { X, A, D } = g.p;
      stem(g, 0, D, A);
      arch(g, 0, w, X, undefined, 0);
    }],
    // լ: a stem down to the descender with a foot.
    liwn: ["լ", "SS", 300, (g, w0) => {
      const w = narrow(g, w0, 300);
      const { X, D } = g.p;
      stem(g, 0, D, X);
      foot(g, 0, w, D);
    }],
    // խ: an ա whose first stem runs from the ascender to the descender.
    xeh: ["խ", "SS", 640, crowded((g, w) => {
      const { X, A, D } = g.p;
      const S = sw(g);
      const xm = w / 2 - S / 2;
      stem(g, 0, D, A);
      arch(g, 0, xm + S, X, undefined, undefined);
      cup(g, xm, w, 0, X * 0.6, X);
    })],
    // ծ: a ring with a bar to the right at the x-height and a horn up to the left.
    ca: ["ծ", "RR", 470, (g, w) => {
      const { X, A, O } = g.p;
      g.ring(0, -O, w * 0.92, X * 0.82);
      bar(g, w * 0.44, w, X);
      diag(g, w * 0.5, X * 0.78, w * 0.16, A);
    }],
    // կ: a u whose right stem runs from the ascender to the descender.
    ken: ["կ", "SS", 440, (g, w) => {
      const { X, A, D, S } = g.p;
      cup(g, 0, w, 0, X, X);
      stem(g, w - S, D, A);
    }],
    // հ: an n whose left leg stops short of the base and rises as a hook to the ascender.
    ho: ["հ", "SS", 450, (g, w) => {
      const { X, A, S } = g.p;
      arch(g, 0, w, X, X * 0.18, 0);
      stem(g, 0, X * 0.18, X + 30);
      diag(g, S * 0.5, X + 20, w * 0.3, A - S * 0.4);
      flick(g, w * 0.3 - S * 0.3, A - S * 0.4, w * 0.62, A - g.p.H * 0.4, g.p.H);
    }],
    // ձ: a ring under a slanted top bar, joined to it, with a leg out to the base on the right.
    ja: ["ձ", "RS", 490, (g, w) => {
      const { X, A, O, S, H } = g.p;
      g.ring(0, -O, w * 0.66, X * 0.72);
      // The bar stays near the ascender at every weight, so the stroke down to the ring stays steep.
      const yb = A - H * 1.2;
      flick(g, w * 0.1, A - H * 0.5, w * 0.7, yb, H);
      diag(g, w * 0.66, yb, w * 0.38, X * 0.68);
      diag(g, w * 0.5, X * 0.5, w - S * 0.5, 0);
    }],
    // ղ: an n whose right leg goes down to the descender, with a foot.
    ghad: ["ղ", "SS", 460, (g, w) => {
      const { X, D, S } = g.p;
      const xs = w - S * 1.6;
      arch(g, 0, xs + S, X, 0, D);
      foot(g, xs, w, D);
    }],
    // ճ: a bowl with a stem on its right, its left side rising to the ascender as a hooked curve,
    // crossed at the x-height.
    cheh: ["ճ", "RS", 470, (g, w) => {
      const { X, A, S, O } = g.p;
      g.ring(0, -O, w, X * 0.86);
      stem(g, w - S, 0, X * 0.6);
      stem(g, 0, X * 0.4, A - w * 0.38);
      hookTop(g, 0, A, w * 0.38, 1, 1.6);
      bar(g, -S * 0.4, w * 0.4, X);
    }],
    // մ: a u whose right side rises to the ascender and hooks left.
    men: ["մ", "SS", 460, (g, w) => {
      const { X, A, S } = g.p;
      const r = Math.max(S * 1.25, w * 0.3);
      cup(g, 0, w, 0, X, A - r);
      hookTop(g, w - S, A, r, -1, 1.95);
    }],
    // յ: a stem down to the descender with a tail to the left.
    yi: ["յ", "SS", 300, (g, w0) => {
      const w = narrow(g, w0, 300);
      const { X, D, S } = g.p;
      const r = Math.max(S * 1.15, 120);
      const xs = w - S;
      stem(g, xs, D + r - g.p.O - 6, X);
      hookBottom(g, xs, D, r, -1);
    }],
    // ն: a u whose left side ends in a curl up and to the left, to the ascender.
    now: ["ն", "SS", 450, (g, w) => {
      const { X, A, S } = g.p;
      const x0 = w * 0.18;
      cup(g, x0, w, 0, X * 0.78, X);
      diag(g, x0 + S * 0.5, X * 0.78, S * 0.5, X + 70);
      diag(g, S * 0.5, X + 70, w * 0.34, A - 10);
    }],
    // շ: a figure-two at the x-height.
    sha: ["շ", "RS", 430, (g, w) => {
      const { X, O, S } = g.p;
      g.sector(w * 0.04, X * 0.3, w, X + O, -0.5, 1.7, "a", g.p.cut);
      diag(g, w - S * 0.75, X * 0.5, S * 0.55, g.p.H * 0.5);
      foot(g, 0, w, 0);
    }],
    // ո: the Latin n.
    // չ: a small hook at the top swinging down to the right, then a long stroke back to the base.
    cha: ["չ", "RS", 420, (g, w) => {
      const { X, S, O } = g.p;
      // A small hook at the top (not the full bowl of շ) swinging down into the long stroke.
      g.sector(w * 0.22, X * 0.4, w, X + O, -0.45, 1.15, "a", "h");
      flick(g, w * 0.5, X + O - g.p.H * 0.5, w * 0.36, X + 70, S * 0.8);
      diag(g, w - S * 0.6, X * 0.58, S * 0.55, g.p.H * 0.5);
      foot(g, 0, w, 0);
    }],
    // պ: an ա whose last stem goes down to the descender.
    peh: ["պ", "SS", 640, crowded((g, w) => {
      const { X, D } = g.p;
      const S = sw(g);
      const xm = w / 2 - S / 2;
      cup(g, 0, xm + S, 0, X, X);
      cup(g, xm, w, 0, undefined, X);
      stem(g, w - S, D, X * 0.5);
    })],
    // ջ: a loop at the top of a figure-two.
    jheh: ["ջ", "RS", 440, (g, w) => {
      const { X, S, O } = g.p;
      g.ring(w * 0.14, X * 0.42, w * 0.86, X + O);
      diag(g, w * 0.66, X * 0.46, S * 0.55, g.p.H * 0.5);
      foot(g, 0, w, 0);
    }],
    // ռ: an n whose right leg ends in a foot to the right.
    ra: ["ռ", "SS", 470, (g, w) => {
      const { X, S } = g.p;
      const xs = w - S * 1.6;
      arch(g, 0, xs + S, X, 0, 0);
      foot(g, xs, w, 0);
    }],
    // ս: the Latin u.
    // վ: a u whose right stem runs from the ascender to the descender, with a foot.
    vew: ["վ", "SS", 470, (g, w) => {
      const { X, A, D, S } = g.p;
      const xs = w - S * 1.6;
      cup(g, 0, xs + S, 0, X, X);
      stem(g, xs, D, A);
      foot(g, xs, w, D);
    }],
    // տ: a cup and an arch sharing a stem.
    tiwn: ["տ", "SS", 640, crowded((g, w) => {
      const { X } = g.p;
      const S = sw(g);
      const xm = w / 2 - S / 2;
      cup(g, 0, xm + S, 0, X, undefined);
      arch(g, xm, w, X, 0, 0);
      stem(g, xm, X * 0.3, X * 0.7);
    })],
    // ր: an n whose left stem goes down to the descender.
    reh: ["ր", "SS", 440, (g, w) => {
      const { X, D } = g.p;
      arch(g, 0, w, X, D, 0);
    }],
    // ց: the Latin g.
    // ւ: a short stem with a foot.
    yiwn: ["ւ", "SS", 280, (g, w0) => {
      const w = narrow(g, w0, 280);
      const { X } = g.p;
      stem(g, 0, 0, X * 0.7);
      foot(g, 0, w, 0);
    }],
    // փ: a cup and an arch on either side of a stem from the ascender to the descender.
    piwr: ["փ", "SS", 660, crowded((g, w) => {
      const { X, A, D } = g.p;
      const S = sw(g);
      const xm = w / 2 - S / 2;
      cup(g, 0, xm + S, 0, X, undefined);
      arch(g, xm, w, X, undefined, 0);
      stem(g, xm, D, A);
    })],
    // ք: a p crossed below the base.
    keh: ["ք", "SR", 470, (g, w) => {
      const { X, D, O } = g.p;
      const xs = w * 0.16;
      g.ring(xs, -O, w, X + O);
      stem(g, xs, D, X);
      bar(g, 0, w * 0.84, -X * 0.12);
    }],
    // օ: the Latin o.
    // ֆ: a stem from the ascender to the descender, a bowl up on its left and one down on its right.
    feh: ["ֆ", "RR", 490, (g, w) => {
      const { X, A, D, S, O } = g.p;
      const xs = w * 0.44;
      stem(g, xs, D, A);
      g.ring(0, X * 0.46, xs + S, A + O);
      g.sector(xs - (w - xs) + S, -O, w, X * 0.66, 3, 5, "v", "v");
      foot(g, 0, xs + S, 0);
    }],
    // և: a tall stem, a cup, and a right stem with a foot (ե and ւ joined).
    ech_yiwn: ["և", "SS", 500, (g, w) => {
      const { X, A, S } = g.p;
      const xs = w - S * 1.6;
      cup(g, 0, xs + S, 0, A, X);
      foot(g, xs, w, 0);
    }],
  };

  for (const [name, [ch, sides, width, draw]] of Object.entries(AU)) add(`arm_${name}`, ch, sides, width, draw);
  latin("arm_Liwn", "Լ", "L");
  latin("arm_Seh", "Ս", "U");
  latin("arm_Tiwn", "Տ", "S");
  latin("arm_Oh", "Օ", "O");
  for (const [name, [ch, sides, width, draw]] of Object.entries(AL)) add(`arm_${name}`, ch, sides, width, draw);
  latin("arm_vo", "ո", "n");
  latin("arm_seh", "ս", "u");
  latin("arm_co", "ց", "g");
  latin("arm_oh", "օ", "o");

  // Armenian punctuation: marks that sit high, a two-dot full stop and a hyphen.
  const P = {
    modifierHalfRing: ["ՙ", (g) => g.sector(0, g.p.C - 150, 150, g.p.C + 30, 1, 3.2, "h", "r", g.p.S * 0.8, g.p.H * 0.8)],
    apostrophe: ["՚", (g) => flick(g, 70, g.p.C + 20, 20, g.p.C - 150, g.p.S * 0.9)],
    emphasis: ["՛", (g) => flick(g, 0, g.p.X + 60, 110, g.p.X + 200, g.p.S * 0.85)],
    exclamation: ["՜", (g) => {
      flick(g, 0, g.p.X + 190, 70, g.p.X + 80, g.p.S * 0.85);
      flick(g, 70, g.p.X + 80, 150, g.p.X + 170, g.p.S * 0.85);
    }],
    comma: ["՝", (g) => flick(g, 110, g.p.X + 60, 0, g.p.X + 200, g.p.S * 0.85)],
    question: ["՞", (g) => g.sector(0, g.p.X + 30, 170, g.p.X + 210, -0.6, 1.9, "r", "r", g.p.S * 0.8, g.p.H * 0.8)],
    abbreviation: ["՟", (g) => {
      bar(g, 0, 180, g.p.C - 20);
      g.sector(140, g.p.C - 140, 260, g.p.C - 20, 3, 5, "v", "r", g.p.S * 0.8, g.p.H * 0.8);
    }],
    fullStop: ["։", (g) => {
      g.dot(80, g.p.X - 50);
      g.dot(80, 60);
    }],
    hyphen: ["֊", (g, w) => {
      g.rect(0, g.p.X * 0.42, w, g.p.X * 0.42 + g.p.H);
      g.rect(0, g.p.X * 0.42, g.p.S * 0.8, g.p.X * 0.42 + g.p.H * 1.9);
    }],
  };
  for (const [name, [ch, draw]] of Object.entries(P)) add(`arm_${name}`, ch, "SS", name === "hyphen" ? 280 : 200, draw);

  /* ================================================================ Georgian */

  // Mkhedruli sits a touch higher than the Latin x-height and is rounder; ascenders and
  // descenders use the Latin extents.
  const gx = (p) => Math.round(p.X * 1.04);

  const GE = {
    // ა: a cup whose left side stops low and whose right side swings back up and in.
    an: ["ა", "SS", 470, (g, w) => {
      const X = gx(g.p);
      const { S } = g.p;
      cup(g, 0, w, 0, X * 0.44, X * 0.5);
      diag(g, w - S * 0.5, X * 0.5, w * 0.42, X);
    }],
    // ბ: a ring with a stroke rising from its top to the ascender.
    ban: ["ბ", "RR", 470, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      g.ring(0, -O, w, X + O);
      diag(g, w * 0.52, X - S * 0.3, w * 0.34, A - S * 0.3);
      flick(g, w * 0.34, A - S * 0.3, w * 0.48, A, S * 0.8);
    }],
    // გ: a ring in the descender with a hook on top reaching the x-height.
    gan: ["გ", "RR", 470, (g, w) => {
      const X = gx(g.p);
      const { D, O } = g.p;
      g.ring(0, D - O, w, X * 0.62);
      g.sector(w * 0.14, X * 0.3, w * 0.86, X + O, -0.7, 1.75, "a", g.p.cut);
    }],
    // დ: a ring with a second bump on its right, its left side sweeping down into a tail.
    don: ["დ", "RR", 560, (g, w) => {
      const X = gx(g.p);
      const { D, O } = g.p;
      g.ring(0, -O, w * 0.62, X + O);
      arch(g, w * 0.5, w, X * 0.92, undefined, X * 0.36, X * 0.3);
      g.sector(0, D - O, w * 0.86, X * 0.5, 2, 3.75, "h", g.p.cut);
    }],
    // ე: an arch over a right side that drops below the base and curls back left.
    en: ["ე", "SR", 440, (g, w) => {
      const X = gx(g.p);
      const { D, O, S } = g.p;
      const cy = arch(g, 0, w, X, X * 0.32, undefined);
      stem(g, w - S, X * 0.05, cy + 6);
      g.sector(w * 0.08, D * 0.62 - O, w, X * 0.3, 2.5, 4, g.p.cut, "h");
    }],
    // ვ: a small hook on top of a larger bowl, both on the base: a rounded 3.
    vin: ["ვ", "RR", 450, (g, w) => {
      const X = gx(g.p);
      const { O, H } = g.p;
      const m = X * 0.6;
      g.sector(w * 0.12, m - H * 0.5, w * 0.88, X + O, -1, 1.7, "h", g.p.cut);
      g.sector(0, -O, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // ზ: a ring with a smaller loop above it reaching the ascender.
    zen: ["ზ", "RR", 460, (g, w) => {
      const X = gx(g.p);
      const { A, O } = g.p;
      g.ring(0, -O, w, X * 0.76);
      g.ring(w * 0.16, X * 0.66, w * 0.84, A + O);
    }],
    // თ: a ring with an arch out of its right shoulder down to the base.
    tan: ["თ", "SR", 590, (g, w) => {
      const X = gx(g.p);
      const { O } = g.p;
      g.ring(0, -O, w * 0.58, X + O);
      arch(g, w * 0.42, w, X, undefined, 0);
    }],
    // ი: an arch on two legs.
    in: ["ი", "SS", 450, (g, w) => {
      arch(g, 0, w, gx(g.p), 0, 0);
    }],
    // კ: a small hook on top of a larger bowl dropping into the descender.
    kan: ["კ", "RR", 450, (g, w) => {
      const X = gx(g.p);
      const { D, O, H } = g.p;
      const m = X * 0.52;
      g.sector(w * 0.14, m - H * 0.5, w * 0.86, X + O, -1, 1.7, "h", g.p.cut);
      g.sector(0, D - O, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // ლ: two arches whose left side sweeps down into a long tail.
    las: ["ლ", "SR", 640, crowded((g, w) => {
      const X = gx(g.p);
      const { D, O } = g.p;
      const S = sw(g);
      const xm = w * 0.62;
      arch(g, w * 0.2, xm + S * 0.5, X, undefined, X * 0.36, X * 0.32);
      arch(g, xm - S * 0.5, w, X, undefined, 0, X * 0.32);
      g.sector(0, D - O, w * 0.86, X * 0.95, 1.55, 3.7, "h", g.p.cut);
    })],
    // მ: a ring with a stem rising from its right side to the ascender, curled to the left.
    man: ["მ", "RS", 470, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      // The stem curls well over to the left at the top, so მ never reads as ძ, whose stem is straight.
      const r = Math.max(S * 1.3, w * 0.36);
      g.ring(0, -O, w, X * 0.84);
      stem(g, w - S, X * 0.4, A - r);
      hookTop(g, w - S, A, r, -1, 2.05);
    }],
    // ნ: a ring whose left side rises to the ascender and turns right along the top.
    nar: ["ნ", "SR", 450, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      const r = Math.max(S * 1.1, w * 0.26);
      g.ring(0, -O, w, X * 0.8);
      stem(g, 0, X * 0.4, A - r);
      hookTop(g, 0, A, r, 1, 1);
      bar(g, r, w * 0.82, A + O);
    }],
    // ო: two arches on three legs, the middle one short.
    on: ["ო", "SS", 640, crowded((g, w) => {
      const X = gx(g.p);
      const S = sw(g);
      const xm = w / 2 - S / 2;
      arch(g, 0, xm + S, X, 0, X * 0.42);
      arch(g, xm, w, X, undefined, 0);
    })],
    // პ: a hooked top reaching the ascender over a bowl on the base.
    par: ["პ", "RR", 450, (g, w) => {
      const X = gx(g.p);
      const { A, O, H } = g.p;
      const m = X * 0.6;
      g.sector(w * 0.14, m - H * 0.5, w * 0.86, A + O, -1, 1.7, "h", g.p.cut);
      g.sector(0, -O, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // ჟ: a curl at the top left and a stem dropping into a tail curled to the left.
    zhar: ["ჟ", "RS", 470, (g, w) => {
      const X = gx(g.p);
      const { D, S, O } = g.p;
      const r = Math.max(S * 1.15, w * 0.3);
      const xs = w - S;
      // An arch over to the stem, whose left side stops halfway, and the stem dropping into a tail.
      arch(g, 0, xs + S, X, X * 0.46, undefined, X * 0.34);
      stem(g, xs, D + r - O - 6, X * 0.7);
      hookBottom(g, xs, D, r, -1, 1.7);
    }],
    // რ: an arch whose left leg rises to the ascender with a flick to the right.
    rae: ["რ", "SS", 460, (g, w) => {
      const X = gx(g.p);
      const { A, S, H } = g.p;
      // The ascender leans out of the arch and ends in a flag: a straight tall stem is ჩ's.
      arch(g, 0, w, X, 0, 0);
      diag(g, S * 0.5, X * 0.7, w * 0.36, A - H);
      flick(g, w * 0.36 - S * 0.3, A - H * 0.5, w * 0.78, A - H * 0.2, H);
    }],
    // ს: a cup whose left side rises to the ascender and whose right side stops halfway.
    san: ["ს", "SS", 450, (g, w) => {
      const X = gx(g.p);
      cup(g, 0, w, 0, g.p.A, X * 0.62);
    }],
    // ტ: a ring with a stem from its middle to the ascender.
    tar: ["ტ", "RR", 520, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      g.ring(0, -O, w, X * 0.9);
      stem(g, w * 0.5 - S * 0.5, X * 0.42, A);
    }],
    // უ: a deep cup from the x-height into the descender, with a flick off its left side.
    un: ["უ", "SS", 450, (g, w) => {
      const X = gx(g.p);
      const { D, S, H } = g.p;
      cup(g, 0, w, D, X * 0.66, X);
      flick(g, S * 0.3, X * 0.66, w * 0.34, X - H * 0.5, H);
    }],
    // ფ: a ring up on the left and a bowl down on the right, dropping into the descender.
    phar: ["ფ", "RR", 520, (g, w) => {
      const X = gx(g.p);
      const { D, O, H } = g.p;
      g.ring(0, X * 0.36, w * 0.62, X + O);
      g.sector(w * 0.24, D - O, w, X * 0.5 + H * 0.5, -1.4, 1.2, g.p.cut, "v");
    }],
    // ქ: a cup whose right side rises to the ascender and whose left side stops halfway.
    khar: ["ქ", "SS", 450, (g, w) => {
      const X = gx(g.p);
      cup(g, 0, w, 0, X * 0.62, g.p.A);
    }],
    // ღ: an arch on the right whose left side sweeps down into a long tail.
    ghan: ["ღ", "SR", 520, (g, w) => {
      const X = gx(g.p);
      const { D, O } = g.p;
      arch(g, w * 0.22, w, X, undefined, 0, X * 0.36);
      g.sector(0, D - O, w * 0.84, X * 0.95, 1.55, 3.7, "h", g.p.cut);
    }],
    // ყ: a cup on short sides, its right side dropping into a tail curled to the left.
    qar: ["ყ", "SS", 460, (g, w) => {
      const X = gx(g.p);
      const { D, S, O } = g.p;
      const r = Math.max(S * 1.15, w * 0.3);
      cup(g, 0, w, X * 0.28, X, X);
      stem(g, w - S, D + r - O - 6, X * 0.5);
      hookBottom(g, w - S, D, r, -1, 1.7);
    }],
    // შ: a ring with a stem from its right side to a bar along the ascender, flicked down at the left.
    shin: ["შ", "RS", 470, (g, w) => {
      const X = gx(g.p);
      const { A, O, S, H } = g.p;
      g.ring(0, -O, w, X * 0.84);
      stem(g, w - S, X * 0.4, A);
      bar(g, w * 0.16, w, A);
      flick(g, w * 0.16 + S * 0.3, A - H * 0.5, w * 0.04 + S * 0.3, A - H * 2.4, S * 0.85);
    }],
    // ჩ: a stem from the ascender with a small hook at the top, and an arch at the x-height.
    chin: ["ჩ", "SS", 460, (g, w) => {
      const X = gx(g.p);
      const { A, S } = g.p;
      const r = Math.max(S * 1.1, w * 0.26);
      arch(g, 0, w, X, 0, 0);
      stem(g, 0, X * 0.5, A - r);
      arch(g, 0, 2 * r + S * 0.4, A, undefined, A - r * 1.7, r);
    }],
    // ც: a tall curve from the ascender down to the base, with a hooked bowl on its right.
    can: ["ც", "RR", 500, (g, w) => {
      const X = gx(g.p);
      const { A, D, O } = g.p;
      g.sector(0, D * 0.4 - O, w * 0.86, A + O, 1.15, 3.2, g.p.cut, "h");
      g.sector(w * 0.3, X * 0.04, w, X * 0.86, -1.3, 1.6, "h", g.p.cut);
    }],
    // ძ: a ring with a stem on its right side to the ascender (the shape of d).
    jil: ["ძ", "RS", 470, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      g.ring(0, -O, w, X * 0.92);
      stem(g, w - S, X * 0.4, A);
    }],
    // წ: a ნ with a second hook at the right end of its top.
    cil: ["წ", "SR", 460, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      const r = Math.max(S * 1.1, w * 0.26);
      g.ring(0, -O, w, X * 0.8);
      stem(g, 0, X * 0.4, A - r);
      hookTop(g, 0, A, r, 1, 1);
      bar(g, r, w * 0.7, A + O);
      hookTop(g, w * 0.7 - S - r, A, r * 0.8, -1, 1);
    }],
    // ჭ: a small ring with a stem crossed above it and a tail from below into the descender.
    char: ["ჭ", "RS", 470, (g, w) => {
      const X = gx(g.p);
      const { A, D, O, S } = g.p;
      g.ring(0, X * 0.28, w * 0.7, X + O);
      stem(g, w * 0.46 - S * 0.5, X * 0.8, A);
      bar(g, w * 0.16, w * 0.84, X + 100);
      g.sector(w * 0.08, D - O, w, X * 0.42, -1, 1.2, "h", "v");
    }],
    // ხ: the Latin b.
    // ჯ: a stem crossed by a slanted bar, ending below in a bowl that drops into the descender.
    jhan: ["ჯ", "RS", 470, (g, w) => {
      const X = gx(g.p);
      const { D, S, H } = g.p;
      // A stem crossed by a slanted bar, ending in a cup in the descender whose left side rises
      // again: a J-hook here would read as a Latin J.
      const xs = w * 0.56;
      flick(g, S * 0.3, X - H * 0.2, w - S * 0.3, X + 110, H);
      cup(g, 0, xs + S, D, X * 0.22, X + 110, Math.min((xs + S) * 0.5, X * 0.4));
    }],
    // ჰ: a small loop at the top reaching the ascender over a bowl on the base.
    hae: ["ჰ", "RR", 450, (g, w) => {
      const X = gx(g.p);
      const { A, O, H } = g.p;
      const m = X * 0.6;
      g.ring(w * 0.18, m + H * 0.5, w * 0.82, A + O);
      g.sector(0, -O, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // ჱ: a tall curve beside a rounded 3.
    he: ["ჱ", "RR", 540, (g, w) => {
      const X = gx(g.p);
      const { A, O, H } = g.p;
      g.sector(0, -O, w * 0.7, A + O, 1.2, 3.2, g.p.cut, "h");
      const m = X * 0.6;
      g.sector(w * 0.34, m - H * 0.5, w * 0.94, X + O, -1, 1.7, "h", g.p.cut);
      g.sector(w * 0.22, -O, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // ჲ: a ring over crossed legs on a base bar.
    hie: ["ჲ", "SS", 480, (g, w) => {
      const X = gx(g.p);
      const { O } = g.p;
      g.ring(w * 0.1, X * 0.32, w * 0.9, X + O);
      diag(g, w * 0.28, X * 0.38, w * 0.82, g.p.H * 0.5);
      diag(g, w * 0.72, X * 0.38, w * 0.18, g.p.H * 0.5);
      foot(g, 0, w, 0);
    }],
    // ჳ: a bar at the x-height, a diagonal, and a bowl dropping into the descender.
    we: ["ჳ", "RR", 450, (g, w) => {
      const X = gx(g.p);
      const { D, O, S, H } = g.p;
      bar(g, w * 0.1, w, X);
      diag(g, w - S * 0.6, X - H, w * 0.34, X * 0.36);
      g.sector(0, D - O, w, X * 0.42, 2.3, 5, g.p.cut, "v");
    }],
    // ჴ: a tall S from the ascender to the descender.
    har: ["ჴ", "RR", 440, (g, w) => {
      const X = gx(g.p);
      const { A, D, O, H } = g.p;
      const m = X * 0.52;
      g.sector(w * 0.06, m - H * 0.5, w * 0.9, A + O, 0.55, 3, g.p.cut, "v");
      g.sector(0, D - O, w, m + H * 0.5, 2.3, 5, g.p.cut, "v");
    }],
    // ჵ: a ring with a bar through its right half and a hook rising to the ascender.
    hoe: ["ჵ", "RR", 520, (g, w) => {
      const X = gx(g.p);
      const { A, O, S } = g.p;
      const r = Math.max(S * 1.1, w * 0.22);
      g.ring(0, -O, w * 0.84, X * 0.84);
      bar(g, w * 0.46, w, X * 0.42 + g.p.H * 0.5);
      stem(g, w * 0.84 - S, X * 0.5, A - r);
      hookTop(g, w * 0.84 - S, A, r, -1);
    }],
    // ჶ: a ring with a stem through it from the ascender to the descender.
    fi: ["ჶ", "RR", 600, (g, w) => {
      const X = gx(g.p);
      const { A, D, O, S } = g.p;
      g.ring(0, -O, w, X + O);
      stem(g, w * 0.5 - S * 0.5, D, A);
    }],
    // ჷ: a hooked top swinging down into a bowl in the descender.
    yn: ["ჷ", "RR", 440, (g, w) => {
      const X = gx(g.p);
      const { D, O, H } = g.p;
      const m = X * 0.4;
      g.sector(w * 0.08, m - H * 0.5, w * 0.92, X + O, 0.3, 2.7, g.p.cut, "v");
      g.sector(0, D - O, w, m + H * 0.5, -1.7, 1, g.p.cut, "v");
    }],
    // ჸ: a ყ with a flick off the top of its left side.
    elifi: ["ჸ", "SS", 460, (g, w) => {
      const X = gx(g.p);
      const { D, S, O, H } = g.p;
      const r = Math.max(S * 1.15, w * 0.3);
      cup(g, 0, w, X * 0.28, X * 0.8, X);
      stem(g, w - S, D + r - O - 6, X * 0.5);
      hookBottom(g, w - S, D, r, -1, 1.7);
      flick(g, S * 0.3, X * 0.8, w * 0.3, X - H * 0.4, H);
    }],
    // ჹ: a ring with a tail from its lower left into the descender, curled right.
    turnedGan: ["ჹ", "RR", 470, (g, w) => {
      const X = gx(g.p);
      const { D, O } = g.p;
      g.ring(w * 0.1, X * 0.18, w, X + O);
      g.sector(0, D - O, w * 0.8, X * 0.6, 2, 3.75, "h", g.p.cut);
    }],
    // ჺ: a c with a stroke off its foot down into the descender.
    ain: ["ჺ", "RR", 420, (g, w) => {
      const X = gx(g.p);
      const { D, O, S, ap } = g.p;
      g.sector(0, -O, w * 0.92, X + O, ap, 4 - ap * 0.3);
      diag(g, w * 0.8, X * 0.14, w * 0.3, D * 0.7, S * 0.85);
    }],
  };
  for (const [name, [ch, sides, width, draw]] of Object.entries(GE)) add(`geo_${name}`, ch, sides, width, draw);
  latin("geo_khan", "ხ", "b");
  add("geo_paragraphSeparator", "჻", "SS", 300, (g, w) => {
    const X = gx(g.p);
    g.dot(g.p.S * 0.6, X * 0.82);
    g.dot(g.p.S * 0.6, X * 0.12);
    g.dot(w - g.p.S * 0.6, X * 0.47);
  });

  /* ================================================================ Hebrew */

  /** The Hebrew letter height: between the x-height and the cap height. */
  const hh = (p) => Math.round(p.X + (p.C - p.X) * 0.45);
  /** A rounded corner where a top bar turns down into a right stem at x. */
  function corner(g, x0, xr, top) {
    const { S, H } = g.p;
    const r = Math.max(S * 1.2, Math.min(140, (xr - x0) * 0.4));
    g.sector(xr + S - 2 * r, top - 2 * r + g.p.O * 0.4, xr + S, top + g.p.O * 0.4, 0, 1, "h", "v");
    g.rect(x0, top - H, xr + S - r + 4, top);
    g.rect(xr, 0, xr + S, top - r + 4);
  }

  const HE = {
    // א: a long diagonal with an arm up on the right and a leg down on the left.
    alef: ["א", "DD", 560, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      // Steep arm and leg that meet the long diagonal rather than cross it, so the letter never
      // reads as an X.
      diag(g, S * 0.55, T, w - S * 0.55, 0);
      diag(g, w * 0.86, T, w * 0.66, T * 0.4);
      diag(g, w * 0.38, T * 0.6, w * 0.17, 0);
    }],
    // ב: a top bar turning down, standing on a base that runs past it.
    bet: ["ב", "SS", 480, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, 0, w - S * 1.6, T);
      foot(g, 0, w, 0);
    }],
    // ג: a short top bar turning down, with a leg off its foot to the left.
    gimel: ["ג", "SS", 380, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, w * 0.18, w - S, T);
      diag(g, w - S * 0.6, T * 0.36, S * 0.55, 0);
    }],
    // ד: a top bar running past a right stem.
    dalet: ["ד", "SS", 470, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      const xs = w - S * 1.6;
      bar(g, 0, w, T);
      stem(g, xs, 0, T);
    }],
    // ה: a ד with a detached left leg.
    he: ["ה", "SS", 500, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, 0, w - S, T);
      stem(g, 0, 0, T * 0.62);
    }],
    // ו: a stem with a short arm at its top left.
    vav: ["ו", "SS", 220, (g, w0) => {
      const w = narrow(g, w0, 220);
      const T = hh(g.p);
      const { S } = g.p;
      stem(g, w - S, 0, T);
      bar(g, 0, w, T);
    }],
    // ז: a top bar with a stem from its middle.
    zayin: ["ז", "SS", 300, (g, w0) => {
      const w = narrow(g, w0, 300);
      const T = hh(g.p);
      const { S } = g.p;
      bar(g, 0, w, T);
      stem(g, w * 0.5 - S * 0.5, 0, T);
    }],
    // ח: a top bar on two legs.
    het: ["ח", "SS", 500, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, 0, w - S, T);
      stem(g, 0, 0, T);
    }],
    // ט: a u whose left side curls in at the top.
    tet: ["ט", "SS", 500, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      cup(g, 0, w, 0, T * 0.72, T);
      diag(g, S * 0.5, T * 0.72, w * 0.5, T * 0.44);
    }],
    // י: a small hooked stroke hanging from the letter height.
    yod: ["י", "SS", 200, (g, w0) => {
      const w = narrow(g, w0, 200);
      const T = hh(g.p);
      const { S } = g.p;
      stem(g, w - S, T * 0.5, T);
      bar(g, 0, w, T);
    }],
    // ך: a top bar turning down into a stem to the descender.
    finalKaf: ["ך", "SS", 440, (g, w) => {
      const T = hh(g.p);
      const { S, D } = g.p;
      corner(g, 0, w - S, T);
      stem(g, w - S, D, T * 0.5);
    }],
    // כ: a bowl open to the left, flat at the top and the base.
    kaf: ["כ", "SR", 450, (g, w) => {
      const T = hh(g.p);
      const { S, O } = g.p;
      g.sector(w * 0.2 - S, -O, w, T + O * 0.4, -1, 1, "v", "v");
      g.rect(0, T - g.p.H, w * 0.6, T);
      foot(g, 0, w * 0.6, 0);
    }],
    // ל: a stem from the ascender, a bar at the letter height, and a stroke down to the left.
    lamed: ["ל", "SS", 440, (g, w) => {
      const T = hh(g.p);
      const { S, A, H } = g.p;
      stem(g, 0, T * 0.72, A);
      bar(g, 0, w, T * 0.72 + H * 0.5);
      diag(g, w - S * 0.55, T * 0.72, w * 0.32, 0);
    }],
    // ם: a closed square.
    finalMem: ["ם", "SS", 490, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, 0, w - S, T);
      stem(g, 0, 0, T);
      foot(g, 0, w, 0);
    }],
    // מ: a top bar turning down, a base, and a left stroke that leaves a gap at the bottom.
    mem: ["מ", "SS", 520, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, w * 0.22, w - S, T);
      foot(g, w * 0.36, w, 0);
      diag(g, S * 0.55, T, w * 0.2, T * 0.2);
    }],
    // ן: a stem from the letter height to the descender with an arm at its top.
    finalNun: ["ן", "SS", 220, (g, w0) => {
      const w = narrow(g, w0, 220);
      const T = hh(g.p);
      const { S, D } = g.p;
      stem(g, w - S, D, T);
      bar(g, 0, w, T);
    }],
    // נ: a narrow top bar turning down onto a base.
    nun: ["נ", "SS", 320, (g, w0) => {
      const w = narrow(g, w0, 320);
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, w * 0.3, w - S, T);
      foot(g, 0, w, 0);
    }],
    // ס: a ring flat at the top.
    samekh: ["ס", "RR", 500, (g, w) => {
      const T = hh(g.p);
      const { O } = g.p;
      g.ring(0, -O, w, T);
      bar(g, 0, w * 0.5, T);
    }],
    // ע: two strokes down to the left, the right one long, standing on a short base.
    ayin: ["ע", "DD", 500, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      // The left stroke ends on the long right one instead of crossing it.
      const x0 = w - S * 0.55;
      const x1 = S * 0.9;
      const meet = 0.4;
      diag(g, x0, T, x1, 0);
      diag(g, S * 0.55, T, x1 + (x0 - x1) * meet, T * meet);
      foot(g, 0, w * 0.42, 0);
    }],
    // ף: a ך with a curl hanging inside its top.
    finalPe: ["ף", "SS", 460, (g, w) => {
      const T = hh(g.p);
      const { S, D } = g.p;
      corner(g, 0, w - S, T);
      stem(g, w - S, D, T * 0.5);
      stem(g, 0, T * 0.5, T);
      bar(g, 0, w * 0.34, T * 0.5 + g.p.H * 0.5);
    }],
    // פ: a כ with a curl hanging inside its top.
    pe: ["פ", "SR", 470, (g, w) => {
      const T = hh(g.p);
      const { S, O } = g.p;
      g.sector(w * 0.2 - S, -O, w, T + O * 0.4, -1, 1, "v", "v");
      g.rect(0, T - g.p.H, w * 0.6, T);
      foot(g, 0, w * 0.6, 0);
      stem(g, 0, T * 0.48, T);
      bar(g, 0, w * 0.36, T * 0.48 + g.p.H * 0.5);
    }],
    // ץ: a stem to the descender with an arm reaching up and to the left.
    finalTsadi: ["ץ", "SS", 460, (g, w) => {
      const T = hh(g.p);
      const { S, D } = g.p;
      stem(g, w - S, D, T);
      diag(g, S * 0.55, T, w - S * 0.6, T * 0.36);
    }],
    // צ: a stroke from the top left down to a base, with a short arm up on the right.
    tsadi: ["צ", "SS", 480, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      diag(g, S * 0.55, T, w * 0.66, g.p.H * 0.5);
      diag(g, w - S * 0.55, T, w * 0.64, T * 0.46);
      foot(g, 0, w, 0);
    }],
    // ק: a top bar turning down short of the base, with a left stem dropping to the descender.
    qof: ["ק", "SS", 500, (g, w) => {
      const T = hh(g.p);
      const { S, D } = g.p;
      corner(g, 0, w - S, T);
      g.rect(w - S, 0, w, T * 0.3);
      stem(g, w * 0.06, D, T * 0.62);
    }],
    // ר: a top bar turning down into a right stem.
    resh: ["ר", "SS", 440, (g, w) => {
      const T = hh(g.p);
      corner(g, 0, w - g.p.S, T);
    }],
    // ש: a u with a third stroke from the middle.
    shin: ["ש", "SS", 600, crowded((g, w) => {
      const T = hh(g.p);
      cup(g, 0, w, 0, T, T);
      diag(g, w * 0.52, T, w * 0.44, T * 0.3);
    })],
    // ת: a top bar turning down, and a left leg with a foot to the left.
    tav: ["ת", "SS", 520, (g, w) => {
      const T = hh(g.p);
      const { S } = g.p;
      corner(g, 0, w - S, T);
      stem(g, w * 0.18, 0, T);
      foot(g, 0, w * 0.18 + S, 0);
    }],
  };
  for (const [name, [ch, sides, width, draw]] of Object.entries(HE)) add(`heb_${name}`, ch, sides, width, draw);

  // Hebrew punctuation: maqaf (a hyphen at the letter height), paseq, sof pasuq, geresh, gershayim.
  add("heb_maqaf", "־", "SS", 300, (g, w) => {
    const T = hh(g.p);
    g.rect(0, T - g.p.H * 1.6, w, T - g.p.H * 0.6);
  });
  add("heb_paseq", "׀", "SS", 120, (g) => stem(g, 0, g.p.D * 0.5, hh(g.p) + 80));
  add("heb_sofPasuq", "׃", "SS", 150, (g) => {
    g.dot(g.p.S * 0.6, hh(g.p) - 60);
    g.dot(g.p.S * 0.6, 60);
  });
  add("heb_geresh", "׳", "SS", 150, (g, w0) => {
    const w = narrow(g, w0, 150);
    flick(g, w, hh(g.p) + 40, 0, hh(g.p) - 140, g.p.S * 0.85);
  });
  add("heb_gershayim", "״", "SS", 300, (g, w0) => {
    const w = narrow(g, w0, 300);
    flick(g, w * 0.4, hh(g.p) + 40, 0, hh(g.p) - 140, g.p.S * 0.85);
    flick(g, w, hh(g.p) + 40, w * 0.6, hh(g.p) - 140, g.p.S * 0.85);
  });

  return out;
}

/** Kerning pairs this module adds: [left, right, units]. */
export const kerning = [];
