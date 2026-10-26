# Changelog

## 0.7.2 — 2026-10-26

- **Fixed:** every font's OS/2 table is version 4, so USE_TYPO_METRICS (set since the first
  release) is honoured. opentype.js wrote version 3, where that bit is undefined, and a renderer
  could take the line height from the Windows metrics instead.
- TrueType autohinting was tried and measured, and is not shipped: on Linux, Chromium and Firefox
  ignore the horizontal hints, and the rounded advances made spacing worse.

## 0.7.1 — 2026-10-26

- **Fixed: the OSQD fonts rendered ragged at text sizes.** Two causes, both in how outlines were written:
  - *Overlapping contours.* The drawings overlap by design (a stem runs into its bowl), and 1,006 of the 1,370 glyphs in a face shipped that way. A rasteriser fills overlaps correctly but anti-aliases them badly: where two contours meet, both add coverage to the same edge pixels, so joins came out as dark notches — the crossbar of G, the crossing of &, the stroke through $. Outlines are now unioned (Skia's path operations, exact on curves) before they are written.
  - *Rounding drift.* opentype.js writes each CFF curve as three relative steps, rounds each from the unrounded previous point and then assumes the pen landed on the rounded end, so every curve could leave it up to 1.5 units off and the error walked along the contour: in 0.7.0's Sans Regular 3,031 points sat more than 2 units from where they were drawn (18 on a brace), and 84 curves in the Latin subset ended beside their own start, so the closing line drew a spike. Every coordinate is now a whole unit before it is written, which makes each step exact.
- Outlines are counter-clockwise with clockwise counters, the zero-area anchor contours box drawing used for placement are no longer written, and every font carries a `gasp` table (smoothing at every size, no grid-fitting).
- The fonts grow about 12 % (the union splits curves where contours crossed): 8.6 MB of subsets in the package, about the same per page.
- New tests in `tests/fonts.test.ts` keep the outlines clean: no curve ending beside its start, no sliver contours, no overlaps or filled counters, consistent directions, `gasp` everywhere.

## 0.7.0 — 2026-10-25

- **Fonts: weights, italics and optical sizes.** Every family now runs from ExtraLight (200) to Black (900), with an italic for every weight. The italics are the upright drawings narrowed 2.5 % and slanted 9°, with stems thickened by 1/cos 9°. Each sans has a Caption cut for 12 px and below (Regular to Bold) and a Display cut for 32 px and up (all weights, upright only — the Text italic stands in), as "OSQD Sans Caption", "OSQD Sans Display" and so on. The kit sets its small text in Caption and `.oq-h1`/`.oq-h2` in Display through the new `--oq-font-caption` and `--oq-font-display` variables, which `data-font` switches with the others. 164 faces in all.
- **Fonts: Condensed.** OSQD Sans Condensed and OSQD Tech Condensed (about 83 % width, every weight, upright and italic) for dense tables: `.oq-condensed`, `data-font="condensed"` / `"tech-condensed"` and `--oq-font-condensed`.
- **Fonts: OpenType features.** `pnum`, `tnum`, `zero`, `ss01`, `case`, `sups`, `subs`, `numr`, `dnom` and `frac` as GSUB lookups (frac by chained context), carried into every subset file with the characters they belong to; utilities `.oq-pnum`, `.oq-zero`, `.oq-frac`, `.oq-sups`, `.oq-subs`, `.oq-ss01`, `.oq-case` (automatic on `.oq-overline`). Figures stay tabular by default.
- **Fonts: more scripts.** Armenian, Georgian and Hebrew, the extended Cyrillic and African Latin letters, IPA, and a symbols set (box drawing, blocks, shapes, arrows, technical and maths signs, super- and subscripts), each in its own subset file.
- **Fonts: subsets.** `styles/fonts.css` serves each face as unicode-range subsets (latin, latin-ext, vietnamese, cyrillic, greek, armenian, georgian, hebrew, symbols) from `assets/fonts/subsets/`, so a page downloads only the scripts it shows; the cuts beyond Text ship only the subsets they are for and fall back to Text for the rest, which keeps the npm package under 8 MB. The complete fonts keep their paths, `assets/fonts/<face>.woff2`, in the repository (not in the package). Kerning now also applies to accented letters through their base letter. The build runs on worker threads.
- **Fonts: fixes.** Monospaced slab serifs (i, j, l, r and Clear's I) no longer lengthen past Bold, which made the heavy monos run into their neighbours. Italic faces carry a real `post.italicAngle` and `head.macStyle`. Past Bold the t and f curls are drawn lighter than the stem (with a fillet into it) so they do not close into solid feet, the monos' stems grow at half the pace so their three-stem letters keep open counters, and Vietnamese stacked marks stay two marks at Black. A near-flat stroke is cut square instead of level (a level cut grows without limit as the stroke flattens).

## 0.6.0 — 2026-10-25

- **Icons:** 128 → 627, all drawn for the kit in the same 24 × 24, 1.75-stroke style.
  - New areas: security and bot defence (bot, honeypot, trap, fingerprint, firewall, WAF, shield variants, captcha, rate limit, threat level, IP address, CIDR, onion, proxy, VPN); infrastructure (container, cluster, load balancer, router, network switch, rack, GPU, memory, cloud upload/download); data and development (chart area/scatter/funnel/histogram, heat map, flow, trace, logs, diff, braces, function, regex, git merge/pull request/fork, webhook, API, pipeline, queue).
  - More everyday icons: arrows and corners, clipboard and copy-check, sort and filter variants, toggles, alarm, stopwatch, hourglass, text formatting, layout panes, media and devices, batteries, commerce, transport and weather.
  - Second round (+305): arrow and chevron variants, square/circle/octagon status marks, seals (`badge-*`), calendar and clock variants, file and folder variants, database and table operations, cloud and server states, signal levels, security extras (vault, scan variants, crawler, cookie), people and messages (id-card, handshake, phone, mail and message variants), devices and media controls, commerce (landmark, coins, ticket, trophy), weather and nature.
  - Two new categories, **Text editing** (alignment, headings, quote, sub/superscript, highlighter, eraser…) and **Shapes & math** (basic shapes, sigma, infinity, pi, calculator…).
  - Grouped into 14 categories: `iconCategories`, `iconCategoryNames` and `iconCategoryLabels` are exported, and `icons.html` filters by category.
- **Illustrations:** 8 → 61, in seven categories (empty states, errors and limits, security, account, data & reports, onboarding, activity). New: `start-search`, `no-notifications`, `no-logs`, `all-clear`, `connection-lost`, `timeout`, `rate-limited`, `maintenance`, `coming-soon`, `access-denied`, `bot-blocked`, `honeypot`, `two-factor`, `api-keys`, `welcome`, `setup-complete`, `launch`, `upload`, `data-import`, `syncing`. `illustrationCategories` and `illustrationCategoryLabels` are exported, and the gallery groups them. Round two: `empty-folder`, `empty-table`, `empty-cart`, `trash-empty`, `no-location`, `archive-empty`, `audit-log-empty`, `unsupported-browser`, `quota-exceeded`, `payment-failed`, `session-expired`, `verify-email`, `email-sent`, `password-reset`, `account-locked`, `no-team`, `invite-sent`, `privacy`, `export-ready`, `report-ready`, `backup-complete`, `restore-data`, `migration`, `new-feature`, `update-available`, `feedback-thanks`, `contact-support`, `integration-connected`, `scheduled`, `queue-waiting`, `processing`, `incident-resolved`, `alert-firing`.

- **Fonts:** three original type families drawn for the kit, each a sans and a monospaced companion in Regular, Medium, SemiBold and Bold (24 WOFF2 files, about 6.5 KB each, SIL Open Font License 1.1).
  - **OSQD Sans / OSQD Mono** — neutral and dense; the new default (`--oq-font-sans`, `--oq-font-mono`).
  - **OSQD Tech / OSQD Tech Mono** — squared curves and level cuts, engineered.
  - **OSQD Clear / OSQD Clear Mono** — open shapes, serifed I, tailed l, footed 1, dotted (sans) or slashed (mono) zero, so I l 1 | and O 0 never meet.
  - Latin with Polish, tabular figures in every sans, kerning in the proportional faces, one 600-unit advance in the monos.
  - `data-font="tech|clear|sans|system"` switches any subtree; `fonts.html` is the specimen. The default stacks fall back to `system-ui` and `ui-monospace`, so a page without the font files — or a CSP that refuses them — keeps working.
  - Built from parameters in `type/` (`npm run fonts`, checked by `npm run fonts:check`); `styles/fonts.css` is generated with them.
- **Galleries:** every gallery's app bar links the new Fonts page, and its version chip follows the CHANGELOG (a test holds them to it).

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
