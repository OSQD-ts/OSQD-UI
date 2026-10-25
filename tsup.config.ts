import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig } from "tsup";

/**
 * The icon and illustration sets are megabytes of SVG markup in string literals, and every source
 * map that bundles them carried a copy: nothing in a drawing string is worth stepping through, and
 * the sources are in the repository. Their text is left out of the maps (the mappings stay), the
 * same step bothandlerjs and admin-panel-builder run for their generated modules.
 */
async function drawingSourcesOutOfMaps(): Promise<void> {
  for (const file of await readdir("dist", { recursive: true })) {
    if (!file.endsWith(".map")) continue;
    const path = join("dist", file);
    const map = JSON.parse(await readFile(path, "utf8")) as { sources?: string[]; sourcesContent?: Array<string | null> };
    if (map.sources === undefined || map.sourcesContent === undefined) continue;
    let changed = false;
    map.sources.forEach((source, index) => {
      if (/src\/(icons|illustrations)\/|\.generated\.ts$/.test(source) && map.sourcesContent?.[index] !== null) {
        (map.sourcesContent as Array<string | null>)[index] = null;
        changed = true;
      }
    });
    if (changed) await writeFile(path, JSON.stringify(map));
  }
}

/**
 * Entries sharing chunks: `index` (React components + theme), `theme` (tokens only, no React,
 * so a server that only renders CSS variables never loads React), and the custom elements.
 * The standalone script `assets/osqd-ui-elements.js` is built separately by scripts/elements.mjs.
 * Declarations come from `tsc --emitDeclarationOnly`, which mirrors src/ into dist/.
 */
const entry = {
  index: "src/index.ts",
  theme: "src/theme/index.ts",
  // Custom elements: no React. `elements-auto` defines them on import (a side effect, kept
  // apart so importing the classes never registers anything).
  elements: "src/elements/index.ts",
  "elements-auto": "src/elements/auto.ts",
};

export default defineConfig({
  entry,
  format: ["esm", "cjs"],
  splitting: true,
  sourcemap: true,
  target: "es2022",
  treeshake: true,
  clean: true,
  dts: false,
  external: ["react", "react-dom", "react/jsx-runtime"],
  onSuccess: drawingSourcesOutOfMaps,
});
