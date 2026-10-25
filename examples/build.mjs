// Builds the sample sites: examples/src/<page>.html → examples/<page>.html.
//
// The sources use a few placeholders so every page shares the same chrome and the icons stay
// crisp when the page is opened straight from disk (an external SVG sprite is blocked on file://):
//
//   {{icon:name}}            the icon from assets/icons/<name>.svg, inline, class "oq-icon"
//   {{icon:name:extra cls}}  the same with extra classes, e.g. {{icon:search:oq-sm}}
//   {{illustration:name}}    the spot illustration from assets/illustrations/<name>.svg, inline
//   {{theme-select}}         the theme picker (all built-in themes + auto), shared storage key
//   {{samples-menu}}         the "Samples" dropdown linking every sample and the galleries
//   {{brand:Title}}          the sample brand mark + title, linking to the samples index
//   {{appbar-end}}           the right end of an app bar: the Samples menu and theme picker on
//                            wide screens; below 760 px both fold into one "More" menu
//   {{appbar-end}}…{{/appbar-end}}  the same, with page actions that move into "More" on phones
//                            (write them as .oq-menu__item buttons or links)
//
// `node examples/build.mjs` writes the pages; `--check` fails when a built page is out of date.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const src = new URL("src/", import.meta.url);

export const SAMPLES = [
  ["dashboard.html", "Dashboard"],
  ["logs.html", "Log explorer"],
  ["admin.html", "Admin (CRUD)"],
  ["settings.html", "Settings"],
  ["tickets.html", "Tickets"],
  ["login.html", "Sign in"],
  ["docs-page.html", "Docs page"],
];
const THEMES = [
  ["dark", "Dark"],
  ["light", "Light"],
  ["graphite", "Graphite"],
  ["midnight", "Midnight"],
  ["contrast", "Contrast"],
  ["paper", "Paper"],
  ["slate", "Slate"],
  ["auto", "Auto (system)"],
];

const icon = (name, extra = "") => {
  const svg = readFileSync(new URL(`assets/icons/${name}.svg`, root), "utf8").trim();
  return svg
    .replace(' xmlns="http://www.w3.org/2000/svg"', "")
    .replace(' width="24" height="24"', "")
    .replace("<svg ", `<svg class="oq-icon${extra ? ` ${extra}` : ""}" `);
};

const illustration = (name) =>
  readFileSync(new URL(`assets/illustrations/${name}.svg`, root), "utf8")
    .trim()
    .replace(' xmlns="http://www.w3.org/2000/svg"', "")
    .replace("<svg ", '<svg class="oq-illustration" ');

const themeSelect = () =>
  `<oq-theme-select storage-key="oq-preview-theme" default="dark"><select class="oq-select oq-sm sx-theme" aria-label="Theme">${THEMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></oq-theme-select>`;

const samplesMenu = (page) =>
  `<oq-dropdown><details class="oq-dropdown oq-dropdown--end"><summary class="oq-btn oq-btn--ghost oq-neutral oq-sm" aria-label="Samples">${icon("grid", "oq-sm sx-show-sm")}<span class="sx-hide-sm">Samples</span>${icon("chevron-down", "oq-sm")}</summary><nav class="oq-menu" role="menu" aria-label="Sample sites"><a class="oq-menu__item" role="menuitem" href="index.html">All samples</a><div class="oq-menu__sep" role="separator"></div>${SAMPLES.map(([href, label]) => `<a class="oq-menu__item" role="menuitem" href="${href}"${href === page ? ' aria-current="page"' : ""}>${label}</a>`).join("")}<div class="oq-menu__sep" role="separator"></div><a class="oq-menu__item" role="menuitem" href="../preview.html">Component galleries</a></nav></details></oq-dropdown>`;

const brand = (title) =>
  `<a class="oq-appbar__brand" href="index.html"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="18" height="18" rx="4" fill="none" stroke="var(--oq-primary)" stroke-width="2"/><rect x="6" y="6" width="8" height="8" rx="1.5" fill="var(--oq-warning)"/></svg><span class="sx-brand-text">${title}</span></a>`;

// One menu for phones: page actions first, then the theme, then the other samples.
const moreMenu = (page, items) =>
  `<oq-dropdown class="sx-more"><details class="oq-dropdown oq-dropdown--end"><summary class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral" aria-label="More">${icon("more-vertical")}</summary><div class="oq-menu sx-more__menu" role="menu" aria-label="More">${
    items.trim() ? `${items.trim()}<div class="oq-menu__sep" role="separator"></div>` : ""
  }<label class="sx-more__theme"><span>Theme</span>${themeSelect().replace("sx-theme", "sx-theme--menu")}</label><div class="oq-menu__sep" role="separator"></div><div class="oq-menu__label oq-overline">Samples</div>${SAMPLES.map(
    ([href, label]) => `<a class="oq-menu__item" role="menuitem" href="${href}"${href === page ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("")}<a class="oq-menu__item" role="menuitem" href="index.html">All samples</a><a class="oq-menu__item" role="menuitem" href="../preview.html">Component galleries</a></div></details></oq-dropdown>`;

const appbarEnd = (page, items = "") =>
  `${samplesMenu(page).replace("<oq-dropdown>", '<oq-dropdown class="sx-hide-sm">')}${themeSelect().replace("<oq-theme-select ", '<oq-theme-select class="sx-hide-sm" ')}${moreMenu(page, items)}`;

export function render(page, text) {
  return text
    .replace(/\{\{appbar-end\}\}([\s\S]*?)\{\{\/appbar-end\}\}/g, (_, items) => appbarEnd(page, items))
    .replace(/\{\{appbar-end\}\}/g, () => appbarEnd(page))
    .replace(/\{\{icon:([a-z0-9-]+)(?::([^}]*))?\}\}/g, (_, n, extra) => icon(n, extra ?? ""))
    .replace(/\{\{illustration:([a-z0-9-]+)\}\}/g, (_, n) => illustration(n))
    .replace(/\{\{theme-select\}\}/g, themeSelect)
    .replace(/\{\{samples-menu\}\}/g, () => samplesMenu(page))
    .replace(/\{\{brand:([^}]*)\}\}/g, (_, t) => brand(t))
    .replace(/^<!-- SOURCE[^\n]*\n/, "");
}

const check = process.argv.includes("--check");
let stale = 0;

// The forms logic (cron, CIDR, validators, filter text) is the library's own code, bundled by the
// forms gallery into preview-forms.html; the samples take that same bundle rather than a copy.
{
  const gallery = readFileSync(new URL("preview-forms.html", root), "utf8");
  const m = /<script>(var OQForms=[\s\S]*?)<\/script>/.exec(gallery);
  if (!m) throw new Error("preview-forms.html has no OQForms bundle");
  const out = `// GENERATED by examples/build.mjs from the OQForms bundle in preview-forms.html (src/react/forms logic).\n${m[1]}\n`;
  const target = new URL("lib/forms-logic.js", import.meta.url);
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {}
  if (current !== out) {
    if (check) {
      console.error("examples/lib/forms-logic.js is out of date — run `node examples/build.mjs`.");
      stale++;
    } else {
      writeFileSync(target, out);
      console.log("wrote examples/lib/forms-logic.js");
    }
  }
}
for (const file of readdirSync(src).filter((f) => f.endsWith(".html"))) {
  const note = `<!-- GENERATED by examples/build.mjs from examples/src/${file}; edit the source. -->`;
  const body = render(file, readFileSync(new URL(file, src), "utf8"));
  const out = body.replace(/^(<!doctype html>\n)/i, `$1${note}\n`);
  const target = new URL(file, import.meta.url);
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {}
  if (current === out) continue;
  if (check) {
    console.error(`examples/${file} is out of date — run \`node examples/build.mjs\`.`);
    stale++;
  } else {
    writeFileSync(target, out);
    console.log(`wrote examples/${file}`);
  }
}
if (stale) process.exit(1);
