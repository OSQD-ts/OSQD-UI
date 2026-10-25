import type { ReactNode } from "react";
import { cx } from "../cx";

/** Label, help and error props shared by every input in this folder (same markup as TextField). */
export interface FieldShellProps {
  label?: ReactNode;
  help?: ReactNode;
  /** `true` marks the field invalid; a string also replaces the help text. */
  error?: boolean | ReactNode;
  required?: boolean;
  fieldClassName?: string;
}

/** The label, help and error frame shared by the form inputs; wrap a custom control in it to get the same layout. */
export function FieldShell({
  id,
  label,
  help,
  error,
  required,
  fieldClassName,
  labelIsFor = true,
  children,
}: FieldShellProps & { id: string; labelIsFor?: boolean; children: ReactNode }) {
  const message = typeof error === "boolean" || error == null ? help : error;
  const Label = labelIsFor ? "label" : "div";
  return (
    <div className={cx("oq-field", error ? "is-invalid" : undefined, fieldClassName)}>
      {label != null && (
        <Label className="oq-label" id={`${id}-label`} {...(labelIsFor ? { htmlFor: id } : {})}>
          {label}
          {required && (
            <span className="oq-req" aria-hidden="true">
              *
            </span>
          )}
        </Label>
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

export const helpId = (id: string, p: FieldShellProps) =>
  p.help != null || (p.error != null && typeof p.error !== "boolean") ? `${id}-help` : undefined;

/** Just the FieldShell props out of a component's props, so its own `id` never overrides the shell's. */
export const shellProps = (p: FieldShellProps): FieldShellProps => ({
  label: p.label,
  help: p.help,
  error: p.error,
  required: p.required ?? false,
  fieldClassName: p.fieldClassName ?? "",
});
