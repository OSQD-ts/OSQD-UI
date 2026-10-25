import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type Key,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "./Button";
import { cx } from "./cx";
import { Icon } from "./Icon";

/* ---------- hueIndex ---------- */

/**
 * A stable hue slot (0–11) for a string, for `.oq-hue-N` tags: the same detector id always gets
 * the same colour, on every page and in every session. FNV-1a, so it is cheap and well spread.
 */
export function hueIndex(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 12;
}

/* ---------- SkipLink ---------- */

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The id of the main content, without `#`. */
  target?: string;
}

/** "Skip to content": hidden until focused, the first thing a keyboard user reaches. */
export function SkipLink({ target = "main", children = "Skip to content", className, ...rest }: SkipLinkProps) {
  return (
    <a href={`#${target}`} {...rest} className={cx("oq-skip-link", className)}>
      {children}
    </a>
  );
}

/* ---------- ConfirmButton ---------- */

export interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Called on the second click. */
  onConfirm: () => void;
  /** The label while armed. */
  armedLabel?: ReactNode;
  /** How long the second click is accepted, in ms. */
  timeout?: number;
}

/**
 * A destructive action that asks for a second click instead of opening a dialog. The first click
 * arms it (`data-armed="true"`, new label, announced to screen readers); a second click within
 * `timeout` confirms; waiting, Escape or leaving the button disarms it.
 */
export function ConfirmButton({ onConfirm, armedLabel = "Click again to confirm", timeout = 4000, children, color = "danger", variant = "outline", onBlur, onKeyDown, ...rest }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const disarm = () => {
    clearTimeout(timer.current);
    setArmed(false);
  };
  return (
    <>
      <Button
        {...rest}
        color={color}
        variant={variant}
        data-armed={armed || undefined}
        onClick={() => {
          if (armed) {
            disarm();
            onConfirm();
            return;
          }
          setArmed(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setArmed(false), timeout);
        }}
        onBlur={(e) => {
          disarm();
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && armed) disarm();
          onKeyDown?.(e);
        }}
      >
        {armed ? armedLabel : children}
      </Button>
      <span className="oq-sr-only" aria-live="polite">
        {armed ? "Press again to confirm" : ""}
      </span>
    </>
  );
}

/* ---------- SortableList ---------- */

export interface SortableListProps<T> extends Omit<HTMLAttributes<HTMLOListElement>, "children"> {
  items: T[];
  getKey: (item: T) => Key;
  /** Called with the reordered array. */
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  /** Accessible name of an item for the handle and announcements; defaults to "Item n". */
  itemLabel?: (item: T, index: number) => string;
  /** Show move up / move down buttons (default true): the touch and pointer-free way to reorder. */
  moveButtons?: boolean;
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/**
 * A list the user can reorder: drag the handle (mouse, pen or touch), press ↑ / ↓ on the focused
 * handle, or use the move buttons. Each move is announced.
 */
export function SortableList<T>({ items, getKey, onReorder, renderItem, itemLabel, moveButtons = true, className, ...rest }: SortableListProps<T>) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [drop, setDrop] = useState<{ index: number; side: "before" | "after" } | null>(null);
  const [message, setMessage] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const handles = useRef<Array<HTMLButtonElement | null>>([]);
  const nameOf = (item: T, i: number) => itemLabel?.(item, i) ?? `Item ${i + 1}`;

  const moveTo = (from: number, to: number, focus = false) => {
    if (to < 0 || to >= items.length || from === to) return;
    const item = items[from] as T;
    onReorder(move(items, from, to));
    setMessage(`${nameOf(item, from)} moved to position ${to + 1} of ${items.length}`);
    if (focus) requestAnimationFrame(() => handles.current[to]?.focus());
  };

  const targetAt = (y: number) => {
    const rows = [...(listRef.current?.children ?? [])] as HTMLElement[];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]?.getBoundingClientRect();
      if (r && y < r.top + r.height / 2) return { index: i, side: "before" as const };
    }
    return { index: rows.length - 1, side: "after" as const };
  };

  return (
    <>
      <ol ref={listRef} {...rest} className={cx("oq-sortable", className)}>
        {items.map((item, i) => (
          <li
            key={getKey(item)}
            className="oq-sortable__item"
            data-dragging={dragging === i || undefined}
            data-drop={drop && drop.index === i && dragging !== null && dragging !== i ? drop.side : undefined}
          >
            <button
              type="button"
              ref={(el) => {
                handles.current[i] = el;
              }}
              className="oq-sortable__handle"
              aria-label={`Move ${nameOf(item, i)}, position ${i + 1} of ${items.length} (arrow keys)`}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveTo(i, i - 1, true);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveTo(i, i + 1, true);
                }
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(i);
              }}
              onPointerMove={(e) => {
                if (dragging !== null) setDrop(targetAt(e.clientY));
              }}
              onPointerUp={() => {
                if (dragging !== null && drop) {
                  const to = drop.side === "after" ? (drop.index >= dragging ? drop.index : drop.index + 1) : drop.index > dragging ? drop.index - 1 : drop.index;
                  moveTo(dragging, to);
                }
                setDragging(null);
                setDrop(null);
              }}
              onPointerCancel={() => {
                setDragging(null);
                setDrop(null);
              }}
            >
              <Icon name="drag-handle" />
            </button>
            <div className="oq-sortable__body">{renderItem(item, i)}</div>
            {moveButtons && (
              <div className="oq-sortable__moves">
                <Button variant="ghost" color="neutral" size="sm" className="oq-btn--icon" aria-label={`Move ${nameOf(item, i)} up`} disabled={i === 0} onClick={() => moveTo(i, i - 1)}>
                  <Icon name="arrow-up" />
                </Button>
                <Button
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  className="oq-btn--icon"
                  aria-label={`Move ${nameOf(item, i)} down`}
                  disabled={i === items.length - 1}
                  onClick={() => moveTo(i, i + 1)}
                >
                  <Icon name="arrow-down" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <span className="oq-sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}

/* ---------- ChipGrid ---------- */

export interface ChipGridProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  values: string[];
  /** Shows a × on every chip. */
  onRemove?: (value: string) => void;
  /** Label of the filter box. */
  filterLabel?: string;
  /** "1 204 ranges" — the noun after the count. */
  noun?: string;
  /** Render at most this many matches; the count still says how many there are. */
  limit?: number;
}

/** A long list of values (CIDR ranges, ASNs) as a filterable grid of fixed-height chips. */
export function ChipGrid({ values, onRemove, filterLabel = "Filter", noun = "items", limit = 2000, className, ...rest }: ChipGridProps) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? values.filter((v) => v.toLowerCase().includes(q)) : values;
  }, [values, query]);
  const nf = new Intl.NumberFormat("en-US");
  return (
    <div {...rest} className={cx("oq-chipgrid", className)}>
      <div className="oq-chipgrid__bar">
        <input className="oq-input oq-sm" type="search" aria-label={filterLabel} placeholder={filterLabel} value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className="oq-chipgrid__count" aria-live="polite">
          {query ? `${nf.format(matches.length)} of ${nf.format(values.length)} ${noun}` : `${nf.format(values.length)} ${noun}`}
        </span>
      </div>
      <ul className="oq-chipgrid__list">
        {matches.length === 0 && <li className="oq-chipgrid__empty">Nothing matches “{query}”.</li>}
        {matches.slice(0, limit).map((v) => (
          <li key={v} className="oq-chip oq-neutral" title={v}>
            <span>{v}</span>
            {onRemove && (
              <button type="button" className="oq-chip__remove" aria-label={`Remove ${v}`} onClick={() => onRemove(v)}>
                ×
              </button>
            )}
          </li>
        ))}
        {matches.length > limit && <li className="oq-chipgrid__empty">and {nf.format(matches.length - limit)} more — narrow the filter.</li>}
      </ul>
    </div>
  );
}

/* ---------- PreviewFrame ---------- */

export type PreviewDevice = "phone" | "tablet" | "desktop";

export interface PreviewFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  src: string;
  title: string;
  /** Shown in the bar; defaults to `src`. */
  url?: ReactNode;
  device?: PreviewDevice;
  defaultDevice?: PreviewDevice;
  onDeviceChange?: (device: PreviewDevice) => void;
  /** Sandbox flags for the iframe; defaults to scripts only (no same-origin). */
  sandbox?: string;
  height?: "short" | "normal" | "tall";
}

const DEVICES: Array<[PreviewDevice, string]> = [
  ["phone", "Phone"],
  ["tablet", "Tablet"],
  ["desktop", "Desktop"],
];

/** An iframe preview of a page at phone, tablet or desktop width: a challenge page, an email. */
export function PreviewFrame({ src, title, url, device, defaultDevice = "desktop", onDeviceChange, sandbox = "allow-scripts", height = "normal", className, ...rest }: PreviewFrameProps) {
  const [inner, setInner] = useState<PreviewDevice>(defaultDevice);
  const current = device ?? inner;
  return (
    <div {...rest} className={cx("oq-frame", height !== "normal" && `oq-frame--${height}`, className)}>
      <div className="oq-frame__bar">
        <div className="oq-segmented" role="group" aria-label="Preview width">
          {DEVICES.map(([d, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={current === d}
              onClick={() => {
                if (device === undefined) setInner(d);
                onDeviceChange?.(d);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="oq-frame__url">{url ?? src}</span>
      </div>
      <div className="oq-frame__viewport" data-device={current}>
        <iframe className="oq-frame__iframe" src={src} title={title} sandbox={sandbox} />
      </div>
    </div>
  );
}

/* ---------- CardTools ---------- */

export interface CardToolsProps extends HTMLAttributes<HTMLDivElement> {
  folded?: boolean;
  onFoldedChange?: (folded: boolean) => void;
  pinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  /** Used in the buttons' labels: "Fold Traffic". */
  title?: string;
}

/**
 * Fold and pin buttons for a card header. Put `data-folded` / `data-pinned` on the Card from the
 * same state: `<Card data-folded={folded}>`.
 */
export function CardTools({ folded, onFoldedChange, pinned, onPinnedChange, title = "card", className, children, ...rest }: CardToolsProps) {
  return (
    <div {...rest} className={cx("oq-card__tools", className)}>
      {children}
      {onPinnedChange && (
        <button type="button" className="oq-card__tool" aria-pressed={Boolean(pinned)} aria-label={`Pin ${title}`} onClick={() => onPinnedChange(!pinned)}>
          <Icon name="pin" />
        </button>
      )}
      {onFoldedChange && (
        <button type="button" className="oq-card__tool" aria-expanded={!folded} aria-label={`${folded ? "Unfold" : "Fold"} ${title}`} onClick={() => onFoldedChange(!folded)}>
          <Icon name="chevron-down" />
        </button>
      )}
    </div>
  );
}

/* ---------- useFlash ---------- */

/**
 * Flashes an element (`.oq-flash`) whenever `value` changes after the first render: attach the
 * returned ref to the element showing the value.
 */
export function useFlash<E extends HTMLElement = HTMLElement>(value: unknown): RefObject<E | null> {
  const ref = useRef<E | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("oq-flash");
    void el.offsetWidth; // restart the animation
    el.classList.add("oq-flash");
  }, [value]);
  return ref;
}

/** A plain toggle button styled as a card tool, for anything else that belongs in the header. */
export function CardTool({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...rest} className={cx("oq-card__tool", className)} />;
}
