// Builds the OSQD typefaces from type/params.mjs and type/glyphs.mjs into assets/fonts/*.woff2.
//
//   node type/build.mjs            write the fonts
//   node type/build.mjs --check    fail when a committed font differs from what the source builds
//   node type/build.mjs --otf DIR  also write the uncompressed .otf files to DIR (for inspection)
//
// The output is deterministic — fixed timestamps, glyphs in table order, kerning sorted — so
// --check can compare bytes. opentype.js writes CFF outlines but no kerning, so a legacy `kern`
// table is added to the font file here; every current browser applies it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGlyphs, KERNING } from "./glyphs.mjs";
import { FAMILIES, resolve, WEIGHT_NAMES, WEIGHTS } from "./params.mjs";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");
const wawoff2 = require("wawoff2");

const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = join(root, "assets/fonts");
const CREATED = Date.UTC(2026, 9, 25) / 1000; // fixed, so the bytes only change with the drawings
const VERSION = "Version 1.000";
const COPYRIGHT = "Copyright 2026 The OSQD Authors. Licensed under the SIL Open Font License, Version 1.1.";

function toPath(contours) {
  const path = new opentype.Path();
  for (const ct of contours) {
    path.moveTo(ct.start[0], ct.start[1]);
    for (const s of ct.segs) {
      if (s.L) path.lineTo(s.L[0], s.L[1]);
      else path.curveTo(s.C[0][0], s.C[0][1], s.C[1][0], s.C[1][1], s.C[2][0], s.C[2][1]);
    }
    path.close();
  }
  return path;
}

/** One font, as the bytes of an OpenType (CFF) file with a kern table added. */
function buildFont(familyKey, weight, mono) {
  const p = resolve(familyKey, weight, mono);
  const drawn = buildGlyphs(p);
  const notdef = new opentype.Glyph({ name: ".notdef", advanceWidth: mono ? p.monoAdvance : 500, path: toPath([]) });
  const glyphs = [notdef];
  for (const d of drawn) {
    glyphs.push(
      new opentype.Glyph({
        name: d.name,
        unicode: d.unicode.codePointAt(0),
        advanceWidth: d.advance,
        path: toPath(d.contours),
      }),
    );
  }
  const style = WEIGHT_NAMES[weight];
  const font = new opentype.Font({
    familyName: p.name,
    styleName: style,
    unitsPerEm: p.upm,
    ascender: p.lineAscender,
    descender: p.lineDescender,
    createdTimestamp: CREATED,
    weightClass: weight,
    copyright: COPYRIGHT,
    version: VERSION,
    designer: "The OSQD Authors",
    manufacturer: "OSQD",
    license: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
    licenseURL: "https://openfontlicense.org",
    glyphs,
  });
  // USE_TYPO_METRICS (bit 7) plus REGULAR (bit 6) or BOLD (bit 5), and one line gap of 0 in
  // every table, so the line box is the same on every platform.
  const selection = 128 | (weight >= 700 ? 32 : weight === 400 ? 64 : 0);
  font.tables.os2 = {
    fsSelection: selection,
    usWinAscent: 1000,
    usWinDescent: 300,
    sTypoAscender: p.lineAscender,
    sTypoDescender: p.lineDescender,
    sTypoLineGap: 0,
    sxHeight: p.X,
    sCapHeight: p.C,
    usWeightClass: weight,
    ...(mono ? { xAvgCharWidth: p.monoAdvance } : {}),
  };
  if (mono) font.tables.post = { isFixedPitch: 1 };
  const otf = Buffer.from(font.toArrayBuffer());
  if (mono) return rewrite(otf, null, null);
  // Kerning by glyph index.
  const index = new Map();
  glyphs.forEach((g, i) => {
    if (g.unicode !== undefined) index.set(String.fromCodePoint(g.unicode), i);
  });
  const pairs = [];
  for (const [a, b, v] of KERNING) {
    if (index.has(a) && index.has(b)) pairs.push([index.get(a), index.get(b), Math.round(v * (1 + (p.S - 84) / 400))]);
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return rewrite(otf, "kern", kernTable(pairs));
}

function kernTable(pairs) {
  const n = pairs.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  const sub = Buffer.alloc(14 + 6 * n);
  sub.writeUInt16BE(0, 0); // subtable version
  sub.writeUInt16BE(sub.length, 2);
  sub.writeUInt16BE(0x0001, 4); // horizontal, format 0
  sub.writeUInt16BE(n, 6);
  sub.writeUInt16BE(pow * 6, 8);
  sub.writeUInt16BE(log, 10);
  sub.writeUInt16BE(n * 6 - pow * 6, 12);
  pairs.forEach(([l, r, v], i) => {
    sub.writeUInt16BE(l, 14 + i * 6);
    sub.writeUInt16BE(r, 16 + i * 6);
    sub.writeInt16BE(v, 18 + i * 6);
  });
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(1, 2);
  return Buffer.concat([head, sub]);
}

const checksum = (buf) => {
  const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
};

/**
 * Rewrites an sfnt — optionally with one more table — with the directory sorted by tag and
 * offsets and checksums recomputed. head.modified is set to head.created on the way: the
 * writer stamps the current time there, which would make every build differ.
 */
function rewrite(font, tag, data) {
  const num = font.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < num; i++) {
    const rec = 12 + i * 16;
    const t = font.toString("latin1", rec, rec + 4);
    const off = font.readUInt32BE(rec + 8);
    const len = font.readUInt32BE(rec + 12);
    tables.push({ tag: t, data: Buffer.from(font.subarray(off, off + len)) });
  }
  if (tag) tables.push({ tag, data });
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const n = tables.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  const header = Buffer.alloc(12 + 16 * n);
  font.copy(header, 0, 0, 4); // sfnt version (OTTO)
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(log, 8);
  header.writeUInt16BE(n * 16 - pow * 16, 10);
  let offset = header.length;
  const bodies = [];
  let headOffset = 0;
  tables.forEach((t, i) => {
    if (t.tag === "head") {
      t.data.writeUInt32BE(0, 8); // checkSumAdjustment is computed over the whole file below
      t.data.copy(t.data, 28, 20, 28); // modified = created
      headOffset = offset;
    }
    const rec = 12 + i * 16;
    header.write(t.tag, rec, 4, "latin1");
    header.writeUInt32BE(checksum(t.data), rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(t.data.length, rec + 12);
    const pad = Buffer.alloc((4 - (t.data.length % 4)) % 4);
    bodies.push(t.data, pad);
    offset += t.data.length + pad.length;
  });
  const out = Buffer.concat([header, ...bodies]);
  out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headOffset + 8);
  return out;
}

export function fontList() {
  const list = [];
  for (const key of Object.keys(FAMILIES)) {
    for (const mono of [false, true]) {
      for (const weight of WEIGHTS) {
        const p = resolve(key, weight, mono);
        list.push({ key, mono, weight, name: p.name, file: `${p.file}-${weight}.woff2` });
      }
    }
  }
  return list;
}

const STACK = { sans: "system-ui, sans-serif", mono: "ui-monospace, monospace" };

/** styles/fonts.css: one @font-face per file, and the data-font switch. */
export function fontsCss() {
  const lines = [
    "/* GENERATED by type/build.mjs from type/params.mjs — do not edit by hand. */",
    "",
    "/*",
    " * The OSQD typefaces. Sans and Mono are the defaults (src/theme/index.ts); data-font on any",
    ' * element switches the subtree to another family: "tech", "clear", "sans", or "system" for the',
    " * platform's own fonts. Paths are relative to this file and to dist/osqd-ui.css alike.",
    " */",
    "",
  ];
  for (const f of fontList()) {
    lines.push(
      `@font-face { font-family: "${f.name}"; font-style: normal; font-weight: ${f.weight}; font-display: swap; src: url("../assets/fonts/${f.file}") format("woff2"); }`,
    );
  }
  lines.push("");
  const families = {
    sans: [FAMILIES.sans.name, FAMILIES.sans.monoName],
    tech: [FAMILIES.tech.name, FAMILIES.tech.monoName],
    clear: [FAMILIES.clear.name, FAMILIES.clear.monoName],
  };
  for (const [key, [sans, mono]] of Object.entries(families)) {
    lines.push(
      `[data-font="${key}"],\n[data-font="${key}"] [data-theme],\n:host([data-font="${key}"]) {\n  --oq-font-sans: "${sans}", ${STACK.sans};\n  --oq-font-mono: "${mono}", ${STACK.mono};\n}`,
    );
  }
  lines.push(`[data-font="system"],\n[data-font="system"] [data-theme],\n:host([data-font="system"]) {\n  --oq-font-sans: ${STACK.sans};\n  --oq-font-mono: ${STACK.mono};\n}`);
  lines.push("");
  lines.push("/* font-family inherits as a resolved value, so it has to be set again where the variable changes. */");
  lines.push("[data-font] {\n  font-family: var(--oq-font-sans);\n}");
  lines.push("");
  return lines.join("\n");
}

const OFL = `${COPYRIGHT.replace(" Licensed under the SIL Open Font License, Version 1.1.", "")}
OSQD Sans, OSQD Mono, OSQD Tech, OSQD Tech Mono, OSQD Clear and OSQD Clear Mono.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) and the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
`;

async function main() {
  const check = process.argv.includes("--check");
  const otfIdx = process.argv.indexOf("--otf");
  const otfDir = otfIdx > 0 ? process.argv[otfIdx + 1] : "";
  const stale = [];
  if (!check) mkdirSync(outDir, { recursive: true });
  for (const f of fontList()) {
    const otf = buildFont(f.key, f.weight, f.mono);
    if (otfDir) {
      mkdirSync(otfDir, { recursive: true });
      writeFileSync(join(otfDir, f.file.replace(".woff2", ".otf")), otf);
    }
    const woff2 = Buffer.from(await wawoff2.compress(otf));
    const path = join(outDir, f.file);
    if (check) {
      let current = null;
      try {
        current = readFileSync(path);
      } catch {}
      if (!current || !current.equals(woff2)) stale.push(f.file);
    } else {
      writeFileSync(path, woff2);
    }
  }
  const oflPath = join(outDir, "OFL.txt");
  const cssPath = join(root, "styles/fonts.css");
  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return "";
    }
  };
  if (check) {
    if (read(oflPath) !== OFL) stale.push("OFL.txt");
    if (read(cssPath) !== fontsCss()) stale.push("styles/fonts.css");
    if (stale.length) {
      console.error(`assets/fonts is out of date (${stale.join(", ")}) — run \`npm run fonts\`.`);
      process.exit(1);
    }
    console.log(`assets/fonts is up to date (${fontList().length} fonts).`);
  } else {
    writeFileSync(oflPath, OFL);
    writeFileSync(cssPath, fontsCss());
    console.log(`wrote assets/fonts (${fontList().length} fonts)`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
