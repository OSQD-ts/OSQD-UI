// The three OSQD type families as numbers. Every glyph is drawn from these, so a family is
// a parameter set rather than a separate drawing: OSQD Sans is the neutral default, Tech
// squares the curves and flattens the terminals, Clear opens the shapes and adds the
// distinguishing details that keep I l 1 | and O 0 apart.
//
// Units are font units at 1000 per em.

export const WEIGHTS = [200, 300, 400, 500, 600, 700, 800, 900];
export const WEIGHT_NAMES = { 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };

/** The italic slant, in degrees. Every face has an italic: the upright drawing, narrowed and sheared. */
export const ITALIC_ANGLE = 9;

/**
 * Optical sizes, for the three Sans families (the monos have one): the Text cut is the default;
 * Caption is drawn for 12 px and below, Display for 32 px and up. Caption has no Light or
 * ExtraBold — at caption sizes neither reads — and Display has every weight. Neither has an
 * italic: an italic label or heading is set from the Text cut's italic or slanted by the browser,
 * and leaving them out keeps the package under 8 MB.
 *   x: x-height factor   sb: side-bearing factor   stem: stem factor   contrast: added to H/S
 *   ap: added aperture
 */
export const OPTICAL = {
  text: { suffix: "", label: "", weights: WEIGHTS, x: 1, sb: 1, stem: 1, contrast: 0, ap: 0 },
  caption: { suffix: " Caption", label: "Caption", weights: [400, 500, 600, 700], italics: false, x: 1.03, sb: 1.055, stem: 1.04, contrast: 0.04, ap: 0.04 },
  display: { suffix: " Display", label: "Display", weights: WEIGHTS, italics: false, x: 1, sb: 0.965, stem: 0.96, contrast: -0.03, ap: -0.01 },
};

/**
 * Widths. Normal is every family's default; Condensed is drawn for OSQD Sans and OSQD Tech (Clear
 * keeps its width: its open shapes are what it is for), for dense tables and panels. Only the Text
 * optical size has it. Narrower bodies, tighter side-bearings, and stems a touch lighter so the
 * narrower counters stay as open as the normal width's.
 *   wf: body width factor   sb: side-bearing factor   stem: vertical stem factor
 */
export const WIDTHS = {
  normal: { suffix: "", file: "", wf: 1, sb: 1, stem: 1 },
  condensed: { suffix: " Condensed", file: "-condensed", wf: 0.83, sb: 0.86, stem: 0.95, families: ["sans", "tech"] },
};

const common = {
  upm: 1000,
  cap: 700,
  asc: 742, // b d h k l
  desc: -208, // g j p q y
  lineAscender: 960,
  lineDescender: -260,
  monoAdvance: 600,
};

export const FAMILIES = {
  sans: {
    ...common,
    name: "OSQD Sans",
    monoName: "OSQD Mono",
    file: "osqd-sans",
    monoFile: "osqd-mono",
    xh: 528,
    stem: { 200: 52, 300: 66, 400: 84, 500: 102, 600: 120, 700: 140, 800: 162, 900: 186 },
    contrast: 0.84, // horizontal stroke ÷ vertical stem
    k: 0.6, // quarter-ellipse handle: 0.5523 is a true ellipse, more is squarer
    kin: 0.63,
    width: 1,
    aperture: 0.34, // how far the c, e, s and C terminals stop short of closing, in quarter turns
    cut: "a", // terminal cut: across the stroke (geom.mjs)
    dot: "square",
    zero: "plain",
    monoZero: "dotted",
    serifI: false,
    tailL: false,
    baseOne: false,
    overshoot: 10,
    sb: { S: 62, R: 40, D: 14, N: 0, T: -8 },
  },
  tech: {
    ...common,
    name: "OSQD Tech",
    monoName: "OSQD Tech Mono",
    file: "osqd-tech",
    monoFile: "osqd-tech-mono",
    xh: 536,
    stem: { 200: 54, 300: 68, 400: 86, 500: 104, 600: 122, 700: 142, 800: 164, 900: 188 },
    contrast: 0.92,
    k: 0.78,
    kin: 0.82,
    width: 0.97,
    aperture: 0.3,
    cut: "a",
    dot: "square",
    zero: "plain",
    monoZero: "slashed",
    serifI: false,
    tailL: false,
    baseOne: false,
    overshoot: 4,
    sb: { S: 60, R: 46, D: 14, N: 0, T: -8 },
  },
  clear: {
    ...common,
    name: "OSQD Clear",
    monoName: "OSQD Clear Mono",
    file: "osqd-clear",
    monoFile: "osqd-clear-mono",
    xh: 536,
    stem: { 200: 54, 300: 68, 400: 86, 500: 104, 600: 122, 700: 142, 800: 164, 900: 188 },
    contrast: 0.86,
    k: 0.57,
    kin: 0.6,
    width: 1.07,
    aperture: 0.44,
    cut: "r",
    dot: "round",
    zero: "dotted",
    monoZero: "slashed",
    serifI: true,
    tailL: true,
    baseOne: true,
    overshoot: 11,
    sb: { S: 68, R: 46, D: 18, N: 0, T: -6 },
  },
};

/**
 * The numbers one font is drawn from.
 *
 * `opsz` is "text", "caption" or "display" (proportional faces only); `italic` slants the face
 * in build.mjs after the glyphs are placed, so it changes no drawing here — only the name.
 *
 * `width` is "normal" or "condensed" (Sans and Tech Text only, see WIDTHS).
 *
 * The weight ends are not straight extrapolations. Light keeps its stems at 0.79 of Regular so it
 * still reads at 12–14 px, and ExtraLight (0.62) is for 24 px and up — it still reads at 14 px,
 * but thinly. Both keep their horizontals close to their stems (less contrast). ExtraBold and
 * Black thin their horizontals (more contrast), open their apertures and widen, so their
 * counters stay open.
 */
export function resolve(familyKey, weight, mono, { opsz = "text", italic = false, width = "normal" } = {}) {
  const f = FAMILIES[familyKey];
  const o = OPTICAL[mono ? "text" : opsz];
  if (!o) throw new Error(`type: unknown optical size "${opsz}"`);
  const wd = WIDTHS[width];
  if (!wd) throw new Error(`type: unknown width "${width}"`);
  if (width !== "normal" && (mono || opsz !== "text" || !wd.families.includes(familyKey))) throw new Error(`type: ${familyKey} ${mono ? "mono " : ""}${opsz} has no ${width} width`);
  const S0 = f.stem[weight];
  if (S0 === undefined) throw new Error(`type: ${familyKey} has no weight ${weight}`);
  // A shear thins a vertical stem, measured across the stroke, by cos(angle); italics start thicker.
  const S = S0 * o.stem * wd.stem * (italic ? 1 / Math.cos((ITALIC_ANGLE * Math.PI) / 180) : 1);
  // Wider at heavier weights so counters do not close up; monospaced fonts keep their advance.
  // Black widens most: its stems are more than twice ExtraLight's and the counters must stay open.
  const grow = 1 + ((S0 - f.stem[400]) / f.stem[400]) * (weight > 800 ? 0.15 : weight > 700 ? 0.13 : 0.1);
  // ExtraLight keeps its horizontals close to its stems so it still reads at 14 px; the heavy end
  // thins them, so the counters between them stay open.
  const contrast = f.contrast + o.contrast + (weight <= 200 ? 0.08 : weight < 400 ? 0.05 : weight > 800 ? -0.08 : weight > 700 ? -0.05 : 0);
  const ap = f.aperture + o.ap + (weight > 800 ? 0.05 : weight > 700 ? 0.03 : 0);
  // A mono's cell is fixed, so its stems cannot keep growing like a proportional face's: past
  // Bold they grow at half the pace, or m, w and W fill their cells solid at Black.
  const Sm = mono ? (S > 140 ? 140 + (S - 140) * 0.5 : S) * 0.94 : S;
  const sb = mono
    ? { S: 64, R: 56, D: 26, N: 0, T: 26 }
    : Object.fromEntries(Object.entries(f.sb).map(([k, v]) => [k, k === "N" || k === "T" ? v : Math.round(v * o.sb * wd.sb)]));
  const name = mono ? f.monoName : `${f.name}${wd.suffix}${o.suffix}`;
  const file = mono ? f.monoFile : `${f.file}${wd.file}${o.suffix ? `-${opsz}` : ""}`;
  return {
    family: familyKey,
    mono,
    weight,
    opsz: mono ? "text" : opsz,
    width,
    italic,
    upm: f.upm,
    C: f.cap,
    X: Math.round(f.xh * o.x),
    A: f.asc,
    D: f.desc,
    O: f.overshoot,
    OC: f.overshoot + 2,
    S: Math.round(Sm),
    H: Math.round(Sm * contrast),
    k: f.k,
    kin: f.kin,
    wf: f.width * (mono ? 1 : grow * wd.wf),
    ap,
    cut: f.cut,
    dot: f.dot,
    zero: mono ? f.monoZero : f.zero,
    serifI: f.serifI || mono,
    tailL: f.tailL,
    baseOne: f.baseOne || mono,
    sb,
    monoAdvance: f.monoAdvance,
    lineAscender: f.lineAscender,
    lineDescender: f.lineDescender,
    name,
    file,
  };
}
