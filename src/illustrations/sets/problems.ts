import type { IllustrationSet } from "../categories";
import { robot, s, shadow, shieldShape, sparkle, v, windowCard } from "../draw";

/**
 * The "problems" batch: errors and limits, security and bot defence, infrastructure and
 * operations. Scenes are composed from the small parts below so that the same object (a rack
 * server, a document, a shield) is drawn the same way in every scene that shows it.
 */

type Glyph = "x" | "check" | "!" | "?" | "minus" | "plus" | "pause" | "clock" | "up" | "down" | "refresh" | "lock" | "slash";

const g = (d: string, colour: string, width = 3, extra = "") => `<path d="${d}" ${s("none", colour, `stroke-width:${width}${extra ? `;${extra}` : ""}`)}/>`;
const f = (d: string, fill: string, stroke = "none") => `<path d="${d}" ${s(fill, stroke)}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, stroke = v.line, rx = 4, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${s(fill, stroke, extra)}/>`;
const circ = (cx: number, cy: number, r: number, fill: string, stroke = "none", extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(fill, stroke, extra)}/>`;
const text = (x: number, y: number, t: string, colour: string, size = 28) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size}" font-weight="700" ${s(colour)}>${t}</text>`;

/** The mark inside a badge, drawn on a 2r square centred on (cx, cy). */
const glyph = (cx: number, cy: number, r: number, kind: Glyph, colour: string) => {
  const k = r / 10;
  const n = (x: number) => Math.round(x * k * 100) / 100;
  const w = Math.max(2.5, n(3));
  switch (kind) {
    case "x":
      return g(`M${cx - n(4.5)} ${cy - n(4.5)}l${n(9)} ${n(9)}m0-${n(9)}-${n(9)} ${n(9)}`, colour, w);
    case "check":
      return g(`M${cx - n(5)} ${cy}l${n(3.5)} ${n(3.5)} ${n(6.5)}-${n(7)}`, colour, w);
    case "!":
      return g(`M${cx} ${cy - n(5.5)}v${n(6)}`, colour, w) + circ(cx, cy + n(4.5), Math.max(1.4, n(1.6)), colour);
    case "?":
      return g(`M${cx - n(3.5)} ${cy - n(3)}a${n(3.5)} ${n(3.5)} 0 1 1 ${n(4.5)} ${n(3.3)}c-${n(1)} ${n(0.4)}-${n(1)} ${n(1.2)}-${n(1)} ${n(2.2)}`, colour, w) + circ(cx, cy + n(5.5), Math.max(1.4, n(1.5)), colour);
    case "minus":
      return g(`M${cx - n(5)} ${cy}h${n(10)}`, colour, w);
    case "plus":
      return g(`M${cx - n(5)} ${cy}h${n(10)}M${cx} ${cy - n(5)}v${n(10)}`, colour, w);
    case "pause":
      return g(`M${cx - n(2.5)} ${cy - n(4.5)}v${n(9)}M${cx + n(2.5)} ${cy - n(4.5)}v${n(9)}`, colour, w);
    case "clock":
      return circ(cx, cy, n(6), "none", colour, `stroke-width:${Math.max(2, n(2))}`) + g(`M${cx} ${cy - n(3.5)}v${n(3.5)}l${n(2.5)} ${n(1.8)}`, colour, Math.max(2, n(2)));
    case "up":
      return g(`M${cx} ${cy + n(5)}v-${n(10)}m-${n(4)} ${n(4)} ${n(4)}-${n(4)} ${n(4)} ${n(4)}`, colour, w);
    case "down":
      return g(`M${cx} ${cy - n(5)}v${n(10)}m-${n(4)}-${n(4)} ${n(4)} ${n(4)} ${n(4)}-${n(4)}`, colour, w);
    case "refresh":
      return g(`M${cx + n(5)} ${cy - n(1)}a${n(5)} ${n(5)} 0 1 1-${n(1.6)}-${n(3.8)}`, colour, Math.max(2, n(2.4))) + g(`M${cx + n(3.6)} ${cy - n(7)}l${n(0.2)} ${n(3.6)}-${n(3.6)} ${n(0.4)}`, colour, Math.max(2, n(2.4)));
    case "lock":
      return rect(cx - n(4.5), cy - n(1), n(9), n(7), colour, "none", n(1.5)) + g(`M${cx - n(2.8)} ${cy - n(1)}v-${n(2)}a${n(2.8)} ${n(2.8)} 0 0 1 ${n(5.6)} 0v${n(2)}`, colour, Math.max(2, n(2)));
    case "slash":
      return g(`M${cx - n(5)} ${cy + n(5)}l${n(10)}-${n(10)}`, colour, w);
  }
};

/** A round status badge with a mark. */
const badge = (cx: number, cy: number, r: number, fill: string, kind: Glyph, mark = v.surface) => circ(cx, cy, r, fill) + glyph(cx, cy, r, kind, mark);

/** A warning triangle centred on cx with its top at y. */
const warnTri = (cx: number, y: number, h: number, colour = v.warning) =>
  f(`M${cx} ${y}l${h * 0.58} ${h}h-${h * 1.16}z`, colour, colour) + g(`M${cx} ${y + h * 0.36}v${h * 0.3}`, v.surface, Math.max(2.5, h / 9)) + circ(cx, y + h * 0.82, Math.max(1.4, h / 18), v.surface);

/** A document page with a folded corner and text lines. */
const doc = (x: number, y: number, w: number, h: number, lines = 3, fill = v.surface) =>
  f(`M${x} ${y + 4}a4 4 0 0 1 4-4h${w - 18}l14 14v${h - 18}a4 4 0 0 1-4 4h-${w - 8}a4 4 0 0 1-4-4z`, fill, v.line) +
  g(`M${x + w - 14} ${y}v14h14`, v.line, 2) +
  g(
    Array.from({ length: lines }, (_, i) => `M${x + 8} ${y + 22 + i * 9}h${i === lines - 1 ? (w - 16) * 0.55 : w - 16}`).join(""),
    v.faint,
    2,
  );

/** A rack server: `n` units starting at (x, y), each with a status light. */
const rack = (x: number, y: number, w: number, lights: string[]) =>
  lights
    .map(
      (light, i) =>
        rect(x, y + i * 22, w, 18, v.surface) + circ(x + 10, y + i * 22 + 9, 3, light) + g(`M${x + 20} ${y + i * 22 + 9}h${w - 30}`, v.faint, 2),
    )
    .join("");

/** A database cylinder centred on cx, top ellipse at y. */
const db = (cx: number, y: number, w: number, h: number, fill = v.surface, stroke = v.line) => {
  const rx = w / 2;
  return (
    f(`M${cx - rx} ${y}v${h}a${rx} ${rx / 3.2} 0 0 0 ${w} 0v-${h}`, fill, stroke) +
    `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${rx / 3.2}" ${s(v.raised, stroke)}/>` +
    g(`M${cx - rx} ${y + h / 2}a${rx} ${rx / 3.2} 0 0 0 ${w} 0`, stroke, 2)
  );
};

/** A cloud centred on cx with its flat base at y, scale k (1 = 64 wide). */
const cloud = (cx: number, y: number, k: number, fill = v.surface, stroke = v.line) => {
  const n = (x: number) => Math.round(x * k * 100) / 100;
  return f(`M${cx - n(20)} ${y}a${n(13)} ${n(13)} 0 0 1-${n(2)}-${n(25.8)} ${n(18)} ${n(18)} 0 0 1 ${n(35)} ${n(4)}A${n(11)} ${n(11)} 0 0 1 ${cx + n(22)} ${y}z`, fill, stroke);
};

/** A globe with meridians, centred on (cx, cy). */
const globe = (cx: number, cy: number, r: number, stroke = v.line, fill = v.surface) =>
  circ(cx, cy, r, fill, stroke) +
  g(`M${cx - r} ${cy}h${r * 2}M${cx} ${cy - r}c-${r * 0.6} ${r * 0.5}-${r * 0.6} ${r * 1.5} 0 ${r * 2}c${r * 0.6}-${r * 0.5} ${r * 0.6}-${r * 1.5} 0-${r * 2}`, stroke, 2) +
  g(`M${cx - r * 0.85} ${cy - r * 0.5}h${r * 1.7}M${cx - r * 0.85} ${cy + r * 0.5}h${r * 1.7}`, stroke, 2);

/** A phone, top-left at (x, y). */
const phone = (x: number, y: number, w = 40, h = 70, screen = v.raised) =>
  rect(x, y, w, h, v.surface, v.line, 8) + rect(x + 4, y + 9, w - 8, h - 20, screen, "none", 3) + g(`M${x + w / 2 - 5} ${y + h - 5}h10`, v.faint, 2);

/** A laptop centred on cx, screen top at y. */
const laptop = (cx: number, y: number, w = 76, screen = v.raised) =>
  rect(cx - w / 2, y, w, w * 0.6, v.surface, v.line, 5) +
  rect(cx - w / 2 + 5, y + 5, w - 10, w * 0.6 - 10, screen, "none", 2) +
  f(`M${cx - w / 2 - 10} ${y + w * 0.6}h${w + 20}l-5 7h-${w + 10}z`, v.raised, v.line);

/** A padlock centred on cx, body top at y. */
const padlock = (cx: number, y: number, w: number, fill = v.raised, stroke = v.line, open = false) =>
  g(open ? `M${cx - w * 0.28} ${y}v-${w * 0.32}a${w * 0.28} ${w * 0.28} 0 0 1 ${w * 0.56} 0v-${w * 0.1}` : `M${cx - w * 0.28} ${y}v-${w * 0.22}a${w * 0.28} ${w * 0.28} 0 0 1 ${w * 0.56} 0v${w * 0.22}`, stroke, Math.max(3, w / 10)) +
  rect(cx - w / 2, y, w, w * 0.78, fill, stroke, w / 8) +
  circ(cx, y + w * 0.34, w / 12, stroke) +
  g(`M${cx} ${y + w * 0.38}v${w * 0.16}`, stroke, Math.max(2, w / 18));

/** A key lying on its side, bow at (x, cy). */
const keyShape = (x: number, cy: number, len: number, colour = v.warning) =>
  circ(x, cy, len * 0.22, "none", colour, `stroke-width:${Math.max(3, len / 12)}`) +
  g(`M${x + len * 0.22} ${cy}h${len * 0.78}M${x + len * 0.78} ${cy}v${len * 0.14}M${x + len * 0.92} ${cy}v${len * 0.18}`, colour, Math.max(3, len / 12));

/** A cog centred on (cx, cy). */
const cog = (cx: number, cy: number, r: number, fill = v.raised, stroke = v.line) =>
  circ(cx, cy, r, fill, stroke, `stroke-width:${Math.max(4, r / 2.5)};stroke-dasharray:${(r * 0.7).toFixed(1)} ${(r * 0.55).toFixed(1)}`) +
  circ(cx, cy, r * 0.82, fill, stroke) +
  circ(cx, cy, r * 0.32, v.surface, stroke);

/** A dial gauge: arc track, filled share and needle; `share` 0..1. */
const gauge = (cx: number, cy: number, r: number, share: number, colour: string) => {
  const a = Math.PI * (1 - share);
  const ex = cx + r * Math.cos(a);
  const ey = cy - r * Math.sin(a);
  const nx = cx + (r - 8) * Math.cos(a);
  const ny = cy - (r - 8) * Math.sin(a);
  return (
    g(`M${cx - r} ${cy}a${r} ${r} 0 0 1 ${r * 2} 0`, v.raised, 10) +
    g(`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`, colour, 10) +
    g(`M${cx} ${cy}L${nx.toFixed(1)} ${ny.toFixed(1)}`, v.text, 4) +
    circ(cx, cy, 6, v.surface, v.line, "stroke-width:3")
  );
};

/** A line chart in a frame; points are 0..1 heights, evenly spaced. */
const chart = (x: number, y: number, w: number, h: number, pts: number[], colour: string, frame = true) =>
  (frame ? rect(x, y, w, h, v.surface) : "") +
  g(`M${pts.map((p, i) => `${(x + 8 + (i * (w - 16)) / (pts.length - 1)).toFixed(1)} ${(y + h - 8 - p * (h - 16)).toFixed(1)}`).join("L")}`, colour, 3);

/** Vertical bars on a baseline at y, heights in px. */
const bars = (x: number, y: number, heights: number[], colours: string[] | string, gap = 12, bw = 8) =>
  heights.map((h, i) => rect(x + i * gap, y - h, bw, h, Array.isArray(colours) ? (colours[i % colours.length] as string) : colours, "none", 2)).join("");

/** A pipeline: stages joined by a line, each a dot in its status colour. */
const pipeline = (x: number, y: number, gap: number, colours: string[], r = 9) =>
  g(`M${x} ${y}h${gap * (colours.length - 1)}`, v.line, 4) +
  colours.map((c, i) => circ(x + i * gap, y, r, c, v.line, "stroke-width:2")).join("");

/** A shipping container, top-left (x, y). */
const box = (x: number, y: number, w: number, h: number, fill = v.surface) =>
  rect(x, y, w, h, fill, v.line, 3) + g(Array.from({ length: Math.floor(w / 10) - 1 }, (_, i) => `M${x + 10 + i * 10} ${y + 5}v${h - 10}`).join(""), v.line, 2);

/** A plain person bust, head centre at (cx, y). */
const person = (cx: number, y: number, k = 1, fill = v.raised) =>
  circ(cx, y, 9 * k, fill, v.line) + f(`M${cx - 17 * k} ${y + 34 * k}a${17 * k} ${17 * k} 0 0 1 ${34 * k} 0z`, fill, v.line);

/** A map pin, point at (cx, y). */
const pin = (cx: number, y: number, k: number, colour: string) =>
  f(`M${cx} ${y}c-${9 * k}-${10 * k}-${14 * k}-${16 * k}-${14 * k}-${23 * k}a${14 * k} ${14 * k} 0 0 1 ${28 * k} 0c0 ${7 * k}-${5 * k} ${13 * k}-${14 * k} ${23 * k}z`, colour, colour) + circ(cx, y - 23 * k, 5 * k, v.surface);

/** A brick wall, top-left (x, y), `rows` courses of 10 px. */
const wall = (x: number, y: number, w: number, rows: number, fill = v.raised) =>
  rect(x, y, w, rows * 10, fill, v.line, 2) +
  g(
    Array.from({ length: rows - 1 }, (_, i) => `M${x} ${y + (i + 1) * 10}h${w}`).join("") +
      Array.from({ length: rows }, (_, i) =>
        Array.from({ length: Math.ceil(w / 20) }, (_, j) => {
          const bx = x + j * 20 + (i % 2 ? 10 : 0);
          return bx > x && bx < x + w ? `M${bx} ${y + i * 10}v10` : "";
        }).join(""),
      ).join(""),
    v.line,
    1.5,
  );

/** A bug body centred on (cx, cy). */
const bug = (cx: number, cy: number, k: number, colour: string) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${10 * k}" ry="${13 * k}" ${s(colour, v.line)}/>` +
  circ(cx, cy - 15 * k, 6 * k, colour, v.line) +
  g(`M${cx - 10 * k} ${cy - 5 * k}h-${7 * k}M${cx - 10 * k} ${cy + 3 * k}h-${8 * k}M${cx + 10 * k} ${cy - 5 * k}h${7 * k}M${cx + 10 * k} ${cy + 3 * k}h${8 * k}M${cx} ${cy - 9 * k}v${22 * k}`, v.line, 2);

/** An envelope, top-left (x, y). */
const envelope = (x: number, y: number, w: number, h: number) => rect(x, y, w, h, v.surface) + g(`M${x + 2} ${y + 3}l${w / 2 - 2} ${h * 0.5} ${w / 2 - 2}-${h * 0.5}`, v.line, 2);

/** An analogue clock face. */
const clockFace = (cx: number, cy: number, r: number, hour: number, minute: number, stroke = v.line) => {
  const hand = (frac: number, len: number) => {
    const a = frac * Math.PI * 2 - Math.PI / 2;
    return `M${cx} ${cy}L${(cx + len * Math.cos(a)).toFixed(1)} ${(cy + len * Math.sin(a)).toFixed(1)}`;
  };
  return circ(cx, cy, r, v.surface, stroke, "stroke-width:3") + g(hand(hour / 12, r * 0.5) + hand(minute / 60, r * 0.75), v.text, 3) + circ(cx, cy, 2.5, v.text);
};

/** A plug and socket gap, used by network states. */
const cableGap = (x: number, y: number, colour = v.danger) =>
  g(`M${x - 40} ${y}h24M${x + 16} ${y}h24`, v.line, 4) + rect(x - 18, y - 7, 10, 14, v.raised, v.line, 2) + rect(x + 8, y - 7, 10, 14, v.raised, v.line, 2) + g(`M${x - 4} ${y - 10}l8 20`, colour, 3);

/** A big status code on a browser card. */
const codeCard = (code: string, colour: string, extra = "") =>
  shadow + windowCard(22, 14, 116, 84) + text(80, 70, code, colour, 30) + extra;

const errors: Record<string, string> = {
  "error-400":
    codeCard("400", v.warning, g("M50 82h60", v.faint, 2, "stroke-dasharray:3 6") + glyph(124, 36, 7, "?", v.warning)),
  "error-401": codeCard("401", v.warning, padlock(122, 74, 18, v.raised, v.warning)),
  "error-403": codeCard("403", v.danger, g("M44 82h72", v.danger, 3) + badge(124, 82, 9, v.danger, "minus")),
  "lost-in-space":
    shadow +
    circ(46, 40, 18, v.raised, v.line) +
    g("M30 34c10 2 24 0 32-6", v.faint, 2) +
    `<ellipse cx="46" cy="40" rx="30" ry="7" ${s("none", v.line, "stroke-width:2")}/>` +
    circ(104, 64, 14, v.surface, v.line) +
    rect(96, 76, 16, 18, v.surface, v.line, 4) +
    rect(98, 58, 12, 8, v.primary, "none", 3) +
    g("M112 82l10 6M96 82l-10 6", v.line, 3) +
    sparkle(130, 26, 5, v.warning) +
    sparkle(18, 80, 4, v.primary),
  "broken-link":
    shadow +
    rect(26, 46, 44, 22, v.surface, v.line, 11) +
    rect(90, 46, 44, 22, v.surface, v.line, 11) +
    g("M58 57h8M94 57h8", v.faint, 4) +
    g("M76 40l-4-8M84 40l4-8M80 74v10M74 72l-6 8M86 72l6 8", v.danger, 3),
  "missing-page":
    shadow +
    doc(30, 20, 54, 72, 4) +
    rect(90, 20, 48, 72, "none", v.faint, 4, "stroke-dasharray:5 5") +
    glyph(114, 56, 12, "?", v.faint),
  "wrong-turn":
    shadow +
    g("M80 100V36", v.line, 6) +
    f("M80 30h40l10 9-10 9H80z", v.surface, v.line) +
    f("M80 52H44l-10 9 10 9h36z", v.raised, v.line) +
    g("M88 39h26", v.faint, 2) +
    g("M48 61h26", v.faint, 2) +
    badge(124, 76, 10, v.warning, "!"),
  "error-405":
    shadow +
    windowCard(22, 14, 116, 84) +
    rect(40, 42, 32, 16, v.raised, v.line, 3) +
    text(56, 54, "GET", v.faint, 11) +
    rect(88, 42, 32, 16, v.danger, "none", 3) +
    text(104, 54, "PUT", v.surface, 11) +
    text(80, 86, "405", v.danger, 18),
  "error-408":
    shadow +
    windowCard(22, 14, 116, 84) +
    clockFace(64, 60, 20, 4, 45) +
    text(112, 66, "408", v.warning, 18) +
    g("M98 76h28", v.faint, 2, "stroke-dasharray:3 4"),
  "error-409":
    shadow +
    doc(24, 24, 50, 66, 3) +
    doc(86, 24, 50, 66, 3, v.raised) +
    g("M74 40l12 0M74 56h12", v.warning, 3) +
    badge(80, 82, 11, v.danger, "x"),
  "error-410":
    shadow +
    rect(36, 22, 88, 70, v.surface, v.faint, 6, "stroke-dasharray:6 5") +
    f("M60 50h40l-4 30H64z", v.raised, v.line) +
    g("M56 50h48M72 44h16", v.line, 3) +
    text(80, 40, "410", v.faint, 13),
  "error-413":
    shadow +
    f("M44 92 52 38h56l8 54z", v.surface, v.line) +
    rect(36, 18, 88, 40, v.raised, v.danger, 6, "stroke-width:3") +
    g("M48 32h64M48 44h40", v.faint, 2) +
    glyph(124, 18, 9, "up", v.danger),
  "unsupported-file":
    shadow +
    doc(40, 16, 60, 80, 0) +
    rect(50, 50, 40, 18, v.raised, v.line, 3) +
    text(70, 64, ".xyz", v.faint, 12) +
    badge(112, 80, 13, v.danger, "slash"),
  "invalid-data":
    shadow +
    rect(30, 18, 100, 78, v.surface) +
    [32, 50, 68].map((y, i) => rect(42, y, 76, 12, v.raised, i === 1 ? v.danger : v.line, 3, i === 1 ? "stroke-width:3" : "")).join("") +
    badge(126, 56, 9, v.danger, "!"),
  "too-many-requests":
    shadow +
    [0, 1, 2, 3, 4].map((i) => rect(16 + i * 10, 28 + i * 6, 34, 22, i === 4 ? v.raised : v.surface, v.line, 4)).join("") +
    wall(104, 22, 36, 7) +
    g("M86 70h14", v.danger, 4) +
    g("M94 64l6 6-6 6", v.danger, 4),
  "slow-down":
    shadow +
    gauge(80, 82, 46, 0.92, v.danger) +
    f("M120 22l14 0-7 12z", v.warning, v.warning) +
    sparkle(30, 30, 5, v.warning),
  "error-500":
    codeCard("500", v.danger, cog(122, 80, 10, v.raised, v.danger)),
  "server-crash":
    shadow +
    f("M40 24h80v20H40z", v.surface, v.line) +
    f("M40 48h46l-8 20H40z", v.surface, v.line) +
    f("M92 48h28v20h-34z", v.surface, v.line) +
    f("M40 72h80v20H40z", v.surface, v.line) +
    circ(50, 34, 3, v.danger) +
    circ(50, 82, 3, v.faint) +
    g("M84 44l6 6-6 6 6 6-6 6", v.danger, 3),
  "bad-gateway":
    shadow +
    rect(16, 44, 34, 40, v.surface) +
    rect(110, 44, 34, 40, v.surface) +
    f("M66 34h28v60H66z", v.raised, v.line) +
    g("M50 64h16", v.success, 4) +
    g("M94 64h16", v.danger, 4, "stroke-dasharray:4 4") +
    text(80, 28, "502", v.danger, 14),
  "service-unavailable":
    shadow +
    rack(38, 20, 84, [v.faint, v.faint, v.faint, v.faint]) +
    f("M100 84h40l-6 14h-28z", v.warning, v.warning) +
    g("M106 90h28", v.surface, 3),
  "gateway-timeout":
    shadow +
    rect(16, 46, 34, 36, v.surface) +
    rect(110, 46, 34, 36, v.surface) +
    g("M50 64h60", v.line, 3, "stroke-dasharray:4 5") +
    clockFace(80, 40, 14, 10, 50, v.warning) +
    text(80, 96, "504", v.warning, 13),
  "app-crashed":
    shadow +
    windowCard(30, 18, 100, 76) +
    g("M66 46l10 10M76 46 66 56M88 46l10 10M98 46 88 56", v.faint, 3) +
    g("M66 78c6-6 22-6 30 0", v.faint, 3) +
    g("M30 60l-10 4 8 6-6 8", v.danger, 3),
  frozen:
    shadow +
    windowCard(30, 18, 100, 76) +
    g("M80 44v36M64 53l32 18M64 71l32-18", v.primary, 4) +
    g("M80 44l-5 5M80 44l5 5M80 80l-5-5M80 80l5-5", v.primary, 3),
  "out-of-memory":
    shadow +
    rect(30, 40, 100, 40, v.surface) +
    g("M38 80v10M54 80v10M70 80v10M86 80v10M102 80v10M118 80v10M38 40v-8M54 40v-8M70 40v-8M86 40v-8M102 40v-8M118 40v-8", v.line, 3) +
    rect(38, 48, 84, 24, v.raised, "none", 3) +
    rect(38, 48, 80, 24, v.danger, "none", 3) +
    badge(128, 28, 10, v.danger, "!"),
  "disk-full":
    shadow +
    rect(30, 30, 100, 56, v.surface, v.line, 8) +
    circ(62, 58, 18, v.raised, v.line) +
    circ(62, 58, 4, v.line) +
    rect(92, 48, 28, 10, v.danger, "none", 2) +
    rect(92, 64, 28, 10, v.danger, "none", 2) +
    text(106, 100, "100%", v.danger, 11),
  "storage-full":
    shadow +
    cloud(80, 76, 1.5) +
    rect(52, 56, 56, 10, v.raised, "none", 5) +
    rect(52, 56, 56, 10, v.danger, "none", 5) +
    badge(120, 34, 10, v.danger, "!"),
  "plan-limit":
    shadow +
    rect(28, 20, 104, 76, v.surface) +
    bars(42, 84, [20, 32, 44, 54], v.primary, 18, 12) +
    g("M36 34h88", v.danger, 3, "stroke-dasharray:6 4") +
    rect(98, 26, 28, 16, v.raised, v.danger, 3) +
    glyph(112, 34, 6, "lock", v.danger),
  "file-too-large":
    shadow +
    doc(50, 8, 60, 92, 5) +
    g("M30 20v76M24 26l6-6 6 6M24 90l6 6 6-6", v.danger, 3),
  "upload-failed":
    shadow +
    cloud(80, 66, 1.6) +
    g("M80 98V70M70 80l10-10 10 10", v.faint, 4) +
    badge(118, 38, 11, v.danger, "x"),
  "download-failed":
    shadow +
    cloud(80, 58, 1.6) +
    g("M80 46v34M70 70l10 10 10-10", v.faint, 4) +
    rect(54, 88, 52, 8, v.raised, v.line, 3) +
    badge(118, 30, 11, v.danger, "x"),
  "sync-conflict":
    shadow +
    phone(24, 22) +
    laptop(110, 34, 52) +
    g("M70 44c10-10 18-10 26 0M96 76c-8 10-16 10-26 0", v.warning, 3) +
    badge(83, 60, 9, v.danger, "!"),
  "validation-error":
    shadow +
    rect(26, 20, 108, 76, v.surface) +
    rect(38, 32, 84, 14, v.raised, v.line, 3) +
    rect(38, 54, 84, 14, v.raised, v.danger, 3, "stroke-width:3") +
    g("M40 76h46", v.danger, 2) +
    rect(92, 78, 30, 12, v.primary, "none", 3),
  "form-error":
    shadow +
    rect(30, 14, 100, 84, v.surface) +
    rect(42, 26, 76, 12, v.raised, v.success, 3, "stroke-width:2") +
    rect(42, 46, 76, 12, v.raised, v.danger, 3, "stroke-width:2") +
    rect(42, 66, 76, 12, v.raised, v.danger, 3, "stroke-width:2") +
    badge(118, 32, 6, v.success, "check") +
    badge(118, 52, 6, v.danger, "x") +
    badge(118, 72, 6, v.danger, "x"),
  "network-error":
    shadow +
    globe(64, 56, 30) +
    cableGap(118, 82) +
    badge(116, 30, 10, v.danger, "!"),
  "dns-failure":
    shadow +
    rect(20, 36, 52, 18, v.raised, v.line, 4) +
    text(46, 49, "osqd.io", v.faint, 10) +
    g("M76 45h18", v.line, 3, "stroke-dasharray:3 4") +
    rect(98, 30, 44, 30, v.surface) +
    glyph(120, 45, 10, "?", v.warning) +
    globe(80, 82, 14),
  "certificate-expired":
    shadow +
    rect(28, 22, 92, 64, v.surface) +
    g("M40 38h52M40 50h40M40 62h30", v.faint, 2) +
    circ(110, 76, 14, v.warning, v.line) +
    f("M102 86l-4 16 12-6 12 6-4-16", v.warning, v.line) +
    clockFace(110, 76, 8, 2, 30, v.surface),
  "clock-skew":
    shadow +
    clockFace(54, 56, 26, 3, 15) +
    clockFace(110, 56, 20, 7, 40) +
    g("M78 30l8-8M86 30l-8-8", v.warning, 3),
  "browser-outdated":
    shadow +
    windowCard(26, 16, 108, 80) +
    circ(80, 58, 20, v.raised, v.line) +
    g("M80 48v12l8 5", v.faint, 3) +
    rect(96, 76, 32, 14, v.warning, "none", 3) +
    text(112, 87, "v1", v.surface, 10),
  "scripts-disabled":
    shadow +
    windowCard(26, 16, 108, 80) +
    text(70, 68, "{ }", v.faint, 26) +
    badge(112, 70, 12, v.danger, "slash"),
  "cookies-disabled":
    shadow +
    circ(72, 58, 30, v.raised, v.line) +
    circ(98, 38, 11, v.surface) +
    circ(62, 50, 3, v.line) +
    circ(76, 66, 3, v.line) +
    circ(60, 72, 2.5, v.line) +
    badge(112, 82, 11, v.danger, "slash"),
  "popup-blocked":
    shadow +
    windowCard(22, 14, 116, 84) +
    rect(52, 40, 56, 40, v.raised, v.line, 4, "stroke-dasharray:4 4") +
    badge(108, 40, 10, v.danger, "x"),
  "camera-permission":
    shadow +
    rect(36, 38, 70, 46, v.surface, v.line, 8) +
    circ(71, 61, 14, v.raised, v.line) +
    circ(71, 61, 6, v.primary) +
    f("M106 50l18-10v42l-18-10z", v.raised, v.line) +
    badge(118, 26, 10, v.warning, "?"),
  "microphone-permission":
    shadow +
    rect(66, 22, 28, 46, v.raised, v.line, 14) +
    g("M56 56a24 24 0 0 0 48 0M80 80v14M68 94h24", v.line, 3) +
    badge(118, 30, 10, v.warning, "?"),
  "location-permission":
    shadow +
    globe(62, 62, 28) +
    pin(98, 66, 1.2, v.primary) +
    badge(122, 26, 10, v.warning, "?"),
  "notification-permission":
    shadow +
    f("M56 84V58a24 24 0 0 1 48 0v26z", v.raised, v.line) +
    rect(48, 84, 64, 10, v.surface, v.line, 3) +
    circ(80, 100, 4, v.line) +
    badge(112, 36, 11, v.warning, "?"),
  "battery-low":
    shadow +
    phone(60, 18) +
    rect(68, 46, 24, 12, v.surface, v.line, 2) +
    rect(70, 48, 5, 8, v.danger, "none", 1) +
    g("M92 50v4", v.line, 3) +
    badge(110, 30, 9, v.danger, "!"),
  "region-unavailable":
    shadow +
    globe(80, 56, 34) +
    f("M68 40l14-4 10 8-4 12-14 2-8-8z", v.danger, v.danger) +
    badge(118, 86, 10, v.danger, "slash"),
  "feature-disabled":
    shadow +
    rect(36, 34, 88, 44, v.surface, v.line, 22) +
    circ(58, 56, 16, v.raised, v.line) +
    g("M86 56h24", v.faint, 3) +
    badge(118, 30, 9, v.faint, "pause"),
  "payload-corrupt":
    shadow +
    doc(36, 16, 60, 80, 0) +
    g("M46 40h12M62 40h10M46 52h6M56 52h18M46 64h20M70 64h6", v.faint, 2) +
    g("M72 72l8-6 6 8 10-10", v.danger, 3) +
    badge(110, 82, 11, v.danger, "!"),
  "empty-response":
    shadow +
    rect(30, 20, 100, 72, v.surface) +
    text(80, 64, "{ }", v.faint, 30) +
    g("M44 82h72", v.faint, 2, "stroke-dasharray:3 5"),
  "dependency-down":
    shadow +
    rect(20, 28, 44, 30, v.surface) +
    rect(96, 28, 44, 30, v.surface) +
    rect(58, 74, 44, 26, v.surface) +
    g("M42 58l26 16M118 58l-26 16", v.line, 3) +
    circ(118, 43, 5, v.danger) +
    circ(42, 43, 5, v.success) +
    circ(80, 87, 5, v.warning),
};

const security: Record<string, string> = {
  "bot-detected":
    shadow +
    robot(64, 40) +
    circ(118, 46, 18, v.raised, v.primary, "stroke-width:4") +
    g("M131 59l10 10", v.primary, 6) +
    badge(118, 46, 8, v.warning, "!"),
  "bot-challenge":
    shadow +
    rect(30, 22, 100, 70, v.surface) +
    [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => rect(44 + c * 24, 32 + r * 18, 20, 14, (r + c) % 3 === 0 ? v.primary : v.raised, v.line, 3))).join("") +
    badge(124, 26, 10, v.warning, "?"),
  "bot-allowed":
    shadow +
    robot(64, 40) +
    f("M100 92V40h36l-6 9 6 9h-36", v.success, v.success) +
    g("M100 40v58", v.line, 3),
  "verified-bot":
    shadow +
    robot(62, 40) +
    shieldShape(120, 34, v.success, v.success, 0.42) +
    glyph(120, 55, 10, "check", v.surface),
  "scraper-blocked":
    shadow +
    doc(22, 22, 52, 70, 4) +
    robot(116, 44) +
    g("M86 50l-10 8 10 8", v.line, 3) +
    badge(80, 30, 10, v.danger, "x"),
  "ddos-mitigated":
    shadow +
    Array.from({ length: 8 }, (_, i) => g(`M${10 + (i % 4) * 6} ${22 + i * 10}h${26 - (i % 3) * 4}`, v.danger, 3)).join("") +
    shieldShape(92, 18, v.surface, v.primary, 0.92) +
    rack(76, 46, 32, [v.success, v.success]),
  "brute-force-blocked":
    shadow +
    padlock(80, 52, 40) +
    keyShape(16, 32, 34, v.faint) +
    keyShape(18, 62, 30, v.faint) +
    keyShape(110, 40, 30, v.faint) +
    badge(118, 82, 11, v.danger, "x"),
  "credential-stuffing-blocked":
    shadow +
    [0, 1, 2].map((i) => rect(18 + i * 8, 22 + i * 12, 46, 30, v.surface, v.line, 4) + g(`M${26 + i * 8} ${34 + i * 12}h30`, v.faint, 2)).join("") +
    shieldShape(116, 28, v.raised, v.primary, 0.62) +
    glyph(116, 56, 10, "x", v.danger),
  "suspicious-login":
    shadow +
    rect(30, 18, 76, 78, v.surface) +
    person(68, 38, 0.9) +
    rect(42, 72, 52, 12, v.raised, v.line, 3) +
    warnTri(124, 60, 32),
  "new-device":
    shadow +
    laptop(58, 34, 64) +
    phone(104, 30, 34, 60) +
    badge(130, 26, 10, v.primary, "plus"),
  "impossible-travel":
    shadow +
    globe(80, 56, 36) +
    pin(56, 54, 0.75, v.primary) +
    pin(106, 74, 0.75, v.danger) +
    g("M56 38c20-26 46-20 50 16", v.warning, 3, "stroke-dasharray:5 5"),
  "account-takeover-blocked":
    shadow +
    person(64, 34, 1.1) +
    f("M88 50h22l-4 6 4 6H88z", v.danger, v.danger) +
    shieldShape(120, 46, v.success, v.success, 0.4) +
    glyph(120, 66, 9, "check", v.surface),
  "phishing-warning":
    shadow +
    envelope(26, 40, 70, 46) +
    g("M118 20v44a12 12 0 0 1-24 0v-6", v.line, 4) +
    g("M90 64l4-6 4 6", v.line, 4) +
    badge(124, 86, 10, v.danger, "!"),
  "malware-detected":
    shadow +
    doc(28, 18, 56, 76, 3) +
    bug(108, 60, 1.5, v.danger) +
    g("M84 50h10", v.line, 3),
  quarantine:
    shadow +
    rect(36, 22, 88, 76, v.surface, v.warning, 6, "stroke-width:3;stroke-dasharray:8 5") +
    bug(80, 64, 1.3, v.danger) +
    rect(52, 14, 56, 14, v.warning, "none", 3),
  "threat-contained":
    shadow +
    circ(80, 58, 38, v.surface, v.success, "stroke-width:4") +
    bug(80, 62, 1.2, v.faint) +
    badge(112, 28, 11, v.success, "check"),
  "honeypot-engaged":
    shadow +
    robot(80, 26) +
    f("M46 58h68v28a12 12 0 0 1-12 12H58a12 12 0 0 1-12-12z", v.warning, v.line) +
    rect(42, 50, 76, 12, v.raised, v.line, 4) +
    g("M58 74c8 6 36 6 44 0", v.surface, 3) +
    g("M30 30l10 6M128 26l-10 8", v.warning, 3),
  tarpit:
    shadow +
    robot(80, 30) +
    f("M20 70c20-6 40 6 60 0s40-6 60 0v26H20z", v.raised) +
    g("M20 70c20-6 40 6 60 0s40-6 60 0", v.line, 3) +
    g("M44 84c4 0 6 2 10 2M96 88c6 0 8-2 12-2", v.faint, 2) +
    clockFace(130, 30, 12, 9, 40, v.warning),
  "decoy-triggered":
    shadow +
    doc(40, 18, 56, 76, 0) +
    text(68, 64, ".env", v.faint, 14) +
    f("M98 22h34l-6 10 6 10H98z", v.danger, v.danger) +
    g("M98 22v40", v.line, 3),
  "canary-alert":
    shadow +
    f("M56 60c0-18 12-28 26-28 10 0 16 6 18 12l12 4-12 4c0 14-12 24-28 24-10 0-16-6-16-16z", v.warning, v.line) +
    circ(88, 44, 3, v.surface) +
    g("M70 84v12M80 84v12", v.line, 3) +
    g("M112 24l8-6M118 36h10M112 48l8 6", v.danger, 3),
  "attacker-profiled":
    shadow +
    rect(24, 18, 112, 78, v.surface) +
    person(52, 40, 0.9, v.danger) +
    g("M80 34h44M80 46h36M80 58h40M80 70h28", v.faint, 2) +
    rect(40, 80, 28, 8, v.raised, "none", 2),
  "ip-blocked":
    shadow +
    rect(24, 40, 82, 34, v.surface, v.line, 6) +
    text(65, 63, "10.0.4.2", v.faint, 13) +
    badge(118, 58, 16, v.danger, "slash"),
  "geo-blocked":
    shadow +
    globe(70, 58, 34) +
    f("M58 46l14-6 12 6-2 14-14 4-10-8z", v.raised, v.danger) +
    badge(118, 84, 11, v.danger, "minus"),
  "waf-rule-triggered":
    shadow +
    wall(56, 30, 40, 6) +
    g("M14 52h30", v.danger, 4) +
    g("M38 46l8 6-8 6", v.danger, 4) +
    g("M106 40h30M106 52h24M106 64h28", v.faint, 2) +
    badge(124, 84, 9, v.warning, "!"),
  "vulnerability-found":
    shadow +
    rect(28, 20, 104, 74, v.surface) +
    g("M40 36h40M40 48h56M40 60h30M40 72h50", v.faint, 2) +
    rect(36, 54, 64, 12, "none", v.danger, 3, "stroke-width:3") +
    circ(116, 40, 14, v.raised, v.primary, "stroke-width:3") +
    g("M126 50l10 10", v.primary, 5),
  "patch-applied":
    shadow +
    rect(38, 28, 84, 62, v.surface, v.line, 6) +
    f("M62 44h36v30H62z", v.primary, v.line) +
    g("M66 52h28M66 60h28M66 68h28", v.surface, 2) +
    badge(118, 30, 10, v.success, "check"),
  "secrets-exposed":
    shadow +
    doc(28, 18, 60, 76, 3) +
    keyShape(52, 72, 34, v.warning) +
    warnTri(118, 46, 34, v.danger),
  "key-rotated":
    shadow +
    circ(80, 56, 32, "none", v.line, "stroke-width:3;stroke-dasharray:6 6") +
    g("M112 52l0 8 -7-3", v.primary, 3) +
    keyShape(56, 56, 48, v.warning),
  "audit-passed":
    shadow +
    rect(40, 14, 72, 84, v.surface) +
    rect(62, 8, 28, 12, v.raised, v.line, 3) +
    [32, 50, 68].map((y) => badge(54, y, 5, v.success, "check") + g(`M66 ${y}h34`, v.faint, 2)).join("") +
    sparkle(124, 30, 6, v.success),
  "compliance-review":
    shadow +
    rect(36, 18, 70, 80, v.surface) +
    g("M48 34h46M48 46h40M48 58h46M48 70h30", v.faint, 2) +
    circ(116, 70, 16, v.raised, v.primary, "stroke-width:3") +
    g("M127 81l10 10", v.primary, 5),
  "encryption-on":
    shadow +
    doc(24, 22, 50, 68, 3) +
    g("M78 56h14", v.line, 3, "stroke-dasharray:3 3") +
    padlock(118, 52, 34, v.raised, v.primary),
  "firewall-up":
    shadow +
    wall(38, 30, 84, 7, v.raised) +
    f("M40 30c4-12 10-8 12-16 6 8 2 12 8 16", v.danger) +
    f("M88 30c4-10 8-8 10-14 6 6 2 10 8 14", v.warning) +
    badge(124, 26, 10, v.success, "check"),
  "intrusion-detected":
    shadow +
    rect(30, 30, 76, 60, v.surface, v.line, 6) +
    g("M30 46h76", v.line, 2) +
    f("M106 54l20-8v36l-20-8", v.raised, v.line) +
    g("M126 50l12-6M126 64h14M126 78l12 6", v.danger, 3) +
    person(68, 58, 0.7, v.danger),
  forensics:
    shadow +
    rect(26, 24, 74, 64, v.surface) +
    g("M36 40h50M36 52h36M36 64h46", v.faint, 2) +
    circ(110, 62, 18, v.raised, v.primary, "stroke-width:4") +
    g("M88 74l-12 12", v.primary, 6) +
    circ(110, 62, 5, v.warning),
  "incident-report":
    shadow +
    rect(34, 16, 80, 82, v.surface) +
    warnTri(56, 26, 18, v.danger) +
    g("M72 32h32M46 58h56M46 70h56M46 82h34", v.faint, 2),
  "device-verified":
    shadow +
    laptop(70, 32, 70) +
    shieldShape(124, 40, v.success, v.success, 0.42) +
    glyph(124, 60, 9, "check", v.surface),
  "mfa-required":
    shadow +
    phone(64, 18, 36, 66) +
    [0, 1, 2].map((i) => circ(73 + i * 9, 50, 3, v.primary)).join("") +
    padlock(122, 54, 22, v.raised, v.warning),
  "session-hijack-blocked":
    shadow +
    rect(24, 40, 54, 30, v.surface) +
    g("M32 55h38", v.faint, 2) +
    person(118, 36, 0.8, v.danger) +
    g("M82 55h14", v.danger, 3, "stroke-dasharray:3 3") +
    shieldShape(86, 34, v.success, v.success, 0.3),
  "zero-trust":
    shadow +
    [40, 80, 120].map((x) => circ(x, 64, 14, v.surface, v.line) + glyph(x, 64, 8, "lock", v.primary)).join("") +
    g("M54 64h12M94 64h12", v.line, 3, "stroke-dasharray:3 3") +
    g("M80 26v20", v.line, 3),
  "api-abuse-blocked":
    shadow +
    rect(20, 40, 54, 34, v.surface, v.line, 6) +
    text(47, 62, "API", v.faint, 13) +
    Array.from({ length: 5 }, (_, i) => g(`M${100 + i * 8} ${30 + i * 4}l-14 ${24 - i * 4}`, v.danger, 3)).join("") +
    badge(124, 84, 10, v.danger, "x"),
  "spam-blocked":
    shadow +
    envelope(28, 36, 60, 40) +
    envelope(40, 48, 60, 40) +
    badge(116, 54, 16, v.danger, "slash"),
  "allowlist-updated":
    shadow +
    rect(36, 20, 76, 76, v.surface) +
    [34, 52, 70].map((y, i) => badge(50, y, 5, i === 2 ? v.primary : v.success, i === 2 ? "plus" : "check") + g(`M62 ${y}h36`, v.faint, 2)).join(""),
  "blocklist-updated":
    shadow +
    rect(36, 20, 76, 76, v.surface) +
    [34, 52, 70].map((y, i) => badge(50, y, 5, i === 2 ? v.primary : v.danger, i === 2 ? "plus" : "minus") + g(`M62 ${y}h36`, v.faint, 2)).join(""),
};

const devops: Record<string, string> = {
  "deploy-in-progress":
    shadow +
    pipeline(30, 58, 33, [v.success, v.success, v.primary, v.raised]) +
    glyph(96, 58, 9, "refresh", v.surface) +
    g("M30 82h100", v.raised, 6) +
    g("M30 82h62", v.primary, 6),
  "deploy-failed": shadow + pipeline(30, 58, 33, [v.success, v.success, v.danger, v.raised]) + glyph(96, 58, 9, "x", v.surface) + "",
  "deploy-success":
    shadow +
    pipeline(30, 58, 33, [v.success, v.success, v.success, v.success]) +
    glyph(129, 58, 9, "check", v.surface) +
    sparkle(52, 30, 6, v.success) +
    sparkle(116, 30, 5, v.warning),
  rollback:
    shadow +
    rect(30, 36, 40, 44, v.surface) +
    rect(90, 36, 40, 44, v.raised, v.danger, 4) +
    text(50, 64, "v1", v.faint, 14) +
    text(110, 64, "v2", v.danger, 14) +
    g("M110 30c0-14-60-14-60 0", v.primary, 3) +
    g("M44 24l6 6 6-6", v.primary, 3),
  "canary-release":
    shadow +
    [0, 1, 2, 3, 4].map((i) => rect(22 + i * 24, 60, 18, 30, i === 0 ? v.warning : v.surface, v.line, 3)).join("") +
    f("M28 50c0-10 6-16 14-16 6 0 8 4 9 7l7 2-7 2c0 8-6 13-14 13-6 0-9-3-9-8z", v.warning, v.line),
  "scaling-up":
    shadow +
    bars(36, 92, [24, 36, 48, 60], v.primary, 24, 16) +
    g("M30 40l26-10 24 6 34-20", v.success, 3) +
    g("M106 16h10v10", v.success, 3),
  "scaling-down":
    shadow +
    bars(36, 92, [60, 46, 32, 20], v.line, 24, 16) +
    g("M30 20l30 14 24-4 34 22", v.primary, 3) +
    g("M108 52h10v-10", v.primary, 3),
  "server-overload":
    shadow +
    rack(40, 26, 80, [v.danger, v.danger, v.warning, v.danger]) +
    g("M30 20c4-6 8-6 12 0M118 20c4-6 8-6 12 0M74 14c4-6 8-6 12 0", v.danger, 3),
  "high-latency":
    shadow +
    rect(18, 46, 32, 32, v.surface) +
    rect(110, 46, 32, 32, v.surface) +
    g("M50 62c10-20 20 20 30 0s20-20 30 0", v.warning, 3) +
    text(80, 36, "900ms", v.warning, 12),
  "cpu-spike":
    shadow +
    chart(24, 18, 112, 70, [0.2, 0.25, 0.2, 0.3, 0.95, 0.4, 0.3], v.danger) +
    g("M30 34h100", v.warning, 2, "stroke-dasharray:4 4"),
  "memory-leak":
    shadow +
    chart(24, 18, 112, 70, [0.1, 0.22, 0.34, 0.46, 0.6, 0.74, 0.9], v.warning) +
    f("M120 92c0 4 3 7 6 7s6-3 6-7-6-12-6-12-6 8-6 12z", v.primary),
  "queue-backlog":
    shadow +
    Array.from({ length: 7 }, (_, i) => rect(14 + i * 16, 50, 12, 30, i > 3 ? v.warning : v.surface, v.line, 3)).join("") +
    f("M128 44l14 21-14 21z", v.raised, v.line) +
    text(80, 36, "12k", v.warning, 14),
  "database-down": shadow + db(70, 32, 60, 50) + badge(110, 82, 13, v.danger, "x"),
  "database-migrating":
    shadow +
    db(40, 40, 40, 40) +
    db(120, 40, 40, 40) +
    g("M64 60h32", v.primary, 4) +
    g("M90 54l6 6-6 6", v.primary, 4) +
    rect(64, 84, 32, 6, v.raised, "none", 3) +
    rect(64, 84, 20, 6, v.primary, "none", 3),
  "replication-lag":
    shadow +
    db(46, 34, 44, 44) +
    db(114, 46, 36, 34) +
    g("M70 56h20", v.line, 3, "stroke-dasharray:3 3") +
    clockFace(80, 26, 10, 2, 50, v.warning),
  "backup-running":
    shadow +
    db(52, 32, 48, 48) +
    rect(94, 40, 40, 44, v.surface, v.line, 5) +
    g("M76 58h16", v.primary, 3) +
    glyph(114, 62, 10, "refresh", v.primary),
  "restore-running":
    shadow +
    rect(26, 40, 40, 44, v.surface, v.line, 5) +
    db(110, 32, 48, 48) +
    g("M66 58h18", v.primary, 3) +
    glyph(46, 62, 10, "down", v.primary),
  failover:
    shadow +
    rack(22, 34, 48, [v.danger, v.danger]) +
    rack(90, 34, 48, [v.success, v.success]) +
    g("M80 20v70", v.line, 2, "stroke-dasharray:4 4") +
    g("M60 90c10 8 30 8 40 0", v.primary, 3),
  outage:
    shadow +
    [26, 66, 106].map((x) => rect(x, 40, 28, 40, v.surface) + circ(x + 14, 52, 4, v.danger)).join("") +
    g("M20 30l120 0", v.danger, 3) +
    warnTri(80, 86, 20, v.danger),
  "partial-outage":
    shadow + [26, 66, 106].map((x, i) => rect(x, 40, 28, 40, v.surface) + circ(x + 14, 52, 4, i === 1 ? v.danger : v.success)).join("") + warnTri(80, 86, 20, v.warning),
  "degraded-performance":
    shadow +
    [26, 66, 106].map((x, i) => rect(x, 40, 28, 40, v.surface) + circ(x + 14, 52, 4, i === 2 ? v.warning : v.success)).join("") +
    g("M30 92h100", v.warning, 3, "stroke-dasharray:6 6"),
  "all-systems-operational":
    shadow +
    [26, 66, 106].map((x) => rect(x, 40, 28, 40, v.surface) + circ(x + 14, 52, 4, v.success)).join("") +
    badge(80, 24, 12, v.success, "check"),
  "scheduled-maintenance":
    shadow +
    rect(30, 26, 72, 66, v.surface) +
    g("M30 42h72M46 20v12M86 20v12", v.line, 3) +
    rect(54, 56, 24, 18, v.warning, "none", 3) +
    cog(118, 74, 14),
  "on-call-paged":
    shadow +
    phone(56, 18, 44, 76, v.danger) +
    g("M40 40c-6 8-6 22 0 30M114 40c6 8 6 22 0 30", v.danger, 3) +
    glyph(78, 54, 10, "!", v.surface),
  "incident-war-room":
    shadow +
    rect(28, 70, 104, 10, v.raised, v.line, 3) +
    [44, 80, 116].map((x) => person(x, 40, 0.8)).join("") +
    warnTri(80, 6, 20, v.danger),
  postmortem:
    shadow +
    doc(34, 16, 70, 82, 5) +
    clockFace(116, 76, 14, 3, 20) +
    rect(42, 30, 20, 8, v.danger, "none", 2),
  "uptime-streak":
    shadow +
    Array.from({ length: 12 }, (_, i) => rect(20 + i * 10, 52, 7, 26, i === 7 ? v.warning : v.success, "none", 2)).join("") +
    text(80, 40, "99.99%", v.success, 16),
  "monitoring-dashboard":
    shadow +
    rect(18, 16, 124, 84, v.surface) +
    chart(26, 24, 52, 34, [0.3, 0.6, 0.4, 0.8], v.primary) +
    gauge(110, 52, 18, 0.6, v.success) +
    bars(30, 92, [10, 18, 14, 22, 12], v.secondary, 10, 6) +
    chart(84, 62, 52, 32, [0.5, 0.3, 0.6, 0.4], v.warning),
  "logs-streaming":
    shadow +
    rect(24, 16, 112, 82, v.raised) +
    [28, 40, 52, 64, 76, 88].map((y, i) => circ(36, y, 3, [v.success, v.success, v.warning, v.success, v.danger, v.success][i] as string) + g(`M46 ${y}h${[60, 72, 48, 66, 54, 40][i]}`, v.faint, 2)).join(""),
  "trace-waterfall":
    shadow +
    rect(20, 18, 120, 80, v.surface) +
    [0, 1, 2, 3, 4].map((i) => rect(30 + i * 12, 28 + i * 13, [90, 40, 30, 50, 20][i] as number, 8, [v.primary, v.secondary, v.info, v.warning, v.success][i] as string, "none", 2)).join(""),
  "alert-silenced":
    shadow +
    f("M56 84V58a24 24 0 0 1 48 0v26z", v.raised, v.line) +
    rect(48, 84, 64, 10, v.surface, v.line, 3) +
    g("M40 30l80 70", v.surface, 8) +
    g("M40 30l80 70", v.faint, 4),
  "cron-job-failed":
    shadow + clockFace(66, 56, 30, 2, 0) + badge(110, 82, 12, v.danger, "x") + g("M100 30l8-8", v.line, 3),
  "pipeline-broken":
    shadow +
    g("M20 58h48M92 58h48", v.line, 6) +
    g("M68 50l8 8-6 6 8 8", v.danger, 3) +
    g("M92 50l-8 8 6 6-8 8", v.danger, 3) +
    circ(28, 58, 8, v.success) +
    circ(132, 58, 8, v.raised, v.line),
  "build-passing":
    shadow +
    rect(30, 30, 100, 56, v.surface, v.line, 8) +
    g("M44 48h40M44 60h30M44 72h46", v.faint, 2) +
    badge(110, 58, 14, v.success, "check"),
  "tests-failing":
    shadow +
    rect(28, 20, 104, 76, v.surface) +
    [34, 50, 66, 82].map((y, i) => badge(42, y, 5, i === 2 ? v.danger : v.success, i === 2 ? "x" : "check") + g(`M54 ${y}h${[60, 48, 66, 40][i]}`, v.faint, 2)).join(""),
  "cache-cleared":
    shadow +
    rect(40, 28, 64, 64, v.surface, v.line, 8) +
    g("M52 46h40M52 60h40M52 74h24", v.faint, 2, "stroke-dasharray:3 4") +
    f("M112 30l20 20-26 26-10-10z", v.raised, v.line) +
    g("M100 72l-14 14", v.warning, 4),
  "cdn-purge":
    shadow +
    globe(80, 56, 20) +
    [
      [30, 30],
      [130, 30],
      [30, 86],
      [130, 86],
    ]
      .map(([x, y]) => circ(x as number, y as number, 9, v.raised, v.line) + g(`M${x} ${y}L${80 + ((x as number) < 80 ? -16 : 16)} ${56 + ((y as number) < 56 ? -12 : 12)}`, v.line, 2, "stroke-dasharray:3 3"))
      .join("") +
    glyph(30, 30, 6, "x", v.danger),
  "dns-propagating":
    shadow +
    globe(80, 58, 32) +
    circ(80, 58, 42, "none", v.primary, "stroke-width:2;stroke-dasharray:4 6") +
    circ(80, 58, 52, "none", v.primary, "stroke-width:2;stroke-dasharray:2 8"),
  "certificate-renewed":
    shadow +
    rect(28, 22, 92, 64, v.surface) +
    g("M40 38h52M40 50h40M40 62h30", v.faint, 2) +
    circ(110, 76, 14, v.success, v.line) +
    f("M102 86l-4 16 12-6 12 6-4-16", v.success, v.line) +
    glyph(110, 76, 8, "check", v.surface),
  "container-crashloop":
    shadow +
    box(44, 40, 72, 40) +
    g("M30 60a50 34 0 0 1 100 0", v.danger, 3) +
    g("M124 52l6 8 8-6", v.danger, 3) +
    badge(80, 96, 7, v.danger, "refresh"),
  "cluster-healthy":
    shadow +
    [
      [80, 30],
      [44, 60],
      [116, 60],
      [62, 90],
      [98, 90],
    ]
      .map(([x, y]) => circ(x as number, y as number, 12, v.surface, v.success, "stroke-width:3"))
      .join("") +
    g("M80 42l-26 10M80 42l26 10M50 70l6 10M110 70l-6 10M74 90h12", v.line, 2),
  "node-unreachable":
    shadow +
    circ(46, 58, 14, v.surface, v.success, "stroke-width:3") +
    circ(114, 58, 14, v.surface, v.danger, "stroke-width:3;stroke-dasharray:4 3") +
    g("M60 58h40", v.line, 3, "stroke-dasharray:4 5") +
    glyph(114, 58, 7, "?", v.danger),
  "disk-pressure":
    shadow + rect(34, 36, 92, 48, v.surface, v.line, 8) + gauge(80, 74, 26, 0.85, v.warning),
  "queue-drained":
    shadow +
    f("M20 44l14 21-14 21z", v.raised, v.line) +
    g("M40 65h80", v.line, 2, "stroke-dasharray:3 6") +
    f("M126 44l14 21-14 21z", v.raised, v.line) +
    badge(80, 36, 11, v.success, "check"),
  "load-balanced":
    shadow +
    circ(30, 60, 12, v.primary) +
    g("M42 60h20M62 60l20-28M62 60h20M62 60l20 28", v.line, 3) +
    rack(86, 22, 50, [v.success]) +
    rack(86, 50, 50, [v.success]) +
    rack(86, 78, 50, [v.success]),
  "rate-limits-tuned":
    shadow +
    rect(30, 30, 100, 56, v.surface, v.line, 8) +
    [0, 1, 2].map((i) => g(`M${52 + i * 28} 42v32`, v.line, 3) + rect(46 + i * 28, [52, 44, 60][i] as number, 12, 8, v.primary, "none", 2)).join(""),
  "feature-flag-off":
    shadow +
    g("M54 98V24", v.line, 4) +
    f("M54 26h52l-8 12 8 12H54z", v.raised, v.line) +
    rect(66, 70, 40, 20, v.raised, v.line, 10) +
    circ(76, 80, 7, v.faint),
  "secrets-rotated":
    shadow +
    rect(44, 30, 72, 60, v.surface, v.line, 8) +
    circ(80, 60, 14, v.raised, v.line) +
    g("M80 52v8l6 4", v.line, 3) +
    glyph(116, 30, 10, "refresh", v.success),
  "region-failover":
    shadow +
    globe(52, 58, 26) +
    globe(118, 58, 20) +
    g("M78 58h18", v.primary, 3) +
    g("M90 52l6 6-6 6", v.primary, 3) +
    circ(52, 58, 5, v.danger),
  "slo-breached":
    shadow +
    chart(24, 18, 112, 70, [0.7, 0.72, 0.68, 0.5, 0.36, 0.3], v.danger) +
    g("M30 46h100", v.success, 2, "stroke-dasharray:5 4"),
};

export const set: IllustrationSet = { errors, security, devops };
