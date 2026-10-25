# @osqd/ui

A utilitarian UI kit for the OSQD projects. It is dense, readable and made for tools: dashboards, admin panels, log explorers and operator consoles.

- **Seven themes** (dark, light, graphite, midnight, contrast, paper, slate), all held to the same contrast rules by tests, plus a theme builder for your own.
- **Three layers on one theme**, sharing one set of `oq-` class names:
  - plain CSS that works in any HTML page with no build step;
  - Web Components (`<oq-dialog>`, `<oq-tabs>`, …) in one script, for interactive pages without React;
  - React components, about 130 of them, from buttons to virtual tables, charts and forms.
- **Assets:** 627 icons in 14 categories (single SVGs, a sprite and a React component) and 61 illustrations for empty, error, security, account, data, onboarding and activity states.

Everything below opens straight from disk, or run `npm run preview` and go to http://localhost:11240/.

| Page | What it shows |
|---|---|
| `preview.html` | The core components, all seven themes side by side |
| `preview-charts.html` | Bar, line, area, donut and heatmap charts; date and range pickers |
| `preview-data.html` | Virtual table (100k rows), log viewer, JSON inspector, diff view |
| `preview-forms.html` | Form system, validators, inputs (multi-select, OTP, cron, CIDR …), query builder, wizard, confirm |
| `preview-layout.html` | Split panes, collapsible sidebar, page header, context menu, shortcuts, notifications, skeletons, density |
| `elements.html` | Every Web Component with copyable markup |
| `icons.html` | Icon and illustration gallery |
| `fonts.html` | The OSQD typefaces: families, weights, sizes, the full character set |
| `theme-builder.html` | Make a theme: live preview, contrast checks, export as TypeScript, CSS or JSON |
| `docs/site/index.html` | Generated reference: one page per component with props, live example and code |
| `examples/index.html` | Sample sites |
| `pages/404.html` … | Ready error pages (404, 500, 403, offline) |

## Sample sites

Seven complete sites in `examples/`, built from the CSS layer, the Web Components script and a little page JavaScript:

- `dashboard.html`: operations dashboard (rail sidebar, charts, range picker, notifications, node table, command palette).
- `settings.html`: settings with validation, CIDR/IP fields, a key–value editor, tag input, API keys, save bar and typed delete.
- `tickets.html`: issue board with drag and drop, query-builder filters, context menus, detail drawer and shortcuts (`?`).
- `logs.html`: log explorer with a query bar, time range, histogram, live tail and a JSON panel for the selected event.
- `admin.html`: a full list → detail → edit flow with bulk actions, tabs, activity timeline and unsaved-changes guard.
- `login.html`: sign-in, a 2FA code step and password reset.
- `docs-page.html`: a documentation page with tree navigation, callouts, code blocks, an "on this page" outline and Ctrl+K search.

The pages are generated from `examples/src/` by `npm run samples`; edit the sources, not the pages.

## Plain CSS

```html
<link rel="stylesheet" href="node_modules/@osqd/ui/dist/osqd-ui.css">

<body class="oq" data-theme="dark">          <!-- any built-in theme, or auto -->
  <button class="oq-btn">Save</button>
  <button class="oq-btn oq-btn--outline oq-neutral">Cancel</button>
  <span class="oq-chip oq-success">healthy</span>
</body>
```

The class system:

- **Scope.** `.oq` sets the font, the colours and the box-sizing for everything inside it.
- **Intent.** `.oq-primary | secondary | success | warning | danger | info | neutral` works on any component or on an ancestor. It sets `--oq-c` and `--oq-on-c`, and the components read those.
- **Variant.** Variants are modifiers on the component, for example `.oq-btn--outline | --soft | --ghost` or `.oq-chip--solid`.
- **Size.** `.oq-sm` and `.oq-lg`.
- **State.** States use ARIA attributes where one exists: `aria-selected`, `aria-pressed`, `aria-current`, `aria-sort`, `aria-busy`, `aria-invalid`.

The components are:

- **Inputs:** button, button group, segmented control, field, input, input group, select, textarea, checkbox, radio, switch, range, number input (`oq-number`), tag input (`oq-tags`), combobox (`oq-combobox` + `oq-listbox`), drop zone and file list (`oq-dropzone`, `oq-filelist`), date and time inputs (`oq-daterange`).
- **Surfaces:** card, paper, stat tile.
- **Status:** chip, badge, dot/status, alert, banner (`oq-banner`), callout (`oq-callout`).
- **Data:** table (dense, striped, hover, bordered, sortable, selectable) with a pagination footer (`oq-table-pagination`), list, description list, tree view (`oq-tree`), timeline (`oq-timeline`), code block (`oq-codeblock`), meter and gauge (`oq-meter`, `oq-gauge`), sparkline (`oq-sparkline`).
- **Navigation:** tabs, app bar, shell, sidebar, nav, breadcrumbs, pagination, stepper (`oq-stepper`), toolbar (`oq-toolbar`).
- **Overlays:** dialog and drawer (native `<dialog>`), menu and dropdown, tooltip (`data-tip`), toast, popover (`oq-popover`), command palette (`oq-palette`).
- **Feedback:** progress, spinner, skeleton.
- **Other:** avatar, divider, accordion, empty state.
- **Typography:** `oq-h1`–`oq-h5`, `oq-muted`, `oq-overline`, `oq-mono`, `oq-kbd`, `oq-pre`.
- **Layout:** `oq-stack`, `oq-row`, `oq-grid` (`--min`), `oq-gap-*`.
- **Dashboard data (plain HTML, no React needed):** ranked bars (`oq-bars`), 100% stacked bar (`oq-stackbar`), funnel (`oq-funnel`), histogram with a threshold (`oq-histogram`), percentile strip (`oq-percentiles`), HTML heat grid (`oq-heatgrid`, `oq-heatcell`), and a recipe for drawing line, area and bar SVG with `oq-chart__*` classes (see `preview-charts.html`).
- **Colour classes:** `oq-fill-series-1…8`, `oq-fill-seq-0…12` (sequential ramp `--oq-seq-*`), `oq-fill-ord-1…5` (ordinal ramp `--oq-ord-*`), `oq-stroke-series-1…8`, and `oq-w-0…100` (steps of 5) to set `--value` — so bars, cells and markers need no `style` attribute.
- **Table extras:** expandable detail rows (`oq-table__expander` + `tr.oq-table__detail`), group header rows (`tr.oq-table__group`), row accent by intent (`tr.oq-row-accent`).
- **Dashboard pieces:** hashed-hue tags (`oq-hue-0…11`), proven / suspected chips (`oq-chip--proven`, `oq-chip--suspected`), skip link (`oq-skip-link`), two-click confirm (`.oq-btn[data-armed="true"]`), sortable list (`oq-sortable`), chip grid for long lists (`oq-chipgrid`), iframe preview (`oq-frame`), value flash (`oq-flash`), stale data (`[data-stale="true"]`, `oq-stale-mark`), card fold and pin tools (`oq-card__tools`, `data-folded`, `data-pinned`).

**Strict CSP and shadow DOM.** Every component can be written without a `style` attribute (variants are classes or `data-*`; geometry is `--value`, set by a class or from script with `el.style.setProperty`). The tokens are declared on `:root` and on `:host` (with `:host([data-theme=…])` for each theme), so the same stylesheet, adopted into a shadow root, themes it from the host element's `data-theme`. A forced-colours pass keeps focus rings, selection and data marks visible in Windows high-contrast mode.

## React

```tsx
import "@osqd/ui/css";
import { ThemeProvider, ToastProvider, Button, TextField, DataTable, useToast } from "@osqd/ui";

function App() {
  return (
    <ThemeProvider theme="dark" fullPage>
      <ToastProvider>
        <Nodes />
      </ToastProvider>
    </ThemeProvider>
  );
}

function Nodes() {
  const toast = useToast();
  return (
    <>
      <TextField label="Timeout" suffix="ms" defaultValue="2500" help="Per request." />
      <Button color="primary" onClick={() => toast.show({ title: "Saved", color: "success" })}>Save</Button>
      <DataTable
        rows={nodes}
        rowKey={(n) => n.id}
        columns={[
          { key: "name", header: "Node", sortable: true },
          { key: "rps", header: "Req/s", align: "right", sortable: true },
        ]}
      />
    </>
  );
}
```

Every component takes the native props of its element, plus `className` and a `ref` where one makes sense. Most also take `color`, `variant` and `size`.

The exported components are:

- **Buttons:** `Button`, `IconButton`, `ButtonGroup`, `Segmented`.
- **Form fields:** `TextField`, `Select`, `Checkbox`, `Radio`, `RadioGroup`, `Switch`, `Slider`, `NumberInput`, `TagInput`, `Combobox`, `DropZone`, `FileList`, `FileItem`.
- **Surfaces:** `Card` (with `CardHeader`, `CardBody`, `CardFooter`), `Paper`, `Stat`, `EmptyState`, `Accordion`, `AccordionItem`.
- **Status:** `Chip`, `Badge`, `Dot`, `StatusDot`, `Alert`, `Banner`, `Callout`, `Avatar`, `AvatarGroup`.
- **Data:** `Table`, `DataTable`, `TablePagination`, `List`, `ListItem`, `DescriptionList`, `TreeView`, `Timeline`, `CodeBlock`, `Meter`, `Gauge`, `Sparkline`.
- **Navigation:** `Tabs`, `AppBar`, `Shell`, `Sidebar`, `Nav`, `NavSection`, `NavItem`, `Breadcrumbs`, `Pagination`, `Stepper`, `Toolbar`, `ToolbarSeparator`, `ToolbarLabel`.
- **Overlays:** `Dialog` (with a `drawer` option), `Dropdown`, `Menu`, `MenuItem`, `MenuSeparator`, `MenuLabel`, `Tooltip`, `Popover`, `CommandPalette` (with the `useHotkey` hook, e.g. `useHotkey("mod+k", open)`).
- **Feedback:** `Progress`, `Spinner`, `Skeleton`, `ToastProvider` and `useToast`.
- **Typography:** `Typography`, `Kbd`, `Code`, `Divider`.
- **Layout:** `Stack`, `Row`, `Grid`.
- **Charts and dates:** `BarChart`, `LineChart`, `AreaChart`, `DonutChart`, `Heatmap`, `Calendar`, `DatePicker`, `DateRangePicker`. Series use their own 8-colour palette (`--oq-series-1…8`), kept apart from the state colours.
- **Big data:** `VirtualTable` (100k+ rows, resize, hide, inline edit, CSV), `LogViewer`, `JsonInspector`, `DiffView`.
- **Forms:** `useForm`, `Form`, `ErrorSummary`, `SaveBar`, `validators` (used as `validators.port()`, `validators.cidr()` …), `MultiSelect`, `ColorInput`, `PasswordInput`, `OtpInput`, `CronInput`, `KeyValueEditor`, `IpInput`, `CidrInput`, `QueryBuilder` (text ⇄ chips ⇄ a JQL query via `toJql`), `Wizard`, `ConfirmProvider` + `useConfirm()`.
- **Page layout:** `SplitPane`, `CollapsibleShell` (rail and phone drawer), `PageHeader`, `DetailLayout`, `ContextMenu`, `ShortcutsProvider` + `ShortcutsOverlay`, `NotificationCenter`, `SkeletonTable` / `Card` / `List` / `Text`, `ErrorPage`, `DensityProvider`.
- **Dashboard data:** `RankedBars`, `StackBar`, `Funnel`, `Histogram`, `PercentileStrip`; `DataTable` takes `renderDetail` (expandable rows), `groupBy` / `renderGroup` (group header rows) and `rowAccent`.
- **Dashboard pieces:** `ConfirmButton` (two clicks instead of a dialog), `SortableList`, `ChipGrid`, `PreviewFrame`, `CardTools` / `CardTool`, `SkipLink`, `Chip` with `hue` and `evidence`, `hueIndex(text)`, `useFlash(value)`.
- **Helpers:** `formatBytes`, `meterColor` (the intent a value earns from `low` / `high` / `optimum`, as on `<meter>`), `sparklinePoints`, `scoreCommand`.
- **Icons:** `Icon` (all 627) and `Illustration` (all 61), plus `iconCategories` / `illustrationCategories` to group them.

The full reference, with props tables and examples for each, is generated into `docs/site/` (`npm run docs`).

## Icons and illustrations

There are 627 stroke icons on a 24 × 24 grid in 14 categories, plus 61 spot illustrations. To browse them, open `icons.html`. You can filter by category, search, switch the icon size, and click an icon to copy its snippet.

- **Icon categories:** navigation, actions, status and time, security (bots, shields, keys, threats, network identities), people and messages, files and data (charts included), development, infrastructure, layout and text, devices and media, commerce and places, weather and appearance. `iconCategories` maps each name to its category, and `iconCategoryLabels` gives the display names.
- **Illustrations**, by category:
  - empty states: `empty-inbox`, `no-results`, `start-search`, `no-data`, `no-notifications`, `no-logs`, `all-clear`;
  - errors and limits: `error-404`, `server-error`, `offline`, `connection-lost`, `timeout`, `rate-limited`, `maintenance`, `coming-soon`;
  - security: `locked`, `access-denied`, `bot-blocked`, `honeypot`, `two-factor`, `api-keys`;
  - onboarding: `welcome`, `setup-complete`, `launch`, `success`;
  - activity: `upload`, `data-import`, `syncing`.

```html
<!-- Plain HTML: the sprite, one <use> per icon -->
<svg class="oq-icon"><use href="node_modules/@osqd/ui/assets/icons.svg#oq-i-search"/></svg>
<img src="node_modules/@osqd/ui/assets/icons/search.svg" alt="">
```

```tsx
import { Icon, Illustration, iconSvg } from "@osqd/ui";

<Icon name="database" />                       // 16 px, takes the text colour
<Icon name="warning" size={20} color="warning" title="Degraded" />
<Illustration name="no-results" width={200} />
iconSvg("search", { size: 24 })                 // the same icon as an <svg> string
```

- **Sizes.** `.oq-icon` is 16 px by default. `.oq-sm` makes it 14 px, `.oq-lg` makes it 20 px, and `.oq-icon--em` matches the font size.
- **Colour.** To colour an icon by intent, add `.oq-text-c` plus an intent class, for example `.oq-text-c .oq-danger`.
- **Illustrations follow the theme** when they are inlined. As an `<img>` they use the dark-theme colours.
- **Sources.** The icons live in `src/icons/index.ts` and the illustrations in `src/illustrations/index.ts`. `npm run icons` regenerates `assets/` and the inline copy in `icons.html`, and `npm run check` fails if they are out of date.

## Fonts

The kit ships its own typefaces, drawn for it and licensed under the SIL Open Font License 1.1 (`assets/fonts/OFL.txt`): three families, each a sans with a monospaced companion, in eight weights (ExtraLight 200 to Black 900), every one with an italic.

| Family | Character |
|---|---|
| OSQD Sans · OSQD Mono · OSQD Sans Condensed | Neutral and dense; the default |
| OSQD Tech · OSQD Tech Mono · OSQD Tech Condensed | Squared curves and level cuts |
| OSQD Clear · OSQD Clear Mono | Open shapes; I l 1 \| and O 0 always distinct |

- **Weights.** 200–900. ExtraLight is for 24 px and up (it reads at 14 px, but thinly); Black is for headings and figures that must carry. Past Bold the monos' stems grow at half the pace, so m, w and the three-stem Cyrillic letters keep open counters in their fixed cells.
- **Condensed.** Sans and Tech also come Condensed (about 83 % of the width, upright and italic, every weight), for dense tables and panels: `.oq-condensed` sets a subtree in the current family's condensed cut (Clear uses Sans Condensed), and `data-font="condensed"` or `"tech-condensed"` makes it the subtree's sans. The role is `--oq-font-condensed`.
- **Optical sizes.** Each sans has a **Caption** cut for 12 px and below (Regular to Bold) and a **Display** cut for 32 px and up (every weight); neither has an italic, where the Text italic stands in. The kit uses them by itself: chips, badges, overlines, help text, table headers and stat labels are set in Caption, `.oq-h1` / `.oq-h2` in Display. The roles are `--oq-font-sans`, `--oq-font-mono`, `--oq-font-caption`, `--oq-font-display` and `--oq-font-condensed`.
- **OpenType features.** Figures are tabular by default (UI first). The fonts carry `pnum` (proportional figures), `tnum`, `zero` (slashed zero), `ss01` (Clear's serifed I, tailed l and footed 1 in Sans and Tech), `case` (dashes, brackets, guillemets and colons raised for capitals), `sups`, `subs`, `numr`, `dnom` and `frac` (1/2 → ½ by context). The kit's classes switch them: `.oq-pnum`, `.oq-zero`, `.oq-frac`, `.oq-sups`, `.oq-subs`, `.oq-ss01`, `.oq-case` (on by default on `.oq-overline`); `.oq-num`, `code` and table cells stay tabular.
- **Italics** are the upright drawings, narrowed a little and slanted 9°, with stems thickened to make up for the slant. Shapes stay the upright ones on purpose: a double-storey a and the upright Cyrillic forms read better in a UI than cursive forms.
- **Languages.** Latin for the Western, Central and Eastern European languages, Turkish, Vietnamese, African Latin and IPA; Cyrillic (with the extended letters), Greek, Armenian, Georgian and Hebrew; and a symbols set (box drawing, blocks, shapes, arrows, technical and maths signs, super- and subscripts), as the glyph modules in `type/scripts/` cover them. `fonts.html` shows each language and anything not yet drawn.
- **Subsets.** `styles/fonts.css` serves every face as unicode-range subsets (`assets/fonts/subsets/<face>.<latin|latin-ext|vietnamese|cyrillic|greek|armenian|georgian|hebrew|symbols>.woff2`), so a page downloads only the scripts it shows — an English page about 13 KB per face. The Text cuts carry every subset; Condensed carries the European scripts, Display and Caption Latin and Vietnamese, the monos everything but Armenian, Georgian and Hebrew — every role's font stack falls back to the Text cut for the rest. The complete font of every face, `assets/fonts/<face>.woff2`, is in the repository for offline and desktop use, not in the npm package.

`styles/index.css` (and `dist/osqd-ui.css`) declares them; `data-font="tech"`, `"clear"`, `"sans"`, `"condensed"`, `"tech-condensed"` or `"system"` on any element switches every role for that subtree. The stacks end in `system-ui` and `ui-monospace`, so a page that does not load the font files still renders. A page with a strict Content Security Policy needs `font-src 'self'` for the files, or keeps the system fallback. The specimen is `fonts.html`; the fonts are built from `type/` by `npm run fonts` (in parallel worker threads; `OSQD_FONT_WORKERS` caps them, `OSQD_FONT_MODULES=latin,cyrillic` builds with only those glyph modules).

## Web Components

```html
<link rel="stylesheet" href="node_modules/@osqd/ui/dist/osqd-ui.css">
<script src="node_modules/@osqd/ui/assets/osqd-ui-elements.js"></script>

<button class="oq-btn" data-oq-open="confirm">Delete…</button>
<oq-dialog id="confirm"> … </oq-dialog>
<button class="oq-btn" data-oq-toast-title="Saved" data-oq-toast-color="success">Save</button>
```

The elements enhance the same markup as the CSS layer (no shadow DOM, so the kit's styles apply), and report changes as `oq-*` events. There are 13: dialog, tabs, dropdown, toast region (`OQ.toast({...})` from script), combobox, tree, command palette, sortable table, copy, theme select, number, tag input and drop zone. With a bundler, import `@osqd/ui/elements` and call `defineAll()`, or import `@osqd/ui/elements/auto`.

## Mobile and touch

Every component works on phones, tablets and touch screens. That covers finger-sized targets on touch, no hover-only behaviour, 16 px text fields on phones, and overlays that become bottom sheets. `npm run audit:mobile` loads every page at 320–1024 px and reports sideways overflow, clipped elements, tap targets under 24 px, zoom-on-focus inputs and console errors. Use `--only <page>`, `--theme <name>`, `--shots <dir>` and `--docs all` to narrow it down or widen it.

## Density

`data-density="compact"` or `"comfortable"` on any element changes control heights, paddings and text size inside it. In React: `<DensityProvider density="compact">`.

## Theming

Seven built-in themes, each a `[data-theme="<name>"]` rule in `styles/tokens.css`:

| Name | Mode | Character |
|---|---|---|
| `dark` | dark | Warm greys, the default |
| `light` | light | White on soft grey |
| `graphite` | dark | Cool neutral greys, blue lead |
| `midnight` | dark | Deep navy for dark rooms |
| `contrast` | dark | Black and white, strong borders, yellow focus ring |
| `paper` | light | Warm off-white for reading-heavy pages |
| `slate` | light | Cool light greys, blue lead |

`auto` picks dark or light from the operating system. `data-theme` works on any element, so one part of a page can use a different theme from the rest. In React: `<ThemeProvider theme="midnight">`. The objects are exported as `themes` from `@osqd/ui/theme`.

Every theme passes the same contrast rules, enforced by `tests/theme.test.ts`: body text at 7:1 or better, muted and faint text at 4.5:1 on every layer, and each intent colour at 4.5:1 against its text colour and against the page.


```ts
import { createTheme, lightTheme, themeToCss } from "@osqd/ui/theme";

const brand = createTheme({ name: "brand", palette: { primary: "#ab9df2" }, font: { size: 13 } });
// React:   <ThemeProvider theme={brand}>
// CSS:     themeToCss(brand) → '[data-theme="brand"] { --oq-primary: … }'
const lightBrand = createTheme({ name: "light-brand", palette: { primary: "#5e49c2" } }, lightTheme);
```

`createTheme` throws on a key it does not know. A misspelt token that silently did nothing would look configured when it is not.

All of the colours, sizes and fonts live in `src/theme/index.ts`. The `styles/tokens.css` file is generated from it, so do not edit that file by hand:

- `npm run tokens` regenerates it;
- `npm run check` fails if it is out of date.

To make your own, open `theme-builder.html`: start from any built-in theme, change colours, watch the contrast checks, and export the result.

## Releases

Every push to `main` can publish to npm. `.github/workflows/publish.yml` re-runs every check, works out the version from the commit messages since the last `v*` tag (`scripts/next-version.mjs`), publishes with provenance, then commits the version and tags it:

| Commit | Release |
|---|---|
| `feat:` / `fix:` / `perf:` | patch |
| `!` after the type, or a `BREAKING CHANGE:` footer | minor while the major is 0, then major |
| `docs:` / `ci:` / `test:` / `chore:` / `refactor:` … | nothing |
| `Release-As: 1.0.0` or `Release-As: minor` footer | exactly that |

Until the first tag exists, the first release is the version already in `package.json`. A run started by hand (`workflow_dispatch`) is a dry run by default.

## Development

```
npm install            # .npmrc sets legacy-peer-deps (the system npm 9 needs it)
npm run check          # tokens in sync, typecheck, lint, tests
npm run build          # dist/: ESM + CJS + declarations + osqd-ui.css
```
