/**
 * Filter text ⇄ terms ⇄ JQL.
 *
 * The search-box syntax a QueryBuilder chip stands for:
 *
 *   status:open            equals            { status: { $eq: "open" } }
 *   -status:open           not equal         { status: { $ne: "open" } }
 *   status!=open           not equal (same)
 *   region:eu,us           any of            { region: { $in: ["eu", "us"] } }
 *   p95>250  p95>=250      compare           { p95: { $gt: 250 } }
 *   path~/api              contains          { path: { $contains: "/api", $options: "i" } }
 *   timeout  "conn reset"  free text         { $text: "conn reset" }
 *
 * The output is a plain JQL query document (the OSQD query standard), so a filter typed here
 * can be saved and run by anything that speaks JQL. Several terms are joined with `$and`.
 */

export type FilterOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "text";
export type FilterFieldType = "string" | "number" | "boolean" | "enum";
export type FilterValue = string | number | boolean;

export interface FilterField {
  name: string;
  label?: string;
  type?: FilterFieldType;
  /** Suggested values (and, for `enum`, the only allowed ones). */
  options?: string[];
  /** Operators offered for this field; defaults by type. */
  ops?: FilterOp[];
}

export interface FilterTerm {
  /** Absent for free text. */
  field?: string;
  op: FilterOp;
  value: FilterValue | FilterValue[];
}

export type JqlQuery = Record<string, unknown>;

export const FILTER_OP_SYMBOL: Record<FilterOp, string> = {
  eq: "=",
  ne: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  contains: "contains",
  in: "in",
  text: "",
};

export function filterOpsFor(field: FilterField | undefined): FilterOp[] {
  if (field?.ops) return field.ops;
  switch (field?.type) {
    case "number":
      return ["eq", "ne", "gt", "gte", "lt", "lte", "in"];
    case "boolean":
      return ["eq", "ne"];
    case "enum":
      return ["eq", "ne", "in"];
    default:
      return ["eq", "ne", "contains", "in"];
  }
}

/* ---------- Tokenising ---------- */

/** Splits on spaces outside quotes; quotes are kept on the token so values can tell. */
function tokenize(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of text) {
    if (quote) {
      cur += ch;
      if (ch === quote || (quote === "“" && ch === "”")) quote = null;
    } else if (ch === '"' || ch === "“") {
      quote = ch;
      cur += ch;
    } else if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const unquote = (s: string) => {
  const m = /^["“](.*)["”]$/.exec(s);
  return m ? (m[1] ?? "") : s;
};
const isQuoted = (s: string) => /^["“].*["”]$/.test(s);

/** Splits on commas outside quotes. */
function splitList(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.filter((x) => x !== "");
}

function coerce(raw: string, field: FilterField | undefined): FilterValue {
  const quoted = isQuoted(raw);
  const s = unquote(raw);
  if (quoted) return s;
  if (field?.type === "number" && s !== "" && Number.isFinite(Number(s))) return Number(s);
  if (field?.type === "boolean" && (s === "true" || s === "false")) return s === "true";
  return s;
}

const TERM = /^(-|!)?([A-Za-z_][\w.]*)(!=|>=|<=|:|>|<|~)(.*)$/s;

/**
 * Reads a filter line into terms. Unknown field names are kept (the caller decides whether to
 * warn); a term whose value is empty is skipped, so a half-typed `status:` does not filter.
 */
export function parseFilterText(text: string, fields: FilterField[] = []): FilterTerm[] {
  const byName = new Map(fields.map((f) => [f.name, f]));
  const terms: FilterTerm[] = [];
  for (const token of tokenize(text)) {
    const m = isQuoted(token) ? null : TERM.exec(token);
    if (!m) {
      const v = unquote(token);
      if (v) terms.push({ op: "text", value: v });
      continue;
    }
    const [, neg, name = "", sym, rawValue = ""] = m;
    if (rawValue === "") continue;
    const field = byName.get(name);
    let op: FilterOp;
    switch (sym) {
      case "!=":
        op = "ne";
        break;
      case ">":
        op = "gt";
        break;
      case ">=":
        op = "gte";
        break;
      case "<":
        op = "lt";
        break;
      case "<=":
        op = "lte";
        break;
      case "~":
        op = "contains";
        break;
      default:
        op = "eq";
    }
    const parts = splitList(rawValue);
    if (op === "eq" && parts.length > 1) {
      // `region:eu,us` is any of them; `-region:eu,us` is none of them (a list-valued `ne`).
      terms.push({ field: name, op: neg ? "ne" : "in", value: parts.map((p) => coerce(p, field)) });
      continue;
    }
    if (neg && op === "eq") op = "ne";
    terms.push({ field: name, op, value: coerce(rawValue, field) });
  }
  return terms;
}

/* ---------- Writing text back ---------- */

const quoteIfNeeded = (v: FilterValue) => {
  const s = String(v);
  return s === "" || /[\s,"]/.test(s) || /^[-!]/.test(s) || /[:<>~=]/.test(s) ? `"${s.replace(/"/g, "")}"` : s;
};

export function formatFilterTerm(t: FilterTerm): string {
  if (t.op === "text") return quoteIfNeeded(t.value as FilterValue);
  const list = Array.isArray(t.value) ? t.value.map(quoteIfNeeded).join(",") : quoteIfNeeded(t.value);
  switch (t.op) {
    case "eq":
    case "in":
      return `${t.field}:${list}`;
    case "ne":
      return `-${t.field}:${list}`;
    case "gt":
      return `${t.field}>${list}`;
    case "gte":
      return `${t.field}>=${list}`;
    case "lt":
      return `${t.field}<${list}`;
    case "lte":
      return `${t.field}<=${list}`;
    case "contains":
      return `${t.field}~${list}`;
  }
}

export function formatFilterText(terms: FilterTerm[]): string {
  return terms.map(formatFilterTerm).join(" ");
}

/* ---------- JQL ---------- */

export function filterTermToJql(t: FilterTerm): JqlQuery {
  if (t.op === "text") return { $text: String(t.value) };
  const field = t.field as string;
  const values = Array.isArray(t.value) ? t.value : [t.value];
  switch (t.op) {
    case "eq":
      return { [field]: Array.isArray(t.value) ? { $in: values } : { $eq: t.value } };
    case "ne":
      return { [field]: Array.isArray(t.value) ? { $nin: values } : { $ne: t.value } };
    case "in":
      return { [field]: { $in: values } };
    case "contains":
      return { [field]: { $contains: Array.isArray(t.value) ? values.map(String) : String(t.value), $options: "i" } };
    default:
      return { [field]: { [`$${t.op}`]: t.value } };
  }
}

/** One term is the query itself; several are joined with `$and`; none matches everything (`{}`). */
export function toJql(terms: FilterTerm[]): JqlQuery {
  if (terms.length === 0) return {};
  if (terms.length === 1) return filterTermToJql(terms[0] as FilterTerm);
  return { $and: terms.map(filterTermToJql) };
}
