/**
 * Shared pieces for the custom elements.
 *
 * The elements render into the light DOM — no shadow root — so the kit's `.oq-*` classes style
 * them exactly as they style hand-written markup. Each one enhances markup that already works
 * without JavaScript and can be defined late: `connectedCallback` does all the wiring.
 *
 * Nothing here touches the DOM when the module is loaded, so importing it on a server is safe;
 * `HTMLElement` is looked up lazily and replaced with an empty class where it does not exist.
 */

export const Base = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

/** Dispatch a bubbling, composed CustomEvent and return whether it was not cancelled. */
export function emit<T>(el: Element, type: string, detail: T, cancelable = false): boolean {
  return el.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true, cancelable }));
}

/** The element itself when it matches `selector`, else its first descendant that does. */
export function rootOf<T extends Element = HTMLElement>(host: Element, selector: string): T | null {
  return (host.matches(selector) ? host : host.querySelector(selector)) as T | null;
}

/** Define an element unless something already defined that name (a second bundle, a hot reload). */
export function define(name: string, ctor: CustomElementConstructor): void {
  if (typeof customElements === "undefined" || customElements.get(name)) return;
  customElements.define(name, ctor);
}

/**
 * Listeners added through this are all removed by `release()`. Elements create one in
 * `connectedCallback` and release it in `disconnectedCallback`, so moving an element in the
 * DOM never leaves a listener behind on `document`.
 */
export class Listeners {
  private offs: Array<() => void> = [];
  on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K | (string & {}),
    fn: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    const h = fn as EventListener;
    target.addEventListener(type, h, options);
    this.offs.push(() => target.removeEventListener(type, h, options));
  }
  release(): void {
    for (const off of this.offs.splice(0)) off();
  }
}

let seq = 0;
/** An id for wiring ARIA references, unique within the page. */
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** `text` with the first case-insensitive occurrence of `query` wrapped in <mark>. */
export function highlight(text: string, query: string): string {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, i))}<mark>${escapeHtml(text.slice(i, i + query.length))}</mark>${escapeHtml(text.slice(i + query.length))}`;
}

/** Small inline icons the elements create themselves (same drawing rules as the icon set). */
export const glyph = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

/** The visible part of the window: on a phone the on-screen keyboard shrinks it, innerHeight does not. */
function viewport(): { width: number; height: number; top: number } {
  const vv = globalThis.visualViewport;
  return vv ? { width: vv.width, height: vv.height, top: vv.offsetTop } : { width: innerWidth, height: innerHeight, top: 0 };
}

/**
 * Keep a popup panel (menu, listbox) on screen — the plain-DOM twin of the React layer's
 * `useFitInViewport`. It opens below its anchor and flips above when that side has more room
 * (marked `data-side="top"`, which the kit's CSS positions), its height is capped to the room it
 * has, and it is shifted sideways by whatever still overflows (into `translate` and
 * `--oq-shift`). The panel is absolutely positioned under the anchor; `resetPanel` undoes it all.
 */
export function fitPanel(panel: HTMLElement, anchor: Element, { gap = 4, margin = 8, max = 360 } = {}): void {
  resetPanel(panel);
  const vp = viewport();
  const vw = Math.min(vp.width, document.documentElement.clientWidth || vp.width);
  const a = anchor.getBoundingClientRect();
  const below = vp.top + vp.height - a.bottom - gap - margin;
  const above = a.top - vp.top - gap - margin;
  const natural = Math.min(panel.scrollHeight, max);
  const up = below < natural && above > below;
  panel.style.maxHeight = `${Math.max(120, Math.min(max, up ? above : below))}px`;
  if (up) {
    panel.dataset.side = "top";
    // Inline as well, for panels the CSS has no [data-side] rule for (a combobox listbox).
    panel.style.top = "auto";
    panel.style.bottom = `calc(100% + ${gap}px)`;
  }
  if (panel.getBoundingClientRect().width > vw - 2 * margin) panel.style.maxWidth = `${vw - 2 * margin}px`;
  const r = panel.getBoundingClientRect();
  const shift = r.right > vw - margin ? vw - margin - r.right : r.left < margin ? margin - r.left : 0;
  if (shift) {
    panel.style.translate = `${Math.round(shift)}px 0`;
    panel.style.setProperty("--oq-shift", `${Math.round(shift)}px`);
  }
}

export function resetPanel(panel: HTMLElement): void {
  for (const p of ["max-height", "top", "bottom", "translate", "max-width", "--oq-shift"]) panel.style.removeProperty(p);
  delete panel.dataset.side;
}

let locks = 0;
let saved = "";
/**
 * Stop the page behind a modal from scrolling (a native modal dialog does not, and on a phone
 * the page under a sheet scrolls with the finger). Counted, so nested modals unlock in order.
 */
export function lockScroll(on: boolean): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (on) {
    if (locks++ === 0) {
      saved = html.style.overflow;
      html.style.overflow = "hidden";
    }
  } else if (locks > 0 && --locks === 0) html.style.overflow = saved;
}

export function numberAttr(el: Element, name: string, fallback: number): number {
  const raw = el.getAttribute(name);
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * The base every element extends. It defers `setup()` until the element's children exist:
 * a script in <head> sees elements connect before the parser has reached their children, and
 * `innerHTML` in some environments connects the parent first too. So setup runs at
 * DOMContentLoaded while the page is still loading, else after the current microtask.
 *
 * Listeners added through `this.ls` are released when the element disconnects; `ready` is true
 * between setup and disconnect, and attribute callbacks should do nothing before it.
 */
export abstract class OqElement extends Base {
  protected ls = new Listeners();
  protected ready = false;
  private generation = 0;

  connectedCallback(): void {
    const gen = ++this.generation;
    const run = () => {
      if (gen !== this.generation || !this.isConnected) return;
      this.setup();
      this.ready = true;
    };
    if (this.ownerDocument.readyState === "loading") {
      this.ownerDocument.addEventListener("DOMContentLoaded", run, { once: true });
    } else queueMicrotask(run);
  }

  disconnectedCallback(): void {
    this.generation += 1;
    this.ready = false;
    this.ls.release();
    this.cleanup();
  }

  /** Wire the element to its (now present) children. */
  protected abstract setup(): void;
  /** Extra teardown beyond the listeners in `ls`. */
  protected cleanup(): void {}
}
