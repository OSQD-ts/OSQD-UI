/**
 * Spot illustrations for empty and error states, 160×120, in the same line style as the icons.
 *
 * Colours are theme variables with dark-theme fallbacks, set through `style` (CSS variables do
 * not resolve in presentation attributes everywhere). Inlined in a page they follow the theme;
 * used as an <img> they render with the fallbacks.
 *
 * `scripts/icons.mjs` writes assets/illustrations/*.svg from this file and sets/*.ts.
 */

import { robot, s, shadow, shieldShape, sparkle, v, windowCard } from "./draw";
import type { IllustrationName } from "./names.generated";
import { illustrationSets } from "./sets/index";
import { type IllustrationCategory, illustrationCategoryLabels, illustrationCategoryNames } from "./categories";

export { type IllustrationCategory, illustrationCategoryLabels, illustrationCategoryNames };
export type { IllustrationName };

const baseIllustrations: Record<string, string> = {
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

  // ---- Empty states ----
  "start-search":
    shadow +
    `<circle cx="70" cy="54" r="30" ${s(v.raised, v.primary, "stroke-width:5")}/>` +
    `<path d="M92 76l24 24" ${s("none", v.primary, "stroke-width:9")}/>` +
    `<path d="M56 46a16 16 0 0 1 14-10" ${s("none", v.faint, "stroke-width:3")}/>` +
    sparkle(122, 30, 8, v.warning) +
    sparkle(30, 26, 5, v.secondary) +
    sparkle(132, 62, 4, v.primary),

  "no-notifications":
    shadow +
    `<path d="M50 80V56a26 26 0 0 1 52 0v24l8 10H42z" ${s(v.surface, v.line)}/>` +
    `<path d="M68 96a8 8 0 0 0 16 0" ${s("none", v.line, "stroke-width:3")}/>` +
    `<path d="M76 30v-6" ${s("none", v.line, "stroke-width:3")}/>` +
    `<path d="M112 22h12l-12 14h12M128 40h8l-8 10h8" ${s("none", v.primary, "stroke-width:3")}/>`,

  "no-logs":
    shadow +
    windowCard(24, 14, 112, 84) +
    `<path d="M38 46l10 8-10 8" ${s("none", v.success, "stroke-width:3")}/>` +
    `<rect x="56" y="58" width="12" height="4" rx="1" ${s(v.primary)}/>` +
    `<path d="M38 76h44M38 86h28" ${s("none", v.raised, "stroke-width:4")}/>`,

  "all-clear":
    shadow +
    `<path d="M16 72h34l8-10 8 10h44" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<path d="M110 72h34" ${s("none", v.success, "stroke-width:3")}/>` +
    `<circle cx="104" cy="44" r="22" ${s(v.raised, v.success, "stroke-width:3")}/>` +
    `<path d="M94 44l7 7 13-14" ${s("none", v.success, "stroke-width:5")}/>` +
    `<path d="M34 30c6-6 14-6 20 0M38 38c4-3 8-3 12 0" ${s("none", v.primary, "stroke-width:3")}/>`,

  // ---- Errors and limits ----
  "connection-lost":
    shadow +
    `<rect x="20" y="40" width="40" height="44" rx="5" ${s(v.surface, v.line)}/>` +
    `<path d="M28 52h24M28 62h24M28 72h16" ${s("none", v.faint)}/>` +
    `<rect x="100" y="40" width="40" height="44" rx="5" ${s(v.surface, v.line)}/>` +
    `<path d="M108 52h24M108 62h24M108 72h16" ${s("none", v.faint)}/>` +
    `<path d="M60 62h10M90 62h10" ${s("none", v.line, "stroke-width:4")}/>` +
    `<path d="M74 52l-4 10h8l-4 10M86 52l4 10h-8l4 10" ${s("none", v.danger, "stroke-width:3")}/>`,

  timeout:
    shadow +
    `<path d="M54 18h52M54 98h52" ${s("none", v.line, "stroke-width:5")}/>` +
    `<path d="M60 18c0 22 20 26 20 40s-20 18-20 40h40c0-22-20-26-20-40s20-18 20-40z" ${s(v.surface, v.line)}/>` +
    `<path d="M68 90c2-10 12-14 12-20 0 6 10 10 12 20z" ${s(v.warning)}/>` +
    `<circle cx="120" cy="34" r="14" ${s(v.raised, v.danger, "stroke-width:3")}/>` +
    `<path d="M120 26v9l6 4" ${s("none", v.danger, "stroke-width:3")}/>`,

  "rate-limited":
    shadow +
    `<path d="M30 92a50 50 0 0 1 100 0" ${s("none", v.raised, "stroke-width:12")}/>` +
    `<path d="M30 92a50 50 0 0 1 72-45" ${s("none", v.primary, "stroke-width:12")}/>` +
    `<path d="M114 58a50 50 0 0 1 16 34" ${s("none", v.danger, "stroke-width:12")}/>` +
    `<path d="M80 92l34-30" ${s("none", v.text, "stroke-width:5")}/>` +
    `<circle cx="80" cy="92" r="8" ${s(v.surface, v.line, "stroke-width:3")}/>` +
    `<path d="M108 34l14 14" ${s("none", v.danger, "stroke-width:5")}/>`,

  maintenance:
    shadow +
    `<circle cx="66" cy="58" r="22" ${s(v.surface, v.line, "stroke-width:10;stroke-dasharray:8 6")}/>` +
    `<circle cx="66" cy="58" r="20" ${s(v.raised, v.line)}/>` +
    `<circle cx="66" cy="58" r="8" ${s(v.surface, v.line)}/>` +
    `<path d="M126 26a14 14 0 0 0-18 18l-24 24 8 8 24-24a14 14 0 0 0 18-18l-8 8-8-2-2-8z" ${s(v.primary, v.primary)}/>`,

  "coming-soon":
    shadow +
    `<path d="M80 16l24 72H56z" ${s(v.warning, v.warning)}/>` +
    `<path d="M70 46h20M64 66h32" ${s("none", v.surface, "stroke-width:7")}/>` +
    `<rect x="46" y="88" width="68" height="10" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="16" y="54" width="34" height="10" rx="2" ${s(v.surface, v.line)}/>` +
    `<path d="M22 54l8 10M34 54l8 10" ${s("none", v.danger, "stroke-width:3")}/>` +
    `<rect x="110" y="54" width="34" height="10" rx="2" ${s(v.surface, v.line)}/>` +
    `<path d="M116 54l8 10M128 54l8 10" ${s("none", v.danger, "stroke-width:3")}/>` +
    `<path d="M22 64v32M44 64v32M116 64v32M138 64v32" ${s("none", v.line, "stroke-width:3")}/>`,

  // ---- Security ----
  "access-denied":
    shadow +
    shieldShape(80, 12, v.surface, v.line) +
    `<path d="M68 82V50a4 4 0 0 1 8 0v18-24a4 4 0 0 1 8 0v24-20a4 4 0 0 1 8 0v26-14a4 4 0 0 1 8 0v18c0 10-6 16-16 16h-6c-6 0-10-4-14-10l-6-10a4 4 0 0 1 6-5z" ${s(v.danger, v.danger, "stroke-linejoin:round")}/>`,

  "bot-blocked":
    shadow +
    robot(72, 40) +
    `<circle cx="118" cy="78" r="18" ${s(v.surface, v.danger, "stroke-width:5")}/>` +
    `<path d="M106 66l24 24" ${s("none", v.danger, "stroke-width:5")}/>`,

  honeypot:
    shadow +
    `<rect x="56" y="16" width="48" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    `<path d="M60 28c-14 8-22 20-22 36 0 22 18 34 42 34s42-12 42-34c0-16-8-28-22-36z" ${s(v.surface, v.line)}/>` +
    `<path d="M40 60h80c2 4 2 8 2 4 0 20-18 30-42 30s-42-10-42-30c0 4 0 0 2-4z" ${s(v.warning)}/>` +
    `<path d="M64 60v10a4 4 0 0 0 8 0V60" ${s(v.warning)}/>` +
    `<ellipse cx="88" cy="76" rx="9" ry="6" ${s(v.surface, v.line)}/>` +
    `<path d="M80 72l-5-4M80 80l-5 4M96 72l5-4M96 80l5 4M88 70v-6" ${s("none", v.line, "stroke-width:2")}/>` +
    sparkle(128, 26, 6, v.primary),

  "two-factor":
    shadow +
    `<rect x="54" y="10" width="52" height="92" rx="9" ${s(v.surface, v.line)}/>` +
    `<path d="M74 18h12" ${s("none", v.line, "stroke-width:3")}/>` +
    [62, 74, 86].map((x) => `<rect x="${x - 5}" y="44" width="10" height="16" rx="2" ${s(v.raised, v.primary, "stroke-width:2")}/>`).join("") +
    [62, 74, 86].map((x) => `<circle cx="${x}" cy="52" r="2" ${s(v.primary)}/>`).join("") +
    `<path d="M66 74h28" ${s("none", v.faint, "stroke-width:3")}/>` +
    shieldShape(124, 52, v.raised, v.success, 0.42) +
    `<path d="M117 66l5 5 9-9" ${s("none", v.success, "stroke-width:3")}/>`,

  "api-keys":
    shadow +
    `<circle cx="56" cy="62" r="20" ${s(v.raised, v.primary, "stroke-width:5")}/>` +
    `<circle cx="56" cy="62" r="7" ${s(v.surface, v.primary, "stroke-width:3")}/>` +
    `<path d="M74 54l52-26M110 36l8 12M120 31l6 10" ${s("none", v.primary, "stroke-width:6")}/>` +
    `<path d="M100 72l-8 8 8 8M124 72l8 8-8 8M116 70l-8 20" ${s("none", v.secondary, "stroke-width:3")}/>`,

  // ---- Onboarding ----
  welcome:
    shadow +
    windowCard(30, 22, 100, 76) +
    `<circle cx="80" cy="58" r="12" ${s(v.raised, v.primary, "stroke-width:3")}/>` +
    `<path d="M62 86a18 14 0 0 1 36 0" ${s("none", v.primary, "stroke-width:3")}/>` +
    sparkle(24, 24, 7, v.warning) +
    sparkle(140, 18, 6, v.secondary) +
    sparkle(146, 82, 5, v.primary) +
    `<circle cx="18" cy="68" r="3" ${s(v.success)}/>`,

  "setup-complete":
    shadow +
    `<rect x="40" y="12" width="80" height="88" rx="6" ${s(v.surface, v.line)}/>` +
    [32, 54, 76]
      .map(
        (y) =>
          `<rect x="52" y="${y - 7}" width="14" height="14" rx="3" ${s(v.success)}/>` +
          `<path d="M55 ${y}l3 3 6-6" ${s("none", v.surface, "stroke-width:3")}/>` +
          `<path d="M74 ${y}h32" ${s("none", v.faint, "stroke-width:3")}/>`,
      )
      .join("") +
    sparkle(132, 24, 7, v.warning),

  launch:
    shadow +
    `<path d="M80 12c16 12 22 30 18 54H62c-4-24 2-42 18-54z" ${s(v.raised, v.line)}/>` +
    `<circle cx="80" cy="40" r="8" ${s(v.primary, v.line)}/>` +
    `<path d="M62 56l-12 12v10l14-6M98 56l12 12v10l-14-6" ${s(v.surface, v.line)}/>` +
    `<path d="M70 66l10 0 10 0-4 18-6 10-6-10z" ${s(v.warning)}/>` +
    `<path d="M76 72l4 0 4 0-2 12-2 4-2-4z" ${s(v.danger)}/>` +
    sparkle(30, 30, 6, v.secondary) +
    sparkle(130, 44, 5, v.primary) +
    `<circle cx="120" cy="18" r="2.5" ${s(v.warning)}/><circle cx="40" cy="64" r="2.5" ${s(v.warning)}/>`,

  // ---- Activity ----
  upload:
    shadow +
    `<rect x="22" y="14" width="116" height="84" rx="10" ${s(v.surface, v.line, "stroke-width:2;stroke-dasharray:7 6")}/>` +
    `<path d="M64 30h24l12 12v34a4 4 0 0 1-4 4H64a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4z" ${s(v.raised, v.line)}/>` +
    `<path d="M88 30v12h12" ${s("none", v.line)}/>` +
    `<path d="M80 72V50M71 59l9-9 9 9" ${s("none", v.primary, "stroke-width:4")}/>`,

  "data-import":
    shadow +
    `<path d="M24 26h24l10 10v34a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3V29a3 3 0 0 1 3-3z" ${s(v.raised, v.line)}/>` +
    `<path d="M28 44h20M28 52h20M28 60h14" ${s("none", v.faint)}/>` +
    `<path d="M64 50h20M76 42l8 8-8 8" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<ellipse cx="116" cy="30" rx="22" ry="8" ${s(v.raised, v.line)}/>` +
    `<path d="M94 30v52c0 4.4 9.8 8 22 8s22-3.6 22-8V30" ${s(v.surface, v.line)}/>` +
    `<path d="M94 48c0 4.4 9.8 8 22 8s22-3.6 22-8M94 66c0 4.4 9.8 8 22 8s22-3.6 22-8" ${s("none", v.line)}/>` +
    `<circle cx="104" cy="58" r="2.5" ${s(v.success)}/>`,

  syncing:
    shadow +
    `<path d="M58 78a16 16 0 0 1-2-31.8 22 22 0 0 1 42.6 4.6A13 13 0 0 1 102 78z" ${s(v.surface, v.line)}/>` +
    `<path d="M120 52a40 40 0 0 0-70-24" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<path d="M48 18l2 11 11-2" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<path d="M40 70a40 40 0 0 0 70 24" ${s("none", v.secondary, "stroke-width:4")}/>` +
    `<path d="M112 104l-2-11-11 2" ${s("none", v.secondary, "stroke-width:4")}/>`,

  // ---- Round 2 ----
  "empty-folder":
    shadow +
    `<path d="M28 36a6 6 0 0 1 6-6h24l8 8h60a6 6 0 0 1 6 6v46a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6z" ${s(v.surface, v.line)}/>` +
    `<path d="M28 50h104" ${s("none", v.line)}/>` +
    `<path d="M66 72h28" ${s("none", v.faint, "stroke-width:3;stroke-dasharray:4 5")}/>` +
    sparkle(138, 22, 6, v.primary),

  "empty-table":
    shadow +
    `<rect x="24" y="16" width="112" height="82" rx="6" ${s(v.surface, v.line)}/>` +
    `<rect x="24" y="16" width="112" height="16" rx="6" ${s(v.raised, v.line)}/>` +
    `<path d="M24 50h112M24 66h112M24 82h112M60 16v82M100 16v82" ${s("none", v.line)}/>` +
    `<path d="M34 24h16M70 24h20M110 24h16" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<circle cx="80" cy="66" r="13" ${s(v.raised, v.primary, "stroke-width:3")}/>` +
    `<path d="M80 60v12M74 66h12" ${s("none", v.primary, "stroke-width:3")}/>`,

  "empty-cart":
    shadow +
    `<path d="M26 26h14l12 52h64l10-38H46" ${s("none", v.line, "stroke-width:4")}/>` +
    `<path d="M48 40h78l-9 34H56z" ${s(v.surface, v.line)}/>` +
    `<circle cx="60" cy="92" r="7" ${s(v.raised, v.line)}/><circle cx="110" cy="92" r="7" ${s(v.raised, v.line)}/>` +
    `<path d="M76 56h22" ${s("none", v.faint, "stroke-width:3;stroke-dasharray:4 5")}/>`,

  "trash-empty":
    shadow +
    `<path d="M54 34h52l-5 62a4 4 0 0 1-4 4H63a4 4 0 0 1-4-4z" ${s(v.surface, v.line)}/>` +
    `<rect x="46" y="26" width="68" height="10" rx="3" ${s(v.raised, v.line)}/>` +
    `<path d="M72 26v-6h16v6" ${s("none", v.line)}/>` +
    `<path d="M70 48v40M80 48v40M90 48v40" ${s("none", v.faint, "stroke-width:2")}/>` +
    sparkle(126, 28, 7, v.success) +
    sparkle(34, 50, 5, v.primary),

  "no-location":
    shadow +
    `<path d="M30 30l30-10 40 10 30-10v66l-30 10-40-10-30 10z" ${s(v.surface, v.line)}/>` +
    `<path d="M60 20v66M100 30v66" ${s("none", v.line)}/>` +
    `<path d="M80 22c12 0 20 8 20 19 0 14-20 33-20 33S60 55 60 41c0-11 8-19 20-19z" ${s(v.raised, v.warning, "stroke-width:3")}/>` +
    `<path d="M74 35l12 12M86 35 74 47" ${s("none", v.warning, "stroke-width:3")}/>`,

  "archive-empty":
    shadow +
    `<rect x="34" y="20" width="92" height="20" rx="4" ${s(v.raised, v.line)}/>` +
    `<path d="M40 40h80v52a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4z" ${s(v.surface, v.line)}/>` +
    `<rect x="68" y="50" width="24" height="9" rx="4" ${s(v.raised, v.line)}/>` +
    `<path d="M66 78h28" ${s("none", v.faint, "stroke-width:3;stroke-dasharray:4 5")}/>`,

  "audit-log-empty":
    shadow +
    `<rect x="42" y="12" width="76" height="90" rx="6" ${s(v.surface, v.line)}/>` +
    [30, 48, 66].map((y) => `<circle cx="58" cy="${y}" r="4" ${s(v.raised, v.line)}/><path d="M68 ${y}h34" ${s("none", v.faint, "stroke-width:2;stroke-dasharray:3 4")}/>`).join("") +
    `<path d="M58 34v10M58 52v10" ${s("none", v.line)}/>` +
    shieldShape(116, 62, v.raised, v.success, 0.4) +
    `<path d="M109 76l5 5 9-9" ${s("none", v.success, "stroke-width:3")}/>`,

  // errors and limits
  "unsupported-browser":
    shadow +
    windowCard(26, 18, 108, 80) +
    `<circle cx="80" cy="64" r="20" ${s(v.raised, v.warning, "stroke-width:4")}/>` +
    `<path d="M66 50l28 28" ${s("none", v.warning, "stroke-width:4")}/>`,

  "quota-exceeded":
    shadow +
    `<path d="M30 84a50 50 0 0 1 100 0" ${s("none", v.line, "stroke-width:10")}/>` +
    `<path d="M30 84a50 50 0 0 1 86-34.6" ${s("none", v.success, "stroke-width:10")}/>` +
    `<path d="M116 49.4A50 50 0 0 1 130 84" ${s("none", v.danger, "stroke-width:10")}/>` +
    `<path d="M80 84l30-30" ${s("none", v.text, "stroke-width:4")}/>` +
    `<circle cx="80" cy="84" r="6" ${s(v.raised, v.text, "stroke-width:3")}/>`,

  "payment-failed":
    shadow +
    `<rect x="28" y="30" width="92" height="60" rx="8" ${s(v.surface, v.line)}/>` +
    `<path d="M28 46h92" ${s("none", v.line, "stroke-width:8")}/>` +
    `<path d="M40 74h22M70 74h10" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<circle cx="120" cy="84" r="16" ${s(v.danger)}/>` +
    `<path d="M114 78l12 12M126 78l-12 12" ${s("none", v.surface, "stroke-width:4")}/>`,

  "session-expired":
    shadow +
    windowCard(24, 18, 100, 76) +
    `<path d="M48 52h52M48 64h36" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<circle cx="118" cy="78" r="20" ${s(v.raised, v.warning, "stroke-width:4")}/>` +
    `<path d="M118 66v12l8 5" ${s("none", v.warning, "stroke-width:4")}/>`,

  // account
  "verify-email":
    shadow +
    `<rect x="26" y="28" width="96" height="64" rx="6" ${s(v.surface, v.line)}/>` +
    `<path d="M28 32l46 34 46-34" ${s("none", v.line, "stroke-width:3")}/>` +
    `<circle cx="122" cy="84" r="16" ${s(v.primary)}/>` +
    `<path d="M114 84l6 6 10-11" ${s("none", v.surface, "stroke-width:4")}/>`,

  "email-sent":
    shadow +
    `<path d="M22 58 132 22 108 96 80 72z" ${s(v.surface, v.line)}/>` +
    `<path d="M132 22 80 72v24l14-14" ${s(v.raised, v.line)}/>` +
    `<path d="M20 84h22M12 96h22M26 72h12" ${s("none", v.primary, "stroke-width:3")}/>`,

  "password-reset":
    shadow +
    `<rect x="18" y="44" width="86" height="30" rx="8" ${s(v.surface, v.line)}/>` +
    [32, 46, 60, 74].map((x) => `<circle cx="${x}" cy="59" r="4" ${s(v.faint)}/>`).join("") +
    `<path d="M138 59a14 14 0 1 1-4.1-9.9" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<path d="M125.5 49.5h8.5v-8.5" ${s("none", v.primary, "stroke-width:4")}/>`,

  "account-locked":
    shadow +
    `<circle cx="66" cy="40" r="16" ${s(v.raised, v.line)}/>` +
    `<path d="M36 96a30 26 0 0 1 60 0z" ${s(v.raised, v.line)}/>` +
    `<rect x="98" y="58" width="36" height="30" rx="6" ${s(v.danger)}/>` +
    `<path d="M106 58v-8a10 10 0 0 1 20 0v8" ${s("none", v.danger, "stroke-width:4")}/>` +
    `<circle cx="116" cy="72" r="4" ${s(v.surface)}/>`,

  "no-team":
    shadow +
    `<circle cx="80" cy="42" r="15" ${s(v.raised, v.line)}/>` +
    `<path d="M52 98a28 24 0 0 1 56 0z" ${s(v.raised, v.line)}/>` +
    `<circle cx="36" cy="54" r="11" ${s("none", v.faint, "stroke-width:2;stroke-dasharray:4 4")}/>` +
    `<circle cx="124" cy="54" r="11" ${s("none", v.faint, "stroke-width:2;stroke-dasharray:4 4")}/>` +
    `<path d="M124 48v12M118 54h12M36 48v12M30 54h12" ${s("none", v.primary, "stroke-width:3")}/>`,

  "invite-sent":
    shadow +
    `<rect x="34" y="34" width="72" height="50" rx="5" ${s(v.surface, v.line)}/>` +
    `<path d="M36 38l34 26 34-26" ${s("none", v.line, "stroke-width:3")}/>` +
    `<circle cx="120" cy="40" r="12" ${s(v.raised, v.line)}/>` +
    `<path d="M102 80a18 16 0 0 1 36 0z" ${s(v.raised, v.line)}/>` +
    `<path d="M114 58l4 4 8-8" ${s("none", v.success, "stroke-width:3")}/>` +
    sparkle(26, 26, 6, v.warning),

  privacy:
    shadow +
    shieldShape(80, 14, v.raised, v.primary) +
    `<circle cx="80" cy="54" r="16" ${s(v.surface, v.line)}/>` +
    `<circle cx="74" cy="50" r="2.5" ${s(v.faint)}/><circle cx="86" cy="56" r="2.5" ${s(v.faint)}/><circle cx="76" cy="61" r="2.5" ${s(v.faint)}/>` +
    `<path d="M68 86l8 8 16-16" ${s("none", v.success, "stroke-width:4")}/>`,

  // data and reports
  "export-ready":
    shadow +
    `<path d="M44 14h44l20 20v58a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" ${s(v.surface, v.line)}/>` +
    `<path d="M88 14v20h20" ${s("none", v.line)}/>` +
    `<path d="M52 46h40M52 56h40M52 66h28" ${s("none", v.faint)}/>` +
    `<circle cx="112" cy="84" r="16" ${s(v.success)}/>` +
    `<path d="M112 76v14M106 85l6 6 6-6" ${s("none", v.surface, "stroke-width:3")}/>`,

  "report-ready":
    shadow +
    `<rect x="34" y="12" width="76" height="90" rx="6" ${s(v.surface, v.line)}/>` +
    `<path d="M46 30h36" ${s("none", v.text, "stroke-width:3")}/>` +
    `<path d="M48 82V66M60 82V54M72 82V60M84 82V46M96 82V58" ${s("none", v.primary, "stroke-width:6")}/>` +
    `<circle cx="120" cy="28" r="14" ${s(v.success)}/>` +
    `<path d="M113 28l5 5 9-9" ${s("none", v.surface, "stroke-width:3")}/>`,

  "backup-complete":
    shadow +
    `<ellipse cx="64" cy="28" rx="30" ry="10" ${s(v.raised, v.line)}/>` +
    `<path d="M34 28v52c0 5.5 13.4 10 30 10s30-4.5 30-10V28" ${s(v.surface, v.line)}/>` +
    `<path d="M34 46c0 5.5 13.4 10 30 10s30-4.5 30-10M34 64c0 5.5 13.4 10 30 10s30-4.5 30-10" ${s("none", v.line)}/>` +
    shieldShape(118, 40, v.raised, v.success, 0.55) +
    `<path d="M108 60l7 7 12-12" ${s("none", v.success, "stroke-width:4")}/>`,

  "restore-data":
    shadow +
    `<ellipse cx="88" cy="36" rx="28" ry="9" ${s(v.raised, v.line)}/>` +
    `<path d="M60 36v46c0 5 12.5 9 28 9s28-4 28-9V36" ${s(v.surface, v.line)}/>` +
    `<path d="M60 58c0 5 12.5 9 28 9s28-4 28-9" ${s("none", v.line)}/>` +
    `<path d="M44 84a40 40 0 0 1 0-52" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<path d="M34 34l10-2 2 10" ${s("none", v.primary, "stroke-width:4")}/>`,

  migration:
    shadow +
    `<rect x="16" y="34" width="44" height="52" rx="5" ${s(v.surface, v.line)}/>` +
    `<path d="M24 48h28M24 58h28M24 68h20" ${s("none", v.faint)}/>` +
    `<rect x="100" y="34" width="44" height="52" rx="5" ${s(v.raised, v.primary, "stroke-width:2")}/>` +
    `<path d="M108 48h28M108 58h28M108 68h20" ${s("none", v.primary)}/>` +
    `<path d="M66 60h28M86 52l8 8-8 8" ${s("none", v.secondary, "stroke-width:4")}/>` +
    `<path d="M66 44h8M80 44h8" ${s("none", v.secondary, "stroke-width:3")}/>`,

  // onboarding and news
  "new-feature":
    shadow +
    windowCard(28, 22, 104, 76) +
    `<rect x="40" y="48" width="44" height="10" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="40" y="66" width="30" height="10" rx="3" ${s(v.raised, v.line)}/>` +
    `<rect x="94" y="46" width="28" height="14" rx="7" ${s(v.secondary)}/>` +
    sparkle(132, 24, 8, v.warning) +
    sparkle(22, 36, 5, v.primary),

  "update-available":
    shadow +
    `<rect x="44" y="12" width="72" height="88" rx="10" ${s(v.surface, v.line)}/>` +
    `<circle cx="80" cy="54" r="20" ${s(v.raised, v.primary, "stroke-width:4")}/>` +
    `<path d="M80 64V44M72 52l8-8 8 8" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<path d="M62 86h36" ${s("none", v.faint, "stroke-width:3")}/>` +
    `<circle cx="114" cy="16" r="7" ${s(v.danger)}/>`,

  "feedback-thanks":
    shadow +
    `<path d="M28 22h80a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H62l-18 16V78H28a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z" ${s(v.surface, v.line)}/>` +
    `<path d="M68 64s-18-10-18-22a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 22-18 22z" ${s(v.danger)}/>` +
    sparkle(130, 30, 7, v.warning) +
    sparkle(136, 70, 5, v.secondary),

  "contact-support":
    shadow +
    `<circle cx="80" cy="54" r="30" ${s(v.raised, v.line)}/>` +
    `<path d="M50 56v-4a30 30 0 0 1 60 0v4" ${s("none", v.primary, "stroke-width:5")}/>` +
    `<rect x="42" y="52" width="14" height="22" rx="5" ${s(v.primary)}/>` +
    `<rect x="104" y="52" width="14" height="22" rx="5" ${s(v.primary)}/>` +
    `<path d="M111 74c0 12-10 18-24 18" ${s("none", v.primary, "stroke-width:3")}/>` +
    `<circle cx="84" cy="92" r="4" ${s(v.primary)}/>` +
    `<path d="M70 50h4M86 50h4M72 64a10 8 0 0 0 16 0" ${s("none", v.faint, "stroke-width:3")}/>`,

  "integration-connected":
    shadow +
    `<rect x="18" y="38" width="40" height="40" rx="10" ${s(v.raised, v.line)}/>` +
    `<rect x="102" y="38" width="40" height="40" rx="10" ${s(v.raised, v.line)}/>` +
    `<path d="M30 58h16M38 50v16" ${s("none", v.primary, "stroke-width:4")}/>` +
    `<circle cx="122" cy="58" r="8" ${s("none", v.secondary, "stroke-width:4")}/>` +
    `<path d="M58 58h44" ${s("none", v.line, "stroke-width:3;stroke-dasharray:5 5")}/>` +
    `<circle cx="80" cy="58" r="12" ${s(v.success)}/>` +
    `<path d="M74 58l4 4 8-8" ${s("none", v.surface, "stroke-width:3")}/>`,

  // activity
  scheduled:
    shadow +
    `<rect x="28" y="22" width="84" height="74" rx="6" ${s(v.surface, v.line)}/>` +
    `<path d="M28 40h84M48 14v16M92 14v16" ${s("none", v.line, "stroke-width:3")}/>` +
    [52, 68].map((y) => [42, 58, 74, 90].map((x) => `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" ${s(v.raised)}/>`).join("")).join("") +
    `<circle cx="120" cy="80" r="20" ${s(v.raised, v.primary, "stroke-width:4")}/>` +
    `<path d="M120 68v12l8 4" ${s("none", v.primary, "stroke-width:4")}/>`,

  "queue-waiting":
    shadow +
    [24, 52, 80, 108]
      .map((x, i) => `<rect x="${x}" y="46" width="24" height="30" rx="5" ${s(i === 3 ? v.primary : v.raised, v.line)}/>`)
      .join("") +
    `<path d="M24 90h108" ${s("none", v.line, "stroke-width:3")}/>` +
    `<path d="M118 34l6-6M110 30l2-8M124 42h8" ${s("none", v.primary, "stroke-width:3")}/>` +
    `<circle cx="36" cy="61" r="3" ${s(v.faint)}/><circle cx="64" cy="61" r="3" ${s(v.faint)}/><circle cx="92" cy="61" r="3" ${s(v.faint)}/>`,

  processing:
    shadow +
    `<circle cx="80" cy="56" r="34" ${s("none", v.line, "stroke-width:8")}/>` +
    `<path d="M80 22a34 34 0 0 1 34 34" ${s("none", v.primary, "stroke-width:8")}/>` +
    `<circle cx="80" cy="56" r="20" ${s(v.raised, v.line)}/>` +
    `<path d="M72 50h16M72 56h16M72 62h10" ${s("none", v.faint, "stroke-width:2")}/>`,

  "incident-resolved":
    shadow +
    `<path d="M80 18l40 70H40z" ${s(v.surface, v.line)}/>` +
    `<path d="M80 44v20" ${s("none", v.faint, "stroke-width:5")}/>` +
    `<circle cx="80" cy="74" r="3" ${s(v.faint)}/>` +
    `<circle cx="116" cy="80" r="18" ${s(v.success)}/>` +
    `<path d="M108 80l6 6 11-12" ${s("none", v.surface, "stroke-width:4")}/>`,

  "alert-firing":
    shadow +
    `<path d="M56 86V60a24 24 0 0 1 48 0v26z" ${s(v.danger)}/>` +
    `<rect x="48" y="86" width="64" height="12" rx="3" ${s(v.raised, v.line)}/>` +
    `<path d="M68 60a12 12 0 0 1 12-12" ${s("none", v.surface, "stroke-width:4")}/>` +
    `<path d="M80 12v12M40 26l8 8M120 26l-8 8M28 58h12M120 58h12" ${s("none", v.warning, "stroke-width:4")}/>`,

} satisfies Record<string, string>;

/** Which kind of state each illustration in this file is for. */
const baseCategories: Record<string, IllustrationCategory> = {
  "empty-inbox": "empty",
  "no-results": "empty",
  "start-search": "empty",
  "no-data": "empty",
  "no-notifications": "empty",
  "no-logs": "empty",
  "all-clear": "empty",
  "error-404": "errors",
  "server-error": "errors",
  offline: "errors",
  "connection-lost": "errors",
  timeout: "errors",
  "rate-limited": "errors",
  maintenance: "errors",
  "coming-soon": "errors",
  locked: "security",
  "access-denied": "security",
  "bot-blocked": "security",
  honeypot: "security",
  "two-factor": "security",
  "api-keys": "security",
  welcome: "onboarding",
  "setup-complete": "onboarding",
  launch: "onboarding",
  success: "onboarding",
  upload: "activity",
  "data-import": "activity",
  syncing: "activity",
  "empty-folder": "empty",
  "empty-table": "empty",
  "empty-cart": "empty",
  "trash-empty": "empty",
  "no-location": "empty",
  "archive-empty": "empty",
  "unsupported-browser": "errors",
  "quota-exceeded": "errors",
  "payment-failed": "errors",
  "session-expired": "errors",
  "privacy": "security",
  "verify-email": "account",
  "email-sent": "account",
  "password-reset": "account",
  "account-locked": "account",
  "no-team": "account",
  "invite-sent": "account",
  "export-ready": "data",
  "report-ready": "data",
  "backup-complete": "data",
  "restore-data": "data",
  "migration": "data",
  "audit-log-empty": "data",
  "new-feature": "onboarding",
  "update-available": "onboarding",
  "feedback-thanks": "onboarding",
  "contact-support": "onboarding",
  "integration-connected": "onboarding",
  "scheduled": "activity",
  "queue-waiting": "activity",
  "processing": "activity",
  "incident-resolved": "activity",
  "alert-firing": "activity",
};

const merged: Record<string, string> = { ...baseIllustrations };
const categoryOf: Record<string, IllustrationCategory> = { ...baseCategories };
for (const [file, set] of Object.entries(illustrationSets)) {
  for (const [cat, entries] of Object.entries(set) as Array<[IllustrationCategory, Record<string, string>]>) {
    if (!illustrationCategoryNames.includes(cat)) throw new Error(`illustrations: sets/${file}.ts uses unknown category "${cat}"`);
    for (const [n, svg] of Object.entries(entries)) {
      if (n in merged) throw new Error(`illustrations: "${n}" is defined twice (again in sets/${file}.ts)`);
      merged[n] = svg;
      categoryOf[n] = cat;
    }
  }
}
for (const n of Object.keys(baseIllustrations)) if (!(n in baseCategories)) throw new Error(`illustrations: "${n}" has no category`);

export const illustrations = merged as Record<IllustrationName, string>;

export const illustrationNames = Object.keys(illustrations) as IllustrationName[];

/** Which kind of state each illustration is for. */
export const illustrationCategories = categoryOf as Record<IllustrationName, IllustrationCategory>;

/** A complete <svg> string for one illustration. */
export function illustrationSvg(name: IllustrationName, options: { width?: number; title?: string } = {}): string {
  const inner = illustrations[name];
  if (inner === undefined) throw new Error(`illustrationSvg: unknown illustration "${String(name)}"`);
  const { width = 160, title } = options;
  const height = Math.round((width * 120) / 160);
  const a11y = title ? ` role="img" aria-label="${title.replace(/"/g, "&quot;")}"` : ` aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 160 120" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${a11y}>${inner}</svg>`;
}
