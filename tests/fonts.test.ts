import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs build module, no declarations
import { fontList } from "../type/build.mjs";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");
const wawoff2 = require("wawoff2");
const root = fileURLToPath(new URL("../", import.meta.url));

type Entry = { key: string; mono: boolean; weight: number; name: string; file: string };
const fonts = fontList() as Entry[];

/** What every font must cover: printable ASCII, Polish, and the punctuation the kit's UI uses. */
const CHARSET = [
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)),
  ..."ąćęłńóśźżĄĆĘŁŃÓŚŹŻ",
  ..."–—‘’“”„…•·°±×÷€←→↑↓✓",
  " ",
];

const parsed = new Map<string, any>();
beforeAll(async () => {
  for (const f of fonts) {
    const otf = await wawoff2.decompress(readFileSync(`${root}assets/fonts/${f.file}`));
    parsed.set(f.file, opentype.parse(Uint8Array.from(otf).buffer));
  }
});

describe("OSQD typefaces", () => {
  it("has three families, each a sans and a mono in four weights", () => {
    expect(fonts).toHaveLength(24);
    expect(new Set(fonts.map((f) => f.name))).toEqual(
      new Set(["OSQD Sans", "OSQD Mono", "OSQD Tech", "OSQD Tech Mono", "OSQD Clear", "OSQD Clear Mono"]),
    );
  });

  it.each(fonts.map((f) => [f.file, f] as const))("%s covers the whole character set", (_file, f) => {
    const font = parsed.get(f.file);
    const missing = CHARSET.filter((ch) => font.charToGlyphIndex(ch) === 0);
    expect(missing).toEqual([]);
  });

  it.each(fonts.map((f) => [f.file, f] as const))("%s names itself and its weight", (_file, f) => {
    const font = parsed.get(f.file);
    const names = font.names.windows ?? font.names;
    expect(names.fontFamily.en).toBe(f.name);
    expect(font.tables.os2.usWeightClass).toBe(f.weight);
    expect(font.unitsPerEm).toBe(1000);
  });

  it.each(fonts.filter((f) => f.mono).map((f) => [f.file, f] as const))("%s is monospaced: every glyph one advance", (_file, f) => {
    const font = parsed.get(f.file);
    const advances = new Set<number>();
    for (let i = 0; i < font.glyphs.length; i++) advances.add(font.glyphs.get(i).advanceWidth);
    expect([...advances]).toEqual([600]);
    expect(font.tables.post.isFixedPitch).toBe(1);
  });

  it.each(fonts.filter((f) => !f.mono).map((f) => [f.file, f] as const))("%s has tabular figures", (_file, f) => {
    const font = parsed.get(f.file);
    const widths = new Set([..."0123456789"].map((d) => font.charToGlyph(d).advanceWidth));
    expect(widths.size).toBe(1);
  });

  it("keeps vertical metrics identical across the weights of a family", () => {
    for (const name of new Set(fonts.map((f) => f.name))) {
      const metrics = fonts
        .filter((f) => f.name === name)
        .map((f) => {
          const t = parsed.get(f.file).tables;
          return [t.hhea.ascender, t.hhea.descender, t.hhea.lineGap, t.os2.sTypoAscender, t.os2.sTypoDescender, t.os2.sTypoLineGap, t.os2.sxHeight, t.os2.sCapHeight];
        });
      expect(new Set(metrics.map((m) => m.join()))).toHaveLength(1);
    }
  });

  it("uses the typographic line metrics, so the line box is the same on every platform", () => {
    for (const f of fonts) expect(parsed.get(f.file).tables.os2.fsSelection & 128).toBe(128);
  });

  it("kerns the proportional fonts and not the monospaced ones", () => {
    for (const f of fonts) {
      const font = parsed.get(f.file);
      const av = font.getKerningValue(font.charToGlyph("A"), font.charToGlyph("V"));
      if (f.mono) expect(av).toBe(0);
      else expect(av).toBeLessThan(0);
    }
  });

  it("styles/fonts.css declares every font file, and every file it names exists", () => {
    const css = readFileSync(`${root}styles/fonts.css`, "utf8");
    const urls = [...css.matchAll(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
    expect(new Set(urls)).toEqual(new Set(fonts.map((f) => f.file)));
    for (const u of urls) expect(existsSync(`${root}assets/fonts/${u}`)).toBe(true);
    expect(readFileSync(`${root}styles/index.css`, "utf8")).toContain('@import url("./fonts.css");');
  });

  it("ships the Open Font License next to the fonts", () => {
    const ofl = readFileSync(`${root}assets/fonts/OFL.txt`, "utf8");
    expect(ofl).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(ofl).toContain("OSQD Sans");
  });

  it("the committed fonts are what the source builds (npm run fonts)", () => {
    expect(() => execFileSync(process.execPath, [`${root}type/build.mjs`, "--check"], { stdio: "pipe" })).not.toThrow();
  }, 120_000);
});
