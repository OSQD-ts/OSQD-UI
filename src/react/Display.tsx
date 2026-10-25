import { Children, type HTMLAttributes, type ImgHTMLAttributes, type ReactNode } from "react";
import { type Color, colorClass, cx, type Size, sizeClass } from "./cx";

/* ---------- Chip ---------- */

export interface ChipProps extends HTMLAttributes<HTMLElement> {
  color?: Color;
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  square?: boolean;
  /** Shows a × button. */
  onDelete?: () => void;
  /** A toggle chip: renders as a button with aria-pressed. */
  selected?: boolean;
  /** Renders as a button (implied by `selected` or `onClick`). */
  clickable?: boolean;
}

/** A compact label for a status, tag or filter; can be removable (`onDelete`) or toggleable (`selected`). */
export function Chip({ color = "neutral", variant = "soft", size, square, onDelete, selected, clickable, className, children, ...rest }: ChipProps) {
  const cls = cx("oq-chip", colorClass(color), variant !== "soft" && `oq-chip--${variant}`, sizeClass(size), square && "oq-chip--square", className);
  const remove = onDelete && (
    <button
      type="button"
      className="oq-chip__remove"
      aria-label="Remove"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      ×
    </button>
  );
  if (selected !== undefined || clickable || rest.onClick) {
    return (
      <button type="button" aria-pressed={selected} {...rest} className={cls}>
        {children}
        {remove}
      </button>
    );
  }
  return (
    <span {...rest} className={cls}>
      {children}
      {remove}
    </span>
  );
}

/* ---------- Badge, dot, status ---------- */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  count?: number | string;
  /** Counts above this show as `max+`. */
  max?: number;
  color?: Color;
  /** Hide the badge when count is 0. */
  hideZero?: boolean;
  /** With children, the badge is pinned to their top-right corner. */
  children?: ReactNode;
}

/** A small count bubble, on its own or anchored to the corner of its children. */
export function Badge({ count, max = 99, color = "danger", hideZero = true, className, children, ...rest }: BadgeProps) {
  const shown = typeof count === "number" && count > max ? `${max}+` : count;
  const badge =
    hideZero && (count === 0 || count == null) ? null : (
      <span {...rest} className={cx("oq-badge", colorClass(color), className)}>
        {shown}
      </span>
    );
  if (children == null) return badge;
  return (
    <span className="oq-badge-anchor">
      {children}
      {badge}
    </span>
  );
}

export interface DotProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color;
  pulse?: boolean;
}

/** A small coloured circle for status, optionally pulsing. */
export function Dot({ color = "success", pulse, className, ...rest }: DotProps) {
  return <span aria-hidden="true" {...rest} className={cx("oq-dot", colorClass(color), pulse && "oq-dot--pulse", className)} />;
}

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color;
  pulse?: boolean;
  label: ReactNode;
}

/** A dot followed by its label — "Healthy", "Degraded". */
export function StatusDot({ color = "success", pulse, label, className, ...rest }: StatusDotProps) {
  return (
    <span {...rest} className={cx("oq-status", className)}>
      <Dot color={color} {...(pulse !== undefined ? { pulse } : {})} />
      {label}
    </span>
  );
}

/* ---------- Avatar ---------- */

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  imgProps?: ImgHTMLAttributes<HTMLImageElement>;
  size?: Size;
  color?: Color;
  square?: boolean;
}

/** "Ada Lovelace" → "AL"; one word → its first two letters. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return (words[0] as string).slice(0, 2).toUpperCase();
  return `${(words[0] as string)[0]}${(words[words.length - 1] as string)[0]}`.toUpperCase();
}

/** A person or service shown as a picture or as initials taken from `name`. */
export function Avatar({ name, src, imgProps, size, color = "primary", square, className, children, ...rest }: AvatarProps) {
  return (
    <span title={name} {...rest} className={cx("oq-avatar", colorClass(color), sizeClass(size), square && "oq-avatar--square", className)}>
      {src ? <img src={src} alt={name ?? ""} {...imgProps} /> : (children ?? (name ? initials(name) : null))}
    </span>
  );
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLSpanElement> {
  /** Show at most this many, then a "+n" avatar. */
  max?: number;
}

/** Overlapping avatars with a "+n" avatar for the ones over `max`. */
export function AvatarGroup({ max, className, children, ...rest }: AvatarGroupProps) {
  const all = Children.toArray(children);
  const shown = max !== undefined && all.length > max ? all.slice(0, max) : all;
  const extra = all.length - shown.length;
  return (
    <span {...rest} className={cx("oq-avatar-group", className)}>
      {shown}
      {extra > 0 && <span className="oq-avatar oq-neutral">+{extra}</span>}
    </span>
  );
}

/* ---------- Divider ---------- */

export interface DividerProps extends HTMLAttributes<HTMLElement> {
  label?: ReactNode;
  vertical?: boolean;
}

/** A horizontal or vertical rule, optionally with a label in the middle. */
export function Divider({ label, vertical, className, ...rest }: DividerProps) {
  if (label != null) {
    return (
      <div role="separator" {...rest} className={cx("oq-divider oq-divider--label", className)}>
        {label}
      </div>
    );
  }
  if (vertical) return <span role="separator" aria-orientation="vertical" {...rest} className={cx("oq-divider oq-divider--vertical", className)} />;
  return <hr {...rest} className={cx("oq-divider", className)} />;
}

/* ---------- Text bits ---------- */

/** A keyboard key, for shortcuts in text and menus. */
export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <kbd {...rest} className={cx("oq-kbd", className)} />;
}

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /** A `<pre>` block instead of inline code. */
  block?: boolean;
}

/** Inline code inside running text. */
export function Code({ block, className, children, ...rest }: CodeProps) {
  if (block) {
    return (
      <pre {...rest} className={cx("oq-pre", className)}>
        <code>{children}</code>
      </pre>
    );
  }
  return (
    <code {...rest} className={cx("oq-code", className)}>
      {children}
    </code>
  );
}

export type TypographyVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "body" | "small" | "tiny" | "overline";

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  /** "muted" / "faint" are text greys; an intent colours the text. */
  color?: "muted" | "faint" | Color;
  mono?: boolean;
  strong?: boolean;
  truncate?: boolean;
  /** The element to render; defaults to h1–h5 for headings, `p` for body, `span` otherwise. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label" | "strong";
}

const defaultTag: Record<TypographyVariant, NonNullable<TypographyProps["as"]>> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  body: "p",
  small: "span",
  tiny: "span",
  overline: "div",
};

/** Text in one of the kit's styles: headings h1–h5, body, small, tiny, overline, with muted/faint/mono options. */
export function Typography({ variant = "body", color, mono, strong, truncate, as, className, ...rest }: TypographyProps) {
  const Tag = as ?? defaultTag[variant];
  const colorCls = color === "muted" || color === "faint" ? `oq-${color}` : color ? cx(colorClass(color), "oq-text-c") : undefined;
  return (
    <Tag
      {...rest}
      className={cx(`oq-${variant}`, colorCls, mono && "oq-mono", strong && "oq-strong", truncate && "oq-truncate", className)}
    />
  );
}
