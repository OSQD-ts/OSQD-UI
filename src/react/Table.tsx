import { Fragment, type HTMLAttributes, type Key, type ReactNode, type TableHTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import { type Color, colorClass, cx } from "./cx";
import { Checkbox } from "./Form";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  dense?: boolean;
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  /** Wrap in a scrolling, bordered container (the usual case). Default true. */
  wrapped?: boolean;
  /** Max height of the wrapper; the header sticks while the body scrolls. */
  maxHeight?: number | string;
  /**
   * What happens on a phone (≤640px). "scroll" (default): the table scrolls sideways inside its
   * wrapper. "stack": each row becomes a card of label–value lines, the labels taken from the
   * header cells (or a cell's own `data-label`).
   */
  responsive?: "scroll" | "stack";
}

/** A styled HTML table with dense, striped, hover and bordered options and a sticky header. */
export function Table({ dense, striped, hover, bordered, wrapped = true, maxHeight, responsive = "scroll", className, ...rest }: TableProps) {
  const ref = useRef<HTMLTableElement>(null);
  const stack = responsive === "stack";
  // Stacked rows label each value from its column's header cell; a cell's own data-label wins.
  useEffect(() => {
    if (stack && ref.current) labelCells(ref.current);
  });
  const table = (
    <table
      ref={ref}
      {...rest}
      className={cx(
        "oq-table",
        stack && "oq-table--stack",
        dense && "oq-table--dense",
        striped && "oq-table--striped",
        hover && "oq-table--hover",
        bordered && "oq-table--bordered",
        className,
      )}
    />
  );
  if (!wrapped) return table;
  return (
    <div className="oq-table-wrap" style={maxHeight !== undefined ? { maxHeight } : undefined}>
      {table}
    </div>
  );
}

function labelCells(table: HTMLTableElement) {
  const head = table.tHead?.rows[0];
  if (!head) return;
  const labels: string[] = [];
  for (const th of Array.from(head.cells)) for (let i = 0; i < th.colSpan; i++) labels.push(th.textContent?.trim() ?? "");
  for (const body of [...Array.from(table.tBodies), ...(table.tFoot ? [table.tFoot] : [])]) {
    for (const row of Array.from(body.rows)) {
      let col = 0;
      for (const cell of Array.from(row.cells)) {
        if (!cell.hasAttribute("data-label") || cell.hasAttribute("data-label-auto")) {
          cell.setAttribute("data-label", labels[col] ?? "");
          cell.setAttribute("data-label-auto", "");
        }
        col += cell.colSpan;
      }
    }
  }
}

/* ---------- DataTable ---------- */

export type SortDirection = "asc" | "desc";
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface Column<Row> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  /** Cell content; defaults to `row[key]`. */
  render?: (row: Row, index: number) => ReactNode;
  sortable?: boolean;
  /** Value to sort by when it differs from `row[key]`. */
  sortValue?: (row: Row) => string | number | null | undefined;
  width?: number | string;
  /** Monospace cell (ids, hashes). */
  mono?: boolean;
}

export interface DataTableProps<Row> extends Omit<TableProps, "children"> {
  columns: Array<Column<Row>>;
  rows: Row[];
  /** Stable row key; defaults to `row.id`, then the index. */
  rowKey?: (row: Row, index: number) => Key;
  /** Controlled sort. Without it the table sorts itself. */
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Turn on row checkboxes; `selected` holds row keys. */
  selectable?: boolean;
  selected?: Key[];
  onSelectedChange?: (keys: Key[]) => void;
  onRowClick?: (row: Row) => void;
  empty?: ReactNode;
  /**
   * Content of an expandable detail row under each row. Adds an expander button as the first
   * column (`.oq-table__expander`); the detail row is `tr.oq-table__detail`.
   */
  renderDetail?: (row: Row) => ReactNode;
  /** Controlled set of expanded row keys. */
  expanded?: Key[];
  defaultExpanded?: Key[];
  onExpandedChange?: (keys: Key[]) => void;
  /**
   * Group rows under header rows (`tr.oq-table__group`), in the order the groups first appear.
   * Groups keep the table's sort inside them.
   */
  groupBy?: (row: Row) => string;
  /** Header row content for a group; defaults to the group name and its row count. */
  renderGroup?: (group: string, rows: Row[]) => ReactNode;
  /** A left-edge accent in an intent colour (`tr.oq-row-accent`), e.g. for blocked requests. */
  rowAccent?: (row: Row) => Color | undefined;
}

const cellValue = (row: unknown, key: string) => (row as Record<string, unknown>)[key];

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Columns + rows in, a sortable, selectable table out. Sorting is client-side unless `sort` is controlled. */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  selectable,
  selected: selectedProp,
  onSelectedChange,
  onRowClick,
  empty = "No rows",
  hover,
  renderDetail,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  groupBy,
  renderGroup,
  rowAccent,
  ...rest
}: DataTableProps<Row>) {
  const [innerSort, setInnerSort] = useState<SortState | null>(defaultSort);
  const [innerExpanded, setInnerExpanded] = useState<Key[]>(defaultExpanded);
  const expanded = new Set(expandedProp ?? innerExpanded);
  const toggleExpanded = (k: Key) => {
    const next = expanded.has(k) ? [...expanded].filter((x) => x !== k) : [...expanded, k];
    if (expandedProp === undefined) setInnerExpanded(next);
    onExpandedChange?.(next);
  };
  const [innerSelected, setInnerSelected] = useState<Key[]>([]);
  const sort = sortProp !== undefined ? sortProp : innerSort;
  const selected = selectedProp ?? innerSelected;

  const keyOf = (row: Row, i: number): Key => {
    if (rowKey) return rowKey(row, i);
    const id = cellValue(row, "id");
    return typeof id === "string" || typeof id === "number" ? id : i;
  };

  const sorted = useMemo(() => {
    // Controlled sort means the caller sorts (often on the server); only sort locally when uncontrolled.
    if (!sort || sortProp !== undefined) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const value = col.sortValue ?? ((r: Row) => cellValue(r, col.key));
    const out = [...rows].sort((a, b) => compare(value(a), value(b)));
    return sort.direction === "desc" ? out.reverse() : out;
  }, [rows, columns, sort, sortProp]);

  const cycleSort = (key: string) => {
    // asc → desc → off
    const next: SortState | null =
      sort?.key !== key ? { key, direction: "asc" } : sort.direction === "asc" ? { key, direction: "desc" } : null;
    if (sortProp === undefined) setInnerSort(next);
    onSortChange?.(next);
  };

  const setSelected = (keys: Key[]) => {
    if (selectedProp === undefined) setInnerSelected(keys);
    onSelectedChange?.(keys);
  };

  const allKeys = sorted.map(keyOf);
  const chosen = new Set(selected);
  const allOn = allKeys.length > 0 && allKeys.every((k) => chosen.has(k));
  const someOn = !allOn && allKeys.some((k) => chosen.has(k));
  const align = (c: Column<Row>) => (c.align === "right" ? "oq-num" : undefined);
  const span = columns.length + (selectable ? 1 : 0) + (renderDetail ? 1 : 0);

  // Groups in order of first appearance; without groupBy, one unnamed group.
  const groups = useMemo(() => {
    if (!groupBy) return [{ name: "", rows: sorted.map((row, i) => ({ row, i })) }];
    const byName = new Map<string, Array<{ row: Row; i: number }>>();
    sorted.forEach((row, i) => {
      const name = groupBy(row);
      const list = byName.get(name);
      if (list) list.push({ row, i });
      else byName.set(name, [{ row, i }]);
    });
    return [...byName].map(([name, rows]) => ({ name, rows }));
  }, [sorted, groupBy]);

  return (
    <Table {...rest} hover={hover ?? Boolean(onRowClick || selectable)}>
      <thead>
        <tr>
          {renderDetail && (
            <th className="oq-table__expand-col">
              <span className="oq-sr-only">Details</span>
            </th>
          )}
          {selectable && (
            <th className="oq-table__check">
              <label className="oq-table__check-hit">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allOn}
                  indeterminate={someOn}
                  onChange={() => setSelected(allOn ? [] : allKeys)}
                />
              </label>
            </th>
          )}
          {columns.map((c) => (
            <th
              key={c.key}
              className={align(c)}
              style={c.width !== undefined ? { width: c.width, textAlign: c.align } : c.align === "center" ? { textAlign: "center" } : undefined}
              aria-sort={c.sortable ? (sort?.key === c.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
              tabIndex={c.sortable ? 0 : undefined}
              onClick={c.sortable ? () => cycleSort(c.key) : undefined}
              onKeyDown={
                c.sortable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        cycleSort(c.key);
                      }
                    }
                  : undefined
              }
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={span}>
              <div className="oq-empty">{empty}</div>
            </td>
          </tr>
        ) : (
          groups.map((group) => (
            <Fragment key={`g:${group.name}`}>
              {groupBy && (
                <tr className="oq-table__group">
                  <th colSpan={span} scope="colgroup">
                    {renderGroup ? (
                      renderGroup(group.name, group.rows.map((r) => r.row))
                    ) : (
                      <>
                        {group.name} <span className="oq-table__group-count">{group.rows.length}</span>
                      </>
                    )}
                  </th>
                </tr>
              )}
              {group.rows.map(({ row, i }) => {
                const k = keyOf(row, i);
                const isSel = chosen.has(k);
                const open = renderDetail ? expanded.has(k) : false;
                const accent = rowAccent?.(row);
                const detailId = renderDetail ? `oq-detail-${String(k).replace(/[^\w-]/g, "_")}` : undefined;
                return (
                  <Fragment key={k}>
                    <tr
                      aria-selected={selectable ? isSel : undefined}
                      className={accent ? cx("oq-row-accent", colorClass(accent)) : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      style={onRowClick ? { cursor: "pointer" } : undefined}
                    >
                      {renderDetail && (
                        <td className="oq-table__expand-col" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="oq-table__expander"
                            aria-expanded={open}
                            aria-controls={detailId}
                            aria-label={open ? "Hide details" : "Show details"}
                            onClick={() => toggleExpanded(k)}
                          >
                            <ChevronDownIcon />
                          </button>
                        </td>
                      )}
                      {selectable && (
                        <td className="oq-table__check" onClick={(e) => e.stopPropagation()}>
                          <label className="oq-table__check-hit">
                            <Checkbox
                              aria-label="Select row"
                              checked={isSel}
                              onChange={() => setSelected(isSel ? selected.filter((x) => x !== k) : [...selected, k])}
                            />
                          </label>
                        </td>
                      )}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cx(align(c), c.mono && "oq-mono")}
                          style={c.align === "center" ? { textAlign: "center" } : undefined}
                          data-label={typeof c.header === "string" ? c.header : undefined}
                        >
                          {c.render ? c.render(row, i) : (cellValue(row, c.key) as ReactNode)}
                        </td>
                      ))}
                    </tr>
                    {renderDetail && (
                      <tr className="oq-table__detail" id={detailId} hidden={!open}>
                        <td colSpan={span}>{open ? renderDetail(row) : null}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))
        )}
      </tbody>
    </Table>
  );
}

export type TableSectionProps = HTMLAttributes<HTMLTableSectionElement>;

/* ---------- TablePagination ---------- */

export interface TablePaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** 1-based. */
  page: number;
  /** Total number of rows. */
  count: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;
  rowsPerPageOptions?: number[];
}

/** The footer under a paged table: rows per page, "21–40 of 312", previous and next. */
export function TablePagination({
  page,
  count,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 20, 50, 100],
  className,
  ...rest
}: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(count / rowsPerPage));
  const from = count === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(count, page * rowsPerPage);
  const fmt = (n: number) => n.toLocaleString("en-US");
  return (
    <div {...rest} className={cx("oq-table-pagination", className)}>
      {onRowsPerPageChange && (
        <label>
          <span className="oq-table-pagination__label">Rows per page</span>
          <select
            className="oq-select oq-sm"
            aria-label="Rows per page"
            value={rowsPerPage}
            onChange={(e) => {
              const rows = Number(e.target.value);
              onRowsPerPageChange(rows);
              // Keep the first visible row on screen.
              onPageChange(Math.floor((from - 1) / rows) + 1);
            }}
          >
            {rowsPerPageOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <span className="oq-table-pagination__range" aria-live="polite">
        {fmt(from)}–{fmt(to)} of {fmt(count)}
      </span>
      <span className="oq-table-pagination__nav">
        <button type="button" className="oq-btn oq-btn--ghost oq-btn--icon oq-neutral oq-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeftIcon />
        </button>
        <button type="button" className="oq-btn oq-btn--ghost oq-btn--icon oq-neutral oq-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRightIcon />
        </button>
      </span>
    </div>
  );
}
