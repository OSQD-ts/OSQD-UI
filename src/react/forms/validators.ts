/**
 * Field validators. A validator returns an error message, or `undefined` when the value is fine.
 * Every validator except `required` passes an empty value: emptiness is `required`'s job alone,
 * so an optional field with a format rule does not complain while it is blank.
 */

export type Validator<V = unknown, Values = Record<string, unknown>> = (value: V, values: Values) => string | undefined;

export const isEmptyValue = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

const str = (v: unknown) => (typeof v === "string" ? v.trim() : String(v));

function required(message = "Required."): Validator {
  return (v) => (isEmptyValue(v) || v === false ? message : undefined);
}

function minLength(n: number, message?: string): Validator {
  return (v) => (isEmptyValue(v) || str(v).length >= n ? undefined : (message ?? `At least ${n} characters.`));
}

function maxLength(n: number, message?: string): Validator {
  return (v) => (isEmptyValue(v) || str(v).length <= n ? undefined : (message ?? `At most ${n} characters.`));
}

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(str(v));
}

function min(n: number, message?: string): Validator {
  return (v) => {
    if (isEmptyValue(v)) return undefined;
    const x = asNumber(v);
    return Number.isFinite(x) && x >= n ? undefined : (message ?? `Must be ${n} or more.`);
  };
}

function max(n: number, message?: string): Validator {
  return (v) => {
    if (isEmptyValue(v)) return undefined;
    const x = asNumber(v);
    return Number.isFinite(x) && x <= n ? undefined : (message ?? `Must be ${n} or less.`);
  };
}

function integer(message = "Must be a whole number."): Validator {
  return (v) => (isEmptyValue(v) || /^-?\d+$/.test(str(v)) ? undefined : message);
}

function pattern(re: RegExp, message = "Invalid format."): Validator {
  return (v) => (isEmptyValue(v) || re.test(str(v)) ? undefined : message);
}

function email(message = "Not an e-mail address."): Validator {
  return pattern(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, message);
}

function url(message = "Not a URL (http:// or https://).", protocols = ["http:", "https:"]): Validator {
  return (v) => {
    if (isEmptyValue(v)) return undefined;
    try {
      const u = new URL(str(v));
      return protocols.includes(u.protocol) && u.hostname ? undefined : message;
    } catch {
      return message;
    }
  };
}

function port(message = "Must be a whole number between 1 and 65535."): Validator {
  return (v) => {
    if (isEmptyValue(v)) return undefined;
    const s = str(v);
    return /^\d{1,5}$/.test(s) && +s >= 1 && +s <= 65535 ? undefined : message;
  };
}

function ip(options: { version?: 4 | 6 } = {}, message?: string): Validator {
  return (v) => {
    if (isEmptyValue(v)) return undefined;
    const version = ipVersion(str(v));
    if (version && (!options.version || options.version === version)) return undefined;
    return message ?? (options.version ? `Not an IPv${options.version} address.` : "Not an IP address.");
  };
}

function cidr(options: { version?: 4 | 6 } = {}, message?: string): Validator {
  return (v) => {
    if (isEmptyValue(v)) return undefined;
    const parsed = parseCidr(str(v));
    if (parsed && (!options.version || options.version === parsed.version)) return undefined;
    return message ?? (options.version ? `Not an IPv${options.version} CIDR (e.g. 10.0.0.0/8).` : "Not a CIDR block (e.g. 10.0.0.0/8).");
  };
}

/** A one-off rule: `custom((v) => v !== "root", "Pick another name.")`. */
function hexColor(message = "Use #rgb or #rrggbb."): Validator {
  return (v) => (isEmptyValue(v) || normalizeHex(str(v)) ? undefined : message);
}

function custom<V = unknown, Values = Record<string, unknown>>(
  test: (value: V, values: Values) => boolean,
  message: string,
): Validator<V, Values> {
  return (v, values) => (test(v, values) ? undefined : message);
}

/**
 * The rule factories, grouped so their short names stay out of the package root:
 * `rules: { port: [validators.required(), validators.port()] }`.
 */
export const validators = { required, minLength, maxLength, min, max, integer, pattern, email, url, port, ip, cidr, hexColor, custom };

/** Runs validators in order and returns the first message. */
export function runValidators<V, Values>(validators: Array<Validator<V, Values>> | undefined, value: V, values: Values): string | undefined {
  if (!validators) return undefined;
  for (const validate of validators) {
    const message = validate(value, values);
    if (message) return message;
  }
  return undefined;
}

/* ---------- IP addresses ---------- */

/** The 32-bit value of a dotted IPv4 address, or null. Leading zeros are refused (they read as octal elsewhere). */
export function parseIPv4(s: string): number | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const b = Number(p);
    if (b > 255) return null;
    n = n * 256 + b;
  }
  return n;
}

export function formatIPv4(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

/** True for any valid IPv6 text form: full, `::`-compressed, or with an embedded IPv4 tail. */
export function isIPv6(s: string): boolean {
  if (!/^[0-9a-fA-F:.]+$/.test(s)) return false;
  const halves = s.split("::");
  if (halves.length > 2) return false;
  const groups = (part: string) => (part === "" ? [] : part.split(":"));
  const head = groups(halves[0] ?? "");
  const tail = halves.length === 2 ? groups(halves[1] ?? "") : [];
  const all = [...head, ...tail];
  let count = 0;
  for (let i = 0; i < all.length; i++) {
    const g = all[i] ?? "";
    const last = i === all.length - 1;
    if (last && g.includes(".")) {
      if (parseIPv4(g) === null) return false;
      count += 2;
    } else if (/^[0-9a-fA-F]{1,4}$/.test(g)) {
      count += 1;
    } else {
      return false;
    }
  }
  return halves.length === 2 ? count <= 7 : count === 8;
}

export function ipVersion(s: string): 4 | 6 | null {
  if (parseIPv4(s) !== null) return 4;
  if (isIPv6(s)) return 6;
  return null;
}

export interface CidrInfo {
  version: 4 | 6;
  address: string;
  prefix: number;
  /** Addresses in the block, as a bigint so /0 of IPv6 still fits. */
  size: bigint;
  /** IPv4 only. */
  network?: string;
  broadcast?: string;
  firstHost?: string;
  lastHost?: string;
  /** IPv4 only: the address had host bits set, so it is not the network address itself. */
  hostBitsSet?: boolean;
}

export function parseCidr(s: string): CidrInfo | null {
  const m = /^([^/\s]+)\/(0|[1-9]\d{0,2})$/.exec(s.trim());
  if (!m) return null;
  const address = m[1] ?? "";
  const prefix = Number(m[2]);
  const version = ipVersion(address);
  if (version === 4) {
    if (prefix > 32) return null;
    const n = parseIPv4(address) as number;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (n & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const size = 2n ** BigInt(32 - prefix);
    const hosts = prefix >= 31 ? [network, broadcast] : [network + 1, broadcast - 1];
    return {
      version,
      address,
      prefix,
      size,
      network: formatIPv4(network),
      broadcast: formatIPv4(broadcast),
      firstHost: formatIPv4(hosts[0] as number),
      lastHost: formatIPv4(hosts[1] as number),
      hostBitsSet: network !== n,
    };
  }
  if (version === 6) {
    if (prefix > 128) return null;
    return { version, address, prefix, size: 2n ** BigInt(128 - prefix) };
  }
  return null;
}

/** "256", "16.8 M", "2^64" — a block size short enough for a help line. */
export function formatAddressCount(n: bigint): string {
  if (n < 10_000n) return n.toLocaleString("en-US");
  if (n < 10n ** 12n) {
    const x = Number(n);
    const units: Array<[number, string]> = [
      [1e9, "G"],
      [1e6, "M"],
      [1e3, "k"],
    ];
    for (const [v, u] of units) if (x >= v) return `${(x / v).toFixed(x / v >= 100 ? 0 : 1)} ${u}`;
  }
  return `2^${n.toString(2).length - 1}`;
}

/* ---------- Colours ---------- */

/** `#abc` → `#aabbcc`, lower case; null when it is not a hex colour. */
export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#?/, "#").toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${[...s.slice(1)].map((c) => c + c).join("")}`;
  return null;
}

/* ---------- Key–value lists ---------- */

/** Problems per row, by index: duplicate keys, a value with no key, a key that breaks the pattern. */
export function keyValueProblems(
  pairs: Array<{ key: string; value: string }>,
  options: { caseInsensitive?: boolean; keyPattern?: RegExp; keyPatternMessage?: string } = {},
): Array<string | undefined> {
  const norm = (k: string) => (options.caseInsensitive ? k.trim().toLowerCase() : k.trim());
  const counts = new Map<string, number>();
  for (const p of pairs) if (p.key.trim()) counts.set(norm(p.key), (counts.get(norm(p.key)) ?? 0) + 1);
  return pairs.map((p) => {
    const k = p.key.trim();
    if (!k) return p.value.trim() ? "Key is missing." : undefined;
    if ((counts.get(norm(k)) ?? 0) > 1) return `Duplicate key “${k}”.`;
    if (options.keyPattern && !options.keyPattern.test(k)) return options.keyPatternMessage ?? "Invalid key.";
    return undefined;
  });
}
