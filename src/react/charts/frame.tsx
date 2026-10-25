import { type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cx } from "../cx";
import { formatCompact, formatNumber, type SeriesColor, seriesColor } from "./scale";

/** One plotted measure: `key` reads the value from each row. */
export interface ChartSeries {
  key: string;
  label: string;
  color?: SeriesColor;
}

/** Props every cartesian chart shares. */
export interface ChartBaseProps<Row> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  data: Row[];
  /** The row field holding the category / x label. */
  x: keyof Row & string;
  series: ChartSeries[];
  /** Accessible name — what the chart shows, e.g. "Requests per hour, last 24 h". */
  label: string;
  /** Plot height in px. Default 240. */
  height?: number;
  /** Legend below the plot. Default: shown when there are two or more series. */
  legend?: boolean;
  /** "hidden" (default) keeps the data table for screen readers only; "toggle" adds a visible "View as table". */
  table?: "hidden" | "toggle";
  /** Format for tooltips and the table. Default: grouped number. */
  format?: (value: number) => string;
  /** Format for axis ticks. Default: compact (12.5K). */
  tickFormat?: (value: number) => string;
  locale?: string;
  emptyText?: ReactNode;
}

/** Fallback width before the first measurement, and on the server. */
export const SSR_WIDTH = 600;

/** The rendered width of an element, tracked with ResizeObserver; SSR-safe. */
export function useChartWidth<T extends HTMLElement>(fallback = SSR_WIDTH) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Hover with a mouse, tap on touch. `pointerleave` fires right after a tap ends, so it only
 * clears the tooltip for a mouse; on touch a tap anywhere outside the plot clears it instead.
 * Spread `plotProps` on the plot element and pass `active` (is a tooltip showing).
 */
export function usePlotPointer<T extends HTMLElement = HTMLDivElement>(clear: () => void, active: boolean) {
  const ref = useRef<T>(null);
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    // composedPath, not contains(): a redraw caused by this same tap may have detached its target.
    const onDown = (e: PointerEvent) => {
      if (ref.current && !e.composedPath().includes(ref.current)) clearRef.current();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);
  return {
    ref,
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse") clear();
    },
  };
}

/** Whether a media query matches, kept live; false on the server and before the first effect. */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

/** True while the viewport is phone-sized (≤ 640 px). */
export const useNarrowViewport = () => useMediaQuery("(max-width: 640px)");

/** Below this plot width the tooltip docks across the top of the plot instead of following the pointer. */
export const PINNED_TOOLTIP_WIDTH = 420;

/** Series visibility toggled from the legend. Colours stay with the series, never re-assigned. */
export function useHiddenSeries() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return [hidden, toggle] as const;
}

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  /** Optional value shown after the label (donut). */
  value?: string;
}

export function ChartLegend({ items, hidden, onToggle }: { items: LegendItem[]; hidden?: ReadonlySet<string>; onToggle?: (key: string) => void }) {
  return (
    <div className="oq-chart__legend">
      {items.map((it) =>
        onToggle ? (
          <button
            key={it.key}
            type="button"
            className="oq-chart__legend-item"
            aria-pressed={!hidden?.has(it.key)}
            onClick={() => onToggle(it.key)}
          >
            <span className="oq-chart__swatch" style={{ background: it.color }} />
            {it.label}
            {it.value !== undefined && <span className="oq-chart__legend-value">{it.value}</span>}
          </button>
        ) : (
          <span key={it.key} className="oq-chart__legend-item">
            <span className="oq-chart__swatch" style={{ background: it.color }} />
            {it.label}
            {it.value !== undefined && <span className="oq-chart__legend-value">{it.value}</span>}
          </span>
        ),
      )}
    </div>
  );
}

export interface TooltipState {
  x: number;
  y: number;
  title: ReactNode;
  rows: Array<{ key: string; label: string; color: string; value: string }>;
  /** Open to the left of `x`. Default: when `x` is past the middle of the plot. */
  flip?: boolean;
}

/**
 * Positioned inside the plot; flips to the left of the pointer past the middle so it never overflows.
 * On a narrow plot (a phone) there is no room beside the pointer, so it docks across the top.
 */
export function ChartTooltip({ tip, width, pinned: pin }: { tip: TooltipState | null; width: number; pinned?: boolean }) {
  if (!tip) return null;
  const flip = tip.flip ?? tip.x > width / 2;
  const pinned = pin ?? width < PINNED_TOOLTIP_WIDTH;
  return (
    <div
      className={cx("oq-chart__tooltip", pinned && "oq-chart__tooltip--pinned")}
      role="presentation"
      style={pinned ? undefined : { left: tip.x, top: tip.y, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
    >
      <div className="oq-chart__tooltip-title">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.key} className="oq-chart__tooltip-row">
          <span className="oq-chart__swatch" style={{ background: r.color }} />
          <span className="oq-chart__tooltip-label">{r.label}</span>
          <span className="oq-chart__tooltip-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** The same numbers as a table: always present for screen readers, optionally visible. */
export function ChartTable({ caption, columns, rows, mode }: { caption: string; columns: string[]; rows: Array<Array<string>>; mode: "hidden" | "toggle" }) {
  const table = (
    <table className={cx("oq-table oq-table--dense", mode === "hidden" && "oq-sr-only")}>
      <caption className="oq-sr-only">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={c} className={i ? "oq-num" : undefined} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            {r.map((cell, i) =>
              i ? (
                <td key={i} className="oq-num">
                  {cell}
                </td>
              ) : (
                <th key="h" scope="row">
                  {cell}
                </th>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
  if (mode === "hidden") return table;
  return (
    <details className="oq-chart__table">
      <summary>View as table</summary>
      <div className="oq-table-wrap">{table}</div>
    </details>
  );
}

export function ChartEmpty({ height, children }: { height: number; children?: ReactNode }) {
  return (
    <div className="oq-chart__empty" style={{ height }}>
      {children ?? "No data"}
    </div>
  );
}

/** Rows → series list resolved with colours and visibility, colour index fixed by position. */
export function resolveSeries(series: ChartSeries[], hidden: ReadonlySet<string>) {
  return series.map((s, i) => ({ ...s, fill: seriesColor(s.color, i), hidden: hidden.has(s.key) }));
}

export const num = (row: unknown, key: string): number => {
  const v = (row as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
};

export const defaults = (locale: string | undefined, format?: (v: number) => string, tickFormat?: (v: number) => string) => ({
  fmt: format ?? ((v: number) => formatNumber(v, locale)),
  tick: tickFormat ?? ((v: number) => formatCompact(v, locale)),
});

/** Shortens a label to `max` characters with an ellipsis (axis labels on narrow charts). */
export const clip = (label: string, max: number) => (label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label);

/** Left margin wide enough for the longest tick label (≈ 6.5 px per character at 11 px). */
export const axisWidth = (labels: string[]) => Math.max(28, Math.ceil(Math.max(...labels.map((l) => l.length), 1) * 6.5) + 10);
