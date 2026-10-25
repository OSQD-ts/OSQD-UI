/**
 * The form state machine, kept pure so it can be tested without rendering: `useForm` is a thin
 * hook over `formReducer`.
 */

import { runValidators, type Validator } from "./validators";

export type FormValues = Record<string, unknown>;
export type FormErrors<V extends FormValues> = Partial<Record<keyof V & string, string>>;
export type FormRules<V extends FormValues> = Partial<Record<keyof V & string, Array<Validator<unknown, V>>>>;

export interface FormState<V extends FormValues> {
  initial: V;
  values: V;
  errors: FormErrors<V>;
  touched: Partial<Record<keyof V & string, boolean>>;
  submitting: boolean;
  submitCount: number;
  /** Set when the submit handler threw; shown by ErrorSummary. */
  submitError: string | undefined;
}

export type FormAction<V extends FormValues> =
  | { type: "set"; name: keyof V & string; value: unknown; rules: FormRules<V> }
  | { type: "blur"; name: keyof V & string; rules: FormRules<V> }
  | { type: "validateAll"; rules: FormRules<V> }
  | { type: "submitStart" }
  | { type: "submitEnd"; error?: string; commit?: boolean }
  | { type: "reset"; values?: V }
  | { type: "setErrors"; errors: FormErrors<V> };

export function initialFormState<V extends FormValues>(values: V): FormState<V> {
  return { initial: values, values, errors: {}, touched: {}, submitting: false, submitCount: 0, submitError: undefined };
}

export function validateValues<V extends FormValues>(values: V, rules: FormRules<V>): FormErrors<V> {
  const errors: FormErrors<V> = {};
  for (const name of Object.keys(rules) as Array<keyof V & string>) {
    const message = runValidators(rules[name], values[name], values);
    if (message) errors[name] = message;
  }
  return errors;
}

function withError<V extends FormValues>(errors: FormErrors<V>, name: keyof V & string, message: string | undefined): FormErrors<V> {
  const next = { ...errors };
  if (message) next[name] = message;
  else delete next[name];
  return next;
}

export function formReducer<V extends FormValues>(state: FormState<V>, action: FormAction<V>): FormState<V> {
  switch (action.type) {
    case "set": {
      const values = { ...state.values, [action.name]: action.value } as V;
      // Re-check a field as it changes only once it has been shown an error (touched or submitted);
      // complaining about the first keystroke of an e-mail address is noise.
      const live = state.touched[action.name] || state.submitCount > 0;
      const errors = live ? withError(state.errors, action.name, runValidators(action.rules[action.name], action.value, values)) : state.errors;
      return { ...state, values, errors };
    }
    case "blur": {
      const message = runValidators(action.rules[action.name], state.values[action.name], state.values);
      return { ...state, touched: { ...state.touched, [action.name]: true }, errors: withError(state.errors, action.name, message) };
    }
    case "validateAll":
      return { ...state, errors: validateValues(state.values, action.rules) };
    case "submitStart":
      return { ...state, submitting: true, submitCount: state.submitCount + 1, submitError: undefined };
    case "submitEnd":
      // A successful submit makes the saved values the new baseline, so the form is clean again.
      return {
        ...state,
        submitting: false,
        submitError: action.error,
        ...(action.commit ? { initial: state.values } : {}),
      };
    case "reset": {
      const values = action.values ?? state.initial;
      return initialFormState(values);
    }
    case "setErrors":
      return { ...state, errors: action.errors };
  }
}

/** Shallow, order-insensitive equality for form values (arrays and plain objects compared by JSON). */
export function isDirty<V extends FormValues>(state: FormState<V>): boolean {
  const keys = new Set([...Object.keys(state.initial), ...Object.keys(state.values)]);
  for (const k of keys) {
    const a = state.initial[k];
    const b = state.values[k];
    if (a === b) continue;
    if (typeof a === "object" && typeof b === "object" && JSON.stringify(a) === JSON.stringify(b)) continue;
    return true;
  }
  return false;
}
