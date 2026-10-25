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

/*
 * Everything below builds DOM with createElement and textContent, never from markup strings.
 * The dashboards that embed these elements refuse every markup-string sink in anything they
 * ship (scripts/elements.mjs lists them and checks these sources and the bundle), and text set
 * through textContent can never become markup, so nothing here needs escaping.
 */

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | undefined>;

/**
 * `h(doc, "li", { class: "oq-option", "aria-selected": "true" }, "Label")`. `class` sets the
 * class list; `true` sets an empty attribute; `false` and `undefined` leave it out. Strings among
 * the children become text nodes.
 */
export function h<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** `text` with the first case-insensitive occurrence of `query` wrapped in <mark>, as nodes. */
export function marked(doc: Document, text: string, query: string): DocumentFragment {
  const frag = doc.createDocumentFragment();
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) {
    frag.append(text);
    return frag;
  }
  frag.append(text.slice(0, i), h(doc, "mark", {}, text.slice(i, i + query.length)), text.slice(i + query.length));
  return frag;
}

const GLYPHS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
} as const;

/** A small inline icon drawn with the icon set's rules (24×24, 1.75 stroke). */
export function glyph(doc: Document, name: keyof typeof GLYPHS): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = doc.createElementNS(ns, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.75", "stroke-linecap": "round", "aria-hidden": "true" })) {
    svg.setAttribute(k, v);
  }
  const path = doc.createElementNS(ns, "path");
  path.setAttribute("d", GLYPHS[name]);
  svg.append(path);
  return svg;
}

/**
 * The tree an element lives in: its shadow root when it is inside one, else its document.
 * Lookups by id and "is this outside me" checks go through this, so an element mounted in a
 * dashboard's shadow root finds its own dialog rather than one on the host page.
 */
export function treeOf(node: Node): Document | ShadowRoot {
  const r = node.getRootNode?.();
  return r && (r.nodeType === 9 || r.nodeType === 11) ? (r as Document | ShadowRoot) : (node.ownerDocument ?? document);
}

/** `getElementById` within the given tree (a shadow root has no id index on every engine). */
export function byId<T extends HTMLElement = HTMLElement>(tree: Document | ShadowRoot, id: string): T | null {
  if (!id) return null;
  return tree.querySelector<T>(`[id="${id.replace(/["\\]/g, "\\$&")}"]`);
}

/** Whether `node` sits in its document's own tree rather than inside a shadow root. */
export function inLightDom(node: Node): boolean {
  return treeOf(node).nodeType === 9;
}

/** The first element in an event's composed path matching `selector`; sees into open shadow roots. */
export function closestInPath<T extends Element = HTMLElement>(e: Event, selector: string): T | null {
  for (const n of e.composedPath()) {
    if (n instanceof Element && n.matches(selector)) return n as T;
  }
  return null;
}

/** Whether the event happened inside `el`, even when it started in a shadow root within it. */
export function eventInside(e: Event, el: Element): boolean {
  return e.composedPath().includes(el);
}

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
  const vw = Math.min(vp.width, panel.ownerDocument.documentElement.clientWidth || vp.width);
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
 * A modal inside a shadow root leaves the page alone: the page belongs to whoever embedded it.
 */
export function lockScroll(on: boolean, from?: Node): void {
  if (typeof document === "undefined") return;
  if (from && !inLightDom(from)) return;
  const html = (from?.ownerDocument ?? document).documentElement;
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
 * markup parsed in one go may connect the parent first too. So setup runs at
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
