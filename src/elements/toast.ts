import { emit, escapeHtml, glyph, numberAttr, OqElement } from "./base";

export type ToastColor = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral";

export interface ToastOptions {
  title?: string;
  message?: string;
  color?: ToastColor;
  /** Milliseconds before it goes; 0 keeps it until dismissed. Defaults to the region's `duration`. */
  duration?: number;
}

/**
 * `<oq-toast-region>` — the stack toasts appear in (it takes the `.oq-toasts` class itself).
 *
 * - `duration` attribute: default lifetime in ms (4500). `max`: how many show at once (5);
 *   the oldest goes first.
 * - `show(options)` returns an id; `dismiss(id)` removes one early.
 * - Events: `oq-show` and `oq-dismiss`, both with `{ id }`.
 * - On a touch screen a toast can be swiped sideways to dismiss it.
 * - Declarative: a click on any element with `data-oq-toast-title` (and optionally
 *   `-message`, `-color`, `-duration`) shows that toast, so a page needs no script of its own.
 */
export class OqToastRegion extends OqElement {
  static observedAttributes = ["duration", "max"];
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private next = 0;

  protected setup(): void {
    installToastTrigger();
    this.classList.add("oq-toasts");
    if (!this.hasAttribute("aria-live")) this.setAttribute("aria-live", "polite");
  }

  protected override cleanup(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  attributeChangedCallback(): void {
    this.trim();
  }

  show(options: ToastOptions): number {
    this.classList.add("oq-toasts"); // also before setup, for a region created just now
    this.next += 1;
    const id = this.next;
    const color = options.color ?? "neutral";
    const el = this.ownerDocument.createElement("div");
    el.className = `oq-toast oq-${color}`;
    el.dataset.toastId = String(id);
    el.setAttribute("role", color === "danger" ? "alert" : "status");
    el.innerHTML = `<div class="oq-toast__body">${options.title ? `<div class="oq-toast__title">${escapeHtml(options.title)}</div>` : ""}${
      options.message ? `<div class="oq-toast__message">${escapeHtml(options.message)}</div>` : ""
    }</div><button type="button" class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral oq-sm" aria-label="Dismiss">${glyph.close}</button>`;
    el.querySelector("button")?.addEventListener("click", () => this.dismiss(id));
    swipeAway(el, () => this.dismiss(id));
    this.append(el);
    const duration = options.duration ?? numberAttr(this, "duration", 4500);
    if (duration > 0) this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
    emit(this, "oq-show", { id });
    this.trim();
    return id;
  }

  dismiss(id: number): void {
    const el = this.querySelector(`[data-toast-id="${id}"]`);
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    if (!el) return;
    el.remove();
    emit(this, "oq-dismiss", { id });
  }

  private trim(): void {
    const max = Math.max(1, numberAttr(this, "max", 5));
    const all = [...this.querySelectorAll<HTMLElement>(".oq-toast")];
    for (const el of all.slice(0, Math.max(0, all.length - max))) this.dismiss(Number(el.dataset.toastId));
  }
}

/** Let a finger fling the toast sideways: past 80 px (or a quick flick) it goes, else it springs back. */
function swipeAway(el: HTMLElement, dismiss: () => void): void {
  let x0 = 0;
  let t0 = 0;
  let id = -1;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || (e.target as Element).closest("button")) return;
    id = e.pointerId;
    x0 = e.clientX;
    t0 = e.timeStamp;
    el.style.transition = "none";
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - x0;
    el.style.translate = `${dx}px 0`;
    el.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 240));
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    const dx = e.clientX - x0;
    const fast = Math.abs(dx) > 30 && e.timeStamp - t0 < 250;
    el.style.transition = "";
    if (Math.abs(dx) > 80 || fast) dismiss();
    else {
      el.style.translate = "";
      el.style.opacity = "";
    }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  // Horizontal swipes belong to the toast; vertical ones still scroll the page.
  el.style.touchAction = "pan-y";
}

/**
 * Show a toast from anywhere. Uses the first `<oq-toast-region>` on the page and creates one at
 * the end of `<body>` if there is none. Returns the toast's id, or -1 outside a browser.
 */
export function toast(options: ToastOptions): number {
  if (typeof document === "undefined") return -1;
  let region = document.querySelector<OqToastRegion>("oq-toast-region");
  if (!region) {
    region = document.createElement("oq-toast-region") as OqToastRegion;
    document.body.append(region);
  }
  if (typeof region.show !== "function") return -1; // not defined yet
  return region.show(options);
}

let triggerInstalled = false;

/** Make `data-oq-toast-*` clicks show toasts. `defineAll()` calls this; it runs once. */
export function installToastTrigger(): void {
  if (triggerInstalled || typeof document === "undefined") return;
  triggerInstalled = true;
  document.addEventListener("click", (e) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-oq-toast-title], [data-oq-toast-message]");
    if (!el) return;
    const d = el.dataset;
    const opts: ToastOptions = {};
    if (d.oqToastTitle) opts.title = d.oqToastTitle;
    if (d.oqToastMessage) opts.message = d.oqToastMessage;
    if (d.oqToastColor) opts.color = d.oqToastColor as ToastColor;
    if (d.oqToastDuration) opts.duration = Number(d.oqToastDuration);
    toast(opts);
  });
}
