import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cx } from "../cx";

/** Keeps a split position (percent of the container) inside [min, max] and inside 0–100. */
export function clampSplit(value: number, min = 0, max = 100): number {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.min(100, Math.max(min, max));
  if (Number.isNaN(value)) return lo;
  return Math.min(hi, Math.max(lo, value));
}

/** The split position, in percent, for a pointer at `pointer` over a container starting at `start` and `length` long. */
export function splitFromPointer(pointer: number, start: number, length: number): number {
  if (length <= 0) return 0;
  return ((pointer - start) / length) * 100;
}

function readStored(key: string | undefined): number | undefined {
  if (!key) return undefined;
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const n = raw == null ? Number.NaN : Number(raw);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(key: string | undefined, value: number) {
  if (!key) return;
  try {
    globalThis.localStorage?.setItem(key, value.toFixed(2));
  } catch {
    // Storage can be blocked (private mode, sandboxed frames); the split still works for this page.
  }
}

export interface SplitPaneProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onResize"> {
  /** `horizontal` puts the panes side by side; `vertical` stacks them. */
  direction?: "horizontal" | "vertical";
  /** Size of the first pane in percent. Default 50. */
  defaultSize?: number;
  /** Controlled size of the first pane in percent. */
  size?: number;
  onResize?: (size: number) => void;
  /** Smallest and largest size of the first pane, in percent. */
  min?: number;
  max?: number;
  /** Arrow-key step in percent; Shift moves ten times as far. Default 2. */
  step?: number;
  /** Double-click or Enter on the handle collapses the first pane. Default true. */
  collapsible?: boolean;
  /** Remember the size in localStorage under this key. */
  storageKey?: string;
  /** Accessible name of the separator, e.g. "Resize file list". */
  handleLabel?: string;
  /**
   * Below this viewport width (px) a side-by-side split stacks its panes one above the other at
   * their own height and hides the handle — a 50/50 split of a phone screen helps nobody.
   * Default 640, which plain HTML gets from the CSS alone. `false` keeps the split at every width.
   * Has no effect on `direction="vertical"`, which is already stacked.
   */
  stackBelow?: number | false;
  children: [ReactNode, ReactNode];
}

/** The width below which the CSS alone stacks a side-by-side split (see layout.css). */
const CSS_STACK_BELOW = 640;

/** True while the viewport is narrower than `below` px. Always false on the server and for `false`. */
function useStacked(below: number | false): boolean {
  const query = below === false ? null : `(max-width: ${below}px)`;
  const [match, setMatch] = useState(() => (query && typeof window !== "undefined" ? window.matchMedia?.(query).matches === true : false));
  useEffect(() => {
    if (!query || typeof window === "undefined" || !window.matchMedia) {
      setMatch(false);
      return;
    }
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

/**
 * Two panes with a draggable, keyboard-resizable separator between them. On a narrow screen a
 * side-by-side split stacks instead (see `stackBelow`); on touch the handle has a 24px grip.
 */
export function SplitPane({
  direction = "horizontal",
  defaultSize = 50,
  size,
  onResize,
  min = 10,
  max = 90,
  step = 2,
  collapsible = true,
  storageKey,
  handleLabel = "Resize panes",
  stackBelow = 640,
  className,
  style,
  children,
  ...rest
}: SplitPaneProps) {
  const [inner, setInner] = useState(() => clampSplit(readStored(storageKey) ?? defaultSize, min, max));
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = size !== undefined ? clampSplit(size, min, max) : inner;
  const vertical = direction === "vertical";
  const stacked = useStacked(vertical ? false : stackBelow);

  const commit = useCallback(
    (next: number) => {
      const v = clampSplit(next, min, max);
      if (size === undefined) setInner(v);
      writeStored(storageKey, v);
      onResize?.(v);
    },
    [min, max, size, storageKey, onResize],
  );

  // A changed storage key (another document, another layout) loads that key's size.
  useEffect(() => {
    const stored = readStored(storageKey);
    if (stored !== undefined) setInner(clampSplit(stored, min, max));
  }, [storageKey, min, max]);

  const fromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return current;
    return vertical ? splitFromPointer(e.clientY, box.top, box.height) : splitFromPointer(e.clientX, box.left, box.width);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    setDragging(true);
    setCollapsed(false);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) commit(fromEvent(e));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    const fwd = vertical ? "ArrowDown" : "ArrowRight";
    const by = e.shiftKey ? step * 10 : step;
    let next: number | undefined;
    if (e.key === back) next = current - by;
    else if (e.key === fwd) next = current + by;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else if (e.key === "Enter" && collapsible) {
      e.preventDefault();
      setCollapsed((c) => !c);
      return;
    }
    if (next === undefined) return;
    e.preventDefault();
    setCollapsed(false);
    commit(next);
  };

  const shown = collapsed ? 0 : current;
  return (
    <div
      ref={root}
      {...rest}
      className={cx(
        "oq-split",
        vertical && "oq-split--vertical",
        // The CSS stacks at 640px by itself; any other breakpoint is this component's job.
        stackBelow !== CSS_STACK_BELOW && "oq-split--fixed",
        stacked && "oq-split--stacked",
        collapsed && "is-collapsed",
        dragging && "is-dragging",
        className,
      )}
      style={{ "--split": `${shown}%`, ...style } as CSSProperties}
    >
      <div className="oq-split__pane">{children[0]}</div>
      <div
        className="oq-split__handle"
        role="separator"
        tabIndex={0}
        aria-label={handleLabel}
        aria-orientation={vertical ? "horizontal" : "vertical"}
        aria-valuenow={Math.round(shown)}
        aria-valuemin={collapsible ? 0 : Math.round(min)}
        aria-valuemax={Math.round(max)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => collapsible && setCollapsed((c) => !c)}
        onKeyDown={onKeyDown}
      />
      <div className="oq-split__pane">{children[1]}</div>
    </div>
  );
}
