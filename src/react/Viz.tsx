import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/*
 * Small data displays that are plain HTML, not SVG charts: ranked bars, a 100% stacked bar, a
 * funnel, a histogram and a percentile strip. Each renders the markup documented in
 * styles/charts.css, so a page without React can write the same markup by hand.
 */

/** A series slot (1–8), an ordinal step (`"ord-3"`) or any CSS colour. */
export type VizColor = number | `ord-${1 | 2 | 3 | 4 | 5}` | `seq-${number}` | (string & {});

/** The class (or inline variable) that colours one mark. */
function fill(color: VizColor | undefined): { className?: string; style?: CSSProperties } {
  if (color === undefined) return {};
  if (typeof color === "number") return { className: `oq-fill-series-${color}` };
  if (/^(ord|seq)-\d+$/.test(color)) return { className: `oq-fill-${color}` };
  return { style: { "--oq-fill": color } as CSSProperties };
}

const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(2)}%`;
const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n);

/* ---------- RankedBars ---------- */

export interface RankedBarItem {
  label: ReactNode;
  value: number;
  /** Turns the label into a link. */
  href?: string;
  color?: VizColor;
}

export interface RankedBarsProps extends Omit<HTMLAttributes<HTMLOListElement>, "color"> {
  items: RankedBarItem[];
  /** The value of a full-width bar; defaults to the largest value. */
  max?: number;
  /** Show each item's share of the total after its value. */
  showShare?: boolean;
  /** Colour of every bar; an item's own `color` wins. Defaults to series 1. */
  color?: VizColor;
  format?: (value: number) => string;
  /** Sort descending by value (default true). */
  sorted?: boolean;
}

/** A labelled horizontal bar per item, longest first: top IPs, paths, countries. */
export function RankedBars({ items, max, showShare, color, format = defaultFormat, sorted = true, className, style, ...rest }: RankedBarsProps) {
  const list = sorted ? [...items].sort((a, b) => b.value - a.value) : items;
  const top = max ?? Math.max(1, ...list.map((i) => i.value));
  const total = list.reduce((s, i) => s + i.value, 0) || 1;
  const own = fill(color);
  return (
    <ol {...rest} className={cx("oq-bars", own.className, className)} style={{ ...own.style, ...style }}>
      {list.map((item, i) => {
        const f = fill(item.color);
        return (
          <li
            key={i}
            className={cx("oq-bars__item", f.className)}
            style={{ ...f.style, "--value": pct((item.value / top) * 100) } as CSSProperties}
          >
            {item.href ? (
              <a className="oq-bars__label" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className="oq-bars__label">{item.label}</span>
            )}
            <span className="oq-bars__track">
              <span className="oq-bars__bar" />
            </span>
            <span className="oq-bars__value">
              {format(item.value)}
              {showShare && <span className="oq-bars__share">{Math.round((item.value / total) * 100)}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- StackBar ---------- */

export interface StackSegment {
  label: string;
  value: number;
  color?: VizColor;
}

export interface StackBarProps extends HTMLAttributes<HTMLDivElement> {
  segments: StackSegment[];
  /** Accessible summary; defaults to "label share%" for each segment. */
  label?: string;
  size?: "md" | "lg";
  /** Hide the legend (keep `label` meaningful then). */
  hideLegend?: boolean;
}

/** One bar split into shares of 100%, with a legend: a response mix, a status split. */
export function StackBar({ segments, label, size = "md", hideLegend, className, ...rest }: StackBarProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const shares = segments.map((s, i) => ({ ...s, share: (s.value / total) * 100, color: s.color ?? i + 1 }));
  const summary = label ?? shares.map((s) => `${s.label} ${Math.round(s.share)}%`).join(", ");
  return (
    <div {...rest} className={cx("oq-stackbar", size === "lg" && "oq-stackbar--lg", className)}>
      <div className="oq-stackbar__track" role="img" aria-label={summary}>
        {shares.map((s) => {
          const f = fill(s.color);
          return <span key={s.label} className={cx("oq-stackbar__seg", f.className)} style={{ ...f.style, "--value": pct(s.share) } as CSSProperties} />;
        })}
      </div>
      {!hideLegend && (
        <ul className="oq-stackbar__legend">
          {shares.map((s) => {
            const f = fill(s.color);
            return (
              <li key={s.label} className={f.className} style={f.style}>
                {s.label} <b>{Math.round(s.share)}%</b>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Funnel ---------- */

export interface FunnelStage {
  label: ReactNode;
  value: number;
}

export interface FunnelProps extends HTMLAttributes<HTMLOListElement> {
  stages: FunnelStage[];
  format?: (value: number) => string;
  /** Show each stage as a share of the first (default) or of the previous stage. */
  rate?: "first" | "previous";
}

/** Stages that narrow: probed → engaged → trapped → blocked. Ordinal colours, lightest first. */
export function Funnel({ stages, format = defaultFormat, rate = "first", className, ...rest }: FunnelProps) {
  const first = stages[0]?.value || 1;
  return (
    <ol {...rest} className={cx("oq-funnel", className)}>
      {stages.map((stage, i) => {
        const base = rate === "previous" && i > 0 ? stages[i - 1]?.value || 1 : first;
        const step = Math.min(5, Math.max(1, Math.round(((i + 1) / stages.length) * 5)));
        return (
          <li
            key={i}
            className={cx("oq-funnel__stage", `oq-fill-ord-${step}`)}
            style={{ "--value": pct((stage.value / first) * 100) } as CSSProperties}
          >
            <span className="oq-funnel__label">{stage.label}</span>
            <span className="oq-funnel__bar" />
            <span className="oq-funnel__value">{format(stage.value)}</span>
            <span className="oq-funnel__rate">{i === 0 ? "100%" : `${((stage.value / base) * 100).toFixed(stage.value / base < 0.1 ? 1 : 0)}%`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Histogram ---------- */

export interface HistogramBin {
  /** Shown as the bin's tooltip and in the accessible summary. */
  label: string;
  count: number;
}

export interface HistogramProps extends HTMLAttributes<HTMLElement> {
  bins: HistogramBin[];
  /** A dashed marker at this fraction (0–1) of the x axis, e.g. the block threshold. */
  threshold?: { at: number; label: string };
  /** Colour bins at or past the threshold with this intent. */
  pastThreshold?: "warning" | "danger";
  /** Axis labels, spread evenly under the plot. */
  axis?: ReactNode[];
  label: string;
}

/** Counts per bucket as vertical bars, with an optional threshold line: a score distribution. */
export function Histogram({ bins, threshold, pastThreshold, axis, label, className, ...rest }: HistogramProps) {
  const top = Math.max(1, ...bins.map((b) => b.count));
  return (
    <figure {...rest} className={cx("oq-histogram", className)}>
      <div className="oq-histogram__plot" role="img" aria-label={`${label}: ${bins.map((b) => `${b.label} ${b.count}`).join(", ")}`}>
        {bins.map((b, i) => {
          const past = threshold !== undefined && pastThreshold !== undefined && (i + 0.5) / bins.length >= threshold.at;
          return (
            <span
              key={b.label}
              className={cx("oq-histogram__bin", past && `oq-${pastThreshold}`)}
              title={`${b.label}: ${b.count}`}
              style={{ "--value": pct((b.count / top) * 100) } as CSSProperties}
            />
          );
        })}
        {threshold && (
          <span className="oq-histogram__threshold" data-label={threshold.label} style={{ "--value": pct(threshold.at * 100) } as CSSProperties} />
        )}
      </div>
      {axis && (
        <div className="oq-histogram__axis">
          {axis.map((a, i) => (
            <span key={i}>{a}</span>
          ))}
        </div>
      )}
    </figure>
  );
}

/* ---------- PercentileStrip ---------- */

export interface PercentileStripProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** e.g. { p50: 38, p95: 84, p99: 210 } */
  values: Record<string, number>;
  /** The value at the right end of the track. */
  max: number;
  unit?: string;
  color?: VizColor;
}

/** Where the percentiles of a distribution fall on one track: latency p50 / p95 / p99. */
export function PercentileStrip({ values, max, unit = "", color = 1, className, ...rest }: PercentileStripProps) {
  const entries = Object.entries(values).sort((a, b) => a[1] - b[1]);
  const last = entries.at(-1)?.[1] ?? 0;
  const f = fill(color);
  const summary = entries.map(([k, v]) => `${k} ${v}${unit}`).join(", ");
  return (
    <div {...rest} className={cx("oq-percentiles", f.className, className)} style={f.style} role="img" aria-label={`${summary} of ${max}${unit}`}>
      <div className="oq-percentiles__track">
        <span className="oq-percentiles__range" style={{ "--value": pct((last / max) * 100) } as CSSProperties} />
        {entries.map(([k, v]) => (
          <span key={k} className="oq-percentiles__mark" data-label={`${k} ${v}${unit}`} style={{ "--value": pct((v / max) * 100) } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
