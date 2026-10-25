# Changelog

## 0.5.0 — 2026-10-25

Pieces the OSQD dashboards need, all usable as plain HTML and CSS under a strict CSP and inside a shadow root.

- **Shadow DOM:** every theme rule now also targets `:host` and `:host([data-theme="…"])`, including `auto`, the series palette, the ramps and the hue modes. A stylesheet adopted into a shadow root themes it from the host's `data-theme`.
- **Ramps:** sequential `--oq-seq-0…12` and ordinal `--oq-ord-1…5`, mixed from each theme's surface and primary.
- **Fill classes:** `.oq-fill-series-1…8`, `.oq-fill-seq-0…12`, `.oq-fill-ord-1…5` and `.oq-stroke-series-1…8` colour SVG marks, HTML bars and the intent pair. `.oq-w-0…100` set `--value` without a style attribute.
- **Hashed-hue tags:** `.oq-hue-0…11`, readable at 4.5:1 in all seven themes, which a test checks. React: `hueIndex(text)` and `<Chip hue>`.
- **Plain-HTML data displays:** ranked bars (`.oq-bars`), 100% stacked bar (`.oq-stackbar`), funnel (`.oq-funnel`), histogram with threshold (`.oq-histogram`), percentile strip (`.oq-percentiles`) and HTML heat grid (`.oq-heatgrid`). React: `RankedBars`, `StackBar`, `Funnel`, `Histogram`, `PercentileStrip`. There is also a documented recipe for line, area and bar SVG with the existing `.oq-chart__*` classes.
- **Tables:**
  - expandable detail rows (`.oq-table__expander`, `tr.oq-table__detail`);
  - group header rows (`tr.oq-table__group`);
  - intent row accent (`tr.oq-row-accent`);
  - new `DataTable` props `renderDetail`, `expanded` / `defaultExpanded` / `onExpandedChange`, `groupBy`, `renderGroup` and `rowAccent`. Existing props are unchanged.
- **Other new pieces:**
  - skip link (`.oq-skip-link`, `SkipLink`);
  - two-click confirm (`.oq-btn[data-armed]`, `ConfirmButton`);
  - sortable list with drag, keys and move buttons (`.oq-sortable`, `SortableList`);
  - chip grid for long value lists (`.oq-chipgrid`, `ChipGrid`);
  - iframe preview at device widths (`.oq-frame`, `PreviewFrame`);
  - value flash (`.oq-flash`, `useFlash`);
  - stale data (`[data-stale="true"]`, `.oq-stale-mark`);
  - card fold and pin (`.oq-card__tools`, `CardTools`, `CardTool`);
  - evidence chips (`.oq-chip--proven`, `.oq-chip--suspected`, `<Chip evidence>`).
- **Forced colours:** a `@media (forced-colors: active)` pass over components and data marks.

## 0.4.0 — 2026-10-25

Full mobile and touch support, checked page by page with `npm run audit:mobile` (every gallery, sample, error and docs page at 320, 375, 414, 768 and 1024 px, in dark and light).

- **Touch sizes:** on touch screens controls grow to 32/40/46 px, checkboxes and radios to 24 px, switches, range thumbs, chips, tabs, menu and nav items to finger size. Small links get a taller invisible hit area. Text fields use 16 px text on phones so the browser does not zoom on focus.
- **No hover dependence:** every `:hover` rule sits behind `@media (hover: hover)`, and a test keeps it that way. Tooltips show on long-press or focus on touch. Chart tooltips, log copy buttons and JSON actions work by tap.
- **Phone layouts:**
  - Overlays: dialogs become bottom sheets; the drawer and the command palette go full screen. Toasts span the width and swipe away.
  - Pickers and lists: date pickers become a sheet with one month. Multi-select becomes a sheet.
  - Notifications: the panel becomes a full-width sheet.
  - Forms: inline fields stack, and key–value rows become cards. The wizard keeps Back and Next at the bottom of the screen.
  - Navigation: tabs, segmented controls and toolbars scroll with an edge fade, and pagination shows first, current and last.
  - Diff view: the diff falls back to unified.
- **New props:**
  - `Table` / `DataTable` `responsive="stack"`: rows become label–value cards on phones.
  - `SplitPane` `stackBelow` (default 640).
  - `ContextMenu` `longPress` (default 500 ms).
  - `CollapsibleShell` `swipeToClose`.
  - `ShortcutsOverlay` `touchNote`.
- **Viewport-aware floating panels:** `useFitInViewport` (React) and the same logic in `oq-dropdown` / `oq-combobox` flip a panel to the side with room and shift it back on screen.
- **Grids:** `.oq-grid` columns can shrink below `--min` on narrow screens. `.oq-span-2` / `.oq-span-all` replace inline spans.
- **Fixed:**
  - `.oq-sr-only` tables widened their container.
  - The pop-in animation replaced the centring transform of popovers and tooltips.
  - Closed dropdown menus could take layout space.
  - The base touch sizes for checkboxes lost to `components.css`.
  - In the admin sample, saving an edit asked to discard changes.
- **Galleries and docs:** the gallery app bar and the docs site collapse into a menu on phones. The docs navigation becomes a drawer, and prop tables become cards. All eight sample sites have phone layouts: a swipeable ticket board with "Move to…", a log event sheet, admin cards, a docs drawer and a full-screen login.

## 0.3.0 — 2026-10-25

- **Charts:** `BarChart` (grouped, stacked, horizontal), `LineChart`, `AreaChart`, `DonutChart`, `Heatmap`, plain SVG with tooltips, legends that toggle series, and an accessible data table. Series colours are a separate palette, `--oq-series-1…8`, checked for colour-vision separation on every theme.
- **Dates:** `Calendar`, `DatePicker`, `DateRangePicker` with presets and keyboard navigation.
- **Data:** `VirtualTable`, `LogViewer`, `JsonInspector`, `DiffView`, with helpers `diffLines`, `toCsv`, `jsonPath`.
- **Forms:** `useForm`, `Form`, `ErrorSummary`, `SaveBar`, `validators`, `MultiSelect`, `ColorInput`, `PasswordInput`, `OtpInput`, `CronInput`, `KeyValueEditor`, `IpInput`, `CidrInput`, `QueryBuilder` (outputs JQL), `Wizard`, `ConfirmProvider` / `useConfirm`.
- **Layout and feedback:** `SplitPane`, `CollapsibleShell`, `PageHeader`, `DetailLayout`, `ContextMenu`, shortcuts registry and overlay, `NotificationCenter`, skeleton presets, `ErrorPage` and static `pages/404.html`, `500.html`, `403.html`, `offline.html`.
- **Density:** `data-density="compact|comfortable"` and `DensityProvider`.
- **Web Components:** 13 `oq-*` elements in `@osqd/ui/elements` and the standalone `assets/osqd-ui-elements.js`.
- **Theme builder:** `theme-builder.html`.
- **Docs site:** `docs/site/`, generated from the source by `npm run docs`.
- **Samples:** `logs.html`, `admin.html`, `login.html`, `docs-page.html` and an index; the existing three use the new components. All are generated from `examples/src/`.
- **Galleries:** one gallery page per area, with the same app bar and theme picker on each.
- **Fixed:** `ErrorSummary` and `SaveBar` rejected a typed `useForm` result. They now take `FormStatus`, a narrower shape any form fits. `tests/types/` holds a compile check for this.
- **Fixed:** in the data gallery's log viewer, the current search match could jump once the buffer began trimming old lines.
- `npm run check` now also checks the elements bundle, the docs site and the sample pages are in sync.

## 0.2.0 — 2026-10-25

New components, each as CSS classes, a React component and a section in `preview.html`:

- **Inputs:** `NumberInput` (`.oq-number`: a spin button with −/+, arrow keys and Shift for ten steps, clamped to min/max and rounded to the step), `TagInput` (`.oq-tags`), `Combobox` (`.oq-combobox`, `.oq-listbox`, `.oq-option`: a filtered listbox with keyboard navigation and highlighted matches), `DropZone` with `FileList`/`FileItem` (`.oq-dropzone`, `.oq-filelist`, `.oq-file`), and styling for native date and time inputs (`.oq-daterange`).
- **Data:** `TreeView` (`.oq-tree`, the WAI-ARIA tree keyboard pattern), `Timeline` (`.oq-timeline`), `CodeBlock` (`.oq-codeblock`: copy button, line numbers, highlighted lines, opt-in `tk-*` token colours), `Meter` and `Gauge` (`.oq-meter`, `.oq-gauge`, coloured from `low` / `high` / `optimum` as on `<meter>`), `Sparkline` (`.oq-sparkline`), and `TablePagination` (`.oq-table-pagination`).
- **Navigation:** `Stepper` (`.oq-stepper`, horizontal and vertical; done, current, upcoming and error states), `Toolbar` (`.oq-toolbar`, one tab stop with arrow keys between buttons).
- **Overlays:** `Popover` (`.oq-popover`, top/bottom/start/end with an arrow), `CommandPalette` (`.oq-palette`) and the `useHotkey` hook.
- **Feedback:** `Banner` (`.oq-banner`) and `Callout` (`.oq-callout`: note, tip, important, caution).
- **Themes:** five variants next to dark and light: `graphite`, `midnight`, `contrast`, `paper`, `slate`. They are exported in `themes`, accepted by `ThemeProvider`, and the preview has a theme picker and a section comparing all seven.
- **Contrast tests** for every theme. They found that faint text in the dark theme was 4.0:1 on raised panels (table headers). It is now `#a19fa1` (4.7:1).
- **Fixed:** a small select (`.oq-select.oq-sm`) lost the right padding that keeps its arrow clear of the value.

## 0.1.0 — 2026-10-25

First version.

- Theme in `src/theme/index.ts`: dark and light, `createTheme()` that rejects unknown
  tokens, `themeToCss()` / `themeVars()` / `themeStyle()`.
- `styles/tokens.css` generated from the theme (`npm run tokens`, checked by `npm run tokens:check`).
- Plain CSS components (`styles/base.css`, `styles/components.css`), usable with no build step.
- React components on top of the same classes.
- `preview.html` showing every component in both themes.
