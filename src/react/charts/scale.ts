import type { Color } from "../cx";

/**
 * Chart maths with no React and no DOM: ticks, scales, number formatting, series colours.
 * Everything here is pure so it can be unit-tested and reused by the plain-HTML preview.
 */

export interface Ticks {
  /** The tick values, inclusive of both ends. */
  ticks: number[];
  /** The domain widened to whole steps. */
  min: number;
  max: number;
  step: number;
}

/**
 * Round, human ticks for a range — steps of 1, 2 or 5 times a power of ten.
 * The domain is widened outward to whole steps, so bars never touch the top of the plot.
 */
export function niceTicks(min: number, max: number, count = 5): Ticks {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0, 1], min: 0, max: 1, step: 1 };
  if (min > max) [min, max] = [max, min];
  if (min === max) {
    // A flat series still needs a range: from zero to its one value, or 0–1 when that is zero.
    if (min > 0) min = 0;
    else if (max < 0) max = 0;
    else max = 1;
  }
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  // Nearest nice step on a log scale (thresholds at the geometric means), so the tick count
  // lands close to `count` instead of always rounding the step up.
  const mult = norm >= Math.sqrt(50) ? 10 : norm >= Math.sqrt(10) ? 5 : norm >= Math.sqrt(2) ? 2 : 1;
  const step = mult * mag;
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  // Round each tick to the step's precision so 0.30000000000000004 never reaches a label.
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(digits)));
  return { ticks, min: ticks[0] ?? lo, max: ticks[ticks.length - 1] ?? hi, step };
}

/** A linear map from a domain onto a pixel range. */
export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** Evenly spaced bands for categories, with an inner padding ratio between them. */
export function bandScale(count: number, range: [number, number], padding = 0.25) {
  const [r0, r1] = range;
  const step = count > 0 ? (r1 - r0) / count : 0;
  const width = step * (1 - padding);
  return { step, width, start: (i: number) => r0 + i * step + (step - width) / 2 };
}

const formatters = new Map<string, Intl.NumberFormat>();
function formatter(locale: string | undefined, options: Intl.NumberFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    formatters.set(key, f);
  }
  return f;
}

/** 12 480 → "12.5K". Used for axis ticks, where space is short. */
export function formatCompact(value: number, locale?: string): string {
  return formatter(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** 12480.5 → "12,480.5". Used in tooltips and tables, where the exact value matters. */
export function formatNumber(value: number, locale?: string): string {
  return formatter(locale, { maximumFractionDigits: 2 }).format(value);
}

/**
 * A series colour: a categorical slot (1–8, the default, assigned in order and never cycled),
 * an intent name, or any CSS colour. Intents are allowed but the status ones (success,
 * warning, danger) should stay reserved for state, not "series 4".
 */
export type SeriesColor = number | Color | (string & {});

const intents = new Set(["primary", "secondary", "success", "warning", "danger", "info", "neutral"]);

/** Resolve a series colour to a CSS value. `index` is the series' position in the full list. */
export function seriesColor(color: SeriesColor | undefined, index: number): string {
  if (color === undefined) return `var(--oq-series-${(index % 8) + 1})`;
  if (typeof color === "number") return `var(--oq-series-${color})`;
  if (intents.has(color)) return `var(--oq-${color})`;
  return color;
}

/** Eight categorical slots exist; a ninth series should be folded into "Other", not given a new hue. */
export const SERIES_SLOTS = 8;
