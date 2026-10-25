import { type InputHTMLAttributes, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cx } from "../cx";
import { Icon } from "../Icon";
import { PlusIcon } from "../icons";
import { CRON_FIELDS, CRON_PRESETS, describeCron, nextRuns, parseCron } from "./cron";
import { FieldShell, type FieldShellProps, helpId, shellProps } from "./FieldShell";
import { formatAddressCount, ipVersion, keyValueProblems, parseCidr } from "./validators";

/* ---------- CronInput ---------- */

export interface CronInputProps extends FieldShellProps {
  value?: string;
  defaultValue?: string;
  onChange?: (expression: string) => void;
  /** How many upcoming runs to list; 0 hides the list. */
  showRuns?: number;
  /** "Now" for the upcoming runs (tests, previews of a future schedule). */
  now?: Date;
  utc?: boolean;
  presets?: Array<{ label: string; expression: string }>;
  id?: string;
  className?: string;
}

const RUN_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

/** A cron schedule edited field by field, read back in plain words with the next few runs. */
export function CronInput(props: CronInputProps) {
  const { value, defaultValue = "0 2 * * *", onChange, showRuns = 5, now, utc, presets = CRON_PRESETS, id: idProp, className } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const [inner, setInner] = useState(defaultValue);
  const expression = value ?? inner;
  const tokens = useMemo(() => {
    const t = expression.trim().split(/\s+/);
    return CRON_FIELDS.map((_, i) => t[i] ?? "*");
  }, [expression]);
  const parsed = parseCron(tokens.join(" "));
  const description = parsed.ok ? describeCron(expression) : "";
  const runs = parsed.ok && showRuns > 0 ? nextRuns(expression, now ?? new Date(), showRuns, utc ? { utc } : {}) : [];
  const fmt = new Intl.DateTimeFormat(undefined, utc ? { ...RUN_FORMAT, timeZone: "UTC" } : RUN_FORMAT);

  const commit = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  const setField = (i: number, text: string) => {
    const next = [...tokens];
    next[i] = text.replace(/\s+/g, "");
    commit(next.join(" "));
  };
  const firstError = Object.entries(parsed.errors)[0];
  const presetMatch = presets.find((p) => p.expression === tokens.join(" "))?.expression ?? "";

  return (
    <FieldShell id={`${id}-minute`} {...shellProps(props)}>
      <div className={cx("oq-cron", className)} aria-describedby={helpId(`${id}-minute`, props)}>
        <div className="oq-cron__fields">
          {CRON_FIELDS.map((f, i) => (
            <label key={f.name} className="oq-cron__field">
              <input
                id={`${id}-${f.name}`}
                className="oq-input oq-input--mono oq-sm"
                value={tokens[i]}
                spellCheck={false}
                aria-invalid={parsed.errors[f.name] ? true : undefined}
                onChange={(e) => setField(i, e.target.value)}
              />
              <span className="oq-cron__name">{f.label}</span>
            </label>
          ))}
        </div>
        <div className="oq-cron__bar">
          <select
            className="oq-select oq-sm oq-cron__presets"
            aria-label="Common schedules"
            value={presetMatch}
            onChange={(e) => e.target.value && commit(e.target.value)}
          >
            <option value="">Custom</option>
            {presets.map((p) => (
              <option key={p.expression} value={p.expression}>
                {p.label}
              </option>
            ))}
          </select>
          <code className="oq-cron__expr">{tokens.join(" ")}</code>
        </div>
        <div className={cx("oq-cron__desc", !parsed.ok && "is-error")} aria-live="polite">
          {parsed.ok
            ? description
            : firstError
              ? `${CRON_FIELDS.find((f) => f.name === firstError[0])?.label ?? "Schedule"}: ${firstError[1]}`
              : "Invalid schedule."}
        </div>
        {runs.length > 0 && (
          <ol className="oq-cron__runs" aria-label="Next runs">
            {runs.map((d) => (
              <li key={d.getTime()}>{fmt.format(d)}</li>
            ))}
          </ol>
        )}
      </div>
    </FieldShell>
  );
}

/* ---------- KeyValueEditor ---------- */

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface KeyValueEditorProps extends FieldShellProps {
  value?: KeyValuePair[];
  defaultValue?: KeyValuePair[];
  onChange?: (pairs: KeyValuePair[]) => void;
  keyLabel?: string;
  valueLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: ReactNode;
  /** Compare keys ignoring case when looking for duplicates (HTTP headers). */
  caseInsensitive?: boolean;
  /** Keys must match this; e.g. /^[A-Z_][A-Z0-9_]*$/ for environment variables. */
  keyPattern?: RegExp;
  keyPatternMessage?: string;
  /** Show values in a monospace face (tokens, paths). */
  mono?: boolean;
  /** Render values as password fields (secrets). */
  secret?: boolean;
  id?: string;
  className?: string;
}

/** Edits a list of key–value pairs (headers, environment variables) with add, remove, reorder and duplicate-key warnings. */
export function KeyValueEditor(props: KeyValueEditorProps) {
  const {
    value,
    defaultValue = [],
    onChange,
    keyLabel = "Key",
    valueLabel = "Value",
    keyPlaceholder = "KEY",
    valuePlaceholder = "value",
    addLabel = "Add row",
    caseInsensitive,
    keyPattern,
    keyPatternMessage,
    mono = true,
    secret,
    id: idProp,
    className,
  } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const [inner, setInner] = useState<KeyValuePair[]>(defaultValue);
  const pairs = value ?? inner;
  // Stable row keys so focus stays put while rows move; regenerated if the parent replaces the list.
  const seq = useRef(0);
  const [rowIds, setRowIds] = useState<number[]>(() => pairs.map(() => seq.current++));
  const ids = rowIds.length === pairs.length ? rowIds : pairs.map((_, i) => rowIds[i] ?? seq.current++);
  const problems = keyValueProblems(pairs, { caseInsensitive: caseInsensitive ?? false, ...(keyPattern ? { keyPattern } : {}), ...(keyPatternMessage ? { keyPatternMessage } : {}) });
  const root = useRef<HTMLDivElement>(null);

  const commit = (next: KeyValuePair[], nextIds: number[]) => {
    setRowIds(nextIds);
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  const update = (i: number, patch: Partial<KeyValuePair>) =>
    commit(
      pairs.map((p, j) => (j === i ? { ...p, ...patch } : p)),
      ids,
    );
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= pairs.length) return;
    const next = [...pairs];
    const nextIds = [...ids];
    [next[i], next[j]] = [next[j] as KeyValuePair, next[i] as KeyValuePair];
    [nextIds[i], nextIds[j]] = [nextIds[j] as number, nextIds[i] as number];
    commit(next, nextIds);
  };
  const remove = (i: number) =>
    commit(
      pairs.filter((_, j) => j !== i),
      ids.filter((_, j) => j !== i),
    );
  const add = () => {
    commit([...pairs, { key: "", value: "" }], [...ids, seq.current++]);
    requestAnimationFrame(() => root.current?.querySelector<HTMLInputElement>(".oq-kv__row:last-of-type .oq-kv__key")?.focus());
  };

  return (
    <FieldShell id={`${id}-add`} {...shellProps(props)} labelIsFor={false}>
      <div ref={root} className={cx("oq-kv", className)} role="group" aria-labelledby={props.label != null ? `${id}-add-label` : undefined}>
        {pairs.length > 0 && (
          <div className="oq-kv__head" aria-hidden="true">
            <span>{keyLabel}</span>
            <span>{valueLabel}</span>
          </div>
        )}
        {pairs.map((p, i) => (
          <div key={ids[i]} className={cx("oq-kv__row", problems[i] && "is-invalid")}>
            <input
              className={cx("oq-input oq-sm oq-kv__key", mono && "oq-input--mono")}
              value={p.key}
              placeholder={keyPlaceholder}
              spellCheck={false}
              aria-label={`${keyLabel} ${i + 1}`}
              aria-invalid={problems[i] ? true : undefined}
              aria-describedby={problems[i] ? `${id}-p${i}` : undefined}
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              className={cx("oq-input oq-sm oq-kv__value", mono && "oq-input--mono")}
              type={secret ? "password" : "text"}
              value={p.value}
              placeholder={valuePlaceholder}
              spellCheck={false}
              aria-label={`${valueLabel} ${i + 1}`}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <span className="oq-kv__actions">
              <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" aria-label={`Move row ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <Icon name="arrow-up" size={14} />
              </button>
              <button
                type="button"
                className="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm"
                aria-label={`Move row ${i + 1} down`}
                disabled={i === pairs.length - 1}
                onClick={() => move(i, 1)}
              >
                <Icon name="arrow-down" size={14} />
              </button>
              <button type="button" className="oq-btn oq-btn--ghost oq-danger oq-btn--icon oq-sm" aria-label={`Remove row ${i + 1}`} onClick={() => remove(i)}>
                <Icon name="trash" size={14} />
              </button>
            </span>
            {problems[i] && (
              <span id={`${id}-p${i}`} className="oq-kv__problem">
                {problems[i]}
              </span>
            )}
          </div>
        ))}
        <button id={`${id}-add`} type="button" className="oq-btn oq-btn--ghost oq-sm oq-kv__add" onClick={add}>
          <PlusIcon />
          {addLabel}
        </button>
      </div>
    </FieldShell>
  );
}

/* ---------- IpInput / CidrInput ---------- */

export interface IpInputProps extends FieldShellProps, Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Accept only this version; both by default. */
  version?: 4 | 6;
}

function useTextValue(value: string | undefined, defaultValue: string, onChange?: (v: string) => void) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const set = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  return [current, set] as const;
}

/** An IP address with its version shown beside it; complains once the field is left. */
export function IpInput(props: IpInputProps) {
  const { label: _l, help: _h, error, required, fieldClassName: _f, value, defaultValue = "", onChange, version, id: idProp, className, onBlur, ...rest } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const [current, set] = useTextValue(value, defaultValue, onChange);
  const [touched, setTouched] = useState(false);
  const detected = current.trim() ? ipVersion(current.trim()) : null;
  const ok = detected !== null && (!version || detected === version);
  const own = touched && current.trim() && !ok ? (version ? `Not an IPv${version} address.` : "Not an IPv4 or IPv6 address.") : undefined;
  const shownError = error ?? own;

  return (
    <FieldShell id={id} {...shellProps(props)} error={shownError}>
      <div className={cx("oq-input-group oq-ip", className)}>
        <input
          id={id}
          className="oq-input oq-input--mono"
          spellCheck={false}
          autoCapitalize="off"
          inputMode={version === 4 ? "decimal" : "text"}
          placeholder={version === 6 ? "2001:db8::1" : "192.0.2.10"}
          required={required}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={helpId(id, { ...props, error: shownError })}
          {...rest}
          value={current}
          onChange={(e) => set(e.target.value)}
          onBlur={(e) => {
            setTouched(true);
            onBlur?.(e);
          }}
        />
        <span className={cx("oq-addon oq-ip__version", ok && "is-ok")}>{detected ? `IPv${detected}` : "IP"}</span>
      </div>
    </FieldShell>
  );
}

/** A CIDR block, with its range and size worked out underneath. */
export function CidrInput(props: IpInputProps) {
  const { label: _l, help, error, required, fieldClassName: _f, value, defaultValue = "", onChange, version, id: idProp, className, onBlur, ...rest } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const [current, set] = useTextValue(value, defaultValue, onChange);
  const [touched, setTouched] = useState(false);
  const info = current.trim() ? parseCidr(current.trim()) : null;
  const ok = info !== null && (!version || info.version === version);
  const own =
    touched && current.trim() && !ok
      ? current.includes("/")
        ? `Not a valid ${version ? `IPv${version} ` : ""}CIDR block — prefix up to /${version === 6 ? 128 : version === 4 ? 32 : "32 or /128"}.`
        : "Add a prefix length, e.g. /24."
      : undefined;
  const shownError = error ?? own;

  let detail: ReactNode = help;
  if (ok && info && !shownError) {
    const count = formatAddressCount(info.size);
    detail =
      info.version === 4 ? (
        <>
          <span className="oq-mono">
            {info.network} – {info.broadcast}
          </span>{" "}
          · {count} {info.size === 1n ? "address" : "addresses"}
          {info.hostBitsSet && (
            <span className="oq-ip__warn">
              {" "}
              · host bits set; the network is <span className="oq-mono">{`${info.network}/${info.prefix}`}</span>
            </span>
          )}
        </>
      ) : (
        <>IPv6 /{info.prefix} · {count} addresses</>
      );
  }

  return (
    <FieldShell id={id} {...shellProps(props)} help={detail} error={shownError}>
      <div className={cx("oq-input-group oq-ip", className)}>
        <input
          id={id}
          className="oq-input oq-input--mono"
          spellCheck={false}
          autoCapitalize="off"
          placeholder={version === 6 ? "2001:db8::/32" : "10.0.0.0/8"}
          required={required}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={detail != null || shownError ? `${id}-help` : undefined}
          {...rest}
          value={current}
          onChange={(e) => set(e.target.value)}
          onBlur={(e) => {
            setTouched(true);
            onBlur?.(e);
          }}
        />
        <span className={cx("oq-addon oq-ip__version", ok && "is-ok")}>{info ? `IPv${info.version}` : "CIDR"}</span>
      </div>
    </FieldShell>
  );
}
