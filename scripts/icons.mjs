// Writes the icon and illustration assets from src/icons/index.ts and src/illustrations/index.ts:
//   assets/icons/<name>.svg, assets/icons.svg (sprite), assets/icons.json,
//   assets/illustrations/<name>.svg, and the inline sprite + illustrations in icons.html
//   (between the START/END markers, so the gallery works from disk).
// `--check` fails instead of writing when anything on disk is out of date (run by `npm run check`).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { transform } from "esbuild";

const root = new URL("../", import.meta.url);
const load = async (path) => {
  const { code } = await transform(readFileSync(new URL(path, root), "utf8"), { loader: "ts", format: "esm" });
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
};
const { icons, iconNames, iconAttrs, iconSvg } = await load("src/icons/index.ts");
const { illustrations, illustrationNames, illustrationSvg } = await load("src/illustrations/index.ts");

const attrs = Object.entries(iconAttrs)
  .map(([k, v]) => ` ${k}="${v}"`)
  .join("");
const symbols = iconNames.map((n) => `  <symbol id="oq-i-${n}"${attrs}>${icons[n]}</symbol>`).join("\n");
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}\n</svg>\n`;

/** Every file this script owns, as path → expected content. */
const files = new Map();
for (const n of iconNames) files.set(`assets/icons/${n}.svg`, `${iconSvg(n)}\n`);
files.set("assets/icons.svg", sprite);
files.set("assets/icons.json", `${JSON.stringify(iconNames, null, 2)}\n`);
for (const n of illustrationNames) files.set(`assets/illustrations/${n}.svg`, `${illustrationSvg(n)}\n`);

const page = readFileSync(new URL("icons.html", root), "utf8");
const between = (text, name, body) => {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(text)) throw new Error(`icons.html has no ${name} markers`);
  return text.replace(re, (_, a, b) => `${a}\n${body}\n${b}`);
};
let gallery = between(
  page,
  "ICONS",
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n${symbols}\n</svg>\n` +
    `<script type="application/json" id="oq-icon-names">${JSON.stringify(iconNames)}</script>`,
);
gallery = between(
  gallery,
  "ILLUSTRATIONS",
  illustrationNames
    .map((n) => `      <figure class="oq-paper">${illustrationSvg(n)}<figcaption>${n}</figcaption></figure>`)
    .join("\n"),
);
files.set("icons.html", gallery);

const check = process.argv.includes("--check");
const stale = [];
for (const [path, content] of files) {
  const url = new URL(path, root);
  let current = null;
  try {
    current = readFileSync(url, "utf8");
  } catch {}
  if (current === content) continue;
  if (check) stale.push(path);
  else {
    mkdirSync(new URL(".", url), { recursive: true });
    writeFileSync(url, content);
  }
}
// illustrations is read so a module that forgot to export it fails here, not in the gallery.
if (Object.keys(illustrations).length !== illustrationNames.length) throw new Error("illustration names out of step");

if (check) {
  if (stale.length) {
    console.error(`Out of date (run \`npm run icons\`): ${stale.slice(0, 8).join(", ")}${stale.length > 8 ? ` and ${stale.length - 8} more` : ""}`);
    process.exit(1);
  }
  console.log(`icons up to date (${iconNames.length} icons, ${illustrationNames.length} illustrations).`);
} else {
  console.log(`wrote ${iconNames.length} icons, ${illustrationNames.length} illustrations, sprite and icons.html`);
}
