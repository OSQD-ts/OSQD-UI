import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  collapseDiff,
  csvField,
  DiffView,
  diffLines,
  diffSequences,
  diffStats,
  diffWords,
  findAll,
  formatLogLine,
  JsonInspector,
  jsonPath,
  jsonType,
  LogViewer,
  pairChanges,
  scrollToRow,
  toCsv,
  VirtualTable,
  virtualWindow,
} from "../src/index";

/** Seeded PRNG so the generated cases are the same on every run. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Length of the longest common subsequence, the slow and obviously correct way. */
function lcsLength<T>(a: T[], b: T[]): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      (dp[i] as number[])[j] = a[i - 1] === b[j - 1] ? (dp[i - 1] as number[])[j - 1]! + 1 : Math.max((dp[i - 1] as number[])[j]!, (dp[i] as number[])[j - 1]!);
  return (dp[a.length] as number[])[b.length]!;
}

describe("diffSequences", () => {
  it("rebuilds both sides and is minimal (equal count = LCS length) on random inputs", () => {
    const r = rng(42);
    for (let t = 0; t < 400; t++) {
      const alpha = "abcd".slice(0, 1 + Math.floor(r() * 4));
      const gen = () => Array.from({ length: Math.floor(r() * 12) }, () => alpha[Math.floor(r() * alpha.length)] as string);
      const a = gen();
      const b = gen();
      const ops = diffSequences(a, b);
      expect(ops.filter((o) => o.type !== "add").map((o) => o.value)).toEqual(a);
      expect(ops.filter((o) => o.type !== "del").map((o) => o.value)).toEqual(b);
      expect(ops.filter((o) => o.type === "equal").length).toBe(lcsLength(a, b));
    }
  });

  it("handles empty sides", () => {
    expect(diffSequences([], [])).toEqual([]);
    expect(diffSequences([], ["x"])).toEqual([{ type: "add", value: "x" }]);
    expect(diffSequences(["x"], [])).toEqual([{ type: "del", value: "x" }]);
  });
});

describe("diffLines", () => {
  it("numbers lines on both sides", () => {
    const d = diffLines("a\nb\nc\n", "a\nB\nc\nd\n");
    expect(d).toEqual([
      { type: "equal", text: "a", oldNo: 1, newNo: 1 },
      { type: "del", text: "b", oldNo: 2 },
      { type: "add", text: "B", newNo: 2 },
      { type: "equal", text: "c", oldNo: 3, newNo: 3 },
      { type: "add", text: "d", newNo: 4 },
    ]);
    expect(diffStats(d)).toEqual({ added: 2, removed: 1 });
  });

  it("treats CRLF like LF and ignores a final newline", () => {
    expect(diffLines("a\r\nb", "a\nb\n").every((l) => l.type === "equal")).toBe(true);
    expect(diffLines("", "")).toEqual([]);
  });

  it("pairs removals with additions in each change block", () => {
    const d = diffLines("x\na\nb\ny", "x\nA\ny");
    const pairs = pairChanges(d);
    const a = d.find((l) => l.text === "a");
    const A = d.find((l) => l.text === "A");
    expect(a && pairs.get(a)).toBe(A);
    expect(pairs.get(d.find((l) => l.text === "b") as never)).toBeUndefined();
  });
});

describe("collapseDiff", () => {
  const old = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
  const next = old.replace("line 15", "LINE 15");

  it("keeps context around a change and folds the rest", () => {
    const rows = collapseDiff(diffLines(old, next), 3);
    const skips = rows.filter((r) => r.kind === "skip");
    expect(skips.map((s) => s.kind === "skip" && s.count)).toEqual([12, 11]);
    const shown = rows.filter((r) => r.kind === "line").length;
    expect(shown).toBe(3 + 2 + 3);
  });

  it("does not fold a run that would hide fewer than minHidden lines", () => {
    const small = "a\nb\nc\nd\ne\nf\ng";
    const rows = collapseDiff(diffLines(small, small.replace("d", "D")), 2);
    expect(rows.every((r) => r.kind === "line")).toBe(true);
  });
});

describe("diffWords", () => {
  it("marks only the changed words", () => {
    const segs = diffWords('timeout = 2500', 'timeout = 3000');
    expect(segs.filter((s) => s.type === "del").map((s) => s.text)).toEqual(["2500"]);
    expect(segs.filter((s) => s.type === "add").map((s) => s.text)).toEqual(["3000"]);
  });
});

describe("toCsv", () => {
  it("quotes fields that need it and doubles inner quotes", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
    expect(csvField(" padded")).toBe('" padded"');
    expect(csvField(null)).toBe("");
    expect(csvField(0)).toBe("0");
    expect(csvField(new Date(Date.UTC(2026, 9, 25)))).toBe("2026-10-25T00:00:00.000Z");
    expect(csvField({ a: 1 })).toBe('"{""a"":1}"');
  });

  it("writes a header and rows in column order, using csv/sortValue when given", () => {
    const rows = [{ id: 1, name: "fra-01", tags: ["a", "b"] }];
    const csv = toCsv(rows, [
      { key: "name", header: "Node" },
      { key: "id" },
      { key: "tags", header: "Tags", csv: (r) => r.tags.join(";") },
    ]);
    expect(csv).toBe("Node,id,Tags\r\nfra-01,1,a;b");
    expect(toCsv(rows, [{ key: "name" }], { header: false, delimiter: ";" })).toBe("fra-01");
  });
});

describe("virtualWindow", () => {
  it("covers the viewport plus overscan and clamps at both ends", () => {
    expect(virtualWindow({ scrollTop: 0, viewportHeight: 100, rowHeight: 10, count: 1000, overscan: 5 })).toEqual({ start: 0, end: 16, offset: 0, total: 10000 });
    const mid = virtualWindow({ scrollTop: 500, viewportHeight: 100, rowHeight: 10, count: 1000, overscan: 5 });
    expect(mid).toEqual({ start: 45, end: 66, offset: 450, total: 10000 });
    const end = virtualWindow({ scrollTop: 99999, viewportHeight: 100, rowHeight: 10, count: 1000, overscan: 5 });
    expect(end.end).toBe(1000);
    expect(end.start).toBe(985);
    expect(virtualWindow({ scrollTop: 0, viewportHeight: 100, rowHeight: 10, count: 0 })).toEqual({ start: 0, end: 0, offset: 0, total: 0 });
  });

  it("always includes every row a viewport can show", () => {
    const r = rng(7);
    for (let t = 0; t < 300; t++) {
      const rowHeight = 10 + Math.floor(r() * 30);
      const count = Math.floor(r() * 500);
      const viewportHeight = 50 + Math.floor(r() * 600);
      const scrollTop = Math.floor(r() * count * rowHeight);
      const w = virtualWindow({ scrollTop, viewportHeight, rowHeight, count, overscan: 0 });
      const top = Math.min(scrollTop, Math.max(0, count * rowHeight - viewportHeight));
      const firstVisible = Math.floor(top / rowHeight);
      const lastVisible = Math.min(count - 1, Math.floor((top + viewportHeight - 1) / rowHeight));
      if (count > 0) {
        expect(w.start).toBeLessThanOrEqual(firstVisible);
        expect(w.end).toBeGreaterThan(lastVisible);
      }
    }
  });

  it("scrollToRow returns null when the row is already visible", () => {
    expect(scrollToRow(2, 0, 100, 10, 10)).toBeNull();
    expect(scrollToRow(20, 0, 100, 10, 10)).toBe(210 - 90);
    expect(scrollToRow(1, 50, 100, 10, 10)).toBe(10);
  });
});

describe("jsonPath", () => {
  it("uses dots for identifiers and brackets otherwise", () => {
    expect(jsonPath([])).toBe("$");
    expect(jsonPath(["request", "headers", "user-agent"])).toBe('$.request.headers["user-agent"]');
    expect(jsonPath(["items", 0, "id"])).toBe("$.items[0].id");
    expect(jsonPath(["a b", "_ok", "$x", "1st", 'q"t'])).toBe('$["a b"]._ok.$x["1st"]["q\\"t"]');
  });

  it("names value types", () => {
    expect([null, [], {}, "s", 1, true, undefined].map(jsonType)).toEqual(["null", "array", "object", "string", "number", "boolean", "undefined"]);
  });
});

describe("findAll", () => {
  it("finds case-insensitive, non-overlapping matches", () => {
    expect(findAll("Error error ERROR", "error")).toEqual([0, 6, 12]);
    expect(findAll("aaaa", "aa")).toEqual([0, 2]);
    expect(findAll("x", "")).toEqual([]);
  });
});

describe("data components render", () => {
  const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

  it("VirtualTable renders only a window of 100 000 rows", () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({ id: i, name: `row ${i}`, n: i * 2 }));
    const out = html(
      <VirtualTable
        rows={rows}
        columns={[
          { key: "name", header: "Name", sortable: true, editable: true },
          { key: "n", header: "N", align: "right" },
        ]}
        selectable
        stickyFirstColumn
        exportCsv
        height={340}
      />,
    );
    expect(out).toContain("oq-vtable");
    expect(out).toContain('role="grid"');
    expect(out).toContain('aria-rowcount="100001"');
    expect(out).toContain("oq-vtable--sticky-first");
    expect(out).toContain("Export CSV");
    const rendered = (out.match(/class="oq-vtable__row/g) ?? []).length;
    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThan(40);
  });

  it("LogViewer colours levels and counts them", () => {
    const lines = [
      { level: "info" as const, time: "11:02:14", source: "reload", message: "3 keys changed" },
      { level: "error" as const, time: "11:05:02", source: "store", message: "ECONNREFUSED" },
    ];
    const out = html(<LogViewer lines={lines} />);
    expect(out).toContain("oq-log");
    expect(out).toContain('data-level="error"');
    expect(out).toContain('role="log"');
    expect(out).toContain("Next error");
    expect(formatLogLine(lines[1] as (typeof lines)[number])).toBe("11:05:02 ERROR [store] ECONNREFUSED");
  });

  it("JsonInspector opens to the default depth with typed values", () => {
    const out = html(<JsonInspector value={{ request: { method: "GET", headers: { "user-agent": "curl" } }, ok: true, n: null }} />);
    expect(out).toContain('role="tree"');
    expect(out).toContain('aria-level="1"');
    expect(out).toContain("is-boolean");
    expect(out).toContain("is-null");
    expect(out).toContain("&quot;GET&quot;");
    // depth 1: headers is listed but not opened.
    expect(out).not.toContain("curl");
  });

  it("DiffView renders both layouts", () => {
    const a = "port = 9110\ntimeout = 2500\n";
    const b = "port = 9110\ntimeout = 3000\n";
    const unified = html(<DiffView oldText={a} newText={b} />);
    expect(unified).toContain("oq-diff");
    expect(unified).toContain("is-del");
    expect(unified).toContain('<ins class="oq-diff__word">3000</ins>');
    const split = html(<DiffView oldText={a} newText={b} defaultMode="split" />);
    expect(split).toContain("oq-diff--split");
    expect(html(<DiffView oldText={a} newText={a} />)).toContain("No changes");
  });
});
