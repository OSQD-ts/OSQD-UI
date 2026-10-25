import {
  type ChangeEvent,
  createContext,
  type FormEvent,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { Button } from "../Button";
import { cx } from "../cx";
import { ErrorIcon } from "../icons";
import {
  type FormErrors,
  type FormRules,
  type FormState,
  type FormValues,
  formReducer,
  initialFormState,
  isDirty,
  validateValues,
} from "./formState";

export interface UseFormOptions<V extends FormValues> {
  initialValues: V;
  rules?: FormRules<V>;
  /** May be async; while it runs `submitting` is true. Throwing sets `submitError`. */
  onSubmit?: (values: V) => void | Promise<void>;
  /** Labels for ErrorSummary; defaults to the field name with its first letter raised. */
  labels?: Partial<Record<keyof V & string, string>>;
}

type Name<V> = keyof V & string;

export interface FormApi<V extends FormValues> {
  id: string;
  values: V;
  errors: FormErrors<V>;
  touched: FormState<V>["touched"];
  dirty: boolean;
  submitting: boolean;
  submitCount: number;
  submitError: string | undefined;
  labels: Partial<Record<Name<V>, string>>;
  /** The id given to a field's control, so labels, links and focus can find it. */
  fieldId: (name: Name<V>) => string;
  /** The error to show now: after the field was left, or after a submit. */
  visibleError: (name: Name<V>) => string | undefined;
  setValue: (name: Name<V>, value: unknown) => void;
  setErrors: (errors: FormErrors<V>) => void;
  /** Props for TextField, Select and other text-valued controls. */
  field: (name: Name<V>) => {
    id: string;
    name: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    error: string | undefined;
  };
  /** Props for Checkbox and Switch. */
  checkbox: (name: Name<V>) => { id: string; name: string; checked: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void; onBlur: () => void };
  /** Props for components with an `onChange(value)` signature (NumberInput, MultiSelect, …). */
  control: <T>(name: Name<V>) => { id: string; value: T; onChange: (value: T) => void; onBlur: () => void };
  /** Checks every field; returns true when the form is valid. */
  validate: () => boolean;
  submit: () => Promise<boolean>;
  handleSubmit: (e?: FormEvent) => void;
  reset: (values?: V) => void;
  focusField: (name: Name<V>) => void;
}

const humanise = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

export function useForm<V extends FormValues>({ initialValues, rules = {}, onSubmit, labels = {} }: UseFormOptions<V>): FormApi<V> {
  const [state, dispatch] = useReducer(formReducer<V>, initialValues, initialFormState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const id = useId();
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const fieldId = useCallback((name: string) => `${id}-${name}`, [id]);
  const focusField = useCallback(
    (name: string) => {
      const el = document.getElementById(fieldId(name));
      el?.focus();
      el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    },
    [fieldId],
  );

  const validate = useCallback(() => {
    dispatch({ type: "validateAll", rules: rulesRef.current });
    return Object.keys(validateValues(stateRef.current.values, rulesRef.current)).length === 0;
  }, []);

  const submit = useCallback(async () => {
    dispatch({ type: "submitStart" });
    const errors = validateValues(stateRef.current.values, rulesRef.current);
    dispatch({ type: "setErrors", errors });
    const first = Object.keys(errors)[0];
    if (first) {
      dispatch({ type: "submitEnd" });
      focusField(first);
      return false;
    }
    try {
      await onSubmit?.(stateRef.current.values);
      dispatch({ type: "submitEnd", commit: true });
      return true;
    } catch (err) {
      dispatch({ type: "submitEnd", error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }, [onSubmit, focusField]);

  return useMemo<FormApi<V>>(() => {
    const visibleError = (name: Name<V>) => (state.touched[name] || state.submitCount > 0 ? state.errors[name] : undefined);
    const setValue = (name: Name<V>, value: unknown) => dispatch({ type: "set", name, value, rules: rulesRef.current });
    const onBlur = (name: Name<V>) => () => dispatch({ type: "blur", name, rules: rulesRef.current });
    const allLabels = Object.fromEntries(
      [...new Set([...Object.keys(state.values), ...Object.keys(rules)])].map((k) => [k, labels[k as Name<V>] ?? humanise(k)]),
    ) as Partial<Record<Name<V>, string>>;
    return {
      id,
      values: state.values,
      errors: state.errors,
      touched: state.touched,
      dirty: isDirty(state),
      submitting: state.submitting,
      submitCount: state.submitCount,
      submitError: state.submitError,
      labels: allLabels,
      fieldId,
      visibleError,
      setValue,
      setErrors: (errors) => dispatch({ type: "setErrors", errors }),
      field: (name) => ({
        id: fieldId(name),
        name,
        value: state.values[name] == null ? "" : String(state.values[name]),
        onChange: (e) => setValue(name, e.target.value),
        onBlur: onBlur(name),
        error: visibleError(name),
      }),
      checkbox: (name) => ({
        id: fieldId(name),
        name,
        checked: Boolean(state.values[name]),
        onChange: (e) => setValue(name, e.target.checked),
        onBlur: onBlur(name),
      }),
      control: <T,>(name: Name<V>) => ({
        id: fieldId(name),
        value: state.values[name] as T,
        onChange: (value: T) => setValue(name, value),
        onBlur: onBlur(name),
      }),
      validate,
      submit,
      handleSubmit: (e) => {
        e?.preventDefault();
        void submit();
      },
      reset: (values) => dispatch(values ? { type: "reset", values } : { type: "reset" }),
      focusField,
    };
  }, [state, id, fieldId, validate, submit, focusField, labels, rules]);
}

/* ---------- Form ---------- */

// biome-ignore lint/suspicious/noExplicitAny: the context holds whichever form is rendered
const FormContext = createContext<FormApi<any> | null>(null);

/** The form rendered around the current component, if any. */
export function useFormContext<V extends FormValues = FormValues>(): FormApi<V> | null {
  return useContext(FormContext);
}

export interface FormProps<V extends FormValues> extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: FormApi<V>;
}

/** A `<form>` wired to `useForm`: browser validation off (the rules decide), submit runs `form.submit`. */
export function Form<V extends FormValues>({ form, className, children, ...rest }: FormProps<V>) {
  return (
    <FormContext.Provider value={form}>
      <form noValidate {...rest} className={cx("oq-form", className)} onSubmit={form.handleSubmit} aria-busy={form.submitting || undefined}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

/* ---------- ErrorSummary ---------- */

/**
 * The part of a form that ErrorSummary and SaveBar read. Methods are declared in method syntax,
 * which TypeScript checks bivariantly, so any typed `useForm<V>()` result can be passed here;
 * `FormApi<FormValues>` could not take one, because its methods only accept V's own field names.
 */
export interface FormStatus {
  errors: Readonly<Record<string, string | undefined>>;
  labels: Readonly<Record<string, string | undefined>>;
  dirty: boolean;
  submitting: boolean;
  submitCount: number;
  submitError: string | undefined;
  fieldId(name: string): string;
  focusField(name: string): void;
  submit(): Promise<boolean>;
  reset(): void;
}

export interface ErrorSummaryProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Defaults to the surrounding Form's form. */
  form?: FormStatus;
  title?: ReactNode;
}

/**
 * Lists every invalid field after a submit, each a link that focuses the field. Shown only once
 * the person has tried to submit, so it never greets them with a wall of red.
 */
export function ErrorSummary({ form: formProp, title, className, ...rest }: ErrorSummaryProps) {
  const ctx: FormStatus | null = useFormContext();
  const form = formProp ?? ctx;
  if (!form || form.submitCount === 0) return null;
  const entries = Object.entries(form.errors).filter(([, m]) => m) as Array<[string, string]>;
  if (entries.length === 0 && !form.submitError) return null;
  return (
    <div role="alert" tabIndex={-1} {...rest} className={cx("oq-error-summary", className)}>
      <div className="oq-error-summary__title">
        <ErrorIcon />
        {title ?? (entries.length ? `${entries.length} ${entries.length === 1 ? "field needs" : "fields need"} attention` : "Could not save")}
      </div>
      {form.submitError && <p className="oq-error-summary__message">{form.submitError}</p>}
      {entries.length > 0 && (
        <ul className="oq-error-summary__list">
          {entries.map(([name, message]) => (
            <li key={name}>
              <a
                href={`#${form.fieldId(name)}`}
                onClick={(e) => {
                  e.preventDefault();
                  form.focusField(name);
                }}
              >
                <strong>{form.labels[name] ?? name}</strong> — {message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- SaveBar ---------- */

export interface SaveBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  /** Wire to a form: shown while it is dirty, Save submits, Discard resets. */
  form?: FormStatus;
  open?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  message?: ReactNode;
  saveLabel?: ReactNode;
  discardLabel?: ReactNode;
  /** Stick to the viewport bottom (default) or render in flow. */
  sticky?: boolean;
}

/** The "unsaved changes" bar: appears while there is something to save. */
export function SaveBar({
  form: formProp,
  open,
  saving,
  onSave,
  onDiscard,
  message = "Unsaved changes",
  saveLabel = "Save changes",
  discardLabel = "Discard",
  sticky = true,
  className,
  ...rest
}: SaveBarProps) {
  const ctx: FormStatus | null = useFormContext();
  const form = formProp ?? ctx;
  const shown = open ?? form?.dirty ?? false;
  if (!shown) return null;
  const errorCount = form && form.submitCount > 0 ? Object.keys(form.errors).length : 0;
  return (
    <div role="region" aria-label="Unsaved changes" {...rest} className={cx("oq-savebar", sticky && "oq-savebar--sticky", className)}>
      <span className={cx("oq-dot", errorCount ? "oq-danger" : "oq-warning")} aria-hidden="true" />
      <span className="oq-savebar__message">
        {message}
        {errorCount > 0 && <span className="oq-savebar__errors"> · {errorCount} to fix</span>}
      </span>
      <span className="oq-spacer" />
      <Button variant="ghost" color="neutral" onClick={onDiscard ?? (() => form?.reset())} disabled={saving ?? form?.submitting}>
        {discardLabel}
      </Button>
      <Button
        onClick={onSave ?? (form ? () => void form.submit() : undefined)}
        loading={saving ?? form?.submitting ?? false}
      >
        {saveLabel}
      </Button>
    </div>
  );
}
