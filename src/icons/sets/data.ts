import type { IconSet } from "../categories";
import { c, dot, e, fr, l, p, pg, pl, r } from "../draw";

/** The "data" batch of icons. Names must be unique across the whole set (the index throws). */

// ---- Shared outlines -------------------------------------------------------------------------

/** A page with a folded corner, the same outline as `file`. */
const fold = p("M14 3v5h5");
const doc = p("M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z") + fold;
/** The page with its bottom-right corner left open for a badge centred on (17.5, 17.5). */
const docCut = p("M11 21H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8l5 5v3") + fold;

const folder = p("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");

/** A database cylinder with the bottom-right corner left open for a badge. */
const dbCut =
  e(10, 5.5, 6.5, 2.5) + p("M3.5 5.5v12c0 1.4 2.9 2.5 6.5 2.5") + p("M16.5 5.5v6") + p("M3.5 11.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5");
const db = e(12, 6, 7.5, 3) + p("M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6") + p("M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3");

/** A table with the bottom-right corner left open for a badge. */
const tableCut =
  p("M11 19.5H5.5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V11") + l(3.5, 9.5, 20.5, 9.5) + l(3.5, 14.5, 11, 14.5) + l(9.5, 9.5, 9.5, 19.5);

const clip = p("M9 4.5H6.5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1H15") + r(9, 3, 6, 3, 1);
const receipt = p("M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z");

/** Chart axes. */
const axes = p("M4 4v16h16");
const base = l(3.5, 20.5, 20.5, 20.5);

/** A gear: a ring of radius `ring` with eight teeth reaching to `tip`. */
const gear = (cx: number, cy: number, ring: number, tip: number) => {
  const k = (n: number) => Math.round(n * 100) / 100;
  let out = c(cx, cy, ring) + c(cx, cy, k(ring * 0.35));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    out += l(k(cx + Math.cos(a) * ring), k(cy + Math.sin(a) * ring), k(cx + Math.cos(a) * tip), k(cy + Math.sin(a) * tip));
  }
  return out;
};

/** A polar-area chart: one wedge per [from°, to°, radius], centred on (12, 12). */
const rose = (wedges: Array<[number, number, number]>) =>
  wedges
    .map(([from, to, rad]) => {
      const k = (n: number) => Math.round(n * 100) / 100;
      const pt = (deg: number) => `${k(12 + Math.cos((deg * Math.PI) / 180) * rad)} ${k(12 + Math.sin((deg * Math.PI) / 180) * rad)}`;
      return p(`M12 12L${pt(from)}A${rad} ${rad} 0 0 1 ${pt(to)}z`);
    })
    .join("");

/** An Archimedean spiral from the centre outwards, as one polyline. */
const spiralPath = (() => {
  const k = (n: number) => Math.round(n * 100) / 100;
  const pts: string[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * 5 * Math.PI;
    const rad = 0.6 + (8.2 * t) / (5 * Math.PI);
    pts.push(`${k(12 + Math.cos(t) * rad)},${k(12 + Math.sin(t) * rad)}`);
  }
  return pl(pts.join(" "));
})();

// ---- Badges for the open corner (centre 17.5, 17.5; inside 14–21) --------------------------

const badge = {
  plus: l(17.5, 14.5, 17.5, 20.5) + l(14.5, 17.5, 20.5, 17.5),
  minus: l(14.5, 17.5, 20.5, 17.5),
  check: pl("14.5,17.5 16.5,19.5 20.5,15.5"),
  x: l(15, 15, 20, 20) + l(20, 15, 15, 20),
  clock: c(17.5, 17.5, 3.5) + pl("17.5,15.8 17.5,17.5 18.7,18.5"),
  cog: gear(17.5, 17.5, 2.3, 3.5),
  key: c(15.5, 15.5, 2) + l(16.9, 16.9, 20.5, 20.5) + l(19, 19, 20.5, 17.5),
  search: c(16.5, 16.5, 2.5) + l(18.3, 18.3, 20.5, 20.5),
  eye: p("M14 17.5s1.3-2.3 3.5-2.3 3.5 2.3 3.5 2.3-1.3 2.3-3.5 2.3-3.5-2.3-3.5-2.3z") + dot(17.5, 17.5),
  out: l(14, 17.5, 21, 17.5) + pl("18.5,15 21,17.5 18.5,20"),
  in: l(21, 17.5, 14, 17.5) + pl("16.5,15 14,17.5 16.5,20"),
  down: l(17.5, 13.5, 17.5, 20.5) + pl("15,18 17.5,20.5 20,18"),
  up: l(17.5, 20.5, 17.5, 13.5) + pl("15,16 17.5,13.5 20,16"),
  zap: p("M18.5 13.5 15 18h3l-1 3.5 3.5-4.5h-3z"),
  filter: p("M14 14.5h7l-2.75 3.25V21l-1.5-.75v-2.5z"),
  lock: r(14.5, 17, 6, 4.5, 1) + p("M15.75 17v-1.25a1.75 1.75 0 0 1 3.5 0V17"),
  sort: l(16, 14, 16, 21) + pl("14.5,15.5 16,14 17.5,15.5") + l(19.5, 21, 19.5, 14) + pl("18,19.5 19.5,21 21,19.5"),
  edit: p("M13.8 21l.4-2.4 4.6-4.6 2 2-4.6 4.6z"),
  star: pg("17.5,14 18.5,16.4 21,16.6 19.1,18.2 19.7,20.7 17.5,19.4 15.3,20.7 15.9,18.2 14,16.6 16.5,16.4"),
  user: c(17.5, 15.5, 1.8) + p("M14.5 21a3 3 0 0 1 6 0"),
  share: c(15, 17.5, 1.2) + c(19.5, 15, 1.2) + c(19.5, 20, 1.2) + l(16.1, 16.9, 18.4, 15.6) + l(16.1, 18.1, 18.4, 19.4),
  shield: p("M17.5 13.5 21 14.8v2.4c0 2-1.5 3.4-3.5 4.1-2-.7-3.5-2.1-3.5-4.1v-2.4z"),
  link: p("M14 21v-2a3 3 0 0 1 3-3h4") + pl("19,14 21,16 19,18"),
  heart: p("M17.5 21s-3.5-2-3.5-4.2a1.8 1.8 0 0 1 3.5-1.2 1.8 1.8 0 0 1 3.5 1.2c0 2.2-3.5 4.2-3.5 4.2z"),
  sync: p("M14.6 16.5a3 3 0 0 1 5.2-1.6") + pl("20,13.6 20,15.2 18.4,15.2") + p("M20.4 18.5a3 3 0 0 1-5.2 1.6") + pl("15,21.4 15,19.8 16.6,19.8"),
};

// ---- Glyphs for the middle of a folder (centre 12, 13.5) ----------------------------------

const inFolder = {
  heart: p("M12 17s-3.2-1.8-3.2-3.9a1.6 1.6 0 0 1 3.2-1.1 1.6 1.6 0 0 1 3.2 1.1c0 2.1-3.2 3.9-3.2 3.9z"),
  star: pg("12,10 12.95,12.2 15.3,12.4 13.5,13.95 14.05,16.25 12,15 9.95,16.25 10.5,13.95 8.7,12.4 11.05,12.2"),
  key: c(10, 13.5, 1.75) + l(11.75, 13.5, 15.5, 13.5) + l(14.5, 13.5, 14.5, 15),
  user: c(12, 11.75, 1.6) + p("M9 17a3 3 0 0 1 6 0"),
  users: c(10, 12, 1.4) + c(14.5, 12, 1.4) + p("M7.5 17a2.5 2.5 0 0 1 5 0") + p("M12 17a2.5 2.5 0 0 1 5 0"),
  share: p("M8.5 16.5v-1a2 2 0 0 1 2-2h5") + pl("13.5,11.5 15.5,13.5 13.5,15.5"),
  sync: p("M9 13a3 3 0 0 1 5.2-2") + pl("14.5,9.5 14.5,11.2 12.8,11.2") + p("M15 14a3 3 0 0 1-5.2 2") + pl("9.5,17.5 9.5,15.8 11.2,15.8"),
  import: l(8, 13.5, 15, 13.5) + pl("12.5,11 15,13.5 12.5,16"),
  export: l(16, 13.5, 9, 13.5) + pl("11.5,11 9,13.5 11.5,16"),
  cog: gear(12, 13.5, 2.1, 3.3),
  kanban: l(8.5, 11, 8.5, 16.5) + l(12, 11, 12, 14.5) + l(15.5, 11, 15.5, 15.5),
  archive: r(8.5, 10.5, 7, 6.5, 1) + l(10.75, 13, 13.25, 13),
  code: pl("10,11.5 8,13.5 10,15.5") + pl("14,11.5 16,13.5 14,15.5"),
  clock: c(12, 13.5, 3.2) + pl("12,11.8 12,13.5 13.2,14.5"),
  image: c(10, 11.5, 1) + pl("7.5,17 10.5,14 12.5,16 14,14.5 16.5,17"),
  music: c(10, 16, 1.5) + p("M11.5 16v-5.5l4-1V15") + c(14, 15, 1.5),
  shield: p("M12 10l3 1.1v2.1c0 1.9-1.3 3.1-3 3.8-1.7-.7-3-1.9-3-3.8v-2.1z"),
  cloud: p("M9.5 16.5a2 2 0 0 1-.2-4 2.8 2.8 0 0 1 5.4.6 1.7 1.7 0 0 1 .3 3.4z"),
};

// ---- Charts ---------------------------------------------------------------------------------

/** A bar stack: a rectangle from y0 to 18 with a divider at `mid`. */
const stack = (x: number, top: number, mid: number) => r(x, top, 3, 18 - top, 0.5) + l(x, mid, x + 3, mid);

export const set: IconSet = {
  data: {
    // File types and file states
    "file-code-2": doc + pl("9.5,12 7.5,14.5 9.5,17") + l(13, 11.5, 11, 17.5) + pl("14.5,12 16.5,14.5 14.5,17"),
    "file-terminal": doc + pl("8,12 10.5,14.5 8,17") + l(12, 17, 16, 17),
    "file-config": doc + l(8, 13, 9.5, 13) + c(11, 13, 1.5) + l(12.5, 13, 16, 13) + l(8, 17, 12.5, 17) + c(14, 17, 1.5) + l(15.5, 17, 16, 17),
    "file-key": docCut + badge.key,
    "file-certificate": docCut + c(17, 15.5, 2.5) + pl("15.3,17.4 14.8,21 17,19.8 19.2,21 18.7,17.4"),
    "file-log": doc + dot(8.5, 12) + l(10.5, 12, 15.5, 12) + dot(8.5, 15) + l(10.5, 15, 15.5, 15) + dot(8.5, 18) + l(10.5, 18, 13.5, 18),
    "file-sql": doc + e(12, 12, 3.5, 1.25) + p("M8.5 12v4.5c0 .7 1.6 1.25 3.5 1.25s3.5-.55 3.5-1.25V12"),
    "file-xml": doc + pl("9.5,12 7.5,14.5 9.5,17") + l(11, 12.5, 13.5, 16.5) + l(13.5, 12.5, 11, 16.5) + pl("15,12 17,14.5 15,17"),
    "file-yaml": doc + l(8, 12, 12, 12) + dot(10.5, 15) + l(12, 15, 16, 15) + dot(10.5, 18) + l(12, 18, 15, 18),
    "file-markdown": doc + p("M7.5 17v-5l2.25 2.5L12 12v5") + l(15, 12, 15, 17) + pl("13.5,15.5 15,17 16.5,15.5"),
    "file-lines": doc + l(8, 11, 16, 11) + l(8, 14, 16, 14) + l(8, 17, 13, 17),
    "file-presentation": doc + r(8, 11.5, 8, 5, 0.5) + l(12, 16.5, 12, 18.5),
    "file-grid": doc + r(8, 11, 8, 7, 0.5) + l(8, 14.5, 16, 14.5) + l(12, 11, 12, 18),
    "file-font": doc + p("M9 18l3-7 3 7") + l(10, 16, 14, 16),
    "file-heart": doc + p("M12 18s-3.5-2-3.5-4.2a1.8 1.8 0 0 1 3.5-1.2 1.8 1.8 0 0 1 3.5 1.2C15.5 16 12 18 12 18z"),
    "file-question": doc + p("M10.2 13a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.8.7-.8 1.2") + dot(12, 18),
    "file-info": doc + l(12, 14, 12, 18) + dot(12, 11.5),
    "file-symlink": docCut + badge.link,
    "file-stack": p("M8 3h7l4 4v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z") + p("M15 3v4h4") + p("M4 7v13a1 1 0 0 0 1 1h10"),
    "file-output": docCut + badge.out,
    "file-input": doc + l(2.5, 15, 10, 15) + pl("7.5,12.5 10,15 7.5,17.5"),
    "file-scan":
      p("M3 7V4a1 1 0 0 1 1-1h3") +
      p("M17 3h3a1 1 0 0 1 1 1v3") +
      p("M21 17v3a1 1 0 0 1-1 1h-3") +
      p("M7 21H4a1 1 0 0 1-1-1v-3") +
      p("M8.5 7h5l2 2v7.5a.5.5 0 0 1-.5.5H8.5a.5.5 0 0 1-.5-.5V7.5a.5.5 0 0 1 .5-.5z"),
    "file-signature": doc + p("M7.5 17.5c1-2 2-3 2.5-2s-.5 2 .5 2 1.5-2 2.5-2 1 1 2 1"),
    "file-chart": doc + l(9, 18, 9, 15) + l(12, 18, 12, 12) + l(15, 18, 15, 14),
    "file-cog": docCut + badge.cog,
    "file-eye": docCut + badge.eye,
    "file-pen": docCut + badge.edit,
    "file-share": docCut + badge.share,
    "file-down": docCut + badge.down,
    "file-up": docCut + badge.up,
    "file-user": docCut + badge.user,
    "file-type": doc + l(9, 12, 15, 12) + l(12, 12, 12, 18),
    "file-binary": doc + r(8, 12, 2.5, 5, 1.25) + l(14, 12, 14, 17) + l(12.8, 13.2, 14, 12),
    "file-bookmark": doc + p("M9.5 11h5v7l-2.5-1.7-2.5 1.7z"),
    "file-shield": docCut + badge.shield,
    "file-star": docCut + badge.star,
    "file-zap": docCut + badge.zap,
    "file-sync": docCut + badge.sync,
    "file-pie": doc + p("M12 11.5a3.25 3.25 0 1 0 3.25 3.25H12z"),
    // Paper and documents
    page: r(5, 3, 14, 18, 1.5),
    pages: r(7.5, 3, 12, 15, 1.5) + p("M4.5 6v13.5A1.5 1.5 0 0 0 6 21h10"),
    note:
      p("M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V15l-6 6H6.5A1.5 1.5 0 0 1 5 19.5z") +
      p("M13 21v-4.5a1.5 1.5 0 0 1 1.5-1.5H19") +
      l(8.5, 8, 15.5, 8) +
      l(8.5, 11.5, 13, 11.5),
    "note-pinned": r(4, 5.5, 16, 15, 1.5) + c(12, 5.5, 2) + l(8, 12, 16, 12) + l(8, 15.5, 13.5, 15.5),
    newspaper:
      p("M4 5h12v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z") +
      p("M16 9h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2") +
      r(7, 8, 6, 4, 0.5) +
      l(7, 15, 13, 15) +
      l(7, 18, 13, 18),
    scroll:
      p("M8 21h10a2 2 0 0 0 2-2v-1h-9v1a2 2 0 0 1-4 0V5a2 2 0 0 0-2-2h12a2 2 0 0 1 2 2v13") +
      p("M5 3a2 2 0 0 0-2 2v2h4") +
      l(10, 8, 15, 8) +
      l(10, 12, 15, 12),
    "book-marked": p("M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z") + p("M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3") + pl("10,3 10,10 12,8.5 14,10 14,3"),
    "notebook-tabs": r(4, 3, 13.5, 18, 2) + l(7.5, 3, 7.5, 21) + l(17.5, 6, 20, 6) + l(17.5, 10, 20, 10) + l(17.5, 14, 20, 14) + l(10.5, 8, 14.5, 8),
    "clipboard-plus": clip + l(12, 10.5, 12, 16.5) + l(9, 13.5, 15, 13.5),
    "clipboard-minus": clip + l(9, 13.5, 15, 13.5),
    "clipboard-pen": clip + p("M9 17.5l.5-2 4.5-4.5 1.5 1.5-4.5 4.5z"),
    "clipboard-clock": clip + c(12, 14, 3.5) + pl("12,12.3 12,14 13.3,15"),
    "clipboard-chart": clip + l(9, 17, 9, 14.5) + l(12, 17, 12, 11) + l(15, 17, 15, 13),
    // Folders
    folders:
      p("M7 5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.5h6A1.5 1.5 0 0 1 20.5 6.5v7a1.5 1.5 0 0 1-1.5 1.5H8.5A1.5 1.5 0 0 1 7 13.5z") +
      p("M4 8v10a2 2 0 0 0 2 2h11"),
    "folder-heart": folder + inFolder.heart,
    "folder-star": folder + inFolder.star,
    "folder-key": folder + inFolder.key,
    "folder-user": folder + inFolder.user,
    "folder-users": folder + inFolder.users,
    "folder-share": folder + inFolder.share,
    "folder-sync": folder + inFolder.sync,
    "folder-input": folder + inFolder.import,
    "folder-output": folder + inFolder.export,
    "folder-cog": folder + inFolder.cog,
    "folder-kanban": folder + inFolder.kanban,
    "folder-archive": folder + inFolder.archive,
    "folder-code": folder + inFolder.code,
    "folder-clock": folder + inFolder.clock,
    "folder-image": folder + inFolder.image,
    "folder-music": folder + inFolder.music,
    "folder-shield": folder + inFolder.shield,
    "folder-cloud": folder + inFolder.cloud,
    "folder-closed": folder + l(3, 10, 21, 10),
    // Databases
    "database-minus": dbCut + badge.minus,
    "database-check": dbCut + badge.check,
    "database-x": dbCut + badge.x,
    "database-cog": dbCut + badge.cog,
    "database-sync": dbCut + badge.sync,
    "database-export": dbCut + badge.out,
    "database-import": dbCut + badge.in,
    "database-off": db + l(3, 3, 21, 21),
    "database-clock": dbCut + badge.clock,
    "database-key": dbCut + badge.key,
    "database-eye": dbCut + badge.eye,
    "database-star": dbCut + badge.star,
    databases:
      e(9, 5.5, 5.5, 2) + p("M3.5 5.5v9c0 1.1 2.5 2 5.5 2") + p("M14.5 5.5v3") + e(15, 11, 5.5, 2) + p("M9.5 11v8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-8"),
    schema: r(3, 3, 7, 5, 1) + r(14, 9.5, 7, 5, 1) + r(3, 16, 7, 5, 1) + l(6.5, 8, 6.5, 16) + l(6.5, 12, 14, 12),
    relation: r(3, 8, 6, 8, 1) + r(15, 8, 6, 8, 1) + l(9, 12, 15, 12) + l(13, 12, 15, 10) + l(13, 12, 15, 14),
    "key-primary": c(7.5, 12, 4) + dot(7.5, 12) + l(11.5, 12, 21, 12) + l(18, 12, 18, 15) + l(21, 12, 21, 14.5),
    "key-foreign": c(7, 12, 3.5) + l(10.5, 12, 20, 12) + pl("17,9 20,12 17,15"),
    "index-list":
      r(3.5, 4, 6, 16, 1) +
      l(5.5, 8, 7.5, 8) +
      l(5.5, 12, 7.5, 12) +
      l(5.5, 16, 7.5, 16) +
      l(13, 6, 20, 6) +
      l(13, 10, 20, 10) +
      l(13, 14, 20, 14) +
      l(13, 18, 17, 18),
    "key-value": l(4, 7, 8, 7) + l(11.5, 7, 20, 7) + l(4, 12, 8, 12) + l(11.5, 12, 20, 12) + l(4, 17, 8, 17) + l(11.5, 17, 16.5, 17),
    "data-flow": c(5, 12, 2) + c(19, 5.5, 2) + c(19, 18.5, 2) + p("M7 12h3.5c2 0 2.5-6.5 6.5-6.5") + p("M10.5 12c2 0 2.5 6.5 6.5 6.5"),
    "data-transfer": l(4, 8, 20, 8) + pl("16.5,4.5 20,8 16.5,11.5") + l(20, 16, 4, 16) + pl("7.5,12.5 4,16 7.5,19.5"),
    formula: p("M10 4.5H9a2 2 0 0 0-2 2v11a2 2 0 0 1-2 2H4") + l(4.5, 10, 10, 10) + l(13, 10, 19, 18) + l(19, 10, 13, 18),
    // Tables
    "table-minus": tableCut + badge.minus,
    "table-check": tableCut + badge.check,
    "table-x": tableCut + badge.x,
    "table-search": tableCut + badge.search,
    "table-filter": tableCut + badge.filter,
    "table-eye": tableCut + badge.eye,
    "table-zap": tableCut + badge.zap,
    "table-lock": tableCut + badge.lock,
    "table-cog": tableCut + badge.cog,
    "table-sort": tableCut + badge.sort,
    "table-export": tableCut + badge.out,
    "table-import": tableCut + badge.in,
    "table-clock": tableCut + badge.clock,
    "table-pivot":
      r(3.5, 3.5, 17, 17, 2) + l(3.5, 8.5, 20.5, 8.5) + l(8.5, 3.5, 8.5, 20.5) + p("M12 12.5h3a2 2 0 0 1 2 2v2") + pl("15.5,15.5 17,17 18.5,15.5"),
    "column-insert-left": r(13, 4, 8, 16, 1.5) + l(17, 4, 17, 20) + l(7, 9, 7, 15) + l(4, 12, 10, 12),
    "column-insert-right": r(3, 4, 8, 16, 1.5) + l(7, 4, 7, 20) + l(17, 9, 17, 15) + l(14, 12, 20, 12),
    "column-delete": r(3, 4, 8, 16, 1.5) + l(7, 4, 7, 20) + l(14.5, 9.5, 19.5, 14.5) + l(19.5, 9.5, 14.5, 14.5),
    "row-insert-above": r(4, 13, 16, 8, 1.5) + l(4, 17, 20, 17) + l(12, 4, 12, 10) + l(9, 7, 15, 7),
    "row-insert-below": r(4, 3, 16, 8, 1.5) + l(4, 7, 20, 7) + l(12, 14, 12, 20) + l(9, 17, 15, 17),
    "row-delete": r(4, 3, 16, 8, 1.5) + l(4, 7, 20, 7) + l(9.5, 14.5, 14.5, 19.5) + l(14.5, 14.5, 9.5, 19.5),
    "grid-cell":
      r(3.5, 3.5, 17, 17, 2) + l(3.5, 9.2, 20.5, 9.2) + l(3.5, 14.8, 20.5, 14.8) + l(9.2, 3.5, 9.2, 20.5) + l(14.8, 3.5, 14.8, 20.5) + fr(10.4, 10.4, 3.2, 3.2),
    sheet: r(5, 3, 14, 18, 2) + l(5, 8, 19, 8) + l(5, 12.5, 19, 12.5) + l(5, 17, 19, 17) + l(10, 8, 10, 21),
  },

  charts: {
    "chart-bar-stacked": base + stack(5.5, 10, 14) + stack(10.5, 6, 11) + stack(15.5, 12, 15),
    "chart-bar-grouped": base + l(5.5, 18, 5.5, 12) + l(8, 18, 8, 8) + l(11.5, 18, 11.5, 10) + l(14, 18, 14, 14) + l(17.5, 18, 17.5, 7) + l(20, 18, 20, 11),
    "chart-bar-horizontal": l(3.5, 3.5, 3.5, 20.5) + l(7, 7, 17, 7) + l(7, 12, 20, 12) + l(7, 17, 12, 17),
    "chart-bar-horizontal-stacked":
      l(3.5, 3.5, 3.5, 20.5) + r(6, 4.5, 11, 4, 0.5) + l(11, 4.5, 11, 8.5) + r(6, 10, 14, 4, 0.5) + l(13, 10, 13, 14) + r(6, 15.5, 7, 4, 0.5) + l(9.5, 15.5, 9.5, 19.5),
    "chart-bar-increasing": base + l(7, 17, 7, 14) + l(12, 17, 12, 10) + l(17, 17, 17, 5.5),
    "chart-bar-decreasing": base + l(7, 17, 7, 5.5) + l(12, 17, 12, 10) + l(17, 17, 17, 14),
    "chart-bar-diverging": l(3.5, 12, 20.5, 12) + l(7, 12, 7, 5.5) + l(12, 12, 12, 18) + l(17, 12, 17, 8),
    "chart-bar-target": base + l(7, 17, 7, 11) + l(12, 17, 12, 6) + l(17, 17, 17, 13) + l(4, 8.5, 5.5, 8.5) + l(8.5, 8.5, 10.5, 8.5) + l(13.5, 8.5, 15.5, 8.5) + l(18.5, 8.5, 20, 8.5),
    "chart-column-line": axes + l(8, 17, 8, 13) + l(12, 17, 12, 10) + l(16, 17, 16, 12) + pl("7,9.5 11,6.5 15,8 19.5,4.5"),
    "chart-line-step": axes + pl("7,16 10.5,16 10.5,11 14.5,11 14.5,13.5 19.5,13.5 19.5,7"),
    "chart-line-multi": axes + pl("7.5,16 11,13 14,14.5 19.5,10.5") + pl("7.5,11 11,7.5 14,9.5 19.5,5.5"),
    "chart-line-up": axes + pl("7,16 10.5,12.5 13.5,14 19.5,7.5") + pl("16,7.5 19.5,7.5 19.5,11"),
    "chart-line-down": axes + pl("7,8 10.5,11.5 13.5,10 19.5,16.5") + pl("16,16.5 19.5,16.5 19.5,13"),
    "chart-baseline": l(3, 12, 21, 12) + pl("3,15.5 7.5,8.5 11.5,14.5 15.5,6.5 21,10"),
    "chart-forecast": axes + pl("7,15.5 10.5,11.5 13,13") + l(14.5, 11.5, 15.5, 10.5) + l(17, 9, 18, 8) + dot(19.5, 6.5),
    "chart-anomaly": axes + pl("6.5,14.5 10,13.5 12,7.5 14,13.5 19.5,13") + c(12, 7.5, 2.5),
    "chart-correlation": axes + l(6.5, 17.5, 19.5, 7) + c(9, 13.5, 1) + c(12, 15.5, 1) + c(14.5, 9, 1) + c(17.5, 11, 1),
    "chart-bubble": axes + c(9, 14, 2.5) + c(15, 8.5, 3) + c(16.5, 15.5, 1.5),
    "chart-cumulative": axes + p("M7 17.5c4 0 5-10 12.5-11"),
    "chart-bell-curve": l(3, 20, 21, 20) + p("M3 19c4 0 5-14 9-14s5 14 9 14") + l(12, 5, 12, 20),
    "chart-area-stacked": base + p("M4 18v-4l5-4 4 3 7-6v11z") + p("M4 18l5-3 4 2 7-4"),
    "chart-pie-3": c(12, 12, 9) + l(12, 12, 12, 3) + l(12, 12, 19.8, 16.5) + l(12, 12, 4.2, 16.5),
    "chart-pie-quarter": c(12, 12, 9) + l(12, 12, 12, 3) + l(12, 12, 21, 12),
    "chart-semi-donut": p("M3 17a9 9 0 0 1 18 0") + p("M8 17a4 4 0 0 1 8 0") + l(3, 17, 8, 17) + l(16, 17, 21, 17) + l(12, 8, 12, 13),
    "chart-radar": pg("12,3 20.5,9.2 17.3,19.3 6.7,19.3 3.5,9.2") + pg("12,6.5 17,10.2 14.8,16.5 8.7,15.5 7,10.5"),
    "chart-funnel-stages": p("M4 5h16l-2 4H6z") + p("M7 11h10l-2 4H9z") + p("M10 17h4l-.8 3h-2.4z"),
    "chart-sankey": l(4, 4, 4, 20) + l(20, 4, 20, 20) + p("M4 6c8 0 8 6 16 6") + p("M4 12c8 0 8 6 16 6") + p("M4 18c8 0 8-12 16-12"),
    "chart-treemap": r(3.5, 3.5, 17, 17, 2) + l(11, 3.5, 11, 20.5) + l(11, 12, 20.5, 12) + l(15.5, 12, 15.5, 20.5) + l(3.5, 14, 11, 14),
    "chart-sunburst": c(12, 12, 3) + c(12, 12, 6) + c(12, 12, 9) + l(12, 3, 12, 9) + l(17.2, 15, 19.8, 16.5) + l(6.8, 15, 4.2, 16.5),
    "chart-waterfall": base + r(4.5, 11, 3, 7, 0.5) + r(8.75, 6, 3, 5, 0.5) + r(13, 6, 3, 4, 0.5) + r(17, 10, 3, 8, 0.5),
    "chart-ohlc": l(7, 4, 7, 19) + l(5, 8, 7, 8) + l(7, 14, 9, 14) + l(16, 6, 16, 20) + l(14, 16, 16, 16) + l(16, 10, 18, 10),
    "chart-boxplot":
      l(8, 4.5, 8, 7) +
      r(5.5, 7, 5, 8, 0.5) +
      l(5.5, 11, 10.5, 11) +
      l(8, 15, 8, 19) +
      l(6.5, 4.5, 9.5, 4.5) +
      l(6.5, 19, 9.5, 19) +
      l(16, 6, 16, 9) +
      r(13.5, 9, 5, 6, 0.5) +
      l(13.5, 12, 18.5, 12) +
      l(16, 15, 16, 18) +
      l(14.5, 6, 17.5, 6) +
      l(14.5, 18, 17.5, 18),
    "chart-violin": p("M8 3c0 3-3 4-3 9s3 6 3 9c0-3 3-4 3-9S8 6 8 3z") + p("M16 5c0 2.5-2.5 3.5-2.5 7s2.5 4.5 2.5 7c0-2.5 2.5-3.5 2.5-7S16 7.5 16 5z"),
    "chart-matrix": r(3.5, 3.5, 17, 17, 2) + l(9.2, 3.5, 9.2, 20.5) + l(14.8, 3.5, 14.8, 20.5) + l(3.5, 9.2, 20.5, 9.2) + l(3.5, 14.8, 20.5, 14.8) + fr(4.9, 4.9, 2.9, 2.9) + fr(10.55, 10.55, 2.9, 2.9) + fr(16.2, 10.55, 2.9, 2.9),
    "chart-calendar-heat":
      r(3.5, 4.5, 17, 15, 2) + l(3.5, 8.5, 20.5, 8.5) + fr(6, 11, 2.5, 2.5) + fr(10.75, 11, 2.5, 2.5) + fr(15.5, 14.75, 2.5, 2.5) + fr(6, 14.75, 2.5, 2.5),
    "chart-network": c(6, 6, 2) + c(18, 7, 2) + c(12, 18, 2) + c(19, 16.5, 1.5) + l(7.7, 7, 16, 7) + l(7, 7.7, 11, 16.3) + l(17.2, 8.8, 12.9, 16.2) + l(14, 17.7, 17.5, 16.7),
    "chart-dendrogram":
      l(4, 20, 4, 14) +
      l(8, 20, 8, 14) +
      l(4, 14, 8, 14) +
      l(6, 14, 6, 8) +
      l(16, 20, 16, 11) +
      l(20, 20, 20, 11) +
      l(16, 11, 20, 11) +
      l(18, 11, 18, 8) +
      l(6, 8, 18, 8) +
      l(12, 8, 12, 4),
    "chart-pyramid": pg("12,3 21,20 3,20") + l(8.8, 9, 15.2, 9) + l(5.9, 14.5, 18.1, 14.5),
    "chart-bullet": r(3.5, 7, 17, 10, 1.5) + l(5.5, 12, 13.5, 12) + l(16.5, 9, 16.5, 15),
    "chart-progress": r(3.5, 4, 17, 4, 2) + l(5.5, 6, 15, 6) + r(3.5, 10, 17, 4, 2) + l(5.5, 12, 10, 12) + r(3.5, 16, 17, 4, 2) + l(5.5, 18, 17.5, 18),
    "chart-milestones": l(3, 12, 21, 12) + pg("7,9.5 9.5,12 7,14.5 4.5,12") + pg("17,9.5 19.5,12 17,14.5 14.5,12") + c(12, 12, 1.25),
    "chart-presentation": r(3, 4, 18, 11, 1.5) + l(12, 15, 12, 18) + l(8, 21, 12, 18) + l(16, 21, 12, 18) + pl("7,12 10,9 13,11 17,7"),
    "chart-search": c(10.5, 10.5, 6.5) + l(15.5, 15.5, 20, 20) + l(8, 13, 8, 11) + l(10.5, 13, 10.5, 8.5) + l(13, 13, 13, 10),
    sparkline: pl("3,14 6,11 9,13 12,7 15,12 18,9 21,10"),
    "trending-flat": pl("3,14 8,10 12,12 21,12") + pl("17.5,8.5 21,12 17.5,15.5"),
    kpi: r(3.5, 4.5, 17, 15, 2) + pl("7,15 10.5,11.5 13,13.5 17,9") + pl("14,9 17,9 17,12"),
    goal: c(10, 14, 6.5) + c(10, 14, 3) + l(10, 14, 10, 3) + p("M10 3l7 2.5-7 2.5"),
    "gauge-low": p("M3.5 16a8.5 8.5 0 1 1 17 0") + l(12, 16, 6.5, 13.5) + c(12, 16, 1.25),
    "gauge-medium": p("M3.5 16a8.5 8.5 0 1 1 17 0") + l(12, 16, 12, 9.5) + c(12, 16, 1.25),
    "gauge-high": p("M3.5 16a8.5 8.5 0 1 1 17 0") + l(12, 16, 17.5, 13.5) + c(12, 16, 1.25),
    "gauge-ticks": p("M3.5 16a8.5 8.5 0 1 1 17 0") + l(12, 7.5, 12, 9) + l(6, 10, 7, 11) + l(18, 10, 17, 11) + l(12, 16, 15, 12) + c(12, 16, 1.25),
    "dashboard-gauge": r(3, 3, 18, 18, 2) + p("M7 15a5 5 0 0 1 10 0") + l(12, 15, 14.5, 11.5),
    "chart-stream": p("M3 9c4 0 5-3.5 9-3.5S17 9 21 9") + p("M3 12c4 0 5-1 9-1s5 1 9 1") + p("M3 15c4 0 5 3.5 9 3.5s5-3.5 9-3.5"),
    "chart-rose": rose([[-85, -5, 8.5], [5, 85, 6], [95, 175, 7.5], [185, 265, 5]]),
    "percent-circle": c(12, 12, 9) + l(9, 15, 15, 9) + c(9.25, 9.25, 1.25) + c(14.75, 14.75, 1.25),
    "percent-square": r(3.5, 3.5, 17, 17, 2) + l(9, 15, 15, 9) + c(9.25, 9.25, 1.25) + c(14.75, 14.75, 1.25),
  },

  shapes: {
    cube: p("M12 3 20 7.5v9L12 21l-8-4.5v-9z") + p("M4 7.5l8 4.5 8-4.5") + l(12, 12, 12, 21),
    cylinder: e(12, 6, 7, 2.5) + p("M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"),
    cone: e(12, 18, 7, 2.5) + p("M5 18 12 3l7 15"),
    sphere: c(12, 12, 9) + e(12, 12, 9, 3.5),
    pyramid: p("M12 3 3 18l9 3 9-3z") + l(12, 3, 12, 21),
    rectangle: r(3, 6, 18, 12, 2),
    "rectangle-vertical": r(6, 3, 12, 18, 2),
    ellipse: e(12, 12, 9, 6),
    parallelogram: pg("7.5,6 21,6 16.5,18 3,18"),
    trapezoid: pg("7.5,6 16.5,6 21,18 3,18"),
    semicircle: p("M3 16a9 9 0 0 1 18 0z"),
    spiral: spiralPath,
    "shape-arrow-right": pg("3,9 13,9 13,5 21,12 13,19 13,15 3,15"),
    "shape-arrow-up": pg("9,21 9,11 5,11 12,3 19,11 15,11 15,21"),
    "shape-chevron": pg("3,5 14,5 21,12 14,19 3,19 10,12"),
    "shape-cross": pg("9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9"),
    angle: l(4, 20, 20, 20) + l(4, 20, 15, 6) + p("M9.5 20a5.5 5.5 0 0 0-1.7-4"),
    dimension: l(4, 8, 4, 16) + l(20, 8, 20, 16) + l(4, 12, 20, 12) + pl("7,9.5 4.5,12 7,14.5") + pl("17,9.5 19.5,12 17,14.5"),
    integral: p("M15.5 4.5a2 2 0 0 0-3.5 1.3V18.2a2 2 0 0 1-3.5 1.3"),
    partial: p("M8 6.5A4.5 4.5 0 0 1 16 9c0 6-2.5 11-6 11a3.5 3.5 0 0 1 0-7c2.5 0 4.5 1.5 5.5 3"),
    exponent: l(4, 10, 11, 19) + l(11, 10, 4, 19) + p("M14 6a1.5 1.5 0 0 1 3 0c0 1-3 2.5-3 4h3"),
    matrix: p("M6 4H4v16h2") + p("M18 4h2v16h-2") + c(9, 9, 1) + c(15, 9, 1) + c(9, 15, 1) + c(15, 15, 1),
    "greater-than": pl("6,6 18,12 6,18"),
    "less-than": pl("18,6 6,12 18,18"),
    "greater-equal": pl("6,4.5 18,9.5 6,14.5") + l(6, 19.5, 18, 19.5),
    "less-equal": pl("18,4.5 6,9.5 18,14.5") + l(6, 19.5, 18, 19.5),
    ampersand: p("M18 20 8.5 9.5A3 3 0 1 1 13 6c0 2-2 3-4.5 4.5S5 13.5 5 16a4 4 0 0 0 7 2.6l5.5-6.1"),
    asterisk: l(12, 4, 12, 20) + l(5, 8, 19, 16) + l(19, 8, 5, 16),
    "forward-slash": l(16, 4, 8, 20),
    backslash: l(8, 4, 16, 20),
    tilde: p("M4 14c2-4 5-4 8-2s6 2 8-2"),
    fraction: l(15.5, 4, 8.5, 20) + p("M5 6l2-1.5v6") + p("M14 15a2 2 0 0 1 4 0c0 1.5-4 3-4 5h4"),
    omega: p("M4 20h5v-2a7 7 0 1 1 6 0v2h5"),
    lambda: p("M6 4h2l9 16") + l(12.5, 12, 6, 20),
    theta: e(12, 12, 6, 9) + l(6, 12, 18, 12),
    parabola: l(4, 4, 4, 20) + l(4, 20, 20, 20) + p("M7.5 5c1.5 11 9.5 11 11 0"),
    "math-sine": l(3, 12, 21, 12) + p("M3 12c1.5-5.5 3-5.5 4.5 0s3 5.5 4.5 0 3-5.5 4.5 0 3 5.5 4.5 0"),
    coordinates: l(4, 4, 4, 20) + l(4, 20, 20, 20) + c(14, 10, 1.75) + l(4, 10, 11.5, 10) + l(14, 20, 14, 12.5),
    protractor: p("M3 18a9 9 0 0 1 18 0z") + l(12, 18, 16.5, 11) + l(12, 9, 12, 10.5) + l(5.6, 11.6, 6.7, 12.7) + l(18.4, 11.6, 17.3, 12.7),
    torus: e(12, 12, 9, 5) + p("M7.5 12.5c1.2 1 7.8 1 9 0") + p("M8.5 11.6c1.5-.8 5.5-.8 7 0"),
    squircle: p("M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z"),
    "shape-capsule": r(3, 8, 18, 8, 4),
    venn: c(9, 12, 6) + c(15, 12, 6),
    "venn-three": c(9, 9.5, 5) + c(15, 9.5, 5) + c(12, 14.5, 5),
  },

  finance: {
    ledger: p("M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z") + p("M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3") + l(9, 7, 15, 7) + l(9, 10, 15, 10) + l(9, 13, 13, 13),
    "balance-scale": l(12, 4, 12, 20) + l(8, 20, 16, 20) + l(5, 7, 19, 7) + p("M5 7 2.5 13a2.5 2.5 0 0 0 5 0z") + p("M19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"),
    "balance-sheet": r(3.5, 4, 17, 16, 1.5) + l(12, 4, 12, 20) + l(3.5, 8, 20.5, 8) + l(6, 11.5, 9.5, 11.5) + l(6, 14.5, 9.5, 14.5) + l(14.5, 11.5, 18, 11.5) + l(14.5, 14.5, 18, 14.5),
    invoice: doc + l(8, 11, 11, 11) + l(8, 14, 16, 14) + l(8, 17, 16, 17) + l(14, 11, 16, 11),
    "receipt-check": receipt + pl("8.5,12 11,14.5 15.5,9.5"),
    "receipt-x": receipt + l(9, 9, 15, 15) + l(15, 9, 9, 15),
    "receipt-clock": receipt + c(12, 11.5, 3.5) + pl("12,9.7 12,11.5 13.3,12.4"),
    tax: receipt + l(9, 15, 15, 9) + c(9.5, 9.5, 1) + c(14.5, 14.5, 1),
    revenue: r(2.5, 6, 13, 10, 1.5) + c(9, 11, 2.5) + l(19, 17.5, 19, 7) + pl("16.5,9.5 19,7 21.5,9.5"),
    expense: r(2.5, 8, 13, 10, 1.5) + c(9, 13, 2.5) + l(19, 6.5, 19, 17) + pl("16.5,14.5 19,17 21.5,14.5"),
    profit: c(8.5, 15.5, 5) + c(8.5, 15.5, 2) + l(13, 11, 19.5, 4.5) + pl("15.5,4.5 19.5,4.5 19.5,8.5"),
    loss: c(8.5, 8.5, 5) + c(8.5, 8.5, 2) + l(13, 13, 19.5, 19.5) + pl("19.5,15.5 19.5,19.5 15.5,19.5"),
    statement: doc + l(8, 11, 16, 11) + l(8, 14, 16, 14) + l(11, 17.2, 16, 17.2) + l(11, 18.8, 16, 18.8),
    ratio: r(3, 5, 7, 14, 1.5) + r(14, 9, 7, 10, 1.5) + dot(12, 10.5) + dot(12, 14.5),
  },
};
