import { emit, h, marked, OqElement, rootOf, uid } from "./base";
import { closeDialog, installOpener, showDialog } from "./dialog";

export interface PaletteCommand {
  value: string;
  label: string;
  group?: string;
  /** Extra words to match on. */
  keywords?: string;
  /** Shown on the right, e.g. a shortcut. */
  hint?: string;
  /** Navigate here when picked. */
  href?: string;
}

/**
 * `<oq-command-palette>` around a `<dialog class="oq-palette">` holding a
 * `.oq-palette__search > input` and a `ul.oq-palette__list`.
 *
 * Commands come from the list's `li.oq-option` children (`data-value`, `data-group`,
 * `data-keywords`, `data-hint`, `data-href`) or from the `commands` property.
 *
 * - Opens on the `hotkey` attribute (default `mod+k`: Ctrl+K, or ⌘K on a Mac), on
 *   `[data-oq-open="<id>"]`, or `show()`. Escape or a backdrop click closes it.
 * - Typing filters label and keywords; ↑/↓ move, Enter runs.
 * - Event `oq-select` with `{ value, label, command }`; cancel it to stop `href` navigation.
 */
export class OqCommandPalette extends OqElement {
  static observedAttributes = ["hotkey"];
  private cmds: PaletteCommand[] = [];
  private shown: PaletteCommand[] = [];
  private active = 0;

  private get dialog(): HTMLDialogElement | null {
    return rootOf<HTMLDialogElement>(this, "dialog");
  }
  private get input(): HTMLInputElement | null {
    return this.dialog?.querySelector("input") ?? null;
  }
  private get list(): HTMLElement | null {
    return this.dialog?.querySelector(".oq-palette__list") ?? null;
  }

  get commands(): PaletteCommand[] {
    return this.cmds.slice();
  }
  set commands(c: PaletteCommand[]) {
    this.cmds = c.slice();
    this.filter();
  }

  protected setup(): void {
    installOpener();
    const d = this.dialog;
    const input = this.input;
    const list = this.list;
    if (!d || !input || !list) return;
    if (!list.id) list.id = uid("oq-palette");
    list.setAttribute("role", "listbox");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-expanded", "true");
    input.autocomplete = "off";
    if (this.cmds.length === 0) {
      this.cmds = [...list.querySelectorAll<HTMLElement>(".oq-option")].map((li) => {
        const c: PaletteCommand = { value: li.dataset.value ?? li.textContent?.trim() ?? "", label: li.textContent?.trim() ?? "" };
        if (li.dataset.group) c.group = li.dataset.group;
        if (li.dataset.keywords) c.keywords = li.dataset.keywords;
        if (li.dataset.hint) c.hint = li.dataset.hint;
        if (li.dataset.href) c.href = li.dataset.href;
        return c;
      });
    }
    this.filter();
    this.ls.on(this.ownerDocument, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (matchesHotkey(ke, this.getAttribute("hotkey") ?? "mod+k")) {
        ke.preventDefault();
        if (d.open) this.close();
        else this.show();
      }
    });
    this.ls.on(input, "input", () => {
      this.active = 0;
      this.filter();
    });
    this.ls.on(input, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "ArrowDown" || ke.key === "ArrowUp") {
        ke.preventDefault();
        if (this.shown.length === 0) return;
        this.active = (this.active + (ke.key === "ArrowDown" ? 1 : -1) + this.shown.length) % this.shown.length;
        this.render();
      } else if (ke.key === "Enter") {
        ke.preventDefault();
        this.run(this.active);
      }
    });
    this.ls.on(list, "click", (e) => {
      const li = (e.target as Element).closest<HTMLElement>(".oq-option");
      if (li?.dataset.index) this.run(Number(li.dataset.index));
    });
    this.ls.on(list, "mousemove", (e) => {
      const li = (e.target as Element).closest<HTMLElement>(".oq-option");
      const n = Number(li?.dataset.index ?? -1);
      if (n >= 0 && n !== this.active) {
        this.active = n;
        this.render();
      }
    });
    this.ls.on(d, "click", (e) => {
      if (e.target === d) this.close();
    });
  }

  attributeChangedCallback(): void {}

  show(): void {
    const d = this.dialog;
    if (!d || d.open) return;
    const input = this.input;
    if (input) input.value = "";
    this.active = 0;
    this.filter();
    showDialog(d);
    input?.focus();
    emit(this, "oq-open", {});
  }

  close(): void {
    const d = this.dialog;
    if (d?.open) closeDialog(d);
  }

  private filter(): void {
    const q = (this.input?.value ?? "").trim().toLowerCase();
    this.shown = this.cmds.filter((c) => !q || `${c.label} ${c.keywords ?? ""} ${c.group ?? ""}`.toLowerCase().includes(q));
    if (this.active >= this.shown.length) this.active = 0;
    this.render();
  }

  private render(): void {
    const list = this.list;
    const input = this.input;
    if (!list || !input) return;
    const doc = this.ownerDocument;
    if (this.shown.length === 0) {
      list.replaceChildren(h(doc, "li", { class: "oq-listbox__empty", role: "presentation" }, this.getAttribute("empty-text") ?? "No matching commands"));
      input.removeAttribute("aria-activedescendant");
      return;
    }
    const q = input.value.trim();
    let group: string | undefined;
    const items: HTMLLIElement[] = [];
    this.shown.forEach((c, i) => {
      if (c.group && c.group !== group) items.push(h(doc, "li", { class: "oq-listbox__group oq-overline", role: "presentation" }, c.group));
      group = c.group;
      items.push(
        h(
          doc,
          "li",
          {
            class: "oq-option",
            role: "option",
            id: `${list.id}-${i}`,
            "data-index": String(i),
            "aria-selected": String(i === this.active),
            "data-active": i === this.active ? "true" : undefined,
          },
          h(doc, "span", {}, marked(doc, c.label, q)),
          c.hint ? h(doc, "span", { class: "oq-option__hint" }, c.hint) : null,
        ),
      );
    });
    list.replaceChildren(...items);
    input.setAttribute("aria-activedescendant", `${list.id}-${this.active}`);
    list.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
  }

  private run(i: number): void {
    const c = this.shown[i];
    if (!c) return;
    const go = emit(this, "oq-select", { value: c.value, label: c.label, command: c }, true);
    this.close();
    if (go && c.href) location.assign(c.href);
  }
}

/** Whether a key event matches a spec like "mod+k", "ctrl+shift+p" or "/". `mod` is ⌘ on a Mac, Ctrl elsewhere. */
export function matchesHotkey(e: KeyboardEvent, spec: string): boolean {
  const parts = spec.toLowerCase().split("+");
  const key = parts.pop();
  if (!key || e.key.toLowerCase() !== key) return false;
  const mac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform ?? "");
  const want = {
    ctrl: parts.includes("ctrl") || (parts.includes("mod") && !mac),
    meta: parts.includes("meta") || (parts.includes("mod") && mac),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
  return e.ctrlKey === want.ctrl && e.metaKey === want.meta && e.shiftKey === want.shift && e.altKey === want.alt;
}
