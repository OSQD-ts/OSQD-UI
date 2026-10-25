import { byId, emit, OqElement, treeOf } from "./base";

/**
 * `<oq-tabs>` around a `.oq-tabs[role=tablist]` of `[role=tab]` buttons whose `aria-controls`
 * name their `.oq-tabpanel`s.
 *
 * - Arrow keys move and select (wrapping), Home/End jump; disabled tabs are skipped.
 * - When the tab strip scrolls sideways (narrow screens), the selected tab is scrolled into view.
 * - `value` attribute: the selected tab's `data-value`, or its id. Setting it selects.
 * - Event `oq-change` with `{ value, tab }`.
 */
export class OqTabs extends OqElement {
  static observedAttributes = ["value"];
  private syncing = false;

  get tabs(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[role="tab"]')].filter((t) => t.closest("oq-tabs") === this);
  }

  protected setup(): void {
    const tabs = this.tabs;
    if (tabs.length === 0) return;
    const wanted = this.getAttribute("value");
    const initial =
      (wanted && tabs.find((t) => tabValue(t) === wanted)) ||
      tabs.find((t) => t.getAttribute("aria-selected") === "true") ||
      tabs.find((t) => !isDisabled(t));
    if (initial) this.select(initial, false);
    this.ls.on(this, "click", (e) => {
      const tab = (e.target as Element).closest<HTMLElement>('[role="tab"]');
      if (tab && this.tabs.includes(tab) && !isDisabled(tab)) this.select(tab, true);
    });
    this.ls.on(this, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      const tab = (ke.target as Element).closest<HTMLElement>('[role="tab"]');
      if (!tab) return;
      const usable = this.tabs.filter((t) => !isDisabled(t));
      const i = usable.indexOf(tab);
      if (i < 0) return;
      const next = {
        ArrowRight: usable[(i + 1) % usable.length],
        ArrowDown: usable[(i + 1) % usable.length],
        ArrowLeft: usable[(i - 1 + usable.length) % usable.length],
        ArrowUp: usable[(i - 1 + usable.length) % usable.length],
        Home: usable[0],
        End: usable[usable.length - 1],
      }[ke.key];
      if (!next) return;
      ke.preventDefault();
      this.select(next, true);
      next.focus();
    });
  }

  attributeChangedCallback(_n: string, _o: string | null, value: string | null): void {
    if (this.syncing || !this.ready || value === null) return;
    const tab = this.tabs.find((t) => tabValue(t) === value);
    if (tab) this.select(tab, false);
  }

  get value(): string | null {
    return this.getAttribute("value");
  }
  set value(v: string) {
    this.setAttribute("value", v);
  }

  private select(tab: HTMLElement, user: boolean): void {
    const was = this.tabs.find((t) => t.getAttribute("aria-selected") === "true");
    for (const t of this.tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = panelOf(t);
      if (panel) panel.hidden = !on;
    }
    revealTab(tab);
    this.syncing = true;
    this.setAttribute("value", tabValue(tab));
    this.syncing = false;
    if (user && was !== tab) emit(this, "oq-change", { value: tabValue(tab), tab });
  }
}

/** Scroll the tab strip (only the strip, never the page) so the tab is fully visible. */
function revealTab(tab: HTMLElement): void {
  const strip = tab.closest<HTMLElement>('[role="tablist"]');
  if (!strip || strip.scrollWidth <= strip.clientWidth) return;
  const s = strip.getBoundingClientRect();
  const t = tab.getBoundingClientRect();
  const pad = 16;
  if (t.left < s.left + pad) strip.scrollLeft -= s.left + pad - t.left;
  else if (t.right > s.right - pad) strip.scrollLeft += t.right - (s.right - pad);
}

const tabValue = (t: HTMLElement) => t.dataset.value ?? t.id;
const isDisabled = (t: HTMLElement) => t.hasAttribute("disabled") || t.getAttribute("aria-disabled") === "true";
const panelOf = (t: HTMLElement) => {
  const id = t.getAttribute("aria-controls");
  // In the tab's own tree: tabs inside a shadow root have their panels there too.
  return id ? (byId(treeOf(t), id) ?? (t.ownerDocument.getElementById(id) as HTMLElement | null)) : null;
};
