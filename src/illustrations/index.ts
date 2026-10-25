/**
 * Spot illustrations for empty and error states, 160×120, in the same line style as the icons.
 *
 * Colours are theme variables with dark-theme fallbacks, set through `style` (CSS variables do
 * not resolve in presentation attributes everywhere). Inlined in a page they follow the theme;
 * used as an <img> they render with the fallbacks.
 *
 * `scripts/icons.mjs` writes assets/illustrations/*.svg from this file. No runtime imports.
 */

const v = {
  shadow: "var(--oq-hover, #403e41)",
  surface: "var(--oq-surface, #2d2a2e)",
  raised: "var(--oq-raised, #363337)",
  line: "var(--oq-border-strong, #5b595c)",
  faint: "var(--oq-text-faint, #939293)",
  primary: "var(--oq-primary, #78dce8)",
  secondary: "var(--oq-secondary, #ab9df2)",
  success: "var(--oq-success, #a9dc76)",
  warning: "var(--oq-warning, #ffd866)",
  danger: "var(--oq-danger, #ff6188)",
};

/** style="fill:…;stroke:…" — `none` for either is allowed. */
const s = (fill: string, stroke = "none", extra = "") =>
  `style="fill:${fill};stroke:${stroke}${extra ? `;${extra}` : ""}"`;

const shadow = `<ellipse cx="80" cy="106" rx="54" ry="6" ${s(v.shadow)}/>`;

export const illustrations = {
  "empty-inbox":
    shadow +
    `<path d="M30 62 44 32h72l14 30v30a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4z" ${s(v.surface, v.line)}/>` +
    `<path d="M30 62h28l6 10h32l6-10h28v30a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4z" ${s(v.raised, v.line)}/>` +
    `<path d="M80 12v10M60 18l5 7M100 18l-5 7" ${s("none", v.primary, "stroke-width:3")}/>`,

  "no-results":
    shadow +
    `<rect x="32" y="16" width="60" height="80" rx="6" ${s(v.surface, v.line)}/>` +
    `<path d="M44 34h36M44 46h30M44 58h22" ${s("none", v.faint)}/>` +
    `<circle cx="100" cy="64" r="22" ${s(v.raised, v.primary, "stroke-width:4")}/>` +
    `<path d="M93 57l14 14M107 57 93 71" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<path d="M116 80l16 16" ${s("none", v.primary, "stroke-width:7")}/>`,

  "error-404":
    shadow +
    `<rect x="22" y="14" width="116" height="84" rx="6" ${s(v.surface, v.line)}/>` +
    `<path d="M22 28h116" ${s("none", v.line)}/>` +
    `<circle cx="31" cy="21" r="2" ${s(v.danger)}/><circle cx="38" cy="21" r="2" ${s(v.warning)}/><circle cx="45" cy="21" r="2" ${s(v.success)}/>` +
    `<text x="80" y="72" text-anchor="middle" font-family="system-ui, sans-serif" font-size="32" font-weight="700" ${s(v.warning)}>404</text>` +
    `<path d="M58 84h44" ${s("none", v.faint, "stroke-width:2;stroke-dasharray:4 5")}/>`,

  "server-error":
    shadow +
    [22, 50, 78]
      .map(
        (y, i) =>
          `<rect x="36" y="${y}" width="68" height="22" rx="4" ${s(v.surface, v.line)}/>` +
          `<circle cx="47" cy="${y + 11}" r="3" ${s([v.success, v.danger, v.faint][i] as string)}/>` +
          `<path d="M60 ${y + 11}h32" ${s("none", v.faint)}/>`,
      )
      .join("") +
    `<path d="M118 44 141 84H95z" ${s(v.danger, v.danger, "stroke-width:4")}/>` +
    `<path d="M118 58v12" ${s("none", v.surface, "stroke-width:4")}/>` +
    `<circle cx="118" cy="77" r="2.2" ${s(v.surface)}/>`,

  offline:
    shadow +
    `<path d="M52 88a20 20 0 0 1-3-39.8 28 28 0 0 1 54.5 6.3A16.8 16.8 0 0 1 106 88z" ${s(v.surface, v.line)}/>` +
    `<path d="M66 70a20 20 0 0 1 28 0M73 77a10 10 0 0 1 14 0" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<path d="M40 24l80 76" ${s("none", v.surface, "stroke-width:10")}/>` +
    `<path d="M40 24l80 76" ${s("none", v.danger, "stroke-width:4")}/>`,

  success:
    shadow +
    `<circle cx="80" cy="58" r="34" ${s(v.raised, v.success, "stroke-width:3")}/>` +
    `<path d="M64 58l12 12 22-24" ${s("none", v.success, "stroke-width:6")}/>` +
    `<path d="M30 30l4 4M126 26l-4 5M134 66h6M22 72h6" ${s("none", v.primary, "stroke-width:3")}/>` +
    `<circle cx="120" cy="96" r="3" ${s(v.warning)}/><circle cx="36" cy="94" r="3" ${s(v.secondary)}/>` +
    `<rect x="110" y="40" width="6" height="6" rx="1" transform="rotate(20 113 43)" ${s(v.warning)}/>` +
    `<rect x="40" y="46" width="6" height="6" rx="1" transform="rotate(-15 43 49)" ${s(v.secondary)}/>`,

  "no-data":
    shadow +
    `<path d="M30 18v74h104" ${s("none", v.line)}/>` +
    [
      [42, 62],
      [64, 46],
      [86, 70],
      [108, 38],
    ]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="${92 - (y as number)}" rx="2" ${s(v.raised, v.faint, "stroke-dasharray:4 4")}/>`)
      .join("") +
    `<path d="M49 54l22-16 22 24 22-30" ${s("none", v.primary, "stroke-width:3;stroke-dasharray:6 6")}/>`,

  locked:
    shadow +
    `<path d="M80 12l38 14v30c0 24-16 40-38 48-22-8-38-24-38-48V26z" ${s(v.surface, v.line)}/>` +
    `<path d="M70 56v-8a10 10 0 0 1 20 0v8" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<rect x="62" y="56" width="36" height="28" rx="4" ${s(v.primary, v.primary)}/>` +
    `<circle cx="80" cy="67" r="3.5" ${s(v.surface)}/>` +
    `<path d="M80 70v6" ${s("none", v.surface, "stroke-width:3")}/>`,
} satisfies Record<string, string>;

export type IllustrationName = keyof typeof illustrations;

export const illustrationNames = Object.keys(illustrations) as IllustrationName[];

/** A complete <svg> string for one illustration. */
export function illustrationSvg(name: IllustrationName, options: { width?: number; title?: string } = {}): string {
  const inner = illustrations[name];
  if (inner === undefined) throw new Error(`illustrationSvg: unknown illustration "${String(name)}"`);
  const { width = 160, title } = options;
  const height = Math.round((width * 120) / 160);
  const a11y = title ? ` role="img" aria-label="${title.replace(/"/g, "&quot;")}"` : ` aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 160 120" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${a11y}>${inner}</svg>`;
}
