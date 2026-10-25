import { emit, lockScroll, OqElement, rootOf } from "./base";

let openerInstalled = false;

/**
 * Any element with `data-oq-open="<id>"` opens the dialog-like element with that id when
 * clicked (an `<oq-dialog>` or `<oq-command-palette>`). One listener on the document serves
 * every opener, so buttons added later work too.
 */
export function installOpener(): void {
  if (openerInstalled || typeof document === "undefined") return;
  openerInstalled = true;
  document.addEventListener("click", (e) => {
    const opener = (e.target as Element | null)?.closest?.("[data-oq-open]");
    if (!opener) return;
    const target = document.getElementById(opener.getAttribute("data-oq-open") ?? "") as (HTMLElement & { show?: () => void }) | null;
    if (target?.show) {
      e.preventDefault();
      target.show();
    }
  });
}

/** Open a <dialog> modally, falling back to the `open` attribute where showModal is missing. */
export function showDialog(d: HTMLDialogElement): void {
  if (d.open) return;
  if (typeof d.showModal === "function") d.showModal();
  else d.setAttribute("open", "");
  // The page behind stays put while the dialog is open (a phone would scroll it under the sheet).
  lockScroll(true);
  d.addEventListener("close", () => lockScroll(false), { once: true });
}

export function closeDialog(d: HTMLDialogElement, value?: string): void {
  if (typeof d.close === "function") d.close(value);
  else {
    d.removeAttribute("open");
    d.dispatchEvent(new Event("close"));
  }
}

/**
 * `<oq-dialog>` around a `<dialog class="oq-dialog">`.
 *
 * - `open` attribute ↔ the dialog's modal state, both ways.
 * - Closes on Escape, a click on the backdrop, or a click on any `[data-close]` inside
 *   (`data-close="value"` becomes the return value).
 * - Events: `oq-open`; `oq-close` with `{ returnValue }`.
 */
export class OqDialog extends OqElement {
  static observedAttributes = ["open"];
  private syncing = false;

  get dialog(): HTMLDialogElement | null {
    return rootOf<HTMLDialogElement>(this, "dialog");
  }

  protected setup(): void {
    installOpener();
    const d = this.dialog;
    if (!d) return;
    this.ls.on(d, "click", (e) => {
      const t = e.target as Element;
      const closer = t.closest("[data-close]");
      if (t === d || (closer && d.contains(closer))) this.close(closer?.getAttribute("data-close") || undefined);
    });
    this.ls.on(d, "close", () => {
      this.sync(false);
      emit(this, "oq-close", { returnValue: d.returnValue ?? "" });
    });
    if (this.hasAttribute("open")) this.show();
  }

  attributeChangedCallback(_name: string, _old: string | null, value: string | null): void {
    if (this.syncing || !this.ready) return;
    if (value === null) this.close();
    else this.show();
  }

  show(): void {
    const d = this.dialog;
    if (!d || d.open) return;
    showDialog(d);
    this.sync(true);
    emit(this, "oq-open", {});
  }

  close(value?: string): void {
    const d = this.dialog;
    if (d?.open) closeDialog(d, value);
  }

  private sync(open: boolean): void {
    this.syncing = true;
    this.toggleAttribute("open", open);
    this.syncing = false;
  }
}
