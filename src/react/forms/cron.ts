/**
 * Five-field cron: minute hour day-of-month month day-of-week.
 * Supports `*`, values, ranges `a-b`, lists `a,b`, steps `*\/n` and `a-b/n`, month and weekday
 * names (JAN, MON), 7 as Sunday, and the macros @hourly @daily @weekly @monthly @yearly.
 * When both day fields are restricted a day matches if either does — the classic cron rule.
 */

export type CronFieldName = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

export const CRON_FIELDS: Array<{ name: CronFieldName; label: string; min: number; max: number }> = [
  { name: "minute", label: "Minute", min: 0, max: 59 },
  { name: "hour", label: "Hour", min: 0, max: 23 },
  { name: "dayOfMonth", label: "Day", min: 1, max: 31 },
  { name: "month", label: "Month", min: 1, max: 12 },
  { name: "dayOfWeek", label: "Weekday", min: 0, max: 6 },
];

export const CRON_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const CRON_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export const CRON_PRESETS: Array<{ label: string; expression: string }> = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every 5 minutes", expression: "*/5 * * * *" },
  { label: "Every hour", expression: "0 * * * *" },
  { label: "Every day at 02:00", expression: "0 2 * * *" },
  { label: "Weekdays at 09:30", expression: "30 9 * * 1-5" },
  { label: "Every Sunday at 03:00", expression: "0 3 * * 0" },
  { label: "First of the month", expression: "0 0 1 * *" },
];

type Part = { kind: "all"; step: number } | { kind: "range"; from: number; to: number; step: number } | { kind: "value"; value: number };

export interface CronField {
  /** True when the field is a bare `*`. */
  any: boolean;
  values: number[];
  parts: Part[];
}

export type ParsedCron = Record<CronFieldName, CronField>;

export interface CronParseResult {
  ok: boolean;
  cron?: ParsedCron;
  /** Per-field problems, keyed by field; `expression` for problems with the whole line. */
  errors: Partial<Record<CronFieldName | "expression", string>>;
}

const NAMES: Partial<Record<CronFieldName, string[]>> = {
  month: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  dayOfWeek: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
};

function parseNumber(token: string, field: (typeof CRON_FIELDS)[number]): number | null {
  const names = NAMES[field.name];
  const upper = token.toUpperCase();
  if (names?.includes(upper)) return names.indexOf(upper) + (field.name === "month" ? 1 : 0);
  if (!/^\d+$/.test(token)) return null;
  let n = Number(token);
  if (field.name === "dayOfWeek" && n === 7) n = 0;
  return n >= field.min && n <= field.max ? n : null;
}

/** Parses one field; returns an error message instead when it does not parse. */
export function parseCronField(text: string, name: CronFieldName): CronField | string {
  const field = CRON_FIELDS.find((f) => f.name === name) as (typeof CRON_FIELDS)[number];
  const range = `${field.min}–${name === "dayOfWeek" ? 7 : field.max}`;
  if (text.trim() === "") return "Empty.";
  const values = new Set<number>();
  const parts: Part[] = [];
  for (const piece of text.split(",")) {
    const [base = "", stepText] = piece.split("/");
    let step = 1;
    if (stepText !== undefined) {
      if (!/^[1-9]\d*$/.test(stepText)) return `Bad step “${stepText}”.`;
      step = Number(stepText);
    }
    let from: number;
    let to: number;
    if (base === "*") {
      from = field.min;
      to = field.max;
      parts.push({ kind: "all", step });
    } else if (base.includes("-")) {
      const [a = "", b = ""] = base.split("-");
      const x = parseNumber(a, field);
      const y = parseNumber(b, field);
      // A weekday range may end on 7 (Sunday): MON-SUN reads naturally.
      const yy = name === "dayOfWeek" && (b === "7" || b.toUpperCase() === "SUN") && x !== null && x > 0 ? 7 : y;
      if (x === null || yy === null) return `“${base}” is outside ${range}.`;
      if (x > yy) return `Range “${base}” runs backwards.`;
      from = x;
      to = yy;
      parts.push({ kind: "range", from, to, step });
    } else {
      const x = parseNumber(base, field);
      if (x === null) return `“${base}” is not a value in ${range}.`;
      from = x;
      // `5/15` means "from 5, every 15".
      to = stepText !== undefined ? field.max : x;
      parts.push(stepText !== undefined ? { kind: "range", from, to, step } : { kind: "value", value: x });
    }
    for (let v = from; v <= to; v += step) values.add(name === "dayOfWeek" ? v % 7 : v);
  }
  return { any: text.trim() === "*", values: [...values].sort((a, b) => a - b), parts };
}

export function parseCron(expression: string): CronParseResult {
  const text = MACROS[expression.trim().toLowerCase()] ?? expression.trim();
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length !== 5) return { ok: false, errors: { expression: `Expected 5 fields, got ${tokens.length}.` } };
  const errors: CronParseResult["errors"] = {};
  const cron = {} as ParsedCron;
  CRON_FIELDS.forEach((f, i) => {
    const r = parseCronField(tokens[i] as string, f.name);
    if (typeof r === "string") errors[f.name] = r;
    else cron[f.name] = r;
  });
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, cron, errors };
}

/* ---------- Description ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

function listWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function describeParts(field: CronField, name: (n: number) => string, unit: string): string {
  const words = field.parts.map((p) => {
    if (p.kind === "value") return name(p.value);
    if (p.kind === "all") return p.step === 1 ? `every ${unit}` : `every ${p.step} ${unit}s`;
    const span = `${name(p.from)} through ${name(p.to === 7 ? 0 : p.to)}`;
    return p.step === 1 ? span : `every ${p.step} ${unit}s from ${name(p.from)} through ${name(p.to === 7 ? 0 : p.to)}`;
  });
  return listWords(words);
}

const single = (f: CronField) => f.parts.length === 1 && f.parts[0]?.kind === "value";
const allStep = (f: CronField) => (f.parts.length === 1 && f.parts[0]?.kind === "all" ? f.parts[0].step : 0);

/** A plain-English reading, e.g. "At 09:30, Monday through Friday". Empty string when invalid. */
export function describeCron(expression: string): string {
  const { ok, cron } = parseCron(expression);
  if (!ok || !cron) return "";
  const { minute, hour, dayOfMonth, month, dayOfWeek } = cron;

  let time: string;
  if (single(minute) && single(hour)) {
    time = `At ${pad(hour.values[0] as number)}:${pad(minute.values[0] as number)}`;
  } else if (single(minute) && hour.parts.every((p) => p.kind === "value")) {
    time = `At ${listWords(hour.values.map((h) => `${pad(h)}:${pad(minute.values[0] as number)}`))}`;
  } else if (minute.any && hour.any) {
    time = "Every minute";
  } else if (allStep(minute) > 1 && hour.any) {
    time = `Every ${allStep(minute)} minutes`;
  } else if (single(minute) && hour.any) {
    time = minute.values[0] === 0 ? "At the start of every hour" : `At minute ${minute.values[0]} past every hour`;
  } else if (single(minute) && allStep(hour) > 1) {
    time = `At minute ${minute.values[0]} past every ${allStep(hour)} hours`;
  } else {
    const m = minute.any ? "Every minute" : `At minute ${describeParts(minute, String, "minute")}`;
    time = hour.any ? m : `${m}, past hour ${describeParts(hour, String, "hour")}`;
  }

  const days: string[] = [];
  const domText = dayOfMonth.any ? "" : `on day ${describeParts(dayOfMonth, String, "day")} of the month`;
  const dowText = dayOfWeek.any ? "" : describeParts(dayOfWeek, (d) => CRON_DAY_NAMES[d % 7] as string, "day");
  if (domText && dowText) days.push(`${domText} or on ${dowText}`);
  else if (domText) days.push(domText);
  else if (dowText) days.push(dowText.includes("through") || dowText.startsWith("every") ? dowText : `on ${dowText}`);
  else if (single(minute) && single(hour)) days.push("every day");
  if (!month.any) days.push(`in ${describeParts(month, (m) => CRON_MONTH_NAMES[m - 1] as string, "month")}`);

  if (days.length === 0) return time;
  return `${time}${days[0] === "every day" ? " " : ", "}${days.join(", ")}`;
}

/* ---------- Next runs ---------- */

export interface NextRunsOptions {
  /** Read and write the date in UTC rather than local time (deterministic tests, servers). */
  utc?: boolean;
  /** Give up after this many years without a match (e.g. "0 0 30 2 *" never runs). */
  horizonYears?: number;
}

/** The next `count` times the expression fires, strictly after `from`. */
export function nextRuns(expression: string, from: Date, count = 5, options: NextRunsOptions = {}): Date[] {
  const { ok, cron } = parseCron(expression);
  if (!ok || !cron) return [];
  const utc = options.utc ?? false;
  const get = (d: Date) =>
    utc
      ? { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() }
      : { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), wd: d.getDay() };
  const make = (y: number, mo: number, d: number, h: number, mi: number) =>
    utc ? new Date(Date.UTC(y, mo, d, h, mi)) : new Date(y, mo, d, h, mi);

  const sets = {
    minute: new Set(cron.minute.values),
    hour: new Set(cron.hour.values),
    dom: new Set(cron.dayOfMonth.values),
    month: new Set(cron.month.values),
    dow: new Set(cron.dayOfWeek.values),
  };
  const dayMatches = (dom: number, dow: number) => {
    const a = cron.dayOfMonth.any;
    const b = cron.dayOfWeek.any;
    if (a && b) return true;
    if (a) return sets.dow.has(dow);
    if (b) return sets.dom.has(dom);
    return sets.dom.has(dom) || sets.dow.has(dow);
  };

  const start = get(from);
  let t = make(start.y, start.mo, start.d, start.h, start.mi + 1);
  const limit = start.y + (options.horizonYears ?? 5);
  const out: Date[] = [];
  while (out.length < count) {
    const c = get(t);
    if (c.y > limit) break;
    if (!sets.month.has(c.mo + 1)) {
      t = make(c.y, c.mo + 1, 1, 0, 0);
    } else if (!dayMatches(c.d, c.wd)) {
      t = make(c.y, c.mo, c.d + 1, 0, 0);
    } else if (!sets.hour.has(c.h)) {
      t = make(c.y, c.mo, c.d, c.h + 1, 0);
    } else if (!sets.minute.has(c.mi)) {
      t = make(c.y, c.mo, c.d, c.h, c.mi + 1);
    } else {
      out.push(t);
      t = make(c.y, c.mo, c.d, c.h, c.mi + 1);
    }
  }
  return out;
}
