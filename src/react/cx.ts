/** Joins class names, skipping falsy entries. */
export function cx(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(" ");
}

export type Color = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral";
export type Size = "sm" | "md" | "lg";

/** `.oq-<color>` — the intent class every component reads its colour from. */
export const colorClass = (color: Color | undefined) => (color ? `oq-${color}` : undefined);
/** `.oq-sm` / `.oq-lg`; md is the default and has no class. */
export const sizeClass = (size: Size | undefined) => (size && size !== "md" ? `oq-${size}` : undefined);
