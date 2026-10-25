import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as UI from "../src/index";
import { initials, pageWindow } from "../src/index";

const {
  Accordion, AccordionItem, Alert, AppBar, Avatar, AvatarGroup, Badge, Breadcrumbs, Button, ButtonGroup, Card, CardBody,
  CardFooter, CardHeader, Checkbox, Chip, Code, DataTable, DescriptionList, Dialog, Divider, Dot, Dropdown, EmptyState, Grid,
  IconButton, Kbd, List, ListItem, Menu, MenuItem, MenuLabel, MenuSeparator, Nav, NavItem, NavSection, Pagination, Paper,
  Progress, Radio, RadioGroup, Row, Segmented, Select, Shell, Sidebar, Skeleton, Slider, Spinner, Stack, Stat, StatusDot,
  Switch, Table, Tabs, TextField, ThemeProvider, ToastProvider, Tooltip, Typography,
} = UI;

const noop = () => {};
const html = (el: ReactElement) => renderToStaticMarkup(el);

// One render per component — a smoke test that each renders and maps its props onto the CSS contract.
const cases: Array<[string, ReactElement, string[]]> = [
  ["ThemeProvider", <ThemeProvider theme="light">x</ThemeProvider>, ['class="oq"', 'data-theme="light"']],
  ["Button", <Button color="danger" variant="outline" size="sm" loading>Go</Button>, ["oq-btn", "oq-danger", "oq-btn--outline", "oq-sm", 'aria-busy="true"']],
  ["IconButton", <IconButton label="Settings" tooltip><UI.SettingsIcon /></IconButton>, ["oq-btn--icon", 'aria-label="Settings"', 'data-tip="Settings"']],
  ["ButtonGroup", <ButtonGroup><Button>a</Button></ButtonGroup>, ["oq-btn-group"]],
  ["TextField", <TextField label="Name" help="h" required prefix="https://" />, ["oq-field", "oq-label", "oq-input-group", "oq-addon", "oq-req", "oq-help"]],
  ["TextField error", <TextField label="Port" error="Bad port" />, ["is-invalid", 'aria-invalid="true"', "Bad port"]],
  ["TextField multiline", <TextField multiline label="Notes" />, ["oq-textarea"]],
  ["Select", <Select label="Env" options={["dev", { value: "prod", label: "Production" }]} />, ["oq-select", "Production"]],
  ["Checkbox", <Checkbox label="On" color="success" />, ["oq-check", "oq-checkbox", "oq-success"]],
  ["Radio", <RadioGroup label="Mode" value="a" onChange={noop}><Radio value="a" label="A" /><Radio value="b" label="B" /></RadioGroup>, ['role="radiogroup"', "oq-radio", "checked"]],
  ["Switch", <Switch label="Live" />, ['role="switch"', "oq-switch"]],
  ["Slider", <Slider defaultValue={30} />, ["oq-range"]],
  ["Card", <Card accent="warning"><CardHeader title="T" subtitle="s" actions={<span />} /><CardBody flush /><CardFooter /></Card>, ["oq-card--accent", "oq-warning", "oq-card__title", "oq-card__body--flush", "oq-card__footer"]],
  ["Paper", <Paper variant="raised" padding={4} />, ["oq-paper--raised", "oq-p-4"]],
  ["Chip", <Chip color="info" onDelete={noop}>tag</Chip>, ["oq-chip", "oq-info", "oq-chip__remove"]],
  ["Chip toggle", <Chip selected>on</Chip>, ['aria-pressed="true"', "<button"]],
  ["Badge", <Badge count={120}><span>i</span></Badge>, ["oq-badge-anchor", "99+"]],
  ["Dot", <Dot color="danger" pulse />, ["oq-dot--pulse"]],
  ["StatusDot", <StatusDot label="Healthy" />, ["oq-status", "Healthy"]],
  ["Alert", <Alert color="danger" title="Failed" onClose={noop}>msg</Alert>, ['role="alert"', "oq-alert__title", "<svg"]],
  ["Table", <Table dense striped><tbody><tr><td>1</td></tr></tbody></Table>, ["oq-table-wrap", "oq-table--dense", "oq-table--striped"]],
  ["DataTable", <DataTable selectable defaultSort={{ key: "n", direction: "desc" }} columns={[{ key: "name", header: "Name", sortable: true }, { key: "n", header: "N", align: "right", sortable: true }]} rows={[{ id: 1, name: "a", n: 1 }, { id: 2, name: "b", n: 2 }]} />, ['aria-sort="descending"', "oq-num", "oq-table__check"]],
  ["DataTable empty", <DataTable columns={[{ key: "a", header: "A" }]} rows={[]} empty="Nothing" />, ["oq-empty", "Nothing"]],
  ["Tabs", <Tabs items={[{ value: "a", label: "A", content: "pa" }, { value: "b", label: "B", content: "pb" }]} />, ['role="tablist"', 'aria-selected="true"', "pa"]],
  ["Segmented", <Segmented options={["1h", "24h"]} value="24h" onChange={noop} />, ["oq-segmented", 'aria-pressed="true"']],
  ["Shell", <Shell appBar={<AppBar brand="OSQD" sticky />} sidebar={<Sidebar><Nav><NavSection>Main</NavSection><NavItem href="#" active>Home</NavItem><NavItem>Logs</NavItem></Nav></Sidebar>}>body</Shell>, ["oq-shell", "oq-appbar--sticky", 'aria-current="page"', "oq-nav__section", "oq-shell__main"]],
  ["List", <List hover><ListItem primary="p" secondary="s" meta="m" /></List>, ["oq-list--hover", "oq-list__secondary", "oq-list__meta"]],
  ["DescriptionList", <DescriptionList items={{ Host: "a", Port: 1 }} />, ["oq-dl", "<dt>Host</dt>"]],
  ["Dialog", <Dialog open={false} onClose={noop} title="Confirm" footer={<Button>OK</Button>} drawer />, ["<dialog", "oq-dialog--drawer", "oq-dialog__footer"]],
  ["Dropdown", <Dropdown trigger={(p) => <Button {...p}>More</Button>}><MenuItem>One</MenuItem></Dropdown>, ["oq-dropdown", 'aria-haspopup="menu"']],
  ["Menu", <Menu><MenuLabel>L</MenuLabel><MenuItem hint="⌘K" danger>Del</MenuItem><MenuSeparator /></Menu>, ["oq-menu__item", "oq-danger", "oq-menu__hint", "oq-menu__sep"]],
  ["Tooltip", <Tooltip title="Hi" placement="bottom"><button type="button">b</button></Tooltip>, ['data-tip="Hi"', 'data-tip-pos="bottom"']],
  ["Progress", <Progress value={40} />, ["--value:40%", 'aria-valuenow="40"']],
  ["Progress indeterminate", <Progress />, ["oq-progress--indeterminate"]],
  ["Spinner", <Spinner size="lg" />, ["oq-spinner", "oq-lg"]],
  ["Skeleton", <Skeleton width={80} />, ["oq-skeleton"]],
  ["ToastProvider", <ToastProvider>x</ToastProvider>, ["oq-toasts"]],
  ["Breadcrumbs", <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Here" }]} />, ["oq-breadcrumbs", 'aria-current="page"']],
  ["Pagination", <Pagination page={5} count={20} onChange={noop} />, ["oq-pagination", "oq-pagination__gap", 'aria-current="page"']],
  ["Avatar", <AvatarGroup max={1}><Avatar name="Ada Lovelace" /><Avatar name="Bob" /></AvatarGroup>, ["oq-avatar-group", "AL", "+1"]],
  ["Divider", <Divider label="Advanced" />, ["oq-divider--label"]],
  ["Accordion", <Accordion><AccordionItem title="Q" defaultOpen>A</AccordionItem></Accordion>, ["oq-accordion", "<details open", "oq-accordion__body"]],
  ["Stat", <Stat label="RPS" value="1,204" unit="/s" delta="+4%" trend="up" />, ["oq-stat__value", "oq-stat__unit", "is-up"]],
  ["EmptyState", <EmptyState title="No data" description="d" />, ["oq-empty__title"]],
  ["Kbd", <Kbd>K</Kbd>, ["oq-kbd"]],
  ["Code", <Code block>x</Code>, ["oq-pre", "<code>"]],
  ["Typography", <Typography variant="overline" color="faint">o</Typography>, ["oq-overline", "oq-faint"]],
  ["Typography intent", <Typography color="success" mono>ok</Typography>, ["oq-success", "oq-text-c", "oq-mono"]],
  ["Stack", <Stack gap={4} align="center" />, ["oq-stack", "oq-gap-4", "align-items:center"]],
  ["Row", <Row gap={2} wrap justify="space-between" />, ["oq-row", "oq-wrap"]],
  ["Grid", <Grid min={180} />, ["oq-grid", "--min:180px"]],
];

describe("React components render the CSS contract", () => {
  it.each(cases)("%s", (_name, el, expected) => {
    const out = html(el);
    for (const s of expected) expect(out).toContain(s);
  });

  it("custom themes set their variables inline and keep the base mode", () => {
    const theme = UI.createTheme({ name: "brand", palette: { primary: "#123456" } }, UI.lightTheme);
    const out = html(<ThemeProvider theme={theme}>x</ThemeProvider>);
    expect(out).toContain('data-theme="light"');
    expect(out).toContain("--oq-primary:#123456");
  });
});

describe("helpers", () => {
  it("initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("ops")).toBe("OP");
    expect(initials("  ")).toBe("");
  });

  it("pageWindow keeps first, last and neighbours, with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 20)).toEqual([1, "gap", 4, 5, 6, "gap", 20]);
    // A single skipped page is shown rather than replaced by a gap.
    expect(pageWindow(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pageWindow(1, 0)).toEqual([]);
  });
});

describe("0.2.0 components render the CSS contract", () => {
  const {
    Stepper, Timeline, NumberInput, TagInput, Combobox, DropZone, FileList, FileItem, TreeView, CodeBlock, CommandPalette,
    Popover, Toolbar, ToolbarSeparator, ToolbarLabel, Sparkline, Meter, Gauge, Banner, Callout, TablePagination,
  } = UI;
  const tree = [{ id: "src", label: "src", children: [{ id: "a", label: "a.ts", meta: "2 KB" }] }, { id: "r", label: "README.md" }];

  const more: Array<[string, ReactElement, string[]]> = [
    ["Stepper", <Stepper active={1} steps={[{ label: "A" }, { label: "B", description: "d" }, { label: "C", state: "error" }]} />, ["oq-stepper", 'data-state="done"', 'aria-current="step"', 'data-state="error"', "oq-step__desc"]],
    ["Stepper vertical", <Stepper orientation="vertical" steps={[{ label: "A" }]} />, ["oq-stepper--vertical", "oq-step__text"]],
    ["Timeline", <Timeline items={[{ title: "Deployed", time: "10:02", body: "b", color: "success", filled: true }]} />, ["oq-timeline", "oq-timeline__item--filled", "oq-success", "oq-timeline__time"]],
    ["NumberInput", <NumberInput defaultValue={2.5} step={0.5} min={0} max={10} unit="ms" aria-label="T" />, ["oq-number", 'role="spinbutton"', 'value="2.5"', 'aria-valuemax="10"', "oq-number__unit"]],
    ["NumberInput at min", <NumberInput value={0} min={0} aria-label="T" />, ['aria-label="Decrease" tabindex="-1" disabled=""']],
    ["TagInput", <TagInput defaultValue={["eu", "us"]} placeholder="Add" />, ["oq-tags", "oq-chip", "oq-chip__remove", ">eu<"]],
    ["Combobox", <Combobox aria-label="Region" defaultValue="b" options={["a", { value: "b", label: "Bravo", hint: "2" }]} />, ['role="combobox"', 'aria-expanded="false"', 'value="Bravo"', 'role="listbox"', 'aria-selected="true"', "oq-option__hint"]],
    ["DropZone", <DropZone onFiles={noop} hint="CSV up to 10 MB" accept=".csv" />, ["oq-dropzone", 'type="file"', 'accept=".csv"', "oq-dropzone__hint"]],
    ["FileItem", <FileList><FileItem name="log.csv" size={2048} progress={40} onRemove={noop} /><FileItem name="x.bin" error="Too large" /></FileList>, ["oq-filelist", "oq-file__icon", "2.0 KB · 40 %", "oq-progress", 'data-state="error"', "Too large"]],
    ["TreeView", <TreeView nodes={tree} defaultExpanded={["src"]} defaultSelected="a" />, ['role="tree"', 'role="treeitem"', 'aria-expanded="true"', 'aria-selected="true"', 'role="group"', "oq-tree__meta"]],
    ["CodeBlock", <CodeBlock code={"a\nb\nc"} language="ts" filename="x.ts" lineNumbers highlight={[2]} />, ["oq-codeblock--numbered", "oq-codeblock__lang", "oq-codeblock__file", 'data-highlight="true"', "oq-codeblock__copy"]],
    ["CommandPalette", <CommandPalette open={false} onClose={noop} commands={[{ id: "a", label: "Open file", group: "File", shortcut: ["Ctrl", "O"], onSelect: noop }]} />, ["oq-palette", 'role="listbox"', "oq-listbox__group", "Open file", "oq-kbd"]],
    ["Popover", <Popover title="Filter" placement="end" trigger={(p) => <button type="button" {...p}>f</button>}>body</Popover>, ["oq-popover-anchor", "oq-popover", 'data-pos="end"', "hidden", 'aria-expanded="false"']],
    ["Toolbar", <Toolbar label="Format"><button type="button">B</button><ToolbarSeparator /><ToolbarLabel>Zoom</ToolbarLabel></Toolbar>, ['role="toolbar"', 'aria-label="Format"', "oq-toolbar__sep", "oq-toolbar__label"]],
    ["Sparkline", <Sparkline data={[1, 3, 2]} area label="trend" color="success" />, ["oq-sparkline", "oq-success", "oq-sparkline__area", "oq-sparkline__line", 'aria-label="trend"']],
    ["Meter", <Meter label="Disk" value={92} unit="%" low={60} high={85} optimum={20} showScale />, ['role="meter"', "oq-danger", "--value:92%", "oq-meter__mark", "oq-meter__scale", "92 %"]],
    ["Gauge", <Gauge value={40} unit="%" label="CPU" size={120} />, ["oq-gauge", "oq-primary", "--size:120px", 'stroke-dashoffset="60"', "oq-gauge__label"]],
    ["Banner", <Banner color="warning" actions={<button type="button">x</button>} onClose={noop}>Read-only</Banner>, ["oq-banner", "oq-warning", 'role="alert"', "oq-banner__actions", 'aria-label="Dismiss"']],
    ["Callout", <Callout kind="tip">Use mod+K</Callout>, ["oq-callout", "oq-success", "oq-callout__title", ">tip<"]],
    ["TablePagination", <TablePagination page={2} count={312} rowsPerPage={20} onPageChange={noop} onRowsPerPageChange={noop} />, ["oq-table-pagination", "21–40 of 312", 'aria-label="Next page"', "oq-select"]],
  ];

  it.each(more)("%s", (_name, el, expected) => {
    const out = html(el);
    for (const s of expected) expect(out).toContain(s);
  });

  it("meterColor follows <meter> regions", () => {
    expect(UI.meterColor({ value: 50 })).toBe("primary");
    expect(UI.meterColor({ value: 20, low: 60, high: 85, optimum: 10 })).toBe("success");
    expect(UI.meterColor({ value: 70, low: 60, high: 85, optimum: 10 })).toBe("warning");
    expect(UI.meterColor({ value: 95, low: 60, high: 85, optimum: 10 })).toBe("danger");
    expect(UI.meterColor({ value: 70, low: 60, high: 85 })).toBe("success");
  });

  it("formatBytes", () => {
    expect(UI.formatBytes(512)).toBe("512 B");
    expect(UI.formatBytes(1536)).toBe("1.5 KB");
    expect(UI.formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });

  it("scoreCommand ranks prefix over substring over keyword", () => {
    const c = { label: "Open recent file", keywords: ["history"] };
    expect(UI.scoreCommand(c, "open")).toBe(4);
    expect(UI.scoreCommand(c, "rec")).toBe(3);
    expect(UI.scoreCommand(c, "cent")).toBe(2);
    expect(UI.scoreCommand(c, "hist")).toBe(1);
    expect(UI.scoreCommand(c, "zzz")).toBe(0);
  });

  it("sparklinePoints spans the box", () => {
    expect(UI.sparklinePoints([0, 10])).toEqual([[0, 31], [100, 1]]);
    expect(UI.sparklinePoints([])).toEqual([]);
  });
});
