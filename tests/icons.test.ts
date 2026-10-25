import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { iconNames, icons, iconSvg } from "../src/icons/index";
import { illustrationNames, illustrationSvg } from "../src/illustrations/index";
import { Icon, Illustration } from "../src/react/Icon";

const ALLOWED = new Set(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);
const root = fileURLToPath(new URL("..", import.meta.url));

describe("icons", () => {
  it("has a useful number of icons", () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(90);
  });

  it.each(iconNames)("%s: kebab-case name, allowed elements only, no hard-coded colour", (name) => {
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const markup = icons[name];
    expect(markup.length).toBeGreaterThan(0);
    const tags = [...markup.matchAll(/<\/?([a-zA-Z]+)/g)].map((m) => m[1]);
    for (const tag of tags) expect(ALLOWED.has(tag as string), `${name}: <${tag}>`).toBe(true);
    // Every element is self-closing: nothing nested, nothing left open.
    expect(markup).not.toMatch(/<\/[a-z]+>/);
    for (const m of markup.matchAll(/\b(fill|stroke)="([^"]*)"/g)) {
      expect(["none", "currentColor"], `${name}: ${m[0]}`).toContain(m[2]);
    }
    expect(markup).not.toMatch(/style=|#[0-9a-f]{3,6}\b|rgb\(/i);
    // Coordinates stay inside the 24 grid.
    for (const m of markup.matchAll(/\b(?:cx|cy|x|y|x1|y1|x2|y2)="(-?[\d.]+)"/g)) {
      const n = Number(m[1]);
      expect(n >= 0 && n <= 24, `${name}: ${m[0]}`).toBe(true);
    }
  });

  it("iconSvg builds a full, accessible svg", () => {
    const plain = iconSvg("search");
    expect(plain).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/);
    expect(plain).toContain('aria-hidden="true"');
    const titled = iconSvg("search", { size: 32, title: 'Find "x"', strokeWidth: 2 });
    expect(titled).toContain('width="32"');
    expect(titled).toContain('stroke-width="2"');
    expect(titled).toContain('aria-label="Find &quot;x&quot;"');
    expect(titled).toContain("<title>");
    expect(() => iconSvg("nope" as never)).toThrow(/unknown icon/);
  });

  it("renders <Icon> and <Illustration> on the server", () => {
    const html = renderToStaticMarkup(createElement(Icon, { name: "database", size: 20, color: "danger" }));
    expect(html).toContain('class="oq-icon oq-text-c oq-danger"');
    expect(html).toContain('width="20"');
    expect(html).toContain("<ellipse");
    expect(html).toContain('aria-hidden="true"');
    const titled = renderToStaticMarkup(createElement(Icon, { name: "bell", title: "Alerts" }));
    expect(titled).toContain('role="img"');
    expect(titled).toContain("<title>Alerts</title>");
    const ill = renderToStaticMarkup(createElement(Illustration, { name: "offline", width: 240 }));
    expect(ill).toContain('height="180"');
    expect(ill).toContain("oq-illustration");
  });
});

describe("illustrations", () => {
  it("has the eight states", () => {
    expect(illustrationNames).toEqual(
      expect.arrayContaining(["empty-inbox", "no-results", "error-404", "server-error", "offline", "success", "no-data", "locked"]),
    );
  });

  it.each(illustrationNames)("%s takes its colours from theme variables", (name) => {
    const svg = illustrationSvg(name);
    expect(svg).toMatch(/viewBox="0 0 160 120"/);
    // Colours only ever appear as var(--oq-…, fallback).
    const colours = [...svg.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m.index ?? 0);
    for (const i of colours) expect(svg.slice(Math.max(0, i - 40), i)).toMatch(/var\(--oq-[a-z-]+, $/);
  });
});

describe("generated files", () => {
  it("assets and icons.html are in sync with the sources", () => {
    expect(() => execFileSync("node", ["scripts/icons.mjs", "--check"], { cwd: root, stdio: "pipe" })).not.toThrow();
  });
});
