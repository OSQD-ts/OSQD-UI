import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CidrInput,
  ColorInput,
  ConfirmProvider,
  CronInput,
  describeCron,
  ErrorSummary,
  type FilterField,
  Form,
  formatFilterText,
  formReducer,
  initialFormState,
  IpInput,
  isDirty,
  KeyValueEditor,
  keyValueProblems,
  MultiSelect,
  nextRuns,
  normalizeHex,
  OtpInput,
  PasswordInput,
  parseCidr,
  parseCron,
  parseFilterText,
  parseIPv4,
  QueryBuilder,
  runValidators,
  SaveBar,
  scorePassword,
  toJql,
  useForm,
  validateValues,
  validators as v,
  Wizard,
} from "../src/index";
import { ipVersion, isIPv6 } from "../src/react/forms/validators";

const root = new URL("../", import.meta.url);

/* ---------- Validators ---------- */

describe("validators", () => {
  it("leave empty values to `required`", () => {
    for (const rule of [v.email(), v.url(), v.port(), v.ip(), v.cidr(), v.min(3), v.minLength(3), v.pattern(/x/), v.hexColor()]) {
      expect(rule("", {})).toBeUndefined();
      expect(rule(undefined, {})).toBeUndefined();
    }
    expect(v.required()("", {})).toBe("Required.");
    expect(v.required()("  ", {})).toBe("Required.");
    expect(v.required()([], {})).toBe("Required.");
    expect(v.required()(false, {})).toBe("Required.");
    expect(v.required()(0, {})).toBeUndefined();
  });

  it.each([
    ["1", true],
    ["80", true],
    ["65535", true],
    ["0", false],
    ["65536", false],
    ["-1", false],
    ["80.5", false],
    ["8o", false],
    ["123456", false],
  ])("port %s → valid %s", (value, ok) => {
    expect(v.port()(value, {}) === undefined).toBe(ok);
  });

  it("email and url", () => {
    expect(v.email()("ops@example.com", {})).toBeUndefined();
    expect(v.email()("ops@example", {})).toBeDefined();
    expect(v.email()("ops example.com", {})).toBeDefined();
    expect(v.url()("https://example.com/health", {})).toBeUndefined();
    expect(v.url()("ftp://example.com", {})).toBeDefined();
    expect(v.url()("example.com", {})).toBeDefined();
  });

  it("min / max / integer", () => {
    expect(v.min(100)("99", {})).toBeDefined();
    expect(v.min(100)("100", {})).toBeUndefined();
    expect(v.max(10)(11, {})).toBeDefined();
    expect(v.max(10)("abc", {})).toBeDefined();
    expect(v.integer()("12", {})).toBeUndefined();
    expect(v.integer()("1.5", {})).toBeDefined();
  });

  it("runValidators returns the first message and sees all values", () => {
    const same = v.custom((value: unknown, values: Record<string, unknown>) => value === values.password, "Passwords differ.");
    expect(runValidators([v.required(), same], "", { password: "x" })).toBe("Required.");
    expect(runValidators([v.required(), same], "y", { password: "x" })).toBe("Passwords differ.");
    expect(runValidators([v.required(), same], "x", { password: "x" })).toBeUndefined();
  });
});

describe("IPv4", () => {
  it.each([
    ["0.0.0.0", 0],
    ["255.255.255.255", 0xffffffff],
    ["10.0.0.1", 0x0a000001],
  ])("parses %s", (s, n) => {
    expect(parseIPv4(s)).toBe(n);
  });
  it.each(["256.0.0.1", "1.2.3", "1.2.3.4.5", "01.2.3.4", "1.2.3.-4", "a.b.c.d", "1..2.3", " 1.2.3.4"])("refuses %s", (s) => {
    expect(parseIPv4(s)).toBeNull();
  });
});

describe("IPv6", () => {
  it.each(["::", "::1", "2001:db8::1", "2001:0db8:0000:0000:0000:ff00:0042:8329", "fe80::1:2:3:4", "::ffff:192.0.2.1", "1:2:3:4:5:6:7::"])(
    "accepts %s",
    (s) => {
      expect(isIPv6(s)).toBe(true);
      expect(ipVersion(s)).toBe(6);
    },
  );
  it.each([":::", "1::2::3", "2001:db8:::1", "12345::1", "1:2:3:4:5:6:7:8:9", "1:2:3:4:5:6:7", "g::1", "::ffff:999.0.2.1", "1:2:3:4:5:6:7:8::"])(
    "refuses %s",
    (s) => {
      expect(isIPv6(s)).toBe(false);
    },
  );
});

describe("CIDR", () => {
  it("works out an IPv4 block", () => {
    const c = parseCidr("10.20.30.40/22");
    expect(c).toMatchObject({ version: 4, prefix: 22, network: "10.20.28.0", broadcast: "10.20.31.255", hostBitsSet: true });
    expect(c?.size).toBe(1024n);
    expect(c?.firstHost).toBe("10.20.28.1");
    expect(c?.lastHost).toBe("10.20.31.254");
  });
  it("handles the edges: /0, /31, /32", () => {
    expect(parseCidr("0.0.0.0/0")).toMatchObject({ network: "0.0.0.0", broadcast: "255.255.255.255", hostBitsSet: false });
    expect(parseCidr("0.0.0.0/0")?.size).toBe(2n ** 32n);
    expect(parseCidr("192.0.2.0/31")).toMatchObject({ firstHost: "192.0.2.0", lastHost: "192.0.2.1" });
    expect(parseCidr("203.0.113.7/32")).toMatchObject({ network: "203.0.113.7", broadcast: "203.0.113.7", hostBitsSet: false });
  });
  it("IPv6 prefix bounds", () => {
    expect(parseCidr("2001:db8::/32")?.size).toBe(2n ** 96n);
    expect(parseCidr("::/0")?.size).toBe(2n ** 128n);
    expect(parseCidr("2001:db8::/129")).toBeNull();
  });
  it.each(["10.0.0.0/33", "10.0.0.0", "10.0.0.0/", "10.0.0.0/08", "10.0.0.0/-1", "300.0.0.0/8", "10.0.0.0/8/8"])("refuses %s", (s) => {
    expect(parseCidr(s)).toBeNull();
    expect(v.cidr()(s, {})).toBeDefined();
  });
  it("version restriction", () => {
    expect(v.cidr({ version: 4 })("2001:db8::/32", {})).toBeDefined();
    expect(v.ip({ version: 6 })("10.0.0.1", {})).toBeDefined();
    expect(v.ip({ version: 6 })("::1", {})).toBeUndefined();
  });
});

describe("hex colours and key–value problems", () => {
  it("normalises hex", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("ab9df2")).toBe("#ab9df2");
    expect(normalizeHex("#abcd")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
  });
  it("flags duplicates, missing keys and pattern breaks", () => {
    const pairs = [
      { key: "Content-Type", value: "a" },
      { key: "content-type", value: "b" },
      { key: "", value: "orphan" },
      { key: "", value: "" },
      { key: "X-Id", value: "1" },
    ];
    expect(keyValueProblems(pairs)).toEqual([undefined, undefined, "Key is missing.", undefined, undefined]);
    const ci = keyValueProblems(pairs, { caseInsensitive: true });
    expect(ci[0]).toMatch(/Duplicate/);
    expect(ci[1]).toMatch(/Duplicate/);
    expect(keyValueProblems([{ key: "redis-url", value: "x" }], { keyPattern: /^[A-Z_]+$/, keyPatternMessage: "UPPER" })).toEqual(["UPPER"]);
  });
});

/* ---------- Password ---------- */

describe("scorePassword", () => {
  it("orders passwords sensibly", () => {
    const order = ["", "abc", "password1", "qwerty123456", "Tr0ub4dor&3", "correct-horse-battery-staple", "T7#qv!mR2p@xL9$w"];
    const scores = order.map((p) => scorePassword(p).score);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1] as number);
    expect(scorePassword("password1").score).toBeLessThanOrEqual(1);
    expect(scorePassword("T7#qv!mR2p@xL9$w").score).toBe(4);
  });
  it("explains itself", () => {
    expect(scorePassword("abcd1234").hints.join(" ")).toMatch(/12 characters/);
    expect(scorePassword("abcdefghijkl").hints.join(" ")).toMatch(/sequences/);
    expect(scorePassword("aaaaaaaaaaaaaa").hints.join(" ")).toMatch(/repeating/);
  });
});

/* ---------- Cron ---------- */

describe("cron", () => {
  it.each([
    ["* * * * *", "Every minute"],
    ["*/5 * * * *", "Every 5 minutes"],
    ["0 * * * *", "At the start of every hour"],
    ["15 * * * *", "At minute 15 past every hour"],
    ["0 2 * * *", "At 02:00 every day"],
    ["30 9 * * 1-5", "At 09:30, Monday through Friday"],
    ["0 3 * * 0", "At 03:00, on Sunday"],
    ["0 3 * * 7", "At 03:00, on Sunday"],
    ["0 0 1 * *", "At 00:00, on day 1 of the month"],
    ["15 14 1 1 *", "At 14:15, on day 1 of the month, in January"],
    ["0 9,17 * * MON-FRI", "At 09:00 and 17:00, Monday through Friday"],
    ["@daily", "At 00:00 every day"],
    ["0 0 1,15 * 1", "At 00:00, on day 1 and 15 of the month or on Monday"],
  ])("describes %s", (expr, text) => {
    expect(describeCron(expr)).toBe(text);
  });

  it("reports field errors", () => {
    expect(parseCron("60 * * * *").errors.minute).toMatch(/outside|not a value/);
    expect(parseCron("* 24 * * *").errors.hour).toBeDefined();
    expect(parseCron("* * 0 * *").errors.dayOfMonth).toBeDefined();
    expect(parseCron("* * * 13 *").errors.month).toBeDefined();
    expect(parseCron("*/0 * * * *").errors.minute).toMatch(/step/);
    expect(parseCron("5-1 * * * *").errors.minute).toMatch(/backwards/);
    expect(parseCron("* * *").errors.expression).toMatch(/5 fields/);
    expect(describeCron("nonsense")).toBe("");
  });

  const at = (iso: string) => new Date(iso);
  const iso = (ds: Date[]) => ds.map((d) => d.toISOString().slice(0, 16));

  it("finds the next runs strictly after `from`", () => {
    // Wednesday 2026-10-21 09:30 UTC.
    expect(iso(nextRuns("30 9 * * 1-5", at("2026-10-21T09:30:00Z"), 3, { utc: true }))).toEqual([
      "2026-10-22T09:30",
      "2026-10-23T09:30",
      "2026-10-26T09:30",
    ]);
    expect(iso(nextRuns("*/15 * * * *", at("2026-10-21T23:50:00Z"), 3, { utc: true }))).toEqual(["2026-10-22T00:00", "2026-10-22T00:15", "2026-10-22T00:30"]);
  });

  it("crosses months, years and leap days", () => {
    expect(iso(nextRuns("0 0 1 * *", at("2026-12-15T00:00:00Z"), 2, { utc: true }))).toEqual(["2027-01-01T00:00", "2027-02-01T00:00"]);
    expect(iso(nextRuns("0 12 29 2 *", at("2026-03-01T00:00:00Z"), 1, { utc: true }))).toEqual(["2028-02-29T12:00"]);
    expect(nextRuns("0 0 30 2 *", at("2026-01-01T00:00:00Z"), 1, { utc: true })).toEqual([]);
  });

  it("uses either-day matching when both day fields are set", () => {
    // 1st of the month or any Monday: Thursday 1 Oct 2026 is the 1st, Monday 5 Oct is a Monday.
    expect(iso(nextRuns("0 0 1 * 1", at("2026-09-30T12:00:00Z"), 3, { utc: true }))).toEqual(["2026-10-01T00:00", "2026-10-05T00:00", "2026-10-12T00:00"]);
  });
});

/* ---------- Filter text ⇄ JQL ---------- */

const FIELDS: FilterField[] = [
  { name: "status", type: "enum", options: ["open", "closed"] },
  { name: "region", type: "enum", options: ["eu", "us"] },
  { name: "p95", type: "number" },
  { name: "bot", type: "boolean" },
  { name: "path", type: "string" },
];

describe("parseFilterText / toJql", () => {
  it("reads every term shape", () => {
    expect(parseFilterText('status:open -region:eu p95>=250 p95<1000 bot:true path~/api region:eu,us "conn reset" timeout status!=closed', FIELDS)).toEqual([
      { field: "status", op: "eq", value: "open" },
      { field: "region", op: "ne", value: "eu" },
      { field: "p95", op: "gte", value: 250 },
      { field: "p95", op: "lt", value: 1000 },
      { field: "bot", op: "eq", value: true },
      { field: "path", op: "contains", value: "/api" },
      { field: "region", op: "in", value: ["eu", "us"] },
      { op: "text", value: "conn reset" },
      { op: "text", value: "timeout" },
      { field: "status", op: "ne", value: "closed" },
    ]);
  });

  it("skips half-typed terms and keeps unknown fields", () => {
    expect(parseFilterText("status: foo:bar", FIELDS)).toEqual([{ field: "foo", op: "eq", value: "bar" }]);
  });

  it("builds JQL documents", () => {
    expect(toJql([])).toEqual({});
    expect(toJql(parseFilterText("status:open", FIELDS))).toEqual({ status: { $eq: "open" } });
    expect(toJql(parseFilterText('p95>250 -region:eu,us path~/api "conn reset"', FIELDS))).toEqual({
      $and: [
        { p95: { $gt: 250 } },
        { region: { $nin: ["eu", "us"] } },
        { path: { $contains: "/api", $options: "i" } },
        { $text: "conn reset" },
      ],
    });
  });

  it.each([
    "status:open",
    "-region:eu,us p95>=250",
    'path~"/api v2" "conn reset"',
    "bot:false p95<=10 status!=closed",
    'path:"a:b" "-dash"',
  ])("round-trips %s", (text) => {
    const terms = parseFilterText(text, FIELDS);
    const again = parseFilterText(formatFilterText(terms), FIELDS);
    expect(again).toEqual(terms);
    expect(formatFilterText(again)).toBe(formatFilterText(terms));
  });
});

/* ---------- Form state ---------- */

describe("formReducer", () => {
  const rules = { name: [v.required()], port: [v.required(), v.port()] };
  type V = { name: string; port: string };
  const start = initialFormState<V>({ name: "", port: "80" });

  it("stays quiet until a field is left, then re-checks live", () => {
    let s = formReducer(start, { type: "set", name: "port", value: "99999", rules });
    expect(s.errors.port).toBeUndefined();
    s = formReducer(s, { type: "blur", name: "port", rules });
    expect(s.errors.port).toMatch(/65535/);
    s = formReducer(s, { type: "set", name: "port", value: "8080", rules });
    expect(s.errors.port).toBeUndefined();
  });

  it("tracks dirtiness against the last committed values", () => {
    let s = formReducer(start, { type: "set", name: "name", value: "api", rules });
    expect(isDirty(s)).toBe(true);
    s = formReducer(s, { type: "set", name: "name", value: "", rules });
    expect(isDirty(s)).toBe(false);
    s = formReducer(s, { type: "set", name: "name", value: "api", rules });
    s = formReducer(s, { type: "submitStart" });
    expect(s.submitting).toBe(true);
    s = formReducer(s, { type: "submitEnd", commit: true });
    expect(isDirty(s)).toBe(false);
    expect(s.submitCount).toBe(1);
  });

  it("validates everything at once and resets", () => {
    expect(validateValues({ name: "", port: "0" }, rules)).toEqual({ name: "Required.", port: expect.stringMatching(/65535/) });
    let s = formReducer(start, { type: "validateAll", rules });
    expect(Object.keys(s.errors)).toEqual(["name"]);
    s = formReducer(s, { type: "reset" });
    expect(s.errors).toEqual({});
    expect(s.values).toEqual({ name: "", port: "80" });
  });

  it("keeps a submit error until the next attempt", () => {
    let s = formReducer(start, { type: "submitStart" });
    s = formReducer(s, { type: "submitEnd", error: "503 from server" });
    expect(s.submitError).toBe("503 from server");
    s = formReducer(s, { type: "submitStart" });
    expect(s.submitError).toBeUndefined();
  });
});

/* ---------- Smoke renders ---------- */

function FormHarness() {
  const form = useForm({ initialValues: { name: "x", port: "1" }, rules: { name: [v.required()] } });
  return (
    <Form form={form}>
      <input {...form.field("name")} />
      <ErrorSummary />
      <SaveBar open />
    </Form>
  );
}

describe("components render", () => {
  const html = (el: React.ReactElement) => renderToStaticMarkup(el);

  it("form system", () => {
    const out = html(<FormHarness />);
    expect(out).toContain('class="oq-form"');
    expect(out).toContain("noValidate");
    expect(out).toContain('class="oq-savebar oq-savebar--sticky"');
    expect(out).toContain('value="x"');
    expect(out).not.toContain("oq-error-summary"); // nothing submitted yet
  });

  it("inputs", () => {
    expect(html(<MultiSelect label="Regions" options={["eu", "us", "ap"]} defaultValue={["eu", "us"]} maxChips={1} />)).toMatch(
      /oq-multiselect__trigger[\s\S]*aria-haspopup="listbox"[\s\S]*eu[\s\S]*\+1/,
    );
    expect(html(<ColorInput label="Colour" defaultValue="#abc" presets={["#ff0000"]} />)).toMatch(/oq-color__swatch[\s\S]*value="#aabbcc"[\s\S]*oq-color__preset/);
    const pw = html(<PasswordInput label="Password" showStrength defaultValue="password1" />);
    expect(pw).toContain('type="password"');
    expect(pw).toContain('aria-label="Show password"');
    expect(pw).toMatch(/oq-strength" data-score="[01]"/);
    const otp = html(<OtpInput length={6} groupSize={3} defaultValue="12" />);
    expect(otp.match(/oq-otp__cell/g)).toHaveLength(6);
    expect(otp.match(/oq-otp__sep/g)).toHaveLength(1);
    expect(otp).toContain('autoComplete="one-time-code"');
    const cron = html(<CronInput defaultValue="30 9 * * 1-5" now={new Date("2026-10-21T09:30:00Z")} utc showRuns={2} />);
    expect(cron).toContain("At 09:30, Monday through Friday");
    expect(cron.match(/<li>/g)).toHaveLength(2);
    expect(html(<KeyValueEditor defaultValue={[{ key: "A", value: "1" }, { key: "A", value: "2" }]} />)).toMatch(/oq-kv__row is-invalid[\s\S]*Duplicate key/);
    expect(html(<IpInput defaultValue="::1" />)).toContain(">IPv6<");
    expect(html(<CidrInput defaultValue="10.0.0.0/8" />)).toMatch(/10\.0\.0\.0 – 10\.255\.255\.255[\s\S]*16\.8 M/);
  });

  it("query builder", () => {
    const out = html(<QueryBuilder fields={FIELDS} defaultValue={parseFilterText("status:open p95>250 nope:1", FIELDS)} />);
    expect(out.match(/oq-query__term/g)?.length).toBeGreaterThanOrEqual(3);
    expect(out).toContain("is-unknown");
    expect(out).toContain('role="combobox"');
    expect(out).toContain("&gt;");
  });

  it("wizard and confirm", () => {
    const out = html(
      <Wizard
        steps={[
          { label: "One", content: <p>first</p> },
          { label: "Two", content: () => <p>second</p> },
        ]}
        onFinish={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(out).toContain("oq-stepper");
    expect(out).toContain('aria-current="step"');
    expect(out).toContain("<p>first</p>");
    expect(out).toContain("Step 1 of 2");
    expect(out).toContain(">Next<");
    expect(html(<ConfirmProvider>child</ConfirmProvider>)).toMatch(/child[\s\S]*oq-dialog oq-confirm/);
  });
});

/* ---------- preview-forms.html carries the real logic ---------- */

async function bundleLogic(): Promise<string> {
  const result = await build({
    stdin: {
      contents: ["cron", "password", "query", "validators"].map((m) => `export * from "./src/react/forms/${m}";`).join("\n"),
      resolveDir: fileURLToPath(root),
      loader: "ts",
      sourcefile: "forms-logic.ts",
    },
    bundle: true,
    format: "iife",
    globalName: "OQForms",
    minify: true,
    target: "es2020",
    write: false,
    legalComments: "none",
  });
  return `<script>${(result.outputFiles[0]?.text ?? "").trim()}</script>`;
}

describe("preview-forms.html", () => {
  it("inlines the current forms logic", async () => {
    const file = fileURLToPath(new URL("preview-forms.html", root));
    const page = readFileSync(file, "utf8");
    const re = /(<!-- FORMS-LOGIC:START -->\n)([\s\S]*?)(\n<!-- FORMS-LOGIC:END -->)/;
    expect(page).toMatch(re);
    const want = await bundleLogic();
    if (process.env.OQ_UPDATE_FORMS_DEMO) writeFileSync(file, page.replace(re, (_m, a, _b, c) => `${a}${want}${c}`));
    else expect((re.exec(page) as RegExpExecArray)[2], "run OQ_UPDATE_FORMS_DEMO=1 npx vitest run tests/forms.test.tsx").toBe(want);
  }, 20_000);
});
