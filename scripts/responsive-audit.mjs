// Mobile/responsive audit: loads every page at several widths and reports what breaks.
//
//   node scripts/responsive-audit.mjs [--widths 320,375,768] [--only preview] [--docs all]
//                                     [--shots <dir>] [--json <file>] [--theme light]
//
// Per page and width it measures:
//   overflow  — the page scrolls sideways (document wider than the viewport)
//   clipped   — visible elements that stick out of the viewport and are not inside a scroller
//   targets   — tappable controls smaller than 24×24 px (WCAG 2.2 target size), phone widths only
//   zoom      — text inputs under 16 px, which make phone browsers zoom on focus, phone widths only
//   errors    — console errors and uncaught exceptions
// Exit code 1 when any page overflows or throws; the other findings are reported, not fatal.
import { readdirSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const root = fileURLToPath(new URL("../", import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const widths = arg("widths", "320,375,414,768,1024").split(",").map(Number);
const only = arg("only", "");
const shots = arg("shots", "");
const jsonOut = arg("json", "");
const theme = arg("theme", "");
const docsMode = arg("docs", "sample");

const html = (dir) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".html"))
    .map((f) => (dir === "." ? f : `${dir}/${f}`));
const docSample = ["button", "virtual-table", "bar-chart", "password-input", "dialog", "notification-center", "page-header", "date-range-picker"];
const docs =
  docsMode === "all"
    ? html("docs/site/components")
    : docSample.map((n) => `docs/site/components/${n}.html`);
const pages = [...html("."), ...html("examples"), ...html("pages"), "docs/site/index.html", "docs/site/elements.html", ...docs].filter(
  (p) => !only || p.includes(only),
);

/** Runs in the page. Keep it self-contained: it is serialised by playwright. */
function measure([phone, width]) {
  // Not innerWidth: with mobile emulation an oversized page widens the layout viewport to fit,
  // so innerWidth grows with the overflow and would hide it.
  const vw = width;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    if (el.closest("[hidden], [inert], [aria-hidden='true'], dialog:not([open]), details:not([open]) > :not(summary)")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Inside something that scrolls or clips on x, sticking out is that container's business.
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
    }
    return false;
  };
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += `#${n.id}`;
      else if (typeof n.className === "string" && n.className.trim()) s += `.${n.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
      parts.unshift(s);
    }
    return parts.join(" > ");
  };

  const overflow = Math.max(0, document.documentElement.scrollWidth - vw);
  const clipped = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (clipped.length >= 12) break;
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (r.right <= vw + 1 && r.left >= -1) continue;
    const pos = getComputedStyle(el).position;
    if (pos === "fixed" && (r.left >= vw || r.right <= 0)) continue; // parked off-canvas drawers
    if (!visible(el) || contained(el)) continue;
    // Report the outermost offender only.
    if (clipped.some((c) => c.el.contains(el))) continue;
    clipped.push({ el, where: path(el), left: Math.round(r.left), right: Math.round(r.right) });
  }

  const targets = [];
  const zoom = [];
  if (phone) {
    const tappable =
      "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=option], [role=menuitem], [role=checkbox], [role=switch], [tabindex='0']";
    for (const el of document.querySelectorAll(tappable)) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      // Links inside running text are exempt (WCAG "inline" exception).
      if (el.tagName === "A" && el.closest("p, li, td, dd, .oq-alert__content, .oq-callout, .oq-banner__content, .oq-toast__message") && getComputedStyle(el).display === "inline") continue;
      // A small checkbox/radio inside a label is fine: the label is the target.
      if (el.matches("input[type=checkbox], input[type=radio]") && el.closest("label")) {
        const lr = el.closest("label").getBoundingClientRect();
        if (lr.height >= 24) continue;
      }
      if (r.width < 24 || r.height < 24) targets.push(`${path(el)} (${Math.round(r.width)}×${Math.round(r.height)})`);
    }
    for (const el of document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=hidden]), select, textarea")) {
      if (!visible(el)) continue;
      const fs = Number.parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) zoom.push(`${path(el)} (${fs}px)`);
    }
  }
  return {
    overflow,
    clipped: clipped.map(({ where, left, right }) => `${where} [${left}…${right}]`),
    targets: [...new Set(targets)],
    zoom: [...new Set(zoom)],
  };
}

const browser = await chromium.launch();
const results = [];
let fatal = 0;
for (const page of pages) {
  for (const w of widths) {
    const phone = w < 600;
    const ctx = await browser.newContext({ viewport: { width: w, height: phone ? 800 : 900 }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
    if (theme) await ctx.addInitScript((t) => { try { localStorage.setItem("oq-preview-theme", t); } catch {} }, theme);
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    try {
      await p.goto(pathToFileURL(join(root, page)).href, { waitUntil: "load", timeout: 20000 });
      await p.waitForTimeout(350);
      const m = await p.evaluate(measure, [phone, w]);
      results.push({ page, width: w, ...m, errors });
      if (m.overflow > 1 || errors.length) fatal++;
      if (shots && (w === 375 || w === 768)) {
        mkdirSync(shots, { recursive: true });
        await p.screenshot({ path: join(shots, `${page.replace(/[/.]/g, "_")}-${w}.png`), fullPage: true });
      }
    } catch (e) {
      results.push({ page, width: w, overflow: -1, clipped: [], targets: [], zoom: [], errors: [`load failed: ${e.message.slice(0, 120)}`] });
      fatal++;
    }
    await ctx.close();
  }
}
await browser.close();

// Report: one line per page, worst width first, then the details that need fixing.
const byPage = Map.groupBy(results, (r) => r.page);
for (const [page, rs] of byPage) {
  const bad = rs.filter((r) => r.overflow > 1 || r.clipped.length || r.targets.length || r.zoom.length || r.errors.length);
  if (!bad.length) {
    console.log(`ok    ${page}`);
    continue;
  }
  console.log(`FIX   ${page}`);
  for (const r of bad) {
    const bits = [];
    if (r.overflow > 1) bits.push(`overflow +${r.overflow}px`);
    if (r.clipped.length) bits.push(`${r.clipped.length} clipped`);
    if (r.targets.length) bits.push(`${r.targets.length} small targets`);
    if (r.zoom.length) bits.push(`${r.zoom.length} zoom inputs`);
    if (r.errors.length) bits.push(`${r.errors.length} errors`);
    console.log(`  ${String(r.width).padStart(4)}px  ${bits.join(", ")}`);
    for (const c of r.clipped.slice(0, 5)) console.log(`         clipped  ${c}`);
    for (const t of r.targets.slice(0, 4)) console.log(`         target   ${t}`);
    for (const z of r.zoom.slice(0, 2)) console.log(`         zoom     ${z}`);
    for (const e of r.errors.slice(0, 3)) console.log(`         error    ${e}`);
  }
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2));
console.log(`\n${pages.length} pages × ${widths.length} widths; ${fatal} page/width combinations overflow or throw.`);
process.exit(fatal ? 1 : 0);
