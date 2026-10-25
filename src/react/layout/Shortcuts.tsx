import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Kbd } from "../Display";
import { Dialog } from "../Overlay";

export interface Shortcut {
  /** A combination like "mod+k", "shift+d", "g" or "?" (mod is Ctrl, or ⌘ on macOS). */
  keys: string;
  label: string;
  /** Heading it is listed under in the overlay. Default "General". */
  group?: string;
  /** Leave out to list a shortcut that something else handles. */
  handler?: (e: KeyboardEvent) => void;
  /** Also fire while typing in a field. Default: only combinations with mod do. */
  inInputs?: boolean;
}

export interface ShortcutRegistry {
  /** Adds a shortcut; returns the function that removes it again. */
  register: (s: Shortcut) => () => void;
  list: () => Shortcut[];
  /** Shortcuts by group, groups in the order they first appeared. */
  grouped: () => Array<{ group: string; items: Shortcut[] }>;
  subscribe: (fn: () => void) => () => void;
}

/** A store of shortcuts, independent of React (the provider holds one, tests make their own). */
export function createShortcutRegistry(): ShortcutRegistry {
  let items: Shortcut[] = [];
  const subs = new Set<() => void>();
  const emit = () => {
    for (const fn of subs) fn();
  };
  return {
    register(s) {
      items = [...items, s];
      emit();
      return () => {
        items = items.filter((x) => x !== s);
        emit();
      };
    },
    list: () => items,
    grouped() {
      const groups = new Map<string, Shortcut[]>();
      for (const s of items) {
        const g = s.group ?? "General";
        groups.set(g, [...(groups.get(g) ?? []), s]);
      }
      return [...groups].map(([group, list]) => ({ group, items: list }));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const isMac = () => typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);

/**
 * Whether a key event is the combination. A symbol key such as "?" matches whatever Shift state
 * produced it, because the symbol already says which key it was.
 */
export function matchesCombo(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">, combo: string, mac = isMac()): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts.pop() ?? "";
  const want = new Set(parts);
  const mod = mac ? e.metaKey : e.ctrlKey;
  if (want.has("mod") !== mod) return false;
  if (want.has("alt") !== e.altKey) return false;
  const symbol = key.length === 1 && !/[a-z0-9]/.test(key);
  if (!symbol && want.has("shift") !== e.shiftKey) return false;
  return e.key.toLowerCase() === key;
}

const KEY_NAMES: Record<string, string> = {
  escape: "Esc",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  enter: "Enter",
  space: "Space",
  " ": "Space",
  backspace: "⌫",
  delete: "Del",
};

/** The keys of a combination as labels for <Kbd>: "mod+shift+k" → ["Ctrl", "Shift", "K"] (⌘ ⇧ K on macOS). */
export function formatCombo(combo: string, mac = isMac()): string[] {
  return combo.split("+").map((p) => {
    const k = p.toLowerCase();
    if (k === "mod") return mac ? "⌘" : "Ctrl";
    if (k === "shift") return mac ? "⇧" : "Shift";
    if (k === "alt") return mac ? "⌥" : "Alt";
    if (k === "ctrl") return mac ? "⌃" : "Ctrl";
    return KEY_NAMES[k] ?? (p.length === 1 ? p.toUpperCase() : p[0]?.toUpperCase() + p.slice(1));
  });
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

const ShortcutsContext = createContext<ShortcutRegistry | null>(null);

export interface ShortcutsProviderProps {
  children?: ReactNode;
  /** Open the overlay with "?" (registered as a shortcut itself). Default true. */
  overlay?: boolean;
  /** Overlay title. */
  title?: ReactNode;
}

/**
 * Holds the page's shortcuts, fires them from one keydown listener, and (by default) shows the
 * list in an overlay on "?".
 */
export function ShortcutsProvider({ children, overlay = true, title = "Keyboard shortcuts" }: ShortcutsProviderProps) {
  const registry = useMemo(createShortcutRegistry, []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      for (const s of registry.list()) {
        if (!s.handler || !matchesCombo(e, s.keys)) continue;
        if (typing(e.target) && !s.inInputs && !s.keys.toLowerCase().includes("mod")) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [registry]);

  useEffect(() => {
    if (!overlay) return;
    return registry.register({ keys: "?", label: "Show keyboard shortcuts", group: "General", handler: () => setOpen((o) => !o) });
  }, [overlay, registry]);

  return (
    <ShortcutsContext.Provider value={registry}>
      {children}
      {overlay && <ShortcutsOverlay open={open} onClose={() => setOpen(false)} title={title} registry={registry} />}
    </ShortcutsContext.Provider>
  );
}

function useRegistry(): ShortcutRegistry {
  const r = useContext(ShortcutsContext);
  if (!r) throw new Error("Shortcuts: no <ShortcutsProvider> above this component");
  return r;
}

/** Registers a shortcut for as long as the component is mounted. The handler may change freely. */
export function useShortcut(shortcut: Shortcut) {
  const registry = useRegistry();
  const handler = useRef(shortcut.handler);
  handler.current = shortcut.handler;
  const { keys, label, group, inInputs } = shortcut;
  const hasHandler = shortcut.handler !== undefined;
  useEffect(
    () =>
      registry.register({
        keys,
        label,
        ...(group !== undefined ? { group } : {}),
        ...(inInputs !== undefined ? { inInputs } : {}),
        ...(hasHandler ? { handler: (e: KeyboardEvent) => handler.current?.(e) } : {}),
      }),
    [registry, keys, label, group, inInputs, hasHandler],
  );
}

/** Every registered shortcut, grouped; re-renders as shortcuts come and go. */
export function useShortcuts(): Array<{ group: string; items: Shortcut[] }> {
  const registry = useRegistry();
  // `list` changes identity on every change; it is the memo's trigger, grouped() reads the same data.
  const list = useSyncExternalStore(registry.subscribe, registry.list, registry.list);
  return useMemo(() => {
    void list;
    return registry.grouped();
  }, [registry, list]);
}

export interface ShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Defaults to the surrounding provider's registry. */
  registry?: ShortcutRegistry;
  /**
   * A line shown only on touch screens without a mouse, where the keys probably cannot be
   * typed at all. `null` hides it.
   */
  touchNote?: ReactNode;
}

/** A dialog listing shortcuts by group. */
export function ShortcutsOverlay({
  open,
  onClose,
  title = "Keyboard shortcuts",
  registry,
  touchNote = "These keys work with a hardware keyboard. On a touch screen, every action is also on the page itself.",
}: ShortcutsOverlayProps) {
  const ctx = useContext(ShortcutsContext);
  const reg = registry ?? ctx;
  if (!reg) throw new Error("ShortcutsOverlay: pass `registry` or put it inside <ShortcutsProvider>");
  const list = useSyncExternalStore(reg.subscribe, reg.list, reg.list);
  const groups = useMemo(() => {
    void list;
    return reg.grouped();
  }, [reg, list]);
  return (
    <Dialog open={open} onClose={onClose} title={title} width={720}>
      {touchNote != null && groups.length > 0 && <p className="oq-shortcuts__touch">{touchNote}</p>}
      {groups.length === 0 ? (
        <p className="oq-shortcuts__empty">No shortcuts on this page.</p>
      ) : (
        <div className="oq-shortcuts">
          {groups.map((g) => (
            <section key={g.group} className="oq-shortcuts__group">
              <div className="oq-overline">{g.group}</div>
              {g.items.map((s) => (
                <div key={`${s.keys}-${s.label}`} className="oq-shortcuts__row">
                  <span>{s.label}</span>
                  <span className="oq-shortcuts__keys">
                    {formatCombo(s.keys).map((k, i) => (
                      <Kbd key={`${k}-${i}`}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </Dialog>
  );
}
