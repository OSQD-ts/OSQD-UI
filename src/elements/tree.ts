import { emit, OqElement, rootOf } from "./base";

/**
 * `<oq-tree>` around a `ul.oq-tree[role=tree]` of `li[role=treeitem]`; a parent item holds its
 * children in a nested `ul[role=group]` and carries `aria-expanded`. Each item's first child is
 * its `.oq-tree__row`. Items are identified by `data-id` (falling back to their row's text).
 *
 * Keyboard (the standard tree pattern): ↑/↓ move through visible items, → opens a closed parent
 * or moves into an open one, ← closes an open parent or moves to the parent, Home/End jump,
 * Enter/Space select, `*` opens every sibling. One item is in the tab order at a time.
 *
 * - `value` attribute: the selected item's id. Setting it selects (and reveals) that item.
 * - Events: `oq-select` with `{ id, item }`; `oq-toggle` with `{ id, expanded }`.
 */
export class OqTree extends OqElement {
  static observedAttributes = ["value"];
  private syncing = false;

  private get tree(): HTMLElement | null {
    return rootOf(this, '[role="tree"]');
  }

  private items(): HTMLElement[] {
    return [...(this.tree?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])];
  }

  /** Items whose ancestors are all expanded, in document order. */
  private visibleItems(): HTMLElement[] {
    return this.items().filter((it) => {
      let p = it.parentElement?.closest<HTMLElement>('[role="treeitem"]');
      while (p) {
        if (p.getAttribute("aria-expanded") !== "true") return false;
        p = p.parentElement?.closest<HTMLElement>('[role="treeitem"]');
      }
      return true;
    });
  }

  protected setup(): void {
    const tree = this.tree;
    if (!tree) return;
    const items = this.items();
    for (const it of items) {
      it.tabIndex = -1;
      if (it.querySelector(':scope > [role="group"]') && !it.hasAttribute("aria-expanded")) it.setAttribute("aria-expanded", "false");
      if (!it.hasAttribute("aria-selected")) it.setAttribute("aria-selected", "false");
    }
    const want = this.getAttribute("value");
    const sel = (want && this.find(want)) || items.find((it) => it.getAttribute("aria-selected") === "true");
    if (sel) this.select(sel, false);
    const first = sel ?? this.visibleItems()[0];
    if (first) first.tabIndex = 0;

    this.ls.on(tree, "click", (e) => {
      const target = e.target as Element;
      const it = target.closest<HTMLElement>('[role="treeitem"]');
      if (!it || !target.closest(".oq-tree__row")) return;
      if (target.closest(".oq-tree__twisty") && it.hasAttribute("aria-expanded")) this.toggle(it);
      else {
        this.select(it, true);
        if (it.hasAttribute("aria-expanded") && it.getAttribute("aria-expanded") === "false") this.toggle(it, true);
      }
      this.focusItem(it);
    });
    this.ls.on(tree, "keydown", (e) => this.key(e as KeyboardEvent));
  }

  attributeChangedCallback(_n: string, _o: string | null, v: string | null): void {
    if (this.syncing || !this.ready || !v) return;
    const it = this.find(v);
    if (!it) return;
    let p = it.parentElement?.closest<HTMLElement>('[role="treeitem"]');
    while (p) {
      p.setAttribute("aria-expanded", "true");
      p = p.parentElement?.closest<HTMLElement>('[role="treeitem"]');
    }
    this.select(it, false);
  }

  get value(): string | null {
    return this.getAttribute("value");
  }
  set value(v: string) {
    this.setAttribute("value", v);
  }

  /** Open or close a parent item; `force` sets the state instead of flipping it. */
  toggle(it: HTMLElement, force?: boolean): void {
    if (!it.hasAttribute("aria-expanded")) return;
    const open = force ?? it.getAttribute("aria-expanded") !== "true";
    if ((it.getAttribute("aria-expanded") === "true") === open) return;
    it.setAttribute("aria-expanded", String(open));
    emit(this, "oq-toggle", { id: idOf(it), expanded: open });
  }

  private find(id: string): HTMLElement | undefined {
    return this.items().find((it) => idOf(it) === id);
  }

  private select(it: HTMLElement, user: boolean): void {
    for (const x of this.items()) x.setAttribute("aria-selected", String(x === it));
    this.syncing = true;
    this.setAttribute("value", idOf(it));
    this.syncing = false;
    if (user) emit(this, "oq-select", { id: idOf(it), item: it });
  }

  private focusItem(it: HTMLElement): void {
    for (const x of this.items()) x.tabIndex = x === it ? 0 : -1;
    it.focus();
  }

  private key(e: KeyboardEvent): void {
    const cur = (e.target as Element).closest<HTMLElement>('[role="treeitem"]');
    if (!cur) return;
    const vis = this.visibleItems();
    const i = vis.indexOf(cur);
    const expanded = cur.getAttribute("aria-expanded");
    let next: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowDown":
        next = vis[i + 1];
        break;
      case "ArrowUp":
        next = vis[i - 1];
        break;
      case "Home":
        next = vis[0];
        break;
      case "End":
        next = vis[vis.length - 1];
        break;
      case "ArrowRight":
        if (expanded === "false") this.toggle(cur, true);
        else if (expanded === "true") next = cur.querySelector<HTMLElement>('[role="group"] [role="treeitem"]') ?? undefined;
        break;
      case "ArrowLeft":
        if (expanded === "true") this.toggle(cur, false);
        else next = cur.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
        break;
      case "Enter":
      case " ":
        this.select(cur, true);
        break;
      case "*":
        for (const sib of cur.parentElement?.querySelectorAll<HTMLElement>(':scope > [role="treeitem"][aria-expanded]') ?? []) this.toggle(sib, true);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next) this.focusItem(next);
  }
}

const idOf = (it: HTMLElement) => it.dataset.id ?? it.querySelector(".oq-tree__row")?.textContent?.trim() ?? "";
