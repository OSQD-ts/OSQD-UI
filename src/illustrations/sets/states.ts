import type { IllustrationSet } from "../categories";
import { s, shadow, sparkle, v } from "../draw";

/**
 * The "states" batch of illustrations: empty states for the objects a product lists, onboarding
 * steps, the account lifecycle, job activity, settings pages and collaboration. Names must be
 * unique across the whole set (the index throws).
 *
 * Every drawing is one main object on the ground shadow plus at most one or two accents in an
 * intent colour, so a page full of them stays calm. The small builders below are local to this
 * file; the shared ones live in ../draw.ts.
 */

const n = (x: number) => Math.round(x * 100) / 100;

// ---------- primitives ----------

/** A plain card with the line border. */
const card = (x: number, y: number, w: number, h: number, fill = v.surface, rx = 6) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${s(fill, v.line)}/>`;

/** A dashed outline where something will go. */
const slot = (x: number, y: number, w: number, h: number, rx = 6, colour = v.faint) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${s("none", colour, "stroke-dasharray:5 4")}/>`;

const ring = (cx: number, cy: number, r: number, colour = v.faint) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${s("none", colour, "stroke-dasharray:4 4")}/>`;

/** Text-like rows: `n` lines starting at (x, y), the last one shorter. */
const rows = (x: number, y: number, w: number, count: number, gap = 10, colour = v.faint, width = 2) => {
  let d = "";
  for (let i = 0; i < count; i++) d += `M${x} ${y + i * gap}h${i === count - 1 ? Math.round(w * 0.6) : w}`;
  return `<path d="${d}" ${s("none", colour, `stroke-width:${width}`)}/>`;
};

const line = (d: string, colour = v.line, width = 2, extra = "") =>
  `<path d="${d}" ${s("none", colour, `stroke-width:${width}${extra ? `;${extra}` : ""}`)}/>`;

const fill = (d: string, colour: string, stroke = "none") => `<path d="${d}" ${s(colour, stroke)}/>`;

const dot = (cx: number, cy: number, r: number, colour: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(colour)}/>`;

/** A circle badge with a small glyph, for the status accent on a main object. */
const badge = (cx: number, cy: number, colour: string, glyph: Glyph, r = 13) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(colour, v.surface, "stroke-width:3")}/>` + mark(cx, cy, glyph, r * 0.42, v.surface);

type Glyph =
  | "check"
  | "x"
  | "plus"
  | "minus"
  | "clock"
  | "pause"
  | "play"
  | "refresh"
  | "dots"
  | "bang"
  | "question"
  | "star"
  | "up"
  | "down"
  | "right"
  | "lock"
  | "bolt"
  | "eye"
  | "heart"
  | "at";

/** A glyph centred on (cx, cy), `k` ≈ half its size, in `colour`. */
const mark = (cx: number, cy: number, glyph: Glyph, k: number, colour: string) => {
  const w = n(Math.max(2.5, k * 0.45));
  const st = (d: string) => line(d, colour, w);
  const a = n(k);
  switch (glyph) {
    case "check":
      return st(`M${n(cx - a)} ${cy}l${n(a * 0.7)} ${n(a * 0.7)}l${n(a * 1.3)}-${n(a * 1.3)}`);
    case "x":
      return st(`M${n(cx - a * 0.8)} ${n(cy - a * 0.8)}l${n(a * 1.6)} ${n(a * 1.6)}M${n(cx + a * 0.8)} ${n(cy - a * 0.8)}l-${n(a * 1.6)} ${n(a * 1.6)}`);
    case "plus":
      return st(`M${cx} ${n(cy - a)}v${n(a * 2)}M${n(cx - a)} ${cy}h${n(a * 2)}`);
    case "minus":
      return st(`M${n(cx - a)} ${cy}h${n(a * 2)}`);
    case "clock":
      return st(`M${cx} ${n(cy - a)}v${a}l${n(a * 0.7)} ${n(a * 0.5)}`);
    case "pause":
      return st(`M${n(cx - a * 0.45)} ${n(cy - a * 0.8)}v${n(a * 1.6)}M${n(cx + a * 0.45)} ${n(cy - a * 0.8)}v${n(a * 1.6)}`);
    case "play":
      return fill(`M${n(cx - a * 0.6)} ${n(cy - a)}l${n(a * 1.6)} ${a}-${n(a * 1.6)} ${a}z`, colour);
    case "refresh":
      // Three quarters of a circle, clockwise from the top, with the arrowhead at its end.
      return (
        st(`M${cx} ${n(cy - a)}A${a} ${a} 0 1 1 ${n(cx - a)} ${cy}`) +
        fill(`M${n(cx - a)} ${n(cy - a * 0.75)}L${n(cx - a * 1.5)} ${n(cy + a * 0.05)}L${n(cx - a * 0.5)} ${n(cy + a * 0.05)}z`, colour)
      );
    case "dots":
      return dot(n(cx - a * 0.8), cy, n(a * 0.28), colour) + dot(cx, cy, n(a * 0.28), colour) + dot(n(cx + a * 0.8), cy, n(a * 0.28), colour);
    case "bang":
      return st(`M${cx} ${n(cy - a)}v${n(a * 1.1)}`) + dot(cx, n(cy + a * 0.8), n(w * 0.55), colour);
    case "question":
      return st(`M${n(cx - a * 0.6)} ${n(cy - a * 0.4)}a${n(a * 0.6)} ${n(a * 0.6)} 0 1 1 ${n(a * 0.6)} ${n(a * 0.6)}v${n(a * 0.25)}`) + dot(cx, n(cy + a * 0.85), n(w * 0.55), colour);
    case "star":
      return fill(starPath(cx, cy, a * 1.15, a * 0.5), colour);
    case "up":
      return st(`M${cx} ${n(cy + a)}v-${n(a * 2)}M${n(cx - a * 0.75)} ${n(cy - a * 0.25)}l${n(a * 0.75)}-${n(a * 0.75)} ${n(a * 0.75)} ${n(a * 0.75)}`);
    case "down":
      return st(`M${cx} ${n(cy - a)}v${n(a * 2)}M${n(cx - a * 0.75)} ${n(cy + a * 0.25)}l${n(a * 0.75)} ${n(a * 0.75)} ${n(a * 0.75)}-${n(a * 0.75)}`);
    case "right":
      return st(`M${n(cx - a)} ${cy}h${n(a * 2)}M${n(cx + a * 0.25)} ${n(cy - a * 0.75)}l${n(a * 0.75)} ${n(a * 0.75)}-${n(a * 0.75)} ${n(a * 0.75)}`);
    case "lock":
      return st(`M${n(cx - a * 0.5)} ${n(cy - a * 0.1)}v-${n(a * 0.4)}a${n(a * 0.5)} ${n(a * 0.5)} 0 0 1 ${a} 0v${n(a * 0.4)}`) + fill(`M${n(cx - a * 0.8)} ${n(cy - a * 0.1)}h${n(a * 1.6)}v${n(a * 1.1)}h-${n(a * 1.6)}z`, colour);
    case "bolt":
      return fill(`M${n(cx + a * 0.2)} ${n(cy - a * 1.1)}l-${n(a * 0.9)} ${n(a * 1.25)}h${n(a * 0.75)}l-${n(a * 0.3)} ${n(a * 0.95)} ${n(a * 0.9)}-${n(a * 1.25)}h-${n(a * 0.75)}z`, colour);
    case "eye":
      return st(`M${n(cx - a * 1.1)} ${cy}q${n(a * 1.1)}-${n(a * 1.2)} ${n(a * 2.2)} 0q-${n(a * 1.1)} ${n(a * 1.2)}-${n(a * 2.2)} 0z`) + dot(cx, cy, n(a * 0.35), colour);
    case "heart":
      return fill(heartPath(cx, cy, a), colour);
    case "at":
      return (
        `<circle cx="${cx}" cy="${cy}" r="${n(a * 0.42)}" ${s("none", colour, `stroke-width:${w}`)}/>` +
        st(`M${n(cx + a * 0.42)} ${n(cy - a * 0.45)}V${n(cy + a * 0.15)}a${n(a * 0.33)} ${n(a * 0.33)} 0 0 0 ${n(a * 0.66)} 0V${cy}A${a} ${a} 0 1 0 ${n(cx + a * 0.55)} ${n(cy + a * 0.84)}`)
      );
  }
};

const starPath = (cx: number, cy: number, ro: number, ri: number) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i === 0 ? "M" : "L"}${n(cx + r * Math.cos(ang))} ${n(cy + r * Math.sin(ang))}`;
  }
  return `${d}z`;
};

const heartPath = (cx: number, cy: number, k: number) =>
  `M${cx} ${n(cy + k)}C${n(cx - k * 1.6)} ${n(cy - k * 0.1)} ${n(cx - k * 0.9)} ${n(cy - k * 1.5)} ${cx} ${n(cy - k * 0.6)}C${n(cx + k * 0.9)} ${n(cy - k * 1.5)} ${n(cx + k * 1.6)} ${n(cy - k * 0.1)} ${cx} ${n(cy + k)}z`;

// ---------- objects ----------

/** A person: head and shoulders, centred on cx with the head top at y; `k` scales. */
const person = (cx: number, y: number, k = 1, fillColour = v.raised) =>
  `<circle cx="${cx}" cy="${n(y + 12 * k)}" r="${n(12 * k)}" ${s(fillColour, v.line)}/>` +
  `<path d="M${n(cx - 22 * k)} ${n(y + 50 * k)}a${n(22 * k)} ${n(20 * k)} 0 0 1 ${n(44 * k)} 0z" ${s(fillColour, v.line)}/>`;

/** A document with a folded corner, rows of text. */
const doc = (x: number, y: number, w: number, h: number, lines = 4, fillColour = v.surface) =>
  `<path d="M${x + 4} ${y}h${w - 18}l14 14v${h - 18}a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4V${y + 4}a4 4 0 0 1 4-4z" ${s(fillColour, v.line)}/>` +
  `<path d="M${x + w - 14} ${y}v10a4 4 0 0 0 4 4h10" ${s("none", v.line)}/>` +
  (lines ? rows(x + 10, y + 24, w - 24, lines, 9) : "");

const folder = (x: number, y: number, w: number, h: number, fillColour = v.raised) =>
  `<path d="M${x} ${y + 6}a4 4 0 0 1 4-4h${n(w * 0.3)}l6 8h${n(w * 0.7 - 10)}a4 4 0 0 1 4 4v${h - 14}a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4z" ${s(fillColour, v.line)}/>`;

const calendar = (x: number, y: number, w: number, h: number) =>
  card(x, y, w, h) +
  `<path d="M${x} ${y + 18}h${w}" ${s("none", v.line)}/>` +
  line(`M${x + 16} ${y - 6}v12M${x + w - 16} ${y - 6}v12`, v.line, 4);

/** A calendar grid of cells (3 rows × `cols`), `on` lists highlighted cell indexes. */
const grid = (x: number, y: number, cols: number, cell: number, on: number[] = [], colour = v.primary) => {
  let out = "";
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      out += `<rect x="${x + c * (cell + 4)}" y="${y + r * (cell + 4)}" width="${cell}" height="${cell}" rx="2" ${s(on.includes(i) ? colour : v.raised)}/>`;
    }
  return out;
};

const envelope = (x: number, y: number, w: number, h: number) =>
  card(x, y, w, h, v.surface, 5) + line(`M${x + 2} ${y + 4}l${n(w / 2 - 2)} ${n(h * 0.5)} ${n(w / 2 - 2)}-${n(h * 0.5)}`, v.line, 2);

/** A speech bubble with its tail on the left or right. */
const bubble = (x: number, y: number, w: number, h: number, side: "left" | "right", fillColour = v.surface) => {
  const tail = side === "left" ? `M${x + 12} ${y + h}l-4 10 14-10` : `M${x + w - 12} ${y + h}l4 10-14-10`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ${s(fillColour, v.line)}/>` + fill(tail, fillColour, v.line) + `<path d="${side === "left" ? `M${x + 12} ${y + h}h12` : `M${x + w - 24} ${y + h}h12`}" ${s("none", fillColour, "stroke-width:3")}/>`;
};

const monitor = (cx: number, y: number, w: number, h: number) =>
  card(cx - w / 2, y, w, h, v.surface, 5) + line(`M${cx} ${y + h}v8M${cx - 14} ${y + h + 8}h28`, v.line, 3);

const laptop = (cx: number, y: number, w: number, h: number) =>
  card(cx - w / 2, y, w, h, v.surface, 4) + fill(`M${cx - w / 2 - 10} ${y + h}h${w + 20}l-4 7H${cx - w / 2 - 6}z`, v.raised, v.line);

const phone = (x: number, y: number, w: number, h: number) =>
  card(x, y, w, h, v.surface, 7) + line(`M${x + w / 2 - 5} ${y + h - 6}h10`, v.faint, 2);

/** A gear with `teeth` teeth. */
const gear = (cx: number, cy: number, r: number, fillColour = v.raised, teeth = 8) => {
  let d = "";
  const ro = r;
  const ri = r * 0.78;
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i * Math.PI) / teeth - Math.PI / teeth / 2;
    const a1 = a0 + Math.PI / teeth;
    const rr = i % 2 === 0 ? ro : ri;
    d += `${i === 0 ? "M" : "L"}${n(cx + rr * Math.cos(a0 + 0.08))} ${n(cy + rr * Math.sin(a0 + 0.08))}L${n(cx + rr * Math.cos(a1 - 0.08))} ${n(cy + rr * Math.sin(a1 - 0.08))}`;
  }
  return `<path d="${d}z" ${s(fillColour, v.line)}/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.32)}" ${s(v.surface, v.line)}/>`;
};

const bell = (cx: number, y: number, k = 1, fillColour = v.raised) =>
  `<path d="M${n(cx - 22 * k)} ${n(y + 46 * k)}v-${n(16 * k)}a${n(22 * k)} ${n(22 * k)} 0 0 1 ${n(44 * k)} 0v${n(16 * k)}l${n(6 * k)} ${n(8 * k)}H${n(cx - 28 * k)}z" ${s(fillColour, v.line)}/>` +
  `<path d="M${n(cx - 7 * k)} ${n(y + 58 * k)}a${n(7 * k)} ${n(7 * k)} 0 0 0 ${n(14 * k)} 0" ${s("none", v.line, "stroke-width:3")}/>` +
  line(`M${cx} ${y}v${n(8 * k)}`, v.line, 3);

const clock = (cx: number, cy: number, r: number, hand: [number, number] = [0, 3], fillColour = v.raised, handColour = v.primary) => {
  const ang = (t: number, frac: number) => [n(cx + r * frac * Math.sin((t / 12) * 2 * Math.PI)), n(cy - r * frac * Math.cos((t / 12) * 2 * Math.PI))];
  const [hx, hy] = ang(hand[0], 0.5);
  const [mx, my] = ang(hand[1], 0.75);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(fillColour, v.line)}/>` + line(`M${hx} ${hy}L${cx} ${cy}L${mx} ${my}`, handColour, 3);
};

const hourglass = (cx: number, y: number, k = 1) =>
  line(`M${n(cx - 20 * k)} ${y}h${n(40 * k)}M${n(cx - 20 * k)} ${n(y + 64 * k)}h${n(40 * k)}`, v.line, 4) +
  fill(`M${n(cx - 15 * k)} ${n(y + 2 * k)}h${n(30 * k)}c0 ${n(14 * k)}-${n(11 * k)} ${n(20 * k)}-${n(11 * k)} ${n(30 * k)}s${n(11 * k)} ${n(16 * k)} ${n(11 * k)} ${n(30 * k)}h-${n(30 * k)}c0-${n(14 * k)} ${n(11 * k)}-${n(20 * k)} ${n(11 * k)}-${n(30 * k)}s-${n(11 * k)}-${n(16 * k)}-${n(11 * k)}-${n(30 * k)}z`, v.surface, v.line) +
  fill(`M${n(cx - 9 * k)} ${n(y + 60 * k)}q${n(9 * k)}-${n(14 * k)} ${n(18 * k)} 0z`, v.warning);

const key = (cx: number, cy: number, k = 1, colour = v.warning) =>
  `<circle cx="${n(cx - 16 * k)}" cy="${cy}" r="${n(12 * k)}" ${s(colour, v.line)}/>` +
  `<circle cx="${n(cx - 16 * k)}" cy="${cy}" r="${n(4 * k)}" ${s(v.surface, v.line)}/>` +
  fill(`M${n(cx - 5 * k)} ${n(cy - 4 * k)}h${n(32 * k)}v${n(8 * k)}h-${n(5 * k)}v${n(6 * k)}h-${n(6 * k)}v-${n(6 * k)}h-${n(4 * k)}v${n(4 * k)}h-${n(6 * k)}v-${n(4 * k)}h-${n(11 * k)}z`, colour, v.line);

const padlock = (cx: number, y: number, k = 1, open = false, bodyColour = v.raised) =>
  `<path d="M${n(cx - 12 * k)} ${n(y + 24 * k)}v-${n(10 * k)}a${n(12 * k)} ${n(12 * k)} 0 0 1 ${n(24 * k)} 0${open ? `v-${n(2 * k)}` : `v${n(10 * k)}`}" ${s("none", v.line, `stroke-width:${n(5 * k)}`)}/>` +
  `<rect x="${n(cx - 20 * k)}" y="${n(y + 24 * k)}" width="${n(40 * k)}" height="${n(32 * k)}" rx="${n(5 * k)}" ${s(bodyColour, v.line)}/>` +
  dot(cx, n(y + 38 * k), n(4 * k), v.faint) + line(`M${cx} ${n(y + 40 * k)}v${n(7 * k)}`, v.faint, n(3 * k));

const toggle = (x: number, y: number, on: boolean, colour = v.success, w = 36) =>
  `<rect x="${x}" y="${y}" width="${w}" height="20" rx="10" ${s(on ? colour : v.raised, v.line)}/>` +
  `<circle cx="${on ? x + w - 10 : x + 10}" cy="${y + 10}" r="7" ${s(v.surface, v.line)}/>`;

const slider = (x: number, y: number, w: number, t: number, colour = v.primary) =>
  line(`M${x} ${y}h${w}`, v.line, 4) + line(`M${x} ${y}h${n(w * t)}`, colour, 4) + `<circle cx="${n(x + w * t)}" cy="${y}" r="7" ${s(v.surface, colour, "stroke-width:3")}/>`;

const checkbox = (x: number, y: number, on: boolean, colour = v.success) =>
  `<rect x="${x}" y="${y}" width="12" height="12" rx="3" ${s(on ? colour : v.surface, on ? colour : v.line)}/>` + (on ? mark(x + 6, y + 6, "check", 3.6, v.surface) : "");

const cloud = (cx: number, cy: number, k = 1, fillColour = v.raised) =>
  `<path d="M${n(cx - 26 * k)} ${n(cy + 16 * k)}a${n(14 * k)} ${n(14 * k)} 0 0 1-${n(2 * k)}-${n(28 * k)}a${n(20 * k)} ${n(20 * k)} 0 0 1 ${n(38 * k)}-${n(6 * k)}a${n(14 * k)} ${n(14 * k)} 0 0 1 ${n(18 * k)} ${n(34 * k)}z" ${s(fillColour, v.line)}/>`;

/** A picture: frame, sun and hills. */
const picture = (x: number, y: number, w: number, h: number, fillColour = v.surface) =>
  card(x, y, w, h, fillColour, 5) +
  dot(x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.1, v.warning) +
  fill(`M${x + 4} ${y + h - 4}l${n(w * 0.3)}-${n(h * 0.42)} ${n(w * 0.22)} ${n(h * 0.26)} ${n(w * 0.12)}-${n(h * 0.14)} ${n(w * 0.28)} ${n(h * 0.3)}z`, v.raised, v.line);

const puzzle = (x: number, y: number, k: number, fillColour: string) =>
  `<path d="M${x} ${y}h${n(12 * k)}a${n(5 * k)} ${n(5 * k)} 0 1 1 ${n(10 * k)} 0h${n(12 * k)}v${n(12 * k)}a${n(5 * k)} ${n(5 * k)} 0 1 1 0 ${n(10 * k)}v${n(12 * k)}H${x}z" ${s(fillColour, v.line)}/>`;

const chartAxes = (x: number, y: number, w: number, h: number) => line(`M${x} ${y}v${h}h${w}`, v.line, 2);

const bars = (x: number, base: number, heights: number[], w = 10, gap = 6, colour = v.primary) =>
  heights.map((h, i) => `<rect x="${x + i * (w + gap)}" y="${base - h}" width="${w}" height="${h}" rx="2" ${s(i === heights.length - 1 ? colour : v.raised, v.line)}/>`).join("");

const kanbanCol = (x: number, y: number, h: number, cards: number, accent?: string) => {
  let out = `<rect x="${x}" y="${y}" width="30" height="${h}" rx="4" ${s(v.raised, v.line)}/>`;
  for (let i = 0; i < cards; i++) out += `<rect x="${x + 4}" y="${y + 8 + i * 16}" width="22" height="12" rx="2" ${s(i === 0 && accent ? accent : v.surface, v.line)}/>`;
  return out;
};

/** A cursor arrow pointing up-left with its tip at (x, y). */
const cursor = (x: number, y: number, colour = v.text) =>
  fill(`M${x} ${y}l0 22 6-5 4 9 5-2-4-9 8-1z`, colour, v.line);

/** A list row: avatar dot, text, optional trailing mark. */
const listRow = (x: number, y: number, w: number, accent = v.raised) =>
  `<rect x="${x}" y="${y}" width="${w}" height="16" rx="4" ${s(v.surface, v.line)}/>` + dot(x + 9, y + 8, 4, accent) + line(`M${x + 18} ${y + 8}h${n(w * 0.45)}`, v.faint, 2);

const avatars = (cx: number, y: number, count: number, gap = 22, colours: string[] = [], r = 11) => {
  let out = "";
  const x0 = cx - ((count - 1) * gap) / 2;
  for (let i = 0; i < count; i++) {
    const x = x0 + i * gap;
    out += `<circle cx="${x}" cy="${y}" r="${r}" ${s(colours[i] ?? v.raised, v.line, "stroke-width:2")}/>` + `<circle cx="${x}" cy="${n(y - r * 0.2)}" r="${n(r * 0.36)}" ${s(v.surface, v.line)}/>` + `<path d="M${n(x - r * 0.58)} ${n(y + r * 0.72)}a${n(r * 0.58)} ${n(r * 0.48)} 0 0 1 ${n(r * 1.16)} 0" ${s(v.surface, v.line)}/>`;
  }
  return out;
};

const ticket = (x: number, y: number, w: number, h: number, fillColour = v.surface) =>
  `<path d="M${x + 4} ${y}h${w - 8}a4 4 0 0 1 4 4v${n(h / 2 - 10)}a6 6 0 0 0 0 12v${n(h / 2 - 10)}a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4v-${n(h / 2 - 10)}a6 6 0 0 0 0-12V${y + 4}a4 4 0 0 1 4-4z" ${s(fillColour, v.line)}/>` +
  line(`M${x + 16} ${y + 6}v${h - 12}`, v.line, 2, "stroke-dasharray:3 4");

const receipt = (x: number, y: number, w: number, h: number) => {
  const teeth = Math.floor(w / 8);
  let zig = "";
  for (let i = 0; i < teeth; i++) zig += `l4 4 4-4`;
  return `<path d="M${x} ${y}h${w}v${h}${zig.replace(/l4 4 4-4/g, "l-4 4-4-4")}z" ${s(v.surface, v.line)}/>`;
};

/** A plug with a short cable going down. */
const plug = (cx: number, y: number, k = 1, fillColour = v.raised) =>
  line(`M${n(cx - 7 * k)} ${y}v${n(10 * k)}M${n(cx + 7 * k)} ${y}v${n(10 * k)}`, v.line, n(4 * k)) +
  `<rect x="${n(cx - 15 * k)}" y="${n(y + 10 * k)}" width="${n(30 * k)}" height="${n(22 * k)}" rx="${n(5 * k)}" ${s(fillColour, v.line)}/>` +
  line(`M${cx} ${n(y + 32 * k)}v${n(10 * k)}q0 ${n(8 * k)} ${n(8 * k)} ${n(8 * k)}`, v.line, 3);

const flag = (x: number, y: number, colour: string) => line(`M${x} ${y}v40`, v.line, 3) + fill(`M${x} ${y}h24l-6 8 6 8H${x}z`, colour, v.line);

const magnifier = (cx: number, cy: number, r: number, fillColour = v.raised) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(fillColour, v.line, "stroke-width:3")}/>` + line(`M${n(cx + r * 0.7)} ${n(cy + r * 0.7)}l${n(r * 0.6)} ${n(r * 0.6)}`, v.line, 6);

/** The rocket at roughly twice the small one's size, for a hero spot. */
const rocketBig = (cx: number, y: number) =>
  fill(`M${cx} ${y}c18 14 22 40 15 64h-30c-7-24-3-50 15-64z`, v.raised, v.line) +
  `<circle cx="${cx}" cy="${y + 30}" r="8" ${s(v.primary, v.line)}/>` +
  fill(`M${cx - 15} ${y + 46}l-14 22h15zM${cx + 15} ${y + 46}l14 22h-15z`, v.primary, v.line) +
  fill(`M${cx - 9} ${y + 66}h18l-9 18z`, v.warning);

const tray = (x: number, y: number, w: number) =>
  fill(`M${x} ${y}h${n(w * 0.25)}l6 8h${n(w * 0.5 - 12)}l6-8h${n(w * 0.25)}v18a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4z`, v.raised, v.line);

const playlistFrame = (x: number, y: number, w: number, h: number) =>
  card(x, y, w, h, v.surface, 6) + fill(`M${x + w / 2 - 7} ${y + h / 2 - 10}l18 10-18 10z`, v.faint);

const shieldMini = (cx: number, y: number, k: number, fillColour: string) =>
  `<path d="M${cx} ${y}l${n(20 * k)} ${n(7 * k)}v${n(16 * k)}c0 ${n(13 * k)}-${n(9 * k)} ${n(21 * k)}-${n(20 * k)} ${n(25 * k)}-${n(11 * k)}-${n(4 * k)}-${n(20 * k)}-${n(12 * k)}-${n(20 * k)}-${n(25 * k)}V${n(y + 7 * k)}z" ${s(fillColour, v.line)}/>`;

const globe = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(v.raised, v.line)}/>` +
  line(`M${cx - r} ${cy}h${2 * r}M${cx} ${cy - r}c${n(r * 0.6)} ${n(r * 0.5)} ${n(r * 0.6)} ${n(r * 1.5)} 0 ${2 * r}M${cx} ${cy - r}c-${n(r * 0.6)} ${n(r * 0.5)}-${n(r * 0.6)} ${n(r * 1.5)} 0 ${2 * r}`, v.line, 2);

const keycap = (x: number, y: number, w = 20, fillColour = v.raised) =>
  `<rect x="${x}" y="${y}" width="${w}" height="20" rx="4" ${s(fillColour, v.line)}/><path d="M${x + 3} ${y + 16}h${w - 6}" ${s("none", v.line)}/>`;

const palette = (cx: number, cy: number) =>
  `<path d="M${cx} ${cy - 34}a34 32 0 1 0 0 64c6 0 8-6 4-10s-2-12 6-12h12a12 12 0 0 0 12-12c0-16-15-30-34-30z" ${s(v.raised, v.line)}/>` +
  dot(cx - 18, cy - 4, 6, v.danger) + dot(cx - 8, cy - 20, 6, v.warning) + dot(cx + 12, cy - 20, 6, v.success) + dot(cx + 22, cy - 2, 6, v.primary);

const flask = (cx: number, y: number, liquid: string) =>
  `<path d="M${cx - 9} ${y}v26l-22 36a4 4 0 0 0 3 6h56a4 4 0 0 0 3-6l-22-36V${y}" ${s(v.surface, v.line)}/>` +
  fill(`M${cx - 23} ${y + 50}h46l8 14a2 2 0 0 1-2 3H${cx - 33}a2 2 0 0 1-2-3z`, liquid) +
  line(`M${cx - 13} ${y}h26`, v.line, 4) + dot(cx - 6, y + 44, 3, liquid) + dot(cx + 4, y + 38, 2, liquid);

const ground = shadow;

// ---------- the set ----------

const empty = {
  "empty-dashboard":
    ground +
    card(26, 18, 108, 80) +
    slot(34, 28, 44, 28, 4) +
    slot(84, 28, 42, 28, 4) +
    slot(34, 62, 92, 28, 4) +
    mark(56, 42, "plus", 5, v.primary),

  "empty-chart":
    ground +
    card(28, 16, 104, 80) +
    chartAxes(42, 28, 78, 56) +
    line("M48 70c10-2 14-10 22-10s12 6 20 4 12-12 22-14", v.faint, 2, "stroke-dasharray:4 5") +
    ring(112, 40, 6, v.primary),

  "empty-list":
    ground +
    card(36, 14, 88, 84) +
    slot(46, 26, 68, 14, 4) +
    slot(46, 46, 68, 14, 4) +
    slot(46, 66, 68, 14, 4) +
    dot(54, 33, 3, v.faint) +
    dot(54, 53, 3, v.faint) +
    dot(54, 73, 3, v.faint),

  "empty-calendar":
    ground +
    calendar(36, 22, 88, 74) +
    grid(46, 50, 5, 10, []) +
    ring(80, 64, 9, v.primary),

  "empty-kanban":
    ground +
    `<rect x="30" y="20" width="30" height="78" rx="4" ${s(v.raised, v.line)}/>` +
    `<rect x="65" y="20" width="30" height="78" rx="4" ${s(v.raised, v.line)}/>` +
    `<rect x="100" y="20" width="30" height="78" rx="4" ${s(v.raised, v.line)}/>` +
    slot(34, 28, 22, 14, 2) +
    slot(69, 28, 22, 14, 2) +
    slot(104, 28, 22, 14, 2) +
    mark(80, 70, "plus", 5, v.primary),

  "empty-messages":
    ground +
    bubble(26, 26, 64, 34, "left") +
    bubble(70, 52, 64, 30, "right", v.raised) +
    mark(58, 43, "dots", 9, v.faint) +
    mark(102, 67, "dots", 8, v.faint),

  "empty-contacts":
    ground +
    card(38, 14, 84, 86) +
    `<path d="M38 30h84" ${s("none", v.line)}/>` +
    ring(80, 52, 14) +
    line("M58 88a22 18 0 0 1 44 0", v.faint, 2, "stroke-dasharray:4 4") +
    line("M34 40h8M34 60h8M34 80h8", v.line, 4),

  "empty-files":
    ground +
    doc(60, 20, 52, 66, 0, v.raised) +
    doc(46, 28, 52, 66, 0) +
    slot(56, 56, 32, 4, 2),

  "empty-images":
    ground +
    `<rect x="30" y="28" width="62" height="50" rx="5" ${s(v.raised, v.line)}/>` +
    picture(52, 38, 76, 58) +
    `<path d="M110 22v14M103 29h14" ${s("none", v.primary, "stroke-width:3")}/>`,

  "empty-videos":
    ground +
    playlistFrame(36, 22, 88, 58) +
    line("M36 90h88", v.line, 4) +
    line("M36 90h18", v.primary, 4) +
    dot(54, 90, 5, v.primary),

  "empty-favourites":
    ground +
    `<path d="${starPath(80, 56, 38, 16)}" ${s("none", v.faint, "stroke-width:2;stroke-dasharray:5 4")}/>` +
    sparkle(124, 30, 7, v.warning) +
    sparkle(40, 40, 5, v.warning),

  "empty-bookmarks":
    ground +
    fill("M62 18h44v80l-22-16-22 16z", v.raised, v.line) +
    fill("M48 30h44v68l-22-16-22 16z", v.surface, v.line) +
    mark(70, 50, "plus", 6, v.primary),

  "empty-history":
    ground +
    `<circle cx="80" cy="58" r="34" ${s(v.raised, v.line)}/>` +
    line("M48 40a36 36 0 0 1 10-12", v.primary, 4) +
    fill("M44 28l4 14 12-6z", v.primary) +
    line("M80 40v18h14", v.faint, 4),

  "empty-downloads":
    ground +
    tray(40, 72, 80) +
    line("M80 18v40", v.primary, 5) +
    line("M66 46l14 14 14-14", v.primary, 5),

  "empty-uploads":
    ground +
    tray(40, 72, 80) +
    cloud(80, 38, 0.9) +
    line("M80 64V34", v.primary, 5) +
    line("M68 44l12-12 12 12", v.primary, 5),

  "empty-tasks":
    ground +
    card(38, 16, 84, 82) +
    checkbox(50, 30, false) +
    checkbox(50, 52, false) +
    checkbox(50, 74, false) +
    rows(70, 36, 38, 1) +
    rows(70, 58, 38, 1) +
    rows(70, 80, 30, 1),

  "empty-tickets":
    ground +
    ticket(30, 30, 84, 48, v.raised) +
    ticket(46, 42, 84, 48) +
    line("M74 58h40M74 70h28", v.faint, 2),

  "empty-alerts":
    ground +
    bell(80, 18, 1.1) +
    line("M114 32c6 6 8 14 6 22M46 32c-6 6-8 14-6 22", v.faint, 3, "stroke-dasharray:3 5"),

  "empty-rules":
    ground +
    card(32, 18, 96, 80) +
    toggle(44, 30, false) +
    toggle(44, 54, false) +
    toggle(44, 78, false, v.success, 36) +
    rows(88, 40, 30, 1) +
    rows(88, 64, 30, 1),

  "empty-policies":
    ground +
    doc(36, 18, 64, 80, 5) +
    shieldMini(108, 46, 1.1, v.raised) +
    ring(108, 70, 6, v.primary),

  "empty-api-keys":
    ground +
    card(26, 34, 108, 44) +
    slot(36, 46, 64, 20, 4) +
    mark(48, 56, "dots", 6, v.faint) +
    key(118, 56, 0.55, v.raised),

  "empty-webhooks":
    ground +
    `<circle cx="56" cy="40" r="12" ${s(v.raised, v.line)}/>` +
    `<circle cx="104" cy="40" r="12" ${s(v.raised, v.line)}/>` +
    `<circle cx="80" cy="82" r="12" ${s(v.raised, v.line)}/>` +
    line("M62 50l12 22M98 50 86 72M68 40h24", v.faint, 3, "stroke-dasharray:4 4") +
    dot(80, 82, 4, v.primary),

  "empty-integrations":
    ground +
    puzzle(42, 40, 1.1, v.raised) +
    `<path d="M88 40h36v36H88z" ${s("none", v.faint, "stroke-dasharray:5 4")}/>` +
    mark(106, 58, "plus", 6, v.primary),

  "empty-reports":
    ground +
    doc(44, 16, 72, 84, 0) +
    bars(56, 84, [12, 22, 16], 10, 6, v.raised) +
    rows(56, 34, 40, 2),

  "empty-projects":
    ground +
    folder(30, 30, 50, 46) +
    folder(84, 30, 50, 46, v.surface) +
    `<path d="M57 92h46" ${s("none", v.faint, "stroke-dasharray:4 4")}/>` +
    mark(109, 56, "plus", 6, v.primary),

  "empty-team":
    ground +
    person(80, 26, 1) +
    `<circle cx="40" cy="48" r="10" ${s("none", v.faint, "stroke-dasharray:4 4")}/>` +
    `<circle cx="120" cy="48" r="10" ${s("none", v.faint, "stroke-dasharray:4 4")}/>` +
    line("M26 86a14 12 0 0 1 28 0M106 86a14 12 0 0 1 28 0", v.faint, 2, "stroke-dasharray:4 4"),

  "empty-comments":
    ground +
    bubble(30, 22, 100, 50, "left") +
    line("M44 40h52M44 52h34", v.faint, 2, "stroke-dasharray:4 4") +
    cursor(106, 56, v.primary),

  "empty-orders":
    ground +
    fill("M44 38h72l-6 56H50z", v.raised, v.line) +
    line("M62 38v-6a18 18 0 0 1 36 0v6", v.line, 4) +
    ring(80, 66, 10, v.primary),

  "empty-invoices":
    ground +
    receipt(50, 14, 60, 76) +
    line("M60 30h40M60 42h28M60 54h34", v.faint, 2) +
    line("M60 70h40", v.line, 2, "stroke-dasharray:4 4"),

  "empty-sessions":
    ground +
    monitor(80, 20, 92, 58) +
    clock(80, 49, 16, [10, 2], v.surface, v.faint),

  "empty-devices":
    ground +
    laptop(70, 32, 70, 46) +
    phone(108, 46, 26, 46) +
    ring(70, 55, 8) +
    ring(121, 66, 5),

  "empty-logs-filtered":
    ground +
    card(28, 18, 104, 80, v.surface, 5) +
    line("M38 32h60M38 44h70M38 56h50", v.faint, 2) +
    line("M38 68h70M38 80h44", v.faint, 2, "stroke-dasharray:3 5") +
    fill("M100 62h28l-11 13v11l-6 3V75z", v.primary, v.line),

  "no-matches-filter":
    ground +
    fill("M38 22h84l-32 38v28l-20 10V60z", v.raised, v.line) +
    badge(112, 78, v.warning, "x", 12),

  "nothing-selected":
    ground +
    card(30, 20, 46, 76) +
    card(84, 20, 46, 76, v.raised) +
    listRow(34, 30, 38) +
    listRow(34, 52, 38) +
    listRow(34, 74, 38) +
    cursor(98, 46, v.primary),

  "no-preview":
    ground +
    card(32, 18, 96, 76) +
    line("M58 38a24 22 0 0 0 0 40M102 38a24 22 0 0 1 0 40", v.faint, 3) +
    mark(80, 58, "eye", 14, v.faint) +
    line("M62 76 98 40", v.danger, 4),

  "select-item-to-view":
    ground +
    card(26, 26, 40, 66) +
    card(74, 18, 60, 80, v.raised) +
    `<rect x="30" y="44" width="32" height="14" rx="3" ${s(v.primary)}/>` +
    line("M30 34h26M30 68h26M30 80h20", v.faint, 2) +
    line("M68 51h10", v.primary, 3) +
    fill("M76 46l7 5-7 5z", v.primary),

  "drag-to-start":
    ground +
    slot(28, 22, 104, 74, 10) +
    card(58, 32, 36, 28, v.raised, 4) +
    cursor(84, 50, v.primary) +
    line("M76 74v10", v.faint, 2, "stroke-dasharray:2 3"),

  "empty-notes":
    ground +
    `<rect x="44" y="18" width="72" height="78" rx="4" ${s(v.warning, v.line)}/>` +
    `<rect x="44" y="18" width="72" height="12" rx="4" ${s(v.raised, v.line)}/>` +
    line("M56 46h48M56 58h48M56 70h30", v.surface, 2, "stroke-dasharray:4 4"),

  "empty-queue":
    ground +
    line("M28 74h104", v.line, 3) +
    slot(34, 46, 24, 24, 5) +
    slot(64, 46, 24, 24, 5) +
    slot(94, 46, 24, 24, 5) +
    fill("M124 66l8 8-8 8z", v.primary),

  "empty-tags":
    ground +
    fill("M40 34h44l22 22-22 22H40z", v.raised, v.line) +
    dot(54, 56, 5, v.surface) +
    `<path d="M70 44h40l18 18-18 18H70z" ${s("none", v.faint, "stroke-dasharray:5 4")}/>`,
};

const onboarding = {
  "welcome-wave":
    ground +
    line("M98 74 112 46 112 30", v.line, 9) +
    line("M98 74 112 46 112 30", v.raised, 5) +
    person(76, 26, 1.15) +
    `<circle cx="112" cy="26" r="7" ${s(v.raised, v.line)}/>` +
    line("M124 16c4 3 6 7 6 12M130 10c6 4 9 10 9 18M100 16c-4 3-6 7-6 12", v.primary, 2.5),

  "welcome-workspace":
    ground +
    monitor(80, 18, 96, 60) +
    line("M42 30h76", v.line, 2) +
    sparkle(80, 50, 12, v.primary) +
    sparkle(104, 40, 5, v.warning),

  "getting-started":
    ground +
    line("M30 86h28v-18h28v-18h28V32", v.line, 4) +
    flag(114, 14, v.success) +
    dot(44, 78, 6, v.primary),

  "connect-first-source":
    ground +
    `<path d="M26 40a10 6 0 0 1 20 0v38a10 6 0 0 1-20 0z" ${s(v.raised, v.line)}/>` +
    `<ellipse cx="36" cy="40" rx="10" ry="6" ${s(v.surface, v.line)}/>` +
    line("M48 58h26", v.faint, 3, "stroke-dasharray:4 4") +
    plug(90, 38, 1) +
    card(108, 38, 28, 40, v.surface, 5) +
    dot(122, 58, 5, v.success),

  "install-agent":
    ground +
    card(26, 22, 108, 70, v.surface, 6) +
    line("M38 40l10 8-10 8M54 58h20", v.success, 3) +
    line("M38 72h70", v.line, 4) +
    line("M38 72h44", v.primary, 4),

  "add-first-rule":
    ground +
    card(34, 24, 92, 68) +
    `<path d="M46 40h30M46 52h44M46 64h22" ${s("none", v.faint)}/>` +
    toggle(84, 66, true) +
    badge(122, 28, v.primary, "plus", 12),

  "invite-teammates":
    ground +
    avatars(62, 64, 3, 30, [v.raised, v.primary, v.raised], 15) +
    envelope(100, 22, 40, 28) +
    line("M108 80c14-4 20-14 18-26", v.faint, 2, "stroke-dasharray:3 4") +
    badge(136, 22, v.success, "plus", 9),

  "choose-plan":
    ground +
    card(26, 32, 32, 60, v.raised) +
    card(64, 20, 32, 72, v.surface) +
    card(102, 32, 32, 60, v.raised) +
    `<rect x="64" y="20" width="32" height="12" rx="6" ${s(v.primary)}/>` +
    rows(70, 46, 20, 3, 9) +
    mark(80, 82, "check", 5, v.success),

  "product-tour":
    ground +
    card(26, 20, 108, 74) +
    ring(62, 50, 16, v.primary) +
    bubble(86, 30, 42, 24, "left", v.raised) +
    dot(98, 82, 3, v.primary) +
    dot(108, 82, 3, v.line) +
    dot(118, 82, 3, v.line),

  tips:
    ground +
    `<path d="M80 18a26 26 0 0 0-16 46c4 4 6 8 6 14h20c0-6 2-10 6-14a26 26 0 0 0-16-46z" ${s(v.warning, v.line)}/>` +
    `<rect x="70" y="80" width="20" height="10" rx="3" ${s(v.raised, v.line)}/>` +
    line("M74 94h12", v.line, 3) +
    line("M80 52v12M74 46l6 6 6-6", v.surface, 3),

  "keyboard-shortcuts":
    ground +
    card(24, 44, 112, 50, v.raised) +
    keycap(32, 52) +
    keycap(56, 52) +
    keycap(80, 52) +
    keycap(104, 52, 24) +
    keycap(32, 76, 72) +
    keycap(108, 76, 20, v.primary) +
    bubble(56, 14, 48, 22, "left") +
    mark(80, 25, "plus", 5, v.primary),

  customise:
    ground +
    card(32, 20, 96, 74) +
    slider(48, 40, 64, 0.3) +
    slider(48, 58, 64, 0.7, v.secondary) +
    slider(48, 76, 64, 0.5, v.success),

  "pick-theme":
    ground +
    `<rect x="28" y="28" width="50" height="62" rx="6" ${s(v.text, v.line)}/>` +
    `<rect x="82" y="28" width="50" height="62" rx="6" ${s(v.surface, v.line)}/>` +
    line("M38 44h30M38 56h20", v.line, 3) +
    line("M92 44h30M92 56h20", v.faint, 3) +
    badge(106, 80, v.primary, "check", 10),

  "all-set":
    ground +
    `<circle cx="80" cy="58" r="34" ${s(v.success, v.line)}/>` +
    mark(80, 58, "check", 16, v.surface) +
    sparkle(124, 30, 7, v.warning) +
    sparkle(36, 34, 5, v.primary) +
    sparkle(126, 82, 4, v.secondary),

  "first-success":
    ground +
    `<path d="M58 22h44v18a22 22 0 0 1-44 0z" ${s(v.warning, v.line)}/>` +
    line("M58 28h-10a10 10 0 0 0 12 14M102 28h10a10 10 0 0 1-12 14", v.line, 3) +
    line("M80 62v14", v.line, 5) +
    `<rect x="64" y="76" width="32" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    mark(80, 38, "star", 7, v.surface),

  "import-sample-data":
    ground +
    `<path d="M30 44a14 6 0 0 1 28 0v34a14 6 0 0 1-28 0z" ${s(v.raised, v.line)}/>` +
    `<ellipse cx="44" cy="44" rx="14" ry="6" ${s(v.surface, v.line)}/>` +
    line("M64 60h22", v.primary, 4) +
    fill("M84 52l10 8-10 8z", v.primary) +
    card(100, 34, 34, 52) +
    grid(105, 42, 3, 6, [0, 4, 8], v.secondary),

  "checklist-progress":
    ground +
    card(36, 14, 88, 86) +
    checkbox(48, 26, true) +
    checkbox(48, 46, true) +
    checkbox(48, 66, false) +
    rows(68, 32, 40, 1) +
    rows(68, 52, 40, 1) +
    rows(68, 72, 40, 1) +
    line("M48 90h64", v.line, 4) +
    line("M48 90h42", v.success, 4),
};

const account = {
  "account-secured":
    ground +
    padlock(70, 20, 1.3) +
    badge(106, 80, v.success, "check", 13) +
    sparkle(112, 30, 6, v.success),

  "sign-up":
    ground +
    card(40, 14, 80, 86) +
    `<circle cx="80" cy="34" r="10" ${s(v.raised, v.line)}/>` +
    slot(52, 52, 56, 10, 3, v.line) +
    slot(52, 68, 56, 10, 3, v.line) +
    `<rect x="52" y="84" width="56" height="10" rx="3" ${s(v.primary)}/>` +
    badge(116, 30, v.success, "plus", 10),

  "sign-in":
    ground +
    card(40, 18, 80, 80) +
    `<rect x="52" y="36" width="56" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="52" y="54" width="56" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    mark(68, 60, "dots", 6, v.faint) +
    `<rect x="52" y="76" width="56" height="12" rx="3" ${s(v.primary)}/>` +
    mark(80, 82, "right", 4, v.surface),

  "signed-out":
    ground +
    fill("M42 18h40v80H42z", v.raised, v.line) +
    fill("M42 18l26 8v80l-26-8z", v.surface, v.line) +
    dot(62, 62, 3, v.faint) +
    line("M94 58h34", v.primary, 4) +
    fill("M126 50l10 8-10 8z", v.primary),

  "profile-complete":
    ground +
    card(34, 18, 92, 80) +
    person(62, 30, 0.7) +
    rows(88, 40, 28, 3, 10) +
    line("M46 86h68", v.line, 4) +
    line("M46 86h68", v.success, 4) +
    badge(118, 26, v.success, "check", 10),

  "avatar-upload":
    ground +
    `<circle cx="80" cy="56" r="34" ${s(v.raised, v.line)}/>` +
    `<circle cx="80" cy="48" r="11" ${s(v.surface, v.line)}/>` +
    `<path d="M60 80a20 16 0 0 1 40 0z" ${s(v.surface, v.line)}/>` +
    badge(106, 82, v.primary, "up", 12),

  "two-factor-setup":
    ground +
    phone(48, 18, 40, 76) +
    `<rect x="54" y="30" width="28" height="28" rx="2" ${s(v.raised, v.line)}/>` +
    grid(57, 33, 3, 6, [0, 2, 4, 6, 8], v.text) +
    line("M56 68h24", v.faint, 2) +
    shieldMini(112, 40, 1, v.raised) +
    mark(112, 60, "lock", 7, v.primary),

  "recovery-codes":
    ground +
    card(34, 20, 92, 76) +
    line("M46 36h28M86 36h28M46 50h28M86 50h28M46 64h28M86 64h28", v.faint, 3, "stroke-dasharray:5 3") +
    `<rect x="46" y="76" width="68" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    mark(80, 82, "down", 4, v.primary),

  "device-trusted":
    ground +
    laptop(76, 30, 78, 48) +
    badge(112, 34, v.success, "check", 12) +
    shieldMini(76, 40, 0.8, v.raised),

  "new-login-alert":
    ground +
    globe(64, 58, 30) +
    dot(76, 46, 5, v.danger) +
    `<circle cx="76" cy="46" r="10" ${s("none", v.danger, "stroke-width:2")}/>` +
    bell(116, 30, 0.6) +
    dot(128, 32, 5, v.danger),

  "account-deleted":
    ground +
    person(80, 24, 1, v.surface) +
    `<path d="M58 24h44v64H58z" ${s("none", v.faint, "stroke-dasharray:5 4")}/>` +
    badge(110, 80, v.danger, "minus", 12),

  "account-paused":
    ground +
    person(70, 26, 1) +
    badge(110, 70, v.warning, "pause", 14),

  "data-export-request":
    ground +
    `<path d="M30 40a16 7 0 0 1 32 0v40a16 7 0 0 1-32 0z" ${s(v.raised, v.line)}/>` +
    `<ellipse cx="46" cy="40" rx="16" ry="7" ${s(v.surface, v.line)}/>` +
    line("M68 60h20", v.primary, 4) +
    fill("M86 52l10 8-10 8z", v.primary) +
    doc(100, 30, 34, 50, 3) +
    mark(117, 72, "clock", 5, v.faint),

  "preferences-saved":
    ground +
    card(34, 22, 92, 74) +
    toggle(46, 34, true) +
    toggle(46, 60, false) +
    rows(90, 44, 24, 1) +
    rows(90, 70, 24, 1) +
    badge(116, 86, v.success, "check", 11),

  "email-changed":
    ground +
    envelope(26, 40, 50, 36) +
    line("M82 58h16", v.faint, 3) +
    fill("M96 52l8 6-8 6z", v.faint) +
    envelope(108, 40, 30, 22) +
    `<path d="M108 66h30" ${s("none", v.success, "stroke-width:3")}/>`,
};

const activity = {
  estimating:
    ground +
    hourglass(66, 26, 1) +
    bubble(92, 26, 42, 24, "left", v.raised) +
    mark(113, 38, "question", 6, v.faint),

  "in-progress":
    ground +
    `<circle cx="80" cy="58" r="34" ${s(v.raised, v.line)}/>` +
    `<path d="M80 24a34 34 0 0 1 32 46" ${s("none", v.primary, "stroke-width:8")}/>` +
    mark(80, 58, "dots", 12, v.faint),

  "waiting-approval":
    ground +
    doc(40, 18, 60, 78, 4) +
    badge(104, 76, v.warning, "clock", 16),

  approved:
    ground +
    doc(40, 18, 60, 78, 4) +
    `<rect x="78" y="64" width="54" height="26" rx="5" ${s("none", v.success, "stroke-width:3")}/>` +
    mark(105, 77, "check", 8, v.success),

  rejected:
    ground +
    doc(40, 18, 60, 78, 4) +
    `<rect x="78" y="64" width="54" height="26" rx="5" ${s("none", v.danger, "stroke-width:3")}/>` +
    mark(105, 77, "x", 7, v.danger),

  "scheduled-later":
    ground +
    calendar(28, 30, 66, 62) +
    grid(36, 56, 4, 9, [6], v.primary) +
    clock(112, 58, 20, [5, 0]),

  "running-job":
    ground +
    gear(64, 56, 28) +
    gear(108, 42, 16, v.surface) +
    badge(110, 82, v.primary, "play", 11),

  "job-done":
    ground +
    gear(68, 54, 28) +
    badge(106, 78, v.success, "check", 14),

  retrying:
    ground +
    card(32, 34, 96, 52) +
    line("M44 52h40M44 66h28", v.faint, 2) +
    badge(110, 60, v.warning, "refresh", 15),

  "paused-job":
    ground +
    gear(70, 56, 28, v.surface) +
    badge(108, 80, v.warning, "pause", 12),

  cancelled:
    ground +
    card(32, 32, 96, 54, v.surface) +
    line("M44 50h50M44 64h36", v.faint, 2) +
    line("M40 82 120 36", v.danger, 4),

  "queued-batch":
    ground +
    `<rect x="44" y="70" width="72" height="16" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="48" y="52" width="64" height="16" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="52" y="34" width="56" height="16" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="56" y="16" width="48" height="16" rx="3" ${s(v.primary, v.line)}/>` +
    line("M124 24v52", v.faint, 2, "stroke-dasharray:3 4") +
    fill("M119 72l5 8 5-8z", v.faint),

  "partial-success":
    ground +
    card(30, 20, 100, 76) +
    checkbox(42, 32, true) +
    checkbox(42, 52, true) +
    `<rect x="42" y="72" width="12" height="12" rx="3" ${s(v.warning)}/>` +
    mark(48, 78, "bang", 3.5, v.surface) +
    rows(62, 38, 52, 1) +
    rows(62, 58, 52, 1) +
    rows(62, 78, 52, 1),
};

const features = {
  "brand-colours":
    ground +
    palette(74, 58) +
    `<path d="M112 28l12 50" ${s("none", v.line, "stroke-width:5")}/>` +
    fill("M120 74l8 16-10-2z", v.secondary, v.line),

  settings:
    ground +
    gear(70, 54, 32) +
    gear(114, 34, 14, v.surface),

  "notifications-settings":
    ground +
    bell(66, 22, 0.9) +
    card(98, 34, 40, 50, v.surface, 5) +
    toggle(104, 42, true) +
    toggle(104, 66, false),

  appearance:
    ground +
    `<circle cx="70" cy="56" r="32" ${s(v.raised, v.line)}/>` +
    `<path d="M70 24a32 32 0 0 1 0 64z" ${s(v.text, v.line)}/>` +
    sparkle(118, 32, 8, v.warning) +
    `<path d="M118 66a12 12 0 1 0 12 14 10 10 0 0 1-12-14z" ${s(v.secondary, v.line)}/>`,

  language:
    ground +
    globe(66, 56, 32) +
    bubble(98, 22, 38, 26, "left", v.raised) +
    line("M106 32h22M110 40h14", v.primary, 3),

  "integrations-settings":
    ground +
    puzzle(36, 30, 1, v.primary) +
    puzzle(78, 52, 1, v.raised) +
    gear(122, 34, 12, v.surface),

  "billing-settings":
    ground +
    `<rect x="30" y="34" width="84" height="52" rx="7" ${s(v.raised, v.line)}/>` +
    line("M30 50h84", v.line, 8) +
    line("M42 72h20", v.faint, 3) +
    gear(118, 72, 16, v.surface),

  "api-settings":
    ground +
    card(28, 24, 76, 64) +
    line("M42 46l-8 10 8 10M90 46l8 10-8 10M72 42l-12 28", v.primary, 3) +
    gear(118, 70, 16),

  "security-settings":
    ground +
    shieldMini(70, 24, 2, v.raised) +
    mark(70, 60, "lock", 12, v.primary) +
    gear(118, 76, 14, v.surface),

  "privacy-settings":
    ground +
    card(30, 30, 84, 56) +
    mark(72, 58, "eye", 18, v.faint) +
    line("M52 76 92 40", v.danger, 4) +
    toggle(104, 72, true),

  "backup-settings":
    ground +
    cloud(72, 50, 1.1) +
    mark(72, 50, "up", 10, v.primary) +
    clock(118, 76, 14, [2, 0], v.surface),

  "accessibility-settings":
    ground +
    `<circle cx="80" cy="58" r="36" ${s(v.raised, v.line)}/>` +
    dot(80, 38, 6, v.primary) +
    line("M58 50h44M80 50v20l-10 18M80 70l10 18", v.primary, 5),

  "beta-feature":
    ground +
    card(32, 28, 96, 62) +
    `<rect x="44" y="18" width="40" height="18" rx="9" ${s(v.secondary, v.line)}/>` +
    rows(46, 54, 66, 3, 10) +
    sparkle(116, 26, 7, v.secondary),

  experimental:
    ground +
    flask(80, 18, v.success),

  "keyboard-settings":
    ground +
    card(24, 40, 96, 48, v.raised) +
    keycap(32, 48) +
    keycap(56, 48) +
    keycap(80, 48) +
    keycap(32, 70, 64) +
    gear(124, 36, 13, v.surface),

  "offline-mode":
    ground +
    cloud(76, 48, 1.1, v.surface) +
    line("M48 26 104 82", v.faint, 4) +
    toggle(104, 82, true, v.warning),

  "sync-settings":
    ground +
    `<circle cx="72" cy="58" r="28" ${s(v.raised, v.line)}/>` +
    mark(72, 58, "refresh", 14, v.primary) +
    toggle(104, 80, true),

  "storage-settings":
    ground +
    `<rect x="36" y="22" width="64" height="72" rx="6" ${s(v.raised, v.line)}/>` +
    line("M36 46h64M36 70h64", v.line, 2) +
    dot(88, 34, 3, v.success) +
    dot(88, 58, 3, v.success) +
    dot(88, 82, 3, v.warning) +
    `<circle cx="118" cy="60" r="14" ${s(v.surface, v.line)}/>` +
    `<path d="M118 46a14 14 0 0 1 12 21l-12-7z" ${s(v.primary)}/>`,
};

const collaboration = {
  "board-shared":
    ground +
    kanbanCol(32, 22, 72, 3, v.primary) +
    kanbanCol(66, 22, 72, 2, v.warning) +
    kanbanCol(100, 22, 72, 1, v.success) +
    avatars(80, 100, 3, 18, [v.primary, v.secondary, v.raised], 8),

  "team-working":
    ground +
    person(48, 20, 0.95) +
    person(112, 20, 0.95) +
    `<rect x="24" y="70" width="112" height="8" rx="3" ${s(v.raised, v.line)}/>` +
    laptop(80, 40, 46, 30) +
    line("M68 50h22M68 58h14", v.primary, 2.5) +
    line("M34 78v20M126 78v20", v.line, 3),

  "shared-document":
    ground +
    doc(52, 16, 56, 76, 4) +
    avatars(80, 96, 3, 18, [v.primary, v.secondary, v.success]),

  "comments-thread":
    ground +
    bubble(24, 18, 70, 28, "left") +
    bubble(66, 50, 70, 26, "right", v.raised) +
    bubble(36, 80, 50, 18, "left") +
    line("M34 30h46M78 62h46M46 89h30", v.faint, 2),

  "mention-you":
    ground +
    bubble(28, 26, 104, 44, "left") +
    `<circle cx="54" cy="48" r="12" ${s(v.primary)}/>` +
    mark(54, 48, "at", 6, v.surface) +
    line("M74 44h44M74 54h30", v.faint, 2),

  handoff:
    ground +
    person(42, 34, 0.8) +
    person(118, 34, 0.8) +
    card(66, 44, 28, 22, v.warning, 4) +
    line("M62 78h36", v.faint, 2, "stroke-dasharray:3 4") +
    fill("M96 72l8 6-8 6z", v.faint),

  "review-request":
    ground +
    doc(36, 16, 60, 80, 4) +
    magnifier(104, 60, 18) +
    mark(104, 60, "check", 7, v.success),

  "pair-work":
    ground +
    monitor(80, 20, 84, 52) +
    cursor(66, 36, v.primary) +
    cursor(94, 48, v.secondary),

  meeting:
    ground +
    `<ellipse cx="80" cy="80" rx="50" ry="12" ${s(v.raised, v.line)}/>` +
    person(44, 34, 0.6) +
    person(80, 26, 0.6) +
    person(116, 34, 0.6) +
    dot(80, 80, 4, v.primary),

  "calendar-invite":
    ground +
    calendar(30, 30, 62, 62) +
    grid(37, 56, 4, 9, [5], v.success) +
    envelope(98, 44, 38, 28) +
    badge(130, 40, v.primary, "plus", 9),

  "roles-permissions":
    ground +
    person(48, 30, 0.75) +
    person(80, 30, 0.75, v.primary) +
    person(112, 30, 0.75) +
    `<rect x="72" y="10" width="16" height="10" rx="3" ${s(v.warning, v.line)}/>` +
    mark(48, 82, "eye", 6, v.faint) +
    mark(112, 82, "lock", 6, v.faint),

  "transfer-ownership":
    ground +
    person(40, 32, 0.8) +
    person(120, 32, 0.8, v.primary) +
    key(80, 44, 0.6) +
    line("M58 70c14 10 30 10 44 0", v.faint, 2, "stroke-dasharray:3 4") +
    fill("M100 64l6 8-10 2z", v.faint),

  "activity-feed":
    ground +
    line("M44 18v80", v.line, 2) +
    dot(44, 30, 6, v.primary) +
    dot(44, 58, 6, v.success) +
    dot(44, 86, 6, v.raised) +
    card(58, 22, 72, 16, v.surface, 4) +
    card(58, 50, 72, 16, v.surface, 4) +
    card(58, 78, 56, 16, v.surface, 4),

  "presence-online":
    ground +
    avatars(80, 56, 4, 32, [v.raised, v.raised, v.raised, v.raised], 14) +
    [[42, v.success], [74, v.success], [106, v.warning], [138, v.faint]].map(([x, c]) => `<circle cx="${x}" cy="68" r="6" ${s(c as string, v.surface, "stroke-width:3")}/>`).join(""),
};

export const set: IllustrationSet = {
  empty,
  onboarding: { ...onboarding, "rocket-start": ground + rocketBig(80, 12) + sparkle(116, 34, 7, v.warning) + sparkle(44, 48, 5, v.primary) + sparkle(120, 74, 4, v.secondary) },
  account,
  activity,
  features,
  collaboration,
};
