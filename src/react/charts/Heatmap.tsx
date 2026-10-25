import { type HTMLAttributes, type ReactNode, useState } from "react";
import { cx } from "../cx";
import { ChartEmpty, ChartTable, ChartTooltip, clip, type TooltipState, useChartWidth, usePlotPointer } from "./frame";
import { formatCompact, formatNumber } from "./scale";

/** Narrowest a cell gets (px); below it the grid scrolls sideways instead. */
const MIN_CELL = 14;

export interface HeatmapProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Row labels, top to bottom (e.g. weekdays). */
  rows: string[];
  /** Column labels, left to right (e.g. hours). */
  columns: string[];
  /** values[row][column]; null or undefined means no data (drawn as an empty cell). */
  values: Array<Array<number | null | undefined>>;
  label: string;
  /** Cell height in px. Default 22. */
  cellHeight?: number;
  /** Number of colour steps. Default 6 — quantised steps read more reliably than a smooth ramp. */
  steps?: number;
  /** Fix the range (default: the data's min and max). */
  min?: number;
  max?: number;
  table?: "hidden" | "toggle";
  format?: (value: number) => string;
  locale?: string;
  emptyText?: ReactNode;
}

/** The step (0 … steps-1) a value falls in. */
export function heatStep(v: number, lo: number, hi: number, steps: number): number {
  if (hi <= lo) return steps - 1;
  return Math.max(0, Math.min(steps - 1, Math.floor(((v - lo) / (hi - lo)) * steps)));
}

/** One hue, light to dark: the primary mixed into the surface, from 18 % (near zero) to 100 %. */
export const heatColor = (step: number, steps: number) =>
  `color-mix(in srgb, var(--oq-primary) ${Math.round(18 + (82 * step) / Math.max(1, steps - 1))}%, var(--oq-surface))`;

/** A grid of cells shaded on one sequential scale, e.g. requests per hour and weekday, with a scale strip and tooltips. */
export function Heatmap({
  rows,
  columns,
  values,
  label,
  cellHeight = 22,
  steps = 6,
  min,
  max,
  table = "hidden",
  format,
  locale,
  emptyText,
  className,
  ...rest
}: HeatmapProps) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const plot = usePlotPointer(() => (setTip(null), setActive(null)), tip !== null);
  const fmt = format ?? ((v: number) => formatNumber(v, locale));
  const flat = values.flat().filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const lo = min ?? Math.min(...flat);
  const hi = max ?? Math.max(...flat);

  // Row labels take at most 30 % of a narrow chart; cells never get thinner than a fingertip
  // can pick (MIN_CELL). When they would, the grid scrolls sideways inside its container.
  const rowChars = Math.max(1, ...rows.map((r) => r.length));
  const left = Math.min(120, Math.round(width * 0.3), Math.max(28, rowChars * 6.5 + 10));
  const labelChars = Math.max(3, Math.floor((left - 10) / 6.5));
  const top = 18;
  const cellW = Math.max(MIN_CELL, (width - left) / Math.max(1, columns.length));
  const svgW = Math.max(width, Math.ceil(left + cellW * columns.length));
  const height = top + rows.length * cellHeight;
  const every = Math.max(1, Math.ceil((Math.max(1, ...columns.map((c) => c.length)) * 6.5 + 6) / cellW));

  if (rows.length === 0 || columns.length === 0 || flat.length === 0) return <ChartEmpty height={Math.max(height, 120)}>{emptyText}</ChartEmpty>;

  return (
    <div {...rest} className={cx("oq-chart", "oq-chart--heatmap", className)} ref={ref}>
      <div className="oq-chart__plot" {...plot}>
        <div className="oq-heatmap__scroll">
          <svg className="oq-chart__svg" width={svgW} height={height} role="img" aria-label={label}>
          {columns.map((c, j) =>
            j % every === 0 ? (
              <text key={c} className="oq-chart__tick" x={left + j * cellW + cellW / 2} y={12} textAnchor="middle">
                {c}
              </text>
            ) : null,
          )}
          {rows.map((r, i) => (
            <g key={r}>
              <text className="oq-chart__tick" x={left - 8} y={top + i * cellHeight + cellHeight / 2} dy="0.32em" textAnchor="end">
                {clip(r, labelChars)}
                {r.length > labelChars && <title>{r}</title>}
              </text>
              {columns.map((c, j) => {
                const v = values[i]?.[j];
                const has = typeof v === "number" && Number.isFinite(v);
                const id = `${i}:${j}`;
                const show = () => {
                  setActive(id);
                  setTip({
                    x: left + j * cellW + cellW / 2,
                    y: top + i * cellHeight + cellHeight / 2,
                    title: `${r} · ${c}`,
                    rows: [{ key: id, label: label, color: has ? heatColor(heatStep(v, lo, hi, steps), steps) : "transparent", value: has ? fmt(v) : "no data" }],
                  });
                };
                return (
                  <rect
                    key={c}
                    className="oq-heatmap__cell"
                    data-empty={!has || undefined}
                    data-active={active === id || undefined}
                    x={left + j * cellW + 1}
                    y={top + i * cellHeight + 1}
                    width={Math.max(1, cellW - 2)}
                    height={cellHeight - 2}
                    rx={2}
                    style={has ? { fill: heatColor(heatStep(v, lo, hi, steps), steps) } : undefined}
                    onPointerDown={show}
                    onPointerEnter={show}
                  />
                );
              })}
            </g>
          ))}
        </svg>
        </div>
        <ChartTooltip tip={tip} width={width} />
      </div>
      <div className="oq-heatmap__scale" aria-hidden="true">
        <span>{formatCompact(lo, locale)}</span>
        {Array.from({ length: steps }, (_, s) => (
          <span key={s} className="oq-heatmap__step" style={{ background: heatColor(s, steps) }} />
        ))}
        <span>{formatCompact(hi, locale)}</span>
      </div>
      <ChartTable
        caption={label}
        columns={["", ...columns]}
        rows={rows.map((r, i) => [r, ...columns.map((_, j) => {
          const v = values[i]?.[j];
          return typeof v === "number" ? fmt(v) : "–";
        })])}
        mode={table}
      />
    </div>
  );
}
