import { emit, fitPanel, OqElement, resetPanel, rootOf } from "./base";

/**
 * `<oq-dropdown>` around a `<details class="oq-dropdown">` whose `<summary>` is the trigger and
 * whose `.oq-menu` holds `.oq-menu__item`s.
 *
 * - Closes on a click outside, Escape (focus returns to the trigger), or choosing an item.
 * - ↑/↓ move between items while the menu is open.
 * - The menu stays on screen: it opens upward when there is more room above, its height is
 *   capped to the room it has, and it shifts sideways rather than leave the viewport.
 * - `open` attribute mirrors the menu's state.
 * - Events: `oq-select` with `{ value, item }` (value = `data-value` or the item's text);
 *   `oq-toggle` with `{ open }`.
 */
export class OqDropdown extends OqElement {
  static observedAttributes = ["open"];
  private syncing = false;

  get details(): HTMLDetailsElement | null {
    return rootOf<HTMLDetailsElement>(this, "details");
  }

  protected setup(): void {
    const d = this.details;
    if (!d) return;
    const summary = d.querySelector("summary");
    summary?.setAttribute("aria-haspopup", "menu");
    const menu = () => d.querySelector<HTMLElement>(".oq-menu");
    const fit = () => {
      const m = menu();
      if (m && d.open) fitPanel(m, summary ?? d);
    };
    this.ls.on(window, "resize", fit);
    if (globalThis.visualViewport) this.ls.on(globalThis.visualViewport, "resize", fit);
    this.ls.on(d, "toggle", () => {
      summary?.setAttribute("aria-expanded", String(d.open));
      const m = menu();
      if (m) (d.open ? fit() : resetPanel(m));
      this.syncing = true;
      this.toggleAttribute("open", d.open);
      this.syncing = false;
      emit(this, "oq-toggle", { open: d.open });
    });
    this.ls.on(document, "click", (e) => {
      if (d.open && !d.contains(e.target as Node)) this.close(false);
    });
    this.ls.on(d, "click", (e) => {
      const item = (e.target as Element).closest<HTMLElement>(".oq-menu__item");
      if (!item || item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true") return;
      emit(this, "oq-select", { value: item.dataset.value ?? item.textContent?.trim() ?? "", item });
      this.close(true);
    });
    this.ls.on(d, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Escape" && d.open) {
        ke.preventDefault();
        this.close(true);
        return;
      }
      if (!d.open || (ke.key !== "ArrowDown" && ke.key !== "ArrowUp")) return;
      const items = [...d.querySelectorAll<HTMLElement>(".oq-menu__item:not(:disabled)")];
      if (items.length === 0) return;
      ke.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = ke.key === "ArrowDown" ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
      next?.focus();
    });
  }

  attributeChangedCallback(_n: string, _o: string | null, value: string | null): void {
    const d = this.details;
    if (this.syncing || !this.ready || !d) return;
    d.open = value !== null;
  }

  open(): void {
    const d = this.details;
    if (d) d.open = true;
  }

  close(refocus = false): void {
    const d = this.details;
    if (!d?.open) return;
    d.open = false;
    if (refocus) d.querySelector("summary")?.focus();
  }
}
