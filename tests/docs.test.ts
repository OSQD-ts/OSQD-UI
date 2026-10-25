import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The generator runs in its own process: it pins TZ and the clock, which must not leak into
// the other test files sharing this worker.
const root = fileURLToPath(new URL("../", import.meta.url));
const run = (...args: string[]) => execFileSync(process.execPath, ["scripts/docs.mjs", ...args], { cwd: root, encoding: "utf8" });

interface DocProp {
  name: string;
  type: string;
  optional: boolean;
}
interface DocComponent {
  name: string;
  slug: string;
  area: string;
  doc: string;
  props: DocProp[];
}

const components = JSON.parse(run("--dump")) as DocComponent[];
const pageOf = (c: DocComponent) => readFileSync(`${root}docs/site/components/${c.slug}.html`, "utf8");

describe("docs site", () => {
  it("is in sync with the source (npm run docs)", () => {
    expect(() => run("--check")).not.toThrow();
  }, 120_000);

  it("finds the components", () => {
    expect(components.length).toBeGreaterThan(100);
    for (const name of ["Button", "TextField", "DataTable", "BarChart", "Dialog", "VirtualTable", "Icon"])
      expect(components.map((c) => c.name)).toContain(name);
  });

  it("puts every component in an area (none in Other)", () => {
    expect(components.filter((c) => c.area === "Other").map((c) => c.name)).toEqual([]);
  });

  it("has a description for every component", () => {
    expect(components.filter((c) => !c.doc).map((c) => c.name)).toEqual([]);
  });

  it.each(components.map((c) => [c.name, c] as const))("%s has a page with an example and its props", (_name, c) => {
    const html = pageOf(c);
    expect(html).toContain(`<h1 class="oq-h2">${c.name}</h1>`);
    expect(html).toContain('id="example"');
    for (const p of c.props) expect(html).toContain(`<span class="oq-mono oq-strong">${p.name}</span>`);
    if (c.props.length === 0) expect(html).toContain("No props of its own.");
  });

  it("lists every custom element", () => {
    const html = readFileSync(`${root}docs/site/elements.html`, "utf8");
    const index = readFileSync(`${root}src/elements/index.ts`, "utf8");
    const tags = [...index.matchAll(/"(oq-[a-z-]+)":\s*Oq\w+,/g)].map((m) => m[1]);
    expect(tags.length).toBeGreaterThan(10);
    for (const tag of tags) expect(html).toContain(`id="${tag}"`);
  });
});
