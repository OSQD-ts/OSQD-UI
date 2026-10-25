/**
 * The theme is the one source of truth for every colour, size and font in the kit.
 *
 * `styles/tokens.css` is generated from this file by `npm run tokens` (and checked by
 * `npm run tokens:check`), so the plain-CSS layer and the React layer can never disagree
 * about what `--oq-primary` is. Edit the themes here, never the CSS.
 *
 * This module has no runtime imports on purpose: the token script loads it straight from
 * source with Node's type stripping, which does not resolve extensionless imports.
 */

export type ThemeMode = "dark" | "light";

/** Every colour a component may use. Components never hard-code a colour of their own. */
export interface Palette {
  /** Page background — the furthest layer back. */
  bg: string;
  /** Panels, cards, inputs. */
  surface: string;
  /** A raised layer on a surface: menus, dialogs, table headers. */
  raised: string;
  /** Hover / pressed fill for neutral controls. */
  hover: string;
  /** Hairlines between things. */
  border: string;
  /** Borders that must be seen: inputs, outlined buttons. */
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  danger: string;
  onDanger: string;
  info: string;
  onInfo: string;
  /** Neutral as an intent: grey buttons, default chips. */
  neutral: string;
  onNeutral: string;
  focus: string;
  selection: string;
  /** Scrim behind dialogs. */
  overlay: string;
}

export interface Theme {
  name: string;
  mode: ThemeMode;
  palette: Palette;
  font: {
    sans: string;
    mono: string;
    /** Base size in px; every other size is a step from it. */
    size: number;
    lineHeight: number;
  };
  /** Corner radii in px. */
  radius: { sm: number; md: number; lg: number };
  /** The spacing unit in px — `space(n)` is `n * unit`. */
  spaceUnit: number;
  /** Control heights in px for the three sizes. */
  control: { sm: number; md: number; lg: number };
  shadow: { sm: string; md: string; lg: string };
  /** Transition duration in ms; 0 turns motion off. */
  motion: number;
}

const font = {
  sans: '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  size: 14,
  lineHeight: 1.45,
};

const shared = {
  font,
  radius: { sm: 3, md: 5, lg: 8 },
  spaceUnit: 4,
  control: { sm: 26, md: 32, lg: 40 },
  motion: 120,
};

/**
 * Dark — warm greys with six accents. The accents are bright enough that
 * text on them is the dark background colour, never white.
 */
export const darkTheme: Theme = {
  name: "dark",
  mode: "dark",
  ...shared,
  palette: {
    bg: "#221f22",
    surface: "#2d2a2e",
    raised: "#363337",
    hover: "#403e41",
    border: "#403e41",
    borderStrong: "#5b595c",
    text: "#fcfcfa",
    textMuted: "#c1c0c0",
    textFaint: "#a19fa1",
    primary: "#78dce8",
    onPrimary: "#19181a",
    secondary: "#ab9df2",
    onSecondary: "#19181a",
    success: "#a9dc76",
    onSuccess: "#19181a",
    warning: "#ffd866",
    onWarning: "#19181a",
    danger: "#ff6188",
    onDanger: "#19181a",
    info: "#fc9867",
    onInfo: "#19181a",
    neutral: "#5b595c",
    onNeutral: "#fcfcfa",
    focus: "#78dce8",
    selection: "rgba(120, 220, 232, 0.16)",
    overlay: "rgba(25, 24, 26, 0.72)",
  },
  shadow: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.35)",
    md: "0 4px 12px rgba(0, 0, 0, 0.4)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.5)",
  },
};

/**
 * Light — white surfaces on a soft grey page. The accents are darkened versions of
 * the dark theme's so that each one carries white text at WCAG AA (4.5:1) or better.
 */
export const lightTheme: Theme = {
  name: "light",
  mode: "light",
  ...shared,
  palette: {
    bg: "#f4f4f2",
    surface: "#ffffff",
    raised: "#fafaf9",
    hover: "#ececea",
    border: "#e3e2df",
    borderStrong: "#c4c2be",
    text: "#2d2a2e",
    textMuted: "#5b595c",
    textFaint: "#716f72",
    primary: "#0e6f7c",
    onPrimary: "#ffffff",
    secondary: "#5e49c2",
    onSecondary: "#ffffff",
    success: "#3f6e17",
    onSuccess: "#ffffff",
    warning: "#8a5a00",
    onWarning: "#ffffff",
    danger: "#c01b48",
    onDanger: "#ffffff",
    info: "#b04a14",
    onInfo: "#ffffff",
    neutral: "#5b595c",
    onNeutral: "#ffffff",
    focus: "#0e6f7c",
    selection: "rgba(14, 111, 124, 0.12)",
    overlay: "rgba(45, 42, 46, 0.45)",
  },
  shadow: {
    sm: "0 1px 2px rgba(45, 42, 46, 0.08)",
    md: "0 4px 12px rgba(45, 42, 46, 0.12)",
    lg: "0 12px 32px rgba(45, 42, 46, 0.18)",
  },
};

/*
 * Variants. Each one gives a full palette rather than a few overrides, so it reads on its own,
 * and each one passes the same contrast rules as dark and light (tests/theme.test.ts):
 * text 7:1, muted and faint text 4.5:1 on every layer, intents 4.5:1 against their on-colour
 * and against the page and surface (ghost and outline buttons put intent-coloured text there).
 */

/** Graphite — cool neutral greys with a blue lead. */
export const graphiteTheme: Theme = {
  ...darkTheme,
  name: "graphite",
  palette: {
    bg: "#16181d",
    surface: "#1e2128",
    raised: "#262a32",
    hover: "#2e333c",
    border: "#2e333c",
    borderStrong: "#454b56",
    text: "#e8eaef",
    textMuted: "#b4b9c3",
    textFaint: "#8e94a0",
    primary: "#6cb6ff",
    onPrimary: "#0d1117",
    secondary: "#b392f0",
    onSecondary: "#0d1117",
    success: "#6bd99a",
    onSuccess: "#0d1117",
    warning: "#f0c060",
    onWarning: "#0d1117",
    danger: "#ff7b86",
    onDanger: "#0d1117",
    info: "#f69d50",
    onInfo: "#0d1117",
    neutral: "#4a505c",
    onNeutral: "#e8eaef",
    focus: "#6cb6ff",
    selection: "rgba(108, 182, 255, 0.16)",
    overlay: "rgba(10, 12, 16, 0.72)",
  },
};

/** Midnight — deep navy for long sessions in a dark room. */
export const midnightTheme: Theme = {
  ...darkTheme,
  name: "midnight",
  palette: {
    bg: "#0b1020",
    surface: "#121a2e",
    raised: "#19223a",
    hover: "#212b46",
    border: "#212b46",
    borderStrong: "#34405f",
    text: "#e6ebf5",
    textMuted: "#aab4c8",
    textFaint: "#8292b0",
    primary: "#82a8ff",
    onPrimary: "#0b1020",
    secondary: "#b79cff",
    onSecondary: "#0b1020",
    success: "#8fd16a",
    onSuccess: "#0b1020",
    warning: "#e6b45c",
    onWarning: "#0b1020",
    danger: "#ff7a93",
    onDanger: "#0b1020",
    info: "#ff9c6b",
    onInfo: "#0b1020",
    neutral: "#3b4663",
    onNeutral: "#e6ebf5",
    focus: "#82a8ff",
    selection: "rgba(130, 168, 255, 0.18)",
    overlay: "rgba(5, 8, 16, 0.75)",
  },
  shadow: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.45)",
    md: "0 4px 12px rgba(0, 0, 0, 0.5)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.6)",
  },
};

/**
 * Contrast — black and white with saturated accents, for bright rooms, projectors and low
 * vision. Borders are strong, and the focus ring is yellow so it can never be missed.
 */
export const contrastTheme: Theme = {
  ...darkTheme,
  name: "contrast",
  palette: {
    bg: "#000000",
    surface: "#0a0a0a",
    raised: "#141414",
    hover: "#242424",
    border: "#3a3a3a",
    borderStrong: "#8a8a8a",
    text: "#ffffff",
    textMuted: "#e0e0e0",
    textFaint: "#bdbdbd",
    primary: "#5ce1ff",
    onPrimary: "#000000",
    secondary: "#c9a6ff",
    onSecondary: "#000000",
    success: "#7dff9a",
    onSuccess: "#000000",
    warning: "#ffe04d",
    onWarning: "#000000",
    danger: "#ff6b8b",
    onDanger: "#000000",
    info: "#ffa64d",
    onInfo: "#000000",
    neutral: "#5e5e5e",
    onNeutral: "#ffffff",
    focus: "#ffe04d",
    selection: "rgba(92, 225, 255, 0.25)",
    overlay: "rgba(0, 0, 0, 0.85)",
  },
  shadow: {
    sm: "0 0 0 1px #3a3a3a",
    md: "0 0 0 1px #8a8a8a",
    lg: "0 0 0 1px #8a8a8a, 0 12px 32px rgba(0, 0, 0, 0.8)",
  },
};

/** Paper — warm off-white, easy on the eyes for reading-heavy pages. */
export const paperTheme: Theme = {
  ...lightTheme,
  name: "paper",
  palette: {
    bg: "#f3efe6",
    surface: "#fbf8f1",
    raised: "#f7f3ea",
    hover: "#ebe5d8",
    border: "#e2dbcc",
    borderStrong: "#c4bba8",
    text: "#2b2620",
    textMuted: "#5a5246",
    textFaint: "#6b6354",
    primary: "#9a4a0e",
    onPrimary: "#ffffff",
    secondary: "#6b4fa0",
    onSecondary: "#ffffff",
    success: "#3d6b1f",
    onSuccess: "#ffffff",
    warning: "#855800",
    onWarning: "#ffffff",
    danger: "#b3261e",
    onDanger: "#ffffff",
    info: "#1f6a8a",
    onInfo: "#ffffff",
    neutral: "#5a5246",
    onNeutral: "#ffffff",
    focus: "#9a4a0e",
    selection: "rgba(154, 74, 14, 0.14)",
    overlay: "rgba(43, 38, 32, 0.45)",
  },
  shadow: {
    sm: "0 1px 2px rgba(43, 38, 32, 0.08)",
    md: "0 4px 12px rgba(43, 38, 32, 0.12)",
    lg: "0 12px 32px rgba(43, 38, 32, 0.18)",
  },
};

/** Slate — cool light greys with a blue lead, crisp on bright office screens. */
export const slateTheme: Theme = {
  ...lightTheme,
  name: "slate",
  palette: {
    bg: "#eef1f5",
    surface: "#ffffff",
    raised: "#f7f9fb",
    hover: "#e6eaf0",
    border: "#dde2ea",
    borderStrong: "#b8c0cc",
    text: "#1c2430",
    textMuted: "#4a5566",
    textFaint: "#5f6a7b",
    primary: "#2457c5",
    onPrimary: "#ffffff",
    secondary: "#6a3fc4",
    onSecondary: "#ffffff",
    success: "#1f7a45",
    onSuccess: "#ffffff",
    warning: "#8a5600",
    onWarning: "#ffffff",
    danger: "#c2203a",
    onDanger: "#ffffff",
    info: "#0b6e8f",
    onInfo: "#ffffff",
    neutral: "#4a5566",
    onNeutral: "#ffffff",
    focus: "#2457c5",
    selection: "rgba(36, 87, 197, 0.12)",
    overlay: "rgba(28, 36, 48, 0.45)",
  },
  shadow: {
    sm: "0 1px 2px rgba(28, 36, 48, 0.08)",
    md: "0 4px 12px rgba(28, 36, 48, 0.12)",
    lg: "0 12px 32px rgba(28, 36, 48, 0.18)",
  },
};

/** Every built-in theme by name. Each becomes a `[data-theme="<name>"]` rule in tokens.css. */
export const themes = {
  dark: darkTheme,
  light: lightTheme,
  graphite: graphiteTheme,
  midnight: midnightTheme,
  contrast: contrastTheme,
  paper: paperTheme,
  slate: slateTheme,
} as const;

export type BuiltInThemeName = keyof typeof themes;

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Build a theme from a base and overrides.
 * Unknown keys throw: a misspelt token that silently did nothing is exactly the failure this
 * kit should never have.
 */
export function createTheme(overrides: DeepPartial<Theme> & { name: string }, base: Theme = darkTheme): Theme {
  return merge(base, overrides, "theme") as Theme;
}

function merge(base: unknown, over: unknown, path: string): unknown {
  if (over === undefined) return base;
  if (typeof base !== "object" || base === null || typeof over !== "object" || over === null) return over;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(over)) {
    if (!(key in out)) throw new Error(`createTheme: unknown token "${path}.${key}"`);
    out[key] = merge(out[key], value, `${path}.${key}`);
  }
  return out;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The CSS custom properties a theme defines, as `[name, value]` pairs. */
export function themeVars(theme: Theme): Array<[string, string]> {
  const vars: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(theme.palette)) vars.push([`--oq-${kebab(k)}`, v]);
  const f = theme.font;
  vars.push(["--oq-font-sans", f.sans], ["--oq-font-mono", f.mono]);
  vars.push(["--oq-line-height", String(f.lineHeight)]);
  // A modular scale off the base size: xs sm md lg xl 2xl 3xl.
  const steps: Array<[string, number]> = [
    ["xs", -3],
    ["sm", -1],
    ["md", 0],
    ["lg", 2],
    ["xl", 4],
    ["2xl", 8],
    ["3xl", 14],
  ];
  for (const [name, d] of steps) vars.push([`--oq-text-${name}`, `${f.size + d}px`]);
  for (const [k, v] of Object.entries(theme.radius)) vars.push([`--oq-radius-${k}`, `${v}px`]);
  vars.push(["--oq-space", `${theme.spaceUnit}px`]);
  for (const [k, v] of Object.entries(theme.control)) vars.push([`--oq-control-${k}`, `${v}px`]);
  for (const [k, v] of Object.entries(theme.shadow)) vars.push([`--oq-shadow-${k}`, v]);
  vars.push(["--oq-motion", `${theme.motion}ms`]);
  vars.push(["color-scheme", theme.mode]);
  return vars;
}

/** A CSS rule setting a theme's variables on `selector`. */
export function themeToCss(theme: Theme, selector = `[data-theme="${theme.name}"]`): string {
  const body = themeVars(theme)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}\n`;
}

/** Inline-style object for a theme, for setting one on an element from script. */
export function themeStyle(theme: Theme): Record<string, string> {
  return Object.fromEntries(themeVars(theme));
}
