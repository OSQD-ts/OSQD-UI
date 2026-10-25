import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CollapsibleShell,
  ContextMenu,
  createShortcutRegistry,
  DensityProvider,
  DetailLayout,
  DetailSection,
  dayLabel,
  ERROR_PAGE_DEFAULTS,
  ErrorPage,
  formatCombo,
  groupByDay,
  matchesCombo,
  NotificationCenter,
  NotificationPanel,
  PageHeader,
  placeInViewport,
  ShellNavItem,
  ShellToggle,
  ShortcutsOverlay,
  ShortcutsProvider,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonText,
  SplitPane,
  clampSplit,
  splitFromPointer,
  timeAgo,
} from "../src/react/index";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("split pane math", () => {
  it("clamps to [min, max] and to 0–100", () => {
    expect(clampSplit(50, 10, 90)).toBe(50);
    expect(clampSplit(5, 10, 90)).toBe(10);
    expect(clampSplit(95, 10, 90)).toBe(90);
    expect(clampSplit(-20)).toBe(0);
    expect(clampSplit(140)).toBe(100);
    expect(clampSplit(Number.NaN, 15, 80)).toBe(15);
  });
  it("tolerates min and max given the wrong way round, and limits outside 0–100", () => {
    expect(clampSplit(50, 90, 10)).toBe(50);
    expect(clampSplit(95, 90, 10)).toBe(90);
    expect(clampSplit(50, -10, 140)).toBe(50);
    expect(clampSplit(150, -10, 140)).toBe(100);
  });
  it("turns a pointer position into a percentage of the container", () => {
    expect(splitFromPointer(150, 100, 200)).toBe(25);
    expect(splitFromPointer(300, 100, 200)).toBe(100);
    expect(splitFromPointer(50, 100, 200)).toBe(-25);
    expect(splitFromPointer(10, 0, 0)).toBe(0);
  });
});

describe("context menu placement", () => {
  it("opens at the pointer when it fits", () => {
    expect(placeInViewport(100, 100, 200, 150, 1000, 800)).toEqual({ left: 100, top: 100 });
  });
  it("flips left and up near the right and bottom edges", () => {
    expect(placeInViewport(950, 750, 200, 150, 1000, 800)).toEqual({ left: 750, top: 600 });
  });
  it("clamps to the margin when the menu is bigger than the space either side", () => {
    expect(placeInViewport(10, 10, 200, 900, 300, 800)).toEqual({ left: 10, top: 8 });
    expect(placeInViewport(150, 5, 280, 100, 300, 800)).toEqual({ left: 8, top: 8 });
  });
});

describe("notifications by day", () => {
  // A fixed local clock: 25 Oct 2026, 15:00.
  const now = new Date(2026, 9, 25, 15, 0, 0);
  const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

  it("labels today, yesterday and older days", () => {
    expect(dayLabel(at(25, 0, 1), now)).toBe("Today");
    expect(dayLabel(at(24, 23, 59), now)).toBe("Yesterday");
    expect(dayLabel(at(20, 12), now)).toBe("Tue, Oct 20");
    expect(dayLabel(new Date(2025, 11, 31, 12), now)).toBe("Wed, Dec 31, 2025");
  });

  it("groups newest first, one group per day, in order", () => {
    const items = [
      { id: "a", time: at(24, 9) },
      { id: "b", time: at(25, 14) },
      { id: "c", time: at(20, 8) },
      { id: "d", time: at(25, 1) },
      { id: "e", time: at(24, 22) },
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Tue, Oct 20"]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["b", "d"], ["e", "a"], ["c"]]);
  });

  it("does not reorder the input", () => {
    const items = [
      { id: "x", time: at(20, 1) },
      { id: "y", time: at(25, 1) },
    ];
    groupByDay(items, now);
    expect(items.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("formats short relative times", () => {
    expect(timeAgo(now.getTime() - 10_000, now)).toBe("now");
    expect(timeAgo(now.getTime() - 5 * 60_000, now)).toBe("5 min");
    expect(timeAgo(now.getTime() - 3 * 3_600_000, now)).toBe("3 h");
    expect(timeAgo(now.getTime() - 2 * 86_400_000, now)).toBe("2 d");
    expect(timeAgo(now.getTime() + 60_000, now)).toBe("now");
  });
});

describe("shortcut registry", () => {
  it("registers, lists, unregisters and notifies", () => {
    const r = createShortcutRegistry();
    let calls = 0;
    const unsub = r.subscribe(() => calls++);
    const off = r.register({ keys: "mod+k", label: "Search" });
    r.register({ keys: "g", label: "Go", group: "Navigation" });
    expect(r.list().map((s) => s.label)).toEqual(["Search", "Go"]);
    off();
    expect(r.list().map((s) => s.label)).toEqual(["Go"]);
    expect(calls).toBe(3);
    unsub();
    r.register({ keys: "x", label: "X" });
    expect(calls).toBe(3);
  });

  it("groups in first-seen order with General as the default group", () => {
    const r = createShortcutRegistry();
    r.register({ keys: "j", label: "Next", group: "List" });
    r.register({ keys: "?", label: "Help" });
    r.register({ keys: "k", label: "Previous", group: "List" });
    expect(r.grouped()).toEqual([
      { group: "List", items: [expect.objectContaining({ label: "Next" }), expect.objectContaining({ label: "Previous" })] },
      { group: "General", items: [expect.objectContaining({ label: "Help" })] },
    ]);
  });

  it("changes list identity only on change (safe for useSyncExternalStore)", () => {
    const r = createShortcutRegistry();
    const a = r.list();
    expect(r.list()).toBe(a);
    r.register({ keys: "a", label: "A" });
    expect(r.list()).not.toBe(a);
  });

  const ev = (key: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "shiftKey" | "altKey", boolean>> = {}) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  });

  it("matches combinations with mod as Ctrl or ⌘", () => {
    expect(matchesCombo(ev("k", { ctrlKey: true }), "mod+k", false)).toBe(true);
    expect(matchesCombo(ev("k", { metaKey: true }), "mod+k", true)).toBe(true);
    expect(matchesCombo(ev("k", { metaKey: true }), "mod+k", false)).toBe(false);
    expect(matchesCombo(ev("k"), "mod+k", false)).toBe(false);
    expect(matchesCombo(ev("K", { ctrlKey: true, shiftKey: true }), "mod+shift+k", false)).toBe(true);
    expect(matchesCombo(ev("k", { ctrlKey: true, shiftKey: true }), "mod+k", false)).toBe(false);
  });

  it("matches a symbol whatever Shift produced it", () => {
    expect(matchesCombo(ev("?", { shiftKey: true }), "?", false)).toBe(true);
    expect(matchesCombo(ev("?"), "?", false)).toBe(true);
    expect(matchesCombo(ev("/"), "?", false)).toBe(false);
  });

  it("formats combinations for display", () => {
    expect(formatCombo("mod+shift+k", false)).toEqual(["Ctrl", "Shift", "K"]);
    expect(formatCombo("mod+shift+k", true)).toEqual(["⌘", "⇧", "K"]);
    expect(formatCombo("escape", false)).toEqual(["Esc"]);
    expect(formatCombo("arrowdown", false)).toEqual(["↓"]);
    expect(formatCombo("?", false)).toEqual(["?"]);
    expect(formatCombo("f10", false)).toEqual(["F10"]);
  });
});

describe("smoke renders", () => {
  it("SplitPane renders two panes and an accessible separator", () => {
    const out = html(
      <SplitPane defaultSize={30} min={20} max={70} handleLabel="Resize list">
        <div>left</div>
        <div>right</div>
      </SplitPane>,
    );
    expect(out).toContain('class="oq-split"');
    expect(out).toContain("--split:30%");
    expect(out).toContain('role="separator"');
    expect(out).toContain('aria-valuenow="30"');
    expect(out).toContain('aria-label="Resize list"');
    expect(out).toContain('aria-orientation="vertical"');
    expect(html(<SplitPane direction="vertical" defaultSize={5}>{[<i key="a" />, <i key="b" />]}</SplitPane>)).toContain("oq-split--vertical");
  });

  it("SplitPane leaves stacking at 640px to the CSS, and takes it over for other breakpoints", () => {
    const panes = [<i key="a" />, <i key="b" />] as [React.ReactNode, React.ReactNode];
    // Default 640: no opt-out class, so layout.css stacks it on phones even before hydration.
    expect(html(<SplitPane>{panes}</SplitPane>)).not.toContain("oq-split--fixed");
    // `false` and custom breakpoints opt out of the CSS default (the component decides instead).
    expect(html(<SplitPane stackBelow={false}>{panes}</SplitPane>)).toContain("oq-split--fixed");
    expect(html(<SplitPane stackBelow={900}>{panes}</SplitPane>)).toContain("oq-split--fixed");
    // On the server nothing is stacked by script.
    expect(html(<SplitPane stackBelow={900}>{panes}</SplitPane>)).not.toContain("oq-split--stacked");
  });

  it("CollapsibleShell renders rail classes, toggle buttons and tooltip items", () => {
    const out = html(
      <CollapsibleShell defaultRail appBar={<header className="oq-appbar"><ShellToggle /></header>} sidebar={<aside className="oq-sidebar"><ShellNavItem label="Nodes" href="#n" /></aside>}>
        body
      </CollapsibleShell>,
    );
    expect(out).toContain("oq-shell oq-shell--rail");
    expect(out).toContain("oq-shell__backdrop");
    expect(out).toContain('aria-label="Expand sidebar"');
    expect(out).toContain('aria-label="Open menu"');
    expect(out).toContain('data-tip="Nodes"');
    expect(out).toContain('data-tip-pos="right"');
  });

  it("PageHeader and DetailLayout", () => {
    const out = html(
      <DetailLayout
        asideWidth={280}
        header={<PageHeader bordered title="fra-02" status={<span className="oq-chip">online</span>} meta={["Owner MP", "Updated 4 s ago"]} actions={<button type="button">Restart</button>} tabs={<div className="oq-tabs" />} />}
        aside={<div>props</div>}
      >
        <DetailSection title="Overview">x</DetailSection>
      </DetailLayout>,
    );
    expect(out).toContain("oq-page-header oq-page-header--bordered");
    expect(out).toContain('<h1 class="oq-page-header__title">fra-02</h1>');
    expect(out).toContain("<li>Owner MP</li>");
    expect(out).toContain("oq-page-header__tabs");
    expect(out).toContain("--aside-w:280px");
    expect(out).toContain('<aside class="oq-detail__aside">');
    expect(out).toContain("<h2>Overview</h2>");
  });

  it("ContextMenu renders its target (the menu itself only opens on interaction)", () => {
    const out = html(
      <ContextMenu items={[{ label: "Open" }, "separator", { group: "More" }, { label: "Delete", danger: true }]}>
        <div>target</div>
      </ContextMenu>,
    );
    expect(out).toContain("data-context-menu");
    expect(out).toContain("target");
    expect(out).not.toContain("oq-context-menu");
  });

  it("ShortcutsProvider and ShortcutsOverlay", () => {
    expect(html(<ShortcutsProvider><p>page</p></ShortcutsProvider>)).toContain("page");
    const r = createShortcutRegistry();
    r.register({ keys: "mod+k", label: "Command palette", group: "Navigation" });
    const out = html(<ShortcutsOverlay open={false} onClose={() => {}} registry={r} />);
    expect(out).toContain("oq-dialog");
    expect(out).toContain("Command palette");
    expect(out).toContain("oq-shortcuts__keys");
    expect(html(<ShortcutsOverlay open={false} onClose={() => {}} registry={createShortcutRegistry()} />)).toContain("No shortcuts on this page.");
  });

  it("NotificationCenter shows the unread count; the panel groups by day", () => {
    const now = new Date(2026, 9, 25, 15).getTime();
    const items = [
      { id: "1", title: "Node down", time: now - 60_000, color: "danger" as const },
      { id: "2", title: "Deployed", time: now - 26 * 3_600_000, read: true, href: "#d" },
    ];
    const bell = html(<NotificationCenter items={items} now={now} />);
    expect(bell).toContain('aria-label="Notifications, 1 unread"');
    expect(bell).toContain('<span class="oq-badge oq-danger" aria-hidden="true">1</span>');
    const panel = html(<NotificationPanel inline items={items} now={now} onMarkAllRead={() => {}} onMarkRead={() => {}} onDismiss={() => {}} viewAllHref="/all" />);
    expect(panel).toContain("oq-notify__panel--static");
    expect(panel).toContain(">Today<");
    expect(panel).toContain(">Yesterday<");
    expect(panel).toContain("oq-notify__item is-unread oq-danger");
    expect(panel).toContain('href="#d"');
    expect(panel).toContain("View all notifications");
    expect(html(<NotificationPanel inline items={[]} />)).toContain("all caught up");
    expect(html(<NotificationCenter items={[]} />)).not.toContain("oq-badge oq-danger");
  });

  it("skeleton presets", () => {
    expect(html(<SkeletonText lines={4} />).match(/oq-skeleton"/g)).toHaveLength(4);
    const list = html(<SkeletonList rows={3} />);
    expect(list.match(/<li>/g)).toHaveLength(3);
    expect(list).toContain("oq-skeleton--circle");
    expect(html(<SkeletonCard media actions />)).toContain("oq-skeleton-card__media");
    const table = html(<SkeletonTable rows={2} cols={3} dense />);
    expect(table).toContain("oq-table oq-skeleton-table oq-table--dense");
    expect(table.match(/<td/g)).toHaveLength(6);
  });

  it("ErrorPage variants use their illustration, code and colour", () => {
    for (const v of ["404", "500", "offline", "forbidden"] as const) {
      const out = html(<ErrorPage variant={v} />);
      expect(out).toContain(ERROR_PAGE_DEFAULTS[v].title.replace("'", "&#x27;"));
      expect(out).toContain(`oq-${ERROR_PAGE_DEFAULTS[v].color}`);
      expect(out).toContain("oq-illustration");
    }
    const custom = html(<ErrorPage variant="500" code={false} title="Down" details="req 42" fullHeight actions={<a href="/">Home</a>} />);
    expect(custom).not.toContain("oq-error-page__code");
    expect(custom).toContain("oq-error-page--full");
    expect(custom).toContain("Technical details");
    expect(custom).toContain(">Down<");
  });

  it("DensityProvider sets data-density, except for the default", () => {
    expect(html(<DensityProvider density="compact">x</DensityProvider>)).toContain('data-density="compact"');
    expect(html(<DensityProvider density="default">x</DensityProvider>)).not.toContain("data-density");
    expect(html(<DensityProvider density="comfortable" fullPage>x</DensityProvider>)).toBe("x");
  });
});
