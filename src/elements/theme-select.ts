import { themes } from "../theme/index";
import { emit, h, OqElement, treeOf } from "./base";

/**
 * `<oq-theme-select>` binds a `<select>` to a theme: choosing an option sets `data-theme` on
 * the target and remembers the choice.
 *
 * - A `<select>` inside is used as is; with none, one is created listing every built-in theme
 *   plus "auto".
 * - `target`: selector of the element to theme (default `html`), looked up in the picker's own
 *   tree first, so inside a shadow root `#panel` finds the dashboard's element. `target="closest"`
 *   themes the nearest ancestor that has a `data-theme` (crossing out of a shadow root to its host).
 *   `storage-key`: where the
 *   choice is kept in localStorage (default `oq-theme`; empty turns remembering off).
 *   `default`: the theme when nothing is stored (else the target's current `data-theme`).
 * - Several pickers can share a target (an app bar and a phone menu): each follows the
 *   target's `data-theme`, so they never disagree about the current theme.
 * - Event `oq-change` with `{ theme }`.
 */
export class OqThemeSelect extends OqElement {
  static observedAttributes = ["target"];

  private get select(): HTMLSelectElement | null {
    return this.querySelector("select");
  }
  private get target(): HTMLElement | null {
    const sel = this.getAttribute("target") ?? "html";
    if (sel === "closest") {
      for (let n: Node | null = this.parentNode; n; n = n.parentNode ?? (n as ShadowRoot).host ?? null) {
        if (n instanceof HTMLElement && n.hasAttribute("data-theme")) return n;
      }
      return this.ownerDocument.documentElement;
    }
    return treeOf(this).querySelector<HTMLElement>(sel) ?? this.ownerDocument.querySelector<HTMLElement>(sel);
  }
  private get key(): string {
    return this.getAttribute("storage-key") ?? "oq-theme";
  }

  protected setup(): void {
    let select = this.select;
    if (!select) {
      select = this.ownerDocument.createElement("select");
      select.className = "oq-select oq-sm";
      select.setAttribute("aria-label", "Theme");
      const names = [...Object.keys(themes), "auto"];
      const doc = this.ownerDocument;
      select.append(...names.map((n) => h(doc, "option", { value: n }, n === "auto" ? "Auto (system)" : `${n[0]?.toUpperCase()}${n.slice(1)}`)));
      this.append(select);
    }
    const initial = this.stored() ?? this.getAttribute("default") ?? this.target?.dataset.theme ?? select.value;
    this.apply(initial, false);
    this.ls.on(select, "change", () => this.apply(select.value, true));
    const t = this.target;
    if (t && typeof MutationObserver !== "undefined") {
      this.observer = new MutationObserver(() => {
        const theme = t.dataset.theme ?? "";
        const s = this.select;
        if (s && s.value !== theme && [...s.options].some((o) => o.value === theme)) s.value = theme;
      });
      this.observer.observe(t, { attributes: true, attributeFilter: ["data-theme"] });
    }
  }

  private observer: MutationObserver | null = null;

  protected override cleanup(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  attributeChangedCallback(): void {
    if (this.ready && this.select) this.apply(this.select.value, false);
  }

  get value(): string {
    return this.select?.value ?? "";
  }
  set value(theme: string) {
    this.apply(theme, false);
  }

  private stored(): string | null {
    if (!this.key) return null;
    try {
      return localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  private apply(theme: string, user: boolean): void {
    const select = this.select;
    if (select && [...select.options].some((o) => o.value === theme)) select.value = theme;
    const t = this.target;
    if (t) t.dataset.theme = theme;
    if (user && this.key) {
      try {
        localStorage.setItem(this.key, theme);
      } catch {}
    }
    if (user) emit(this, "oq-change", { theme });
  }
}
