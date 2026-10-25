/**
 * Drawing helpers for the illustrations: 160×120, the icons' line style, colours as theme
 * variables with dark-theme fallbacks set through `style` (CSS variables do not resolve in
 * presentation attributes everywhere). Shared by src/illustrations/index.ts and sets/*.ts.
 */

export const v = {
  shadow: "var(--oq-hover, #403e41)",
  surface: "var(--oq-surface, #2d2a2e)",
  raised: "var(--oq-raised, #363337)",
  line: "var(--oq-border-strong, #5b595c)",
  faint: "var(--oq-text-faint, #939293)",
  primary: "var(--oq-primary, #78dce8)",
  secondary: "var(--oq-secondary, #ab9df2)",
  success: "var(--oq-success, #a9dc76)",
  warning: "var(--oq-warning, #ffd866)",
  danger: "var(--oq-danger, #ff6188)",
  info: "var(--oq-info, #fc9867)",
  text: "var(--oq-text, #fcfcfa)",
};

/** style="fill:…;stroke:…" — `none` for either is allowed. */
export const s = (fill: string, stroke = "none", extra = "") =>
  `style="fill:${fill};stroke:${stroke}${extra ? `;${extra}` : ""}"`;

export const shadow = `<ellipse cx="80" cy="106" rx="54" ry="6" ${s(v.shadow)}/>`;

/** A small four-point sparkle centred on (x, y). */
export const sparkle = (x: number, y: number, size: number, colour: string) =>
  `<path d="M${x} ${y - size}q${size * 0.18} ${size * 0.82} ${size} ${size}q-${size * 0.82} ${size * 0.18}-${size} ${size}q-${size * 0.18}-${size * 0.82}-${size}-${size}q${size * 0.82}-${size * 0.18} ${size}-${size}z" ${s(colour)}/>`;

/** A browser-style card at (x, y) with three window dots, used by several states. */
export const windowCard = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${s(v.surface, v.line)}/>` +
  `<path d="M${x} ${y + 14}h${w}" ${s("none", v.line)}/>` +
  `<circle cx="${x + 9}" cy="${y + 7}" r="2" ${s(v.danger)}/><circle cx="${x + 16}" cy="${y + 7}" r="2" ${s(v.warning)}/><circle cx="${x + 23}" cy="${y + 7}" r="2" ${s(v.success)}/>`;

/** A robot head centred on cx, top at y. */
export const robot = (cx: number, y: number) =>
  `<path d="M${cx} ${y}v-10" ${s("none", v.line, "stroke-width:3")}/>` +
  `<circle cx="${cx}" cy="${y - 13}" r="4" ${s(v.primary)}/>` +
  `<rect x="${cx - 30}" y="${y}" width="60" height="48" rx="12" ${s(v.raised, v.line)}/>` +
  `<rect x="${cx - 36}" y="${y + 16}" width="6" height="16" rx="2" ${s(v.surface, v.line)}/>` +
  `<rect x="${cx + 30}" y="${y + 16}" width="6" height="16" rx="2" ${s(v.surface, v.line)}/>` +
  `<circle cx="${cx - 12}" cy="${y + 20}" r="5" ${s(v.primary)}/><circle cx="${cx + 12}" cy="${y + 20}" r="5" ${s(v.primary)}/>` +
  `<path d="M${cx - 12} ${y + 35}h24" ${s("none", v.faint, "stroke-width:3")}/>`;

/** A shield centred on cx, top at y: 76 wide and 92 tall at scale 1. */
export const shieldShape = (cx: number, y: number, fill: string, stroke: string, k = 1) => {
  const n = (x: number) => Math.round(x * k * 100) / 100;
  return `<path d="M${cx} ${y}l${n(38)} ${n(14)}v${n(30)}c0 ${n(24)}-${n(16)} ${n(40)}-${n(38)} ${n(48)}-${n(22)}-${n(8)}-${n(38)}-${n(24)}-${n(38)}-${n(48)}V${y + n(14)}z" ${s(fill, stroke)}/>`;
};

