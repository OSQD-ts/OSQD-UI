import type { ReactNode } from "react";
import { findAll } from "./logic";

/**
 * `text` with every occurrence of `query` wrapped in <mark className>. `current` is the index of
 * the occurrence to mark with `is-current` (the one next/previous moved to), counted in this text.
 */
export function highlightText(text: string, query: string, className: string, current = -1): ReactNode {
  const hits = findAll(text, query);
  if (hits.length === 0) return text;
  const out: ReactNode[] = [];
  let at = 0;
  hits.forEach((start, i) => {
    if (start > at) out.push(text.slice(at, start));
    out.push(
      <mark key={start} className={i === current ? `${className} is-current` : className}>
        {text.slice(start, start + query.length)}
      </mark>,
    );
    at = start + query.length;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** Copies text to the clipboard when one is available; resolves false when it is not. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or an insecure context: fall through.
  }
  return false;
}
