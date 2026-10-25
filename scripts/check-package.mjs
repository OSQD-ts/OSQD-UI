// The packed tarball, installed and loaded the way a consumer would.
//
// Every test imports src/ directly, so a broken `exports` map, a CommonJS build that throws on
// load, or a `files` list that leaves out the CSS would leave the whole suite green. This packs
// the package, installs it into an empty project with React, and imports *and* requires every
// code entry in `exports`, each in its own process, and resolves every file entry. Adapted from
// the JQL and bothandlerjs checks.
//
//   npm run check:package      (builds first)
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scratch = mkdtempSync(join(tmpdir(), "osqd-ui-package-"));

/** What each code entry must export, and one thing it must do, so "it loaded" is not the whole test. */
const PROBES = {
  ".": `
    const { createElement: h } = await load("react");
    const { renderToStaticMarkup } = await load("react-dom/server");
    const html = renderToStaticMarkup(h(m.Button, { color: "danger" }, "Go"));
    if (!html.includes("oq-btn") || !html.includes("oq-danger")) throw new Error("Button does not render: " + html);
    if (typeof m.createTheme !== "function" || !m.themes.dark) throw new Error("the theme is not re-exported");`,
  "./theme": `
    if (Object.keys(m.themes).length !== 7) throw new Error("expected 7 themes");
    if (!m.themeToCss(m.themes.slate).includes("--oq-primary")) throw new Error("themeToCss does not work");`,
  // In Node there is no DOM; the entry must still load, which is what keeps it SSR-safe.
  "./elements": `if (typeof m.defineAll !== "function") throw new Error("defineAll is missing");`,
  "./elements/auto": ``,
};

/** Files a page links directly; each must be in the tarball and not empty. */
const FILES = ["@osqd/ui/css", "@osqd/ui/styles/index.css", "@osqd/ui/styles/tokens.css", "@osqd/ui/styles/fonts.css", "@osqd/ui/assets/fonts/subsets/osqd-sans-400.latin.woff2", "@osqd/ui/assets/fonts/OFL.txt", "@osqd/ui/assets/osqd-ui-elements.js", "@osqd/ui/assets/icons.svg"];

try {
  const out = execFileSync("npm", ["pack", "--silent", "--ignore-scripts", "--pack-destination", scratch], { cwd: root, encoding: "utf8" });
  const tarball = out.trim().split("\n").pop();
  writeFileSync(join(scratch, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
  execFileSync("npm", ["install", "--silent", "--no-audit", "--no-fund", "--legacy-peer-deps", join(scratch, tarball), "react@19", "react-dom@19"], { cwd: scratch, stdio: "inherit" });

  for (const [entry, conditions] of Object.entries(manifest.exports)) {
    if (entry === "./package.json" || typeof conditions !== "object") continue;
    const probe = PROBES[entry];
    if (probe === undefined) throw new Error(`${entry} is exported but has no probe here, so nothing checks that it works`);
    const specifier = entry === "." ? manifest.name : `${manifest.name}/${entry.slice(2)}`;
    const esm = `const load = (s) => import(s); const m = await import(${JSON.stringify(specifier)}); ${probe}`;
    execFileSync(process.execPath, ["--input-type=module", "-e", esm], { cwd: scratch, stdio: "inherit" });
    if ("require" in conditions) {
      const cjs = `(async () => { const load = async (s) => require(s); const m = require(${JSON.stringify(specifier)}); ${probe} })().catch((e) => { console.error(e); process.exit(1); });`;
      execFileSync(process.execPath, ["--input-type=commonjs", "-e", cjs], { cwd: scratch, stdio: "inherit" });
    }
    process.stdout.write(`ok  ${specifier} (${"require" in conditions ? "import and require" : "import"})\n`);
  }

  for (const specifier of FILES) {
    const resolved = execFileSync(process.execPath, ["--input-type=module", "-e", `process.stdout.write(import.meta.resolve(${JSON.stringify(specifier)}))`], { cwd: scratch, encoding: "utf8" });
    const path = fileURLToPath(resolved);
    if (!existsSync(path) || statSync(path).size === 0) throw new Error(`${specifier} resolves to ${path}, which is missing or empty`);
    process.stdout.write(`ok  ${specifier} (${(statSync(path).size / 1024).toFixed(0)} KB)\n`);
  }

  // Every font file the shipped stylesheet points at must be in the tarball: the complete fonts
  // stay in the repository (for installing on a desktop), the page loads only the subsets.
  const fontsCss = fileURLToPath(execFileSync(process.execPath, ["--input-type=module", "-e", 'process.stdout.write(import.meta.resolve("@osqd/ui/styles/fonts.css"))'], { cwd: scratch, encoding: "utf8" }));
  const urls = [...readFileSync(fontsCss, "utf8").matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
  const missing = urls.filter((u) => !existsSync(new URL(u, `file://${fontsCss}`)));
  if (urls.length === 0 || missing.length > 0) throw new Error(`styles/fonts.css points at ${missing.length} of ${urls.length} font files that are not in the package: ${missing.slice(0, 3).join(", ")}`);
  process.stdout.write(`ok  styles/fonts.css: all ${urls.length} font files are in the package\n`);

  const deps = Object.keys(manifest.dependencies ?? {});
  if (deps.length) throw new Error(`the kit must have no runtime dependencies, found: ${deps.join(", ")}`);
  process.stdout.write("ok  no runtime dependencies\n");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
