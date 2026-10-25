import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createTheme, darkTheme, lightTheme, type Theme, themes, themeToCss, themeVars } from "../src/theme/index";

describe("createTheme", () => {
  it("merges overrides over the base and leaves the base untouched", () => {
    const t = createTheme({ name: "brand", palette: { primary: "#ff0000" }, radius: { md: 9 } });
    expect(t.name).toBe("brand");
    expect(t.palette.primary).toBe("#ff0000");
    expect(t.palette.surface).toBe(darkTheme.palette.surface);
    expect(t.radius).toEqual({ ...darkTheme.radius, md: 9 });
    expect(darkTheme.palette.primary).toBe("#78dce8");
  });

  it("can start from the light theme", () => {
    const t = createTheme({ name: "l2", palette: { bg: "#fff" } }, lightTheme);
    expect(t.mode).toBe("light");
    expect(t.palette.text).toBe(lightTheme.palette.text);
  });

  it("throws on an unknown token instead of ignoring it", () => {
    expect(() => createTheme({ name: "x", palette: { primay: "#000" } } as never)).toThrow(/theme\.palette\.primay/);
    expect(() => createTheme({ name: "x", nope: 1 } as never)).toThrow(/theme\.nope/);
  });
});

describe("themeVars", () => {
  it("emits one variable per palette colour plus the fixed scale", () => {
    const vars = themeVars(darkTheme);
    const names = vars.map(([k]) => k);
    const palette = Object.keys(darkTheme.palette).length;
    // fonts 2, line height 1, text scale 7, radius 3, space 1, control 3, shadow 3, motion 1, color-scheme 1
    expect(vars).toHaveLength(palette + 22);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("--oq-border-strong");
    expect(names).toContain("--oq-on-primary");
    expect(names).toContain("--oq-text-2xl");
    expect(vars.find(([k]) => k === "--oq-text-md")?.[1]).toBe(`${darkTheme.font.size}px`);
  });

  it("dark and light define the same variables", () => {
    expect(themeVars(lightTheme).map(([k]) => k)).toEqual(themeVars(darkTheme).map(([k]) => k));
  });

  it("themeToCss wraps the variables in the selector", () => {
    expect(themeToCss(lightTheme)).toMatch(/^\[data-theme="light"\] \{\n {2}--oq-bg: #f4f4f2;/);
  });
});

describe("styles/tokens.css", () => {
  it("is in sync with the themes", () => {
    const script = fileURLToPath(new URL("../scripts/tokens.mjs", import.meta.url));
    expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });
});

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const intents = ["primary", "secondary", "success", "warning", "danger", "info"] as const;

describe.each(Object.values(themes).map((t) => [t.name, t] as [string, Theme]))("theme %s", (_name, t) => {
  const p = t.palette;
  const layers = { bg: p.bg, surface: p.surface, raised: p.raised };

  it("has a name matching its key in `themes`", () => {
    expect(themes[t.name as keyof typeof themes]).toBe(t);
  });

  it.each(Object.entries(layers))("text is readable on %s", (_layer, bg) => {
    expect(contrast(p.text, bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textFaint, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(intents)("%s carries its on-colour and reads as text on the page", (k) => {
    const on = p[`on${k[0]?.toUpperCase()}${k.slice(1)}` as keyof typeof p];
    expect(contrast(p[k], on)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p[k], p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p[k], p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("neutral carries its on-colour", () => {
    expect(contrast(p.neutral, p.onNeutral)).toBeGreaterThanOrEqual(4.5);
  });

  it("is in tokens.css", () => {
    expect(themeToCss(t)).toContain(`--oq-primary: ${p.primary};`);
  });
});
