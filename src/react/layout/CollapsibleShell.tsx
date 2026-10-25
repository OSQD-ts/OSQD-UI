import { createContext, type HTMLAttributes, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "../Button";
import { cx } from "../cx";
import { NavItem, type NavItemProps } from "../Navigation";

/** Below this width the sidebar becomes a slide-in drawer (matches the CSS breakpoint). */
export const SHELL_DRAWER_BREAKPOINT = 760;

export interface ShellState {
  /** Sidebar collapsed to an icon rail (wide screens). */
  rail: boolean;
  setRail: (rail: boolean) => void;
  /** Sidebar shown as a drawer over the page (narrow screens). */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** What a menu button should do here: open/close the drawer on narrow screens, toggle the rail otherwise. */
  toggle: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

/** The rail/drawer state of the surrounding CollapsibleShell. */
export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell: no <CollapsibleShell> above this component");
  return ctx;
}

const narrow = () => typeof window !== "undefined" && window.matchMedia?.(`(max-width: ${SHELL_DRAWER_BREAKPOINT}px)`).matches === true;

export interface CollapsibleShellProps extends HTMLAttributes<HTMLDivElement> {
  appBar?: ReactNode;
  sidebar?: ReactNode;
  /** Controlled rail state. */
  rail?: boolean;
  defaultRail?: boolean;
  onRailChange?: (rail: boolean) => void;
  /** Remember the rail state in localStorage under this key. */
  storageKey?: string;
  /** Close the drawer with a leftward swipe on it (touch). Default true. */
  swipeToClose?: boolean;
}

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
/** A swipe closes the drawer once it has moved this far left (px), and more sideways than down. */
const SWIPE_CLOSE = 60;

/**
 * The app shell with a sidebar that collapses to an icon rail on wide screens and becomes a
 * slide-in drawer (with a backdrop) on narrow ones. Put a <ShellToggle> in the app bar.
 */
export function CollapsibleShell({
  appBar,
  sidebar,
  rail,
  defaultRail = false,
  onRailChange,
  storageKey,
  swipeToClose = true,
  className,
  children,
  ...rest
}: CollapsibleShellProps) {
  const root = useRef<HTMLDivElement>(null);
  const [innerRail, setInnerRail] = useState(() => {
    if (storageKey) {
      try {
        const v = globalThis.localStorage?.getItem(storageKey);
        if (v === "1" || v === "0") return v === "1";
      } catch {
        // Blocked storage: fall back to the default.
      }
    }
    return defaultRail;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isRail = rail ?? innerRail;

  const setRail = useCallback(
    (next: boolean) => {
      if (rail === undefined) setInnerRail(next);
      if (storageKey) {
        try {
          globalThis.localStorage?.setItem(storageKey, next ? "1" : "0");
        } catch {
          // Not remembered; still applied.
        }
      }
      onRailChange?.(next);
    },
    [rail, storageKey, onRailChange],
  );

  const toggle = useCallback(() => {
    if (narrow()) setDrawerOpen((o) => !o);
    else setRail(!isRail);
  }, [isRail, setRail]);

  // While the drawer is open: focus goes into it and Tab stays inside, Escape or a swipe to the
  // left closes it, following a link closes it, and growing past the breakpoint closes it so it
  // never lingers. Focus goes back to what opened it. (The page behind stops scrolling in CSS.)
  useEffect(() => {
    if (!drawerOpen) return;
    const sidebar = root.current?.querySelector<HTMLElement>(":scope > .oq-sidebar");
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => [...(sidebar?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null);
    (sidebar?.querySelector<HTMLElement>('[aria-current="page"]') ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
      if (e.key !== "Tab" || !sidebar) return;
      const list = focusables();
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (!sidebar.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onLink = (e: MouseEvent) => {
      if ((e.target as Element).closest?.("a[href]")) setDrawerOpen(false);
    };
    let start: { x: number; y: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (swipeToClose && e.pointerType !== "mouse") start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      if (dx < -SWIPE_CLOSE && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
        start = null;
        setDrawerOpen(false);
      }
    };
    const onUp = () => {
      start = null;
    };
    sidebar?.addEventListener("click", onLink);
    sidebar?.addEventListener("pointerdown", onDown);
    sidebar?.addEventListener("pointermove", onMove);
    sidebar?.addEventListener("pointerup", onUp);
    sidebar?.addEventListener("pointercancel", onUp);
    const mq = window.matchMedia?.(`(max-width: ${SHELL_DRAWER_BREAKPOINT}px)`);
    const onMq = () => {
      if (!mq?.matches) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    mq?.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq?.removeEventListener("change", onMq);
      sidebar?.removeEventListener("click", onLink);
      sidebar?.removeEventListener("pointerdown", onDown);
      sidebar?.removeEventListener("pointermove", onMove);
      sidebar?.removeEventListener("pointerup", onUp);
      sidebar?.removeEventListener("pointercancel", onUp);
      if (opener?.isConnected) opener.focus();
    };
  }, [drawerOpen, swipeToClose]);

  const value = useMemo<ShellState>(() => ({ rail: isRail, setRail, drawerOpen, setDrawerOpen, toggle }), [isRail, setRail, drawerOpen, toggle]);

  return (
    <ShellContext.Provider value={value}>
      <div ref={root} {...rest} className={cx("oq-shell", isRail && "oq-shell--rail", drawerOpen && "oq-shell--drawer-open", className)}>
        {appBar}
        {sidebar}
        <div className="oq-shell__backdrop" aria-hidden="true" onClick={() => setDrawerOpen(false)} />
        <main className="oq-shell__main">{children}</main>
      </div>
    </ShellContext.Provider>
  );
}

const MenuGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const RailGlyph = ({ rail }: { rail: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
    <path d={rail ? "M13 10l2 2-2 2" : "M16 10l-2 2 2 2"} />
  </svg>
);

/**
 * The sidebar button for the app bar: collapses/expands the rail on wide screens and opens the
 * drawer on narrow ones (two buttons, one shown per breakpoint, so each has an honest label).
 */
export function ShellToggle() {
  const { rail, setRail, drawerOpen, setDrawerOpen } = useShell();
  return (
    <>
      <IconButton
        className="oq-shell__rail-btn"
        label={rail ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={rail}
        onClick={() => setRail(!rail)}
      >
        <RailGlyph rail={rail} />
      </IconButton>
      <IconButton
        className="oq-shell__menu-btn"
        label={drawerOpen ? "Close menu" : "Open menu"}
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        <MenuGlyph />
      </IconButton>
    </>
  );
}

export interface ShellNavItemProps extends Omit<NavItemProps, "children"> {
  /** The item's text: shown beside the icon, and as a tooltip when the sidebar is a rail. */
  label: string;
}

/** A nav item that keeps its name in the rail (as a tooltip and as the accessible name). */
export function ShellNavItem({ label, ...rest }: ShellNavItemProps) {
  return (
    <NavItem data-tip={label} data-tip-pos="right" aria-label={label} {...rest}>
      {label}
    </NavItem>
  );
}
