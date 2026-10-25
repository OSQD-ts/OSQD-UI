import { type KeyboardEvent, type PointerEvent, useState } from "react";
import { cx } from "../cx";
import {
  axisWidth,
  type ChartBaseProps,
  ChartEmpty,
  ChartLegend,
  ChartTable,
  ChartTooltip,
  defaults,
  num,
  resolveSeries,
  useChartWidth,
  useHiddenSeries,
  usePlotPointer,
} from "./frame";
import { linearScale, niceTicks } from "./scale";

export interface LineChartProps<Row> extends ChartBaseProps<Row> {
  /** Draw a marker on every point (default: only when there are 24 points or fewer). */
  points?: boolean;
  /** Start the value axis at zero even when the data does not reach it. Default true. */
  zero?: boolean;
}

export interface AreaChartProps<Row> extends LineChartProps<Row> {
  /** Stack the series so the top edge is their total. */
  stacked?: boolean;
}

type Mode = "line" | "area";

function XYChart<Row>({
  mode,
  data,
  x,
  series,
  label,
  height = 240,
  legend,
  table = "hidden",
  format,
  tickFormat,
  locale,
  emptyText,
  points,
  zero = true,
  stacked = false,
  className,
  ...rest
}: AreaChartProps<Row> & { mode: Mode }) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const [hidden, toggle] = useHiddenSeries();
  const [active, setActive] = useState<number | null>(null);
  const plot = usePlotPointer(() => setActive(null), active !== null);
  const { fmt, tick } = defaults(locale, format, tickFormat);
  const all = resolveSeries(series, hidden);
  const shown = all.filter((s) => !s.hidden);
  const cats = data.map((r) => String((r as Record<string, unknown>)[x] ?? ""));
  const n = data.length;
  const stack = mode === "area" && stacked;

  // Cumulative tops per series for stacked areas; plain values otherwise.
  const tops: number[][] = shown.map(() => new Array<number>(n).fill(0));
  const bottoms: number[][] = shown.map(() => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    let acc = 0;
    shown.forEach((s, j) => {
      const v = num(data[i], s.key);
      (bottoms[j] as number[])[i] = stack ? acc : 0;
      acc = stack ? acc + v : v;
      (tops[j] as number[])[i] = acc;
    });
  }
  const flat = tops.flat();
  const lo = Math.min(zero || mode === "area" ? 0 : Number.POSITIVE_INFINITY, ...flat);
  const hi = Math.max(zero ? 0 : Number.NEGATIVE_INFINITY, ...flat);
  const t = niceTicks(Number.isFinite(lo) ? lo : 0, Number.isFinite(hi) ? hi : 1, Math.max(3, Math.round(height / 50)));
  const tickLabels = t.ticks.map(tick);
  const m = { top: 10, right: 14, bottom: 26, left: axisWidth(tickLabels) };
  const plotW = Math.max(10, width - m.left - m.right);
  const plotH = Math.max(10, height - m.top - m.bottom);
  const xs = (i: number) => m.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const ys = linearScale([t.min, t.max], [m.top + plotH, m.top]);

  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const areaPath = (top: number[], bottom: number[]) =>
    `${path(top)} ${bottom
      .map((v, i) => [i, v] as const)
      .reverse()
      .map(([i, v]) => `L${xs(i).toFixed(1)},${ys(v).toFixed(1)}`)
      .join(" ")} Z`;

  const longest = Math.max(1, ...cats.map((c) => c.length)) * 6.5 + 10;
  const every = Math.max(1, Math.ceil(longest / Math.max(1, n > 1 ? plotW / (n - 1) : plotW)));
  const markers = points ?? n <= 24;
  const showLegend = legend ?? series.length > 1;
  const empty = n === 0 || series.length === 0;

  const indexAt = (clientX: number, el: Element) => {
    const box = el.getBoundingClientRect();
    const px = clientX - box.left;
    if (n <= 1) return 0;
    return Math.max(0, Math.min(n - 1, Math.round(((px - m.left) / plotW) * (n - 1))));
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => setActive(indexAt(e.clientX, e.currentTarget));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? (d > 0 ? -1 : n)) + d)));
    } else if (e.key === "Escape") setActive(null);
  };

  const tip =
    active === null
      ? null
      : {
          x: xs(active),
          y: m.top + plotH / 2,
          title: cats[active],
          rows: shown.map((s) => ({ key: s.key, label: s.label, color: s.fill, value: fmt(num(data[active], s.key)) })),
        };

  return (
    <div {...rest} className={cx("oq-chart", `oq-chart--${mode}`, className)} ref={ref}>
      {empty ? (
        <ChartEmpty height={height}>{emptyText}</ChartEmpty>
      ) : (
        <div className="oq-chart__plot" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)} {...plot}>
          <svg className="oq-chart__svg" width={width} height={height} role="img" aria-label={label} onPointerMove={onMove} onPointerDown={onMove}>
            <g className="oq-chart__grid" aria-hidden="true">
              {t.ticks.map((v, i) => (
                <g key={v}>
                  <line x1={m.left} x2={m.left + plotW} y1={ys(v)} y2={ys(v)} data-zero={v === 0 || undefined} />
                  <text className="oq-chart__tick" x={m.left - 8} y={ys(v)} dy="0.32em" textAnchor="end">
                    {tickLabels[i]}
                  </text>
                </g>
              ))}
              {cats.map((c, i) =>
                i % every === 0 ? (
                  <text key={i} className="oq-chart__tick" x={xs(i)} y={m.top + plotH + 17} textAnchor="middle">
                    {c}
                  </text>
                ) : null,
              )}
            </g>
            {mode === "area" &&
              shown.map((s, j) => (
                <path
                  key={`a-${s.key}`}
                  className={cx("oq-chart__area", stack && "oq-chart__area--stacked")}
                  d={areaPath(tops[j] as number[], bottoms[j] as number[])}
                  style={{ fill: s.fill }}
                />
              ))}
            {shown.map((s, j) => (
              <path key={`l-${s.key}`} className="oq-chart__line" d={path(tops[j] as number[])} style={{ stroke: s.fill }} />
            ))}
            {markers &&
              shown.map((s, j) =>
                (tops[j] as number[]).map((v, i) => (
                  <circle key={`p-${s.key}-${i}`} className="oq-chart__point" cx={xs(i)} cy={ys(v)} r={2.5} style={{ fill: s.fill }} />
                )),
              )}
            {active !== null && (
              <g className="oq-chart__focus" aria-hidden="true">
                <line className="oq-chart__crosshair" x1={xs(active)} x2={xs(active)} y1={m.top} y2={m.top + plotH} />
                {shown.map((s, j) => (
                  <circle key={s.key} className="oq-chart__dot" cx={xs(active)} cy={ys((tops[j] as number[])[active] ?? 0)} r={4.5} style={{ fill: s.fill }} />
                ))}
              </g>
            )}
          </svg>
          <ChartTooltip tip={tip} width={width} />
        </div>
      )}
      {showLegend && !empty && <ChartLegend items={all.map((s) => ({ key: s.key, label: s.label, color: s.fill }))} hidden={hidden} onToggle={toggle} />}
      {!empty && (
        <ChartTable
          caption={label}
          columns={[x, ...series.map((s) => s.label)]}
          rows={data.map((r, i) => [cats[i] ?? "", ...series.map((s) => fmt(num(r, s.key)))])}
          mode={table}
        />
      )}
    </div>
  );
}

/** Change over time: one 2px line per series, crosshair and tooltip on hover, arrow keys when focused. */
export function LineChart<Row>(props: LineChartProps<Row>) {
  return <XYChart {...props} mode="line" />;
}

/** A line chart with the area under each line filled; `stacked` sums the series. */
export function AreaChart<Row>(props: AreaChartProps<Row>) {
  return <XYChart {...props} mode="area" />;
}
