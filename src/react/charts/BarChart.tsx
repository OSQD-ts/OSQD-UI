import { useState } from "react";
import { cx } from "../cx";
import {
  axisWidth,
  type ChartBaseProps,
  clip,
  ChartEmpty,
  ChartLegend,
  ChartTable,
  ChartTooltip,
  defaults,
  num,
  resolveSeries,
  type TooltipState,
  useChartWidth,
  useHiddenSeries,
  usePlotPointer,
} from "./frame";
import { bandScale, linearScale, niceTicks } from "./scale";

export interface BarChartProps<Row> extends ChartBaseProps<Row> {
  /** "vertical" (columns, default) or "horizontal" (bars — better for long category names). */
  orientation?: "vertical" | "horizontal";
  /** Stack the series instead of grouping them side by side. */
  stacked?: boolean;
}

const GAP = 2;
const RADIUS = 4;

/**
 * A bar from `from` to `to` along the value axis, rounded only at its data end (the end away
 * from the baseline), as a path. `vertical` bars run along y; horizontal ones along x.
 */
export function barPath(vertical: boolean, cross: number, thickness: number, from: number, to: number): string {
  const len = Math.abs(to - from);
  const r = Math.min(RADIUS, thickness / 2, len);
  const dir = to < from ? -1 : 1;
  if (vertical) {
    const x = cross;
    const w = thickness;
    return `M${x},${from} L${x},${to - dir * r} Q${x},${to} ${x + r},${to} L${x + w - r},${to} Q${x + w},${to} ${x + w},${to - dir * r} L${x + w},${from} Z`;
  }
  const y = cross;
  const h = thickness;
  return `M${from},${y} L${to - dir * r},${y} Q${to},${y} ${to},${y + r} L${to},${y + h - r} Q${to},${y + h} ${to - dir * r},${y + h} L${from},${y + h} Z`;
}

/** Bar chart in plain SVG: vertical or horizontal, grouped or stacked, with axes, legend, tooltips and an accessible data table. */
export function BarChart<Row>({
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
  orientation = "vertical",
  stacked = false,
  className,
  ...rest
}: BarChartProps<Row>) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const [hidden, toggle] = useHiddenSeries();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const plot = usePlotPointer(() => (setTip(null), setActive(null)), tip !== null);
  const { fmt, tick } = defaults(locale, format, tickFormat);
  const all = resolveSeries(series, hidden);
  const shown = all.filter((s) => !s.hidden);
  const vertical = orientation === "vertical";
  const cats = data.map((r) => String((r as Record<string, unknown>)[x] ?? ""));

  // Value domain: stacks sum per category; groups take each value. Zero is always included.
  let lo = 0;
  let hi = 0;
  for (const row of data) {
    if (stacked) {
      let pos = 0;
      let neg = 0;
      for (const s of shown) {
        const v = num(row, s.key);
        if (v >= 0) pos += v;
        else neg += v;
      }
      hi = Math.max(hi, pos);
      lo = Math.min(lo, neg);
    } else {
      for (const s of shown) {
        const v = num(row, s.key);
        hi = Math.max(hi, v);
        lo = Math.min(lo, v);
      }
    }
  }
  const t = niceTicks(lo, hi, vertical ? Math.max(3, Math.round(height / 50)) : Math.max(3, Math.round(width / 110)));
  const tickLabels = t.ticks.map(tick);

  const m = vertical
    ? { top: 10, right: 12, bottom: 26, left: axisWidth(tickLabels) }
    : { top: 6, right: 16, bottom: 24, left: Math.min(160, Math.round(width * 0.4), axisWidth(cats)) };
  // Horizontal category labels share the left margin; on a narrow chart they are shortened to fit.
  const catChars = Math.max(3, Math.floor((m.left - 10) / 6.5));
  const plotW = Math.max(10, width - m.left - m.right);
  const plotH = Math.max(10, height - m.top - m.bottom);
  const value = vertical ? linearScale([t.min, t.max], [m.top + plotH, m.top]) : linearScale([t.min, t.max], [m.left, m.left + plotW]);
  const band = vertical ? bandScale(data.length, [m.left, m.left + plotW], 0.28) : bandScale(data.length, [m.top, m.top + plotH], 0.28);
  const base = value(0);

  // Thin out category labels that would collide.
  const longest = Math.max(1, ...cats.map((c) => c.length)) * 6.5 + 8;
  const every = vertical ? Math.max(1, Math.ceil(longest / Math.max(1, band.step))) : Math.max(1, Math.ceil(16 / Math.max(1, band.step)));

  const showLegend = legend ?? series.length > 1;
  const empty = data.length === 0 || series.length === 0;

  const tooltipFor = (i: number): TooltipState => {
    const row = data[i];
    const along = band.start(i) + band.width / 2;
    const vals = shown.map((s) => num(row, s.key));
    const end = stacked ? vals.filter((v) => v > 0).reduce((a, b) => a + b, 0) : Math.max(0, ...vals);
    // Vertical: anchor on the band's outer edge (the side the tooltip opens towards) so it never covers its own bars.
    const flip = along > width / 2;
    const edge = flip ? band.start(i) - (band.step - band.width) / 2 : band.start(i) + band.width + (band.step - band.width) / 2;
    return {
      ...(vertical ? { flip } : {}),
      x: vertical ? edge : Math.min(width - 8, value(end)),
      y: vertical ? m.top + 16 : along,
      title: cats[i],
      rows: shown.map((s) => ({ key: s.key, label: s.label, color: s.fill, value: fmt(num(row, s.key)) })),
    };
  };

  const show = (i: number) => (setActive(i), setTip(tooltipFor(i)));

  return (
    <div {...rest} className={cx("oq-chart", "oq-chart--bar", className)} ref={ref}>
      {empty ? (
        <ChartEmpty height={height}>{emptyText}</ChartEmpty>
      ) : (
        <div className="oq-chart__plot" {...plot}>
          <svg className="oq-chart__svg" width={width} height={height} role="img" aria-label={label}>
            <g className="oq-chart__grid" aria-hidden="true">
              {t.ticks.map((v, i) =>
                vertical ? (
                  <g key={v}>
                    <line x1={m.left} x2={m.left + plotW} y1={value(v)} y2={value(v)} data-zero={v === 0 || undefined} />
                    <text className="oq-chart__tick" x={m.left - 8} y={value(v)} dy="0.32em" textAnchor="end">
                      {tickLabels[i]}
                    </text>
                  </g>
                ) : (
                  <g key={v}>
                    <line y1={m.top} y2={m.top + plotH} x1={value(v)} x2={value(v)} data-zero={v === 0 || undefined} />
                    <text className="oq-chart__tick" y={m.top + plotH + 16} x={value(v)} textAnchor="middle">
                      {tickLabels[i]}
                    </text>
                  </g>
                ),
              )}
            </g>
            {data.map((row, i) => {
              const start = band.start(i);
              const groupW = stacked ? band.width : (band.width - GAP * (shown.length - 1)) / Math.max(1, shown.length);
              let pos = 0;
              let neg = 0;
              return (
                <g key={i} className="oq-chart__band" data-active={active === i || undefined}>
                  {vertical ? (
                    <rect className="oq-chart__hover" x={start - (band.step - band.width) / 2} y={m.top} width={band.step} height={plotH} />
                  ) : (
                    <rect className="oq-chart__hover" y={start - (band.step - band.width) / 2} x={m.left} height={band.step} width={plotW} />
                  )}
                  {shown.map((s, j) => {
                    const v = num(row, s.key);
                    let from: number;
                    let to: number;
                    let cross: number;
                    if (stacked) {
                      const prev = v >= 0 ? pos : neg;
                      const next = prev + v;
                      if (v >= 0) pos = next;
                      else neg = next;
                      from = value(prev);
                      to = value(next);
                      // A 2px surface gap between stacked segments, taken from the segment's start.
                      if (prev !== 0) from += (to > from ? 1 : -1) * GAP;
                      cross = start;
                    } else {
                      from = base;
                      to = value(v);
                      cross = start + j * (groupW + GAP);
                    }
                    if (v === 0 || Math.abs(to - from) < 0.5) return null;
                    return <path key={s.key} className="oq-chart__bar" d={barPath(vertical, cross, groupW, from, to)} style={{ fill: s.fill }} />;
                  })}
                  {i % every === 0 &&
                    (vertical ? (
                      <text className="oq-chart__tick" x={start + band.width / 2} y={m.top + plotH + 17} textAnchor="middle">
                        {cats[i]}
                      </text>
                    ) : (
                      <text className="oq-chart__tick" x={m.left - 8} y={start + band.width / 2} dy="0.32em" textAnchor="end">
                        {clip(cats[i] ?? "", catChars)}
                        {(cats[i] ?? "").length > catChars && <title>{cats[i]}</title>}
                      </text>
                    ))}
                  {/* Hit target: the whole band, bigger than the bars, for an easy hover. */}
                  {vertical ? (
                    <rect
                      className="oq-chart__hit"
                      x={start - (band.step - band.width) / 2}
                      y={m.top}
                      width={band.step}
                      height={plotH}
                      onPointerEnter={() => show(i)}
                      onPointerDown={() => show(i)}
                    />
                  ) : (
                    <rect
                      className="oq-chart__hit"
                      y={start - (band.step - band.width) / 2}
                      x={m.left}
                      height={band.step}
                      width={plotW}
                      onPointerEnter={() => show(i)}
                      onPointerDown={() => show(i)}
                    />
                  )}
                </g>
              );
            })}
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
