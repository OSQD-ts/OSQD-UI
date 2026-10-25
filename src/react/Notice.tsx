import type { HTMLAttributes, ReactNode } from "react";
import { type Color, colorClass, cx } from "./cx";
import { CloseIcon, ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "./icons";

const iconFor = (color: Color): ReactNode =>
  color === "success" ? <SuccessIcon /> : color === "warning" ? <WarningIcon /> : color === "danger" ? <ErrorIcon /> : <InfoIcon />;

/* ---------- Banner ---------- */

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  color?: Color;
  /** Filled with the intent colour instead of a tint. */
  solid?: boolean;
  /** Replaces the default icon; `false` hides it. */
  icon?: ReactNode | false;
  actions?: ReactNode;
  /** Shows a dismiss button. */
  onClose?: () => void;
}

/** A full-width strip at the top of a page or panel: maintenance, trial, read-only mode. */
export function Banner({ color = "info", solid, icon, actions, onClose, className, children, ...rest }: BannerProps) {
  return (
    <div
      role={color === "danger" || color === "warning" ? "alert" : "status"}
      {...rest}
      className={cx("oq-banner", solid && "oq-banner--solid", colorClass(color), className)}
    >
      {icon === false ? null : (icon ?? iconFor(color))}
      <div className="oq-banner__content">{children}</div>
      {(actions != null || onClose) && (
        <div className="oq-banner__actions">
          {actions}
          {onClose && (
            <button type="button" className={cx("oq-btn oq-btn--ghost oq-btn--icon oq-sm", !solid && "oq-neutral")} aria-label="Dismiss" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Callout ---------- */

export type CalloutKind = "note" | "tip" | "important" | "caution";

const calloutColor: Record<CalloutKind, Color> = { note: "primary", tip: "success", important: "secondary", caution: "warning" };

const BulbIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
  </svg>
);
const MarkIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16v12H8l-4 4zM12 7v4M12 13.5h.01" />
  </svg>
);

const calloutIcon: Record<CalloutKind, () => ReactNode> = {
  note: () => <InfoIcon />,
  tip: () => <BulbIcon />,
  important: () => <MarkIcon />,
  caution: () => <WarningIcon />,
};

export interface CalloutProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  kind?: CalloutKind;
  /** Default: the kind, e.g. "Note". `false` hides it. */
  title?: ReactNode | false;
  /** Overrides the colour that comes with the kind. */
  color?: Color;
}

/** An inline aside inside text: a note, a tip, something important, a caution. */
export function Callout({ kind = "note", title, color, className, children, ...rest }: CalloutProps) {
  return (
    <aside {...rest} className={cx("oq-callout", colorClass(color ?? calloutColor[kind]), className)}>
      {calloutIcon[kind]()}
      <div className="oq-callout__body">
        {title !== false && <div className="oq-callout__title">{title ?? kind}</div>}
        <div>{children}</div>
      </div>
    </aside>
  );
}
