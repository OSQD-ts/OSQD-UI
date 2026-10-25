import { defineConfig } from "tsup";

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
});
