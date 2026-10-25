import type { IllustrationSet } from "../categories";
import { robot, s, shadow, shieldShape, sparkle, v, windowCard } from "../draw";

/**
 * The "scenes" batch: data and reports, commerce, communication, celebration and feature spots.
 * Built from the small toolkit below so every scene shares the same strokes, radii and badge
 * shapes as the base set: a surface object outlined in `line`, faint text lines, one accent
 * colour for what the scene is about, and a round status badge where a state needs saying.
 */

const n = (x: number) => Math.round(x * 100) / 100;

/** A plain surface card. */
const card = (x: number, y: number, w: number, h: number, rx = 6, fill = v.surface) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${s(fill, v.line)}/>`;

/** A page with a folded corner. */
const doc = (x: number, y: number, w: number, h: number, fill = v.surface) =>
  `<path d="M${x + 4} ${y}h${w - 22}l18 18v${h - 22}a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4V${y + 4}a4 4 0 0 1 4-4z" ${s(fill, v.line)}/>` +
  `<path d="M${x + w - 18} ${y}v18h18" ${s("none", v.line)}/>`;

/** Faint text lines; the last one shorter. */
const lines = (x: number, y: number, w: number, count: number, gap = 10, colour = v.faint) =>
  `<path d="${Array.from({ length: count }, (_, i) => `M${x} ${y + i * gap}h${i === count - 1 && count > 1 ? n(w * 0.6) : w}`).join("")}" ${s("none", colour)}/>`;

/** A title bar line, heavier than text. */
const title = (x: number, y: number, w: number, colour = v.text) => `<path d="M${x} ${y}h${w}" ${s("none", colour, "stroke-width:3")}/>`;

type Glyph =
  | "check"
  | "x"
  | "plus"
  | "minus"
  | "up"
  | "down"
  | "right"
  | "clock"
  | "bang"
  | "dollar"
  | "heart"
  | "star"
  | "pause"
  | "refresh"
  | "bolt"
  | "dots"
  | "bell"
  | "lock";

/** The glyph inside a status badge, drawn for a badge of radius r. */
const glyph = (g: Glyph, cx: number, cy: number, r: number) => {
  const k = r / 14;
  const m = (dx: number, dy: number) => `${n(cx + dx * k)} ${n(cy + dy * k)}`;
  const st = s("none", v.surface, `stroke-width:${n(3 * Math.max(0.8, k))}`);
  const fill = s(v.surface);
  switch (g) {
    case "check":
      return `<path d="M${m(-6, 0)}L${m(-1.5, 5)}L${m(7, -5)}" ${st}/>`;
    case "x":
      return `<path d="M${m(-5, -5)}L${m(5, 5)}M${m(5, -5)}L${m(-5, 5)}" ${st}/>`;
    case "plus":
      return `<path d="M${m(0, -6)}L${m(0, 6)}M${m(-6, 0)}L${m(6, 0)}" ${st}/>`;
    case "minus":
      return `<path d="M${m(-6, 0)}L${m(6, 0)}" ${st}/>`;
    case "up":
      return `<path d="M${m(0, 7)}L${m(0, -6)}M${m(-6, 0)}L${m(0, -6)}L${m(6, 0)}" ${st}/>`;
    case "down":
      return `<path d="M${m(0, -7)}L${m(0, 6)}M${m(-6, 0)}L${m(0, 6)}L${m(6, 0)}" ${st}/>`;
    case "right":
      return `<path d="M${m(-7, 0)}L${m(6, 0)}M${m(0, -6)}L${m(6, 0)}L${m(0, 6)}" ${st}/>`;
    case "clock":
      return `<path d="M${m(0, -7)}L${m(0, 0)}L${m(5, 4)}" ${st}/>`;
    case "bang":
      return `<path d="M${m(0, -7)}L${m(0, 2)}" ${st}/><circle cx="${n(cx)}" cy="${n(cy + 7 * k)}" r="${n(1.8 * k)}" ${fill}/>`;
    case "dollar":
      return `<path d="M${m(5, -5)}c${n(-2 * k)} ${n(-2 * k)} ${n(-10 * k)} ${n(-2 * k)} ${n(-10 * k)} ${n(2 * k)}s${n(10 * k)} ${n(2 * k)} ${n(10 * k)} ${n(6 * k)}${""}s${n(-8 * k)} ${n(4 * k)} ${n(-10 * k)} ${n(1 * k)}M${m(0, -9)}L${m(0, 9)}" ${st}/>`;
    case "heart":
      return `<path d="M${m(0, 6)}C${m(-9, 0)} ${m(-6, -8)} ${m(0, -3)}C${m(6, -8)} ${m(9, 0)} ${m(0, 6)}z" ${fill}/>`;
    case "star":
      return star(cx, cy, 8 * k, v.surface);
    case "pause":
      return `<path d="M${m(-3, -6)}L${m(-3, 6)}M${m(3, -6)}L${m(3, 6)}" ${st}/>`;
    case "refresh":
      return `<path d="M${m(0, -6.5)}A${n(6.5 * k)} ${n(6.5 * k)} 0 1 1 ${m(-5.63, -3.25)}" ${st}/><path d="M${m(-3, -9.5)}L${m(0, -6.5)}L${m(-3, -3.5)}" ${st}/>`;
    case "bolt":
      return `<path d="M${m(2, -9)}L${m(-5, 2)}L${m(0, 2)}L${m(-2, 9)}L${m(5, -2)}L${m(0, -2)}z" ${fill}/>`;
    case "dots":
      return [-5, 0, 5].map((dx) => `<circle cx="${n(cx + dx * k)}" cy="${n(cy)}" r="${n(1.8 * k)}" ${fill}/>`).join("");
    case "bell":
      return `<path d="M${m(-5, 3)}V${n(cy - 1 * k)}a${n(5 * k)} ${n(5 * k)} 0 0 1 ${n(10 * k)} 0V${n(cy + 3 * k)}l${n(1.5 * k)} ${n(2 * k)}H${n(cx - 6.5 * k)}z" ${fill}/><circle cx="${n(cx)}" cy="${n(cy + 7.5 * k)}" r="${n(1.6 * k)}" ${fill}/>`;
    case "lock":
      return `<rect x="${n(cx - 5 * k)}" y="${n(cy - 1 * k)}" width="${n(10 * k)}" height="${n(8 * k)}" rx="${n(1.5 * k)}" ${fill}/><path d="M${m(-3, -1)}V${n(cy - 4 * k)}a${n(3 * k)} ${n(3 * k)} 0 0 1 ${n(6 * k)} 0V${n(cy - 1 * k)}" ${st}/>`;
  }
};

/** A round status badge. */
const badge = (cx: number, cy: number, colour: string, g: Glyph, r = 14) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(colour)}/>` + glyph(g, cx, cy, r);

/** A five-point star. */
const star = (cx: number, cy: number, r: number, colour: string, outline = "none") => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${n(cx + rr * Math.cos(a))},${n(cy + rr * Math.sin(a))}`;
  }).join(" ");
  return `<polygon points="${pts}" ${s(colour, outline)}/>`;
};

/** Vertical bars standing on a baseline. */
const bars = (x: number, base: number, heights: number[], colour: string | string[], w = 10, gap = 6) =>
  heights
    .map((h, i) => `<rect x="${x + i * (w + gap)}" y="${base - h}" width="${w}" height="${h}" rx="2" ${s(Array.isArray(colour) ? (colour[i] ?? v.primary) : colour)}/>`)
    .join("");

/** An open polyline (a chart line). */
const trend = (pts: Array<[number, number]>, colour: string, width = 3) =>
  `<path d="M${pts.map(([x, y]) => `${x} ${y}`).join("L")}" ${s("none", colour, `stroke-width:${width}`)}/>`;

/** Chart axes. */
const axes = (x: number, y: number, w: number, h: number) => `<path d="M${x} ${y}v${h}h${w}" ${s("none", v.line)}/>`;

/** A pie made of slices (fractions sum to 1). */
const pie = (cx: number, cy: number, r: number, parts: Array<[number, string]>) => {
  let a0 = -Math.PI / 2;
  return parts
    .map(([f, colour]) => {
      const a1 = a0 + f * Math.PI * 2;
      const large = f > 0.5 ? 1 : 0;
      const d = `M${cx} ${cy}L${n(cx + r * Math.cos(a0))} ${n(cy + r * Math.sin(a0))}A${r} ${r} 0 ${large} 1 ${n(cx + r * Math.cos(a1))} ${n(cy + r * Math.sin(a1))}z`;
      a0 = a1;
      return `<path d="${d}" ${s(colour, v.surface, "stroke-width:2")}/>`;
    })
    .join("");
};

/** An envelope. */
const envelope = (x: number, y: number, w: number, h: number, fill = v.surface) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" ${s(fill, v.line)}/>` + `<path d="M${x + 2} ${y + 4}l${w / 2 - 2} ${n(h * 0.5)} ${w / 2 - 2}-${n(h * 0.5)}" ${s("none", v.line, "stroke-width:3")}/>`;

/** A speech bubble with a tail on the left or right. */
const bubble = (x: number, y: number, w: number, h: number, side: "left" | "right", fill = v.surface) => {
  const tail = side === "left" ? `M${x + 12} ${y + h}l-6 10 16-10` : `M${x + w - 12} ${y + h}l6 10-16-10`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ${s(fill, v.line)}/><path d="${tail}" ${s(fill, v.line)}/><path d="M${side === "left" ? x + 13 : x + w - 22} ${y + h - 0.5}h9" ${s("none", fill, "stroke-width:3")}/>`;
};

/** A phone outline. */
const phone = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ${s(v.raised, v.line)}/>` +
  `<rect x="${x + 5}" y="${y + 10}" width="${w - 10}" height="${h - 22}" rx="3" ${s(v.surface, v.line)}/>` +
  `<path d="M${x + w / 2 - 5} ${y + h - 6}h10" ${s("none", v.line, "stroke-width:3")}/>`;

/** A shipping box. */
const box = (x: number, y: number, w: number, h: number, fill = v.raised) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${s(fill, v.line)}/>` +
  `<path d="M${x} ${y + 12}h${w}" ${s("none", v.line)}/>` +
  `<rect x="${x + w / 2 - 7}" y="${y}" width="14" height="22" ${s(v.warning)}/>`;

/** A coin with a dollar glyph. */
const coin = (cx: number, cy: number, r: number, colour = v.warning) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(colour, v.line)}/>` + glyph("dollar", cx, cy, r * 0.85);

/** Head and shoulders, centred on cx with the head's top at y. */
const person = (cx: number, y: number, k = 1, fill = v.raised) =>
  `<circle cx="${cx}" cy="${n(y + 13 * k)}" r="${n(13 * k)}" ${s(fill, v.line)}/>` +
  `<path d="M${n(cx - 24 * k)} ${n(y + 56 * k)}a${n(24 * k)} ${n(20 * k)} 0 0 1 ${n(48 * k)} 0z" ${s(fill, v.line)}/>`;

/** A shopping cart. */
const cart = (x: number, y: number, fill = v.surface) =>
  `<path d="M${x} ${y}h12l10 44h50l10-32H${x + 22}" ${s("none", v.line, "stroke-width:3")}/>` +
  `<path d="M${x + 26} ${y + 12}h62l-9 30H${x + 33}z" ${s(fill, "none")}/>` +
  `<circle cx="${x + 30}" cy="${y + 56}" r="6" ${s(v.raised, v.line)}/><circle cx="${x + 66}" cy="${y + 56}" r="6" ${s(v.raised, v.line)}/>`;

/** A trophy, centred on cx, cup top at y. */
const trophy = (cx: number, y: number, colour = v.warning) =>
  `<path d="M${cx - 20} ${y + 6}h-12a12 12 0 0 0 14 16M${cx + 20} ${y + 6}h12a12 12 0 0 1-14 16" ${s("none", colour, "stroke-width:4")}/>` +
  `<path d="M${cx - 22} ${y}h44v14a22 22 0 0 1-44 0z" ${s(colour, v.line)}/>` +
  `<path d="M${cx - 4} ${y + 36}h8v14h-8z" ${s(colour, v.line)}/>` +
  `<rect x="${cx - 18}" y="${y + 50}" width="36" height="10" rx="2" ${s(v.raised, v.line)}/>`;

/** A calendar page. */
const calendar = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${s(v.surface, v.line)}/>` +
  `<path d="M${x} ${y + 16}h${w}" ${s("none", v.line)}/><rect x="${x}" y="${y}" width="${w}" height="16" rx="6" ${s(v.primary)}/>` +
  `<path d="M${x + 14} ${y - 5}v10M${x + w - 14} ${y - 5}v10" ${s("none", v.line, "stroke-width:4")}/>` +
  Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => `<rect x="${n(x + 8 + c * ((w - 16) / 4))}" y="${y + 24 + r * 12}" width="${n((w - 16) / 4 - 4)}" height="7" rx="1.5" ${s(v.raised)}/>`).join(""),
  ).join("");

/** A gear. */
const gear = (cx: number, cy: number, r: number, fill = v.raised) => {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<rect x="${n(cx - r * 0.18)}" y="${n(cy - r * 1.22)}" width="${n(r * 0.36)}" height="${n(r * 0.4)}" rx="1" transform="rotate(${n((a * 180) / Math.PI)} ${cx} ${cy})" ${s(fill, v.line)}/>`;
  }).join("");
  return teeth + `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(fill, v.line)}/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.38)}" ${s(v.surface, v.line)}/>`;
};

/** A cloud. */
const cloud = (cx: number, cy: number, k = 1, fill = v.raised) =>
  `<path d="M${n(cx - 30 * k)} ${n(cy + 16 * k)}a${n(14 * k)} ${n(14 * k)} 0 0 1 ${n(2 * k)}-${n(28 * k)}a${n(20 * k)} ${n(20 * k)} 0 0 1 ${n(38 * k)}-${n(6 * k)}a${n(14 * k)} ${n(14 * k)} 0 0 1 ${n(18 * k)} ${n(34 * k)}z" ${s(fill, v.line)}/>`;

/** A globe with meridians. */
const globe = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(v.raised, v.line)}/>` +
  `<ellipse cx="${cx}" cy="${cy}" rx="${n(r * 0.45)}" ry="${r}" ${s("none", v.line)}/>` +
  `<path d="M${cx - r} ${cy}h${2 * r}M${n(cx - r * 0.87)} ${n(cy - r * 0.5)}h${n(r * 1.74)}M${n(cx - r * 0.87)} ${n(cy + r * 0.5)}h${n(r * 1.74)}" ${s("none", v.line)}/>`;

/** A server unit. */
const server = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${s(v.raised, v.line)}/>` +
  `<circle cx="${x + 10}" cy="${y + h / 2}" r="2.5" ${s(v.success)}/><path d="M${x + 20} ${y + h / 2}h${w - 30}" ${s("none", v.line)}/>`;

/** A magnifying glass. */
const magnifier = (cx: number, cy: number, r: number, fill = v.surface) =>
  `<path d="M${n(cx + r * 0.7)} ${n(cy + r * 0.7)}l${n(r * 0.75)} ${n(r * 0.75)}" ${s("none", v.line, "stroke-width:7")}/>` + `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(fill, v.primary, "stroke-width:4")}/>`;

/** A network node. */
const node = (cx: number, cy: number, r: number, colour: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(colour, v.line)}/>`;

/** A connector line. */
const link = (d: string, colour = v.line, extra = "stroke-width:3") => `<path d="${d}" ${s("none", colour, extra)}/>`;

/** Scattered confetti, deterministic. */
const confetti = (pieces: Array<[number, number, string, number?]>) =>
  pieces
    .map(([x, y, colour, rot = 0], i) =>
      i % 3 === 0 ? `<circle cx="${x}" cy="${y}" r="3" ${s(colour)}/>` : `<rect x="${x - 3}" y="${y - 2}" width="7" height="4" rx="1" transform="rotate(${rot} ${x} ${y})" ${s(colour)}/>`,
    )
    .join("");

const party = confetti([
  [24, 22, v.warning, 20],
  [40, 12, v.secondary, -30],
  [120, 14, v.primary, 15],
  [138, 30, v.success, 40],
  [18, 50, v.danger, -10],
  [142, 56, v.warning, 25],
  [30, 78, v.primary, 60],
  [132, 80, v.secondary, -45],
]);

/** A megaphone pointing right. */
const megaphone = (x: number, y: number) =>
  `<path d="M${x} ${y + 12}h14l34-18v60l-34-18H${x}z" ${s(v.raised, v.line)}/>` +
  `<path d="M${x + 8} ${y + 36}l6 22h10l-4-22" ${s(v.surface, v.line)}/>` +
  `<path d="M${x + 58} ${y + 6}l10-6M${x + 60} ${y + 24}h12M${x + 58} ${y + 42}l10 6" ${s("none", v.primary, "stroke-width:3")}/>`;

/** A price tag. */
const priceTag = (x: number, y: number, colour = v.warning) =>
  `<path d="M${x} ${y}h30l22 22-30 30-22-22z" ${s(colour, v.line)}/><circle cx="${x + 10}" cy="${y + 10}" r="4" ${s(v.surface, v.line)}/>`;

/** A wrapped gift. */
const gift = (cx: number, y: number) =>
  `<rect x="${cx - 30}" y="${y + 16}" width="60" height="44" rx="3" ${s(v.raised, v.line)}/>` +
  `<rect x="${cx - 34}" y="${y + 6}" width="68" height="14" rx="3" ${s(v.surface, v.line)}/>` +
  `<path d="M${cx - 5} ${y + 6}h10v54h-10z" ${s(v.danger)}/>` +
  `<path d="M${cx} ${y + 6}c-6-12-22-12-18-2 2 4 10 3 18 2zM${cx} ${y + 6}c6-12 22-12 18-2-2 4-10 3-18 2z" ${s(v.danger, v.line)}/>`;

/** A ribbon medal. */
const medal = (cx: number, cy: number, colour = v.warning) =>
  `<path d="M${cx - 14} ${cy - 46}l8 30h12l8-30z" ${s(v.primary, v.line)}/>` +
  `<circle cx="${cx}" cy="${cy}" r="22" ${s(colour, v.line)}/>` +
  star(cx, cy, 11, v.surface);

/** A terminal window. */
const terminal = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${s(v.raised, v.line)}/>` +
  `<path d="M${x + 10} ${y + 16}l8 6-8 6" ${s("none", v.success, "stroke-width:3")}/>` +
  `<path d="M${x + 24} ${y + 28}h14" ${s("none", v.text, "stroke-width:3")}/>`;

/** A toggle switch. */
const toggle = (x: number, y: number, on: boolean) =>
  `<rect x="${x}" y="${y}" width="34" height="18" rx="9" ${s(on ? v.success : v.raised, v.line)}/>` + `<circle cx="${on ? x + 25 : x + 9}" cy="${y + 9}" r="6" ${s(v.surface)}/>`;

/** A slider track with a knob at fraction f. */
const slider = (x: number, y: number, w: number, f: number, colour = v.primary) =>
  `<path d="M${x} ${y}h${w}" ${s("none", v.line, "stroke-width:4")}/>` +
  `<path d="M${x} ${y}h${n(w * f)}" ${s("none", colour, "stroke-width:4")}/>` +
  `<circle cx="${n(x + w * f)}" cy="${y}" r="6" ${s(v.surface, v.line)}/>`;

/** A map pin. */
const pin = (cx: number, y: number, colour = v.danger) =>
  `<path d="M${cx} ${y + 30}c-10-12-14-18-14-24a14 14 0 0 1 28 0c0 6-4 12-14 24z" ${s(colour, v.line)}/><circle cx="${cx}" cy="${y + 6}" r="5" ${s(v.surface)}/>`;

/** A rocket pointing up-right. */
const rocket = (x: number, y: number) =>
  `<path d="M${x} ${y + 40}c0-24 14-38 40-40-2 26-16 40-40 40z" ${s(v.raised, v.line)}/>` +
  `<circle cx="${x + 26}" cy="${y + 14}" r="6" ${s(v.primary, v.line)}/>` +
  `<path d="M${x + 2} ${y + 26}l-12 4 4-12zM${x + 14} ${y + 38}l-4 12 12-4z" ${s(v.danger, v.line)}/>` +
  `<path d="M${x - 2} ${y + 42}l-10 10" ${s("none", v.warning, "stroke-width:4")}/>`;

/** A checklist card with rows checked up to `done`. */
const checklist = (x: number, y: number, rows: number, done: number) =>
  card(x, y, 70, 18 + rows * 16) +
  Array.from({ length: rows }, (_, i) => {
    const cy = y + 16 + i * 16;
    const ok = i < done;
    return (
      `<rect x="${x + 10}" y="${cy - 5}" width="10" height="10" rx="2" ${s(ok ? v.success : v.raised, ok ? "none" : v.line)}/>` +
      (ok ? `<path d="M${x + 12} ${cy}l2 2 4-4" ${s("none", v.surface, "stroke-width:2")}/>` : "") +
      `<path d="M${x + 28} ${cy}h${i % 2 ? 26 : 32}" ${s("none", ok ? v.faint : v.line)}/>`
    );
  }).join("");

/** A small dashboard: window with a bar chart and a line. */
const miniDash = (x: number, y: number, w: number, h: number) =>
  windowCard(x, y, w, h) +
  bars(x + 10, y + h - 10, [14, 24, 18, 30], v.primary, 8, 5) +
  trend(
    [
      [x + w - 50, y + h - 16],
      [x + w - 36, y + h - 28],
      [x + w - 22, y + h - 22],
      [x + w - 10, y + h - 38],
    ],
    v.success,
  );

/** A device frame (laptop). */
const laptop = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x + 8}" y="${y}" width="${w - 16}" height="${h}" rx="5" ${s(v.raised, v.line)}/>` +
  `<rect x="${x + 14}" y="${y + 6}" width="${w - 28}" height="${h - 12}" rx="2" ${s(v.surface, v.line)}/>` +
  `<path d="M${x} ${y + h + 2}h${w}l-6 8H${x + 6}z" ${s(v.raised, v.line)}/>`;

/** A star rating row. */
const ratingRow = (x: number, y: number, filled: number, size = 9) =>
  Array.from({ length: 5 }, (_, i) => star(x + i * size * 2.4, y, size, i < filled ? v.warning : v.raised, i < filled ? "none" : v.line)).join("");

/** A funnel of stacked bands. */
const funnel = (cx: number, y: number) =>
  [
    [64, v.primary],
    [48, v.secondary],
    [32, v.info],
    [18, v.success],
  ]
    .map(([half, colour], i) => {
      const next = [48, 32, 18, 10][i] as number;
      const yy = y + i * 18;
      return `<path d="M${cx - (half as number)} ${yy}h${2 * (half as number)}l${-((half as number) - next)} 16H${cx - next}z" ${s(colour as string, v.line)}/>`;
    })
    .join("");

/** A heat grid. */
const heat = (x: number, y: number, cols: number, rows: number, cell: number, levels: number[]) => {
  const ramp = [v.raised, v.secondary, v.primary, v.success, v.warning];
  let out = "";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const level = levels[(r * cols + c) % levels.length] ?? 0;
      out += `<rect x="${x + c * (cell + 3)}" y="${y + r * (cell + 3)}" width="${cell}" height="${cell}" rx="2" ${s(ramp[level] ?? v.raised)}/>`;
    }
  return out;
};

/** Lightning bolt (speed). */
const bolt = (x: number, y: number, colour = v.warning) => `<path d="M${x + 16} ${y}L${x} ${y + 30}h14l-6 26 22-34H${x + 16}l6-22z" ${s(colour, v.line)}/>`;

/** A puzzle piece. */
const puzzle = (x: number, y: number, colour: string) =>
  `<path d="M${x} ${y}h14a6 6 0 1 1 12 0h14v14a6 6 0 1 0 0 12v14H${x + 26}a6 6 0 1 0-12 0H${x}z" ${s(colour, v.line)}/>`;

/** A padlock. */
const padlock = (cx: number, y: number, colour = v.primary) =>
  `<path d="M${cx - 12} ${y + 20}v-8a12 12 0 0 1 24 0v8" ${s("none", v.line, "stroke-width:5")}/>` +
  `<rect x="${cx - 20}" y="${y + 18}" width="40" height="32" rx="6" ${s(colour, v.line)}/>` +
  `<circle cx="${cx}" cy="${y + 32}" r="4" ${s(v.surface)}/>`;

/** A stopwatch dial. */
const dial = (cx: number, cy: number, r: number, f: number, colour = v.success) => {
  const a = Math.PI * (1 - f);
  return (
    `<path d="M${cx - r} ${cy}a${r} ${r} 0 0 1 ${2 * r} 0" ${s("none", v.raised, "stroke-width:10")}/>` +
    `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${n(cx + r * Math.cos(a))} ${n(cy - r * Math.sin(a))}" ${s("none", colour, "stroke-width:10")}/>` +
    `<path d="M${cx} ${cy}L${n(cx + (r - 8) * Math.cos(a))} ${n(cy - (r - 8) * Math.sin(a))}" ${s("none", v.text, "stroke-width:3")}/>` +
    `<circle cx="${cx}" cy="${cy}" r="4" ${s(v.text)}/>`
  );
};

/** Card with an avatar dot and lines (a list item / review). */
const entry = (x: number, y: number, w: number, accent: string) =>
  card(x, y, w, 24, 5) + `<circle cx="${x + 12}" cy="${y + 12}" r="6" ${s(accent)}/>` + lines(x + 24, y + 9, w - 34, 2, 7);

/** Arrow from (x1,y1) to (x2,y2) with a head. */
const arrow = (x1: number, y1: number, x2: number, y2: number, colour = v.primary) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = (da: number) => `${n(x2 - 8 * Math.cos(a + da))} ${n(y2 - 8 * Math.sin(a + da))}`;
  return `<path d="M${x1} ${y1}L${x2} ${y2}M${h(0.5)}L${x2} ${y2}L${h(-0.5)}" ${s("none", colour, "stroke-width:3")}/>`;
};

const data = {
  "analytics-overview":
    shadow +
    windowCard(20, 14, 120, 86) +
    pie(50, 58, 18, [
      [0.5, v.primary],
      [0.3, v.secondary],
      [0.2, v.warning],
    ]) +
    bars(80, 88, [16, 28, 22, 38], v.primary, 8, 5) +
    lines(80, 38, 46, 1),
  "chart-growth":
    shadow +
    axes(26, 16, 112, 80) +
    bars(36, 96, [14, 22, 32, 44, 58], v.primary, 12, 8) +
    trend(
      [
        [42, 76],
        [62, 66],
        [82, 54],
        [102, 40],
        [124, 22],
      ],
      v.success,
    ) +
    arrow(110, 34, 128, 18, v.success),
  "chart-decline":
    shadow +
    axes(26, 16, 112, 80) +
    bars(36, 96, [56, 46, 34, 26, 14], v.raised, 12, 8) +
    trend(
      [
        [42, 34],
        [62, 46],
        [82, 58],
        [102, 68],
        [122, 82],
      ],
      v.danger,
    ) +
    badge(124, 30, v.danger, "down", 12),
  "kpi-dashboard":
    shadow +
    [20, 64, 108]
      .map(
        (x, i) =>
          card(x, 22, 36, 34, 5) +
          `<path d="M${x + 7} ${32}h14" ${s("none", v.faint)}/>` +
          `<path d="M${x + 7} ${44}h${[18, 22, 14][i]}" ${s("none", [v.success, v.primary, v.warning][i] as string, "stroke-width:4")}/>`,
      )
      .join("") +
    card(20, 62, 124, 36, 5) +
    trend(
      [
        [28, 90],
        [48, 80],
        [68, 84],
        [88, 72],
        [108, 76],
        [134, 66],
      ],
      v.primary,
    ),
  "report-generated":
    shadow +
    doc(36, 12, 68, 88) +
    title(46, 30, 30) +
    lines(46, 44, 46, 3) +
    bars(48, 90, [8, 14, 10, 18], v.secondary, 7, 4) +
    sparkle(118, 24, 8, v.warning) +
    sparkle(128, 46, 5, v.primary) +
    badge(112, 84, v.success, "check"),
  "report-scheduled": shadow + doc(26, 14, 66, 86) + title(36, 32, 28) + lines(36, 46, 44, 4) + calendar(92, 44, 50, 46) + badge(132, 40, v.primary, "clock", 12),
  "export-csv":
    shadow +
    doc(30, 14, 64, 86) +
    `<text x="62" y="70" text-anchor="middle" ${s(v.primary)} font-family="var(--oq-font-mono, monospace)" font-size="16" font-weight="700">CSV</text>` +
    lines(42, 36, 38, 2) +
    arrow(100, 58, 136, 58, v.success) +
    card(110, 72, 32, 22, 4) +
    lines(116, 80, 20, 2, 6),
  "import-csv":
    shadow +
    card(16, 30, 40, 50, 5) +
    lines(24, 42, 24, 4, 9) +
    arrow(60, 56, 92, 56, v.primary) +
    `<ellipse cx="122" cy="34" rx="22" ry="8" ${s(v.raised, v.line)}/>` +
    `<path d="M100 34v44c0 4.4 9.8 8 22 8s22-3.6 22-8V34" ${s(v.surface, v.line)}/>` +
    `<path d="M100 56c0 4.4 9.8 8 22 8s22-3.6 22-8" ${s("none", v.line)}/>`,
  "data-pipeline":
    shadow +
    [
      [26, v.secondary],
      [80, v.primary],
      [134, v.success],
    ]
      .map(([x, colour]) => card((x as number) - 16, 40, 32, 32, 6, v.raised) + `<circle cx="${x}" cy="56" r="7" ${s(colour as string)}/>`)
      .join("") +
    link("M42 56h22M96 56h22", v.line, "stroke-width:4;stroke-dasharray:4 4") +
    `<path d="M58 52l6 4-6 4M112 52l6 4-6 4" ${s("none", v.line, "stroke-width:3")}/>`,
  "data-cleaning":
    shadow +
    card(22, 22, 70, 70) +
    Array.from({ length: 4 }, (_, i) => `<path d="M32 ${38 + i * 14}h${[48, 36, 44, 30][i]}" ${s("none", i === 1 ? v.danger : v.faint, i === 1 ? "stroke-width:3;stroke-dasharray:3 4" : "")}/>`).join("") +
    `<path d="M104 30l28 28-34 34-14-14z" ${s(v.raised, v.line)}/>` +
    `<path d="M84 78l14 14-10 6-10-4z" ${s(v.primary, v.line)}/>` +
    sparkle(132, 28, 6, v.warning),
  "data-warehouse":
    shadow +
    `<path d="M24 50 80 22l56 28v48H24z" ${s(v.surface, v.line)}/>` +
    [0, 1, 2].map((i) => `<ellipse cx="${50 + i * 30}" cy="66" rx="11" ry="4" ${s(v.raised, v.line)}/><path d="M${39 + i * 30} 66v20c0 2.2 4.9 4 11 4s11-1.8 11-4V66" ${s(v.raised, v.line)}/>`).join("") +
    `<path d="M24 98h112" ${s("none", v.line, "stroke-width:3")}/>`,
  "query-running":
    shadow +
    terminal(20, 22, 92, 60) +
    `<path d="M30 60h${50}M30 70h34" ${s("none", v.faint)}/>` +
    `<circle cx="124" cy="78" r="18" ${s(v.raised, v.line)}/>` +
    `<path d="M124 64a14 14 0 0 1 14 14" ${s("none", v.primary, "stroke-width:4")}/>`,
  "query-results":
    shadow +
    card(18, 20, 124, 76) +
    `<path d="M18 36h124M58 20v76M100 20v76" ${s("none", v.line)}/>` +
    [48, 62, 76].map((y) => `<path d="M26 ${y}h22M66 ${y}h26M108 ${y}h24" ${s("none", v.faint)}/>`).join("") +
    `<rect x="18" y="20" width="124" height="16" rx="6" ${s(v.raised)}/>` +
    `<path d="M26 28h20M66 28h20M108 28h20" ${s("none", v.text, "stroke-width:3")}/>` +
    badge(136, 22, v.success, "check", 11),
  "data-visualisation":
    shadow +
    card(16, 18, 60, 80) +
    pie(46, 50, 20, [
      [0.45, v.primary],
      [0.35, v.warning],
      [0.2, v.secondary],
    ]) +
    lines(26, 84, 40, 1) +
    card(84, 18, 60, 80) +
    bars(94, 88, [20, 34, 26, 48], [v.secondary, v.primary, v.success, v.warning], 8, 5),
  "map-data":
    shadow +
    `<path d="M18 30l38-12 48 14 38-12v74l-38 12-48-14-38 12z" ${s(v.surface, v.line)}/>` +
    `<path d="M56 18v74M104 32v74" ${s("none", v.line)}/>` +
    [
      [40, 50, 12, v.primary],
      [82, 64, 8, v.success],
      [118, 46, 15, v.warning],
    ]
      .map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" ${s(c as string, v.line)} opacity="0.85"/>`)
      .join(""),
  "heatmap-report": shadow + card(22, 16, 116, 82) + heat(32, 26, 7, 5, 10, [0, 1, 2, 1, 3, 4, 2, 1, 0, 2, 3, 1, 2, 4, 3, 0, 1, 2]),
  "funnel-report": shadow + funnel(66, 22) + lines(118, 30, 22, 4, 18),
  cohort:
    shadow +
    card(20, 18, 120, 80) +
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 6 - r }, (_, c) => `<rect x="${30 + c * 18}" y="${28 + r * 13}" width="14" height="9" rx="2" ${s([v.primary, v.secondary, v.info, v.raised, v.raised, v.raised][c] as string)} opacity="${n(1 - c * 0.12)}"/>`).join(""),
    ).join(""),
  "ab-test":
    shadow +
    card(18, 26, 56, 64) +
    card(86, 26, 56, 64) +
    `<text x="46" y="52" text-anchor="middle" ${s(v.primary)} font-family="var(--oq-font-sans, sans-serif)" font-size="18" font-weight="700">A</text>` +
    `<text x="114" y="52" text-anchor="middle" ${s(v.secondary)} font-family="var(--oq-font-sans, sans-serif)" font-size="18" font-weight="700">B</text>` +
    `<path d="M30 74h${32 * 0.6}" ${s("none", v.primary, "stroke-width:6")}/><path d="M98 74h${32 * 0.9}" ${s("none", v.secondary, "stroke-width:6")}/>` +
    badge(138, 26, v.success, "check", 11),
  experiment:
    shadow +
    `<path d="M64 16h32M70 16v28l-26 44a6 6 0 0 0 5 9h62a6 6 0 0 0 5-9L90 44V16" ${s(v.surface, v.line)}/>` +
    `<path d="M52 74h56l8 14a6 6 0 0 1-5 9H49a6 6 0 0 1-5-9z" ${s(v.secondary)}/>` +
    `<circle cx="70" cy="84" r="4" ${s(v.surface)}/><circle cx="88" cy="78" r="3" ${s(v.surface)}/>` +
    sparkle(116, 30, 7, v.warning),
  forecast:
    shadow +
    axes(24, 18, 116, 78) +
    trend(
      [
        [30, 82],
        [50, 72],
        [70, 76],
        [88, 58],
      ],
      v.primary,
    ) +
    `<path d="M88 58L106 50 124 38 136 30" ${s("none", v.primary, "stroke-width:3;stroke-dasharray:5 5")}/>` +
    `<path d="M88 58L136 18v26z" ${s(v.primary)} opacity="0.2"/>`,
  "anomaly-detected":
    shadow +
    axes(24, 18, 116, 78) +
    trend(
      [
        [30, 74],
        [46, 70],
        [62, 72],
        [78, 30],
        [94, 70],
        [110, 68],
        [130, 72],
      ],
      v.primary,
    ) +
    `<circle cx="78" cy="30" r="10" ${s("none", v.danger, "stroke-width:3")}/>` +
    badge(118, 32, v.danger, "bang", 11),
  "insight-found":
    shadow +
    card(18, 30, 76, 60) +
    bars(28, 82, [16, 26, 20, 36], v.primary, 9, 6) +
    `<path d="M118 22a18 18 0 0 1 10 33v9h-20v-9a18 18 0 0 1 10-33z" ${s(v.warning, v.line)}/>` +
    `<path d="M110 70h16M112 76h12" ${s("none", v.line, "stroke-width:3")}/>` +
    `<path d="M118 6v6M140 16l-5 4M96 16l5 4" ${s("none", v.warning, "stroke-width:3")}/>`,
  benchmark:
    shadow +
    [
      [26, 58, v.raised],
      [62, 76, v.primary],
      [98, 46, v.raised],
    ]
      .map(([x, h, c]) => `<rect x="${x}" y="${98 - (h as number)}" width="30" height="${h}" rx="3" ${s(c as string, v.line)}/>`)
      .join("") +
    `<path d="M18 40h124" ${s("none", v.warning, "stroke-width:3;stroke-dasharray:6 5")}/>` +
    star(77, 14, 8, v.warning),
  comparison:
    shadow +
    card(16, 22, 58, 72) +
    card(86, 22, 58, 72) +
    bars(26, 84, [20, 32, 24], v.secondary, 10, 6) +
    bars(96, 84, [28, 44, 36], v.primary, 10, 6) +
    `<circle cx="80" cy="58" r="11" ${s(v.raised, v.line)}/><path d="M76 54l-3 4 3 4M84 54l3 4-3 4" ${s("none", v.text, "stroke-width:2")}/>`,
  "audit-trail":
    shadow +
    `<path d="M40 18v80" ${s("none", v.line, "stroke-width:3")}/>` +
    [24, 50, 76].map((y, i) => `<circle cx="40" cy="${y + 8}" r="6" ${s([v.success, v.primary, v.warning][i] as string, v.line)}/>` + entry(54, y - 2, 88, v.raised)).join(""),
  "compliance-report": shadow + doc(26, 12, 66, 88) + title(36, 30, 30) + lines(36, 44, 44, 4) + shieldShape(116, 34, v.raised, v.success, 0.62) + `<path d="M106 62l7 7 13-13" ${s("none", v.success, "stroke-width:4")}/>`,
  "sla-report": shadow + card(20, 18, 120, 80) + dial(80, 76, 40, 0.92) + `<text x="80" y="92" text-anchor="middle" ${s(v.text)} font-family="var(--oq-font-mono, monospace)" font-size="11" font-weight="700">99.9%</text>`,
  "data-lookup": shadow + card(20, 22, 84, 72) + lines(32, 38, 58, 5, 11) + magnifier(108, 58, 20),
  "metric-goal":
    shadow +
    `<circle cx="72" cy="58" r="40" ${s(v.raised, v.line)}/><circle cx="72" cy="58" r="27" ${s(v.surface, v.line)}/><circle cx="72" cy="58" r="13" ${s(v.danger, v.line)}/>` +
    `<path d="M72 58l56-36" ${s("none", v.text, "stroke-width:3")}/><path d="M122 18l10-2-4 10z" ${s(v.primary, v.line)}/>`,
};

const commerce = {
  "order-placed": shadow + cart(24, 30) + box(96, 18, 34, 28) + badge(122, 82, v.success, "check"),
  "order-shipped":
    shadow +
    `<rect x="16" y="40" width="74" height="48" rx="4" ${s(v.raised, v.line)}/>` +
    `<path d="M90 54h26l18 16v18H90z" ${s(v.surface, v.line)}/><path d="M98 58h14l10 10H98z" ${s(v.primary)}/>` +
    `<circle cx="38" cy="92" r="9" ${s(v.raised, v.line)}/><circle cx="114" cy="92" r="9" ${s(v.raised, v.line)}/>` +
    box(32, 22, 30, 22) +
    `<path d="M4 58h8M2 70h10" ${s("none", v.faint, "stroke-width:3")}/>`,
  "order-delivered":
    shadow +
    `<path d="M24 56 66 28l42 28v42H24z" ${s(v.surface, v.line)}/>` +
    `<rect x="54" y="70" width="24" height="28" rx="2" ${s(v.raised, v.line)}/>` +
    box(84, 72, 28, 24) +
    badge(126, 34, v.success, "check"),
  "order-cancelled": shadow + box(42, 34, 64, 56) + badge(118, 34, v.danger, "x"),
  "return-requested": shadow + box(40, 40, 58, 50) + `<path d="M124 52a24 24 0 1 0-6 26" ${s("none", v.primary, "stroke-width:4")}/><path d="M126 38l-2 14-14-2" ${s("none", v.primary, "stroke-width:4")}/>`,
  "refund-issued":
    shadow +
    card(16, 34, 76, 50, 8, v.raised) +
    `<path d="M16 48h76" ${s("none", v.line, "stroke-width:6")}/>` +
    `<path d="M26 70h18" ${s("none", v.faint, "stroke-width:3")}/>` +
    coin(116, 58, 20) +
    `<path d="M96 30a28 28 0 0 1 40 0" ${s("none", v.success, "stroke-width:3")}/><path d="M136 22v8h-8" ${s("none", v.success, "stroke-width:3")}/>`,
  "payment-success":
    shadow +
    card(24, 26, 86, 56, 8, v.raised) +
    `<path d="M24 42h86" ${s("none", v.line, "stroke-width:7")}/>` +
    `<rect x="34" y="56" width="16" height="12" rx="2" ${s(v.warning)}/>` +
    lines(58, 64, 40, 1) +
    badge(118, 80, v.success, "check", 16),
  "payment-pending": shadow + card(24, 26, 86, 56, 8, v.raised) + `<path d="M24 42h86" ${s("none", v.line, "stroke-width:7")}/>` + `<rect x="34" y="56" width="16" height="12" rx="2" ${s(v.warning)}/>` + badge(118, 80, v.warning, "clock", 16),
  "invoice-sent": shadow + doc(22, 14, 64, 86) + title(32, 32, 24) + lines(32, 46, 40, 3) + `<path d="M32 82h40" ${s("none", v.text, "stroke-width:3")}/>` + `<path d="M98 50 142 34 132 84 116 72z" ${s(v.surface, v.line)}/><path d="M142 34 116 72v14l8-8" ${s(v.raised, v.line)}/>`,
  "invoice-paid":
    shadow +
    doc(34, 12, 70, 90) +
    title(44, 30, 28) +
    lines(44, 44, 46, 3) +
    `<g transform="rotate(-14 98 76)"><rect x="70" y="64" width="58" height="24" rx="4" ${s("none", v.success, "stroke-width:3")}/><text x="99" y="81" text-anchor="middle" ${s(v.success)} font-family="var(--oq-font-sans, sans-serif)" font-size="13" font-weight="800">PAID</text></g>`,
  "subscription-started": shadow + calendar(22, 26, 64, 62) + `<path d="M126 44a22 22 0 1 1-30 4" ${s("none", v.primary, "stroke-width:4")}/><path d="M90 40l6 8 8-6" ${s("none", v.primary, "stroke-width:4")}/>` + badge(116, 66, v.success, "plus", 11),
  "subscription-renewed": shadow + calendar(22, 26, 64, 62) + badge(118, 58, v.primary, "refresh", 20),
  "subscription-cancelled": shadow + calendar(22, 26, 64, 62) + badge(118, 58, v.danger, "x", 18),
  "plan-upgraded":
    shadow +
    [
      [24, 40, v.raised],
      [62, 60, v.raised],
      [100, 82, v.primary],
    ]
      .map(([x, h, c]) => `<rect x="${x}" y="${98 - (h as number)}" width="32" height="${h}" rx="4" ${s(c as string, v.line)}/>`)
      .join("") +
    arrow(30, 40, 112, 8, v.success),
  "plan-downgraded":
    shadow +
    [
      [24, 82, v.raised],
      [62, 60, v.raised],
      [100, 40, v.primary],
    ]
      .map(([x, h, c]) => `<rect x="${x}" y="${98 - (h as number)}" width="32" height="${h}" rx="4" ${s(c as string, v.line)}/>`)
      .join("") +
    arrow(40, 6, 116, 46, v.warning),
  "trial-started": shadow + gift(66, 28) + badge(122, 40, v.primary, "clock", 16),
  "trial-ending":
    shadow +
    `<path d="M56 14h48M56 102h48M60 14c0 26 20 28 20 44s-20 18-20 44M100 14c0 26-20 28-20 44s20 18 20 44" ${s(v.surface, v.line, "stroke-width:3")}/>` +
    `<path d="M68 92c4-8 8-10 12-12 4 2 8 4 12 12z" ${s(v.warning)}/>` +
    badge(122, 32, v.warning, "bang", 12),
  "coupon-applied":
    shadow +
    `<path d="M22 40h116v12a8 8 0 0 0 0 16v12H22V68a8 8 0 0 0 0-16z" ${s(v.raised, v.line)}/>` +
    `<path d="M56 40v40" ${s("none", v.line, "stroke-dasharray:4 4")}/>` +
    `<text x="96" y="66" text-anchor="middle" ${s(v.success)} font-family="var(--oq-font-sans, sans-serif)" font-size="18" font-weight="800">−20%</text>` +
    badge(130, 34, v.success, "check", 11),
  "gift-card": shadow + gift(80, 28) + sparkle(36, 34, 7, v.warning) + sparkle(126, 30, 5, v.primary),
  wishlist: shadow + card(30, 18, 72, 80) + entry(38, 28, 56, v.secondary) + entry(38, 58, 56, v.primary) + badge(118, 34, v.danger, "heart", 16),
  checkout:
    shadow +
    windowCard(18, 16, 124, 84) +
    `<rect x="28" y="40" width="60" height="12" rx="3" ${s(v.raised, v.line)}/><rect x="28" y="58" width="60" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="96" y="40" width="36" height="30" rx="4" ${s(v.raised, v.line)}/>` +
    `<rect x="28" y="78" width="104" height="14" rx="7" ${s(v.success)}/>` +
    badge(132, 25, v.primary, "lock", 8),
  "cart-abandoned": shadow + cart(26, 30, v.raised) + `<path d="M114 26c8-10 24-4 18 8-4 7-12 6-12 16" ${s("none", v.warning, "stroke-width:4")}/><circle cx="120" cy="60" r="3" ${s(v.warning)}/>`,
  "stock-low":
    shadow +
    `<path d="M20 98h120" ${s("none", v.line, "stroke-width:3")}/>` +
    `<rect x="26" y="40" width="100" height="58" rx="2" ${s("none", v.line)}/>` +
    `<path d="M26 70h100" ${s("none", v.line)}/>` +
    box(32, 76, 20, 22) +
    badge(122, 34, v.warning, "bang"),
  "out-of-stock": shadow + `<path d="M20 98h120" ${s("none", v.line, "stroke-width:3")}/>` + `<rect x="26" y="40" width="100" height="58" rx="2" ${s("none", v.line, "stroke-dasharray:5 5")}/>` + badge(122, 34, v.danger, "x"),
  "back-in-stock": shadow + `<path d="M20 98h120" ${s("none", v.line, "stroke-width:3")}/>` + box(26, 70, 28, 28) + box(58, 70, 28, 28) + box(42, 42, 28, 28) + badge(118, 50, v.success, "bell", 18),
  "price-drop": shadow + priceTag(26, 30) + `<path d="M98 26v52" ${s("none", v.success, "stroke-width:5")}/><path d="M84 64l14 16 14-16" ${s("none", v.success, "stroke-width:5")}/>` + sparkle(130, 30, 6, v.warning),
  receipt:
    shadow +
    `<path d="M48 12h64v86l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6z" ${s(v.surface, v.line)}/>` +
    lines(58, 30, 44, 4, 10) +
    `<path d="M58 76h22M90 76h12" ${s("none", v.text, "stroke-width:3")}/>`,
  "wallet-topped-up":
    shadow +
    `<rect x="22" y="36" width="92" height="60" rx="8" ${s(v.raised, v.line)}/>` +
    `<path d="M92 56h26v24H92a12 12 0 0 1 0-24z" ${s(v.surface, v.line)}/><circle cx="96" cy="68" r="3" ${s(v.line)}/>` +
    coin(124, 30, 14) +
    badge(40, 32, v.success, "plus", 11),
  "payout-sent": shadow + `<path d="M110 60 64 36v14H24v20h40v14z" ${s(v.raised, v.line)}/>` + coin(122, 46, 14) + coin(132, 76, 12, v.success),
  "store-open":
    shadow +
    `<path d="M24 46h112l-8-26H32z" ${s(v.primary, v.line)}/>` +
    `<path d="M28 46h104v52H28z" ${s(v.surface, v.line)}/>` +
    `<path d="M24 46a14 10 0 0 0 28 0 14 10 0 0 0 28 0 14 10 0 0 0 28 0 14 10 0 0 0 28 0" ${s(v.raised, v.line)}/>` +
    `<rect x="40" y="66" width="30" height="32" ${s(v.raised, v.line)}/><rect x="82" y="66" width="38" height="20" rx="3" ${s(v.raised, v.line)}/>`,
};

const communication = {
  "message-sent": shadow + bubble(52, 22, 86, 40, "right", v.primary) + lines(64, 36, 60, 2, 10, v.surface) + bubble(20, 66, 64, 26, "left") + `<path d="M118 76l4 4 8-8" ${s("none", v.success, "stroke-width:3")}/>`,
  "message-received": shadow + bubble(22, 24, 86, 40, "left") + lines(34, 38, 60, 2) + badge(122, 30, v.danger, "dots", 11) + bubble(72, 70, 60, 22, "right", v.raised),
  "chat-support": shadow + person(46, 30, 0.95) + `<path d="M24 46a22 22 0 0 1 44 0" ${s("none", v.line, "stroke-width:3")}/><rect x="20" y="42" width="8" height="14" rx="3" ${s(v.primary)}/>` + bubble(78, 22, 64, 34, "left", v.primary) + glyph("dots", 110, 39, 14),
  "chatbot-helper":
    shadow +
    robot(56, 40) +
    bubble(98, 18, 48, 30, "left") +
    [112, 122, 132].map((x) => `<circle cx="${x}" cy="33" r="2.5" ${s(v.faint)}/>`).join(""),
  "email-campaign":
    shadow +
    envelope(20, 48, 60, 40) +
    envelope(50, 30, 60, 40, v.raised) +
    envelope(80, 12, 60, 40) +
    `<path d="M12 22h18M8 34h16" ${s("none", v.primary, "stroke-width:3")}/>`,
  "newsletter-subscribed": shadow + doc(22, 16, 70, 84) + title(32, 34, 30) + `<rect x="32" y="44" width="48" height="22" rx="3" ${s(v.raised)}/>` + lines(32, 76, 48, 2) + envelope(98, 52, 42, 30) + badge(132, 46, v.success, "check", 11),
  unsubscribed: shadow + envelope(30, 30, 86, 58) + `<circle cx="116" cy="82" r="16" ${s(v.raised, v.line)}/><path d="M108 82h16" ${s("none", v.danger, "stroke-width:4")}/>`,
  "notification-sent":
    shadow +
    phone(52, 10, 56, 94) +
    card(60, 30, 40, 16, 4, v.raised) +
    `<circle cx="67" cy="38" r="3" ${s(v.primary)}/><path d="M73 38h20" ${s("none", v.faint)}/>` +
    `<path d="M118 28l10-6M120 44h12M118 60l10 6" ${s("none", v.primary, "stroke-width:3")}/>`,
  "push-enabled": shadow + phone(36, 10, 56, 94) + badge(64, 54, v.primary, "bell", 16) + toggle(100, 46, true),
  "sms-sent": shadow + phone(30, 10, 56, 94) + bubble(36, 30, 40, 18, "right", v.primary) + bubble(36, 56, 34, 16, "left", v.raised) + arrow(96, 56, 134, 56, v.success),
  "call-incoming":
    shadow +
    phone(52, 10, 56, 94) +
    `<circle cx="80" cy="44" r="12" ${s(v.raised, v.line)}/>` +
    `<circle cx="68" cy="76" r="7" ${s(v.danger)}/><circle cx="92" cy="76" r="7" ${s(v.success)}/>` +
    `<path d="M120 36a22 22 0 0 1 0 30M128 28a34 34 0 0 1 0 46" ${s("none", v.success, "stroke-width:3")}/>`,
  "video-call":
    shadow +
    windowCard(18, 14, 124, 86) +
    `<rect x="26" y="34" width="52" height="56" rx="4" ${s(v.raised)}/>` +
    `<rect x="82" y="34" width="52" height="56" rx="4" ${s(v.raised)}/>` +
    person(52, 44, 0.6, v.surface) +
    person(108, 44, 0.6, v.surface) +
    `<circle cx="80" cy="94" r="7" ${s(v.danger)}/>`,
  voicemail: shadow + phone(30, 10, 56, 94) + `<circle cx="102" cy="56" r="12" ${s("none", v.primary, "stroke-width:4")}/><circle cx="132" cy="56" r="12" ${s("none", v.primary, "stroke-width:4")}/><path d="M102 68h30" ${s("none", v.primary, "stroke-width:4")}/>`,
  broadcast: shadow + `<path d="M80 50v48M68 98h24" ${s("none", v.line, "stroke-width:4")}/>` + `<circle cx="80" cy="44" r="8" ${s(v.primary, v.line)}/>` + `<path d="M62 26a26 26 0 0 0 0 36M98 26a26 26 0 0 1 0 36M48 14a42 42 0 0 0 0 60M112 14a42 42 0 0 1 0 60" ${s("none", v.primary, "stroke-width:3")}/>`,
  announcement: shadow + megaphone(36, 32) + sparkle(128, 22, 6, v.warning),
  "survey-sent": shadow + card(26, 14, 74, 86) + [30, 52, 74].map((y, i) => `<circle cx="40" cy="${y + 4}" r="5" ${s(i === 1 ? v.primary : v.raised, v.line)}/>` + lines(52, y + 4, 38, 1)).join("") + arrow(108, 58, 140, 58, v.success),
  "feedback-received": shadow + bubble(20, 22, 78, 42, "left") + ratingRow(32, 42, 4, 6) + envelope(98, 56, 42, 30) + badge(132, 52, v.success, "check", 10),
  "review-left": shadow + card(22, 26, 116, 64) + person(46, 38, 0.55) + ratingRow(70, 46, 5, 6) + lines(70, 64, 56, 2),
  rating: shadow + ratingRow(22, 58, 4, 13),
  testimonial: shadow + bubble(26, 18, 108, 52, "left") + `<path d="M38 46a7 7 0 1 1 7 7c0 6-3 9-8 11M54 46a7 7 0 1 1 7 7c0 6-3 9-8 11" ${s(v.primary, v.primary, "stroke-width:2")}/>` + lines(76, 36, 46, 3, 9) + person(46, 74, 0.42),
  "help-center": shadow + `<circle cx="80" cy="56" r="40" ${s(v.raised, v.line)}/><circle cx="80" cy="56" r="20" ${s(v.surface, v.line)}/>` + `<path d="M52 28l14 14M108 28 94 42M52 84l14-14M108 84 94 70" ${s("none", v.danger, "stroke-width:8")}/>`,
  "docs-library":
    shadow +
    [
      [26, v.primary],
      [44, v.secondary],
      [62, v.warning],
    ]
      .map(([x, c]) => `<rect x="${x}" y="22" width="16" height="76" rx="2" ${s(c as string, v.line)}/>`)
      .join("") +
    `<rect x="82" y="30" width="16" height="68" rx="2" transform="rotate(-12 90 64)" ${s(v.success, v.line)}/>` +
    doc(104, 34, 38, 52) +
    `<path d="M20 98h124" ${s("none", v.line, "stroke-width:3")}/>`,
  "knowledge-base": shadow + `<path d="M80 26c-14-8-38-8-54 0v68c16-8 40-8 54 0 14-8 38-8 54 0V26c-16-8-40-8-54 0z" ${s(v.surface, v.line)}/><path d="M80 26v68" ${s("none", v.line)}/>` + lines(36, 40, 34, 4, 10) + lines(92, 40, 34, 4, 10),
  faq: shadow + bubble(20, 20, 64, 46, "left", v.primary) + `<text x="52" y="52" text-anchor="middle" ${s(v.surface)} font-family="var(--oq-font-sans, sans-serif)" font-size="26" font-weight="800">?</text>` + bubble(78, 52, 64, 40, "right") + lines(90, 66, 40, 2),
  "community-forum":
    shadow +
    bubble(26, 14, 40, 22, "left", v.raised) +
    bubble(94, 10, 40, 22, "right", v.primary) +
    person(36, 50, 0.6) +
    person(80, 42, 0.7, v.primary) +
    person(124, 50, 0.6),
  webinar: shadow + laptop(26, 22, 108, 58) + bars(44, 70, [14, 22, 30], v.primary, 8, 5) + person(108, 38, 0.45, v.raised),
  "event-registered":
    shadow +
    `<path d="M20 38h120v12a8 8 0 0 0 0 16v12H20V66a8 8 0 0 0 0-16z" ${s(v.raised, v.line)}/>` +
    `<path d="M104 38v40" ${s("none", v.line, "stroke-dasharray:4 4")}/>` +
    title(34, 52, 50) +
    lines(34, 64, 40, 1) +
    badge(122, 58, v.success, "check", 11),
  "calendar-booked": shadow + calendar(24, 22, 80, 72) + `<rect x="61" y="58" width="${n((80 - 16) / 4 - 4)}" height="7" rx="1.5" ${s(v.success)}/>` + person(122, 48, 0.55),
};

const celebration = {
  milestone: shadow + `<path d="M40 98V18" ${s("none", v.line, "stroke-width:4")}/><path d="M40 20h56l-10 14 10 14H40z" ${s(v.primary, v.line)}/>` + `<path d="M24 98h112" ${s("none", v.line, "stroke-width:3")}/>` + party,
  anniversary:
    shadow +
    `<rect x="40" y="54" width="80" height="44" rx="6" ${s(v.raised, v.line)}/>` +
    `<path d="M40 70c10 6 20 6 26 0s16-6 26 0 20 6 28 0" ${s("none", v.secondary, "stroke-width:4")}/>` +
    [62, 80, 98].map((x) => `<rect x="${x - 3}" y="34" width="6" height="20" rx="2" ${s(v.surface, v.line)}/><path d="M${x} 22c4 4 4 8 0 10-4-2-4-6 0-10z" ${s(v.warning)}/>`).join(""),
  "level-up":
    shadow +
    [0, 1, 2, 3].map((i) => `<rect x="${24 + i * 26}" y="${82 - i * 16}" width="28" height="${16 + i * 16}" ${s(i === 3 ? v.primary : v.raised, v.line)}/>`).join("") +
    star(126, 22, 10, v.warning) +
    arrow(30, 70, 112, 26, v.success),
  "badge-earned": shadow + medal(80, 70) + sparkle(42, 40, 7, v.warning) + sparkle(120, 34, 6, v.primary),
  streak:
    shadow +
    `<path d="M80 100a30 30 0 0 0 30-30c0-20-15-30-20-50-10 10-15 20-12 32-6-5-10-10-10-18-10 10-18 22-18 36a30 30 0 0 0 30 30z" ${s(v.info, v.line)}/>` +
    `<path d="M80 100a14 14 0 0 0 14-14c0-10-6-14-10-24-6 6-12 12-12 18-4-2-6-4-6-8-4 4-6 8-6 14a14 14 0 0 0 20 14z" ${s(v.warning)}/>`,
  "goal-reached":
    shadow +
    `<path d="M20 98h120" ${s("none", v.line, "stroke-width:3")}/>` +
    `<path d="M112 98V20" ${s("none", v.line, "stroke-width:4")}/>` +
    Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<rect x="${114 + c * 8}" y="${20 + r * 8}" width="8" height="8" ${s((r + c) % 2 ? v.surface : v.text)}/>`).join("")).join("") +
    `<path d="M24 92c20-6 40-30 60-30s24 10 28 10" ${s("none", v.success, "stroke-width:4;stroke-dasharray:6 6")}/>`,
  "launch-day": shadow + `<g transform="translate(-34 -26) scale(1.45)">${rocket(66, 26)}</g>` + `<path d="M28 98c10-8 22-8 30 0" ${s(v.raised, v.line)}/>` + sparkle(124, 22, 7, v.warning) + sparkle(36, 30, 5, v.primary),
  "record-high":
    shadow +
    axes(24, 18, 116, 80) +
    bars(34, 98, [20, 28, 26, 40, 66], [v.raised, v.raised, v.raised, v.raised, v.primary], 14, 8) +
    `<path d="M24 32h116" ${s("none", v.warning, "stroke-width:2;stroke-dasharray:5 5")}/>` +
    star(129, 22, 8, v.warning),
  "thank-you": shadow + `<path d="M80 98C40 72 26 54 26 38a24 24 0 0 1 54-12 24 24 0 0 1 54 12c0 16-14 34-54 60z" ${s(v.danger, v.line)}/>` + sparkle(30, 22, 6, v.warning) + sparkle(134, 26, 5, v.primary),
  congratulations:
    shadow +
    `<path d="M36 98 62 34l34 34z" ${s(v.warning, v.line)}/><path d="M50 72l20 10M58 54l22 14" ${s("none", v.danger, "stroke-width:4")}/>` +
    `<path d="M92 30c8-8 18-10 22-4M100 52c10-2 20 2 22 10M76 22c-2-8 2-14 8-14" ${s("none", v.primary, "stroke-width:3")}/>` +
    confetti([
      [118, 28, v.secondary, 30],
      [132, 48, v.success, -20],
      [108, 76, v.warning, 10],
      [94, 14, v.danger, 50],
    ]),
  "confetti-success": shadow + badge(80, 58, v.success, "check", 30) + party,
  "trophy-win": shadow + trophy(80, 22) + sparkle(36, 36, 7, v.warning) + sparkle(126, 30, 6, v.primary),
  "high-five":
    shadow +
    `<path d="M48 98V58l-6-24a5 5 0 0 1 9-3l7 18V22a5 5 0 0 1 10 0v24-30a5 5 0 0 1 10 0v34-26a5 5 0 0 1 10 0v40" ${s(v.raised, v.line)}/>` +
    `<path d="M88 56v42H48" ${s(v.raised, v.line)}/>` +
    `<path d="M110 30l12-8M114 48h14M110 66l12 8" ${s("none", v.warning, "stroke-width:3")}/>`,
  cheers:
    shadow +
    `<path d="M44 30h30l-4 46H48z" ${s(v.surface, v.line)}/><path d="M46 46h26l-3 30H49z" ${s(v.warning)}/>` +
    `<path d="M86 30h30l-4 46H90z" ${s(v.surface, v.line)}/><path d="M88 46h26l-3 30H91z" ${s(v.warning)}/>` +
    `<path d="M58 76v18M100 76v18M50 98h16M92 98h16" ${s("none", v.line, "stroke-width:3")}/>` +
    sparkle(80, 22, 7, v.primary),
  "completed-checklist": shadow + checklist(44, 16, 5, 5) + badge(122, 82, v.success, "check", 16),
  "inbox-zero": shadow + `<path d="M24 58l16-34h80l16 34v32a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6z" ${s(v.surface, v.line)}/><path d="M24 58h32l6 12h36l6-12h32" ${s("none", v.line)}/>` + sparkle(80, 40, 10, v.success) + sparkle(104, 30, 5, v.warning),
  "all-tasks-done": shadow + card(22, 22, 52, 70) + card(86, 22, 52, 70) + [0, 1, 2].map((i) => `<rect x="94" y="${32 + i * 18}" width="36" height="12" rx="3" ${s(v.success)}/>`).join("") + lines(30, 36, 34, 1) + badge(48, 66, v.success, "check", 12),
};

const features = {
  "api-overview": shadow + card(18, 26, 52, 64, 6, v.raised) + `<text x="44" y="64" text-anchor="middle" ${s(v.primary)} font-family="var(--oq-font-mono, monospace)" font-size="16" font-weight="700">{ }</text>` + link("M70 58h20", v.line, "stroke-width:3;stroke-dasharray:4 4") + server(92, 30, 50, 16) + server(92, 52, 50, 16) + server(92, 74, 50, 16),
  sdk:
    shadow +
    `<path d="M80 18 128 40v42L80 104 32 82V40z" ${s(v.raised, v.line)}/><path d="M32 40l48 22 48-22M80 62v42" ${s("none", v.line)}/>` +
    `<text x="80" y="48" text-anchor="middle" ${s(v.primary)} font-family="var(--oq-font-mono, monospace)" font-size="12" font-weight="700">&lt;/&gt;</text>`,
  "webhooks-feature":
    shadow +
    node(46, 40, 12, v.primary) +
    node(114, 40, 12, v.secondary) +
    node(80, 86, 12, v.success) +
    link("M54 50c8 14 14 24 20 30M106 50c-8 14-14 24-20 30M58 40h44") +
    arrow(92, 40, 102, 40, v.line),
  "integrations-hub":
    shadow +
    `<circle cx="80" cy="58" r="18" ${s(v.primary, v.line)}/>` +
    [
      [30, 26],
      [130, 26],
      [30, 90],
      [130, 90],
    ]
      .map(([x, y]) => link(`M${x} ${y}L80 58`) + `<rect x="${(x as number) - 12}" y="${(y as number) - 12}" width="24" height="24" rx="6" ${s(v.raised, v.line)}/>`)
      .join("") +
    `<circle cx="80" cy="58" r="18" ${s(v.primary, v.line)}/>`,
  "plugin-marketplace": shadow + windowCard(18, 14, 124, 86) + puzzle(32, 38, v.primary) + puzzle(88, 38, v.secondary) + `<path d="M32 92h40M88 92h40" ${s("none", v.faint)}/>`,
  automation: shadow + gear(58, 56, 22) + gear(106, 40, 14, v.surface) + `<path d="M98 82a20 20 0 0 1 22-14" ${s("none", v.primary, "stroke-width:3")}/><path d="M118 62l4 6-6 4" ${s("none", v.primary, "stroke-width:3")}/>`,
  "workflow-builder":
    shadow +
    card(16, 22, 40, 22, 5, v.raised) +
    card(16, 74, 40, 22, 5, v.raised) +
    `<path d="M80 48l14 10-14 10-14-10z" ${s(v.warning, v.line)}/>` +
    card(104, 47, 40, 22, 5, v.primary) +
    link("M56 33h12l12 15M56 85h12l12-17M94 58h10"),
  "rules-engine":
    shadow +
    card(20, 18, 120, 80) +
    [34, 54, 74]
      .map((y, i) => `<path d="M32 ${y}h20" ${s("none", v.secondary, "stroke-width:4")}/>` + `<path d="M58 ${y}h18" ${s("none", v.faint)}/>` + arrow(84, y, 100, y, v.line) + `<rect x="106" y="${y - 6}" width="24" height="12" rx="3" ${s([v.success, v.danger, v.warning][i] as string)}/>`)
      .join(""),
  "smart-assistant": shadow + bubble(30, 26, 100, 52, "left") + sparkle(56, 52, 12, v.primary) + sparkle(80, 42, 7, v.secondary) + sparkle(98, 58, 9, v.warning),
  "search-feature": shadow + `<rect x="18" y="24" width="124" height="24" rx="12" ${s(v.surface, v.line)}/>` + `<circle cx="34" cy="36" r="6" ${s("none", v.primary, "stroke-width:3")}/><path d="M38 40l4 4" ${s("none", v.primary, "stroke-width:3")}/>` + lines(50, 36, 60, 1) + entry(18, 56, 124, v.primary) + entry(18, 82, 124, v.raised),
  "filters-feature": shadow + card(22, 18, 116, 80) + slider(36, 38, 88, 0.6) + slider(36, 60, 88, 0.3, v.secondary) + [36, 68, 100].map((x, i) => `<rect x="${x}" y="76" width="26" height="12" rx="6" ${s(i === 0 ? v.primary : v.raised, v.line)}/>`).join(""),
  "dashboards-feature": shadow + miniDash(16, 14, 128, 86),
  "alerts-feature": shadow + card(22, 34, 76, 60) + trend([[30, 80], [46, 70], [62, 74], [76, 48], [90, 56]], v.primary) + `<path d="M22 56h76" ${s("none", v.danger, "stroke-dasharray:4 4")}/>` + badge(116, 34, v.warning, "bell", 18),
  "reports-feature":
    shadow +
    doc(30, 12, 58, 80, v.raised) +
    doc(64, 22, 64, 80) +
    title(74, 40, 24) +
    bars(76, 92, [14, 24, 18, 30], v.primary, 7, 5) +
    badge(126, 24, v.primary, "clock", 11),
  "mobile-app": shadow + phone(54, 8, 52, 96) + [0, 1, 2, 3].map((i) => `<rect x="${64 + (i % 2) * 18}" y="${26 + Math.floor(i / 2) * 18}" width="14" height="14" rx="4" ${s([v.primary, v.secondary, v.warning, v.success][i] as string)}/>`).join(""),
  "desktop-app": shadow + `<rect x="22" y="14" width="116" height="70" rx="6" ${s(v.raised, v.line)}/>` + windowCard(30, 22, 100, 54) + `<path d="M68 84l-6 14h36l-6-14M54 98h52" ${s(v.raised, v.line)}/>`,
  "browser-extension":
    shadow +
    windowCard(18, 18, 124, 80) +
    `<rect x="19" y="33" width="122" height="14" ${s(v.raised)}/>` +
    `<rect x="122" y="36" width="12" height="8" rx="2" ${s(v.primary)}/>` +
    lines(30, 62, 70, 3) +
    `<g transform="translate(98 56) scale(0.7)">${puzzle(0, 0, v.primary)}</g>`,
  "cli-tool": shadow + terminal(18, 20, 124, 78) + `<path d="M28 58h${60}M28 70h44M28 82h70" ${s("none", v.faint)}/>`,
  "self-hosted": shadow + server(34, 30, 92, 18) + server(34, 54, 92, 18) + server(34, 78, 92, 18) + `<path d="M80 30V16h28" ${s("none", v.line, "stroke-width:3")}/>` + `<path d="M108 10l10 6-10 6z" ${s(v.primary)}/>`,
  "cloud-hosted": shadow + cloud(80, 46, 1.25) + server(54, 80, 52, 14) + link("M80 66v14"),
  "multi-region": shadow + globe(80, 56, 40) + pin(48, 24, v.primary) + pin(98, 40, v.success) + pin(72, 62, v.warning),
  "community-built": shadow + puzzle(30, 30, v.primary) + puzzle(72, 30, v.secondary) + puzzle(51, 58, v.success) + person(128, 30, 0.5) + person(128, 66, 0.4),
  "privacy-first": shadow + shieldShape(80, 12, v.raised, v.primary) + padlock(80, 34, v.primary),
  "fast-performance": shadow + dial(72, 84, 46, 0.85, v.success) + bolt(116, 14),
  "reliable-uptime":
    shadow +
    card(18, 30, 124, 56) +
    Array.from({ length: 14 }, (_, i) => `<rect x="${26 + i * 8}" y="44" width="5" height="28" rx="1.5" ${s(i === 9 ? v.warning : v.success)}/>`).join("") +
    lines(26, 80, 40, 1),
  scalable: shadow + [0, 1, 2].map((i) => `<rect x="${26 + i * 22}" y="${74 - i * 22}" width="${24 + i * 22}" height="${24 + i * 22}" rx="4" ${s(i === 2 ? v.primary : v.raised, v.line)}/>`).join("") + arrow(30, 54, 66, 18, v.success),
  "secure-by-default": shadow + shieldShape(58, 14, v.raised, v.success) + `<path d="M44 54l10 10 20-20" ${s("none", v.success, "stroke-width:5")}/>` + toggle(110, 50, true),
  accessible: shadow + `<circle cx="80" cy="56" r="42" ${s(v.raised, v.line)}/><circle cx="80" cy="30" r="7" ${s(v.primary)}/>` + `<path d="M54 44h52M80 44v26l-14 22M80 70l14 22" ${s("none", v.primary, "stroke-width:6")}/>`,
  themeable: shadow + `<path d="M80 16a42 42 0 1 0 0 84c6 0 8-6 4-10s-2-12 6-12h12a20 20 0 0 0 20-20c0-24-19-42-42-42z" ${s(v.raised, v.line)}/>` + [[54, 40, v.danger], [76, 30, v.warning], [100, 38, v.success], [56, 64, v.primary]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" ${s(c as string)}/>`).join(""),
  customisable: shadow + card(26, 20, 108, 76) + slider(40, 40, 80, 0.7) + slider(40, 60, 80, 0.4, v.secondary) + slider(40, 80, 80, 0.85, v.warning),
  "offline-ready": shadow + phone(52, 8, 56, 96) + `<path d="M64 46a22 22 0 0 1 32 0M70 54a12 12 0 0 1 20 0" ${s("none", v.faint, "stroke-width:3")}/><circle cx="80" cy="62" r="3" ${s(v.faint)}/>` + badge(110, 82, v.success, "check", 14),
  "connectors-feature":
    shadow +
    `<path d="M14 60h26M120 60h26" ${s("none", v.line, "stroke-width:4")}/>` +
    `<rect x="40" y="46" width="30" height="28" rx="6" ${s(v.raised, v.line)}/>` +
    `<path d="M70 52h12M70 68h12" ${s("none", v.line, "stroke-width:4")}/>` +
    `<rect x="90" y="46" width="30" height="28" rx="6" ${s(v.primary, v.line)}/>` +
    `<rect x="84" y="50" width="6" height="20" rx="2" ${s(v.surface, v.line)}/>` +
    badge(80, 26, v.success, "check", 12),
  "real-time": shadow + card(20, 26, 120, 64) + trend([[28, 70], [44, 60], [56, 66], [70, 44], [84, 52], [98, 36], [112, 46], [126, 40]], v.primary) + `<circle cx="126" cy="40" r="5" ${s(v.danger)}/><circle cx="126" cy="40" r="10" ${s("none", v.danger, "stroke-width:2")} opacity="0.6"/>`,
};

export const set: IllustrationSet = { data, commerce, communication, celebration, features };
