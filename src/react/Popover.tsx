import {
  type CSSProperties,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cx } from "./cx";
import { Kbd } from "./Display";
import { SearchIcon } from "./icons";
import { useFitInViewport } from "./viewport";

/* ---------- Popover ---------- */

export type PopoverPlacement = "top" | "bottom" | "start" | "end";

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  /** Renders the trigger; spread `props` onto the element that toggles the panel. */
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-controls": string }) => ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons at the bottom right. */
  actions?: ReactNode;
  placement?: PopoverPlacement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Max width (CSS length or px). */
  width?: number | string;
}

/** A panel anchored to its trigger with an arrow; closes on outside click and Escape. */
export function Popover({
  trigger,
  title,
  children,
  actions,
  placement = "bottom",
  open,
  onOpenChange,
  width,
  className,
  style,
  ...rest
}: PopoverProps) {
  const [inner, setInner] = useState(false);
  const isOpen = open ?? inner;
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const side = useFitInViewport(panel, isOpen, placement);

  const set = (v: boolean) => {
    if (open === undefined) setInner(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) set(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") set(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  return (
    <div ref={root} className="oq-popover-anchor">
      {trigger({ onClick: () => set(!isOpen), "aria-expanded": isOpen, "aria-controls": id })}
      <div
        ref={panel}
        role="dialog"
        id={id}
        {...rest}
        hidden={!isOpen}
        data-pos={side}
        className={cx("oq-popover", className)}
        style={{ ...(width !== undefined ? { "--w": typeof width === "number" ? `${width}px` : width } : {}), ...style } as CSSProperties}
      >
        {title != null && <div className="oq-popover__title">{title}</div>}
        {children}
        {actions != null && <div className="oq-popover__actions">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Command palette ---------- */

export interface Command {
  id: string;
  label: string;
  group?: string;
  /** Shortcut shown on the right, e.g. ["Ctrl", "S"]. */
  shortcut?: string[];
  icon?: ReactNode;
  /** Extra words that match the search but are not shown. */
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "onSelect"> {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  emptyText?: ReactNode;
}

/** Ranks a command for a query: label prefix beats word prefix beats substring beats keyword. 0 means no match. */
export function scoreCommand(c: Pick<Command, "label" | "keywords" | "group">, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const label = c.label.toLowerCase();
  if (label.startsWith(q)) return 4;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 3;
  if (label.includes(q)) return 2;
  if ([...(c.keywords ?? []), c.group ?? ""].some((k) => k.toLowerCase().includes(q))) return 1;
  return 0;
}

/** A search box over commands in a modal: ↑↓ move, Enter runs, Escape closes. */
export function CommandPalette({ open, onClose, commands, placeholder = "Type a command or search…", emptyText = "No matching commands", className, ...rest }: CommandPaletteProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const base = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery("");
      setActive(0);
      el.showModal();
      input.current?.focus();
    } else if (!open && el.open) el.close();
  }, [open]);

  // Matches, best first; within a score the given order (and so the grouping) is kept.
  const shown = useMemo(
    () =>
      commands
        .map((c, i) => ({ c, i, s: scoreCommand(c, query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => (query.trim() ? b.s - a.s : 0) || a.i - b.i)
        .map((x) => x.c),
    [commands, query],
  );

  const run = (c: Command | undefined) => {
    if (!c || c.disabled) return;
    onClose();
    c.onSelect();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = shown.length;
    if (!n) return;
    if (e.key === "ArrowDown") setActive((a) => (a + 1) % n);
    else if (e.key === "ArrowUp") setActive((a) => (a - 1 + n) % n);
    else if (e.key === "Enter") run(shown[active]);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    document.getElementById(`${base}-cmd-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, base]);

  let lastGroup: string | undefined;
  return (
    <dialog
      ref={ref}
      {...rest}
      className={cx("oq-palette", className)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="oq-palette__search">
        <SearchIcon />
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls={`${base}-list`}
          aria-activedescendant={shown.length ? `${base}-cmd-${active}` : undefined}
          aria-label="Search commands"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul id={`${base}-list`} role="listbox" className="oq-palette__list">
        {shown.length === 0 && <li className="oq-listbox__empty">{emptyText}</li>}
        {shown.map((c, i) => {
          // Group headers only make sense in the unsorted (empty-query) order.
          const header = !query.trim() && c.group !== undefined && c.group !== lastGroup ? c.group : undefined;
          lastGroup = c.group;
          return [
            header !== undefined && (
              <li key={`g-${header}`} role="presentation" className="oq-listbox__group oq-overline">
                {header}
              </li>
            ),
            <li
              key={c.id}
              id={`${base}-cmd-${i}`}
              role="option"
              className="oq-option"
              aria-selected={i === active}
              aria-disabled={c.disabled || undefined}
              data-active={i === active || undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
            >
              {c.icon}
              <span className="oq-truncate">{c.label}</span>
              {c.shortcut && (
                <span className="oq-option__hint oq-row oq-gap-1">
                  {c.shortcut.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              )}
            </li>,
          ];
        })}
      </ul>
      <div className="oq-palette__footer">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>Enter</Kbd> run
        </span>
        <span>
          <Kbd>Esc</Kbd> close
        </span>
      </div>
    </dialog>
  );
}

/**
 * Calls `handler` on a key combination such as "mod+k" (mod = Ctrl, or ⌘ on macOS), "shift+/" or "escape".
 * The browser default is prevented for a match.
 */
export function useHotkey(combo: string, handler: (e: globalThis.KeyboardEvent) => void, enabled = true) {
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts.pop() ?? "";
    const want = new Set(parts);
    const onKey = (e: globalThis.KeyboardEvent) => {
      const mac = /mac|iphone|ipad/i.test(navigator.platform);
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (want.has("mod") !== mod || want.has("shift") !== e.shiftKey || want.has("alt") !== e.altKey) return;
      if (e.key.toLowerCase() !== key) return;
      e.preventDefault();
      saved.current(e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [combo, enabled]);
}
