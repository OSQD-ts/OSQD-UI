// The "latin" glyph module: the rest of Latin-1, Latin Extended-A, the Extended-B letters
// European languages use (Ș ș Ț ț Ə ə Ǎ ǎ Ǐ ǐ Ǒ ǒ Ǔ ǔ Ơ ơ Ư ư), Vietnamese and Welsh from
// Latin Extended Additional, and the punctuation, currency and maths signs UI text meets.
//
// Most letters are composites: Unicode's own decomposition (NFD) says which base letter and
// which marks a character is, and each mark is drawn here from the font's numbers, so every
// accent follows the weight, the family and the width of the letter under it. The few letters
// with no decomposition (Æ ß Ð ð Þ þ Ø ø Œ œ Ŋ ŋ ĸ ſ Ə ə and the barred ones) and the symbols
// are drawn below by hand, with the same pen and the same primitives as glyphs.mjs.
//
// glyphs(api) returns [{ name, unicode, sides, width, draw, accent? }]. Whatever `accent` draws
// sits outside the spacing (as marks do); anything that must widen the letter (a horn, the
// apostrophe of ď, a bar overhanging a stem) is drawn by `draw` instead.

export const id = "latin";

/** Combining marks this module draws, by code point, as they come out of NFD. */
const MARKS = {
  "̀": "grave",
  "́": "acute",
  "̂": "circumflex",
  "̃": "tilde",
  "̄": "macron",
  "̆": "breve",
  "̇": "dotabove",
  "̈": "dieresis",
  "̉": "hook",
  "̊": "ring",
  "̋": "dblacute",
  "̌": "caron",
  "̛": "horn",
  "̣": "dotbelow",
  "̦": "commabelow",
  "̧": "cedilla",
  "̨": "ogonek",
};
const BELOW = new Set(["dotbelow", "commabelow", "cedilla", "ogonek"]);

/** Already in the base table (glyphs.mjs). */
const IN_BASE = new Set([..."ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"]);

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i));

/** Every letter this module covers, in code point order. */
const LETTERS = [
  ...range(0xc0, 0xff).filter((ch) => ch !== "×" && ch !== "÷"),
  ...range(0x100, 0x17f),
  "Ə", "ə", "Ơ", "ơ", "Ư", "ư",
  ...range(0x1cd, 0x1d4),
  ...range(0x218, 0x21b),
  ...range(0x1e80, 0x1e85),
  ...range(0x1ea0, 0x1ef9),
].filter((ch) => !IN_BASE.has(ch));

const nameOf = (ch) => `uni${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;

/* ------------------------------------------------------------------ a pen of our own */

/** The same pen glyphs.mjs draws with, for drawing into a scratch list (or with other numbers). */
function subPen(api, p = api.p) {
  const { rect, stroke, bar, polygon, ring, sector, disc, bbox } = api.geom;
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
    sector: (x0, y0, x1, y1, q0, q1, c0 = p.cut, c1 = c0, sx = p.S, sy = p.H, k = p.k) =>
      add(sector(x0, y0, x1, y1, sx, sy, k, q0 - 0.02, q1 + 0.02, c0, c1, k === p.k ? p.kin : k + 0.03)),
    dot: (cx, cy, d = p.S * 1.12) => {
      if (p.dot === "round") add(disc(cx - d * 0.56, cy - d * 0.56, cx + d * 0.56, cy + d * 0.56));
      else add(rect(cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2));
    },
    mark: () => {
      g.base = bbox(contours);
    },
    base: null,
  };
  return g;
}

/** Contours moved by (dx, dy), and optionally scaled about the origin first. */
const moved = (api, contours, dx, dy, s = 1, sy = s) => api.geom.transform(contours, ([x, y]) => [Math.round((x * s + dx) * 10) / 10, Math.round((y * sy + dy) * 10) / 10]);

/** A drawing done at heavier numbers and scaled down, so small signs keep a readable stroke. */
function small(api, draw, scale, weight = 1.3) {
  const { p } = api;
  const heavy = { ...p, S: p.S * weight, H: p.H * weight };
  const sp = subPen(api, heavy);
  draw(sp);
  return api.geom.transform(sp.contours, ([x, y]) => [x * scale, y * scale]);
}

/** Keeps a wide sign inside a monospaced cell by narrowing it (strokes thin a little). */
function fitMono(api, draw) {
  return (g, w) => {
    const n0 = g.contours.length;
    draw(g, w);
    if (!g.p.mono) return;
    const fresh = g.contours.slice(n0);
    const b = api.geom.bbox(fresh);
    const room = g.p.monoAdvance - 70;
    if (b.x1 - b.x0 <= room) return;
    const k = room / (b.x1 - b.x0);
    g.contours.splice(n0, fresh.length, ...api.geom.transform(fresh, ([x, y]) => [b.x0 + (x - b.x0) * k, y]));
  };
}

/* ------------------------------------------------------------------ marks */

// Each mark draws between y0 and y0 + h, centred on cx. A single mark above a lowercase letter
// starts 40 units over the x-height and is 150 tall at most, the acute of the Polish letters;
// over a capital it starts at the cap height plus 30. Two stacked marks (Vietnamese) are each
// drawn smaller, so the pair stays inside the line.

function acute(g, cx, y0, h = 150) {
  const { S } = g.p;
  const s = h / 150;
  g.bar(cx - S * 0.55 * s, y0, cx + S * 0.95 * s, y0 + h, S * 0.9 * (0.75 + 0.25 * s));
}

function grave(g, cx, y0, h = 150) {
  const { S } = g.p;
  const s = h / 150;
  g.bar(cx + S * 0.55 * s, y0, cx - S * 0.95 * s, y0 + h, S * 0.9 * (0.75 + 0.25 * s));
}

function dblacute(g, cx, y0, h = 150) {
  const { S } = g.p;
  const s = h / 150;
  const off = S * 0.8 + 6;
  for (const x of [cx - off + S * 0.2, cx + off + S * 0.2]) g.bar(x - S * 0.45 * s, y0, x + S * 0.55 * s, y0 + h, S * 0.8 * (0.75 + 0.25 * s));
}

/** A ^ (or a v when `down`) with a flat top cut and feet cut level, stroke t. */
function chevron(g, cx, y0, h, a, t, down = false) {
  const len = Math.hypot(a, h);
  const ht = (t * len) / h; // the horizontal width of the stroke where it is cut level
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
}

const markWidth = (g) => 66 + g.p.S * 0.52;

function circumflex(g, cx, y0, h = 128) {
  chevron(g, cx, y0, h, markWidth(g), g.p.S * 0.82);
}

function caron(g, cx, y0, h = 128) {
  chevron(g, cx, y0, h, markWidth(g), g.p.S * 0.82, true);
}

function breve(g, cx, y0, h = 110) {
  const { S, H } = g.p;
  const a = markWidth(g);
  g.sector(cx - a, y0, cx + a, y0 + 2 * h, 2, 4, "h", "h", S * 0.78, H * 0.85, 0.5523);
}

function macron(g, cx, y0) {
  const { H } = g.p;
  const a = markWidth(g) + 6;
  g.rect(cx - a, y0 + 18, cx + a, y0 + 18 + H * 0.95);
}

function tilde(g, cx, y0, h = 96) {
  const { H } = g.p;
  const a = markWidth(g) + 14;
  const t = H * 0.95;
  const amp = Math.max(14, (h - t) / 2);
  const yc = y0 + h / 2;
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

function ring(g, cx, y0, h = 150) {
  const { S } = g.p;
  // The hole needs room at every weight: the stroke grows slower than the stem, the ring with it.
  const sx = Math.min(S * 0.55, 26 + S * 0.28);
  const r = Math.max(sx + 30, Math.min(h / 2, sx + 40));
  g.ring(cx - r, y0, cx + r, y0 + 2 * r, sx, sx * 0.92, 0.5523);
}

function dotabove(g, cx, y0) {
  g.dot(cx, y0 + 30 + g.p.S * 0.56, g.p.S * 1.12);
}

function dieresis(g, cx, y0) {
  const { S } = g.p;
  const dx = Math.max(S * 0.56 + 44, 92);
  g.dot(cx - dx, y0 + 30 + S * 0.56, S * 1.12);
  g.dot(cx + dx, y0 + 30 + S * 0.56, S * 1.12);
}

/** The Vietnamese hook above: a small question-mark curl on a short stem. */
function hook(g, cx, y0, h = 132) {
  const { S, H } = g.p;
  const sx = S * 0.62;
  const rx = sx + 30;
  const yb = y0 + h * 0.4;
  g.sector(cx - rx, yb, cx + rx, y0 + h, 3.0, 5.62, "h", g.p.cut, sx, H * 0.8, 0.5523);
  g.rect(cx - sx / 2, y0, cx + sx / 2, yb + sx * 0.3);
}

function dotbelow(g, cx) {
  g.dot(cx, -(64 + g.p.S * 0.56));
}

/** A comma under the baseline (Romanian, Latvian): dot and tail, kept within the descender. */
function commabelow(g, cx) {
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
}

function cedilla(g, cx) {
  const { S, H } = g.p;
  const t = S * 0.74;
  const r = 66 + S * 0.15;
  const top = -86;
  // Kept inside the line's descender at every weight.
  const bot = top - 2 * (54 + S * 0.17);
  g.rect(cx - t / 2, top - 6, cx + t / 2, 16);
  g.sector(cx - r, bot, cx + r, top + H * 0.4, 3.0, 5.0, "h", "h", t, H * 0.78, 0.5523);
}

/** An apostrophe-like comma to the right of an ascender: ď ť ľ Ľ. */
function apostrophe(api, g, x, top) {
  const sp = subPen(api);
  api.sym.quoteright[2](sp);
  const b = api.geom.bbox(sp.contours);
  g.add(moved(api, sp.contours, x - b.x0, top - b.y1));
}

/** A turned comma above (Latvian ģ). */
function turnedComma(api, g, cx, y0) {
  const sp = subPen(api);
  api.sym.quoteleft[2](sp);
  const b = api.geom.bbox(sp.contours);
  const k = 0.82;
  g.add(moved(api, sp.contours, cx - ((b.x0 + b.x1) / 2) * k, y0 - b.y0 * k, k));
}

const DRAW_ABOVE = { acute, grave, dblacute, circumflex, caron, breve, macron, tilde, ring, dotabove, dieresis, hook };
/** Mark heights for a single mark; the stacked ones scale these. */
const HEIGHT = { acute: 150, grave: 150, dblacute: 150, circumflex: 128, caron: 128, breve: 110, macron: 70, tilde: 96, ring: 150, dotabove: 120, dieresis: 120, hook: 132 };

/* ------------------------------------------------------------------ composites */

/** The same pen with lighter numbers, for marks drawn smaller than usual. */
function thinned(g, f) {
  const t = Object.create(g);
  t.p = { ...g.p, S: g.p.S * f, H: g.p.H * f };
  return t;
}

/** The pen for two marks together past Bold: their stroke grows at half the stem's pace. */
function heavyMarks(g) {
  const S = g.p.S;
  return S > 130 ? thinned(g, (130 + (S - 130) * 0.5) / S) : g;
}

/** A base drawing without what it draws after mark(): the dot of i and j. */
function dotless(draw) {
  return (g, w) => {
    const keep = g.mark;
    let n = null;
    g.mark = () => {
      n = g.contours.length;
    };
    draw(g, w);
    g.mark = keep;
    if (n !== null) g.contours.length = n;
    g.base = null;
  };
}

/** Adds a horn to the top right of o, u, O, U, remembering the letter's own box for the marks. */
function withHorn(api, draw, upper) {
  return (g, w) => {
    draw(g, w);
    const b = api.geom.bbox(g.contours);
    g.vbox = b;
    const { S } = g.p;
    const top = upper ? g.p.C : g.p.X;
    const x = b.x1 - S * (upper ? 0.5 : 0.25);
    g.bar(x, top - S * 0.35, x + S * 0.95 + 18, top + S * 0.75 + 30, S * 0.86);
  };
}

function composite(api, ch) {
  const nfd = ch.normalize("NFD");
  const baseCh = nfd[0];
  const marks = [...nfd.slice(1)].map((m) => MARKS[m]);
  if (marks.length === 0 || marks.some((m) => m === undefined)) return undefined;
  const def = api.defs[baseCh];
  if (!def) return undefined;
  const { p } = api;
  const [sides, width, draw0] = def;
  const upper = baseCh !== baseCh.toLowerCase();
  const above = marks.filter((m) => !BELOW.has(m) && m !== "horn");
  const below = marks.filter((m) => BELOW.has(m));
  let draw = draw0;
  if ((baseCh === "i" || baseCh === "j") && above.length > 0) draw = dotless(draw0);
  if (marks.includes("horn")) draw = withHorn(api, draw, upper);
  // ď ť ľ Ľ take an apostrophe beside the ascender instead of a caron over it.
  const sideCaron = above.length === 1 && above[0] === "caron" && "dtlL".includes(baseCh);
  if (sideCaron) {
    const inner = draw;
    draw = (g, w) => {
      inner(g, w);
      const b = api.geom.bbox(g.contours);
      const { S } = g.p;
      if (baseCh === "t") apostrophe(api, g, b.x0 + w * 0.24 + S + 34, p.X + (p.A - p.X) * 0.4 + 40);
      else if (baseCh === "d") apostrophe(api, g, b.x1 + 34, p.A + 10);
      else if (baseCh === "l") apostrophe(api, g, (g.stemX ?? b.x0 + S / 2) + S / 2 + 34, p.A + 10);
      else apostrophe(api, g, b.x0 + S + 40, p.C);
    };
  }
  const tall = "bdhkl".includes(baseCh);
  const accent = (g, b0) => {
    const b = g.vbox ?? b0;
    const { S } = g.p;
    let cx = (b.x0 + b.x1) / 2;
    if (baseCh === "l") cx = g.stemX ?? b.x0 + S / 2;
    if (baseCh === "L" || baseCh === "Ł") cx = b.x0 + S / 2 + 30;
    if (baseCh === "h" && !g.p.mono) cx = b.x0 + S / 2 + 20;
    if (!sideCaron && above.length > 0) {
      const y0 = upper ? g.p.C + 30 : (tall ? g.p.A : g.p.X) + 40;
      if (above.length === 1) {
        const m = above[0];
        // Over an ascender (ĥ ĺ) the mark is shorter, or it leaves the line at heavy weights.
        if (m === "ring" && upper) ring(g, cx, g.p.C + 18, HEIGHT.ring);
        else DRAW_ABOVE[m](g, cx, tall ? g.p.A + 30 : y0, HEIGHT[m] * (tall ? 0.78 : 1));
      } else if (above[0] === "circumflex" && ["acute", "grave", "hook"].includes(above[1])) {
        // Vietnamese sets the tone of â ê ô beside the circumflex, up on its right: stacked, the
        // pair would not fit the line, and the tone would sit too small to read. Past Bold both
        // marks keep a lighter stroke (gm), or at Black they run together into one shape.
        const gm = heavyMarks(g);
        const Sm = gm.p.S;
        const hc = HEIGHT.circumflex * (upper ? 0.82 : 0.92);
        const yc = upper ? g.p.C + 24 : y0;
        circumflex(gm, cx, yc, hc);
        const t = thinned(gm, upper ? 0.84 : 0.9);
        const ht = HEIGHT[above[1]] * (upper ? 0.62 : 0.72);
        const xt = cx + markWidth(gm) + Sm * (above[1] === "grave" ? 0.75 : above[1] === "hook" ? 0.65 : 0.35);
        DRAW_ABOVE[above[1]](t, xt, yc + hc * 0.42, ht);
      } else {
        // Two marks stacked (ẫ, ắ ằ ẳ ẵ ặ): each smaller and lighter, a small gap between — and
        // past Bold lighter still (gm), with the gap growing, so the pair stays two marks.
        const gm = heavyMarks(g);
        const k = upper ? 0.64 : 0.78;
        const t = thinned(gm, upper ? 0.74 : 0.82);
        let y = upper ? g.p.C + 20 : y0;
        for (const m of above) {
          const h = HEIGHT[m] * k;
          DRAW_ABOVE[m](t, cx, y, h);
          y += h + (upper ? 12 : 18) + Math.max(0, g.p.S - 130) * 0.2;
        }
      }
    }
    for (const m of below) {
      if (m === "dotbelow") dotbelow(g, cx);
      else if (m === "commabelow") commabelow(g, cx);
      else if (m === "ogonek") api.accents.ogonek(g, baseCh === "i" || baseCh === "I" ? cx + 18 : upper ? b.x1 - 50 : b.x1 - 18);
      else if (m === "cedilla") {
        // Latvian letters take a comma below; the g takes a turned comma above.
        if (baseCh === "g") turnedComma(api, g, cx, g.p.X + 40);
        else if ("klnrKLNRG".includes(baseCh)) commabelow(g, baseCh === "l" ? cx : baseCh === "k" || baseCh === "K" || baseCh === "L" ? b.x0 + S / 2 + 10 : cx);
        else cedilla(g, cx);
      }
    }
  };
  const wd = width || (baseCh === "j" ? 240 : p.S);
  return { name: nameOf(ch), unicode: ch, sides, width: wd, draw, accent };
}

/* ------------------------------------------------------------------ letters by hand */

function handLetters(api) {
  const { defs } = api;
  const { bbox } = api.geom;
  const out = [];
  const add = (ch, sides, width, draw, accent) => out.push({ name: nameOf(ch), unicode: ch, sides, width, draw, accent });
  /** Draws another letter's drawing into g, moved by dx. */
  const put = (g, ch, w, dx = 0, dy = 0) => {
    // Two letters in one monospaced cell are each half as wide: drawn lighter, or they fill in.
    const sp = subPen(api, g.p.mono ? { ...g.p, S: g.p.S * 0.72, H: g.p.H * 0.8 } : g.p);
    defs[ch][2](sp, w);
    g.add(moved(api, sp.contours, dx, dy));
    return bbox(sp.contours);
  };
  const plus = (ch, extra) => (g, w) => {
    defs[ch][2](g, w);
    extra(g, w, bbox(g.contours));
  };

  add("Æ", "DS", 820, (g, w) => {
    const { C, S, H } = g.p;
    const xs = w * 0.44;
    const t = S * 0.98;
    g.stroke((t / 2) * 1.08, 0, xs + S * 0.4, C, t);
    g.rect(xs, 0, xs + S, C);
    g.rect(xs, C - H, w, C);
    g.rect(xs, C * 0.48 - H / 2, w * 0.94, C * 0.48 + H / 2);
    g.rect(xs, 0, w, H);
    g.rect(w * 0.16, C * 0.3 - H / 2, xs + 2, C * 0.3 + H / 2);
  });
  // Where the two letters share a stroke, it is the lighter one's in a mono cell.
  const shared = (g) => (g.p.mono ? g.p.S * 0.72 : g.p.S);
  add("æ", "RR", 700, (g, w) => {
    const f = g.p.mono ? 0.6 : 0.56;
    const ba = put(g, "a", Math.round(w * f));
    put(g, "e", Math.round(w * f), ba.x1 - shared(g) * 1.05);
  });
  add("Œ", "RS", 880, (g, w) => {
    const bo = put(g, "O", Math.round(w * (g.p.mono ? 0.6 : 0.62)));
    put(g, "E", Math.round(w * (g.p.mono ? 0.46 : 0.46)), bo.x1 - shared(g) * 1.02);
  });
  add("œ", "RR", 720, (g, w) => {
    const f = g.p.mono ? 0.58 : 0.54;
    const bo = put(g, "o", Math.round(w * f));
    put(g, "e", Math.round(w * f), bo.x1 - shared(g) * 1.05);
  });
  const barD = (g, _w, b) => {
    const { C, H, S } = g.p;
    g.rect(b.x0 - 70, C * 0.48 - H / 2, b.x0 + S + 130, C * 0.48 + H / 2);
  };
  add("Ð", "SR", 540, plus("D", barD));
  add("Đ", "SR", 540, plus("D", barD));
  add("đ", "RS", 440, plus("d", (g, _w, b) => {
    const { S, H, X, A } = g.p;
    const y = X + (A - X) * 0.5;
    g.rect(b.x1 - S - 104, y - H / 2, b.x1 + 64, y + H / 2);
  }));
  add("ð", "RR", 456, (g, w) => {
    const { S, H, X, A, O } = g.p;
    g.ring(0, -O, w, X * 0.92 + O);
    g.stroke(w - S * 0.75, X * 0.62, w * 0.28, A + 6, S * 0.92);
    g.bar(w * 0.24, A - 196, w * 0.86, A - 92, H * 0.95);
  });
  add("Þ", "SR", 474, (g, w) => {
    const { C, S, H, k } = g.p;
    const kk = Math.min(0.9, k + 0.16);
    const y0 = C * 0.18;
    const y1 = C * 0.8;
    g.rect(0, 0, S, C);
    g.rect(0, y1 - H, w * 0.56, y1);
    g.rect(0, y0, w * 0.56, y0 + H);
    g.sector(0, y0, w, y1, 3, 5, "r", "r", S, H, kk);
  });
  add("þ", "SR", 440, (g, w) => {
    const { S, X, D, A, O } = g.p;
    g.rect(0, D, S, A);
    g.ring(0, -O, w, X + O);
  });
  add("ß", "SR", 470, (g, w) => {
    const { S, H, A, O, k } = g.p;
    const kk = Math.min(0.9, k + 0.16);
    // A stem rising into a top-left quarter, then two bowls down the right side, the upper
    // smaller, waisted where they meet; the lower ends in a short tail that stops short of the
    // stem, so the letter never closes into a B.
    const r1 = Math.max(w * 0.4, S * 2.05);
    const m = A * 0.54;
    const xR = w * 0.84;
    g.rect(0, 0, S, A - r1 + O);
    g.sector(0, A - 2 * r1 + O, 2 * r1, A + O, 1.0, 2.0, "r", "r", S, H, kk);
    g.sector(2 * r1 - xR, m - H * 0.15, xR, A + O, 3.0, 5.0, "r", "r", S * 0.94, H, kk);
    // The lower bowl ends at its foot, well clear of the stem: the open corner is the ß.
    g.sector(2 * r1 - w, -O, w, m + H * 0.65, 3.0, 5.0, "r", "r", S, H, kk);
  });
  add("ẞ", "SR", 540, (g, w) => {
    const { S, H, C, OC, k } = g.p;
    const kk = Math.min(0.9, k + 0.16);
    const xm = Math.max(w * 0.42, S * 2.1);
    const m = C * 0.58;
    g.rect(0, 0, S, C);
    g.rect(0, C - H, w * 0.8, C);
    g.stroke(w * 0.8 - S * 0.2, C - H * 0.5, xm, m, S * 0.92);
    g.sector(2 * xm - w, -OC, w, m + H * 0.6, 3.0, 5.0, "r", "r", S, H, kk);
  });
  const slash = (top) => (g, _w, b) => {
    const { S } = g.p;
    g.stroke(b.x0 + S * 0.15, b.y0 - 36, b.x1 - S * 0.15, top + 36, S * 0.8);
  };
  add("Ø", "RR", 610, plus("O", (g, w, b) => slash(b.y1)(g, w, b)));
  add("ø", "RR", 456, plus("o", (g, w, b) => slash(b.y1)(g, w, b)));
  add("ħ", "SS", 410, plus("h", (g, _w, b) => {
    const { S, H, X, A } = g.p;
    const y = X + (A - X) * 0.52;
    const sx = g.p.mono ? b.x0 : 0;
    g.rect(sx - 66, y - H / 2, sx + S + 110, y + H / 2);
  }));
  add("Ħ", "SS", 512, plus("H", (g, _w, b) => {
    const { C, H } = g.p;
    g.rect(b.x0 - 50, C * 0.76 - H / 2, b.x1 + 50, C * 0.76 + H / 2);
  }));
  add("ŧ", "NR", 276, plus("t", (g, w) => {
    const { S, H, X } = g.p;
    const xs = w * 0.24;
    g.rect(xs - 62, X * 0.46 - H / 2, xs + S + 62, X * 0.46 + H / 2);
  }));
  add("Ŧ", "NN", 520, plus("T", (g, w) => {
    const { C, S, H } = g.p;
    g.rect(w / 2 - S / 2 - 112, C * 0.46 - H / 2, w / 2 + S / 2 + 112, C * 0.46 + H / 2);
  }));
  add("ı", "SS", 0, dotless(defs.i[2]));
  add("ĸ", "SD", 380, (g, w) => {
    const { S, X } = g.p;
    g.rect(0, 0, S, X);
    const t = S * 0.92;
    const hw = (t / 2) * (Math.hypot(w - S, X * 0.65) / (X * 0.65));
    g.stroke(w - hw, X, S * 0.6 + hw, X * 0.3, t);
    g.stroke(S + w * 0.2, X * 0.5, w - hw, 0, t);
  });
  add("ŀ", "SS", 0, (g, w) => {
    defs.l[2](g, w);
    const b = bbox(g.contours);
    const x = g.p.mono ? b.x1 - g.p.S * 0.2 : b.x1 + 74;
    g.dot(x, g.p.X * 0.5);
  });
  add("Ŀ", "SS", 404, plus("L", (g, _w, b) => g.dot(b.x0 + g.p.S + 104, g.p.C * 0.46)));
  add("ŉ", "SS", 470, (g, w) => {
    const { S } = g.p;
    apostrophe(api, g, 0, g.p.C);
    put(g, "n", g.p.mono ? w * 0.72 : 410 * g.p.wf, g.p.mono ? w * 0.28 : S * 1.7);
  });
  const tail = (g, xr) => {
    const { S, D, O } = g.p;
    const hr = 140;
    g.rect(xr - S, D + hr - O - 8, xr, 14);
    g.sector(xr - 2 * hr, D - O, xr, D + 2 * hr, 2.6, 4.0, g.p.cut, "r");
  };
  add("ŋ", "SS", 410, plus("n", (g, _w, b) => tail(g, b.x1)));
  add("Ŋ", "SS", 530, plus("N", (g, _w, b) => tail(g, b.x1)));
  add("ſ", "DT", 230, (g, w) => {
    const { S, A, O } = g.p;
    const xs = w * 0.2;
    const r = Math.max(S * 1.25, g.p.mono ? Math.min(150, (w - xs) * 0.95) : 104 * (S / 84) ** 0.3);
    g.rect(xs, 0, xs + S, A + O - r + 6);
    g.sector(xs, A + O - 2 * r, xs + 2 * r, A + O, 0.5, 2.0, g.p.cut, "r");
  });
  add("ĳ", "SS", 330, (g, w) => {
    const { S, X, D, O } = g.p;
    const xa = g.p.mono ? w * 0.16 : 0;
    const xb = g.p.mono ? w * 0.66 : S + 196;
    g.rect(xa, 0, xa + S, X);
    g.dot(xa + S / 2, X + 130);
    const hr = 140;
    g.rect(xb, D + hr - O - 8, xb + S, X);
    g.sector(xb - 2 * hr + S, D - O, xb + S, D + 2 * hr, 2.6, 4.0, g.p.cut, "r");
    g.dot(xb + S / 2, X + 130);
  });
  add("Ĳ", "SS", 560, (g, w) => {
    const { S, C, OC } = g.p;
    if (g.p.mono) {
      g.rect(0, 0, S, C);
      const x = w - S;
      g.rect(x, w * 0.3, w, C);
      g.sector(w * 0.32, -OC, w, w * 0.6, 3.0, 4.0, g.p.cut, "r");
      return;
    }
    g.rect(0, 0, S, C);
    put(g, "J", 400 * g.p.wf, S + 90);
  });
  add("Ə", "RR", 600, (g) => {
    const { C, OC } = g.p;
    const sp = subPen(api, { ...g.p, X: C, O: OC });
    defs.e[2](sp, 560 * g.p.wf * (g.p.mono ? 0.82 : 1));
    const b = bbox(sp.contours);
    g.add(api.geom.transform(sp.contours, ([x, y]) => [b.x0 + b.x1 - x, b.y0 + b.y1 - y]));
  });
  add("ə", "RR", 426, (g, w) => {
    const sp = subPen(api, g.p);
    defs.e[2](sp, w);
    const b = bbox(sp.contours);
    g.add(api.geom.transform(sp.contours, ([x, y]) => [b.x0 + b.x1 - x, b.y0 + b.y1 - y]));
  });
  return out;
}

/* ------------------------------------------------------------------ signs */

function signs(api) {
  const { sym, figures } = api;
  const { bbox, transform, disc, polygon } = api.geom;
  const out = [];
  const add = (ch, sides, draw) => out.push({ name: nameOf(ch), unicode: ch, sides, width: 300, draw: fitMono(api, draw) });
  const axis = () => api.p.X * 0.48;
  const fromSym = (key) => {
    const sp = subPen(api);
    sym[key][2](sp, 300);
    return sp.contours;
  };
  const rotated = (contours) => {
    const b = bbox(contours);
    return transform(contours, ([x, y]) => [b.x0 + b.x1 - x, b.y0 + b.y1 - y]);
  };
  /** A figure at superscript size, its top at the cap height, its left edge at x. */
  const sup = (g, name, x, y = null, scale = 0.6) => {
    const fig = figures[name];
    const c = small(api, (sp) => fig[1](sp, 448), scale);
    const b = bbox(c);
    const top = y ?? g.p.C;
    g.add(moved(api, c, x - b.x0, top - b.y1));
    return b.x1 - b.x0;
  };
  const chev = (g, x, dir, h = 150, a = 170) => {
    const cy = api.p.X * 0.48;
    const t = api.p.S * 0.86;
    if (dir < 0) {
      g.bar(x + a, cy + h, x, cy, t);
      g.bar(x, cy, x + a, cy - h, t);
    } else {
      g.bar(x, cy + h, x + a, cy, t);
      g.bar(x + a, cy, x, cy - h, t);
    }
  };

  add("¡", "SS", (g) => {
    const c = rotated(fromSym("exclam"));
    const b = bbox(c);
    g.add(moved(api, c, -b.x0, g.p.X + 20 - b.y1));
  });
  add("¿", "NN", (g) => {
    const c = rotated(fromSym("question"));
    const b = bbox(c);
    g.add(moved(api, c, -b.x0, g.p.X + 20 - b.y1));
  });
  add("¢", "RR", (g) => {
    const { S, X } = g.p;
    const w = 380;
    api.defs.c[2](g, w);
    g.rect(w * 0.54 - S * 0.4, -112, w * 0.54 + S * 0.4, X + 112);
  });
  add("£", "NN", (g) => {
    const { S, H, C, OC } = g.p;
    const w = 470;
    const x = w * 0.2;
    const r = 132;
    g.rect(x, H - 2, x + S, C + OC - r + 4);
    g.sector(x, C + OC - 2 * r, x + 2 * r + 30, C + OC, 0.28, 2.0, g.p.cut, "r");
    g.rect(0, C * 0.44 - H / 2, w * 0.72, C * 0.44 + H / 2);
    g.rect(0, 0, w, H);
  });
  add("¤", "NN", (g) => {
    const { S, H } = g.p;
    const cx = 230;
    const cy = axis();
    const r = 128;
    g.ring(cx - r, cy - r, cx + r, cy + r, S * 0.8, H * 0.8, 0.5523);
    const t = S * 0.8;
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.bar(cx + dx * r * 0.62, cy + dy * r * 0.62, cx + dx * (r + 76), cy + dy * (r + 76), t);
  });
  add("¥", "NN", (g) => {
    const { C, H } = g.p;
    const w = 520;
    api.defs.Y[2](g, w);
    g.rect(w * 0.18, C * 0.36 - H / 2, w * 0.82, C * 0.36 + H / 2);
    g.rect(w * 0.18, C * 0.17 - H / 2, w * 0.82, C * 0.17 + H / 2);
  });
  add("¦", "SS", (g) => {
    const { S, D, A } = g.p;
    g.rect(0, D - 20, S * 0.95, 200);
    g.rect(0, 330, S * 0.95, A + 40);
  });
  add("§", "NN", (g) => {
    const { X } = g.p;
    const sp = subPen(api);
    api.defs.s[2](sp, 360);
    g.add(moved(api, sp.contours, 0, X * 0.58));
    g.add(moved(api, sp.contours, 0, -X * 0.12));
  });
  add("¨", "NN", (g) => dieresis(g, 140, g.p.X + 40));
  add("©", "NN", (g) => {
    const { S, H, C } = g.p;
    const d = C + 80;
    g.ring(0, -40, d, C + 40, S * 0.72, H * 0.72, 0.5523);
    const r = d * 0.25;
    const cx = d / 2;
    const cy = C / 2;
    g.sector(cx - r, cy - r * 1.08, cx + r, cy + r * 1.08, 0.42, 3.58, g.p.cut, g.p.cut, S * 0.72, H * 0.72);
  });
  add("ª", "NN", (g) => {
    const { C, H } = g.p;
    const c = small(api, (sp) => api.defs.a[2](sp, 418), 0.62);
    const b = bbox(c);
    g.add(moved(api, c, -b.x0, C - b.y1));
    g.rect(0, C * 0.4, b.x1 - b.x0, C * 0.4 + H * 0.85);
  });
  add("«", "NN", (g) => {
    chev(g, 0, -1);
    chev(g, 190, -1);
  });
  add("»", "NN", (g) => {
    chev(g, 0, 1);
    chev(g, 190, 1);
  });
  add("‹", "NN", (g) => chev(g, 0, -1));
  add("›", "NN", (g) => chev(g, 0, 1));
  add("¬", "NN", (g) => {
    const { S, H } = g.p;
    const cy = axis();
    g.rect(0, cy, 480, cy + H);
    g.rect(480 - S * 0.95, cy - 170, 480, cy + H);
  });
  add("®", "NN", (g) => {
    const { S, H, C } = g.p;
    const d = C + 80;
    g.ring(0, -40, d, C + 40, S * 0.72, H * 0.72, 0.5523);
    const c = small(api, (sp) => api.defs.R[2](sp, 496), 0.46, 1.5);
    const b = bbox(c);
    g.add(moved(api, c, d / 2 - (b.x0 + b.x1) / 2, C / 2 - (b.y0 + b.y1) / 2));
  });
  add("¯", "NN", (g) => macron(g, 130, g.p.X + 40));
  add("´", "NN", (g) => acute(g, 80, g.p.X + 40));
  add("¸", "NN", (g) => cedilla(g, 90));
  add("²", "NN", (g) => sup(g, "two", 0));
  add("³", "NN", (g) => sup(g, "three", 0));
  add("¹", "NN", (g) => sup(g, "one", 0));
  add("µ", "SS", (g) => {
    const { S, D, X } = g.p;
    api.defs.u[2](g, 410 * g.p.wf);
    g.rect(0, D, S, X * 0.5);
  });
  add("¶", "NN", (g) => {
    const { S, H, C, D } = g.p;
    const w = 470;
    const x1 = w * 0.48;
    const x2 = w * 0.8;
    g.rect(x1, D + 40, x1 + S * 0.9, C);
    g.rect(x2, D + 40, x2 + S * 0.9, C);
    g.rect(x1, C - H, x2 + S * 0.9, C);
    const y0 = C * 0.4;
    const ry = (C - y0) / 2;
    const cy = y0 + ry;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI / 2 + (Math.PI * i) / 24;
      pts.push([x1 + 2 + Math.cos(a) * (x1 + 2), cy + Math.sin(a) * ry]);
    }
    g.add(polygon(pts));
  });
  add("º", "NN", (g) => {
    const { C, H } = g.p;
    const c = small(api, (sp) => api.defs.o[2](sp, 456), 0.62);
    const b = bbox(c);
    g.add(moved(api, c, -b.x0, C - b.y1));
    g.rect(0, C * 0.4, b.x1 - b.x0, C * 0.4 + H * 0.85);
  });
  const fraction = (num, den) => (g) => {
    const { S, C } = g.p;
    const wn = sup(g, num, 0, C, 0.5);
    const xs = wn + 50;
    g.stroke(xs, -20, xs + 300, C + 20, S * 0.8);
    const c = small(api, (sp) => figures[den][1](sp, 448), 0.5);
    const b = bbox(c);
    g.add(moved(api, c, xs + 240 - b.x0, -b.y0));
  };
  add("¼", "NN", fraction("one", "four"));
  add("½", "NN", fraction("one", "two"));
  add("¾", "NN", fraction("three", "four"));
  add("‚", "SS", (g) => {
    const c = fromSym("quoteright");
    const b = bbox(c);
    g.add(moved(api, c, -b.x0, g.p.S * 1.2 - b.y1 + (b.y1 - b.y0) * 0.1 - 20));
  });
  add("‰", "NN", (g) => {
    const { S, H, C } = g.p;
    const s = S * 0.82;
    const w = 760;
    g.ring(0, C * 0.5, w * 0.36, C, s, H * 0.85);
    g.ring(w * 0.6, 0, w * 0.94, C * 0.5, s, H * 0.85);
    g.ring(w * 1.0, 0, w * 1.34, C * 0.5, s, H * 0.85);
    g.stroke(w * 0.76, C, w * 0.2, 0, S * 0.82);
  });
  add("†", "NN", (g) => {
    const { S, H, C, D } = g.p;
    const cx = 210;
    g.rect(cx - S * 0.45, D + 40, cx + S * 0.45, C);
    g.rect(cx - 170, C * 0.68 - H / 2, cx + 170, C * 0.68 + H / 2);
  });
  add("‡", "NN", (g) => {
    const { S, H, C, D } = g.p;
    const cx = 210;
    g.rect(cx - S * 0.45, D + 40, cx + S * 0.45, C);
    g.rect(cx - 170, C * 0.72 - H / 2, cx + 170, C * 0.72 + H / 2);
    g.rect(cx - 170, C * 0.12 - H / 2, cx + 170, C * 0.12 + H / 2);
  });
  const prime = (g, x) => {
    const { S, C } = g.p;
    g.poly([[x + S * 0.3, C], [x + S * 1.25, C], [x + S * 0.42, C * 0.6], [x - S * 0.12, C * 0.6]]);
  };
  add("′", "SS", (g) => prime(g, 0));
  add("″", "SS", (g) => {
    prime(g, 0);
    prime(g, g.p.S * 1.6);
  });
  add("™", "NN", (g) => {
    const { C } = g.p;
    const t = small(api, (sp) => api.defs.T[2](sp, 520), 0.42, 1.55);
    const bt = bbox(t);
    g.add(moved(api, t, -bt.x0, C - bt.y1));
    const m = small(api, (sp) => api.defs.M[2](sp, 652), 0.42, 1.55);
    const bm = bbox(m);
    g.add(moved(api, m, bt.x1 - bt.x0 + 40 - bm.x0, C - bm.y1));
  });
  add("№", "NN", (g) => {
    const { C, H } = g.p;
    const sp = subPen(api);
    api.defs.N[2](sp, 520);
    const bn = bbox(sp.contours);
    g.add(sp.contours);
    const o = small(api, (sp2) => api.defs.o[2](sp2, 456), 0.56);
    const bo = bbox(o);
    const x = bn.x1 + 50;
    g.add(moved(api, o, x - bo.x0, C - bo.y1));
    g.rect(x, C * 0.36, x + bo.x1 - bo.x0, C * 0.36 + H * 0.85);
  });
  add("∞", "NN", (g) => {
    const { S, H } = g.p;
    const cy = axis();
    const r = 128;
    const s = S * 0.82;
    g.ring(0, cy - r * 0.86, 2 * r + s * 0.3, cy + r * 0.86, s, H * 0.85, 0.5523);
    g.ring(2 * r - s * 0.7, cy - r * 0.86, 4 * r - s * 0.4, cy + r * 0.86, s, H * 0.85, 0.5523);
  });
  const wave = (g, yc) => {
    const { H } = g.p;
    const t = H * 1.0;
    const amp = 40;
    const len = 480;
    const n = 36;
    const top = [];
    const bot = [];
    for (let i = 0; i <= n; i++) {
      const x = (len * i) / n;
      const a = (Math.PI * 2 * i) / n;
      const yy = yc + amp * Math.sin(a);
      const dy = amp * Math.cos(a) * ((Math.PI * 2) / len);
      const nl = Math.hypot(1, dy);
      top.push([x - (dy / nl) * (t / 2), yy + (1 / nl) * (t / 2)]);
      bot.push([x + (dy / nl) * (t / 2), yy - (1 / nl) * (t / 2)]);
    }
    g.poly([...top, ...bot.reverse()]);
  };
  add("≈", "NN", (g) => {
    wave(g, axis() + 80);
    wave(g, axis() - 80);
  });
  add("≠", "NN", (g) => {
    sym.equal[2](g, 300);
    const cy = axis();
    g.stroke(330, cy + 220, 150, cy - 220, g.p.S * 0.85);
  });
  const cmp = (dir) => (g) => {
    const { S, H } = g.p;
    const cy = axis() + 70;
    const t = S * 0.9;
    if (dir < 0) {
      g.bar(440, cy + 170, 30, cy, t);
      g.bar(30, cy, 440, cy - 170, t);
    } else {
      g.bar(40, cy + 170, 450, cy, t);
      g.bar(450, cy, 40, cy - 170, t);
    }
    g.rect(30, cy - 250 - H, 450, cy - 250);
  };
  add("≤", "NN", cmp(-1));
  add("≥", "NN", cmp(1));
  add("−", "NN", (g) => {
    const cy = axis();
    g.rect(0, cy - g.p.H / 2, 480, cy + g.p.H / 2);
  });
  add("ℓ", "NN", (g) => {
    const { S, H, A, O } = g.p;
    const t = S * 0.86;
    // A narrow loop over a stem whose foot turns right, like a written l.
    const x = 70;
    const r = 118;
    g.ring(x, A * 0.38, x + 230, A + O, t * 0.82, H * 0.86);
    g.rect(x, r - 6, x + t, A * 0.7);
    g.sector(x, -O, x + 2 * r, 2 * r - O, 2.0, 3.62, "r", g.p.cut, t, H);
  });
  const currency = (base, w, bars) => (g) => {
    const sp = subPen(api);
    api.defs[base][2](sp, w);
    g.add(sp.contours);
    const b = bbox(sp.contours);
    for (const [y, x0, x1] of bars(g.p, b)) g.rect(x0, y - g.p.H * 0.45, x1, y + g.p.H * 0.45);
  };
  add("₽", "NN", currency("P", 474, (p, b) => [[p.C * 0.2, b.x0 - 70, b.x0 + p.S + 230]]));
  add("₱", "NN", currency("P", 474, (p, b) => [[p.C * 0.84, b.x0 - 70, b.x1 + 50], [p.C * 0.66, b.x0 - 70, b.x1 + 50]]));
  add("₩", "NN", currency("W", 780, (p, b) => [[p.C * 0.6, b.x0, b.x1], [p.C * 0.38, b.x0, b.x1]]));
  add("₦", "NN", currency("N", 530, (p, b) => [[p.C * 0.6, b.x0 - 60, b.x1 + 60], [p.C * 0.38, b.x0 - 60, b.x1 + 60]]));
  add("₸", "NN", (g) => {
    const { C, H } = g.p;
    const w = 520;
    api.defs.T[2](g, w);
    const sp = subPen(api);
    sp.rect(0, C - H, w, C);
    g.add(moved(api, sp.contours, 0, -H * 2.1));
  });
  add("₴", "NN", (g) => {
    const { C, H } = g.p;
    const w = 486;
    const sp = subPen(api);
    api.defs.S[2](sp, w);
    const b = bbox(sp.contours);
    g.add(api.geom.mirrorX(sp.contours, (b.x0 + b.x1) / 2));
    g.rect(-40, C * 0.6 - H * 0.45, w + 40, C * 0.6 + H * 0.45);
    g.rect(-40, C * 0.4 - H * 0.45, w + 40, C * 0.4 + H * 0.45);
  });
  add("₺", "NN", (g) => {
    const { S, H, C } = g.p;
    const x = 100;
    const r = 170;
    // A stem whose foot turns right and up, crossed by two rising strokes.
    g.rect(x, r - 4, x + S, C);
    g.sector(x, -10, x + 2 * r, 2 * r - 10, 2.0, 4.42, "r", g.p.cut);
    g.bar(x - 76, C * 0.4, x + S + 150, C * 0.55, H * 0.95);
    g.bar(x - 76, C * 0.6, x + S + 150, C * 0.75, H * 0.95);
  });
  add("₹", "NN", (g) => {
    const { S, H, C, k } = g.p;
    const w = 480;
    const kk = Math.min(0.9, k + 0.16);
    g.rect(0, C - H, w, C);
    g.rect(0, C * 0.72 - H / 2, w, C * 0.72 + H / 2);
    const y0 = C * 0.44;
    g.sector(-w * 0.35, y0, w * 0.82, C, 3, 5, "r", "r", S, H, kk);
    g.rect(0, y0, w * 0.24, y0 + H);
    g.stroke(w * 0.16, y0 + H * 0.4, w * 0.82, 0, S);
  });
  // Spacing forms of the marks, for text that writes about them.
  add("ˆ", "NN", (g) => circumflex(g, 130, g.p.X + 40));
  add("ˇ", "NN", (g) => caron(g, 130, g.p.X + 40));
  add("˘", "NN", (g) => breve(g, 130, g.p.X + 40));
  add("˙", "NN", (g) => dotabove(g, 70, g.p.X + 40));
  add("˚", "NN", (g) => ring(g, 100, g.p.X + 40));
  add("˛", "NN", (g) => api.accents.ogonek(g, 150));
  add("˜", "NN", (g) => tilde(g, 140, g.p.X + 40));
  add("˝", "NN", (g) => dblacute(g, 120, g.p.X + 40));
  void disc;
  return out;
}

export function glyphs(api) {
  const out = [];
  const hand = handLetters(api);
  const byHand = new Set(hand.map((g) => g.unicode));
  for (const ch of LETTERS) {
    if (byHand.has(ch)) continue;
    const c = composite(api, ch);
    if (c) out.push(c);
  }
  out.push(...hand, ...signs(api));
  const covered = new Set(out.map((g) => g.unicode));
  const missing = LETTERS.filter((ch) => !covered.has(ch));
  if (missing.length > 0) throw new Error(`latin: no drawing for ${missing.join(" ")}`);
  return out;
}

/* ------------------------------------------------------------------ kerning */

// The base table's letter pairs, extended to the accented forms of each letter. A lowercase
// letter carrying a mark above is kerned less after T V W Y, or its accent runs into the bar.
const LETTER_PAIRS = [
  ["A", "V", -46], ["V", "A", -46], ["A", "T", -50], ["T", "A", -50], ["A", "Y", -50], ["Y", "A", -50],
  ["A", "W", -28], ["W", "A", -28], ["L", "T", -70], ["L", "Y", -70], ["L", "V", -56], ["L", "W", -36],
  ["T", "a", -60], ["T", "e", -60], ["T", "o", -60], ["T", "c", -60], ["T", "s", -50], ["T", "y", -40], ["T", "u", -40], ["T", "r", -40],
  ["Y", "a", -56], ["Y", "e", -60], ["Y", "o", -60], ["V", "a", -36], ["V", "e", -40], ["V", "o", -40],
  ["A", "v", -24], ["A", "y", -24], ["A", "w", -14], ["P", "A", -40], ["F", "A", -32],
];

function variants() {
  const by = {};
  for (const ch of [...LETTERS, ..."ĄĆĘŃÓŚŹŻąćęńóśźż"]) {
    const nfd = ch.normalize("NFD");
    if (nfd.length < 2) continue;
    const marks = [...nfd.slice(1)];
    const above = marks.filter((m) => !["̣", "̦", "̧", "̨", "̛"].includes(m)).length;
    (by[nfd[0]] ??= []).push([ch, above]);
  }
  return by;
}

export const kerning = (() => {
  const by = variants();
  const out = [];
  for (const [l, r, v] of LETTER_PAIRS) {
    const left = [[l, 0], ...(by[l] ?? [])];
    const right = [[r, 0], ...(by[r] ?? [])];
    for (const [lc, _la] of left) {
      for (const [rc, ra] of right) {
        if (lc === l && rc === r) continue;
        // A mark above a lowercase letter tucked under T, V, W or Y: kern less, or not at all when stacked.
        const lowerAccented = rc === rc.toLowerCase() && ra > 0 && "TVWY".includes(l);
        const k = lowerAccented ? (ra > 1 ? 0.3 : 0.6) : 1;
        out.push([lc, rc, Math.round(v * k)]);
      }
    }
  }
  return out;
})();
