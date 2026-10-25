import {
  type ChangeEvent,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";
import { type Color, colorClass, cx, type Size, sizeClass } from "./cx";

/* ---------- Field: label + control + help/error, shared by TextField and Select ---------- */

export interface FieldProps {
  label?: ReactNode;
  /** Help text under the control. Replaced by `error` when that is a string. */
  help?: ReactNode;
  /** `true` marks the field invalid; a string also replaces the help text. */
  error?: boolean | ReactNode;
  required?: boolean;
  /** Label to the left of the control instead of above it. */
  inline?: boolean;
  fieldClassName?: string;
}

function Field({
  id,
  label,
  help,
  error,
  required,
  inline,
  fieldClassName,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  const message = typeof error === "boolean" || error == null ? help : error;
  return (
    <div className={cx("oq-field", inline && "oq-field--inline", error ? "is-invalid" : undefined, fieldClassName)}>
      {label != null && (
        <label className="oq-label" htmlFor={id}>
          {label}
          {required && (
            <span className="oq-req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {message != null && (
        <div id={`${id}-help`} className="oq-help">
          {message}
        </div>
      )}
    </div>
  );
}

const describedBy = (id: string, props: FieldProps) =>
  props.help != null || (props.error != null && typeof props.error !== "boolean") ? `${id}-help` : undefined;

/* ---------- TextField ---------- */

type InputOnly = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">;
type TextareaOnly = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "prefix">;

export interface TextFieldProps extends FieldProps, Omit<InputOnly, "onChange"> {
  size?: Size;
  /** Fixed text or an element before the value (a unit, an icon). */
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Render a `<textarea>`; `rows` sets its height. */
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => void;
}

/** A labelled text input with help text, error, required mark, prefix/suffix adornments and a multiline mode. */
export const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(function TextField(props, ref) {
  const {
    label,
    help,
    error,
    required,
    inline,
    fieldClassName,
    size,
    prefix,
    suffix,
    multiline,
    rows = 3,
    mono,
    id: idProp,
    className,
    onChange,
    ...rest
  } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const common = {
    id,
    required,
    onChange,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(id, props),
  };

  let control: ReactNode;
  if (multiline) {
    control = (
      <textarea
        ref={ref as Ref<HTMLTextAreaElement>}
        rows={rows}
        {...(rest as TextareaOnly)}
        {...common}
        className={cx("oq-textarea", mono && "oq-input--mono", className)}
      />
    );
  } else {
    const input = (
      <input
        ref={ref as Ref<HTMLInputElement>}
        {...rest}
        {...common}
        className={cx("oq-input", sizeClass(size), mono && "oq-input--mono", className)}
      />
    );
    control =
      prefix != null || suffix != null ? (
        <div className="oq-input-group">
          {prefix != null && <Adornment>{prefix}</Adornment>}
          {input}
          {suffix != null && <Adornment>{suffix}</Adornment>}
        </div>
      ) : (
        input
      );
  }

  return (
    <Field id={id} label={label} help={help} error={error} required={required ?? false} inline={inline ?? false} fieldClassName={fieldClassName ?? ""}>
      {control}
    </Field>
  );
});

/** Buttons go in the group as they are; text gets the `.oq-addon` box. */
function Adornment({ children }: { children: ReactNode }) {
  if (typeof children === "string" || typeof children === "number") return <span className="oq-addon">{children}</span>;
  return <>{children}</>;
}

/* ---------- Select ---------- */

export interface SelectOption {
  value: string;
  label?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: Size;
  /** Strings or `{ value, label }`. Children are used instead when there are no options. */
  options?: Array<string | SelectOption>;
  placeholder?: string;
}

/** A labelled native select taking `options` or option children, with a placeholder. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(props, ref) {
  const { label, help, error, required, inline, fieldClassName, size, options, placeholder, id: idProp, className, children, ...rest } =
    props;
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Field id={id} label={label} help={help} error={error} required={required ?? false} inline={inline ?? false} fieldClassName={fieldClassName ?? ""}>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, props)}
        {...rest}
        className={cx("oq-select", sizeClass(size), className)}
      >
        {placeholder != null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((o) => {
              const opt = typeof o === "string" ? { value: o } : o;
              return (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label ?? opt.value}
                </option>
              );
            })
          : children}
      </select>
    </Field>
  );
});

/* ---------- Checkbox, Radio, Switch ---------- */

export interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  color?: Color;
}

export interface CheckboxProps extends CheckProps {
  /** The "some but not all" state; set on the DOM node, since HTML has no attribute for it. */
  indeterminate?: boolean;
}

/** A checkbox with its label, including the indeterminate state. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, color, indeterminate = false, className, ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const input = <input ref={inner} type="checkbox" {...rest} className={cx("oq-checkbox", colorClass(color), label == null && className)} />;
  if (label == null) return input;
  return (
    <label className={cx("oq-check", colorClass(color), className)}>
      {input}
      <span>{label}</span>
    </label>
  );
});

/** An on/off toggle with its label, for settings that apply immediately. */
export const Switch = forwardRef<HTMLInputElement, CheckProps>(function Switch({ label, color, className, ...rest }, ref) {
  const input = <input ref={ref} type="checkbox" role="switch" {...rest} className={cx("oq-switch", colorClass(color), label == null && className)} />;
  if (label == null) return input;
  return (
    <label className={cx("oq-check", colorClass(color), className)}>
      {input}
      <span>{label}</span>
    </label>
  );
});

interface RadioGroupContext {
  name: string;
  value: string | undefined;
  onChange: ((value: string) => void) | undefined;
}
const RadioCtx = createContext<RadioGroupContext | null>(null);

/** A single radio button with its label; use inside a RadioGroup. */
export const Radio = forwardRef<HTMLInputElement, CheckProps>(function Radio({ label, color, className, ...rest }, ref) {
  const group = useContext(RadioCtx);
  const grouped =
    group && rest.value != null
      ? {
          name: group.name,
          ...(group.value !== undefined ? { checked: group.value === String(rest.value) } : {}),
          onChange: (e: ChangeEvent<HTMLInputElement>) => {
            rest.onChange?.(e);
            group.onChange?.(e.target.value);
          },
        }
      : {};
  const input = <input ref={ref} type="radio" {...rest} {...grouped} className={cx("oq-radio", colorClass(color), label == null && className)} />;
  if (label == null) return input;
  return (
    <label className={cx("oq-check", colorClass(color), className)}>
      {input}
      <span>{label}</span>
    </label>
  );
});

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: ReactNode;
  /** Lay the options out in a row. */
  row?: boolean;
}

/** Groups radios under one name and value, with a label and optional horizontal layout. */
export function RadioGroup({ name, value, onChange, label, row, className, children, ...rest }: RadioGroupProps) {
  const auto = useId();
  const labelId = `${auto}-label`;
  return (
    <div role="radiogroup" aria-labelledby={label != null ? labelId : undefined} {...rest} className={cx("oq-field", className)}>
      {label != null && (
        <div id={labelId} className="oq-label">
          {label}
        </div>
      )}
      <div className={row ? "oq-row oq-wrap oq-gap-4" : "oq-stack oq-gap-2"}>
        <RadioCtx.Provider value={{ name: name ?? auto, value, onChange }}>{children}</RadioCtx.Provider>
      </div>
    </div>
  );
}

/* ---------- Slider ---------- */

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  color?: Color;
}

/** A range slider with label and the current value shown. */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider({ color, className, ...rest }, ref) {
  return <input ref={ref} type="range" {...rest} className={cx("oq-range", colorClass(color), className)} />;
});
