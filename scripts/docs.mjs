// Generates the documentation site in docs/site/ from the source: one page per exported React
// component (props from the TypeScript types, descriptions from JSDoc, a live example rendered
// with react-dom/server), an index, and a page for the Web Components.
//
//   node scripts/docs.mjs           write docs/site/
//   node scripts/docs.mjs --check   fail if docs/site/ differs from what would be written
//   node scripts/docs.mjs --dump    print the extracted component data as JSON
//
// Examples live in scripts/docs-examples.tsx; the code shown on each page is the example's own
// source text, so the rendered example and the code next to it cannot drift apart.
process.env.TZ = "UTC";

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const at = (...p) => join(root, ...p);
const require = createRequire(at("package.json"));
const pkg = JSON.parse(readFileSync(at("package.json"), "utf8"));

/* ------------------------------------------------------------------ areas */

// Every component must be listed here; anything missing lands in "Other", which the docs test
// rejects — so a new component cannot ship without a place in the docs.
const AREAS = {
  Inputs: [
    "Button", "IconButton", "ButtonGroup", "Segmented", "TextField", "Select", "Checkbox", "Radio",
    "RadioGroup", "Switch", "Slider", "NumberInput", "TagInput", "Combobox", "DropZone", "FileList",
    "FileItem", "DatePicker", "DateRangePicker", "Calendar",
  ],
  Forms: [
    "Form", "FieldShell", "ErrorSummary", "SaveBar", "MultiSelect", "ColorInput", "PasswordInput",
    "OtpInput", "CronInput", "KeyValueEditor", "IpInput", "CidrInput", "QueryBuilder", "Wizard",
    "ConfirmProvider",
  ],
  "Data display": [
    "Card", "CardHeader", "CardBody", "CardFooter", "Paper", "Stat", "Chip", "Badge", "Dot",
    "StatusDot", "Avatar", "AvatarGroup", "List", "ListItem", "DescriptionList", "Accordion",
    "AccordionItem", "Timeline", "CodeBlock", "EmptyState", "TreeView",
  ],
  Data: ["Table", "DataTable", "TablePagination", "VirtualTable", "LogViewer", "JsonInspector", "DiffView"],
  Charts: ["BarChart", "LineChart", "AreaChart", "DonutChart", "Heatmap", "Sparkline", "Meter", "Gauge"],
  Navigation: [
    "Tabs", "Breadcrumbs", "Pagination", "Stepper", "AppBar", "Nav", "NavSection", "NavItem",
    "Toolbar", "ToolbarSeparator", "ToolbarLabel",
  ],
  Overlays: [
    "Dialog", "Dropdown", "Menu", "MenuItem", "MenuSeparator", "MenuLabel", "Popover", "Tooltip",
    "CommandPalette", "ContextMenu",
  ],
  Feedback: [
    "Alert", "Banner", "Callout", "Progress", "Spinner", "Skeleton", "SkeletonText", "SkeletonList",
    "SkeletonCard", "SkeletonTable", "ToastProvider", "NotificationCenter", "NotificationPanel",
    "ErrorPage",
  ],
  Layout: [
    "Stack", "Row", "Grid", "Shell", "Sidebar", "CollapsibleShell", "ShellToggle", "ShellNavItem",
    "SplitPane", "PageHeader", "DetailLayout", "DetailSection", "Divider",
  ],
  Typography: ["Typography", "Kbd", "Code"],
  Theme: ["ThemeProvider", "DensityProvider", "ShortcutsProvider", "ShortcutsOverlay"],
  Icons: ["Icon", "Illustration"],
};
const AREA_OF = new Map(Object.entries(AREAS).flatMap(([area, names]) => names.map((n) => [n, area])));
const AREA_ORDER = [...Object.keys(AREAS), "Elements"];

const AREA_INTRO = {
  Inputs: "Controls people type into, click and pick with.",
  Forms: "Validation, structured inputs and multi-step flows on top of the inputs.",
  "Data display": "Surfaces and small pieces that show information.",
  Data: "Tables, logs, JSON and diffs, built to stay fast on large data.",
  Charts: "Plain-SVG charts coloured by the theme, with tooltips and accessible tables.",
  Navigation: "Moving between pages, sections and steps.",
  Overlays: "Content that floats above the page.",
  Feedback: "Status, progress, loading and error states.",
  Layout: "Page structure, spacing and app shells.",
  Typography: "Text styles.",
  Theme: "Themes, density and app-wide providers.",
  Icons: "The icon set and the empty-state illustrations.",
};

// Which gallery page shows each area.
const GALLERY = {
  Inputs: "preview.html",
  Forms: "preview-forms.html",
  "Data display": "preview.html",
  Data: "preview-data.html",
  Charts: "preview-charts.html",
  Navigation: "preview.html",
  Overlays: "preview.html",
  Feedback: "preview.html",
  Layout: "preview-layout.html",
  Typography: "preview.html",
  Theme: "preview.html",
  Icons: "icons.html",
  Elements: "elements.html",
};

// React component → the custom element that gives plain HTML the same behaviour.
const ELEMENT_FOR = {
  Dialog: "oq-dialog",
  Tabs: "oq-tabs",
  Dropdown: "oq-dropdown",
  ToastProvider: "oq-toast-region",
  Combobox: "oq-combobox",
  TreeView: "oq-tree",
  CommandPalette: "oq-command-palette",
  Table: "oq-sortable-table",
  DataTable: "oq-sortable-table",
  CodeBlock: "oq-copy",
  ThemeProvider: "oq-theme-select",
  NumberInput: "oq-number",
  TagInput: "oq-tag-input",
  DropZone: "oq-dropzone",
};

/* ------------------------------------------------------------- extraction */

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
const compact = (s) => s.replace(/\s+/g, " ").replace(/\(\s/g, "(").replace(/\s\)/g, ")").trim();

function loadProgram() {
  const cfg = ts.readConfigFile(at("tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
  const program = ts.createProgram([at("src/index.ts")], parsed.options);
  return { program, checker: program.getTypeChecker() };
}

const isOwn = (decl) => !decl.getSourceFile().fileName.includes("/node_modules/");
const rel = (file) => relative(root, file).split("\\").join("/");

/** The first function-like node of a component declaration (the function itself, or the one passed to forwardRef/memo). */
function componentFunction(decl) {
  if (ts.isFunctionDeclaration(decl)) return decl;
  let found;
  const visit = (n) => {
    if (found) return;
    if (ts.isFunctionExpression(n) || ts.isArrowFunction(n)) found = n;
    else ts.forEachChild(n, visit);
  };
  if (decl.initializer) visit(decl.initializer);
  return found;
}

function defaultsOf(fn) {
  const out = {};
  const p = fn?.parameters?.[0];
  if (!p || !ts.isObjectBindingPattern(p.name)) return out;
  for (const el of p.name.elements) {
    if (!el.initializer) continue;
    const key = (el.propertyName ?? el.name).getText();
    out[key] = compact(el.initializer.getText());
  }
  return out;
}

const ELEMENT_NAMES = {
  HTMLDivElement: "div", HTMLButtonElement: "button", HTMLInputElement: "input", HTMLSpanElement: "span",
  HTMLTableElement: "table", HTMLDialogElement: "dialog", HTMLElement: "element", HTMLUListElement: "ul",
  HTMLOListElement: "ol", HTMLAnchorElement: "a", HTMLSelectElement: "select", HTMLTextAreaElement: "textarea",
  HTMLHeadingElement: "heading", HTMLParagraphElement: "p", HTMLPreElement: "pre", HTMLLIElement: "li",
  HTMLDListElement: "dl", HTMLHRElement: "hr", SVGSVGElement: "svg", HTMLLabelElement: "label",
  HTMLFormElement: "form", HTMLDetailsElement: "details", HTMLImageElement: "img", HTMLTableRowElement: "tr",
};

function nativeElementOf(ownDecls) {
  const seen = new Set();
  for (const d of ownDecls) {
    let n = d.parent;
    while (n && !ts.isInterfaceDeclaration(n) && !ts.isTypeAliasDeclaration(n)) n = n.parent;
    if (!n || seen.has(n)) continue;
    seen.add(n);
    const head = ts.isInterfaceDeclaration(n) ? (n.heritageClauses ?? []).map((h) => h.getText()).join(" ") : n.type.getText();
    const m = head.match(/(?:[A-Za-z]*HTMLAttributes|HTMLProps|SVGProps|SVGAttributes)<\s*(\w+)\s*>/);
    if (m) return ELEMENT_NAMES[m[1]] ?? m[1];
  }
  return null;
}

function classesOf(decl) {
  const sf = decl.getSourceFile();
  let text = decl.getText();
  // One level of same-file helpers: `buttonClass(...)` contributes the classes it builds.
  const helpers = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) helpers.set(st.name.text, st);
    if (ts.isVariableStatement(st))
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) helpers.set(d.name.text, d);
  }
  for (const id of new Set(text.match(/\b[a-z][A-Za-z0-9]*\b/g) ?? [])) {
    const h = helpers.get(id);
    if (h && h !== decl) text += `\n${h.getText()}`;
  }
  const out = new Set();
  for (const m of text.matchAll(/(?<![-\w])oq-[a-z0-9][a-z0-9_-]*/g)) {
    let c = m[0];
    if (c.endsWith("-") || text[m.index + c.length] === "$") c = `${c}*`;
    out.add(c);
  }
  return [...out].sort();
}

function extract() {
  const { program, checker } = loadProgram();
  const mod = checker.getSymbolAtLocation(program.getSourceFile(at("src/index.ts")));
  const components = [];
  for (const exp of checker.getExportsOfModule(mod)) {
    const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
    const name = exp.name;
    // Components: PascalCase values from .tsx files. ALL_CAPS constants and the small `*Icon`
    // components (documented together on the Icon page) are not pages of their own.
    if (!/^[A-Z][a-z]/.test(name) || (name !== "Icon" && /Icon$/.test(name))) continue;
    if (!(sym.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable))) continue;
    const decl = sym.declarations?.[0];
    if (!decl || !decl.getSourceFile().fileName.endsWith(".tsx")) continue;

    const type = checker.getTypeOfSymbolAtLocation(sym, decl);
    const sig = type.getCallSignatures()[0];
    const param = sig?.parameters[0];
    const props = [];
    let nativeCount = 0;
    const ownDecls = [];
    if (param) {
      const pType = checker.getTypeOfSymbolAtLocation(param, decl);
      const defaults = defaultsOf(componentFunction(decl));
      // The checker lists properties in declaration order: own props first, inherited after.
      for (const p of checker.getPropertiesOfType(pType)) {
        const d = p.valueDeclaration ?? p.declarations?.[0];
        if (!d || !isOwn(d)) {
          nativeCount++;
          continue;
        }
        ownDecls.push(d);
        const typeText = d.type ? compact(d.type.getText()) : compact(checker.typeToString(checker.getTypeOfSymbolAtLocation(p, decl)));
        props.push({
          name: p.name,
          type: typeText,
          optional: Boolean(p.flags & ts.SymbolFlags.Optional),
          default: defaults[p.name] ?? null,
          doc: ts.displayPartsToString(p.getDocumentationComment(checker)).trim(),
        });
      }
    }

    components.push({
      name,
      slug: kebab(name),
      file: rel(decl.getSourceFile().fileName),
      area: AREA_OF.get(name) ?? "Other",
      doc: ts.displayPartsToString(sym.getDocumentationComment(checker)).trim(),
      props,
      native: nativeCount > 0 ? (nativeElementOf(ownDecls) ?? "element") : null,
      classes: classesOf(decl),
      element: ELEMENT_FOR[name] ?? null,
    });
  }
  components.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of components)
    c.related = components.filter((o) => o !== c && o.file === c.file).map((o) => o.name).slice(0, 8);
  return { components, smallIcons: smallIconNames(checker, mod) };
}

function smallIconNames(checker, mod) {
  return checker.getExportsOfModule(mod).map((e) => e.name).filter((n) => /^[A-Z][a-z]\w*Icon$/.test(n)).sort();
}

/** The custom elements: tag, class and the class's JSDoc, from src/elements. */
function extractElements() {
  const index = readFileSync(at("src/elements/index.ts"), "utf8");
  // The `elements` map (`"oq-x": OqX,`), not the HTMLElementTagNameMap declaration that repeats it with `;`.
  const tags = [...index.matchAll(/"(oq-[a-z-]+)":\s*(Oq\w+),/g)].map((m) => ({ tag: m[1], cls: m[2] }));
  const docs = new Map();
  for (const f of readdirSync(at("src/elements"))) {
    const src = readFileSync(at("src/elements", f), "utf8");
    // The body may not contain "*/", so the match is the comment directly above the class.
    for (const m of src.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export class (Oq\w+)/g)) docs.set(m[2], cleanJsDoc(m[1]));
  }
  return tags.map((t) => ({ ...t, doc: docs.get(t.cls) ?? "" }));
}

const cleanJsDoc = (body) =>
  body
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, ""))
    .join("\n")
    .trim();

/* --------------------------------------------------------------- examples */

/** Builds scripts/docs-examples.tsx and returns { names, render(name), code(name) }. */
function loadExamples(exportNames) {
  const src = at("scripts/docs-examples.tsx");
  const outfile = at("node_modules/.cache/osqd-ui-docs/examples.cjs");
  mkdirSync(dirname(outfile), { recursive: true });
  buildSync({
    entryPoints: [src],
    outfile,
    bundle: true,
    format: "cjs",
    platform: "node",
    jsx: "automatic",
    target: "es2022",
    external: ["react", "react-dom", "react/jsx-runtime"],
    logLevel: "error",
  });
  require.cache[outfile] = undefined;
  const mod = require(outfile);
  const { renderToStaticMarkup } = require("react-dom/server");
  const { createElement } = require("react");

  // The code shown for each example is that example's own source text.
  const text = readFileSync(src, "utf8");
  const sf = ts.createSourceFile(src, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const code = new Map();
  ts.forEachChild(sf, (st) => {
    if (!ts.isVariableStatement(st)) return;
    for (const d of st.declarationList.declarations) {
      if (d.name.getText() !== "examples" || !d.initializer) continue;
      let obj = d.initializer;
      while (ts.isSatisfiesExpression?.(obj) || ts.isAsExpression(obj)) obj = obj.expression;
      for (const p of obj.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const fn = p.initializer;
        let body = fn.body;
        let shown;
        if (ts.isParenthesizedExpression(body)) shown = body.expression.getText();
        else if (ts.isBlock(body) && body.statements.length)
          shown = text.slice(body.statements[0].getStart(sf), body.statements[body.statements.length - 1].end);
        else shown = body.getText();
        code.set(p.name.getText().replace(/^["']|["']$/g, ""), dedent(shown));
      }
    }
  });

  return {
    names: Object.keys(mod.examples),
    code: (name) => {
      // `noop` is a helper of the examples file; the page shows what a reader would write.
      const body = (code.get(name) ?? "").replace(/\bnoop\b/g, "() => {}");
      const used = [...new Set(body.match(/\b[A-Z][A-Za-z0-9]*\b|\buse[A-Z]\w*\b|\b[a-z]\w*Theme\b/g) ?? [])]
        .filter((n) => exportNames.has(n))
        .sort();
      const head = used.length ? `import { ${used.join(", ")} } from "@osqd/ui";\n\n` : "";
      return head + body;
    },
    // Rendered as a component, so an example may call hooks (useForm, useToast …).
    render: (name) => {
      try {
        return withFixedClock(() => renderToStaticMarkup(createElement(mod.examples[name])));
      } catch (err) {
        throw new Error(`docs example "${name}" failed to render: ${err.message}`);
      }
    },
  };
}

function dedent(s) {
  const lines = s.replace(/^\n+|\s+$/g, "").split("\n");
  const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return [lines[0], ...lines.slice(1).map((l) => l.slice(Math.min(cut, l.match(/^ */)[0].length)))].join("\n");
}

/** Renders with `new Date()` / `Date.now()` pinned, so generated pages do not change from day to day. */
function withFixedClock(fn) {
  const RealDate = Date;
  const fixed = RealDate.UTC(2026, 9, 25, 10, 0, 0);
  class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [fixed]));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FixedDate;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

/* ------------------------------------------------------------- rendering */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A little markdown for doc comments: `code`, **bold**, paragraphs and "- " lists. */
function md(text) {
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const out = [];
  let list = null;
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      flush();
      if (!list) list = [];
      list.push(item[1]);
    } else if (list && /^\s{2,}\S/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list) {
        out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
        list = null;
      }
      if (!line.trim()) flush();
      else para.push(line.trim());
    }
  }
  if (list) out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
  flush();
  return out.join("\n");
}

/** The first sentence as plain text (backticks dropped; "e.g." and "i.e." do not end it). */
const firstSentence = (text) => {
  const plain = text.split("\n\n")[0].replace(/\s+/g, " ").replace(/`/g, "").trim();
  const m = plain.match(/^(.*?(?<!\be\.g|\bi\.e)[.!?])(\s|$)/);
  return m ? m[1] : plain;
};

const VOID = new Set(["area", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "use", "stop"]);

/** Indents rendered markup one tag per line; a tag holding only text stays on one line. */
function prettyHtml(html) {
  const tokens = html.split(/(<[^>]+>)/).filter((t) => t !== "");
  const lines = [];
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const pad = "  ".repeat(depth);
    if (t.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      lines.push("  ".repeat(depth) + t);
    } else if (t.startsWith("<")) {
      const tag = t.match(/^<([a-zA-Z0-9-]+)/)?.[1]?.toLowerCase() ?? "";
      const selfClosing = t.endsWith("/>") || VOID.has(tag);
      const next = tokens[i + 1];
      const after = tokens[i + 2];
      if (!selfClosing && next !== undefined && !next.startsWith("<") && after?.startsWith("</")) {
        lines.push(pad + t + next + after);
        i += 2;
      } else if (!selfClosing && next?.startsWith("</")) {
        lines.push(pad + t + next);
        i += 1;
      } else {
        lines.push(pad + t);
        if (!selfClosing) depth++;
      }
    } else if (t.trim()) {
      lines.push(pad + t.trim());
    }
  }
  return lines.join("\n");
}

const ICON = {
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  logo: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="18" height="18" rx="4" fill="none" stroke="var(--oq-primary)" stroke-width="2"/><rect x="6" y="6" width="8" height="8" rx="1.5" fill="var(--oq-warning)"/></svg>',
  menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  external: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};

function codeBlock(lang, code, label = lang) {
  const lines = code.split("\n").map((l) => `<span class="oq-code-line">${esc(l) || " "}</span>`).join("");
  return `<div class="oq-codeblock">
  <div class="oq-codeblock__header"><span class="oq-codeblock__lang">${esc(label)}</span>
    <oq-copy class="oq-codeblock__copy"><button class="oq-btn oq-btn--ghost oq-neutral oq-sm" type="button">${ICON.copy}Copy</button></oq-copy>
  </div>
<pre class="oq-pre"><code>${lines}</code></pre>
</div>`;
}

const THEME_BOOT = `<script>try{var t=localStorage.getItem("oq-preview-theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>`;

const DOCS_CSS = `
  html, body { margin: 0; }
  .docs-side { position: sticky; top: 48px; height: calc(100vh - 48px); }
  .docs-main { max-width: 1040px; display: flex; flex-direction: column; gap: 28px; }
  .docs-prose p { margin: 0 0 8px; color: var(--oq-text-muted); max-width: 72ch; }
  .docs-prose ul { margin: 0 0 8px; padding-left: 20px; color: var(--oq-text-muted); }
  .docs-prose li { margin: 2px 0; }
  .docs-demo { padding: 24px; background: var(--oq-bg); border-bottom: 1px solid var(--oq-border); overflow: auto; position: relative; }
  .docs-demo--tall { max-height: 520px; }
  /* A static page cannot call showModal(): show example dialogs in place instead. */
  .docs-demo dialog:not([open]) { display: flex; flex-direction: column; position: relative; inset: auto; margin: 0 auto; max-height: none; z-index: 0; }
  .docs-props td:first-child { white-space: nowrap; }
  .docs-props .oq-mono { font-size: var(--oq-text-sm); }
  .docs-type { font-family: var(--oq-font-mono); font-size: var(--oq-text-sm); color: var(--oq-secondary); overflow-wrap: anywhere; }
  .docs-card { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; text-decoration: none; color: inherit; }
  .docs-card:hover { border-color: var(--oq-border-strong); background: var(--oq-raised); }
  .docs-card__desc { font-size: var(--oq-text-sm); color: var(--oq-text-faint); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .docs-section { display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 64px; }
  .docs-section > h2 { margin: 0; }
  .docs-nav-area { margin-top: 4px; }
  .docs-hero { display: flex; flex-direction: column; gap: 8px; padding: 8px 0 4px; }
  .docs-el { display: flex; flex-direction: column; gap: 8px; scroll-margin-top: 64px; }
  @media (max-width: 760px) { .docs-hide-sm { display: none; } }

  /* ---- Responsive shell: top bar, search, drawer nav ---- */
  .docs-main { min-width: 0; }
  .docs-bar-search { flex: 0 1 240px; min-width: 0; height: var(--oq-control-sm); }
  .docs-menu-btn, .docs-search-btn, .docs-search-close { display: none; }
  .docs-backdrop { display: none; }
  .docs-drawer-head { display: none; }
  @media (max-width: 1100px) { .docs-site-nav { display: none; } }
  @media (max-width: 900px) {
    .oq-shell.docs-shell { grid-template-columns: minmax(0, 1fr); }
    .docs-menu-btn { display: inline-flex; }
    .docs-site-nav { display: none; }
    /* The sidebar becomes a drawer: parked off-canvas until opened. */
    .oq-shell.docs-shell > .docs-side {
      display: flex;
      position: fixed;
      inset: 0 auto 0 0;
      top: 0;
      height: 100dvh;
      width: min(300px, 86vw);
      z-index: 60;
      padding-top: 0;
      transform: translateX(-100%);
      visibility: hidden;
      box-shadow: var(--oq-shadow-lg);
      transition: transform calc(var(--oq-motion) * 1.6) ease-out, visibility 0s linear calc(var(--oq-motion) * 1.6);
      overscroll-behavior: contain;
    }
    .docs-nav-open .oq-shell.docs-shell > .docs-side { transform: none; visibility: visible; transition: transform calc(var(--oq-motion) * 1.6) ease-out; }
    .docs-nav-open .docs-backdrop { display: block; position: fixed; inset: 0; z-index: 55; background: var(--oq-overlay); }
    .docs-nav-open { overflow: hidden; }
    .docs-drawer-head { display: flex; align-items: center; gap: 8px; position: sticky; top: 0; z-index: 1; padding: 8px 4px; margin: 0 -4px; background: var(--oq-surface); border-bottom: 1px solid var(--oq-border); }
    .docs-drawer-links { display: flex; flex-direction: column; gap: 1px; padding-bottom: 8px; border-bottom: 1px solid var(--oq-border); }
  }
  @media (min-width: 901px) { .docs-drawer-links { display: none; } }
  @media (max-width: 640px) {
    .docs-version { display: none; }
    .docs-bar-search { display: none; }
    .docs-search-btn { display: inline-flex; }
    /* Tapping the search icon turns the bar into a search field. */
    .docs-searching .docs-bar-search { display: flex; position: absolute; inset: 0 auto 0 0; right: 0; height: auto; margin: 6px 8px; z-index: 2; flex: none; background: var(--oq-surface); }
    .docs-searching .docs-search-close { display: inline-flex; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); z-index: 3; }
    .docs-searching .docs-bar-search .oq-input { padding-right: 44px; }
    .oq-appbar.docs-bar { position: sticky; gap: 6px; padding-inline: 8px; }
    .docs-bar oq-theme-select select { max-width: 104px; }
    .docs-hero .oq-input-group { max-width: none !important; }
    .docs-demo { padding: 14px; }
    .docs-main { gap: 22px; }
  }
  @media (max-width: 400px) { .docs-bar oq-theme-select { display: none; } }
  .docs-drawer-theme { display: none; }
  @media (max-width: 400px) { .docs-drawer-theme { display: block; } }

  /* ---- Examples wider than the screen scroll inside their box, with a cue ---- */
  .docs-demo-wrap { position: relative; }
  /* Visually hidden tables (chart data for screen readers) ignore width: 1px and would widen the
     box; fixed positioning keeps them readable but out of the box's scroll width. */
  .docs-demo .oq-sr-only { position: fixed; }
  .docs-scroll-cue { display: none; position: absolute; right: 8px; bottom: 8px; z-index: 2; pointer-events: none; }
  .docs-demo-wrap.has-more::after {
    content: ""; position: absolute; top: 0; right: 0; bottom: 1px; width: 28px; pointer-events: none;
    background: linear-gradient(to right, transparent, var(--oq-bg));
  }
  .docs-demo-wrap.has-more .docs-scroll-cue { display: inline-flex; }
  .docs-main :is(.oq-codeblock, .oq-tabpanel, oq-tabs) { min-width: 0; max-width: 100%; }
  .docs-main .oq-codeblock .oq-pre { overflow-x: auto; }
  .docs-main .oq-tabs { overflow-x: auto; }
  @media (pointer: coarse) {
    .oq-codeblock__copy .oq-btn { min-height: 40px; min-width: 40px; }
    .docs-card { min-height: 44px; }
  }

  /* ---- Props: a table on wide screens, one stacked card per prop on phones ---- */
  @media (max-width: 640px) {
    .docs-props-wrap { border: 0; background: none; overflow: visible; }
    .docs-props, .docs-props tbody { display: block; }
    .docs-props thead { display: none; }
    .docs-props tr { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; padding: 12px 14px; margin-bottom: 8px; border: 1px solid var(--oq-border); border-radius: var(--oq-radius-lg); background: var(--oq-surface); }
    .docs-props td { display: contents; }
    .docs-props td::before { content: attr(data-label); color: var(--oq-text-faint); font-size: var(--oq-text-xs); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; padding-top: 2px; }
    .docs-props td > * { min-width: 0; }
    .docs-props td:first-child::before { content: none; }
    .docs-props td:first-child > :first-child { grid-column: 1 / -1; }
    .docs-props td:first-child { white-space: normal; }
    .docs-props .docs-cell { min-width: 0; overflow-wrap: anywhere; }
  }
`;

/** Shell behaviour shared by every page: drawer nav, collapsible search, scroll cues on examples. */
const SHELL_JS = `(() => {
  const side = document.querySelector(".docs-side");
  const cur = side && side.querySelector('.oq-nav[aria-label="Components"] [aria-current="page"]');
  if (cur) side.scrollTop = cur.offsetTop - side.clientHeight / 2;

  const body = document.body, menu = document.querySelector(".docs-menu-btn");
  const drawerMode = () => matchMedia("(max-width: 900px)").matches;
  const setNav = (open) => {
    body.classList.toggle("docs-nav-open", open);
    menu.setAttribute("aria-expanded", String(open));
    if (open) (side.querySelector('[aria-current="page"]') || side.querySelector("a, button")).focus({ preventScroll: true });
    else if (side.contains(document.activeElement)) menu.focus();
  };
  menu.addEventListener("click", () => setNav(true));
  document.querySelectorAll("[data-docs-close]").forEach((el) => el.addEventListener("click", () => setNav(false)));
  side.addEventListener("click", (e) => { if (e.target.closest("a") && drawerMode()) setNav(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (body.classList.contains("docs-nav-open")) setNav(false);
    else if (body.classList.contains("docs-searching")) setSearch(false);
  });
  // Keep focus inside the open drawer.
  side.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !body.classList.contains("docs-nav-open")) return;
    const f = [...side.querySelectorAll("a[href], button, select")].filter((el) => el.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  matchMedia("(max-width: 900px)").addEventListener("change", (m) => { if (!m.matches) setNav(false); });

  const bar = document.querySelector(".docs-bar"), q = bar.querySelector(".docs-bar-search input");
  const setSearch = (on) => { bar.classList.toggle("docs-searching", on); if (on) q.focus(); };
  bar.querySelector(".docs-search-btn").addEventListener("click", () => setSearch(true));
  bar.querySelector(".docs-search-close").addEventListener("click", () => setSearch(false));

  // Example boxes that are wider than the screen scroll sideways; say so until scrolled to the end.
  const cue = (wrap) => {
    const box = wrap.querySelector(".docs-demo");
    wrap.classList.toggle("has-more", box.scrollWidth - box.clientWidth - box.scrollLeft > 4);
  };
  document.querySelectorAll(".docs-demo-wrap").forEach((wrap) => {
    wrap.querySelector(".docs-demo").addEventListener("scroll", () => cue(wrap), { passive: true });
    new ResizeObserver(() => cue(wrap)).observe(wrap);
  });
})();`;

function page({ title, depth, current, nav, body, extraScript = "" }) {
  const up = "../".repeat(depth);
  return `<!doctype html>
<!-- GENERATED by scripts/docs.mjs — do not edit by hand. -->
<html lang="en" class="oq" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · OSQD UI docs</title>
${THEME_BOOT}
<link rel="stylesheet" href="${up}../../styles/index.css">
<style>${DOCS_CSS}</style>
<script src="${up}../../assets/osqd-ui-elements.js" defer></script>
</head>
<body class="oq">
<div class="oq-shell docs-shell">
  <header class="oq-appbar oq-appbar--sticky docs-bar">
    <button class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral docs-menu-btn" type="button" aria-label="Open navigation" aria-controls="docs-side" aria-expanded="false">${ICON.menu}</button>
    <a class="oq-appbar__brand" href="${up}index.html">${ICON.logo}OSQD&nbsp;UI <span class="oq-chip oq-sm oq-neutral docs-version">docs ${esc(pkg.version)}</span></a>
    <nav class="oq-row oq-gap-1 docs-site-nav" aria-label="Site">
      <a class="oq-btn oq-btn--${current === "index" ? "soft" : "ghost"} oq-neutral oq-sm" href="${up}index.html"${current === "index" ? ' aria-current="page"' : ""}>Components</a>
      <a class="oq-btn oq-btn--${current === "elements" ? "soft" : "ghost"} oq-neutral oq-sm" href="${up}elements.html"${current === "elements" ? ' aria-current="page"' : ""}>Web Components</a>
      <a class="oq-btn oq-btn--ghost oq-neutral oq-sm" href="${up}../../preview.html">Galleries</a>
      <a class="oq-btn oq-btn--ghost oq-neutral oq-sm" href="${up}../../icons.html">Icons</a>
    </nav>
    <div class="oq-spacer"></div>
    <form class="oq-input-group docs-bar-search" action="${up}index.html" method="get" role="search">
      <span class="oq-addon oq-addon--plain">${ICON.search}</span>
      <input class="oq-input oq-sm" name="q" type="search" placeholder="Search components" aria-label="Search components" autocomplete="off"${current === "index" ? ' id="docs-bar-q"' : ""}>
    </form>
    <button class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral docs-search-btn" type="button" aria-label="Search">${ICON.search}</button>
    <button class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral docs-search-close" type="button" aria-label="Close search">${ICON.close}</button>
    <oq-theme-select storage-key="oq-preview-theme" aria-label="Theme"></oq-theme-select>
  </header>
  <div class="docs-backdrop" data-docs-close></div>
  <aside class="oq-sidebar docs-side" id="docs-side" aria-label="Documentation">
    <div class="docs-drawer-head">
      <span class="oq-strong oq-grow">Documentation</span>
      <button class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral" type="button" aria-label="Close navigation" data-docs-close>${ICON.close}</button>
    </div>
    <nav class="docs-drawer-links oq-nav" aria-label="Site">
      <a class="oq-nav__item" href="${up}index.html"${current === "index" ? ' aria-current="page"' : ""}>Components</a>
      <a class="oq-nav__item" href="${up}elements.html"${current === "elements" ? ' aria-current="page"' : ""}>Web Components</a>
      <a class="oq-nav__item" href="${up}../../preview.html">Galleries</a>
      <a class="oq-nav__item" href="${up}../../icons.html">Icons</a>
      <label class="docs-drawer-theme oq-field" style="padding: 8px 10px 4px"><span class="oq-label">Theme</span><oq-theme-select storage-key="oq-preview-theme" aria-label="Theme"></oq-theme-select></label>
    </nav>
    <nav class="oq-nav" aria-label="Components">
${nav}
    </nav>
  </aside>
  <main class="oq-shell__main"><div class="docs-main">
${body}
  </div></main>
</div>
<script>${SHELL_JS}</script>
${extraScript}
</body>
</html>
`;
}

function sideNav(components, depth, currentSlug) {
  const up = "../".repeat(depth);
  const parts = [];
  for (const area of AREA_ORDER) {
    if (area === "Elements") {
      parts.push(`      <div class="oq-nav__section oq-overline docs-nav-area">Elements</div>`);
      parts.push(`      <a class="oq-nav__item" href="${up}elements.html"${currentSlug === "#elements" ? ' aria-current="page"' : ""}>Web Components</a>`);
      continue;
    }
    const list = components.filter((c) => c.area === area);
    if (!list.length) continue;
    parts.push(`      <div class="oq-nav__section oq-overline docs-nav-area">${esc(area)}</div>`);
    for (const c of list.sort((a, b) => a.name.localeCompare(b.name)))
      parts.push(
        `      <a class="oq-nav__item" href="${up}components/${c.slug}.html"${c.slug === currentSlug ? ' aria-current="page"' : ""}>${esc(c.name)}</a>`,
      );
  }
  return parts.join("\n");
}

/** Section ids per gallery page, to deep-link a component to the closest gallery section. */
function galleryAnchors() {
  const out = {};
  for (const f of new Set(Object.values(GALLERY))) {
    try {
      const html = readFileSync(at(f), "utf8");
      out[f] = [...html.matchAll(/<section[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    } catch {
      out[f] = [];
    }
  }
  return out;
}

function galleryLink(c, anchors) {
  const file = GALLERY[c.area];
  const ids = anchors[file] ?? [];
  const words = c.slug.split("-");
  const id =
    ids.find((i) => i === c.slug) ??
    ids.find((i) => i === `${c.slug}s`) ??
    ids.find((i) => i.split("-").includes(words[0]) || i.split("-").includes(`${words[0]}s`)) ??
    ids.find((i) => i.includes(words[words.length - 1])) ??
    null;
  return `${file}${id ? `#${id}` : ""}`;
}

function propsTable(c) {
  const native = c.native
    ? `<p class="oq-small oq-muted">Also accepts every native <code>${c.native === "element" ? "HTML element" : `&lt;${esc(c.native)}&gt;`}</code> attribute${c.native === "element" ? "" : ""}, passed through to the root element.</p>`
    : "";
  if (!c.props.length) return `<p class="oq-muted">No props of its own.</p>${native}`;
  const rows = c.props
    .map(
      (p) => `<tr>
        <td><span class="oq-row oq-wrap oq-gap-2"><span class="oq-mono oq-strong">${esc(p.name)}</span>${p.optional ? "" : '<span class="oq-chip oq-sm oq-warning">required</span>'}</span></td>
        <td data-label="Type"><span class="docs-type docs-cell">${esc(p.type)}</span></td>
        <td data-label="Default"><span class="docs-cell">${p.default ? `<code>${esc(p.default)}</code>` : '<span class="oq-faint">—</span>'}</span></td>
        <td data-label="About" class="oq-small"><span class="docs-cell">${p.doc ? md(p.doc).replace(/<\/?p>/g, "") : '<span class="oq-faint">—</span>'}</span></td>
      </tr>`,
    )
    .join("\n");
  return `<div class="oq-table-wrap docs-props-wrap"><table class="oq-table oq-table--dense docs-props">
      <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table></div>${native}`;
}

function componentPage(c, ctx) {
  const { examples, components, anchors, smallIcons } = ctx;
  const has = examples.names.includes(c.name);
  const html = has ? examples.render(c.name) : "";
  const tall = html.length > 6000 ? " docs-demo--tall" : "";
  const exampleBlock = has
    ? `<section class="docs-section" id="example">
      <h2 class="oq-h4">Example</h2>
      <div class="oq-card">
        <div class="docs-demo-wrap"><div class="docs-demo${tall}">${html}</div><span class="oq-chip oq-sm oq-neutral docs-scroll-cue" aria-hidden="true">Scroll →</span></div>
        <oq-tabs>
          <div class="oq-tabs" role="tablist" aria-label="Example code" style="padding: 0 12px">
            <button class="oq-tab" role="tab" aria-selected="true" aria-controls="code-react" id="tab-react">React</button>
            <button class="oq-tab" role="tab" aria-selected="false" aria-controls="code-html" id="tab-html" tabindex="-1">HTML</button>
          </div>
          <div class="oq-tabpanel oq-p-3" role="tabpanel" id="code-react" aria-labelledby="tab-react">${codeBlock("tsx", examples.code(c.name))}</div>
          <div class="oq-tabpanel oq-p-3" role="tabpanel" id="code-html" aria-labelledby="tab-html" hidden>${codeBlock("html", prettyHtml(html))}</div>
        </oq-tabs>
      </div>
    </section>`
    : "";
  const iconList =
    c.name === "Icon"
      ? `<section class="docs-section"><h2 class="oq-h4">Fixed-name icon components</h2>
      <p class="oq-muted">A few icons are also exported as components of their own, used inside the kit: ${smallIcons.map((n) => `<code>${n}</code>`).join(" ")}.</p></section>`
      : "";
  const element = c.element
    ? `<section class="docs-section"><h2 class="oq-h4">Without React</h2>
      <p class="oq-muted">In plain HTML, <a href="../elements.html#${c.element}"><code>&lt;${c.element}&gt;</code></a> gives the same markup its behaviour.</p></section>`
    : "";
  const related = c.related.length
    ? `<section class="docs-section"><h2 class="oq-h4">Related</h2>
      <div class="oq-row oq-wrap oq-gap-1">${c.related
        .map((r) => {
          const o = components.find((x) => x.name === r);
          return `<a class="oq-chip oq-neutral" href="${o.slug}.html">${esc(r)}</a>`;
        })
        .join("")}</div></section>`
    : "";
  const body = `
    <div class="oq-stack oq-gap-2">
      <ol class="oq-breadcrumbs"><li><a href="../index.html">Docs</a></li><li><a href="../index.html#${kebab(c.area)}">${esc(c.area)}</a></li><li><span aria-current="page">${esc(c.name)}</span></li></ol>
      <div class="oq-row oq-wrap oq-gap-3"><h1 class="oq-h2">${esc(c.name)}</h1>${c.element ? `<span class="oq-chip oq-sm oq-secondary">&lt;${c.element}&gt;</span>` : ""}</div>
      <div class="docs-prose">${md(c.doc)}</div>
      <div class="oq-row oq-wrap oq-gap-3 oq-small">
        <span class="oq-muted">Source <code>${esc(c.file)}</code></span>
        <a href="../../../${galleryLink(c, anchors)}">See it in the gallery ${ICON.external}</a>
      </div>
    </div>
    ${exampleBlock}
    <section class="docs-section" id="props">
      <h2 class="oq-h4">Props</h2>
      ${propsTable(c)}
    </section>
    ${
      c.classes.length
        ? `<section class="docs-section" id="classes"><h2 class="oq-h4">CSS classes</h2>
      <p class="oq-small oq-muted">The classes this component renders, for styling the same thing in plain HTML.</p>
      <div class="oq-row oq-wrap oq-gap-1">${c.classes.map((k) => `<code>.${esc(k)}</code>`).join(" ")}</div></section>`
        : ""
    }
    ${iconList}
    ${element}
    ${related}`;
  return page({ title: c.name, depth: 1, current: "component", nav: sideNav(components, 1, c.slug), body });
}

const GETTING_STARTED = [
  ["Install", "sh", "npm install @osqd/ui"],
  [
    "Plain CSS",
    "html",
    `<link rel="stylesheet" href="node_modules/@osqd/ui/dist/osqd-ui.css">

<body class="oq" data-theme="dark">
  <button class="oq-btn">Save</button>
  <button class="oq-btn oq-btn--outline oq-neutral">Cancel</button>
</body>`,
  ],
  [
    "React",
    "tsx",
    `import "@osqd/ui/css";
import { ThemeProvider, Button } from "@osqd/ui";

export function App() {
  return (
    <ThemeProvider theme="dark" fullPage>
      <Button color="primary">Deploy</Button>
    </ThemeProvider>
  );
}`,
  ],
  [
    "Web Components (no React, no build)",
    "html",
    `<link rel="stylesheet" href="node_modules/@osqd/ui/dist/osqd-ui.css">
<script src="node_modules/@osqd/ui/assets/osqd-ui-elements.js" defer></script>

<oq-tabs>…markup that already uses the kit's classes…</oq-tabs>`,
  ],
  [
    "Themes",
    "html",
    `<!-- dark · light · graphite · midnight · contrast · paper · slate · auto -->
<html class="oq" data-theme="midnight">

<!-- any subtree can carry its own theme -->
<section data-theme="paper">…</section>`,
  ],
  ["Density", "html", `<div data-density="compact">…</div>   <!-- compact · comfortable -->`],
  [
    "Icons",
    "html",
    `<svg class="oq-icon"><use href="node_modules/@osqd/ui/assets/icons.svg#oq-i-search"/></svg>

// React
<Icon name="search" />`,
  ],
];

function indexPage(components, elements) {
  const groups = AREA_ORDER.filter((a) => a !== "Elements")
    .map((area) => {
      const list = components.filter((c) => c.area === area).sort((a, b) => a.name.localeCompare(b.name));
      if (!list.length) return "";
      return `<section class="docs-section" id="${kebab(area)}" data-area>
      <div class="oq-row oq-between oq-wrap"><h2 class="oq-h3">${esc(area)}</h2><span class="oq-small oq-faint">${list.length} components · <a href="../../${GALLERY[area]}">gallery</a></span></div>
      <p class="oq-muted oq-small">${esc(AREA_INTRO[area] ?? "")}</p>
      <div class="oq-grid" style="--min: 230px; --gap: 2">
${list
  .map(
    (c) =>
      `        <a class="oq-paper docs-card" href="components/${c.slug}.html" data-search="${esc(`${c.name} ${c.area} ${c.doc}`.toLowerCase())}"><span class="oq-strong">${esc(c.name)}</span><span class="docs-card__desc">${esc(firstSentence(c.doc))}</span></a>`,
  )
  .join("\n")}
      </div>
    </section>`;
    })
    .join("\n");
  const started = GETTING_STARTED.map(
    ([title, lang, code]) => `<div class="oq-stack oq-gap-2"><h3 class="oq-h5">${esc(title)}</h3>${codeBlock(lang, code)}</div>`,
  ).join("\n");
  const links = [
    ["Galleries", [["Core", "preview.html"], ["Charts", "preview-charts.html"], ["Data", "preview-data.html"], ["Forms", "preview-forms.html"], ["Layout", "preview-layout.html"], ["Elements", "elements.html"], ["Icons", "icons.html"]]],
    ["Sample sites", [["All samples", "examples/index.html"], ["Dashboard", "examples/dashboard.html"], ["Logs", "examples/logs.html"], ["Admin", "examples/admin.html"], ["Settings", "examples/settings.html"], ["Tickets", "examples/tickets.html"], ["Login", "examples/login.html"], ["Docs page", "examples/docs-page.html"]]],
    ["Tools", [["Theme builder", "theme-builder.html"], ["Error pages", "pages/404.html"]]],
  ]
    .map(
      ([title, items]) =>
        `<div class="oq-stack oq-gap-2"><span class="oq-overline">${title}</span><div class="oq-row oq-wrap oq-gap-1">${items.map(([l, h]) => `<a class="oq-btn oq-btn--outline oq-neutral oq-sm" href="../../${h}">${l}</a>`).join("")}</div></div>`,
    )
    .join("\n");
  const body = `
    <div class="docs-hero">
      <span class="oq-overline">@osqd/ui ${esc(pkg.version)}</span>
      <h1 class="oq-h1">Documentation</h1>
      <p class="oq-muted" style="max-width: 72ch">A utilitarian UI kit: plain CSS classes that work in any page, React components that render the same classes, and custom elements for pages without React. ${components.length} components and ${elements.length} custom elements, each page generated from the source.</p>
      <div class="oq-input-group docs-hero-search" style="max-width: 420px; margin-top: 8px"><span class="oq-addon oq-addon--plain">${ICON.search}</span><input class="oq-input" id="docs-search" type="search" placeholder="Search components…" aria-label="Search components" autocomplete="off"><span class="oq-addon oq-addon--plain"><kbd class="oq-kbd">/</kbd></span></div>
    </div>
    <div class="oq-paper oq-p-4 oq-stack">${links}</div>
    <p class="oq-muted" id="docs-empty" hidden>No component matches.</p>
${groups}
    <section class="docs-section" id="getting-started">
      <h2 class="oq-h3">Getting started</h2>
      <div class="oq-grid" style="--min: 420px">
${started}
      </div>
    </section>`;
  const script = `<script>
(() => {
  const input = document.getElementById("docs-search");
  const cards = [...document.querySelectorAll("[data-search]")];
  const sections = [...document.querySelectorAll("[data-area]")];
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach((c) => { const on = !q || c.dataset.search.includes(q); c.hidden = !on; if (on) shown++; });
    sections.forEach((s) => { s.hidden = !s.querySelector("[data-search]:not([hidden])"); });
    document.getElementById("docs-empty").hidden = shown > 0;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
  });
  // The top-bar search on every page submits here as ?q=…; on this page it filters in place.
  const barQ = document.getElementById("docs-bar-q");
  if (barQ) {
    barQ.form.addEventListener("submit", (e) => { e.preventDefault(); input.value = barQ.value; input.dispatchEvent(new Event("input")); input.scrollIntoView({ block: "center" }); });
    barQ.addEventListener("input", () => { input.value = barQ.value; input.dispatchEvent(new Event("input")); });
  }
  const q0 = new URLSearchParams(location.search).get("q");
  if (q0) { input.value = q0; input.dispatchEvent(new Event("input")); }
})();
</script>`;
  return page({ title: "Documentation", depth: 0, current: "index", nav: sideNav(components, 0, null), body, extraScript: script });
}

function elementsPage(components, elements) {
  const body = `
    <div class="oq-stack oq-gap-2">
      <ol class="oq-breadcrumbs"><li><a href="index.html">Docs</a></li><li><span aria-current="page">Web Components</span></li></ol>
      <h1 class="oq-h2">Web Components</h1>
      <div class="docs-prose"><p>Custom elements for pages without React or a build step. They render into the light DOM and enhance markup that already uses the kit's classes, so the page looks right before the script loads.</p></div>
      ${codeBlock("html", `<link rel="stylesheet" href="node_modules/@osqd/ui/dist/osqd-ui.css">\n<script src="node_modules/@osqd/ui/assets/osqd-ui-elements.js" defer></script>\n<!-- or, with a bundler: import "@osqd/ui/elements/auto"; -->`)}
      <p class="oq-small"><a href="../../elements.html">Live demos with copyable markup ${ICON.external}</a></p>
    </div>
${elements
  .map((e) => {
    const reacts = components.filter((c) => c.element === e.tag);
    return `    <section class="oq-card" id="${e.tag}"><div class="oq-card__body docs-el">
      <div class="oq-row oq-wrap oq-gap-2"><h2 class="oq-h4 oq-mono">&lt;${e.tag}&gt;</h2><code>${e.cls}</code></div>
      <div class="docs-prose">${md(e.doc)}</div>
      ${reacts.length ? `<div class="oq-row oq-wrap oq-gap-1 oq-small"><span class="oq-faint">React:</span>${reacts.map((c) => `<a class="oq-chip oq-neutral oq-sm" href="components/${c.slug}.html">${c.name}</a>`).join("")}</div>` : ""}
    </div></section>`;
  })
  .join("\n")}`;
  return page({ title: "Web Components", depth: 0, current: "elements", nav: sideNav(components, 0, "#elements"), body });
}

/* ------------------------------------------------------------------ main */

export function generate() {
  const { components, smallIcons } = extract();
  const elements = extractElements();
  const exportNames = new Set([...components.map((c) => c.name), ...smallIcons, ...exportedValueNames()]);
  const examples = loadExamples(exportNames);
  const anchors = galleryAnchors();
  const files = new Map();
  files.set("index.html", indexPage(components, elements));
  files.set("elements.html", elementsPage(components, elements));
  for (const c of components)
    files.set(`components/${c.slug}.html`, componentPage(c, { examples, components, anchors, smallIcons }));
  return { files, components, elements, examples: examples.names };
}

function exportedValueNames() {
  const text = [readFileSync(at("src/theme/index.ts"), "utf8")];
  return [...text.join("\n").matchAll(/export (?:const|function) (\w+)/g)].map((m) => m[1]);
}

function listSite(dir = at("docs/site"), base = "") {
  let out = [];
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(listSite(join(dir, e.name), p));
    else out.push(p);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const mode = process.argv[2];
  if (mode === "--dump") {
    const { components } = extract();
    console.log(JSON.stringify(components, null, 1));
  } else {
    const { files, components } = generate();
    if (mode === "--check") {
      const problems = [];
      for (const [p, content] of files) {
        let current = null;
        try {
          current = readFileSync(at("docs/site", p), "utf8");
        } catch {}
        if (current !== content) problems.push(current === null ? `missing ${p}` : `out of date ${p}`);
      }
      for (const p of listSite()) if (!files.has(p)) problems.push(`stale ${p} (no longer generated — remove it by hand)`);
      if (problems.length) {
        console.error(`docs/site is out of date — run \`npm run docs\`:\n  ${problems.slice(0, 20).join("\n  ")}${problems.length > 20 ? `\n  … ${problems.length - 20} more` : ""}`);
        process.exit(1);
      }
      console.log(`docs/site is up to date (${files.size} pages, ${components.length} components).`);
    } else {
      for (const [p, content] of files) {
        const file = at("docs/site", p);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, content);
      }
      console.log(`wrote docs/site (${files.size} pages, ${components.length} components).`);
    }
  }
}
