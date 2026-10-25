// The three OSQD type families as numbers. Every glyph is drawn from these, so a family is
// a parameter set rather than a separate drawing: OSQD Sans is the neutral default, Tech
// squares the curves and flattens the terminals, Clear opens the shapes and adds the
// distinguishing details that keep I l 1 | and O 0 apart.
//
// Units are font units at 1000 per em.

export const WEIGHTS = [400, 500, 600, 700];
export const WEIGHT_NAMES = { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" };

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
    stem: { 400: 84, 500: 102, 600: 120, 700: 140 },
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
    stem: { 400: 86, 500: 104, 600: 122, 700: 142 },
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
    stem: { 400: 86, 500: 104, 600: 122, 700: 142 },
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

/** The numbers one font is drawn from. */
export function resolve(familyKey, weight, mono) {
  const f = FAMILIES[familyKey];
  const S = f.stem[weight];
  // Wider at heavier weights so counters do not close up; monospaced fonts keep their advance.
  const grow = 1 + ((S - f.stem[400]) / f.stem[400]) * 0.1;
  return {
    family: familyKey,
    mono,
    weight,
    upm: f.upm,
    C: f.cap,
    X: f.xh,
    A: f.asc,
    D: f.desc,
    O: f.overshoot,
    OC: f.overshoot + 2,
    S: mono ? Math.round(S * 0.94) : S,
    H: Math.round((mono ? S * 0.94 : S) * f.contrast),
    k: f.k,
    kin: f.kin,
    wf: f.width * (mono ? 1 : grow),
    ap: f.aperture,
    cut: f.cut,
    dot: f.dot,
    zero: mono ? f.monoZero : f.zero,
    serifI: f.serifI || mono,
    tailL: f.tailL,
    baseOne: f.baseOne || mono,
    sb: mono ? { S: 64, R: 56, D: 26, N: 0, T: 26 } : f.sb,
    monoAdvance: f.monoAdvance,
    lineAscender: f.lineAscender,
    lineDescender: f.lineDescender,
    name: mono ? f.monoName : f.name,
    file: mono ? f.monoFile : f.file,
  };
}
