import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const examples = join(root, "examples");

/** Every page a person can open: the galleries at the root, the samples and the error pages. */
const pages = [
  ...readdirSync(root).filter((f) => f.endsWith(".html")),
  ...readdirSync(examples).filter((f) => f.endsWith(".html")).map((f) => `examples/${f}`),
  ...readdirSync(join(root, "pages")).filter((f) => f.endsWith(".html")).map((f) => `pages/${f}`),
];

describe("sample sites", () => {
  it("are built from examples/src (node examples/build.mjs --check)", () => {
    expect(() => execFileSync(process.execPath, [join(examples, "build.mjs"), "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("have a source for every built page", () => {
    const built = readdirSync(examples).filter((f) => f.endsWith(".html"));
    const sources = readdirSync(join(examples, "src")).filter((f) => f.endsWith(".html"));
    expect(built.sort()).toEqual(sources.sort());
  });
});

describe.each(pages)("%s", (page) => {
  const html = readFileSync(join(root, page), "utf8");

  it("links only to local files that exist", () => {
    // Code samples on the page (in <pre> and <code>) show other people's paths; only real markup counts.
    const markup = html.replace(/<(pre|code)\b[\s\S]*?<\/\1>/g, "");
    const refs = [...markup.matchAll(/\b(?:href|src)="([^"#?:]+\.(?:html|css|js|svg))(?:[#?][^"]*)?"/g)].map((m) => m[1] as string);
    const missing = refs.filter((r) => !existsSync(resolve(dirname(join(root, page)), r)));
    expect(missing).toEqual([]);
  });

  it("has no unexpanded placeholders", () => {
    expect(html).not.toMatch(/\{\{(icon|illustration|theme-select|samples-menu|brand)[:}]/);
  });
});
