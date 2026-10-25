import { type HTMLAttributes, type KeyboardEvent, useEffect, useRef } from "react";
import { cx } from "./cx";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Name for screen readers, e.g. "Formatting". */
  label: string;
  /** No border or background — for a toolbar inside a card header. */
  flat?: boolean;
}

const BUTTONS = "button:not(:disabled), [data-roving]";

/**
 * A row of controls with one tab stop (WAI-ARIA toolbar): ←→ move between buttons, Home/End jump.
 * Text inputs inside keep their own arrow keys and tab stop.
 */
export function Toolbar({ label, flat, className, onKeyDown, ...rest }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Exactly one button is tabbable: the one the user last moved to, else the first. Re-run every
  // render so buttons added later join the roving set instead of adding tab stops.
  useEffect(() => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(BUTTONS) ?? [])];
    const stop = Math.max(0, items.findIndex((el) => el.dataset.rovingStop === "1"));
    items.forEach((el, i) => {
      el.tabIndex = i === stop ? 0 : -1;
    });
  });

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || (e.target as HTMLElement).matches("input, textarea, select")) return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(BUTTONS) ?? [])];
    const at = items.indexOf(e.target as HTMLElement);
    if (at < 0) return;
    let to: number;
    if (e.key === "ArrowRight") to = (at + 1) % items.length;
    else if (e.key === "ArrowLeft") to = (at - 1 + items.length) % items.length;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = items.length - 1;
    else return;
    e.preventDefault();
    items.forEach((el, i) => {
      el.tabIndex = i === to ? 0 : -1;
      if (i === to) el.dataset.rovingStop = "1";
      else el.removeAttribute("data-roving-stop");
    });
    items[to]?.focus();
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      {...rest}
      className={cx("oq-toolbar", flat && "oq-toolbar--flat", className)}
      onKeyDown={move}
    />
  );
}

/** A vertical line between groups of toolbar controls. */
export function ToolbarSeparator() {
  return <span role="separator" aria-orientation="vertical" className="oq-toolbar__sep" />;
}

/** A short text label inside a Toolbar. */
export function ToolbarLabel({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest} className={cx("oq-toolbar__label", className)} />;
}
