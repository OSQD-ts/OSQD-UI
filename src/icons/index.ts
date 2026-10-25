/**
 * The icon set: 24×24, stroke-only, 1.75 stroke width, round caps and joins. Every icon is the
 * inner markup of an <svg>; the root element carries fill/stroke, so an icon takes the colour of
 * the text around it.
 *
 * `scripts/icons.mjs` generates assets/icons/*.svg, the sprite assets/icons.svg and
 * assets/icons.json from this file. Like the theme, it has no runtime imports so the script can
 * load it as one transformed file.
 *
 * Drawing rules: keep 2 px of padding inside the 24 grid, line up on whole or half pixels,
 * use `dot()` for single points so they match the stroke weight.
 */

const p = (d: string) => `<path d="${d}"/>`;
const c = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const l = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const r = (x: number, y: number, w: number, h: number, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ""}/>`;
const pl = (points: string) => `<polyline points="${points}"/>`;
const pg = (points: string) => `<polygon points="${points}"/>`;
const e = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
/** A filled point, the size of a stroke end. */
const dot = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="0.6" fill="currentColor"/>`;

const search = c(11, 11, 6.5) + l(16, 16, 20, 20);
const circle = c(12, 12, 9);
const bell = p("M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z") + p("M10 20.5a2 2 0 0 0 4 0");
const shield = p("M12 3 19.5 6v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z");
const file = p("M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z") + p("M14 3v5h5");
const lockBody = r(5, 11, 14, 9.5, 2);
const wifiArcs = p("M2.5 8.8a14 14 0 0 1 19 0") + p("M5.5 12.2a9.5 9.5 0 0 1 13 0") + p("M8.6 15.6a5 5 0 0 1 6.8 0") + dot(12, 19);

export const icons = {
  // ---- Navigation ----
  menu: l(4, 6, 20, 6) + l(4, 12, 20, 12) + l(4, 18, 20, 18),
  "chevron-up": pl("6,15 12,9 18,15"),
  "chevron-down": pl("6,9 12,15 18,9"),
  "chevron-left": pl("15,6 9,12 15,18"),
  "chevron-right": pl("9,6 15,12 9,18"),
  "chevrons-up-down": pl("8,9 12,5 16,9") + pl("8,15 12,19 16,15"),
  "arrow-up": l(12, 19, 12, 5) + pl("6,11 12,5 18,11"),
  "arrow-down": l(12, 5, 12, 19) + pl("6,13 12,19 18,13"),
  "arrow-left": l(19, 12, 5, 12) + pl("11,6 5,12 11,18"),
  "arrow-right": l(5, 12, 19, 12) + pl("13,6 19,12 13,18"),
  "external-link": p("M14 4h6v6") + l(20, 4, 11, 13) + p("M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"),
  home: p("M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"),
  sidebar: r(3, 4, 18, 16, 2) + l(9, 4, 9, 20),
  columns: r(3, 4, 18, 16, 2) + l(12, 4, 12, 20),

  // ---- Actions ----
  plus: l(12, 5, 12, 19) + l(5, 12, 19, 12),
  minus: l(5, 12, 19, 12),
  "plus-circle": circle + l(12, 8, 12, 16) + l(8, 12, 16, 12),
  close: l(6, 6, 18, 18) + l(18, 6, 6, 18),
  check: pl("5,12.5 10,17.5 19,7"),
  edit: p("M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z") + l(13.5, 7, 16.5, 10),
  trash:
    p("M4 7h16") +
    p("M9 7V4.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V7") +
    p("M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12") +
    l(10, 11, 10, 16) +
    l(14, 11, 14, 16),
  copy: r(8, 8, 12, 12, 2) + p("M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"),
  download: l(12, 4, 12, 15) + pl("7,10 12,15 17,10") + p("M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"),
  upload: l(12, 15, 12, 4) + pl("7,9 12,4 17,9") + p("M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"),
  refresh:
    p("M19.5 10A8 8 0 0 0 5.5 7.3L4 9") + pl("4,4.5 4,9 8.5,9") + p("M4.5 14a8 8 0 0 0 14 2.7L20 15") + pl("20,19.5 20,15 15.5,15"),
  history: p("M4 12a8 8 0 1 0 2.3-5.7L4 8.5") + pl("4,4 4,8.5 8.5,8.5") + pl("12,8 12,12 15,14"),
  search,
  filter: p("M4 5h16l-6 7.5V19l-4 1.5v-8z"),
  sliders: p("M4 7h9M17 7h3M4 17h3M11 17h9") + c(15, 7, 2) + c(9, 17, 2),
  sort: l(8, 4, 8, 20) + pl("4,8 8,4 12,8") + l(16, 20, 16, 4) + pl("12,16 16,20 20,16"),
  "more-horizontal": dot(6, 12) + dot(12, 12) + dot(18, 12),
  "more-vertical": dot(12, 6) + dot(12, 12) + dot(12, 18),
  settings:
    c(12, 12, 3) +
    c(12, 12, 6.5) +
    l(18.5, 12, 21, 12) +
    l(3, 12, 5.5, 12) +
    l(12, 3, 12, 5.5) +
    l(12, 18.5, 12, 21) +
    l(16.6, 16.6, 18.4, 18.4) +
    l(5.6, 5.6, 7.4, 7.4) +
    l(16.6, 7.4, 18.4, 5.6) +
    l(5.6, 18.4, 7.4, 16.6),
  save: p("M5 4h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z") + p("M8 4v4.5h7V4") + p("M7.5 20v-6h9v6"),
  undo: pl("9,14 4,9 9,4") + p("M4 9h10.5a5.5 5.5 0 0 1 0 11H11"),
  redo: pl("15,14 20,9 15,4") + p("M20 9H9.5a5.5 5.5 0 0 0 0 11H13"),
  link: p("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1") + p("M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
  unlink:
    p("M13 6l1-1a4 4 0 0 1 5.7 5.7l-1 1") +
    p("M11 18l-1 1a4 4 0 0 1-5.7-5.7l1-1") +
    l(8, 2.5, 8, 5) +
    l(2.5, 8, 5, 8) +
    l(16, 19, 16, 21.5) +
    l(19, 16, 21.5, 16),
  lock: lockBody + p("M8 11V8a4 4 0 0 1 8 0v3"),
  unlock: lockBody + p("M8 11V8a4 4 0 0 1 7.7-1.5"),
  eye: p("M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z") + c(12, 12, 3),
  "eye-off":
    p("M10 5.7a9.7 9.7 0 0 1 2-.2c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4") +
    p("M6.3 7.4A16.6 16.6 0 0 0 2.5 12s3.5 6.5 9.5 6.5c1.8 0 3.3-.6 4.6-1.4") +
    p("M9.9 9.9a3 3 0 0 0 4.2 4.2") +
    l(3, 3, 21, 21),
  play: pg("7,4.5 19,12 7,19.5"),
  pause: r(6, 5, 4, 14, 1) + r(14, 5, 4, 14, 1),
  stop: r(5.5, 5.5, 13, 13, 2),
  power: l(12, 3, 12, 11) + p("M6.3 6.8a8 8 0 1 0 11.4 0"),
  "log-in": p("M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4") + pl("9,8 13,12 9,16") + l(13, 12, 3, 12),
  "log-out": p("M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4") + pl("16,8 20,12 16,16") + l(20, 12, 9, 12),
  share: c(18, 5.5, 2.5) + c(6, 12, 2.5) + c(18, 18.5, 2.5) + l(8.2, 10.8, 15.8, 6.7) + l(8.2, 13.2, 15.8, 17.3),
  send: p("M20.5 3.5 3.5 10.5l7 3 3 7z") + l(20.5, 3.5, 10.5, 13.5),
  pin: p("M9 3.5h6l-1 6.5 3 3V14H7v-1l3-3z") + l(12, 14, 12, 20.5),
  star: pg("12,3.5 14.35,9.26 20.56,9.72 15.8,13.74 17.29,19.78 12,16.5 6.71,19.78 8.2,13.74 3.44,9.72 9.65,9.26"),
  heart: p("M12 20s-8-4.9-8-10.5A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8 2.7C20 15.1 12 20 12 20z"),
  bookmark: p("M6 4h12v16.5l-6-4-6 4z"),
  paperclip: p("M20 11.5l-7.7 7.7a5 5 0 0 1-7.1-7.1L13 4.3a3.3 3.3 0 0 1 4.7 4.7L10 16.7a1.7 1.7 0 0 1-2.4-2.4l6.9-6.8"),
  "drag-handle": dot(9, 6) + dot(15, 6) + dot(9, 12) + dot(15, 12) + dot(9, 18) + dot(15, 18),
  maximize: p("M4 9V4h5") + p("M15 4h5v5") + p("M20 15v5h-5") + p("M9 20H4v-5"),
  minimize: p("M9 4v5H4") + p("M20 9h-5V4") + p("M15 20v-5h5") + p("M4 15h5v5"),
  "zoom-in": search + l(11, 8.5, 11, 13.5) + l(8.5, 11, 13.5, 11),
  "zoom-out": search + l(8.5, 11, 13.5, 11),
  printer: p("M7 9V3.5h10V9") + p("M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2") + r(7, 14, 10, 6.5),

  // ---- Status ----
  info: circle + l(12, 11, 12, 16.5) + dot(12, 7.75),
  warning: pg("12,3.5 21.5,20 2.5,20") + l(12, 10, 12, 14) + dot(12, 17),
  error: circle + l(9, 9, 15, 15) + l(15, 9, 9, 15),
  success: circle + pl("8,12.5 11,15.5 16.5,9.5"),
  help: circle + p("M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.3-2.4 3.8") + dot(12, 17),
  bell,
  "bell-off": bell + l(3, 3, 21, 21),
  shield,
  "shield-check": shield + pl("8.5,12 11,14.5 15.5,10"),
  bug:
    p("M8 10a4 4 0 0 1 8 0v4a4 4 0 0 1-8 0z") +
    p("M9.5 6.5 8 5M14.5 6.5 16 5") +
    l(12, 10, 12, 18) +
    l(4, 12, 8, 12) +
    l(16, 12, 20, 12) +
    l(5, 7.5, 8.3, 9.5) +
    l(19, 7.5, 15.7, 9.5) +
    l(4.5, 17.5, 8.3, 16) +
    l(19.5, 17.5, 15.7, 16),
  flag: l(5, 21, 5, 4) + p("M5 4h11l-2 4 2 4H5"),
  clock: circle + pl("12,7 12,12 15.5,14"),
  calendar: r(3.5, 5, 17, 15.5, 2) + l(3.5, 10, 20.5, 10) + l(8, 3, 8, 7) + l(16, 3, 16, 7),
  activity: pl("3,12 7,12 10,5 14,19 17,12 21,12"),
  zap: pg("13,3 5,13.5 11.5,13.5 10.5,21 19,10.5 12.5,10.5"),
  loader: p("M12 3a9 9 0 1 0 9 9"),
  "trending-up": pl("3,17 9.5,10.5 13.5,14.5 21,7") + pl("15.5,7 21,7 21,12.5"),
  "trending-down": pl("3,7 9.5,13.5 13.5,9.5 21,17") + pl("15.5,17 21,17 21,11.5"),

  // ---- People & communication ----
  user: c(12, 8, 4) + p("M4.5 20a7.5 7.5 0 0 1 15 0"),
  users: c(9, 8, 3.5) + p("M2.5 20a6.5 6.5 0 0 1 13 0") + p("M15.5 4.6a3.5 3.5 0 0 1 0 6.8") + p("M18 14a6.5 6.5 0 0 1 3.5 6"),
  "user-plus": c(10, 8, 4) + p("M3 20a7 7 0 0 1 14 0") + l(19, 8, 19, 14) + l(16, 11, 22, 11),
  mail: r(3, 5, 18, 14, 2) + pl("3.5,6.5 12,13 20.5,6.5"),
  message: p("M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"),
  hash: l(9.5, 3.5, 7.5, 20.5) + l(16.5, 3.5, 14.5, 20.5) + l(4, 9, 20.5, 9) + l(3.5, 15, 20, 15),

  // ---- Files & data ----
  file,
  "file-text": file + l(8.5, 13, 15.5, 13) + l(8.5, 17, 13, 17),
  folder: p("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
  "folder-open":
    p("M3 18V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2") +
    p("M3 18l2.6-6.4A1 1 0 0 1 6.5 11h14a1 1 0 0 1 .9 1.4l-2.6 6.4a2 2 0 0 1-1.9 1.2H5a2 2 0 0 1-2-2z"),
  image: r(3, 4, 18, 16, 2) + c(8.5, 9.5, 1.8) + pl("21,16 15.5,11 6,20"),
  database: e(12, 6, 7.5, 3) + p("M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6") + p("M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"),
  table: r(3.5, 4.5, 17, 15, 2) + l(3.5, 9.5, 20.5, 9.5) + l(3.5, 14.5, 20.5, 14.5) + l(9.5, 9.5, 9.5, 19.5),
  list: l(9, 6, 20, 6) + l(9, 12, 20, 12) + l(9, 18, 20, 18) + dot(4.5, 6) + dot(4.5, 12) + dot(4.5, 18),
  grid: r(4, 4, 6.5, 6.5, 1) + r(13.5, 4, 6.5, 6.5, 1) + r(4, 13.5, 6.5, 6.5, 1) + r(13.5, 13.5, 6.5, 6.5, 1),
  layers: pg("12,3.5 21,8 12,12.5 3,8") + pl("3,12 12,16.5 21,12") + pl("3,16 12,20.5 21,16"),
  inbox:
    p("M3 13.5 5.6 5.7A1 1 0 0 1 6.6 5h10.8a1 1 0 0 1 1 .7L21 13.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z") +
    p("M3 13.5h5l1.5 2.5h5l1.5-2.5h5"),
  archive: r(3, 4, 18, 4.5, 1) + p("M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5") + l(10, 12.5, 14, 12.5),
  package: pg("12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5") + pl("4,7.5 12,12 20,7.5") + l(12, 12, 12, 21) + l(8, 5.25, 16, 9.75),
  tag:
    p("M3.5 4.5v6.6a1 1 0 0 0 .3.7l8.9 8.9a1 1 0 0 0 1.4 0l6.6-6.6a1 1 0 0 0 0-1.4l-8.9-8.9a1 1 0 0 0-.7-.3H4.5a1 1 0 0 0-1 1z") +
    c(8, 8.5, 1.25),
  "chart-bar": l(4, 20.5, 20, 20.5) + l(7, 17, 7, 11) + l(12, 17, 12, 6) + l(17, 17, 17, 9),
  "chart-line": p("M4 4v16h16") + pl("7.5,15 11,11 14,13.5 19.5,7"),
  "chart-pie": p("M20.5 14.5A9 9 0 1 1 9.5 3.4") + p("M13 2.5V11h8.5A8.5 8.5 0 0 0 13 2.5z"),

  // ---- Infrastructure & devices ----
  server: r(3.5, 4, 17, 7, 1.5) + r(3.5, 13, 17, 7, 1.5) + dot(7, 7.5) + dot(7, 16.5) + l(11, 7.5, 17, 7.5) + l(11, 16.5, 17, 16.5),
  cloud: p("M7 19a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.5A3.75 3.75 0 0 1 17.5 19z"),
  "cloud-off": p("M7 19a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.5A3.75 3.75 0 0 1 17.5 19z") + l(3, 3, 21, 21),
  cpu:
    r(6, 6, 12, 12, 1.5) +
    r(9.5, 9.5, 5, 5) +
    p("M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"),
  "hard-drive": p("M3 14 5.5 5.6a1 1 0 0 1 1-.6h11a1 1 0 0 1 1 .6L21 14") + r(3, 14, 18, 6, 1.5) + dot(7, 17) + l(14, 17, 17, 17),
  globe: circle + l(3, 12, 21, 12) + p("M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"),
  network: r(9, 3, 6, 5, 1) + r(3, 16, 6, 5, 1) + r(15, 16, 6, 5, 1) + p("M12 8v4M6 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"),
  terminal: r(3, 4.5, 18, 15, 2) + pl("7,9.5 10,12 7,14.5") + l(12.5, 15, 17, 15),
  code: pl("8,7 3,12 8,17") + pl("16,7 21,12 16,17") + l(13.5, 5, 10.5, 19),
  "git-branch": c(6, 5.5, 2) + c(6, 18.5, 2) + c(18, 7, 2) + l(6, 7.5, 6, 16.5) + p("M18 9c0 4-3 6-7.5 6.5L7.5 17"),
  "git-commit": c(12, 12, 3.5) + l(3, 12, 8.5, 12) + l(15.5, 12, 21, 12),
  key: c(8, 15, 4.5) + l(11.2, 11.8, 20, 3) + l(16.5, 6.5, 19, 9) + l(14, 9, 16, 11),
  wifi: wifiArcs,
  "wifi-off": wifiArcs + l(3, 3, 21, 21),
  plug: p("M9 3v4M15 3v4") + p("M6 7h12v4a6 6 0 0 1-12 0z") + l(12, 17, 12, 21),
  monitor: r(3, 4, 18, 12, 2) + l(8, 20, 16, 20) + l(12, 16, 12, 20),
  smartphone: r(6.5, 2.5, 11, 19, 2) + dot(12, 18),
  keyboard: r(2.5, 6, 19, 12, 2) + dot(6.5, 10) + dot(10, 10) + dot(14, 10) + dot(17.5, 10) + l(7.5, 14, 16.5, 14),
  rocket:
    p("M9.5 14.5 7 12c1.5-5 5-8.5 13-9-.5 8-4 11.5-9 13z") +
    p("M7 12H3.5L6 8.5h4") +
    p("M12 17v3.5l3.5-2.5v-4") +
    c(15, 9, 1.5),

  // ---- Commerce & places ----
  "credit-card": r(2.5, 5, 19, 14, 2) + l(2.5, 10, 21.5, 10) + l(6, 15, 10, 15),
  briefcase: r(3, 7, 18, 13, 2) + p("M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2") + l(3, 13, 21, 13),
  "book-open": p("M12 6.5C10.5 5 8 4.5 3.5 4.5v14c4.5 0 7 .5 8.5 2 1.5-1.5 4-2 8.5-2v-14c-4.5 0-7 .5-8.5 2z") + l(12, 6.5, 12, 20.5),
  "map-pin": p("M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z") + c(12, 9.5, 2.5),

  // ---- Appearance ----
  sun:
    c(12, 12, 4) +
    l(12, 2.5, 12, 4.5) +
    l(12, 19.5, 12, 21.5) +
    l(2.5, 12, 4.5, 12) +
    l(19.5, 12, 21.5, 12) +
    l(6, 6, 7.4, 7.4) +
    l(16.6, 16.6, 18, 18) +
    l(6, 18, 7.4, 16.6) +
    l(16.6, 7.4, 18, 6),
  moon: p("M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"),
  contrast: circle + p("M12 3a9 9 0 0 1 0 18z"),
} satisfies Record<string, string>;

export type IconName = keyof typeof icons;

export const iconNames = Object.keys(icons).sort() as IconName[];

export interface IconSvgOptions {
  size?: number;
  strokeWidth?: number;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  title?: string;
  className?: string;
}

/** Attributes every icon's root <svg> (or sprite <symbol>) carries. */
export const iconAttrs = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.75",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** A complete <svg> string for one icon, for server-rendered or plain-JS pages. */
export function iconSvg(name: IconName, options: IconSvgOptions = {}): string {
  const inner = icons[name];
  if (inner === undefined) throw new Error(`iconSvg: unknown icon "${String(name)}"`);
  const { size = 24, strokeWidth = 1.75, title, className } = options;
  const attrs = { ...iconAttrs, "stroke-width": String(strokeWidth) };
  const a11y = title ? ` role="img" aria-label="${escapeAttr(title)}"` : ` aria-hidden="true"`;
  const cls = className ? ` class="${escapeAttr(className)}"` : "";
  const list = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  const t = title ? `<title>${escapeAttr(title)}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"${list}${cls}${a11y}>${t}${inner}</svg>`;
}
