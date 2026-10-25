import { type ButtonHTMLAttributes, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { type Color, colorClass, cx, type Size, sizeClass } from "./cx";

export type ButtonVariant = "solid" | "outline" | "soft" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: Color;
  variant?: ButtonVariant;
  size?: Size;
  /** Keeps the width and shows a spinner; the button is not clickable while loading. */
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export const buttonClass = (color: Color | undefined, variant: ButtonVariant, size: Size | undefined) =>
  cx("oq-btn", colorClass(color), variant !== "solid" && `oq-btn--${variant}`, sizeClass(size));

/** The main action control: four variants (solid, outline, soft, ghost), seven intents, three sizes and a loading state. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { color, variant = "solid", size, loading, fullWidth, startIcon, endIcon, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      aria-busy={loading || undefined}
      className={cx(buttonClass(color, variant, size), fullWidth && "oq-btn--block", className)}
    >
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "startIcon" | "endIcon" | "fullWidth"> {
  /** Required: an icon has no text, so this is the accessible name (and the tooltip). */
  label: string;
  /** Show `label` as a tooltip on hover. */
  tooltip?: boolean;
}

/** A square button holding only an icon; `label` is required and becomes its accessible name (and, optionally, a tooltip). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tooltip = false, variant = "ghost", color = "neutral", className, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      {...rest}
      variant={variant}
      color={color}
      aria-label={label}
      data-tip={tooltip ? label : undefined}
      className={cx("oq-btn--icon", className)}
    />
  );
});

/** Joins buttons into one segmented control with shared borders. */
export function ButtonGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div role="group" {...rest} className={cx("oq-btn-group", className)} />;
}
