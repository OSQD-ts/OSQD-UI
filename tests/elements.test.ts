// @vitest-environment happy-dom
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  accepts,
  compare,
  defineAll,
  elements,
  formatBytes,
  matchesHotkey,
  type OqCombobox,
  type OqCommandPalette,
  type OqDialog,
  type OqDropzone,
  type OqNumber,
  type OqTagInput,
  type OqToastRegion,
  type OqTree,
  toast,
} from "../src/elements/index";

beforeAll(() => defineAll());
afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

/** Mount markup, let the elements set up (they wait a microtask), and return the first match. */
async function mount<T extends Element>(html: string, sel: string): Promise<T> {
  document.body.innerHTML = html;
  await Promise.resolve();
  const el = document.querySelector(sel);
  if (!el) throw new Error(`nothing matches ${sel}`);
  return el as T;
}

const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));

function events(el: Element, type: string): unknown[] {
  const seen: unknown[] = [];
  el.addEventListener(type, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

describe("defineAll", () => {
  it("defines every element and is safe to call twice", () => {
    defineAll();
    for (const [name, ctor] of Object.entries(elements)) expect(customElements.get(name)).toBe(ctor);
  });

  it("the module imports in Node without a DOM", () => {
    const out = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const esbuild = await import("esbuild");
         const r = await esbuild.build({ entryPoints: ["src/elements/index.ts"], bundle: true, format: "esm", write: false, platform: "node" });
         const m = await import("data:text/javascript," + encodeURIComponent(r.outputFiles[0].text));
         m.defineAll(); console.log(typeof m.OqTabs, m.toast({ title: "x" }));`,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(out.trim()).toBe("function -1");
  });
});

describe("oq-tabs", () => {
  const html = `<oq-tabs><div class="oq-tabs" role="tablist">
    <button class="oq-tab" role="tab" id="t1" aria-controls="p1">One</button>
    <button class="oq-tab" role="tab" id="t2" aria-controls="p2" data-value="two">Two</button>
    <button class="oq-tab" role="tab" id="t3" aria-controls="p3" disabled>Three</button>
    <button class="oq-tab" role="tab" id="t4" aria-controls="p4">Four</button></div>
    <div id="p1" role="tabpanel"></div><div id="p2" role="tabpanel"></div><div id="p3" role="tabpanel"></div><div id="p4" role="tabpanel"></div></oq-tabs>`;

  it("selects the first tab and hides the other panels", async () => {
    const tabs = await mount<HTMLElement>(html, "oq-tabs");
    expect(tabs.getAttribute("value")).toBe("t1");
    expect(document.getElementById("t1")?.getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("p1")?.hidden).toBe(false);
    expect(document.getElementById("p2")?.hidden).toBe(true);
    expect(document.getElementById("t2")?.tabIndex).toBe(-1);
  });

  it("arrow keys skip disabled tabs and wrap; Home/End jump; oq-change fires", async () => {
    const tabs = await mount<HTMLElement>(html, "oq-tabs");
    const seen = events(tabs, "oq-change");
    key(document.getElementById("t1") as HTMLElement, "ArrowRight");
    expect(tabs.getAttribute("value")).toBe("two");
    key(document.getElementById("t2") as HTMLElement, "ArrowRight");
    expect(tabs.getAttribute("value")).toBe("t4");
    key(document.getElementById("t4") as HTMLElement, "ArrowRight");
    expect(tabs.getAttribute("value")).toBe("t1");
    key(document.getElementById("t1") as HTMLElement, "End");
    expect(tabs.getAttribute("value")).toBe("t4");
    expect(seen.map((d) => (d as { value: string }).value)).toEqual(["two", "t4", "t1", "t4"]);
  });

  it("setting value selects without an event", async () => {
    const tabs = await mount<HTMLElement>(html, "oq-tabs");
    const seen = events(tabs, "oq-change");
    tabs.setAttribute("value", "two");
    expect(document.getElementById("p2")?.hidden).toBe(false);
    expect(seen).toHaveLength(0);
  });
});

describe("oq-dialog", () => {
  const html = `<button data-oq-open="d">Open</button><oq-dialog id="d"><dialog class="oq-dialog"><button data-close="ok">OK</button></dialog></oq-dialog>`;

  it("opens from an opener and closes from [data-close] with the return value", async () => {
    const el = await mount<OqDialog>(html, "oq-dialog");
    const closed = events(el, "oq-close");
    (document.querySelector("[data-oq-open]") as HTMLElement).click();
    expect(el.dialog?.open).toBe(true);
    expect(el.hasAttribute("open")).toBe(true);
    (el.querySelector("[data-close]") as HTMLElement).click();
    expect(el.dialog?.open).toBe(false);
    expect(el.hasAttribute("open")).toBe(false);
    expect(closed).toEqual([{ returnValue: "ok" }]);
  });

  it("the open attribute drives the dialog", async () => {
    const el = await mount<OqDialog>(html, "oq-dialog");
    el.setAttribute("open", "");
    expect(el.dialog?.open).toBe(true);
    el.removeAttribute("open");
    expect(el.dialog?.open).toBe(false);
  });
  it("locks page scroll while open, and nested modals unlock in order", async () => {
    document.documentElement.style.overflow = "";
    const el = await mount<OqDialog>(`${html}<oq-dialog id="d2"><dialog class="oq-dialog"></dialog></oq-dialog>`, "oq-dialog");
    const second = document.querySelector("#d2") as OqDialog;
    el.show();
    expect(document.documentElement.style.overflow).toBe("hidden");
    second.show();
    second.close();
    await new Promise((r) => setTimeout(r));
    expect(document.documentElement.style.overflow).toBe("hidden");
    el.close();
    await new Promise((r) => setTimeout(r));
    expect(document.documentElement.style.overflow).toBe("");
  });
});

describe("oq-dropdown", () => {
  it("emits oq-select and closes on an item, closes on an outside click", async () => {
    const el = await mount<HTMLElement>(
      `<oq-dropdown><details class="oq-dropdown"><summary>Menu</summary><div class="oq-menu">
        <button class="oq-menu__item" data-value="dup">Duplicate</button></div></details></oq-dropdown><p id="out">x</p>`,
      "oq-dropdown",
    );
    const details = el.querySelector("details") as HTMLDetailsElement;
    const picked = events(el, "oq-select");
    details.open = true;
    (el.querySelector(".oq-menu__item") as HTMLElement).click();
    expect(details.open).toBe(false);
    expect((picked[0] as { value: string }).value).toBe("dup");
    details.open = true;
    (document.getElementById("out") as HTMLElement).click();
    expect(details.open).toBe(false);
  });

  it("keeps the open menu on screen: flips up near the bottom, shifts in from the edge, resets on close", async () => {
    const el = await mount<HTMLElement>(
      `<oq-dropdown><details class="oq-dropdown"><summary>Menu</summary><div class="oq-menu"><button class="oq-menu__item">A</button></div></details></oq-dropdown>`,
      "oq-dropdown",
    );
    const details = el.querySelector("details") as HTMLDetailsElement;
    const summary = el.querySelector("summary") as HTMLElement;
    const menu = el.querySelector(".oq-menu") as HTMLElement;
    const rect = (x: number, y: number, w: number, h: number) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON() {} }) as DOMRect;
    // A 375 × 700 phone; the trigger sits at the bottom-right, the 200 px menu would overflow both ways.
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(700);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(375);
    summary.getBoundingClientRect = () => rect(300, 640, 60, 32);
    menu.getBoundingClientRect = () => rect(300, 676, 200, 160);
    Object.defineProperty(menu, "scrollHeight", { value: 160, configurable: true });
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    expect(menu.dataset.side).toBe("top");
    expect(menu.style.translate).toBe("-133px 0");
    expect(menu.style.getPropertyValue("--oq-shift")).toBe("-133px");
    details.open = false;
    details.dispatchEvent(new Event("toggle"));
    expect(menu.dataset.side).toBeUndefined();
    expect(menu.style.translate).toBe("");
    vi.restoreAllMocks();
  });
});

describe("toast", () => {
  it("creates a region, shows, caps at max, and dismisses on time", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<oq-toast-region max="2"></oq-toast-region>`;
    const region = document.querySelector("oq-toast-region") as OqToastRegion;
    const shown = events(region, "oq-show");
    const gone = events(region, "oq-dismiss");
    toast({ title: "A", duration: 1000 });
    toast({ title: "B <b>", color: "danger", duration: 0 });
    toast({ title: "C", duration: 0 });
    expect(shown).toHaveLength(3);
    const titles = [...region.querySelectorAll(".oq-toast__title")].map((t) => t.textContent);
    expect(titles).toEqual(["B <b>", "C"]); // A trimmed by max, markup escaped
    expect(region.querySelector(".oq-danger")?.getAttribute("role")).toBe("alert");
    expect(gone).toHaveLength(1);
    (region.querySelector(".oq-toast button") as HTMLElement).click();
    expect(region.querySelectorAll(".oq-toast")).toHaveLength(1);
  });

  it("a finger swipe past 80 px dismisses a toast; a short one springs back", () => {
    const id = toast({ title: "Swipe me", duration: 0 });
    const el = document.querySelector(`[data-toast-id="${id}"]`) as HTMLElement;
    const ptr = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: "touch", clientX: x, bubbles: true }));
    // 20 px: under both the 80 px distance and the 30 px quick-flick threshold.
    ptr("pointerdown", 100);
    ptr("pointermove", 120);
    ptr("pointerup", 120);
    expect(document.querySelector(`[data-toast-id="${id}"]`)).not.toBeNull();
    expect(el.style.translate).toBe("");
    ptr("pointerdown", 100);
    ptr("pointermove", 200);
    ptr("pointerup", 200);
    expect(document.querySelector(`[data-toast-id="${id}"]`)).toBeNull();
  });

  it("makes a region when the page has none", () => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    toast({ message: "hi" });
    expect(document.querySelector("oq-toast-region.oq-toasts .oq-toast__message")?.textContent).toBe("hi");
    vi.advanceTimersByTime(5000);
    expect(document.querySelectorAll(".oq-toast")).toHaveLength(0);
  });
});

describe("oq-combobox", () => {
  const html = `<oq-combobox class="oq-combobox"><input class="oq-input"><ul class="oq-listbox">
    <li class="oq-option" data-value="api">api-gateway</li>
    <li class="oq-option" data-value="bot">bothandler</li>
    <li class="oq-option" data-value="pot" aria-disabled="true">hackerpot</li>
    <li class="oq-option" data-value="mini">minisiem</li></ul></oq-combobox>`;

  it("wires ARIA and filters with a highlighted match", async () => {
    const el = await mount<OqCombobox>(html, "oq-combobox");
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("role")).toBe("combobox");
    input.value = "ot";
    input.dispatchEvent(new Event("input"));
    const opts = [...el.querySelectorAll(".oq-option")];
    expect(opts.map((o) => o.textContent)).toEqual(["bothandler", "hackerpot"]);
    expect(opts[0]?.innerHTML).toContain("<mark>ot</mark>");
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("arrow keys skip disabled options and Enter picks", async () => {
    const el = await mount<OqCombobox>(html, "oq-combobox");
    const input = el.querySelector("input") as HTMLInputElement;
    const changed = events(el, "oq-change");
    key(input, "ArrowDown"); // opens, active api
    key(input, "ArrowDown"); // bot
    key(input, "ArrowDown"); // skips pot → mini
    expect(input.getAttribute("aria-activedescendant")).toMatch(/-3$/);
    key(input, "Enter");
    expect(el.value).toBe("mini");
    expect(input.value).toBe("minisiem");
    expect(changed).toEqual([{ value: "mini", label: "minisiem" }]);
    expect((el.querySelector(".oq-listbox") as HTMLElement).hidden).toBe(true);
  });

  it("an attribute set before setup does not lose the options (browsers call back during upgrade)", async () => {
    document.body.innerHTML = html;
    const el = document.querySelector("oq-combobox") as OqCombobox;
    el.setAttribute("value", "bot"); // before the setup microtask, like an upgrade does
    await Promise.resolve();
    expect(el.options).toHaveLength(4);
    expect((el.querySelector("input") as HTMLInputElement).value).toBe("bothandler");
  });

  it("shows the empty text when nothing matches; Escape closes", async () => {
    const el = await mount<OqCombobox>(html.replace("<oq-combobox", '<oq-combobox empty-text="Nothing"'), "oq-combobox");
    const input = el.querySelector("input") as HTMLInputElement;
    input.value = "zzz";
    input.dispatchEvent(new Event("input"));
    expect(el.querySelector(".oq-listbox__empty")?.textContent).toBe("Nothing");
    key(input, "Escape");
    expect((el.querySelector(".oq-listbox") as HTMLElement).hidden).toBe(true);
  });
});

describe("oq-tree", () => {
  const html = `<oq-tree><ul class="oq-tree" role="tree">
    <li role="treeitem" data-id="src" aria-expanded="false"><div class="oq-tree__row"><span class="oq-tree__twisty">›</span>src</div>
      <ul role="group">
        <li role="treeitem" data-id="src/a.ts"><div class="oq-tree__row">a.ts</div></li>
        <li role="treeitem" data-id="src/b.ts"><div class="oq-tree__row">b.ts</div></li>
      </ul></li>
    <li role="treeitem" data-id="readme"><div class="oq-tree__row">README.md</div></li>
  </ul></oq-tree>`;
  const item = (id: string) => document.querySelector(`[data-id="${id}"]`) as HTMLElement;

  it("follows the tree keyboard pattern", async () => {
    const el = await mount<OqTree>(html, "oq-tree");
    const toggles = events(el, "oq-toggle");
    expect(item("src").tabIndex).toBe(0);
    key(item("src"), "ArrowDown");
    expect(document.activeElement).toBe(item("readme")); // children hidden
    key(item("readme"), "ArrowUp");
    key(item("src"), "ArrowRight"); // opens
    expect(item("src").getAttribute("aria-expanded")).toBe("true");
    key(item("src"), "ArrowRight"); // enters
    expect(document.activeElement).toBe(item("src/a.ts"));
    key(item("src/a.ts"), "End");
    expect(document.activeElement).toBe(item("readme"));
    key(item("readme"), "ArrowUp");
    expect(document.activeElement).toBe(item("src/b.ts"));
    key(item("src/b.ts"), "ArrowLeft"); // to parent
    expect(document.activeElement).toBe(item("src"));
    key(item("src"), "ArrowLeft"); // closes
    expect(item("src").getAttribute("aria-expanded")).toBe("false");
    expect(toggles).toEqual([
      { id: "src", expanded: true },
      { id: "src", expanded: false },
    ]);
  });

  it("Enter selects and fires oq-select; value reveals and selects", async () => {
    const el = await mount<OqTree>(html, "oq-tree");
    const sel = events(el, "oq-select");
    key(item("src"), "Enter");
    expect(item("src").getAttribute("aria-selected")).toBe("true");
    expect((sel[0] as { id: string }).id).toBe("src");
    el.value = "src/b.ts";
    expect(item("src").getAttribute("aria-expanded")).toBe("true");
    expect(item("src/b.ts").getAttribute("aria-selected")).toBe("true");
    expect(item("src").getAttribute("aria-selected")).toBe("false");
  });
});

describe("oq-sortable-table", () => {
  const html = `<oq-sortable-table><table class="oq-table"><thead><tr>
    <th aria-sort="none" data-key="name">Name</th><th aria-sort="none" data-key="rps">Req/s</th><th>Owner</th></tr></thead>
    <tbody>
      <tr><td>node-10</td><td>1,204</td><td>a</td></tr>
      <tr><td>node-2</td><td>98</td><td>b</td></tr>
      <tr><td>node-1</td><td></td><td>c</td></tr>
      <tr><td>node-3</td><td>12 480</td><td>d</td></tr>
    </tbody></table></oq-sortable-table>`;
  const col = (n: number) => [...document.querySelectorAll("tbody tr")].map((r) => r.children[n]?.textContent);

  it("sorts numerically, empties last, then restores the original order", async () => {
    const el = await mount<HTMLElement>(html, "oq-sortable-table");
    const sorts = events(el, "oq-sort");
    const rps = document.querySelector('[data-key="rps"]') as HTMLElement;
    rps.click();
    expect(col(1)).toEqual(["98", "1,204", "12 480", ""]);
    expect(rps.getAttribute("aria-sort")).toBe("ascending");
    rps.click();
    expect(col(1)).toEqual(["12 480", "1,204", "98", ""]);
    rps.click();
    expect(col(0)).toEqual(["node-10", "node-2", "node-1", "node-3"]);
    expect(sorts.map((s) => (s as { direction: string }).direction)).toEqual(["ascending", "descending", "none"]);
  });

  it("sorts text in natural order and works from the keyboard", async () => {
    await mount<HTMLElement>(html, "oq-sortable-table");
    const name = document.querySelector('[data-key="name"]') as HTMLElement;
    expect(name.tabIndex).toBe(0);
    key(name, "Enter");
    expect(col(0)).toEqual(["node-1", "node-2", "node-3", "node-10"]);
    expect(document.querySelector('[data-key="rps"]')?.getAttribute("aria-sort")).toBe("none");
  });

  it("compare() reads numbers with separators and units", () => {
    expect(compare("1,204", "98")).toBeGreaterThan(0);
    expect(compare("98.6 %", "100 %")).toBeLessThan(0);
    expect(compare("-3", "2")).toBeLessThan(0);
    expect(compare("node-2", "node-10")).toBeLessThan(0);
  });
});

describe("oq-number", () => {
  it("creates its buttons, steps, clamps, rounds and fires oq-change", async () => {
    const el = await mount<OqNumber>(`<oq-number class="oq-number" min="0" max="1" step="0.05"><input value="0.27"></oq-number>`, "oq-number");
    const input = el.querySelector("input") as HTMLInputElement;
    const changes = events(el, "oq-change");
    expect(el.querySelectorAll(".oq-number__btn")).toHaveLength(2);
    expect(input.value).toBe("0.25"); // rounded to the step on connect, no event
    key(input, "ArrowUp");
    expect(input.value).toBe("0.3");
    key(input, "ArrowUp", { shiftKey: true });
    expect(input.value).toBe("0.8");
    key(input, "End");
    expect(input.value).toBe("1");
    expect((el.querySelector("[data-inc]") as HTMLButtonElement).disabled).toBe(true);
    input.value = "-4";
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("0");
    expect(input.getAttribute("aria-valuenow")).toBe("0");
    expect(changes.map((c) => (c as { value: number }).value)).toEqual([0.3, 0.8, 1, 0]);
  });
});

describe("oq-tag-input", () => {
  it("adds on Enter and separator, refuses duplicates, removes with Backspace", async () => {
    const el = await mount<OqTagInput>(`<oq-tag-input class="oq-tags" value="eu,us" name="regions"><input></oq-tag-input>`, "oq-tag-input");
    const input = el.querySelector("input:not([type=hidden])") as HTMLInputElement;
    const changes = events(el, "oq-change");
    const rejects = events(el, "oq-reject");
    expect(el.tags).toEqual(["eu", "us"]);
    input.value = "ap";
    key(input, "Enter");
    input.value = "EU";
    key(input, ",");
    expect(el.tags).toEqual(["eu", "us", "ap"]);
    expect(rejects).toEqual([{ value: "EU", reason: "duplicate" }]);
    expect(el.getAttribute("aria-invalid")).toBe("true");
    input.value = "";
    key(input, "Backspace");
    expect(el.tags).toEqual(["eu", "us"]);
    expect(el.querySelectorAll(".oq-chip")).toHaveLength(2);
    expect((el.querySelector("input[type=hidden]") as HTMLInputElement).value).toBe("eu,us");
    expect(changes).toHaveLength(2);
  });

  it("checks the pattern", async () => {
    const el = await mount<OqTagInput>(`<oq-tag-input pattern="[a-z]+-\\d"><input></oq-tag-input>`, "oq-tag-input");
    expect(el.addTag("eu-1")).toBe(true);
    expect(el.addTag("nope")).toBe(false);
    expect(el.tags).toEqual(["eu-1"]);
  });
});

describe("oq-dropzone", () => {
  it("accepts by type and size and lists files", async () => {
    const el = await mount<OqDropzone>(
      `<oq-dropzone class="oq-dropzone" list="#files" max-size="10"><input type="file" multiple accept=".csv,application/json"></oq-dropzone><ul id="files"></ul>`,
      "oq-dropzone",
    );
    const got = events(el, "oq-files");
    el.take([
      new File(["a,b"], "a.csv"),
      new File(["{}"], "x.json", { type: "application/json" }),
      new File(["x".repeat(20)], "big.csv"),
      new File(["?"], "img.png", { type: "image/png" }),
    ]);
    expect(el.files.map((f) => f.name)).toEqual(["a.csv", "x.json"]);
    const detail = got[0] as { files: File[]; rejected: Array<{ reason: string }> };
    expect(detail.rejected.map((r) => r.reason)).toEqual(["size", "type"]);
    expect(document.querySelectorAll("#files .oq-file")).toHaveLength(4);
    expect(document.querySelectorAll('#files [data-state="error"]')).toHaveLength(2);
    (document.querySelector("#files [data-file-index]") as HTMLElement).click();
    expect(el.files.map((f) => f.name)).toEqual(["x.json"]);
  });

  it("accepts() and formatBytes()", () => {
    expect(accepts(new File([""], "a.PNG", { type: "image/png" }), "image/*")).toBe(true);
    expect(accepts(new File([""], "a.txt"), ".csv")).toBe(false);
    expect(accepts(new File([""], "a.txt"), "")).toBe(true);
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });
});

describe("oq-command-palette", () => {
  const html = `<oq-command-palette id="cmdk"><dialog class="oq-palette"><div class="oq-palette__search"><input></div>
    <ul class="oq-palette__list">
      <li class="oq-option" data-value="deploy" data-group="Actions" data-hint="D">Deploy ruleset</li>
      <li class="oq-option" data-value="reload" data-group="Actions" data-keywords="refresh config">Reload</li>
      <li class="oq-option" data-value="nodes" data-group="Go to">Nodes</li>
    </ul></dialog></oq-command-palette>`;

  it("opens on Ctrl+K, filters by keywords, runs with Enter", async () => {
    const el = await mount<OqCommandPalette>(html, "oq-command-palette");
    const picked = events(el, "oq-select");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }));
    const dlg = el.querySelector("dialog") as HTMLDialogElement;
    expect(dlg.open).toBe(true);
    expect(el.querySelectorAll(".oq-listbox__group")).toHaveLength(2);
    const input = el.querySelector("input") as HTMLInputElement;
    input.value = "config";
    input.dispatchEvent(new Event("input"));
    expect([...el.querySelectorAll(".oq-option")].map((o) => o.textContent)).toEqual(["Reload"]);
    key(input, "Enter");
    expect((picked[0] as { value: string }).value).toBe("reload");
    expect(dlg.open).toBe(false);
  });

  it("matchesHotkey()", () => {
    const e = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    expect(matchesHotkey(e({ key: "k", ctrlKey: true }), "ctrl+k")).toBe(true);
    expect(matchesHotkey(e({ key: "k", ctrlKey: true, shiftKey: true }), "ctrl+k")).toBe(false);
    expect(matchesHotkey(e({ key: "/" }), "/")).toBe(true);
  });
});

describe("oq-theme-select and oq-copy", () => {
  // Node 25+ defines a global `localStorage` of its own (undefined, or throwing, without
  // --localstorage-file) and it wins over happy-dom's. Give these tests a real in-memory one.
  beforeAll(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, String(v)),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size;
      },
    });
  });
  it("creates a select of every theme and applies + remembers the choice", async () => {
    localStorage.removeItem("t-key");
    const el = await mount<HTMLElement>(`<oq-theme-select storage-key="t-key" default="light"></oq-theme-select>`, "oq-theme-select");
    const select = el.querySelector("select") as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["dark", "light", "graphite", "midnight", "contrast", "paper", "slate", "auto"]);
    expect(document.documentElement.dataset.theme).toBe("light");
    const changes = events(el, "oq-change");
    select.value = "midnight";
    select.dispatchEvent(new Event("change"));
    expect(document.documentElement.dataset.theme).toBe("midnight");
    expect(localStorage.getItem("t-key")).toBe("midnight");
    expect(changes).toEqual([{ theme: "midnight" }]);
  });

  it("pickers sharing a target follow each other without firing oq-change", async () => {
    localStorage.removeItem("t-sync");
    document.body.innerHTML = `<oq-theme-select id="a" storage-key="t-sync" default="dark"></oq-theme-select><oq-theme-select id="b" storage-key="t-sync" default="dark"></oq-theme-select>`;
    await Promise.resolve();
    const a = document.querySelector("#a select") as HTMLSelectElement;
    const b = document.querySelector("#b select") as HTMLSelectElement;
    const changes = events(document.querySelector("#b") as Element, "oq-change");
    a.value = "paper";
    a.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r));
    expect(b.value).toBe("paper");
    expect(changes).toEqual([]);
  });

  it("copies code lines and shows feedback", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const el = await mount<HTMLElement>(
      `<div class="oq-codeblock"><oq-copy><button class="oq-codeblock__copy">Copy</button></oq-copy>
       <pre><code><span class="oq-code-line">a</span><span class="oq-code-line">b</span></code></pre></div>`,
      "oq-copy",
    );
    const copied = events(el, "oq-copy");
    (el.querySelector("button") as HTMLElement).click();
    await vi.waitFor(() => expect(copied).toHaveLength(1));
    expect(writeText).toHaveBeenCalledWith("a\nb");
    const btn = el.querySelector("button") as HTMLElement;
    expect(btn.dataset.copied).toBe("true");
    expect(btn.textContent).toBe("Copied");
  });
});

describe("safe to embed in a strict dashboard", () => {
  // Kept in step with scripts/elements.mjs, which refuses to write a bundle containing these.
  const FORBIDDEN = ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function", "</script", "<!--", "-->"];

  it("the standalone bundle has no markup-string sinks, no code from strings, nothing that ends a <script>", () => {
    const bundle = readFileSync("assets/osqd-ui-elements.js", "utf8");
    expect(FORBIDDEN.filter((f) => bundle.includes(f))).toEqual([]);
  });

  it("neither do the sources, comments included (a consumer may bundle them unminified)", () => {
    const found: string[] = [];
    for (const name of readdirSync("src/elements")) {
      const text = readFileSync(`src/elements/${name}`, "utf8");
      for (const f of FORBIDDEN) if (text.includes(f)) found.push(`${name}: ${f}`);
    }
    expect(found).toEqual([]);
  });
});

describe("inside a shadow root", () => {
  /**
   * A host with an open shadow root holding `html`, the way the dashboards embed their UI. The
   * light DOM gets decoys with the same ids, so a lookup that wrongly goes to `document` shows.
   */
  async function shadow(html: string, decoys = ""): Promise<ShadowRoot> {
    document.body.innerHTML = `${decoys}<div id="host"></div>`;
    const root = (document.getElementById("host") as HTMLElement).attachShadow({ mode: "open" });
    root.innerHTML = html;
    await Promise.resolve();
    await Promise.resolve();
    return root;
  }
  const q = <T extends Element = HTMLElement>(root: ShadowRoot, sel: string) => root.querySelector(sel) as T;

  it("an opener opens the dialog in its own root, not a same-id one on the page, and leaves page scroll alone", async () => {
    const root = await shadow(
      `<button data-oq-open="d">Open</button><oq-dialog id="d"><dialog class="oq-dialog"><button data-close="ok">OK</button></dialog></oq-dialog>`,
      `<oq-dialog id="d"><dialog class="oq-dialog"></dialog></oq-dialog>`,
    );
    const html = document.documentElement;
    html.style.overflow = "";
    q(root, "[data-oq-open]").click();
    expect(q<OqDialog>(root, "oq-dialog").dialog?.open).toBe(true);
    expect((document.querySelector("body > oq-dialog dialog") as HTMLDialogElement).open).toBe(false);
    expect(html.style.overflow).toBe("");
    q(root, "[data-close]").click();
    expect(q<OqDialog>(root, "oq-dialog").dialog?.open).toBe(false);
  });

  it("tabs find their panels inside the root and follow the arrow keys", async () => {
    const root = await shadow(
      `<oq-tabs><div class="oq-tabs" role="tablist">
        <button class="oq-tab" role="tab" id="t1" aria-controls="p1">One</button>
        <button class="oq-tab" role="tab" id="t2" aria-controls="p2">Two</button></div>
        <div id="p1" role="tabpanel"></div><div id="p2" role="tabpanel"></div></oq-tabs>`,
      `<div id="p1"></div><div id="p2"></div>`,
    );
    expect(q(root, "#p2").hidden).toBe(true);
    key(q(root, "#t1"), "ArrowRight");
    expect(q(root, "#t2").getAttribute("aria-selected")).toBe("true");
    expect(q(root, "#p2").hidden).toBe(false);
    expect(q(root, "#p1").hidden).toBe(true);
    expect((document.getElementById("p1") as HTMLElement).hidden).toBe(false);
  });

  it("a dropdown stays open for clicks inside it and closes for one outside the host", async () => {
    const root = await shadow(
      `<oq-dropdown><details class="oq-dropdown"><summary>Menu</summary><div class="oq-menu">
        <span class="oq-menu__label" id="label">Node</span><button class="oq-menu__item" data-value="dup">Duplicate</button></div></details></oq-dropdown>`,
      `<p id="out">outside</p>`,
    );
    const details = q<HTMLDetailsElement>(root, "details");
    details.open = true;
    // Retargeted, this click reaches the document as a click on the host: still inside.
    q(root, "#label").click();
    expect(details.open).toBe(true);
    (document.getElementById("out") as HTMLElement).click();
    expect(details.open).toBe(false);
    details.open = true;
    q(root, ".oq-menu__item").click();
    expect(details.open).toBe(false);
  });

  it("a combobox filters and marks the match with real elements", async () => {
    const root = await shadow(`<oq-combobox class="oq-combobox"><input class="oq-input"><ul class="oq-listbox">
      <li class="oq-option" data-value="bot">bothandler</li><li class="oq-option" data-value="pot">hackerpot</li>
      <li class="oq-option" data-value="api">api-gateway</li></ul></oq-combobox>`);
    const input = q<HTMLInputElement>(root, "input");
    input.value = "pot";
    input.dispatchEvent(new Event("input"));
    const opts = [...root.querySelectorAll(".oq-option")];
    expect(opts.map((o) => o.textContent)).toEqual(["hackerpot"]);
    expect(opts[0]?.querySelector("mark")?.textContent).toBe("pot");
    input.value = "<img src=x onerror=alert(1)>";
    input.dispatchEvent(new Event("input"));
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector(".oq-listbox__empty")?.textContent).toBe("No results");
  });

  it("toasts go to a region inside the root: from script with `root`, and from a data-oq-toast trigger", async () => {
    const root = await shadow(`<div id="panel"><button data-oq-toast-title="Saved" data-oq-toast-message="<b>6 nodes</b>">Save</button></div>`);
    toast({ title: "From script", root: q(root, "#panel") });
    const region = q(root, "oq-toast-region");
    expect(region).not.toBeNull();
    expect(document.querySelector("body > oq-toast-region")).toBeNull();
    q(root, "button").click();
    const titles = [...region.querySelectorAll(".oq-toast__title")].map((t) => t.textContent);
    expect(titles).toEqual(["From script", "Saved"]);
    // Text stays text: the message is shown, not parsed.
    expect(region.querySelector("b")).toBeNull();
    expect(region.querySelector(".oq-toast__message")?.textContent).toBe("<b>6 nodes</b>");
    expect(region.querySelector(".oq-toast svg path")).not.toBeNull();
  });

  it("a theme picker themes an element by id inside the root, or the closest data-theme ancestor", async () => {
    const root = await shadow(
      `<div id="panel" data-theme="dark"><oq-theme-select id="a" target="#panel" storage-key=""></oq-theme-select>
       <oq-theme-select id="b" target="closest" storage-key=""></oq-theme-select></div>`,
      `<div id="panel" data-theme="dark"></div>`,
    );
    const a = q<HTMLSelectElement>(root, "#a select");
    expect([...a.options].map((o) => o.value)).toContain("midnight");
    a.value = "paper";
    a.dispatchEvent(new Event("change"));
    expect(q(root, "#panel").dataset.theme).toBe("paper");
    expect((document.getElementById("panel") as HTMLElement).dataset.theme).toBe("dark");
    const b = q<HTMLSelectElement>(root, "#b select");
    b.value = "slate";
    b.dispatchEvent(new Event("change"));
    expect(q(root, "#panel").dataset.theme).toBe("slate");
  });

  it("a sortable table sorts inside the root", async () => {
    const root = await shadow(`<oq-sortable-table><table class="oq-table"><thead><tr>
      <th aria-sort="none" data-key="n">N</th></tr></thead><tbody><tr><td>30</td></tr><tr><td>4</td></tr><tr><td>200</td></tr></tbody></table></oq-sortable-table>`);
    q(root, "th").click();
    expect([...root.querySelectorAll("tbody td")].map((t) => t.textContent)).toEqual(["4", "30", "200"]);
  });
});
