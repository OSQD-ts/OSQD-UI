import {
  createContext,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Color, colorClass, cx, type Size, sizeClass } from "./cx";
import { CloseIcon, ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "./icons";

const defaultIcon: Partial<Record<Color, ReactNode>> = {
  primary: <InfoIcon />,
  info: <InfoIcon />,
  secondary: <InfoIcon />,
  neutral: <InfoIcon />,
  success: <SuccessIcon />,
  warning: <WarningIcon />,
  danger: <ErrorIcon />,
};

/* ---------- Alert ---------- */

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  color?: Color;
  variant?: "soft" | "solid";
  title?: ReactNode;
  /** `false` hides the icon; omitted picks one for the colour. */
  icon?: ReactNode | false;
  actions?: ReactNode;
  onClose?: () => void;
}

/** An inline message with an intent colour, default icon, optional title, actions and close button. */
export function Alert({ color = "info", variant = "soft", title, icon, actions, onClose, className, children, ...rest }: AlertProps) {
  const shownIcon = icon === false ? null : (icon ?? defaultIcon[color]);
  return (
    <div
      role={color === "danger" || color === "warning" ? "alert" : "status"}
      {...rest}
      className={cx("oq-alert", colorClass(color), variant === "solid" && "oq-alert--solid", className)}
    >
      {shownIcon != null && <div className="oq-alert__icon">{shownIcon}</div>}
      <div className="oq-alert__content">
        {title != null && <div className="oq-alert__title">{title}</div>}
        {children}
      </div>
      {(actions != null || onClose) && (
        <div className="oq-alert__actions">
          {actions}
          {onClose && (
            <button type="button" className="oq-btn oq-btn--ghost oq-btn--icon oq-sm oq-neutral" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Progress, spinner, skeleton ---------- */

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number;
  color?: Color;
  size?: Size;
}

/** A horizontal progress bar for a known value, or indeterminate while the amount is unknown. */
export function Progress({ value, color, size, className, style, ...rest }: ProgressProps) {
  const pct = value === undefined ? undefined : Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      {...rest}
      className={cx("oq-progress", pct === undefined && "oq-progress--indeterminate", colorClass(color), sizeClass(size), className)}
      style={{ ...(pct !== undefined ? ({ "--value": `${pct}%` } as CSSProperties) : {}), ...style }}
    >
      <div className="oq-progress__bar" />
    </div>
  );
}

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color;
  size?: Size;
  label?: string;
}

/** A small rotating indicator for work in progress. */
export function Spinner({ color, size, label = "Loading", className, ...rest }: SpinnerProps) {
  return <span role="status" aria-label={label} {...rest} className={cx("oq-spinner", colorClass(color), sizeClass(size), className)} />;
}

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
}

/** A shimmering placeholder block shown while content loads. */
export function Skeleton({ width, height, circle, className, style, ...rest }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      {...rest}
      className={cx("oq-skeleton", className)}
      style={{ width, height, ...(circle ? { borderRadius: "50%" } : {}), ...style }}
    />
  );
}

/* ---------- Tooltip ---------- */

export interface TooltipProps {
  title: string;
  placement?: "top" | "bottom" | "right";
  /** One element; it receives `data-tip`. Text is wrapped in a span. */
  children: ReactNode;
}

/** Wraps one element and shows a short text label on hover and keyboard focus. */
export function Tooltip({ title, placement = "top", children }: TooltipProps) {
  const props = { "data-tip": title, ...(placement !== "top" ? { "data-tip-pos": placement } : {}) };
  if (isValidElement(children)) return cloneElement(children as ReactElement<Record<string, unknown>>, props);
  return <span {...props}>{children}</span>;
}

/* ---------- Toasts ---------- */

export interface ToastOptions {
  title?: ReactNode;
  message?: ReactNode;
  color?: Color;
  /** ms before it closes itself; 0 keeps it until dismissed. Default 5000. */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast: wrap the tree in <ToastProvider>");
  return api;
}

/** Hosts toast notifications for its subtree; `useToast()` inside it shows and dismisses them. */
export function ToastProvider({ children, max = 5 }: { children?: ReactNode; max?: number }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = next.current++;
      setToasts((list) => [...list, { ...options, id }].slice(-max));
      const duration = options.duration ?? 5000;
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss, max],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
    };
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="oq-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx("oq-toast", colorClass(t.color ?? "info"))} role="status">
            <div className="oq-alert__icon oq-text-c">{defaultIcon[t.color ?? "info"]}</div>
            <div className="oq-toast__body">
              {t.title != null && <div className="oq-toast__title">{t.title}</div>}
              {t.message != null && <div className="oq-toast__message">{t.message}</div>}
            </div>
            <button type="button" className="oq-btn oq-btn--ghost oq-btn--icon oq-sm oq-neutral" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
