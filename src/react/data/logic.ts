/*
 * The data components' pure parts: windowing maths, CSV, diffing, JSON paths. No React, no DOM,
 * so each is tested on its own (tests/data.test.tsx) and usable from server code.
 */

/* ---------- Virtual window ---------- */

export interface VirtualWindowInput {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  count: number;
  /** Rows rendered beyond each edge of the viewport, so fast scrolling shows no gaps. Default 8. */
  overscan?: number;
}

export interface VirtualWindow {
  /** First rendered row (inclusive). */
  start: number;
  /** Last rendered row (exclusive). */
  end: number;
  /** Pixel offset of row `start` from the top of the content. */
  offset: number;
  /** Height of all rows together. */
  total: number;
}

/** Which rows of a fixed-height list to render for a scroll position. */
export function virtualWindow({ scrollTop, viewportHeight, rowHeight, count, overscan = 8 }: VirtualWindowInput): VirtualWindow {
  const total = count * rowHeight;
  if (count <= 0 || rowHeight <= 0) return { start: 0, end: 0, offset: 0, total: Math.max(0, total) };
  const top = Math.min(Math.max(0, scrollTop), Math.max(0, total - viewportHeight));
  const first = Math.floor(top / rowHeight);
  const visible = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;
  const start = Math.max(0, first - overscan);
  const end = Math.min(count, first + visible + overscan);
  return { start, end, offset: start * rowHeight, total };
}

/** The scrollTop that brings `index` into view, or null when it already is. */
export function scrollToRow(index: number, scrollTop: number, viewportHeight: number, rowHeight: number, headerHeight = 0): number | null {
  const top = index * rowHeight;
  const bottom = top + rowHeight;
  const visibleTop = scrollTop;
  const visibleBottom = scrollTop + viewportHeight - headerHeight;
  if (top < visibleTop) return top;
  if (bottom > visibleBottom) return bottom - (viewportHeight - headerHeight);
  return null;
}

/* ---------- CSV ---------- */

export interface CsvColumn<Row> {
  key: string;
  header?: unknown;
  /** Value written to the file; defaults to `sortValue`, then `row[key]`. */
  csv?: (row: Row) => unknown;
  sortValue?: (row: Row) => unknown;
}

export interface CsvOptions {
  delimiter?: string;
  /** Write a header row. Default true. */
  header?: boolean;
  /** Line ending. Default "\r\n", as RFC 4180 has it. */
  newline?: string;
}

/** One CSV field, quoted when it has to be: a delimiter, quote, line break or edge whitespace inside. */
export function csvField(value: unknown, delimiter = ","): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  const needs = s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r") || s !== s.trim();
  return needs ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to CSV text, one column per entry in `columns`, in that order. */
export function toCsv<Row>(rows: readonly Row[], columns: ReadonlyArray<CsvColumn<Row>>, options: CsvOptions = {}): string {
  const { delimiter = ",", header = true, newline = "\r\n" } = options;
  const lines: string[] = [];
  if (header) {
    lines.push(columns.map((c) => csvField(typeof c.header === "string" || typeof c.header === "number" ? c.header : c.key, delimiter)).join(delimiter));
  }
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => {
          const v = c.csv ? c.csv(row) : c.sortValue ? c.sortValue(row) : (row as Record<string, unknown>)[c.key];
          return csvField(v, delimiter);
        })
        .join(delimiter),
    );
  }
  return lines.join(newline);
}

/* ---------- Diff ---------- */

export type DiffOpType = "equal" | "add" | "del";

export interface DiffOp<T> {
  type: DiffOpType;
  value: T;
}

/**
 * The shortest edit script between two sequences (Myers' O(ND) algorithm). Equal items keep their
 * order, so `equal` + `del` rebuilds `a` and `equal` + `add` rebuilds `b`.
 */
export function diffSequences<T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean = Object.is): Array<DiffOp<T>> {
  // Trim the common prefix and suffix first: most real diffs are a small change in a long text.
  let pre = 0;
  while (pre < a.length && pre < b.length && eq(a[pre] as T, b[pre] as T)) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && eq(a[a.length - 1 - suf] as T, b[b.length - 1 - suf] as T)) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const middle = myers(A, B, eq);
  const out: Array<DiffOp<T>> = [];
  for (let i = 0; i < pre; i++) out.push({ type: "equal", value: a[i] as T });
  out.push(...middle);
  for (let i = a.length - suf; i < a.length; i++) out.push({ type: "equal", value: a[i] as T });
  return out;
}

function myers<T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean): Array<DiffOp<T>> {
  const n = a.length;
  const m = b.length;
  if (n === 0) return b.map((value) => ({ type: "add" as const, value }));
  if (m === 0) return a.map((value) => ({ type: "del" as const, value }));
  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 2);
  const trace: Int32Array[] = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number));
      let x = down ? (v[offset + k + 1] as number) : (v[offset + k - 1] as number) + 1;
      let y = x - k;
      while (x < n && y < m && eq(a[x] as T, b[y] as T)) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }
  // Walk the trace backwards from (n, m) to rebuild the path.
  const ops: Array<DiffOp<T>> = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d] as Int32Array;
    const k = x - y;
    const down = k === -d || (k !== d && (vd[offset + k - 1] as number) < (vd[offset + k + 1] as number));
    const prevK = down ? k + 1 : k - 1;
    const prevX = vd[offset + prevK] as number;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ type: "equal", value: a[x - 1] as T });
      x--;
      y--;
    }
    if (d > 0) {
      if (down) ops.push({ type: "add", value: b[y - 1] as T });
      else ops.push({ type: "del", value: a[x - 1] as T });
    }
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

export interface DiffLine {
  type: DiffOpType;
  text: string;
  /** 1-based line number in the old text; absent on added lines. */
  oldNo?: number;
  /** 1-based line number in the new text; absent on removed lines. */
  newNo?: number;
}

const splitLines = (text: string) => (text === "" ? [] : text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n"));

/** Line diff of two texts, numbered on both sides. A trailing newline does not count as a line. */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const ops = diffSequences(splitLines(oldText), splitLines(newText));
  let o = 0;
  let n = 0;
  return ops.map((op) => {
    if (op.type === "equal") return { type: "equal", text: op.value, oldNo: ++o, newNo: ++n };
    if (op.type === "del") return { type: "del", text: op.value, oldNo: ++o };
    return { type: "add", text: op.value, newNo: ++n };
  });
}

/** Counts of added and removed lines. */
export function diffStats(lines: readonly DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === "add") added++;
    else if (l.type === "del") removed++;
  }
  return { added, removed };
}

export interface WordSegment {
  text: string;
  /** "equal" in both lines, "del" only in the old one, "add" only in the new one. */
  type: DiffOpType;
}

const tokenize = (s: string) => s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];

/** Word-level diff of two lines, merged into runs. Used for the intra-line highlight. */
export function diffWords(oldLine: string, newLine: string): WordSegment[] {
  const ops = diffSequences(tokenize(oldLine), tokenize(newLine));
  const out: WordSegment[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (last && last.type === op.type) last.text += op.value;
    else out.push({ type: op.type, text: op.value });
  }
  return out;
}

export type DiffRow =
  | { kind: "line"; line: DiffLine; pair?: DiffLine }
  | { kind: "skip"; id: number; count: number; lines: DiffLine[] };

/**
 * Collapses runs of unchanged lines to `context` lines either side of each change. A run is only
 * collapsed when that hides more than `minHidden` lines — hiding one line behind a button is worse
 * than showing it.
 */
export function collapseDiff(lines: readonly DiffLine[], context = 3, minHidden = 4): DiffRow[] {
  const rows: DiffRow[] = [];
  let i = 0;
  let id = 0;
  while (i < lines.length) {
    const line = lines[i] as DiffLine;
    if (line.type !== "equal") {
      rows.push({ kind: "line", line });
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && (lines[j] as DiffLine).type === "equal") j++;
    const run = lines.slice(i, j);
    const head = i === 0 ? 0 : context;
    const tail = j === lines.length ? 0 : context;
    const hidden = run.length - head - tail;
    if (hidden >= minHidden) {
      for (const l of run.slice(0, head)) rows.push({ kind: "line", line: l });
      rows.push({ kind: "skip", id: id++, count: hidden, lines: run.slice(head, head + hidden) });
      for (const l of run.slice(head + hidden)) rows.push({ kind: "line", line: l });
    } else {
      for (const l of run) rows.push({ kind: "line", line: l });
    }
    i = j;
  }
  return rows;
}

/** Pairs each removed line with the added line in the same position of its change block. */
export function pairChanges(lines: readonly DiffLine[]): Map<DiffLine, DiffLine> {
  const pairs = new Map<DiffLine, DiffLine>();
  let i = 0;
  while (i < lines.length) {
    if ((lines[i] as DiffLine).type !== "del") {
      i++;
      continue;
    }
    const dels: DiffLine[] = [];
    while (i < lines.length && (lines[i] as DiffLine).type === "del") dels.push(lines[i++] as DiffLine);
    const adds: DiffLine[] = [];
    while (i < lines.length && (lines[i] as DiffLine).type === "add") adds.push(lines[i++] as DiffLine);
    for (let k = 0; k < Math.min(dels.length, adds.length); k++) {
      pairs.set(dels[k] as DiffLine, adds[k] as DiffLine);
      pairs.set(adds[k] as DiffLine, dels[k] as DiffLine);
    }
  }
  return pairs;
}

/* ---------- JSON paths ---------- */

export type PathSegment = string | number;

/** `$.request.headers["user-agent"][0]` — dot for identifiers, brackets for everything else. */
export function jsonPath(segments: readonly PathSegment[]): string {
  let out = "$";
  for (const s of segments) {
    if (typeof s === "number") out += `[${s}]`;
    else if (/^[A-Za-z_$][\w$]*$/.test(s)) out += `.${s}`;
    else out += `[${JSON.stringify(s)}]`;
  }
  return out;
}

export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null" | "undefined";

export function jsonType(value: unknown): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "bigint") return "number";
  return "undefined";
}

/** A short, single-line rendering of a primitive. */
export function jsonPreview(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value === undefined) return "undefined";
  return String(value);
}

/* ---------- Text search ---------- */

/** Start offsets of every case-insensitive occurrence of `query` in `text`. */
export function findAll(text: string, query: string): number[] {
  if (!query) return [];
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  const out: number[] = [];
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    i = hay.indexOf(needle, i + needle.length);
  }
  return out;
}
