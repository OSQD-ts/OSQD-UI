import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cx } from "../cx";

export interface ContextMenuAction {
  label: ReactNode;
  icon?: ReactNode;
  /** Shortcut text shown on the right, e.g. "Ctrl D". */
  hint?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

/** An action, a separator, or a group label (`{ label: "Node" , group: true }`). */
export type ContextMenuEntry = ContextMenuAction | "separator" | { group: ReactNode };

/**
 * Where to put a menu of size w×h opened at (x, y) so it stays inside a viewport of vw×vh:
 * flipped left/up when it would overflow, then clamped to a margin from every edge.
 */
export function placeInViewport(x: number, y: number, w: number, h: number, vw: number, vh: number, margin = 8): { left: number; top: number } {
  let left = x + w + margin > vw ? x - w : x;
  let top = y + h + margin > vh ? y - h : y;
  left = Math.max(margin, Math.min(left, vw - w - margin));
  top = Math.max(margin, Math.min(top, vh - h - margin));
  return { left, top };
}

export interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  items: ContextMenuEntry[];
  /** The area that opens the menu on right-click, Shift+F10 or the Menu key. */
  children: ReactNode;
  /** Called with true/false as the menu opens and closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Hold a finger still this long (ms) to open the menu on a touch screen. Some phones send a
   * contextmenu event for a long press and some (iOS) do not, so the component times it itself.
   * Default 500; `false` turns it off.
   */
  longPress?: number | false;
}

/** How far (px) a finger may drift during a long press before it counts as a scroll instead. */
const LONG_PRESS_SLOP = 10;

const isAction = (e: ContextMenuEntry): e is ContextMenuAction => typeof e === "object" && !("group" in e);

/**
 * A right-click menu over its children; also opens from the keyboard (Shift+F10 or the Menu key)
 * and with a long press on touch screens.
 */
export function ContextMenu({ items, children, onOpenChange, longPress = 500, className, ...rest }: ContextMenuProps) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  // Set when a long press opened the menu: the click (and contextmenu) that follow the lift are not actions.
  const swallow = useRef(false);

  const open = useCallback(
    (x: number, y: number) => {
      returnTo.current = document.activeElement as HTMLElement | null;
      setPos(null);
      setAt({ x, y });
      onOpenChange?.(true);
    },
    [onOpenChange],
  );
  const close = useCallback(() => {
    setAt(null);
    onOpenChange?.(false);
    returnTo.current?.focus?.();
  }, [onOpenChange]);

  // Measure, place inside the viewport, then focus the first enabled item.
  useLayoutEffect(() => {
    if (!at || !menu.current) return;
    const r = menu.current.getBoundingClientRect();
    setPos(placeInViewport(at.x, at.y, r.width, r.height, window.innerWidth, window.innerHeight));
    menu.current.querySelector<HTMLButtonElement>(".oq-menu__item:not(:disabled)")?.focus();
  }, [at]);

  useEffect(() => {
    if (!at) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (!menu.current?.contains(e.target as Node)) close();
    };
    const onScroll = () => close();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [at, close]);

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (press.current) {
      // The browser reported the long press before our timer did: open now, once.
      cancelPress();
      swallow.current = true;
    } else if (swallow.current) return; // our timer already opened it
    open(e.clientX, e.clientY);
  };

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => cancelPress, []);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swallow.current = false;
    if (longPress === false || e.pointerType === "mouse" || !e.isPrimary) return;
    const { clientX: x, clientY: y } = e;
    cancelPress();
    press.current = {
      x,
      y,
      timer: setTimeout(() => {
        press.current = null;
        swallow.current = true;
        open(x, y);
      }, longPress),
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP) cancelPress();
  };
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!swallow.current) return;
    swallow.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const onAreaKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
      e.preventDefault();
      const r = (document.activeElement && area.current?.contains(document.activeElement) ? document.activeElement : area.current)?.getBoundingClientRect();
      if (r) open(r.left + Math.min(24, r.width / 2), r.top + Math.min(r.height, 28));
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>(".oq-menu__item:not(:disabled)") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const go = (n: number) => buttons[(n + buttons.length) % buttons.length]?.focus();
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(buttons.length - 1);
    else if (e.key === "Escape" || e.key === "Tab") close();
    else return;
    e.preventDefault();
  };

  return (
    <>
      <div
        ref={area}
        data-context-menu=""
        {...rest}
        className={cx(className)}
        onContextMenu={onContextMenu}
        onKeyDown={onAreaKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
      {at && (
        <div
          ref={menu}
          role="menu"
          className="oq-menu oq-context-menu"
          style={{ left: pos?.left ?? at.x, top: pos?.top ?? at.y, visibility: pos ? "visible" : "hidden" } as CSSProperties}
          onKeyDown={onMenuKey}
          onContextMenu={(e) => e.preventDefault()}
        >
          {items.map((item, i) => {
            if (item === "separator") return <div key={`s${i}`} className="oq-menu__sep" role="separator" />;
            if (!isAction(item))
              return (
                <div key={`g${i}`} className="oq-menu__label oq-overline" role="presentation">
                  {item.group}
                </div>
              );
            return (
              <button
                key={`a${i}`}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                className={cx("oq-menu__item", item.danger && "oq-danger")}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
              >
                {item.icon}
                <span className="oq-truncate">{item.label}</span>
                {item.hint != null && <span className="oq-menu__hint">{item.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
