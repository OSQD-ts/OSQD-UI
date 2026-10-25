import { emit, fitPanel, h, marked, OqElement, rootOf, uid } from "./base";

export interface ComboOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * `<oq-combobox>` — a text input that filters a listbox.
 *
 * Markup: `.oq-combobox` (the element itself or a child) holding an `input` and a
 * `ul.oq-listbox` of `li.oq-option[data-value]`; the listbox is created if missing, and
 * `options` can replace its items from script. An optional `.oq-combobox__toggle` opens it.
 *
 * - Typing filters (case-insensitive, match highlighted); ↑/↓ move, Enter picks, Escape
 *   closes (a second Escape clears), Tab closes. `aria-activedescendant` follows the active option.
 * - `value` attribute: the picked option's value. `empty-text`: shown when nothing matches.
 * - Event `oq-change` with `{ value, label }`.
 */
export class OqCombobox extends OqElement {
  static observedAttributes = ["value"];
  private items: ComboOption[] = [];
  private active = -1;
  /** What the list is filtered by: the typed text, or empty right after opening. */
  private query = "";
  private syncing = false;

  private get root(): HTMLElement {
    return rootOf(this, ".oq-combobox") ?? this;
  }
  private get input(): HTMLInputElement | null {
    return this.root.querySelector("input");
  }
  private get list(): HTMLUListElement | null {
    return this.root.querySelector(".oq-listbox");
  }

  /** The options; setting re-renders the list. */
  get options(): ComboOption[] {
    return this.items.slice();
  }
  set options(opts: ComboOption[]) {
    this.items = opts.slice();
    this.render(this.query);
  }

  get value(): string {
    return this.getAttribute("value") ?? "";
  }
  set value(v: string) {
    this.setAttribute("value", v);
  }

  protected setup(): void {
    const root = this.root;
    root.classList.add("oq-combobox");
    const input = this.input;
    if (!input) return;
    let list = this.list;
    if (!list) {
      list = this.ownerDocument.createElement("ul");
      list.className = "oq-listbox";
      root.append(list);
    }
    if (!list.id) list.id = uid("oq-listbox");
    list.setAttribute("role", "listbox");
    list.hidden = true;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.autocomplete = "off";
    if (this.items.length === 0) {
      this.items = [...list.querySelectorAll<HTMLElement>(".oq-option")].map((li) => ({
        value: li.dataset.value ?? li.textContent?.trim() ?? "",
        label: li.textContent?.trim() ?? "",
        disabled: li.getAttribute("aria-disabled") === "true",
      }));
    }
    const initial = this.items.find((o) => o.value === this.getAttribute("value"));
    if (initial) input.value = initial.label;

    this.ls.on(input, "input", () => this.open(input.value));
    this.ls.on(input, "focus", () => this.open(""));
    this.ls.on(input, "blur", () => setTimeout(() => this.close(), 120));
    this.ls.on(input, "keydown", (e) => this.key(e as KeyboardEvent));
    this.ls.on(list, "mousedown", (e) => e.preventDefault());
    this.ls.on(list, "click", (e) => {
      const li = (e.target as Element).closest<HTMLElement>(".oq-option");
      if (li?.dataset.index) this.pick(Number(li.dataset.index));
    });
    const toggle = root.querySelector(".oq-combobox__toggle");
    if (toggle) {
      this.ls.on(toggle, "mousedown", (e) => e.preventDefault());
      this.ls.on(toggle, "click", () => {
        if (this.list?.hidden) {
          input.focus();
          this.open("");
        } else this.close();
      });
    }
  }

  attributeChangedCallback(_n: string, _o: string | null, v: string | null): void {
    if (this.syncing || !this.ready) return;
    const opt = this.items.find((o) => o.value === v);
    const input = this.input;
    if (input) input.value = opt?.label ?? "";
    if (this.list && !this.list.hidden) this.render(this.query);
  }

  private visible(query: string): Array<{ o: ComboOption; i: number }> {
    const q = query.trim().toLowerCase();
    return this.items.map((o, i) => ({ o, i })).filter(({ o }) => !q || o.label.toLowerCase().includes(q));
  }

  private open(query: string): void {
    const input = this.input;
    const list = this.list;
    if (!input || !list) return;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    this.query = query;
    const vis = this.visible(query);
    this.active = query ? vis.findIndex(({ o }) => !o.disabled) : vis.findIndex(({ o }) => o.value === this.value);
    this.render(query);
    fitPanel(list, input, { max: 260 });
  }

  close(): void {
    const list = this.list;
    if (!list || list.hidden) return;
    list.hidden = true;
    this.input?.setAttribute("aria-expanded", "false");
    this.input?.removeAttribute("aria-activedescendant");
    this.active = -1;
  }

  private render(query: string): void {
    const list = this.list;
    const input = this.input;
    if (!list || !input) return;
    const vis = this.visible(query);
    const doc = this.ownerDocument;
    if (vis.length === 0) {
      list.replaceChildren(h(doc, "li", { class: "oq-listbox__empty", role: "presentation" }, this.getAttribute("empty-text") ?? "No results"));
      input.removeAttribute("aria-activedescendant");
      return;
    }
    list.replaceChildren(
      ...vis.map(({ o, i }, n) =>
        h(
          doc,
          "li",
          {
            class: "oq-option",
            role: "option",
            id: `${list.id}-${i}`,
            "data-index": String(i),
            "aria-selected": String(o.value === this.value),
            "aria-disabled": o.disabled ? "true" : undefined,
            "data-active": n === this.active ? "true" : undefined,
          },
          marked(doc, o.label, query.trim()),
        ),
      ),
    );
    const act = vis[this.active];
    if (act) {
      input.setAttribute("aria-activedescendant", `${list.id}-${act.i}`);
      list.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }

  private key(e: KeyboardEvent): void {
    const input = this.input;
    const list = this.list;
    if (!input || !list) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) this.open("");
      const vis = this.visible(this.query);
      if (vis.length === 0) return;
      const d = e.key === "ArrowDown" ? 1 : -1;
      let n = this.active;
      for (let k = 0; k < vis.length; k++) {
        n = (n + d + vis.length) % vis.length;
        if (!vis[n]?.o.disabled) break;
      }
      this.active = n;
      this.render(this.query);
    } else if (e.key === "Enter") {
      if (list.hidden) return;
      e.preventDefault();
      const hit = this.visible(this.query)[this.active];
      if (hit) this.pick(hit.i);
    } else if (e.key === "Escape") {
      if (!list.hidden) {
        e.preventDefault();
        this.close();
      } else if (input.value) {
        e.preventDefault();
        input.value = "";
      }
    } else if (e.key === "Tab") this.close();
  }

  private pick(index: number): void {
    const o = this.items[index];
    if (!o || o.disabled) return;
    const input = this.input;
    if (input) input.value = o.label;
    this.syncing = true;
    this.setAttribute("value", o.value);
    this.syncing = false;
    this.close();
    emit(this, "oq-change", { value: o.value, label: o.label });
  }
}
