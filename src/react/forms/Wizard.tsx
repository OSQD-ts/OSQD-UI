import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "../Button";
import { cx } from "../cx";
import { Dialog } from "../Overlay";
import { type StepItem, Stepper } from "../Steps";

/* ---------- Wizard ---------- */

export interface WizardApi {
  active: number;
  count: number;
  next: () => Promise<boolean>;
  back: () => void;
  /** Jump to an earlier step (later ones must be reached through Next, so they get validated). */
  goTo: (index: number) => void;
}

export interface WizardStep {
  label: ReactNode;
  description?: ReactNode;
  content: ReactNode | ((api: WizardApi) => ReactNode);
  /** Runs on Next. `false` or a message stops the wizard on this step. */
  validate?: () => boolean | string | undefined | Promise<boolean | string | undefined>;
}

export interface WizardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  steps: WizardStep[];
  /** Runs on the last step's button; may be async (the button shows a spinner). */
  onFinish: () => void | Promise<void>;
  onCancel?: () => void;
  finishLabel?: ReactNode;
  orientation?: "horizontal" | "vertical";
  /** Controlled step index. */
  active?: number;
  onStepChange?: (index: number) => void;
}

/** A multi-step form on top of Stepper: Back / Next / Finish, with each step checked before moving on. */
export function Wizard({
  steps,
  onFinish,
  onCancel,
  finishLabel = "Finish",
  orientation = "horizontal",
  active: activeProp,
  onStepChange,
  className,
  ...rest
}: WizardProps) {
  const [inner, setInner] = useState(0);
  const active = activeProp ?? inner;
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const last = active === steps.length - 1;

  const go = useCallback(
    (i: number) => {
      if (activeProp === undefined) setInner(i);
      onStepChange?.(i);
      setErrorStep(null);
      setMessage(null);
      // Move focus to the new step so keyboard and screen-reader users land on it.
      requestAnimationFrame(() => body.current?.focus());
    },
    [activeProp, onStepChange],
  );

  const check = async () => {
    const result = await steps[active]?.validate?.();
    if (result === false || typeof result === "string") {
      setErrorStep(active);
      setMessage(typeof result === "string" ? result : "Fix the highlighted fields to continue.");
      return false;
    }
    return true;
  };

  const api: WizardApi = {
    active,
    count: steps.length,
    next: async () => {
      if (!(await check())) return false;
      if (!last) go(active + 1);
      return true;
    },
    back: () => active > 0 && go(active - 1),
    goTo: (i) => i < active && i >= 0 && go(i),
  };

  const onPrimary = async () => {
    setBusy(true);
    try {
      if (!(await check())) return;
      if (last) await onFinish();
      else go(active + 1);
    } finally {
      setBusy(false);
    }
  };

  const stepItems: StepItem[] = steps.map((s, i) => ({
    label: s.label,
    ...(s.description != null ? { description: s.description } : {}),
    ...(errorStep === i ? { state: "error" as const } : {}),
  }));
  const step = steps[active];

  return (
    <div {...rest} className={cx("oq-wizard", orientation === "vertical" && "oq-wizard--vertical", className)}>
      <Stepper steps={stepItems} active={active} orientation={orientation} />
      <div className="oq-wizard__main">
        <div ref={body} className="oq-wizard__body" role="group" aria-labelledby={titleId} tabIndex={-1}>
          <h3 id={titleId} className="oq-wizard__title">
            {step?.label}
          </h3>
          {typeof step?.content === "function" ? step.content(api) : step?.content}
        </div>
        {message && (
          <div className="oq-alert oq-danger" role="alert">
            <div className="oq-alert__content">{message}</div>
          </div>
        )}
        <div className="oq-wizard__footer">
          {onCancel && (
            <Button variant="ghost" color="neutral" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <span className="oq-wizard__count">
            Step {active + 1} of {steps.length}
          </span>
          <span className="oq-spacer" />
          <Button variant="outline" color="neutral" onClick={api.back} disabled={active === 0 || busy}>
            Back
          </Button>
          <Button onClick={() => void onPrimary()} loading={busy}>
            {last ? finishLabel : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- confirm() ---------- */

export interface ConfirmOptions {
  title: ReactNode;
  message?: ReactNode;
  /** Red confirm button, for actions that destroy something. */
  danger?: boolean;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** The person must type this exact text before the confirm button works. */
  typeToConfirm?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * `const confirm = useConfirm(); if (await confirm({ title: "Delete node?", danger: true })) …`
 * Outside a ConfirmProvider it falls back to the browser's own confirm box, so it never throws.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  return (
    ctx ??
    (async (o) => {
      if (typeof window === "undefined") return false;
      const text = [typeof o.title === "string" ? o.title : "", typeof o.message === "string" ? o.message : ""].filter(Boolean).join("\n\n");
      return window.confirm(text || "Are you sure?");
    })
  );
}

interface Pending {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

/** Hosts the confirmation dialog for its subtree; `useConfirm()` inside it returns `await confirm({...})` → boolean. */
export function ConfirmProvider({ children }: { children?: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [typed, setTyped] = useState("");
  const inputId = useId();

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setTyped("");
        setPending((prev) => {
          prev?.resolve(false); // a second confirm replaces the first, which counts as cancelled
          return { options, resolve };
        });
      }),
    [],
  );

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const o = pending?.options;
  const blocked = Boolean(o?.typeToConfirm) && typed !== o?.typeToConfirm;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={pending !== null}
        onClose={() => finish(false)}
        title={o?.title}
        width={440}
        hideClose
        className="oq-confirm"
        footer={
          <>
            <Button variant="ghost" color="neutral" onClick={() => finish(false)}>
              {o?.cancelLabel ?? "Cancel"}
            </Button>
            <Button color={o?.danger ? "danger" : "primary"} disabled={blocked} onClick={() => finish(true)} autoFocus={!o?.typeToConfirm}>
              {o?.confirmLabel ?? (o?.danger ? "Delete" : "Confirm")}
            </Button>
          </>
        }
      >
        {o?.message != null && <div className="oq-confirm__message">{o.message}</div>}
        {o?.typeToConfirm && (
          <div className="oq-field oq-confirm__type">
            <label className="oq-label" htmlFor={inputId}>
              Type <code>{o.typeToConfirm}</code> to confirm
            </label>
            <input
              id={inputId}
              className="oq-input oq-input--mono"
              value={typed}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !blocked) finish(true);
              }}
            />
          </div>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
