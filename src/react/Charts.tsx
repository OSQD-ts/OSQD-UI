import type { CSSProperties, HTMLAttributes, ReactNode, SVGProps } from "react";
import { type Color, colorClass, cx, type Size, sizeClass } from "./cx";

/* ---------- Sparkline ---------- */

export interface SparklineProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "min" | "max"> {
  data: number[];
  /** Fill under the line. */
  area?: boolean;
  color?: Color;
  /** CSS length or px. Default: the container's width. */
  width?: number | string;
  /** CSS length or px. Default 32px. */
  height?: number | string;
  /** Fix the vertical range (default: the data's own min and max). */
  min?: number;
  max?: number;
  /** Accessible description, e.g. "Requests, last 24 h, rising". */
  label?: string;
}

const W = 100;
const H = 32;

/** Points of a sparkline in a 100 × 32 box, with 1 unit of headroom so the stroke is never clipped. */
export function sparklinePoints(data: number[], min?: number, max?: number): Array<[number, number]> {
  if (data.length === 0) return [];
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const span = hi - lo || 1;
  const step = data.length > 1 ? W / (data.length - 1) : 0;
  return data.map((v, i) => [Number((i * step).toFixed(2)), Number((H - 1 - ((v - lo) / span) * (H - 2)).toFixed(2))]);
}

const len = (v: number | string | undefined) => (typeof v === "number" ? `${v}px` : v);

/** A tiny line or area chart for a trend inside a stat tile, table cell or list row. */
export function Sparkline({ data, area, color = "primary", width, height, min, max, label, className, style, ...rest }: SparklineProps) {
  const pts = sparklinePoints(data, min, max);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
      className={cx("oq-sparkline", colorClass(color), className)}
      style={{ ...(width !== undefined ? { "--w": len(width) } : {}), ...(height !== undefined ? { "--h": len(height) } : {}), ...style } as CSSProperties}
    >
      {pts.length > 1 && area && <path className="oq-sparkline__area" d={`${line} L${W},${H} L0,${H} Z`} />}
      {pts.length > 1 && <path className="oq-sparkline__line" d={line} />}
    </svg>
  );
}

/* ---------- Meter and gauge ---------- */

export interface MeterScale {
  value: number;
  min?: number;
  max?: number;
  /** Below `low` is the low region, above `high` the high region (as on <meter>). */
  low?: number;
  high?: number;
  /** Where the good value lies; decides which region is green. */
  optimum?: number;
}

/**
 * The intent a value earns on a scale, following <meter>: the region holding `optimum` is success,
 * the next one over warning, the far one danger. Without low/high there are no regions: primary.
 */
export function meterColor({ value, min = 0, max = 100, low, high, optimum }: MeterScale): Color {
  if (low === undefined && high === undefined) return "primary";
  const lo = low ?? min;
  const hi = high ?? max;
  const region = (v: number) => (v < lo ? 0 : v > hi ? 2 : 1);
  const best = region(optimum ?? (lo + hi) / 2);
  const d = Math.abs(region(value) - best);
  return d === 0 ? "success" : d === 1 ? "warning" : "danger";
}

const pct = (value: number, min: number, max: number) => Math.min(100, Math.max(0, ((value - min) / (max - min || 1)) * 100));

export interface MeterProps extends Omit<HTMLAttributes<HTMLDivElement>, "color">, MeterScale {
  label?: ReactNode;
  /** Shown beside the label; default `value` + unit. `false` hides it. */
  valueText?: ReactNode | false;
  unit?: string;
  /** Overrides the colour worked out from low/high/optimum. */
  color?: Color;
  size?: Size;
  /** Show min and max under the bar. */
  showScale?: boolean;
}

/** A labelled horizontal bar for a value in a known range, coloured by low/high/optimum thresholds like the native meter element. */
export function Meter({ value, min = 0, max = 100, low, high, optimum, label, valueText, unit = "", color, size, showScale, className, ...rest }: MeterProps) {
  const c = color ?? meterColor({ value, min, max, ...(low !== undefined ? { low } : {}), ...(high !== undefined ? { high } : {}), ...(optimum !== undefined ? { optimum } : {}) });
  const text = valueText === false ? null : (valueText ?? `${value}${unit && ` ${unit}`}`);
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={typeof text === "string" ? text : undefined}
      {...rest}
      className={cx("oq-meter", colorClass(c), sizeClass(size), className)}
    >
      {(label != null || text != null) && (
        <div className="oq-meter__head">
          <span className="oq-meter__label">{label}</span>
          {text != null && <span className="oq-meter__value">{text}</span>}
        </div>
      )}
      <div className="oq-meter__track">
        <div className="oq-meter__fill" style={{ "--value": `${pct(value, min, max)}%` } as CSSProperties} />
        {[low, high].map((t) => t !== undefined && t > min && t < max && <span key={t} className="oq-meter__mark" style={{ "--at": `${pct(t, min, max)}%` } as CSSProperties} />)}
      </div>
      {showScale && (
        <div className="oq-meter__scale">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

export interface GaugeProps extends Omit<HTMLAttributes<HTMLDivElement>, "color">, MeterScale {
  label?: ReactNode;
  unit?: string;
  color?: Color;
  /** Width in px. Default 140. */
  size?: number;
  /** What to print in the middle; default the value. */
  valueText?: ReactNode;
}

/** A semicircle meter: the same scale and colouring as Meter, for a single headline number. */
export function Gauge({ value, min = 0, max = 100, low, high, optimum, label, unit, color, size, valueText, className, style, ...rest }: GaugeProps) {
  const c = color ?? meterColor({ value, min, max, ...(low !== undefined ? { low } : {}), ...(high !== undefined ? { high } : {}), ...(optimum !== undefined ? { optimum } : {}) });
  const arc = "M10 50 A40 40 0 0 1 90 50";
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      {...rest}
      className={cx("oq-gauge", colorClass(c), className)}
      style={{ ...(size !== undefined ? { "--size": `${size}px` } : {}), ...style } as CSSProperties}
    >
      <svg viewBox="0 0 100 56" aria-hidden="true">
        <path className="oq-gauge__track" d={arc} strokeWidth={9} />
        <path className="oq-gauge__fill" d={arc} strokeWidth={9} pathLength={100} strokeDasharray="100 100" strokeDashoffset={100 - pct(value, min, max)} />
      </svg>
      <span className="oq-gauge__value">
        {valueText ?? value}
        {unit && <span className="oq-gauge__unit">{unit}</span>}
      </span>
      {label != null && <span className="oq-gauge__label">{label}</span>}
    </div>
  );
}
