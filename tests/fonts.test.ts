import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs build modules, no declarations
import { fontList, subsetOf, SUBSETS, subsetsFor, unicodeRange } from "../type/build.mjs";
// @ts-expect-error — plain .mjs build modules, no declarations
import { ITALIC_ANGLE, OPTICAL, WEIGHTS, WIDTHS } from "../type/params.mjs";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");
const wawoff2 = require("wawoff2");
const root = fileURLToPath(new URL("../", import.meta.url));

type Face = { key: string; mono: boolean; opsz: string; width: string; weight: number; italic: boolean; name: string; base: string; file: string };
const faces = fontList() as Face[];
const FAMILIES = ["sans", "tech", "clear"];

/** What every font must cover: printable ASCII, Polish, and the punctuation the kit's UI uses. */
const CHARSET = [
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)),
  ..."ąćęłńóśźżĄĆĘŁŃÓŚŹŻ",
  ..."–—‘’“”„…•·°±×÷€←→↑↓✓",
  " ",
];

/** The fonts parsed once: the complete file of every face. */
const parsed = new Map<string, any>();
const load = async (path: string) => {
  const otf = await wawoff2.decompress(readFileSync(path));
  return opentype.parse(Uint8Array.from(otf).buffer);
};
beforeAll(async () => {
  for (const f of faces) parsed.set(f.file, await load(`${root}assets/fonts/${f.file}`));
}, 300_000);

const codePoints = (font: any): number[] => {
  const out: number[] = [];
  for (let i = 0; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    if (g.unicode !== undefined) out.push(g.unicode);
  }
  return out.sort((a, b) => a - b);
};

describe("OSQD typefaces: the faces", () => {
  it("has every family in every optical size, width, weight and style it is meant to", () => {
    const has = (pred: (f: Face) => boolean, label: string) => expect(faces.find(pred), label).toBeDefined();
    for (const key of FAMILIES) {
      for (const w of WEIGHTS) {
        for (const italic of [false, true]) {
          has((f) => f.key === key && !f.mono && f.opsz === "text" && f.width === "normal" && f.weight === w && f.italic === italic, `${key} text ${w} ${italic}`);
          has((f) => f.key === key && f.mono && f.weight === w && f.italic === italic, `${key} mono ${w} ${italic}`);
          if (WIDTHS.condensed.families.includes(key)) has((f) => f.key === key && f.width === "condensed" && f.weight === w && f.italic === italic, `${key} condensed ${w} ${italic}`);
        }
        // Display and Caption have no italic of their own: the Text italic stands in.
        has((f) => f.key === key && f.opsz === "display" && f.weight === w && !f.italic, `${key} display ${w}`);
      }
      for (const w of OPTICAL.caption.weights) has((f) => f.key === key && f.opsz === "caption" && f.weight === w && !f.italic, `${key} caption ${w}`);
    }
    expect(WEIGHTS).toEqual([200, 300, 400, 500, 600, 700, 800, 900]);
    expect(faces.filter((f) => (f.opsz === "display" || f.opsz === "caption") && f.italic)).toEqual([]);
    expect(faces.filter((f) => f.width === "condensed").every((f) => !f.mono && f.opsz === "text" && f.key !== "clear")).toBe(true);
    // Per family: Text and Mono 8 × 2, Display 8, Caption 4; Sans and Tech Condensed 8 × 2.
    expect(faces).toHaveLength(3 * (16 + 16 + 8 + 4) + 2 * 16);
    const cap = (k: string) => `${k[0]!.toUpperCase()}${k.slice(1)}`;
    expect(new Set(faces.map((f) => f.name))).toEqual(
      new Set([
        "OSQD Sans", "OSQD Mono", "OSQD Tech", "OSQD Tech Mono", "OSQD Clear", "OSQD Clear Mono", "OSQD Sans Condensed", "OSQD Tech Condensed",
        ...FAMILIES.flatMap((k) => [`OSQD ${cap(k)} Caption`, `OSQD ${cap(k)} Display`]),
      ]),
    );
    expect(faces.filter((f) => f.mono).every((f) => f.opsz === "text")).toBe(true);
  });

  it.each(faces.map((f) => [f.file, f] as const))("%s covers the base character set", (_file, f) => {
    const font = parsed.get(f.file);
    expect(CHARSET.filter((ch) => font.charToGlyphIndex(ch) === 0)).toEqual([]);
  });

  it.each(faces.map((f) => [f.file, f] as const))("%s names its family, weight and style", (_file, f) => {
    const font = parsed.get(f.file);
    const names = font.names.windows ?? font.names;
    expect(names.fontFamily.en).toBe(f.name);
    expect(font.tables.os2.usWeightClass).toBe(f.weight);
    expect(font.unitsPerEm).toBe(1000);
    expect(Boolean(font.tables.os2.fsSelection & 1)).toBe(f.italic);
    expect(font.tables.post.italicAngle).toBe(f.italic ? -ITALIC_ANGLE : 0);
  });

  it("gives every face of a family the same code points, so a language works in every style", () => {
    for (const key of FAMILIES) {
      const sets = faces.filter((f) => f.key === key).map((f) => codePoints(parsed.get(f.file)).join());
      expect(new Set(sets).size, key).toBe(1);
    }
  });
});

describe("OSQD typefaces: metrics", () => {
  it.each(faces.filter((f) => f.mono).map((f) => [f.file, f] as const))("%s is monospaced: every glyph one advance", (_file, f) => {
    const font = parsed.get(f.file);
    const advances = new Set<number>();
    for (let i = 0; i < font.glyphs.length; i++) advances.add(font.glyphs.get(i).advanceWidth);
    expect([...advances]).toEqual([600]);
    expect(font.tables.post.isFixedPitch).toBe(1);
  });

  it.each(faces.filter((f) => !f.mono).map((f) => [f.file, f] as const))("%s has tabular figures", (_file, f) => {
    const font = parsed.get(f.file);
    expect(new Set([..."0123456789"].map((d) => font.charToGlyph(d).advanceWidth)).size).toBe(1);
  });

  it("keeps vertical metrics identical across the weights and styles of each family and size", () => {
    for (const name of new Set(faces.map((f) => f.name))) {
      const metrics = faces
        .filter((f) => f.name === name)
        .map((f) => {
          const t = parsed.get(f.file).tables;
          return [t.hhea.ascender, t.hhea.descender, t.hhea.lineGap, t.os2.sTypoAscender, t.os2.sTypoDescender, t.os2.sTypoLineGap, t.os2.sxHeight, t.os2.sCapHeight];
        });
      expect(new Set(metrics.map((m) => m.join())), name).toHaveLength(1);
    }
  });

  it("narrows a proportional italic a little and keeps a mono italic on its advance", () => {
    for (const f of faces.filter((x) => x.italic)) {
      const upright = faces.find((x) => x.key === f.key && x.mono === f.mono && x.opsz === f.opsz && x.width === f.width && x.weight === f.weight && !x.italic)!;
      const a = parsed.get(f.file).charToGlyph("n").advanceWidth;
      const b = parsed.get(upright.file).charToGlyph("n").advanceWidth;
      if (f.mono) expect(a).toBe(b);
      else expect(a / b).toBeCloseTo(0.975, 1);
    }
  });

  it("slants italic glyphs by the italic angle: a vertical bar leans right", () => {
    // The bar is a plain vertical stroke in every family; its slanted width minus its upright width
    // is its height times tan(angle).
    for (const f of faces.filter((x) => x.italic)) {
      const box = (font: any) => font.charToGlyph("|").getBoundingBox();
      const it = box(parsed.get(f.file));
      const up = box(parsed.get(faces.find((x) => x.key === f.key && x.mono === f.mono && x.opsz === f.opsz && x.width === f.width && x.weight === f.weight && !x.italic)!.file));
      const lean = it.x2 - it.x1 - (up.x2 - up.x1) * (f.mono ? 1 : 0.975);
      expect(lean / ((up.y2 - up.y1) * Math.tan((ITALIC_ANGLE * Math.PI) / 180))).toBeCloseTo(1, 1);
    }
  });

  it("draws Caption with a taller x-height and wider spacing, Display with tighter spacing", () => {
    for (const key of FAMILIES) {
      const get = (opsz: string) => parsed.get(faces.find((f) => f.key === key && f.opsz === opsz && f.width === "normal" && f.weight === 400 && !f.italic && !f.mono)!.file);
      const [text, caption, display] = [get("text"), get("caption"), get("display")];
      expect(caption.tables.os2.sxHeight).toBeGreaterThan(text.tables.os2.sxHeight);
      const n = (font: any) => font.charToGlyph("n").advanceWidth;
      expect(n(caption)).toBeGreaterThan(n(text));
      expect(n(display)).toBeLessThan(n(text));
    }
  });

  it("draws Condensed narrower than the normal width, with the same figures for tables", () => {
    for (const key of WIDTHS.condensed.families) {
      for (const w of [200, 400, 900]) {
        const get = (width: string) => parsed.get(faces.find((f) => f.key === key && !f.mono && f.opsz === "text" && f.width === width && f.weight === w && !f.italic)!.file);
        const [normal, cond] = [get("normal"), get("condensed")];
        const n = (font: any, ch: string) => font.charToGlyph(ch).advanceWidth;
        expect(n(cond, "n") / n(normal, "n")).toBeLessThan(0.9);
        expect(n(cond, "0") / n(normal, "0")).toBeLessThan(0.9);
        expect(new Set([..."0123456789"].map((d) => n(cond, d))).size).toBe(1);
      }
    }
  });

  it("uses the typographic line metrics, so the line box is the same on every platform", () => {
    for (const f of faces) expect(parsed.get(f.file).tables.os2.fsSelection & 128).toBe(128);
  });

  it("kerns the proportional faces, accented letters too, and not the monos", () => {
    for (const f of faces) {
      const font = parsed.get(f.file);
      const kern = (a: string, b: string) => font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));
      if (f.mono) expect(kern("A", "V")).toBe(0);
      else {
        expect(kern("A", "V")).toBeLessThan(0);
        // Ą decomposes to A plus an ogonek, so it kerns like A.
        expect(kern("Ą", "V")).toBeLessThan(0);
      }
    }
  });
});

describe("OSQD typefaces: subsets and CSS", () => {
  const css = readFileSync(`${root}styles/fonts.css`, "utf8");
  const rules = [...css.matchAll(/@font-face\{font-family:"([^"]+)";font-style:(\w+);font-weight:(\d+);font-display:swap;src:url\("\.\.\/assets\/fonts\/subsets\/([^"]+)"\) format\("woff2"\);unicode-range:([^}]+)\}/g)].map((m) => ({
    family: m[1]!,
    style: m[2]!,
    weight: Number(m[3]),
    file: m[4]!,
    range: m[5]!,
  }));

  it("serves every face through its subsets, and every subset file it names exists", () => {
    const declared = new Set(rules.map((r) => r.file));
    const onDisk = new Set(readdirSync(`${root}assets/fonts/subsets`));
    // The package ships the whole directory, so a file the CSS does not name is dead weight in it:
    // the build says which (`npm run fonts` warns); remove them.
    const stale = [...onDisk].filter((f) => !declared.has(f));
    expect(stale, `${stale.length} subset files are not built any more; remove them`).toEqual([]);
    expect(declared).toEqual(onDisk);
    for (const f of faces) expect(rules.some((r) => r.file.startsWith(`${f.base}.`) && r.family === f.name && r.weight === f.weight && r.style === (f.italic ? "italic" : "normal"))).toBe(true);
    expect(rules).toHaveLength((css.match(/@font-face/g) ?? []).length);
  });

  it("gives each subset exactly the code points its font has, with no overlap between subsets", async () => {
    // Every face of a family has the same code points (tested above); the Regular text faces stand for the rest.
    for (const f of faces.filter((x) => x.weight === 400 && !x.italic)) {
      // A cut ships the subsets it is for (subsetsFor); the rest fall back to the Text cut.
      const shipped = new Set(subsetsFor(f));
      const all = codePoints(parsed.get(f.file)).filter((cp) => shipped.has(subsetOf(cp)));
      const seen = new Set<number>();
      for (const r of rules.filter((x) => x.file.startsWith(`${f.base}.`))) {
        const subset = r.file.slice(f.base.length + 1, -".woff2".length);
        const font = await load(`${root}assets/fonts/subsets/${r.file}`);
        const cps = codePoints(font);
        expect(r.range).toBe(unicodeRange(cps));
        for (const cp of cps) {
          expect(subsetOf(cp)).toBe(subset);
          expect(seen.has(cp)).toBe(false);
          seen.add(cp);
        }
      }
      expect([...seen].sort((a, b) => a - b)).toEqual(all);
    }
  }, 120_000);

  it("keeps the latin file — the one every page downloads — to Latin text and the UI's own signs", async () => {
    // ASCII, Latin-1, general punctuation, letterlike signs (™) and €, plus the few signs the kit's
    // UI sets (the base arrows, ✓, − and the comparison signs). Anything a module adds outside
    // these belongs in its own subset, or every page would pay for it.
    const allowed = (cp: number) =>
      (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || (cp >= 0x2000 && cp <= 0x206f) || (cp >= 0x2100 && cp <= 0x214f) ||
      [0x20ac, 0x2190, 0x2191, 0x2192, 0x2193, 0x2713, 0x2212, 0x2264, 0x2265, 0x2260, 0x2248, 0x221e].includes(cp);
    for (const f of faces.filter((x) => x.weight === 400 && !x.italic)) {
      const latin = await load(`${root}assets/fonts/subsets/${f.base}.latin.woff2`);
      const stray = codePoints(latin).filter((cp) => !allowed(cp)).map((cp) => `U+${cp.toString(16).toUpperCase()}`);
      expect(stray, f.file).toEqual([]);
    }
  }, 120_000);

  it("orders subsets latin first and names only the known ones", () => {
    expect(SUBSETS[0]).toBe("latin");
    for (const r of rules) expect(SUBSETS).toContain(r.file.split(".").at(-2));
  });

  it("writes unicode-range runs compactly", () => {
    expect(unicodeRange([0x41, 0x42, 0x43, 0x45, 0x104])).toBe("U+41-43,U+45,U+104");
  });

  it("sets the kit's small text in the Caption cut and the big headings in Display, per family", () => {
    expect(css).toMatch(/--oq-font-caption: "OSQD Sans Caption", "OSQD Sans"/);
    expect(css).toMatch(/--oq-font-display: "OSQD Sans Display", "OSQD Sans"/);
    for (const key of ["tech", "clear"]) expect(css).toContain(`[data-font="${key}"]`);
    expect(css).toMatch(/\.oq-overline[\s\S]*font-family: var\(--oq-font-caption/);
    expect(css).toMatch(/\.oq-h1, \.oq-h2\)[^{]*\{\s*font-family: var\(--oq-font-display/);
    expect(readFileSync(`${root}styles/index.css`, "utf8")).toContain('@import url("./fonts.css");');
  });

  it("every subset file the CSS names is a valid font", async () => {
    for (const file of new Set(rules.map((r) => r.file))) {
      const font = await load(`${root}assets/fonts/subsets/${file}`);
      expect(font.glyphs.length, file).toBeGreaterThan(1);
    }
  }, 300_000);

  it("switches to the condensed cut with data-font and .oq-condensed, and maps the feature utilities", () => {
    expect(css).toContain('[data-font="condensed"]');
    expect(css).toContain('[data-font="tech-condensed"]');
    expect(css).toMatch(/--oq-font-condensed: "OSQD Sans Condensed"/);
    expect(css).toMatch(/\.oq-condensed \{[^}]*font-family: var\(--oq-font-condensed/);
    for (const [cls, decl] of [
      ["oq-pnum", "proportional-nums"],
      ["oq-zero", "slashed-zero"],
      ["oq-frac", "diagonal-fractions"],
      ["oq-sups", "font-variant-position: super"],
      ["oq-subs", "font-variant-position: sub"],
      ["oq-ss01", '"ss01"'],
      ["oq-case", '"case"'],
    ]) expect(css).toMatch(new RegExp(`\\.${cls}[^{]*\\{[^}]*${decl.replace(/[()]/g, "\\$&")}`));
  });

  it("keeps the complete font of every face next to the subsets, for offline and desktop use", () => {
    for (const f of faces) expect(existsSync(`${root}assets/fonts/${f.file}`)).toBe(true);
  });

  it("ships the Open Font License next to the fonts", () => {
    const ofl = readFileSync(`${root}assets/fonts/OFL.txt`, "utf8");
    expect(ofl).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(ofl).toContain("OSQD Sans");
  });

  it("the committed fonts, CSS and specimen coverage are what the source builds (npm run fonts)", () => {
    expect(() => execFileSync(process.execPath, [`${root}type/build.mjs`, "--check"], { stdio: "pipe" })).not.toThrow();
  }, 300_000);
});

describe("OSQD typefaces: OpenType features", () => {
  const sans = () => parsed.get(faces.find((f) => f.key === "sans" && !f.mono && f.opsz === "text" && f.width === "normal" && f.weight === 400 && !f.italic)!.file);
  /** Single substitutions of one feature, as glyph-name pairs. */
  const pairs = (font: any, tag: string): Array<[string, string]> => {
    const gsub = font.tables.gsub;
    const feature = gsub.features.find((f: any) => f.tag === tag);
    if (!feature) return [];
    const name = (i: number) => font.glyphs.get(i).name;
    const out: Array<[string, string]> = [];
    for (const li of feature.feature.lookupListIndexes) {
      const lookup = gsub.lookups[li];
      if (lookup.lookupType !== 1) continue;
      for (const st of lookup.subtables) st.coverage.glyphs.forEach((g: number, i: number) => out.push([name(g), name(st.substitute[i])]));
    }
    return out;
  };

  it("declares the features in every face, under every script", () => {
    for (const f of faces.filter((x) => x.weight === 400 && !x.italic)) {
      const gsub = parsed.get(f.file).tables.gsub;
      expect(gsub, f.file).toBeDefined();
      expect(gsub.features.map((x: any) => x.tag)).toEqual(["case", "dnom", "frac", "numr", "pnum", "ss01", "subs", "sups", "tnum", "zero"]);
      expect(gsub.scripts.map((x: any) => x.tag)).toEqual(["DFLT", "armn", "cyrl", "geor", "grek", "hebr", "latn"]);
    }
  });

  it("pnum spaces every figure by its shape, tnum takes it back, and the one is narrower", () => {
    const font = sans();
    const digits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    expect(pairs(font, "pnum")).toEqual(digits.map((d) => [d, `${d}.pnum`]));
    expect(pairs(font, "tnum")).toEqual(digits.map((d) => [`${d}.pnum`, d]));
    const byName = (n: string) => {
      for (let i = 0; i < font.glyphs.length; i++) if (font.glyphs.get(i).name === n) return font.glyphs.get(i);
      throw new Error(`no glyph ${n}`);
    };
    const adv = (n: string) => byName(n).advanceWidth;
    expect(adv("one.pnum")).toBeLessThan(adv("one"));
  });

  it("zero, ss01 and case substitute what they say", () => {
    const font = sans();
    expect(pairs(font, "zero")).toEqual(expect.arrayContaining([["zero", "zero.zero"], ["zero.pnum", "zero.pnum.zero"]]));
    expect(pairs(font, "ss01")).toEqual(expect.arrayContaining([["I", "I.ss01"], ["l", "l.ss01"], ["one", "one.ss01"], ["lslash", "lslash.ss01"]]));
    expect(pairs(font, "case")).toEqual(expect.arrayContaining([["hyphen", "hyphen.case"], ["parenleft", "parenleft.case"], ["colon", "colon.case"]]));
    for (const tag of ["sups", "subs", "numr", "dnom"]) expect(pairs(font, tag)).toEqual(expect.arrayContaining([["two", `two.${tag}`]]));
  });

  it("small figures and fractions still work after zero or ss01 has swapped a figure", () => {
    // The earlier lookups run first, so "1" may already be one.ss01 when frac sees it.
    const font = sans();
    for (const tag of ["sups", "subs", "numr", "dnom"]) {
      expect(pairs(font, tag)).toEqual(expect.arrayContaining([["one.ss01", `one.${tag}`], ["zero.zero", `zero.${tag}`]]));
    }
  });

  it("frac is three chained lookups: numerators, the fraction slash, denominators", () => {
    const gsub = sans().tables.gsub;
    const frac = gsub.features.find((f: any) => f.tag === "frac").feature.lookupListIndexes;
    expect(frac).toHaveLength(3);
    for (const li of frac) expect(gsub.lookups[li].lookupType).toBe(6);
  });

  it("Clear needs no ss01 (it is drawn that way); the monos have no pnum", () => {
    const clear = parsed.get(faces.find((f) => f.key === "clear" && !f.mono && f.opsz === "text" && f.weight === 400 && !f.italic)!.file);
    expect(pairs(clear, "ss01")).toEqual([]);
    const mono = parsed.get(faces.find((f) => f.key === "sans" && f.mono && f.weight === 400 && !f.italic)!.file);
    expect(pairs(mono, "pnum")).toEqual([]);
    expect(pairs(mono, "zero").length).toBeGreaterThan(0);
  });

  it("each subset file carries the alternates of its own characters", async () => {
    const f = faces.find((x) => x.key === "sans" && !x.mono && x.opsz === "text" && x.width === "normal" && x.weight === 400 && !x.italic)!;
    const latin = await load(`${root}assets/fonts/subsets/${f.base}.latin.woff2`);
    expect(pairs(latin, "zero")).toEqual(expect.arrayContaining([["zero", "zero.zero"]]));
    expect(pairs(latin, "pnum")).toHaveLength(10);
    const ext = await load(`${root}assets/fonts/subsets/${f.base}.latin-ext.woff2`);
    expect(pairs(ext, "ss01")).toEqual(expect.arrayContaining([["lslash", "lslash.ss01"]]));
    expect(pairs(ext, "pnum")).toEqual([]);
  });
});
