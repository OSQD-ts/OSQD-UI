import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CardTools,
  ChipGrid,
  Chip,
  ConfirmButton,
  DataTable,
  Funnel,
  Histogram,
  hueIndex,
  PercentileStrip,
  PreviewFrame,
  RankedBars,
  SkipLink,
  SortableList,
  StackBar,
} from "../src/index";
import { themes } from "../src/theme/index";

const css = (name: string) => readFileSync(new URL(`../styles/${name}`, import.meta.url), "utf8");
const render = (el: ReturnType<typeof h>) => renderToStaticMarkup(el);

describe("token scope reaches shadow roots", () => {
  const tokens = css("tokens.css");

  it("the default theme also sits on :host", () => {
    expect(tokens).toMatch(/^:root,\n:host,\n\[data-theme="dark"\],\n:host\(\[data-theme="dark"\]\) \{/m);
  });

  it("every [data-theme] rule has a :host twin", () => {
    for (const name of [...Object.keys(themes), "auto"]) {
      expect(tokens).toContain(`[data-theme="${name}"],\n`);
      expect(tokens).toContain(`:host([data-theme="${name}"])`);
    }
  });

  it("the series palette, ramps and hue modes are declared on :host as well", () => {
    const charts = css("charts.css");
    expect(charts).toMatch(/:root,\n:host,\n\[data-theme\],\n:host\(\[data-theme\]\) \{\n {2}--oq-series-1/);
    expect(charts).toContain(':host([data-theme="slate"])');
    expect(charts).toMatch(/:host\(\[data-theme\]\) \{\n {2}--oq-seq-0/);
    expect(css("components.css")).toContain(':host([data-theme="slate"]) {\n  --oq-hue-l');
  });
});

describe("colour ramps and fill classes", () => {
  const charts = css("charts.css");
  it("declares --oq-seq-0…12 and --oq-ord-1…5", () => {
    for (let k = 0; k <= 12; k++) expect(charts).toContain(`--oq-seq-${k}: color-mix(`);
    for (let k = 1; k <= 5; k++) expect(charts).toContain(`--oq-ord-${k}: color-mix(`);
  });
  it("has a fill class for every slot and step, and the --value utilities", () => {
    for (let n = 1; n <= 8; n++) {
      expect(charts).toContain(`.oq-fill-series-${n} {`);
      expect(charts).toContain(`.oq-stroke-series-${n} {`);
    }
    for (let k = 0; k <= 12; k++) expect(charts).toContain(`.oq-fill-seq-${k} {`);
    for (let k = 1; k <= 5; k++) expect(charts).toContain(`.oq-fill-ord-${k} {`);
    for (let n = 0; n <= 100; n += 5) expect(charts).toContain(`.oq-w-${n} { --value: ${n}%; }`);
  });
  it("the sequential ramp rises monotonically", () => {
    const steps = [...charts.matchAll(/--oq-seq-\d+: color-mix\(in oklab, var\(--oq-primary\) (\d+)%/g)].map((m) => Number(m[1]));
    expect(steps).toHaveLength(13);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1] as number);
    expect(steps.at(-1)).toBe(100);
  });
});

/* ---------- hue tags: contrast in every theme ---------- */

function oklchToLinear(L: number, C: number, hue: number): [number, number, number] {
  const a = C * Math.cos((hue * Math.PI) / 180);
  const b = C * Math.sin((hue * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const decode = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const hex = (s: string): [number, number, number] => [1, 3, 5].map((i) => Number.parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number];
const lumLinear = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const lumSrgb = (c: [number, number, number]) => lumLinear(c.map(decode) as [number, number, number]);
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe("hashed-hue tags are readable in every theme", () => {
  const components = css("components.css");
  const mode = (light: boolean) => {
    const block = light
      ? /:host\(\[data-theme="slate"\]\) \{\n {2}--oq-hue-l: ([\d.]+);\n {2}--oq-hue-ch: ([\d.]+);\n {2}--oq-hue-on: (#[0-9a-f]{6});/
      : /:host\(\[data-theme\]\) \{\n {2}--oq-hue-l: ([\d.]+);\n {2}--oq-hue-ch: ([\d.]+);\n {2}--oq-hue-on: (#[0-9a-f]{6});/;
    const m = block.exec(components);
    if (!m) throw new Error("hue mode block not found");
    return { L: Number(m[1]), C: Number(m[2]), on: m[3] as string };
  };

  for (const theme of Object.values(themes)) {
    it(`${theme.name}: all 12 hues at 4.5:1 as text on surface, on their own tint, and under solid text`, () => {
      const { L, C, on } = mode(theme.mode === "light");
      for (const surfaceKey of ["surface", "bg", "raised"] as const) {
        const surface = hex(theme.palette[surfaceKey]);
        for (let i = 0; i < 12; i++) {
          const lin = oklchToLinear(L, C, i * 30);
          const text = lumLinear(lin);
          expect(ratio(text, lumSrgb(surface)), `hue ${i} on ${surfaceKey}`).toBeGreaterThanOrEqual(4.5);
          // The chip's background: 14% of the hue over the surface, mixed in sRGB.
          const enc = lin.map(encode) as [number, number, number];
          const tint = surface.map((c, k) => c * 0.86 + (enc[k] as number) * 0.14) as [number, number, number];
          expect(ratio(text, lumSrgb(tint)), `hue ${i} on its tint over ${surfaceKey}`).toBeGreaterThanOrEqual(4.5);
          expect(ratio(lumSrgb(hex(on)), text), `solid hue ${i}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});

describe("hueIndex", () => {
  it("is stable, in range and spreads over all twelve slots", () => {
    expect(hueIndex("tor-exit")).toBe(hueIndex("tor-exit"));
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const v = hueIndex(`detector-${i}`);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(12);
      seen.add(v);
    }
    expect(seen.size).toBe(12);
  });
});

describe("new components render the documented markup", () => {
  it("RankedBars: sorted, --value from the max, share", () => {
    const html = render(h(RankedBars, { items: [{ label: "a", value: 10 }, { label: "b", value: 40 }], showShare: true }));
    expect(html).toContain('class="oq-bars"');
    expect(html.indexOf(">b<")).toBeLessThan(html.indexOf(">a<"));
    expect(html).toContain("--value:100.00%");
    expect(html).toContain("--value:25.00%");
    expect(html).toContain('class="oq-bars__share">80%');
  });
  it("StackBar: segments, legend, summary label", () => {
    const html = render(h(StackBar, { segments: [{ label: "Allowed", value: 3 }, { label: "Blocked", value: 1 }] }));
    expect(html).toContain('aria-label="Allowed 75%, Blocked 25%"');
    expect(html).toContain("oq-stackbar__seg oq-fill-series-1");
    expect(html).toContain("oq-stackbar__legend");
  });
  it("Funnel: ordinal fills and rates", () => {
    const html = render(h(Funnel, { stages: [{ label: "Probed", value: 200 }, { label: "Trapped", value: 50 }] }));
    expect(html).toContain("oq-funnel__stage oq-fill-ord-");
    expect(html).toContain(">25%<");
  });
  it("Histogram: bins, threshold and bins past it", () => {
    const html = render(
      h(Histogram, {
        label: "Scores",
        bins: [0, 1, 2, 3].map((i) => ({ label: `${i * 25}`, count: i + 1 })),
        threshold: { at: 0.5, label: "Block ≥ 50" },
        pastThreshold: "danger",
      }),
    );
    expect(html.match(/oq-histogram__bin/g)).toHaveLength(4);
    expect(html.match(/oq-histogram__bin oq-danger/g)).toHaveLength(2);
    expect(html).toContain('data-label="Block ≥ 50"');
  });
  it("PercentileStrip: marks in order", () => {
    const html = render(h(PercentileStrip, { values: { p99: 210, p50: 38 }, max: 400, unit: " ms" }));
    expect(html.indexOf("p50 38 ms")).toBeLessThan(html.indexOf("p99 210 ms"));
    expect(html).toContain('role="img"');
  });
  it("DataTable: expander + hidden detail row, group rows, row accent", () => {
    const rows = [
      { id: 1, region: "eu", name: "fra-01", blocked: true },
      { id: 2, region: "us", name: "iad-01", blocked: false },
      { id: 3, region: "eu", name: "fra-02", blocked: false },
    ];
    const html = render(
      h(DataTable<(typeof rows)[number]>, {
        rows,
        columns: [{ key: "name", header: "Node" }],
        renderDetail: (r) => `detail of ${r.name}`,
        defaultExpanded: [3],
        groupBy: (r) => r.region,
        rowAccent: (r) => (r.blocked ? "danger" : undefined),
      }),
    );
    expect(html.match(/class="oq-table__group"/g)).toHaveLength(2);
    expect(html.indexOf("fra-02")).toBeLessThan(html.indexOf("iad-01"));
    expect(html).toContain('class="oq-row-accent oq-danger"');
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("detail of fra-02");
    expect(html).not.toContain("detail of fra-01");
    expect(html.match(/class="oq-table__detail"[^>]*hidden/g)).toHaveLength(2);
  });
  it("DataTable without the new props renders as before", () => {
    const html = render(h(DataTable<{ id: number; a: string }>, { rows: [{ id: 1, a: "x" }], columns: [{ key: "a", header: "A" }] }));
    expect(html).not.toContain("oq-table__expander");
    expect(html).not.toContain("oq-table__group");
  });
  it("Chip: hue and evidence", () => {
    expect(render(h(Chip, { hue: 13 }, "tag"))).toContain("oq-chip oq-hue-1");
    expect(render(h(Chip, { hue: -1 }, "tag"))).toContain("oq-hue-11");
    expect(render(h(Chip, { color: "danger", evidence: "proven" }, "x"))).toContain("oq-chip--proven");
    expect(render(h(Chip, { color: "warning", evidence: "suspected" }, "x"))).toContain("oq-chip--suspected");
  });
  it("SkipLink, ConfirmButton, SortableList, ChipGrid, PreviewFrame, CardTools", () => {
    expect(render(h(SkipLink, { target: "main" }))).toContain('<a href="#main" class="oq-skip-link">');
    const confirm = render(h(ConfirmButton, { onConfirm: () => {} }, "Delete"));
    expect(confirm).toContain(">Delete<");
    expect(confirm).toContain('aria-live="polite"');
    const sortable = render(h(SortableList<string>, { items: ["a", "b"], getKey: (x) => x, onReorder: () => {}, renderItem: (x) => x }));
    expect(sortable.match(/oq-sortable__handle/g)).toHaveLength(2);
    expect(sortable).toContain('aria-label="Move Item 1 up" disabled');
    const grid = render(h(ChipGrid, { values: ["10.0.0.0/8", "192.168.0.0/16"], noun: "ranges", onRemove: () => {} }));
    expect(grid).toContain("2 ranges");
    expect(grid).toContain('aria-label="Remove 10.0.0.0/8"');
    const frame = render(h(PreviewFrame, { src: "/p", title: "Preview", defaultDevice: "phone" }));
    expect(frame).toContain('data-device="phone"');
    expect(frame).toContain('sandbox="allow-scripts"');
    const tools = render(h(CardTools, { folded: true, onFoldedChange: () => {}, pinned: true, onPinnedChange: () => {}, title: "Traffic" }));
    expect(tools).toContain('aria-label="Unfold Traffic"');
    expect(tools).toContain('aria-pressed="true"');
  });
});

describe("forced colours and stale/flash states exist", () => {
  it("components.css and charts.css carry a forced-colors pass", () => {
    expect(css("components.css")).toContain("@media (forced-colors: active)");
    expect(css("charts.css")).toContain("@media (forced-colors: active)");
  });
  it("flash respects reduced motion and stale has a marker", () => {
    const c = css("components.css");
    expect(c).toMatch(/prefers-reduced-motion: reduce\) \{\n {2}\.oq-flash/);
    expect(c).toContain('.oq-card[data-stale="true"] .oq-card__title::after { content: "stale"; }');
  });
});
