import { emit, OqElement, rootOf } from "./base";

export type SortDirection = "ascending" | "descending" | "none";

/**
 * `<oq-sortable-table>` around a `table.oq-table`. Header cells with an `aria-sort` attribute
 * become sort buttons: a click (or Enter/Space) cycles ascending → descending → original order.
 *
 * Cells sort by `data-sort-value` when present, else their text. Two values that both read as
 * numbers ("1,204", "98.6 %", "-3") compare numerically; anything else compares as text with
 * numeric runs in order ("node-2" before "node-10"). Empty cells always go last.
 *
 * Event `oq-sort` with `{ column, key, direction }` (`key` is the header's `data-key`).
 */
export class OqSortableTable extends OqElement {
  private original: HTMLTableRowElement[] = [];

  private get table(): HTMLTableElement | null {
    return rootOf<HTMLTableElement>(this, "table");
  }

  protected setup(): void {
    const table = this.table;
    if (!table) return;
    this.original = this.rows();
    for (const th of this.headers()) {
      if (!th.hasAttribute("tabindex")) th.tabIndex = 0;
      if (!th.getAttribute("aria-sort")) th.setAttribute("aria-sort", "none");
    }
    this.ls.on(table, "click", (e) => {
      const th = (e.target as Element).closest<HTMLTableCellElement>("th[aria-sort]");
      if (th && this.headers().includes(th)) this.cycle(th);
    });
    this.ls.on(table, "keydown", (e) => {
      const ke = e as KeyboardEvent;
      const th = (ke.target as Element).closest<HTMLTableCellElement>("th[aria-sort]");
      if (!th || (ke.key !== "Enter" && ke.key !== " ")) return;
      ke.preventDefault();
      this.cycle(th);
    });
    const preset = this.headers().find((th) => th.getAttribute("aria-sort") !== "none");
    if (preset) this.sort(preset, preset.getAttribute("aria-sort") as SortDirection, false);
  }

  /** Sort by a column (index among the header row's cells) programmatically. */
  sortBy(column: number, direction: SortDirection): void {
    const th = this.table?.querySelector<HTMLTableCellElement>(`thead tr > :nth-child(${column + 1})`);
    if (th) this.sort(th, direction, true);
  }

  /** Forget the remembered original order, e.g. after replacing the rows. */
  refresh(): void {
    this.original = this.rows();
  }

  private body(): HTMLTableSectionElement | null {
    return this.table?.querySelector("tbody") ?? null;
  }

  private rows(): HTMLTableRowElement[] {
    return [...(this.body()?.querySelectorAll<HTMLTableRowElement>(":scope > tr") ?? [])];
  }

  private headers(): HTMLTableCellElement[] {
    return [...(this.table?.querySelectorAll<HTMLTableCellElement>("thead th[aria-sort]") ?? [])];
  }

  private cycle(th: HTMLTableCellElement): void {
    const cur = th.getAttribute("aria-sort");
    const next: SortDirection = cur === "ascending" ? "descending" : cur === "descending" ? "none" : "ascending";
    this.sort(th, next, true);
  }

  private sort(th: HTMLTableCellElement, dir: SortDirection, user: boolean): void {
    const body = this.body();
    if (!body) return;
    for (const h of this.headers()) h.setAttribute("aria-sort", h === th ? dir : "none");
    const col = [...(th.parentElement?.children ?? [])].indexOf(th);
    // Rows added since the last sort keep their place at the end of the original order.
    const known = new Set(this.original);
    for (const r of this.rows()) if (!known.has(r)) this.original.push(r);
    this.original = this.original.filter((r) => r.parentElement === body);
    let rows = this.original.slice();
    if (dir !== "none") {
      const sign = dir === "ascending" ? 1 : -1;
      rows = rows
        .map((r, i) => ({ r, i, v: cellValue(r.children[col] as HTMLTableCellElement | undefined) }))
        .sort((a, b) => {
          if (a.v === "" || b.v === "") return a.v === b.v ? a.i - b.i : a.v === "" ? 1 : -1;
          return compare(a.v, b.v) * sign || a.i - b.i;
        })
        .map((x) => x.r);
    }
    body.append(...rows);
    if (user) emit(this, "oq-sort", { column: col, key: th.dataset.key ?? null, direction: dir });
  }
}

function cellValue(cell: HTMLTableCellElement | undefined): string {
  if (!cell) return "";
  return (cell.dataset.sortValue ?? cell.textContent ?? "").trim();
}

const NUMERIC = /^[-+]?[\d\s,  ]*\.?\d+(?:e[-+]?\d+)?\s*[%a-zµ/]*$/i;

function asNumber(v: string): number | null {
  if (!NUMERIC.test(v)) return null;
  const n = Number.parseFloat(v.replace(/[\s,  ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const collator = typeof Intl !== "undefined" ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }) : null;

/** Numbers numerically, everything else as natural-order text. Exported for tests. */
export function compare(a: string, b: string): number {
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null && nb !== null) return na - nb;
  return collator ? collator.compare(a, b) : a < b ? -1 : a > b ? 1 : 0;
}
