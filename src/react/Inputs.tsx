import {
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Color, colorClass, cx, type Size, sizeClass } from "./cx";
import { Chip } from "./Display";
import { Progress } from "./Feedback";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "./icons";

/* ---------- NumberInput ---------- */

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size" | "type" | "min" | "max" | "step"> {
  value?: number | null;
  defaultValue?: number | null;
  /** `null` when the field is cleared. */
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Arrow keys and buttons move by `step`; Shift moves by ten steps. Default 1. */
  step?: number;
  /** Unit shown after the value, e.g. "ms". */
  unit?: ReactNode;
  size?: Size;
  /** Width of the text box (CSS length or px). */
  width?: number | string;
}

const decimals = (n: number) => (String(n).split(".")[1] ?? "").length;

/** A spin button: − and + around a text box, arrow keys, clamped to min/max and rounded to the step. */
export function NumberInput({
  value,
  defaultValue = null,
  onChange,
  min,
  max,
  step = 1,
  unit,
  size,
  width,
  disabled,
  className,
  style,
  ...rest
}: NumberInputProps) {
  const [inner, setInner] = useState<number | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const [draft, setDraft] = useState<string | null>(null);
  const places = decimals(step);

  const clamp = (n: number) => {
    let v = Math.round(n / step) * step;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return Number(v.toFixed(places));
  };
  const commit = (n: number | null) => {
    const v = n === null ? null : clamp(n);
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  const nudge = (dir: 1 | -1, big = false) => commit((current ?? min ?? 0) + dir * step * (big ? 10 : 1));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") nudge(1, e.shiftKey);
    else if (e.key === "ArrowDown") nudge(-1, e.shiftKey);
    else if (e.key === "Home" && min !== undefined) commit(min);
    else if (e.key === "End" && max !== undefined) commit(max);
    else return;
    e.preventDefault();
    setDraft(null);
  };

  const shown = draft ?? (current === null ? "" : current.toFixed(places));
  return (
    <div
      className={cx("oq-number", sizeClass(size), className)}
      style={{ ...(width !== undefined ? { "--w": typeof width === "number" ? `${width}px` : width } : {}), ...style } as CSSProperties}
    >
      <button
        type="button"
        className="oq-number__btn"
        aria-label="Decrease"
        tabIndex={-1}
        disabled={disabled || (min !== undefined && current !== null && current <= min)}
        onClick={() => nudge(-1)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <input
        type="text"
        inputMode={places ? "decimal" : "numeric"}
        role="spinbutton"
        aria-valuenow={current ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        {...rest}
        disabled={disabled}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          if (draft !== null) {
            const n = Number.parseFloat(draft.replace(",", "."));
            commit(draft.trim() === "" || Number.isNaN(n) ? null : n);
            setDraft(null);
          }
          rest.onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          onKeyDown(e);
          rest.onKeyDown?.(e);
        }}
      />
      {unit != null && <span className="oq-number__unit">{unit}</span>}
      <button
        type="button"
        className="oq-number__btn"
        aria-label="Increase"
        tabIndex={-1}
        disabled={disabled || (max !== undefined && current !== null && current >= max)}
        onClick={() => nudge(1)}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

/* ---------- TagInput ---------- */

export interface TagInputProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string[];
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  /** Return false to refuse a tag (it stays in the box, marked invalid). */
  validate?: (tag: string) => boolean;
  /** Allow the same tag twice. Default false. */
  allowDuplicates?: boolean;
  color?: Color;
  disabled?: boolean;
  /** Accessible name for the text box. */
  inputLabel?: string;
}

/** Tags as chips in an input-like box: Enter or comma adds, Backspace on an empty box removes the last. */
export function TagInput({
  value,
  defaultValue = [],
  onChange,
  placeholder,
  validate,
  allowDuplicates,
  color = "neutral",
  disabled,
  inputLabel = "Add tag",
  className,
  ...rest
}: TagInputProps) {
  const [inner, setInner] = useState(defaultValue);
  const tags = value ?? inner;
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const set = (next: string[]) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  const add = (raw: string[]) => {
    const fresh = raw.map((t) => t.trim()).filter(Boolean);
    const ok = fresh.filter((t) => (allowDuplicates || !tags.includes(t)) && (!validate || validate(t)));
    if (ok.length) set([...tags, ...ok]);
    const refused = fresh.length > ok.length;
    setInvalid(refused);
    setText(refused ? fresh.filter((t) => !ok.includes(t)).join(", ") : "");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && text.trim()) {
      e.preventDefault();
      add([text]);
    } else if (e.key === "Backspace" && text === "" && tags.length) {
      set(tags.slice(0, -1));
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (/[,\n]/.test(pasted)) {
      e.preventDefault();
      add(pasted.split(/[,\n]/));
    }
  };

  return (
    <div
      {...rest}
      className={cx("oq-tags", className)}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      onClick={() => input.current?.focus()}
    >
      {tags.map((t, i) => (
        <Chip key={`${t}-${i}`} color={color} {...(disabled ? {} : { onDelete: () => set(tags.filter((_, j) => j !== i)) })}>
          {t}
        </Chip>
      ))}
      <input
        ref={input}
        aria-label={inputLabel}
        value={text}
        disabled={disabled}
        placeholder={tags.length ? undefined : placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => text.trim() && add([text])}
      />
    </div>
  );
}

/* ---------- Combobox ---------- */

export interface ComboboxOption {
  value: string;
  label?: string;
  hint?: ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface ComboboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size"> {
  options: Array<string | ComboboxOption>;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  /** Default: case-insensitive substring match on the label. */
  filter?: (option: ComboboxOption, query: string) => boolean;
  emptyText?: ReactNode;
  size?: Size;
  color?: Color;
}

const toOption = (o: string | ComboboxOption): ComboboxOption => (typeof o === "string" ? { value: o } : o);
const labelOf = (o: ComboboxOption) => o.label ?? o.value;

function highlight(text: string, query: string): ReactNode {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

/** A text box that filters a listbox: ↑↓ move, Enter picks, Escape closes (WAI-ARIA combobox, list autocomplete). */
export function Combobox({
  options,
  value,
  defaultValue = null,
  onChange,
  filter,
  emptyText = "No results",
  size,
  color,
  placeholder,
  className,
  style,
  disabled,
  ...rest
}: ComboboxProps) {
  const all = useMemo(() => options.map(toOption), [options]);
  const [inner, setInner] = useState(defaultValue);
  const selected = value !== undefined ? value : inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const base = useId();

  const match = filter ?? ((o: ComboboxOption, q: string) => labelOf(o).toLowerCase().includes(q.toLowerCase()));
  const shown = open ? all.filter((o) => match(o, query)) : all;
  const selectedLabel = all.find((o) => o.value === selected);

  const pick = (o: ComboboxOption | undefined) => {
    if (!o || o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.(o.value);
    setOpen(false);
  };
  const openList = () => {
    setQuery("");
    setActive(Math.max(0, all.findIndex((o) => o.value === selected)));
    setOpen(true);
  };
  const move = (dir: 1 | -1) => {
    if (!shown.length) return;
    let i = active;
    for (let n = 0; n < shown.length; n++) {
      i = (i + dir + shown.length) % shown.length;
      if (!shown[i]?.disabled) break;
    }
    setActive(i);
    document.getElementById(`${base}-opt-${i}`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!open) openList();
      else move(1);
    } else if (e.key === "ArrowUp") {
      if (open) move(-1);
    } else if (e.key === "Enter" && open) {
      pick(shown[active]);
    } else if (e.key === "Escape" && open) {
      setOpen(false);
    } else return;
    e.preventDefault();
  };

  let lastGroup: string | undefined;
  return (
    <div className={cx("oq-combobox", colorClass(color), className)} style={style}>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={`${base}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && shown.length ? `${base}-opt-${active}` : undefined}
        autoComplete="off"
        {...rest}
        disabled={disabled}
        className={cx("oq-input", sizeClass(size))}
        placeholder={placeholder}
        value={open ? query : selectedLabel ? labelOf(selectedLabel) : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(e) => {
          e.currentTarget.select();
          rest.onFocus?.(e);
        }}
        onClick={() => !open && openList()}
        onBlur={(e) => {
          setOpen(false);
          rest.onBlur?.(e);
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="oq-combobox__toggle"
        tabIndex={-1}
        aria-label={open ? "Close list" : "Open list"}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <ChevronDownIcon />
      </button>
      {/* mousedown is prevented so the input keeps focus while an option is clicked. */}
      <ul id={`${base}-list`} role="listbox" className="oq-listbox" hidden={!open} onMouseDown={(e) => e.preventDefault()}>
        {shown.length === 0 && <li className="oq-listbox__empty">{emptyText}</li>}
        {shown.map((o, i) => {
          const header = o.group !== undefined && o.group !== lastGroup ? o.group : undefined;
          lastGroup = o.group;
          return [
            header !== undefined && (
              <li key={`g-${header}`} role="presentation" className="oq-listbox__group oq-overline">
                {header}
              </li>
            ),
            <li
              key={o.value}
              id={`${base}-opt-${i}`}
              role="option"
              className="oq-option"
              aria-selected={o.value === selected}
              aria-disabled={o.disabled || undefined}
              data-active={i === active || undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              <span className="oq-truncate">{highlight(labelOf(o), open ? query : "")}</span>
              {o.hint != null && <span className="oq-option__hint">{o.hint}</span>}
            </li>,
          ];
        })}
      </ul>
    </div>
  );
}

/* ---------- DropZone and file list ---------- */

/** 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${i === 0 ? n : n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export interface DropZoneProps extends Omit<HTMLAttributes<HTMLLabelElement>, "onDrop" | "title"> {
  onFiles: (files: File[]) => void;
  /** Same as the input's `accept`, e.g. ".csv,application/json". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  color?: Color;
}

/** A dashed drop area that is also a file picker (click, Enter or Space). */
export function DropZone({
  onFiles,
  accept,
  multiple = true,
  disabled,
  title,
  hint,
  color,
  className,
  children,
  ...rest
}: DropZoneProps) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const take = (list: FileList | null) => {
    const files = list ? [...list] : [];
    if (files.length && !disabled) onFiles(multiple ? files : files.slice(0, 1));
  };
  const drag = (e: DragEvent, d: number) => {
    e.preventDefault();
    depth.current = Math.max(0, depth.current + d);
    setOver(depth.current > 0);
  };

  return (
    <label
      tabIndex={disabled ? -1 : 0}
      {...rest}
      className={cx("oq-dropzone", colorClass(color), className)}
      data-over={over || undefined}
      aria-disabled={disabled || undefined}
      onDragEnter={(e) => drag(e, 1)}
      onDragLeave={(e) => drag(e, -1)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        take(e.dataTransfer.files);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          input.current?.click();
        }
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <span className="oq-dropzone__title">
        {title ?? (
          <>
            Drop files here or <u>browse</u>
          </>
        )}
      </span>
      {hint != null && <span className="oq-dropzone__hint">{hint}</span>}
      {children}
      <input
        ref={input}
        type="file"
        tabIndex={-1}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** The list of chosen files under a DropZone. */
export function FileList({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return <ul {...rest} className={cx("oq-filelist", className)} />;
}

export interface FileItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "onError"> {
  name: string;
  /** Bytes. */
  size?: number;
  /** 0–100 while uploading; omit when done. */
  progress?: number;
  /** An error message marks the file failed. */
  error?: ReactNode;
  onRemove?: () => void;
}

/** One file in a FileList: name, size, progress or error, and a remove button. */
export function FileItem({ name, size, progress, error, onRemove, className, ...rest }: FileItemProps) {
  const ext = name.includes(".") ? (name.split(".").pop() ?? "").slice(0, 4) : "file";
  const meta = error ?? [size !== undefined ? formatBytes(size) : null, progress !== undefined && progress < 100 ? `${Math.round(progress)} %` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li {...rest} className={cx("oq-file", error ? "oq-danger" : "oq-primary", className)} data-state={error ? "error" : undefined}>
      <span className="oq-file__icon" aria-hidden="true">
        {ext}
      </span>
      <span className="oq-file__name">
        <span>{name}</span>
        {meta !== "" && <span className="oq-file__meta">{meta}</span>}
      </span>
      {onRemove ? (
        <button type="button" className="oq-btn oq-btn--ghost oq-btn--icon oq-neutral oq-sm" aria-label={`Remove ${name}`} onClick={onRemove}>
          <CloseIcon />
        </button>
      ) : (
        <span />
      )}
      {progress !== undefined && progress < 100 && !error && <Progress value={progress} size="sm" />}
    </li>
  );
}
