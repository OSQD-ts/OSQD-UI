// Concatenates styles/index.css's imports into dist/osqd-ui.css — one file, no @import round trips.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const index = readFileSync(new URL("styles/index.css", root), "utf8");
const parts = [...index.matchAll(/@import url\("\.\/([^"]+)"\);/g)].map((m) => m[1]);
if (parts.length === 0) throw new Error("styles/index.css has no imports — nothing to bundle");

const out = parts.map((p) => `/* ---- ${p} ---- */\n${readFileSync(new URL(`styles/${p}`, root), "utf8")}`).join("\n");
mkdirSync(new URL("dist/", root), { recursive: true });
writeFileSync(new URL("dist/osqd-ui.css", root), out);
console.log(`wrote dist/osqd-ui.css (${parts.join(", ")}, ${(out.length / 1024).toFixed(1)} KB)`);
