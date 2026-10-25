import { emit, escapeHtml, glyph, numberAttr, OqElement, rootOf } from "./base";

/**
 * `<oq-number class="oq-number">` — a spin button around a text input.
 *
 * The −/+ buttons (`[data-dec]` / `[data-inc]`, or `.oq-number__btn` first/last) are created if
 * missing. ↑/↓ step, Shift×10, PageUp/PageDown ×10, Home/End go to min/max; typed values are
 * clamped and rounded to the step on blur or Enter.
 *
 * - Attributes: `min`, `max`, `step` (1), `value`.
 * - Event `oq-change` with `{ value }` whenever the committed number changes.
 */
export class OqNumber extends OqElement {
  static observedAttributes = ["min", "max", "step", "value"];
  private syncing = false;

  private get root(): HTMLElement {
    return rootOf(this, ".oq-number") ?? this;
  }
  private get input(): HTMLInputElement | null {
    return this.root.querySelector("input");
  }

  protected setup(): void {
    const root = this.root;
    root.classList.add("oq-number");
    const input = this.input;
    if (!input) return;
    let dec = root.querySelector<HTMLButtonElement>("[data-dec]");
    let inc = root.querySelector<HTMLButtonElement>("[data-inc]");
    if (!dec) {
      dec = this.button("Decrease", glyph.minus);
      dec.dataset.dec = "";
      root.prepend(dec);
    }
    if (!inc) {
      inc = this.button("Increase", glyph.plus);
      inc.dataset.inc = "";
      root.append(inc);
    }
    input.setAttribute("role", "spinbutton");
    if (!input.inputMode) input.inputMode = Number.isInteger(this.step) ? "numeric" : "decimal";
    if (this.hasAttribute("value")) input.value = this.getAttribute("value") ?? "";
    this.commit(false);
    this.ls.on(dec, "click", () => this.stepBy(-1));
    this.ls.on(inc, "click", () => this.stepBy(1));
    this.ls.on(input, "blur", () => this.commit(true));
    this.ls.on(input, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      const big = ke.shiftKey ? 10 : 1;
      const n = { ArrowUp: big, ArrowDown: -big, PageUp: 10, PageDown: -10 }[ke.key];
      if (n) {
        ke.preventDefault();
        this.stepBy(n);
      } else if (ke.key === "Home" && Number.isFinite(this.min)) {
        ke.preventDefault();
        this.set(this.min, true);
      } else if (ke.key === "End" && Number.isFinite(this.max)) {
        ke.preventDefault();
        this.set(this.max, true);
      } else if (ke.key === "Enter") this.commit(true);
    });
  }

  attributeChangedCallback(name: string, _o: string | null, v: string | null): void {
    if (this.syncing || !this.ready) return;
    const input = this.input;
    if (name === "value" && input) input.value = v ?? "";
    this.commit(false);
  }

  get min(): number {
    return numberAttr(this, "min", Number.NEGATIVE_INFINITY);
  }
  get max(): number {
    return numberAttr(this, "max", Number.POSITIVE_INFINITY);
  }
  get step(): number {
    const s = numberAttr(this, "step", 1);
    return s > 0 ? s : 1;
  }
  get value(): number {
    return Number(this.input?.value);
  }
  set value(n: number) {
    this.set(n, false);
  }

  stepBy(times: number): void {
    const cur = Number.parseFloat(this.input?.value ?? "");
    const base = Number.isFinite(cur) ? cur : Number.isFinite(this.min) ? this.min : 0;
    this.set(base + times * this.step, true);
  }

  private button(label: string, icon: string): HTMLButtonElement {
    const b = this.ownerDocument.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.className = "oq-number__btn";
    b.setAttribute("aria-label", label);
    b.innerHTML = icon;
    return b;
  }

  private commit(user: boolean): void {
    const n = Number.parseFloat(this.input?.value ?? "");
    if (Number.isFinite(n)) this.set(n, user);
    else this.refresh();
  }

  private set(n: number, user: boolean): void {
    const input = this.input;
    if (!input) return;
    const step = this.step;
    const decimals = (String(step).split(".")[1] ?? "").length;
    const clamped = Math.min(this.max, Math.max(this.min, n));
    const v = Number((Math.round(clamped / step) * step).toFixed(decimals));
    const fixed = Math.min(this.max, Math.max(this.min, v));
    input.value = String(fixed);
    this.syncing = true;
    this.setAttribute("value", input.value);
    this.syncing = false;
    this.refresh();
    if (user && fixed !== this.committed) emit(this, "oq-change", { value: fixed });
    this.committed = fixed;
  }

  /** The last value settled on, so `oq-change` fires only when the number really changes. */
  private committed: number | undefined;

  private refresh(): void {
    const input = this.input;
    if (!input) return;
    const n = Number(input.value);
    input.setAttribute("aria-valuenow", input.value);
    if (Number.isFinite(this.min)) input.setAttribute("aria-valuemin", String(this.min));
    if (Number.isFinite(this.max)) input.setAttribute("aria-valuemax", String(this.max));
    const dec = this.root.querySelector<HTMLButtonElement>("[data-dec]");
    const inc = this.root.querySelector<HTMLButtonElement>("[data-inc]");
    if (dec) dec.disabled = input.disabled || n <= this.min;
    if (inc) inc.disabled = input.disabled || n >= this.max;
  }
}

/**
 * `<oq-tag-input class="oq-tags">` — chips typed into an input.
 *
 * Enter or the separator adds; pasting a separated list adds every part; Backspace in an empty
 * input removes the last chip; duplicates (case-insensitive) and values failing `pattern` are
 * refused (`aria-invalid` flashes). Clicking the box focuses the input.
 *
 * - Attributes: `value` (the tags, joined by `separator`, default ","), `separator`,
 *   `pattern` (a regular expression each tag must match), `max` (most tags), `name` (keeps a
 *   hidden input in step for plain form posts).
 * - Events: `oq-change` with `{ tags }`; `oq-reject` with `{ value, reason }`.
 */
export class OqTagInput extends OqElement {
  static observedAttributes = ["value"];
  private list: string[] = [];
  private syncing = false;

  private get root(): HTMLElement {
    return rootOf(this, ".oq-tags") ?? this;
  }
  private get input(): HTMLInputElement | null {
    return this.root.querySelector("input:not([type=hidden])");
  }
  private get sep(): string {
    return this.getAttribute("separator") || ",";
  }

  get tags(): string[] {
    return this.list.slice();
  }
  set tags(t: string[]) {
    this.list = [];
    for (const x of t) this.addTag(x, false);
    this.render();
  }

  protected setup(): void {
    const root = this.root;
    root.classList.add("oq-tags");
    let input = this.input;
    if (!input) {
      input = this.ownerDocument.createElement("input");
      root.append(input);
    }
    const initial = this.getAttribute("value") ?? root.dataset.initial ?? "";
    this.list = [];
    for (const t of initial.split(this.sep)) this.addTag(t, false);
    this.render();
    this.ls.on(root, "click", (e) => {
      const rm = (e.target as Element).closest<HTMLElement>(".oq-chip__remove");
      if (rm?.dataset.tag !== undefined) this.removeTag(rm.dataset.tag);
      else if (e.target === root) this.input?.focus();
    });
    this.ls.on(input, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      const el = ke.target as HTMLInputElement;
      if (ke.key === "Enter" || ke.key === this.sep) {
        if (!el.value.trim()) return;
        ke.preventDefault();
        if (this.addTag(el.value, true)) el.value = "";
        this.render();
      } else if (ke.key === "Backspace" && el.value === "" && this.list.length) {
        const last = this.list[this.list.length - 1];
        if (last !== undefined) this.removeTag(last);
      }
    });
    this.ls.on(input, "paste", (e) => {
      const text = (e as ClipboardEvent).clipboardData?.getData("text") ?? "";
      if (!text.includes(this.sep) && !text.includes("\n")) return;
      e.preventDefault();
      for (const part of text.split(new RegExp(`[${escapeRe(this.sep)}\\n]`))) this.addTag(part, true);
      this.render();
    });
    this.ls.on(input, "blur", () => {
      const el = this.input;
      if (el?.value.trim() && this.addTag(el.value, true)) {
        el.value = "";
        this.render();
      }
    });
  }

  attributeChangedCallback(_n: string, _o: string | null, v: string | null): void {
    if (this.syncing || !this.ready) return;
    this.list = [];
    for (const t of (v ?? "").split(this.sep)) this.addTag(t, false);
    this.render();
  }

  /** Add a tag; returns whether it was accepted. */
  addTag(raw: string, user = true): boolean {
    const value = raw.trim();
    if (!value) return false;
    const reject = (reason: string) => {
      if (user) {
        emit(this, "oq-reject", { value, reason });
        this.flash();
      }
      return false;
    };
    if (this.list.some((t) => t.toLowerCase() === value.toLowerCase())) return reject("duplicate");
    const pattern = this.getAttribute("pattern");
    if (pattern && !new RegExp(`^(?:${pattern})$`).test(value)) return reject("pattern");
    if (this.list.length >= numberAttr(this, "max", Number.POSITIVE_INFINITY)) return reject("max");
    this.list.push(value);
    if (this.ready) this.render();
    if (user) this.changed();
    return true;
  }

  removeTag(tag: string): void {
    const i = this.list.indexOf(tag);
    if (i < 0) return;
    this.list.splice(i, 1);
    this.render();
    this.changed();
    this.input?.focus();
  }

  private changed(): void {
    this.syncing = true;
    this.setAttribute("value", this.list.join(this.sep));
    this.syncing = false;
    emit(this, "oq-change", { tags: this.tags });
  }

  private flash(): void {
    const root = this.root;
    root.setAttribute("aria-invalid", "true");
    setTimeout(() => root.removeAttribute("aria-invalid"), 900);
  }

  private render(): void {
    const root = this.root;
    const input = this.input;
    for (const chip of root.querySelectorAll(":scope > .oq-chip")) chip.remove();
    for (const t of this.list) {
      const chip = this.ownerDocument.createElement("span");
      chip.className = "oq-chip oq-neutral";
      chip.innerHTML = `${escapeHtml(t)}<button type="button" class="oq-chip__remove" aria-label="Remove ${escapeHtml(t)}">×</button>`;
      (chip.querySelector("button") as HTMLElement).dataset.tag = t;
      root.insertBefore(chip, input);
    }
    const name = this.getAttribute("name");
    if (name) {
      let hidden = root.querySelector<HTMLInputElement>("input[type=hidden]");
      if (!hidden) {
        hidden = this.ownerDocument.createElement("input");
        hidden.type = "hidden";
        root.append(hidden);
      }
      hidden.name = name;
      hidden.value = this.list.join(this.sep);
    }
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

export interface DropRejection {
  file: File;
  reason: "type" | "size";
}

/**
 * `<oq-dropzone class="oq-dropzone">` — a drop area around a hidden `input[type=file]`.
 *
 * Click, Enter or Space opens the file picker (a `<label>` root does that natively); dragging
 * files over sets `data-over="true"`. Files are checked against the input's `accept` and the
 * `max-size` attribute (bytes).
 *
 * - `list`: selector of a `ul.oq-filelist` to show accepted and refused files in, each with a
 *   remove button.
 * - Events: `oq-files` with `{ files, rejected }` for every drop or pick; `oq-remove` with
 *   `{ file }` when one is removed from the list.
 */
export class OqDropzone extends OqElement {
  private kept: File[] = [];

  private get root(): HTMLElement {
    return rootOf(this, ".oq-dropzone") ?? this;
  }
  private get input(): HTMLInputElement | null {
    return this.root.querySelector("input[type=file]");
  }

  /** Files accepted so far and not removed. */
  get files(): File[] {
    return this.kept.slice();
  }

  protected setup(): void {
    const root = this.root;
    root.classList.add("oq-dropzone");
    if (root.tabIndex < 0) root.tabIndex = 0;
    if (!root.hasAttribute("role") && root.tagName !== "LABEL") root.setAttribute("role", "button");
    let input = this.input;
    if (!input) {
      input = this.ownerDocument.createElement("input");
      input.type = "file";
      input.multiple = true;
      root.append(input);
    }
    input.tabIndex = -1;
    const pick = () => this.input?.click();
    if (root.tagName !== "LABEL") this.ls.on(root, "click", (e) => e.target !== this.input && pick());
    this.ls.on(root, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.target === root && (ke.key === "Enter" || ke.key === " ")) {
        ke.preventDefault();
        pick();
      }
    });
    this.ls.on(root, "dragover", (e) => {
      e.preventDefault();
      root.dataset.over = "true";
    });
    this.ls.on(root, "dragleave", (e) => {
      if (!root.contains((e as DragEvent).relatedTarget as Node | null)) root.dataset.over = "false";
    });
    this.ls.on(root, "drop", (e) => {
      e.preventDefault();
      root.dataset.over = "false";
      this.take([...((e as DragEvent).dataTransfer?.files ?? [])]);
    });
    this.ls.on(input, "change", () => {
      const el = this.input;
      if (!el) return;
      this.take([...(el.files ?? [])]);
      el.value = "";
    });
    const list = this.listEl();
    if (list) {
      this.ls.on(list, "click", (e) => {
        const btn = (e.target as Element).closest<HTMLElement>("[data-file-index]");
        if (!btn) return;
        const f = this.kept[Number(btn.dataset.fileIndex)];
        if (!f) return;
        this.kept = this.kept.filter((x) => x !== f);
        emit(this, "oq-remove", { file: f });
        this.renderList([]);
      });
    }
  }

  /** Feed files in as if they had been dropped (also used by tests). */
  take(files: File[]): void {
    const accept = this.input?.accept ?? "";
    const max = numberAttr(this, "max-size", Number.POSITIVE_INFINITY);
    const ok: File[] = [];
    const rejected: DropRejection[] = [];
    for (const f of files) {
      if (!accepts(f, accept)) rejected.push({ file: f, reason: "type" });
      else if (f.size > max) rejected.push({ file: f, reason: "size" });
      else ok.push(f);
    }
    if (this.input && !this.input.multiple) this.kept = ok.slice(0, 1);
    else this.kept.push(...ok);
    this.renderList(rejected);
    emit(this, "oq-files", { files: ok, rejected });
  }

  private listEl(): HTMLElement | null {
    const sel = this.getAttribute("list");
    return sel ? this.ownerDocument.querySelector(sel) : null;
  }

  private renderList(rejected: DropRejection[]): void {
    const list = this.listEl();
    if (!list) return;
    const row = (f: File, meta: string, i: number | null, error: boolean) => {
      const ext = (f.name.split(".").pop() ?? "").slice(0, 4);
      return `<li class="oq-file${error ? " oq-danger" : ""}"${error ? ' data-state="error"' : ""}>
        <span class="oq-file__icon">${escapeHtml(ext)}</span>
        <span class="oq-file__name"><span>${escapeHtml(f.name)}</span><span class="oq-file__meta">${escapeHtml(meta)}</span></span>
        ${i === null ? "<span></span>" : `<button type="button" class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral oq-sm" aria-label="Remove ${escapeHtml(f.name)}" data-file-index="${i}">${glyph.close}</button>`}
      </li>`;
    };
    list.innerHTML =
      this.kept.map((f, i) => row(f, formatBytes(f.size), i, false)).join("") +
      rejected.map((r) => row(r.file, r.reason === "size" ? `${formatBytes(r.file.size)} — too large` : "File type not accepted", null, true)).join("");
  }
}

/** Whether a file matches an `accept` list like ".csv,application/json,image/*". */
export function accepts(file: File, accept: string): boolean {
  const rules = accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return rules.some((r) => (r.startsWith(".") ? name.endsWith(r) : r.endsWith("/*") ? type.startsWith(r.slice(0, -1)) : type === r));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}
