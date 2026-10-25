import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(`${root}${p}`, "utf8");

/** Every page that carries the shared gallery app bar. */
const galleries = readdirSync(root).filter((f) => f.endsWith(".html") && read(f).includes('<header class="oq-appbar oq-appbar--sticky pv-appbar">'));

/**
 * The version the galleries show is the one the top CHANGELOG heading names: the changelog is
 * written before a release, and the release workflow sets package.json to that version as it
 * publishes, so the heading is the version these pages document.
 */
const changelogVersion = /^## (\d+\.\d+\.\d+)/m.exec(read("CHANGELOG.md"))?.[1];

const parse = (v: string) => v.split(".").map(Number);
const notBehind = (a: string, b: string) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return true;
};

describe("gallery app bar", () => {
  it("is on every gallery page", () => {
    expect(galleries.sort()).toEqual(
      ["elements.html", "fonts.html", "icons.html", "preview-charts.html", "preview-data.html", "preview-forms.html", "preview-layout.html", "preview.html", "theme-builder.html"].sort(),
    );
  });

  it("the CHANGELOG's top heading is not behind package.json", () => {
    const pkg = JSON.parse(read("package.json")).version as string;
    expect(changelogVersion).toBeDefined();
    expect(notBehind(changelogVersion as string, pkg)).toBe(true);
  });

  it.each(galleries)("%s shows the version the CHANGELOG is at", (page) => {
    const chip = /OSQD&nbsp;UI <span class="oq-chip oq-sm oq-neutral">([^<]+)<\/span>/.exec(read(page))?.[1];
    expect(chip).toBe(changelogVersion);
  });

  it.each(galleries)("%s links every gallery, Fonts included", (page) => {
    const html = read(page);
    const header = html.slice(html.indexOf('<header class="oq-appbar'), html.indexOf("</header>"));
    for (const target of ["preview.html", "preview-charts.html", "preview-data.html", "preview-forms.html", "preview-layout.html", "elements.html", "icons.html", "fonts.html", "theme-builder.html"]) {
      expect(header).toContain(`href="${target}"`);
    }
  });
});
