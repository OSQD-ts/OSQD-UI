import { type HTMLAttributes, type ReactNode, useState } from "react";
import { cx } from "../cx";
import { ChartEmpty, ChartLegend, ChartTable, ChartTooltip, type TooltipState, useHiddenSeries, useNarrowViewport, usePlotPointer } from "./frame";
import { formatNumber, type SeriesColor, seriesColor } from "./scale";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color?: SeriesColor;
}

export interface DonutChartProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  data: DonutSlice[];
  label: string;
  /** Outer diameter in px. Default 200. */
  size?: number;
  /** Ring thickness in px. Default 28. */
  thickness?: number;
  /** Big number in the hole. Default: the total of the visible slices. */
  centerValue?: ReactNode;
  /** Small caption under it, e.g. "requests". */
  centerLabel?: ReactNode;
  legend?: boolean;
  table?: "hidden" | "toggle";
  format?: (value: number) => string;
  locale?: string;
  emptyText?: ReactNode;
}

/** An SVG arc path for a ring segment between two angles (radians, 0 = 12 o'clock, clockwise). */
export function arcPath(cx0: number, cy0: number, r: number, inner: number, a0: number, a1: number): string {
  // A full circle cannot be one arc; stop just short of it.
  const end = a1 - a0 >= Math.PI * 2 ? a0 + Math.PI * 2 - 1e-4 : a1;
  const pt = (rad: number, a: number) => [cx0 + rad * Math.sin(a), cy0 - rad * Math.cos(a)].map((v) => v.toFixed(2)).join(",");
  const large = end - a0 > Math.PI ? 1 : 0;
  return `M${pt(r, a0)} A${r},${r} 0 ${large} 1 ${pt(r, end)} L${pt(inner, end)} A${inner},${inner} 0 ${large} 0 ${pt(inner, a0)} Z`;
}

/** Part-to-whole for a handful of categories (five or fewer reads best); fold the rest into "Other". */
export function DonutChart({
  data,
  label,
  size = 200,
  thickness = 28,
  centerValue,
  centerLabel,
  legend = true,
  table = "hidden",
  format,
  locale,
  emptyText,
  className,
  ...rest
}: DonutChartProps) {
  const [hidden, toggle] = useHiddenSeries();
  const [active, setActive] = useState<string | null>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);
  const plot = usePlotPointer(() => (setActive(null), setTip(null)), tip !== null);
  const narrow = useNarrowViewport();
  const fmt = format ?? ((v: number) => formatNumber(v, locale));
  const slices = data.map((d, i) => ({ ...d, fill: seriesColor(d.color, i), hidden: hidden.has(d.key) }));
  const shown = slices.filter((s) => !s.hidden && s.value > 0);
  const total = shown.reduce((a, s) => a + s.value, 0);
  const r = size / 2;
  const inner = r - thickness;
  const pct = (v: number) => (total ? `${((v / total) * 100).toFixed(v / total < 0.1 ? 1 : 0)} %` : "–");

  let angle = 0;
  const arcs = shown.map((s) => {
    const a0 = angle;
    angle += total ? (s.value / total) * Math.PI * 2 : 0;
    return { ...s, a0, a1: angle };
  });

  const show = (s: (typeof arcs)[number]) => {
    setActive(s.key);
    const mid = (s.a0 + s.a1) / 2;
    setTip({
      x: r + (r - thickness / 2) * Math.sin(mid),
      y: r - (r - thickness / 2) * Math.cos(mid),
      title: s.label,
      rows: [{ key: s.key, label: pct(s.value), color: s.fill, value: fmt(s.value) }],
    });
  };

  if (data.length === 0) return <ChartEmpty height={size}>{emptyText}</ChartEmpty>;

  return (
    <div {...rest} className={cx("oq-chart", "oq-chart--donut", className)}>
      <div className="oq-chart__plot oq-donut" style={{ width: size, maxWidth: "100%", aspectRatio: "1" }} {...plot}>
        <svg className="oq-chart__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
          <circle className="oq-donut__track" cx={r} cy={r} r={r - thickness / 2} style={{ strokeWidth: thickness }} />
          {arcs.map((s) => (
            <path
              key={s.key}
              className="oq-donut__slice"
              d={arcPath(r, r, r, inner, s.a0, s.a1)}
              style={{ fill: s.fill }}
              data-dim={(active && active !== s.key) || undefined}
              onPointerEnter={() => show(s)}
              onPointerDown={() => show(s)}
            />
          ))}
        </svg>
        <div className="oq-donut__center" aria-hidden="true">
          <div className="oq-donut__value">{centerValue ?? fmt(total)}</div>
          {centerLabel && <div className="oq-donut__label">{centerLabel}</div>}
        </div>
        <ChartTooltip tip={tip} width={size} pinned={narrow} />
      </div>
      {legend && (
        <ChartLegend
          items={slices.map((s) => ({ key: s.key, label: s.label, color: s.fill, value: s.hidden ? "" : pct(s.value) }))}
          hidden={hidden}
          onToggle={toggle}
        />
      )}
      <ChartTable caption={label} columns={["Category", "Value", "Share"]} rows={slices.map((s) => [s.label, fmt(s.value), pct(s.value)])} mode={table} />
    </div>
  );
}
