import {
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { darkTheme, type Palette } from "../../theme/index";
import { cx, type Size, sizeClass } from "../cx";
import { Icon } from "../Icon";
import { ChevronDownIcon } from "../icons";
import { useTheme } from "../ThemeProvider";
import { FieldShell, type FieldShellProps, helpId, shellProps } from "./FieldShell";
import { scorePassword } from "./password";
import { normalizeHex } from "./validators";

/* ---------- MultiSelect ---------- */

export interface MultiSelectOption {
  value: string;
  label?: ReactNode;
  /** Text matched by the search box when `label` is not a string. */
  text?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

export interface MultiSelectProps extends FieldShellProps {
  options: Array<string | MultiSelectOption>;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Show a search box; on by default from eight options. */
  searchable?: boolean;
  /** Chips shown in the closed box before "+n". */
  maxChips?: number;
  size?: Size;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const optionOf = (o: string | MultiSelectOption): MultiSelectOption => (typeof o === "string" ? { value: o } : o);
const optionText = (o: MultiSelectOption) => o.text ?? (typeof o.label === "string" ? o.label : o.value);

/** Many-of-many choice: a closed box showing chips, opening a checkbox list with search and "Select all". */
export function MultiSelect(props: MultiSelectProps) {
  const {
    options: rawOptions,
    value,
    defaultValue = [],
    onChange,
    onBlur,
    placeholder = "Select…",
    searchable,
    maxChips = 2,
    size,
    disabled,
    id: idProp,
    className,
  } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const options = useMemo(() => rawOptions.map(optionOf), [rawOptions]);
  const [inner, setInner] = useState<string[]>(defaultValue);
  const selected = value ?? inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const showSearch = searchable ?? options.length >= 8;

  const visible = options.filter((o) => optionText(o).toLowerCase().includes(query.trim().toLowerCase()));
  const enabled = visible.filter((o) => !o.disabled);
  const allOn = enabled.length > 0 && enabled.every((o) => selected.includes(o.value));
  const someOn = enabled.some((o) => selected.includes(o.value));

  const commit = (next: string[]) => {
    // Keep the options' order, whatever order they were clicked in.
    const ordered = options.map((o) => o.value).filter((v) => next.includes(v));
    if (value === undefined) setInner(ordered);
    onChange?.(ordered);
  };
  const toggle = (v: string) => commit(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const toggleAll = () =>
    commit(allOn ? selected.filter((v) => !enabled.some((o) => o.value === v)) : [...new Set([...selected, ...enabled.map((o) => o.value)])]);

  const close = (focusTrigger = false) => {
    setOpen(false);
    setQuery("");
    onBlur?.();
    if (focusTrigger) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    (showSearch ? search.current : list.current)?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // Runs when the panel opens; `close` is recreated each render and need not retrigger it.
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" || (e.key === " " && e.target !== search.current)) {
      e.preventDefault();
      const o = visible[active];
      if (o && !o.disabled) toggle(o.value);
    } else if (e.key === "a" && (e.ctrlKey || e.metaKey) && e.target !== search.current) {
      e.preventDefault();
      toggleAll();
    }
  };

  const chosen = options.filter((o) => selected.includes(o.value));
  const listId = `${id}-list`;

  return (
    <FieldShell id={id} {...shellProps(props)}>
      <div ref={root} className={cx("oq-multiselect", sizeClass(size), className)}>
        <button
          ref={trigger}
          id={id}
          type="button"
          className="oq-multiselect__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={helpId(id, props)}
          disabled={disabled}
          onClick={() => (open ? close() : setOpen(true))}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {chosen.length === 0 ? (
            <span className="oq-multiselect__placeholder">{placeholder}</span>
          ) : (
            <span className="oq-multiselect__chips">
              {chosen.slice(0, maxChips).map((o) => (
                <span key={o.value} className="oq-chip oq-sm oq-neutral">
                  {o.label ?? o.value}
                </span>
              ))}
              {chosen.length > maxChips && <span className="oq-multiselect__more">+{chosen.length - maxChips}</span>}
            </span>
          )}
          <ChevronDownIcon className="oq-multiselect__caret" aria-hidden="true" />
        </button>
        {/* On phones the panel is a bottom sheet; this scrim (hidden on wider screens) closes it. */}
        {open && <div className="oq-multiselect__scrim" aria-hidden="true" onClick={() => close(true)} />}
        {open && (
          <div className="oq-multiselect__panel" onKeyDown={onKeyDown}>
            {showSearch && (
              <input
                ref={search}
                className="oq-input oq-sm oq-multiselect__search"
                placeholder="Search…"
                aria-label="Search options"
                aria-controls={listId}
                aria-activedescendant={visible[active] ? `${id}-opt-${active}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
              />
            )}
            <label className="oq-check oq-multiselect__all">
              <input
                type="checkbox"
                className="oq-checkbox"
                checked={allOn}
                ref={(el) => {
                  if (el) el.indeterminate = someOn && !allOn;
                }}
                onChange={toggleAll}
                disabled={enabled.length === 0}
              />
              <span>{query ? `Select all matching (${enabled.length})` : `Select all (${enabled.length})`}</span>
            </label>
            <ul
              ref={list}
              id={listId}
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={props.label != null ? `${id}-label` : undefined}
              tabIndex={showSearch ? -1 : 0}
              aria-activedescendant={!showSearch && visible[active] ? `${id}-opt-${active}` : undefined}
              className="oq-multiselect__list"
            >
              {visible.length === 0 && <li className="oq-listbox__empty">No options match “{query}”</li>}
              {visible.map((o, i) => {
                const on = selected.includes(o.value);
                return (
                  <li
                    key={o.value}
                    id={`${id}-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={on}
                    aria-disabled={o.disabled || undefined}
                    data-active={i === active || undefined}
                    className="oq-multiselect__option"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => !o.disabled && toggle(o.value)}
                  >
                    <input type="checkbox" className="oq-checkbox" checked={on} readOnly tabIndex={-1} aria-hidden="true" />
                    <span className="oq-truncate">{o.label ?? o.value}</span>
                    {o.hint != null && <span className="oq-option__hint">{o.hint}</span>}
                  </li>
                );
              })}
            </ul>
            <div className="oq-multiselect__footer">
              <span>{selected.length} selected</span>
              <span className="oq-spacer" />
              <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm" onClick={() => commit([])} disabled={selected.length === 0}>
                Clear
              </button>
              <button type="button" className="oq-btn oq-btn--soft oq-sm" onClick={() => close(true)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </FieldShell>
  );
}

/* ---------- ColorInput ---------- */

const PRESET_KEYS: Array<keyof Palette> = ["primary", "secondary", "success", "warning", "danger", "info", "neutral"];

export interface ColorInputProps extends FieldShellProps {
  value?: string;
  defaultValue?: string;
  onChange?: (hex: string) => void;
  onBlur?: () => void;
  /** Swatches offered below the field; defaults to the current theme's intent colours. */
  presets?: string[];
  id?: string;
  disabled?: boolean;
  className?: string;
}

/** A colour field: swatch, hex text, the native picker and preset swatches taken from the current theme. */
export function ColorInput(props: ColorInputProps) {
  const { value, defaultValue = "#78dce8", onChange, onBlur, presets, id: idProp, disabled, className } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const { theme } = useTheme();
  const palette = theme?.palette ?? darkTheme.palette;
  const swatches = presets ?? PRESET_KEYS.map((k) => palette[k]);
  const [inner, setInner] = useState(normalizeHex(defaultValue) ?? "#000000");
  const current = normalizeHex(value ?? inner) ?? inner;
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (hex: string) => {
    if (value === undefined) setInner(hex);
    onChange?.(hex);
  };
  const draftValid = draft === null || normalizeHex(draft) !== null;

  return (
    <FieldShell id={id} {...shellProps(props)} error={props.error ?? (draftValid ? undefined : "Use #rgb or #rrggbb.")}>
      <div className={cx("oq-color", className)}>
        <label className="oq-color__swatch" style={{ "--swatch": current } as CSSProperties}>
          <input type="color" value={current} disabled={disabled} aria-label="Pick a colour" onChange={(e) => commit(e.target.value)} />
        </label>
        <input
          id={id}
          className="oq-input oq-input--mono oq-color__hex"
          value={draft ?? current}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          aria-invalid={!draftValid || props.error ? true : undefined}
          aria-describedby={helpId(id, props)}
          onChange={(e) => {
            setDraft(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex && e.target.value.replace("#", "").length === 6) commit(hex);
          }}
          onBlur={() => {
            const hex = draft !== null ? normalizeHex(draft) : null;
            if (hex) commit(hex);
            if (draft === null || hex) setDraft(null);
            onBlur?.();
          }}
        />
      </div>
      {swatches.length > 0 && (
        <div className="oq-color__presets" role="group" aria-label="Preset colours">
          {swatches.map((c) => {
            const hex = normalizeHex(c) ?? c;
            return (
              <button
                key={hex}
                type="button"
                className="oq-color__preset"
                style={{ "--swatch": hex } as CSSProperties}
                aria-pressed={hex === current}
                aria-label={hex}
                title={hex}
                disabled={disabled}
                onClick={() => {
                  setDraft(null);
                  commit(hex);
                }}
              />
            );
          })}
        </div>
      )}
    </FieldShell>
  );
}

/* ---------- PasswordInput ---------- */

export interface PasswordInputProps extends FieldShellProps, Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Show the strength meter under the field (for choosing a password, not for logging in). */
  showStrength?: boolean;
  size?: Size;
}

/** A password field with show/hide and an optional strength meter. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(props, ref) {
  const { label, help, error, required, fieldClassName, showStrength = false, size, id: idProp, className, onChange, value, defaultValue, ...rest } =
    props;
  const auto = useId();
  const id = idProp ?? auto;
  const [shown, setShown] = useState(false);
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const strength = showStrength ? scorePassword(current) : null;
  const lit = strength && current ? Math.max(strength.score, 1) : 0;

  return (
    <FieldShell
      id={id}
      label={label}
      help={strength && current && !error ? (strength.hints[0] ?? help) : help}
      error={error}
      required={required ?? false}
      fieldClassName={fieldClassName ?? ""}
    >
      <div className={cx("oq-input-group oq-password", sizeClass(size))}>
        <input
          ref={ref}
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={showStrength ? "new-password" : "current-password"}
          spellCheck={false}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={helpId(id, props) ?? (strength && current ? `${id}-help` : undefined)}
          {...rest}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (value === undefined) setInner(e.target.value);
            onChange?.(e);
          }}
          className={cx("oq-input", className)}
        />
        <button
          type="button"
          className="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm oq-password__toggle"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          aria-controls={id}
          onClick={() => setShown((s) => !s)}
        >
          <Icon name={shown ? "eye-off" : "eye"} size={16} />
        </button>
      </div>
      {strength && (
        <div className="oq-strength" data-score={current ? strength.score : undefined} aria-live="polite">
          <span className="oq-strength__bars" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} data-on={n <= lit || undefined} />
            ))}
          </span>
          <span className="oq-strength__label">{current ? strength.label : "Strength"}</span>
        </div>
      )}
    </FieldShell>
  );
});

/* ---------- OtpInput ---------- */

export interface OtpInputProps extends FieldShellProps {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Called once every cell is filled. */
  onComplete?: (value: string) => void;
  /** `numeric` (default) accepts digits; `alphanumeric` letters too, upper-cased. */
  mode?: "numeric" | "alphanumeric";
  /** Put a gap after this many cells (e.g. 3 for "123 456"). */
  groupSize?: number;
  /** Hide the characters, as for a PIN. */
  mask?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
}

/** A row of single-character boxes for one-time codes; pasting fills every box and Backspace moves back. */
export function OtpInput(props: OtpInputProps) {
  const {
    length = 6,
    value,
    defaultValue = "",
    onChange,
    onComplete,
    mode = "numeric",
    groupSize,
    mask,
    disabled,
    autoFocus,
    id: idProp,
    className,
  } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const [inner, setInner] = useState(defaultValue.slice(0, length));
  const current = (value ?? inner).slice(0, length);
  const cells = useRef<Array<HTMLInputElement | null>>([]);
  const allowed = mode === "numeric" ? /\d/ : /[a-z0-9]/i;
  const clean = (s: string) =>
    [...s]
      .filter((c) => allowed.test(c))
      .join("")
      .toUpperCase();

  const set = (next: string) => {
    const v = next.slice(0, length);
    if (value === undefined) setInner(v);
    onChange?.(v);
    if (v.length === length && !v.includes(" ")) onComplete?.(v);
  };
  /** Writes `chars` starting at cell `i`, then focuses the cell after the last one written. */
  const fill = (i: number, chars: string) => {
    const arr = current.padEnd(length, " ").split("");
    let j = i;
    for (const c of chars) {
      if (j >= length) break;
      arr[j++] = c;
    }
    set(arr.join("").trimEnd());
    cells.current[Math.min(j, length - 1)]?.focus();
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = current.padEnd(length, " ").split("");
      const target = arr[i] && arr[i] !== " " ? i : i - 1;
      if (target < 0) return;
      arr[target] = " ";
      set(arr.join("").trimEnd());
      cells.current[target]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      cells.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      cells.current[i + 1]?.focus();
    }
  };

  return (
    <FieldShell id={`${id}-0`} {...shellProps(props)}>
      <div
        className={cx("oq-otp", className)}
        role="group"
        aria-labelledby={props.label != null ? `${id}-0-label` : undefined}
        aria-describedby={helpId(`${id}-0`, props)}
      >
        {Array.from({ length }, (_, i) => {
          const ch = current[i] && current[i] !== " " ? current[i] : "";
          return (
            <span key={i} className="oq-otp__slot">
              {groupSize && i > 0 && i % groupSize === 0 && <span className="oq-otp__sep" aria-hidden="true" />}
              <input
                ref={(el) => {
                  cells.current[i] = el;
                }}
                id={`${id}-${i}`}
                className="oq-otp__cell"
                type={mask ? "password" : "text"}
                inputMode={mode === "numeric" ? "numeric" : "text"}
                autoComplete={i === 0 ? "one-time-code" : "off"}
                autoFocus={autoFocus && i === 0}
                maxLength={length}
                value={ch}
                disabled={disabled}
                aria-label={`Character ${i + 1} of ${length}`}
                aria-invalid={props.error ? true : undefined}
                onFocus={(e) => e.target.select()}
                onKeyDown={onKeyDown(i)}
                onChange={(e) => {
                  const chars = clean(e.target.value.replace(ch, ""));
                  if (chars) fill(i, chars);
                }}
                onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
                  e.preventDefault();
                  const chars = clean(e.clipboardData.getData("text"));
                  if (chars) fill(i, chars);
                }}
              />
            </span>
          );
        })}
      </div>
    </FieldShell>
  );
}
