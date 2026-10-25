import {
  type CSSProperties,
  type HTMLAttributes,
  type Key,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "../charts/frame";
import { cx } from "../cx";
import { Dropdown } from "../Overlay";
import type { Column, SortState } from "../Table";
import { scrollToRow, toCsv, virtualWindow } from "./logic";

export interface VirtualColumn<Row> extends Column<Row> {
  /** Width in px. Default 160. */
  width?: number;
  /** Smallest width a drag can reach. Default 48. */
  minWidth?: number;
  /** Drag the header edge to resize. Default true. */
  resizable?: boolean;
  /** Listed in the columns menu. Default true. */
  hideable?: boolean;
  /** Enter or double-click edits the cell; the new text goes to `onCellEdit`. */
  editable?: boolean;
  /** Value written by `toCsv`; defaults to `sortValue`, then `row[key]`. */
  csv?: (row: Row) => unknown;
}

export interface VirtualTableProps<Row> extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  columns: Array<VirtualColumn<Row>>;
  rows: readonly Row[];
  /** Stable row key; defaults to `row.id`, then the index in `rows`. */
  rowKey?: (row: Row, index: number) => Key;
  /** Row height in px; every row is the same height, which is what makes windowing cheap. */
  rowHeight?: number;
  /** Height of the scrolling area in px. Default 420. */
  height?: number;
  overscan?: number;
  dense?: boolean;
  striped?: boolean;
  /** Keep the first data column in view while scrolling sideways. */
  stickyFirstColumn?: boolean;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  selectable?: boolean;
  selected?: Key[];
  onSelectedChange?: (keys: Key[]) => void;
  hiddenColumns?: string[];
  defaultHiddenColumns?: string[];
  onHiddenColumnsChange?: (keys: string[]) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (key: string, width: number) => void;
  onCellEdit?: (row: Row, key: string, value: string, rowIndex: number) => void;
  /** Enter on a row with no editable cell under the cursor, or a double-click on a plain cell. */
  onRowActivate?: (row: Row, rowIndex: number) => void;
  /** Extra controls at the left of the toolbar. */
  toolbar?: ReactNode;
  /** Show the columns menu in the toolbar. Default true when any column is hideable. */
  columnMenu?: boolean;
  /** Show an "Export CSV" button; a string sets the file name. */
  exportCsv?: boolean | string;
  empty?: ReactNode;
}

const DEFAULT_WIDTH = 160;
const CHECK_WIDTH = 40;

const cellValue = (row: unknown, key: string) => (row as Record<string, unknown>)[key];

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Saves text as a file in the browser. */
export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * A data grid for very long lists: only the rows in view (plus `overscan`) are in the DOM, so
 * 100 000 rows scroll as smoothly as 100. Sorting, resizing, hiding columns, inline editing,
 * selection and keyboard navigation are built in; everything is controlled or uncontrolled.
 */
export function VirtualTable<Row>({
  columns,
  rows,
  rowKey,
  rowHeight: rowHeightProp,
  height = 420,
  overscan = 8,
  dense,
  striped,
  stickyFirstColumn,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  selectable,
  selected: selectedProp,
  onSelectedChange,
  hiddenColumns: hiddenProp,
  defaultHiddenColumns = [],
  onHiddenColumnsChange,
  columnWidths,
  onColumnResize,
  onCellEdit,
  onRowActivate,
  toolbar,
  columnMenu,
  exportCsv,
  empty = "No rows",
  className,
  style,
  ...rest
}: VirtualTableProps<Row>) {
  // The one source of row height: the virtual window, scrolling and CSS (--oq-vt-row) all read it.
  // Touch screens get finger-sized rows.
  const coarse = useMediaQuery("(pointer: coarse)");
  const rowHeight = rowHeightProp ?? (dense ? (coarse ? 36 : 28) : coarse ? 44 : 34);
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const [sortState, setSortState] = useState<SortState | null>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : sortState;
  const [selectedState, setSelectedState] = useState<Key[]>([]);
  const selected = selectedProp ?? selectedState;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const [hiddenState, setHiddenState] = useState<string[]>(defaultHiddenColumns);
  const hidden = hiddenProp ?? hiddenState;
  const [widthState, setWidthState] = useState<Record<string, number>>({});
  const [active, setActive] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);

  const visible = useMemo(() => columns.filter((c) => !hidden.includes(c.key)), [columns, hidden]);
  const widthOf = (c: VirtualColumn<Row>) => columnWidths?.[c.key] ?? widthState[c.key] ?? c.width ?? DEFAULT_WIDTH;
  const template = [selectable ? `${CHECK_WIDTH}px` : null, ...visible.map((c) => `${widthOf(c)}px`)].filter(Boolean).join(" ");
  const totalWidth = (selectable ? CHECK_WIDTH : 0) + visible.reduce((s, c) => s + widthOf(c), 0);

  const keyOf = (row: Row, i: number): Key => {
    if (rowKey) return rowKey(row, i);
    const k = (row as { id?: unknown }).id;
    return typeof k === "string" || typeof k === "number" ? k : i;
  };

  // Sort a list of indices, so the original index (for keys and onCellEdit) survives.
  const order = useMemo(() => {
    const idx = rows.map((_, i) => i);
    if (!sort) return idx;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return idx;
    const get = col.sortValue ?? ((r: Row) => cellValue(r, col.key));
    const values = rows.map((r) => get(r));
    const dir = sort.direction === "asc" ? 1 : -1;
    return idx.sort((a, b) => compare(values[a], values[b]) * dir);
  }, [rows, columns, sort]);

  // Rows start below the sticky header, which is one row tall.
  const win = virtualWindow({ scrollTop: scrollTop - rowHeight, viewportHeight: height - rowHeight, rowHeight, count: order.length, overscan });

  const setSort = (next: SortState | null) => {
    if (sortProp === undefined) setSortState(next);
    onSortChange?.(next);
  };
  const cycleSort = (key: string) => {
    if (!sort || sort.key !== key) setSort({ key, direction: "asc" });
    else if (sort.direction === "asc") setSort({ key, direction: "desc" });
    else setSort(null);
  };
  const setSelected = (keys: Key[]) => {
    if (selectedProp === undefined) setSelectedState(keys);
    onSelectedChange?.(keys);
  };
  const toggleRow = (k: Key) => setSelected(selectedSet.has(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  const allKeys = () => order.map((i) => keyOf(rows[i] as Row, i));
  const allSelected = order.length > 0 && order.every((i) => selectedSet.has(keyOf(rows[i] as Row, i)));
  const someSelected = !allSelected && selected.length > 0;
  const setHidden = (keys: string[]) => {
    if (hiddenProp === undefined) setHiddenState(keys);
    onHiddenColumnsChange?.(keys);
  };

  // Keep the active row in view when the keyboard moves it.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const to = scrollToRow(active.row, el.scrollTop, el.clientHeight, rowHeight, rowHeight);
    if (to !== null) el.scrollTop = to;
  }, [active.row, rowHeight]);

  const startResize = (e: ReactPointerEvent<HTMLSpanElement>, col: VirtualColumn<Row>) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = widthOf(col);
    const min = col.minWidth ?? 48;
    const move = (ev: PointerEvent) => {
      const w = Math.max(min, Math.round(startW + ev.clientX - startX));
      setWidthState((s) => ({ ...s, [col.key]: w }));
      onColumnResize?.(col.key, w);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const commitEdit = (value: string) => {
    if (!editing) return;
    const index = order[editing.row];
    const col = visible[editing.col];
    if (index !== undefined && col) onCellEdit?.(rows[index] as Row, col.key, value, index);
    setEditing(null);
    root.current?.focus();
  };

  const startEdit = (row: number, col: number) => {
    if (visible[col]?.editable && onCellEdit) {
      setEditing({ row, col });
      return true;
    }
    return false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const last = order.length - 1;
    const page = Math.max(1, Math.floor((height - rowHeight) / rowHeight) - 1);
    let { row, col } = active;
    switch (e.key) {
      case "ArrowDown":
        row = Math.min(last, row + 1);
        break;
      case "ArrowUp":
        row = Math.max(0, row - 1);
        break;
      case "PageDown":
        row = Math.min(last, row + page);
        break;
      case "PageUp":
        row = Math.max(0, row - page);
        break;
      case "Home":
        if (e.ctrlKey || e.metaKey) row = 0;
        else col = 0;
        break;
      case "End":
        if (e.ctrlKey || e.metaKey) row = last;
        else col = visible.length - 1;
        break;
      case "ArrowLeft":
        col = Math.max(0, col - 1);
        break;
      case "ArrowRight":
        col = Math.min(visible.length - 1, col + 1);
        break;
      case " ": {
        const i = order[row];
        if (selectable && i !== undefined) toggleRow(keyOf(rows[i] as Row, i));
        break;
      }
      case "Enter":
      case "F2": {
        const i = order[row];
        if (!startEdit(row, col) && e.key === "Enter" && i !== undefined) onRowActivate?.(rows[i] as Row, i);
        break;
      }
      case "a":
        if (selectable && (e.ctrlKey || e.metaKey)) {
          setSelected(allSelected ? [] : allKeys());
          break;
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    if (last < 0) return;
    setActive({ row: Math.max(0, row), col: Math.max(0, col) });
  };

  const showMenu = columnMenu ?? columns.some((c) => c.hideable !== false);
  const csvName = typeof exportCsv === "string" ? exportCsv : "export.csv";
  const doExport = () =>
    downloadText(
      csvName,
      toCsv(
        order.map((i) => rows[i] as Row),
        visible,
      ),
    );

  const activeId = order.length ? `${id}-r${active.row}-c${active.col}` : undefined;
  const gridStyle = { "--oq-vt-cols": template, "--oq-vt-width": `${totalWidth}px`, "--oq-vt-row": `${rowHeight}px`, "--oq-vt-sticky": `${selectable ? CHECK_WIDTH : 0}px` } as CSSProperties;

  return (
    <div {...rest} className={cx("oq-vtable", dense && "oq-vtable--dense", striped && "oq-vtable--striped", stickyFirstColumn && "oq-vtable--sticky-first", className)} style={{ ...gridStyle, ...style }}>
      {(toolbar || showMenu || exportCsv) && (
        <div className="oq-vtable__toolbar">
          {toolbar}
          <span className="oq-spacer" />
          <span className="oq-small oq-faint">
            {order.length.toLocaleString("en-US")} rows{selected.length ? ` · ${selected.length.toLocaleString("en-US")} selected` : ""}
          </span>
          {showMenu && (
            <Dropdown
              align="end"
              trigger={(p) => (
                <button type="button" className="oq-btn oq-btn--outline oq-neutral oq-sm" {...p}>
                  Columns
                </button>
              )}
            >
              <div className="oq-menu__label oq-overline">Show columns</div>
              {columns
                .filter((c) => c.hideable !== false)
                .map((c) => (
                  <label key={c.key} className="oq-menu__item oq-check">
                    <input
                      type="checkbox"
                      className="oq-checkbox"
                      checked={!hidden.includes(c.key)}
                      disabled={!hidden.includes(c.key) && visible.length === 1}
                      onChange={() => setHidden(hidden.includes(c.key) ? hidden.filter((k) => k !== c.key) : [...hidden, c.key])}
                    />
                    {typeof c.header === "string" ? c.header : c.key}
                  </label>
                ))}
            </Dropdown>
          )}
          {exportCsv && (
            <button type="button" className="oq-btn oq-btn--outline oq-neutral oq-sm" onClick={doExport}>
              Export CSV
            </button>
          )}
        </div>
      )}
      <div
        ref={root}
        role="grid"
        tabIndex={0}
        aria-rowcount={order.length + 1}
        aria-colcount={visible.length}
        aria-multiselectable={selectable || undefined}
        aria-activedescendant={editing ? undefined : activeId}
        className="oq-vtable__grid"
        onKeyDown={onKeyDown}
      >
        <div ref={viewport} className="oq-vtable__viewport" style={{ height }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
          <div className="oq-vtable__head" role="row" aria-rowindex={1}>
            {selectable && (
              <div className="oq-vtable__th oq-vtable__check" role="columnheader">
                <input
                  type="checkbox"
                  className="oq-checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={() => setSelected(allSelected ? [] : allKeys())}
                />
              </div>
            )}
            {visible.map((c, ci) => {
              const dir = sort?.key === c.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
              return (
                <div
                  key={c.key}
                  role="columnheader"
                  aria-sort={c.sortable ? dir : undefined}
                  className={cx("oq-vtable__th", ci === 0 && "is-first", c.align === "right" && "oq-num", c.align === "center" && "is-center", c.sortable && "is-sortable")}
                  onClick={c.sortable ? () => cycleSort(c.key) : undefined}
                >
                  <span className="oq-truncate">{c.header}</span>
                  {c.resizable !== false && (
                    <span className="oq-vtable__resize" aria-hidden="true" onPointerDown={(e) => startResize(e, c)} onClick={(e) => e.stopPropagation()} />
                  )}
                </div>
              );
            })}
          </div>
          {order.length === 0 ? (
            <div className="oq-vtable__empty">{empty}</div>
          ) : (
            <div className="oq-vtable__body" style={{ height: win.total }}>
              <div className="oq-vtable__rows" style={{ transform: `translateY(${win.offset}px)` }}>
                {order.slice(win.start, win.end).map((index, n) => {
                  const r = win.start + n;
                  const row = rows[index] as Row;
                  const k = keyOf(row, index);
                  const isSel = selectedSet.has(k);
                  return (
                    <div
                      key={k}
                      role="row"
                      aria-rowindex={r + 2}
                      aria-selected={selectable ? isSel : undefined}
                      className={cx("oq-vtable__row", r % 2 === 1 && "is-odd", r === active.row && "is-active")}
                    >
                      {selectable && (
                        <div className="oq-vtable__cell oq-vtable__check" role="gridcell">
                          <input type="checkbox" className="oq-checkbox" tabIndex={-1} aria-label="Select row" checked={isSel} onChange={() => toggleRow(k)} />
                        </div>
                      )}
                      {visible.map((c, ci) => {
                        const isEditing = editing?.row === r && editing.col === ci;
                        return (
                          <div
                            key={c.key}
                            id={`${id}-r${r}-c${ci}`}
                            role="gridcell"
                            className={cx(
                              "oq-vtable__cell",
                              ci === 0 && "is-first",
                              c.align === "right" && "oq-num",
                              c.align === "center" && "is-center",
                              c.mono && "oq-mono",
                              r === active.row && ci === active.col && "is-active",
                              c.editable && "is-editable",
                            )}
                            onClick={() => setActive({ row: r, col: ci })}
                            onDoubleClick={() => {
                              if (!startEdit(r, ci)) onRowActivate?.(row, index);
                            }}
                          >
                            {isEditing ? (
                              <input
                                className="oq-vtable__editor"
                                // Editing starts on an explicit Enter, F2 or double-click, so focus moves with it.
                                autoFocus
                                defaultValue={String(cellValue(row, c.key) ?? "")}
                                aria-label={`Edit ${typeof c.header === "string" ? c.header : c.key}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEdit(e.currentTarget.value);
                                  else if (e.key === "Escape") {
                                    setEditing(null);
                                    root.current?.focus();
                                  }
                                  e.stopPropagation();
                                }}
                                onBlur={(e) => {
                                  if (editing) commitEdit(e.currentTarget.value);
                                }}
                              />
                            ) : (
                              <span className="oq-truncate">{c.render ? c.render(row, index) : String(cellValue(row, c.key) ?? "")}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
