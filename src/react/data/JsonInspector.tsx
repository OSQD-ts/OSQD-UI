import { type HTMLAttributes, type KeyboardEvent, useMemo, useRef, useState } from "react";
import { cx } from "../cx";
import { Icon } from "../Icon";
import { copyText, highlightText } from "./highlight";
import { type JsonType, jsonPath, jsonPreview, jsonType, type PathSegment } from "./logic";

export interface JsonInspectorProps extends Omit<HTMLAttributes<HTMLDivElement>, "onCopy"> {
  value: unknown;
  /** Levels open at first; 0 shows only the top level collapsed. Default 1. */
  defaultExpandDepth?: number;
  /** Show the value itself as a `$` row instead of starting at its children. */
  showRoot?: boolean;
  /** Search box and depth buttons. Default true. */
  toolbar?: boolean;
  /** Children shown per array or object before "Show more". Default 100. */
  pageSize?: number;
  /** Max height of the tree in px; it scrolls past that. */
  maxHeight?: number;
  /** Called after a value or path is copied. */
  onCopy?: (kind: "value" | "path", text: string) => void;
}

interface Node {
  id: string;
  path: PathSegment[];
  key: PathSegment | null;
  value: unknown;
  type: JsonType;
  depth: number;
  size: number;
}

/** A "show more" row standing in for the rest of a long array or object. */
interface MoreRow {
  more: true;
  id: string;
  parent: string;
  depth: number;
  hidden: number;
}

const childrenOf = (value: unknown): Array<[PathSegment, unknown]> =>
  Array.isArray(value) ? value.map((v, i) => [i, v]) : value !== null && typeof value === "object" ? Object.entries(value) : [];

const sizeOf = (value: unknown, type: JsonType) => (type === "array" ? (value as unknown[]).length : type === "object" ? Object.keys(value as object).length : 0);

const makeNode = (path: PathSegment[], key: PathSegment | null, value: unknown, depth: number): Node => {
  const type = jsonType(value);
  return { id: jsonPath(path), path, key, value, type, depth, size: sizeOf(value, type) };
};

const matchesText = (n: Node, q: string) =>
  (n.key !== null && String(n.key).toLowerCase().includes(q)) || (n.type !== "object" && n.type !== "array" && jsonPreview(n.value).toLowerCase().includes(q));

/**
 * A JSON value as a collapsible tree: type-coloured values, sizes on arrays and objects, search
 * that keeps the matching branches open, and copy buttons for the value and its path
 * (`$.request.headers["user-agent"]`). Keyboard: the tree pattern, plus `c` copies the value and
 * `p` the path of the focused row.
 */
export function JsonInspector({
  value,
  defaultExpandDepth = 1,
  showRoot = false,
  toolbar = true,
  pageSize = 100,
  maxHeight,
  onCopy,
  className,
  ...rest
}: JsonInspectorProps) {
  const initial = () => {
    const open = new Set<string>();
    const walk = (v: unknown, path: PathSegment[], depth: number) => {
      if (depth >= defaultExpandDepth) return;
      const t = jsonType(v);
      if (t !== "object" && t !== "array") return;
      open.add(jsonPath(path));
      for (const [k, c] of childrenOf(v)) walk(c, [...path, k], depth + 1);
    };
    // The root is always open when it is not shown as a row.
    walk(value, [], showRoot ? 0 : -1);
    if (!showRoot) open.add("$");
    return open;
  };
  const [expanded, setExpanded] = useState<Set<string>>(initial);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const q = query.trim().toLowerCase();

  // With a query: ids of nodes that match or have a matching descendant.
  const hits = useMemo(() => {
    if (!q) return null;
    const keep = new Set<string>();
    const walk = (n: Node): boolean => {
      let any = matchesText(n, q);
      for (const [k, c] of childrenOf(n.value)) if (walk(makeNode([...n.path, k], k, c, n.depth + 1))) any = true;
      if (any) keep.add(n.id);
      return any;
    };
    walk(makeNode([], null, value, -1));
    return keep;
  }, [value, q]);

  const rows = useMemo(() => {
    const out: Array<Node | MoreRow> = [];
    const visit = (n: Node) => {
      if (hits && !hits.has(n.id)) return;
      if (n.depth >= 0) out.push(n);
      const open = hits ? true : expanded.has(n.id);
      if (!open || (n.type !== "object" && n.type !== "array")) return;
      const kids = childrenOf(n.value);
      const limit = hits ? kids.length : (limits[n.id] ?? pageSize);
      for (const [k, c] of kids.slice(0, limit)) visit(makeNode([...n.path, k], k, c, n.depth + 1));
      if (kids.length > limit) out.push({ more: true, id: `${n.id}#more`, parent: n.id, depth: n.depth + 1, hidden: kids.length - limit });
    };
    visit(makeNode([], null, value, showRoot ? 0 : -1));
    return out;
  }, [value, expanded, hits, limits, pageSize, showRoot]);

  const toggle = (id: string, open?: boolean) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (open ?? !n.has(id)) n.add(id);
      else n.delete(id);
      return n;
    });

  const expandTo = (depth: number) => {
    const open = new Set<string>(showRoot ? [] : ["$"]);
    const walk = (v: unknown, path: PathSegment[], d: number) => {
      const t = jsonType(v);
      if (d >= depth || (t !== "object" && t !== "array")) return;
      open.add(jsonPath(path));
      for (const [k, c] of childrenOf(v)) walk(c, [...path, k], d + 1);
    };
    walk(value, [], showRoot ? 0 : -1);
    setExpanded(open);
  };

  const copy = async (kind: "value" | "path", n: Node) => {
    const text = kind === "path" ? n.id : typeof n.value === "string" ? n.value : JSON.stringify(n.value, null, 2);
    await copyText(text);
    onCopy?.(kind, text);
    setFlash(`${kind}:${n.id}`);
    setTimeout(() => setFlash((f) => (f === `${kind}:${n.id}` ? null : f)), 1200);
  };

  const focusRow = (i: number) => {
    const clamped = Math.max(0, Math.min(rows.length - 1, i));
    setFocus(clamped);
    list.current?.querySelectorAll<HTMLElement>('[role="treeitem"]')[clamped]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const row = rows[focus];
    if (!row) return;
    const node = "more" in row ? null : row;
    const container = node && (node.type === "object" || node.type === "array") && node.size > 0;
    const open = node ? hits !== null || expanded.has(node.id) : false;
    switch (e.key) {
      case "ArrowDown":
        focusRow(focus + 1);
        break;
      case "ArrowUp":
        focusRow(focus - 1);
        break;
      case "Home":
        focusRow(0);
        break;
      case "End":
        focusRow(rows.length - 1);
        break;
      case "ArrowRight":
        if (container && !open) toggle(node.id, true);
        else if (container) focusRow(focus + 1);
        break;
      case "ArrowLeft":
        if (container && open && !hits) toggle(node.id, false);
        else {
          // To the parent: the nearest row above with a smaller depth.
          for (let i = focus - 1; i >= 0; i--) if ((rows[i] as Node | MoreRow).depth < row.depth) return focusRow(i);
        }
        break;
      case "Enter":
      case " ":
        if ("more" in row) setLimits((l) => ({ ...l, [row.parent]: (l[row.parent] ?? pageSize) + pageSize }));
        else if (container && !hits) toggle(row.id);
        break;
      case "c":
        if (node) copy("value", node);
        break;
      case "p":
        if (node) copy("path", node);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const renderValue = (n: Node) => {
    if (n.type === "object" || n.type === "array") {
      const open = hits !== null || expanded.has(n.id);
      const brace = n.type === "array" ? "[ ]" : "{ }";
      return (
        <span className="oq-json__meta">
          <span className="oq-json__brace">{open && n.size ? (n.type === "array" ? "[" : "{") : brace}</span>
          {n.size} {n.type === "array" ? (n.size === 1 ? "item" : "items") : n.size === 1 ? "key" : "keys"}
        </span>
      );
    }
    const text = jsonPreview(n.value);
    return <span className={`oq-json__value is-${n.type}`}>{q ? highlightText(text, q, "oq-json__match") : text}</span>;
  };

  return (
    <div {...rest} className={cx("oq-json", className)}>
      {toolbar && (
        <div className="oq-json__toolbar">
          <div className="oq-input-group oq-json__search">
            <span className="oq-addon oq-addon--plain">
              <Icon name="search" size={14} />
            </span>
            <input className="oq-input oq-sm" type="search" placeholder="Filter keys and values" aria-label="Filter JSON" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="oq-spacer" />
          <span className="oq-small oq-faint">Expand</span>
          <div className="oq-segmented" role="group" aria-label="Expand to depth">
            {[1, 2, 3].map((d) => (
              <button key={d} type="button" onClick={() => expandTo(d)} disabled={hits !== null}>
                {d}
              </button>
            ))}
            <button type="button" onClick={() => expandTo(Number.POSITIVE_INFINITY)} disabled={hits !== null}>
              All
            </button>
          </div>
          <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm" onClick={() => expandTo(0)} disabled={hits !== null}>
            Collapse
          </button>
        </div>
      )}
      <ul ref={list} role="tree" aria-label="JSON" className="oq-json__tree" style={maxHeight ? { maxHeight } : undefined} onKeyDown={onKeyDown}>
        {rows.length === 0 && <li className="oq-json__empty">{q ? "Nothing matches" : "Empty"}</li>}
        {rows.map((row, i) => {
          if ("more" in row) {
            return (
              <li key={row.id} role="treeitem" aria-level={row.depth + 1} tabIndex={i === focus ? 0 : -1} className="oq-json__row" style={{ paddingLeft: `calc(${row.depth} * var(--oq-json-indent, 16px) + 26px)` }} onFocus={() => setFocus(i)}>
                <button type="button" className="oq-btn oq-btn--ghost oq-sm" tabIndex={-1} onClick={() => setLimits((l) => ({ ...l, [row.parent]: (l[row.parent] ?? pageSize) + pageSize }))}>
                  Show {Math.min(pageSize, row.hidden)} more of {row.hidden}
                </button>
              </li>
            );
          }
          const container = (row.type === "object" || row.type === "array") && row.size > 0;
          const open = hits !== null || expanded.has(row.id);
          return (
            <li
              key={row.id}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-expanded={container ? open : undefined}
              tabIndex={i === focus ? 0 : -1}
              className={cx("oq-json__row", hits && matchesText(row, q) && "is-hit")}
              style={{ paddingLeft: `calc(${row.depth} * var(--oq-json-indent, 16px) + 6px)` }}
              onFocus={() => setFocus(i)}
              onClick={() => {
                setFocus(i);
                if (container && !hits) toggle(row.id);
              }}
            >
              <span className="oq-json__twisty" aria-hidden="true">
                {container && <Icon name="chevron-right" size={12} />}
              </span>
              {row.key !== null && (
                <>
                  <span className={cx("oq-json__key", typeof row.key === "number" && "is-index")}>{q ? highlightText(String(row.key), q, "oq-json__match") : String(row.key)}</span>
                  <span className="oq-json__colon">:</span>
                </>
              )}
              {row.key === null && <span className="oq-json__key is-root">$</span>}
              {renderValue(row)}
              <span className="oq-json__actions">
                <button
                  type="button"
                  className="oq-json__action"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    copy("path", row);
                  }}
                >
                  {flash === `path:${row.id}` ? "Copied" : "Path"}
                </button>
                <button
                  type="button"
                  className="oq-json__action"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    copy("value", row);
                  }}
                >
                  {flash === `value:${row.id}` ? "Copied" : "Copy"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
