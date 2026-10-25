import { type CSSProperties, forwardRef, type HTMLAttributes } from "react";
import { cx } from "./cx";

export type Gap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Multiples of the 4 px spacing unit. */
  gap?: Gap;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
}

function flexStyle({ align, justify }: Pick<StackProps, "align" | "justify">, style: CSSProperties | undefined): CSSProperties | undefined {
  if (align === undefined && justify === undefined) return style;
  return { ...(align !== undefined ? { alignItems: align } : {}), ...(justify !== undefined ? { justifyContent: justify } : {}), ...style };
}

/** A vertical flex column. */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack({ gap, align, justify, wrap, className, style, ...rest }, ref) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx("oq-stack", gap !== undefined && `oq-gap-${gap}`, wrap && "oq-wrap", className)}
      style={flexStyle({ align, justify }, style)}
    />
  );
});

/** A horizontal flex row, vertically centred by default. */
export const Row = forwardRef<HTMLDivElement, StackProps>(function Row({ gap, align, justify, wrap, className, style, ...rest }, ref) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx("oq-row", gap !== undefined && `oq-gap-${gap}`, wrap && "oq-wrap", className)}
      style={flexStyle({ align, justify }, style)}
    />
  );
});

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  /** Smallest column width; the grid fits as many columns as it can. Default 220px. */
  min?: number | string;
}

/** A responsive grid that fits as many columns of at least `min` width as the space allows. */
export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid({ gap, min, className, style, ...rest }, ref) {
  const minStyle = min !== undefined ? ({ "--min": typeof min === "number" ? `${min}px` : min } as CSSProperties) : undefined;
  return <div ref={ref} {...rest} className={cx("oq-grid", gap !== undefined && `oq-gap-${gap}`, className)} style={{ ...minStyle, ...style }} />;
});
