import type { HTMLAttributes, ReactNode } from "react";
import { type Color, colorClass, cx } from "../cx";
import { Illustration, type IllustrationName } from "../Icon";

export type ErrorPageVariant = "404" | "500" | "offline" | "forbidden";

interface VariantDefaults {
  illustration: IllustrationName;
  code: string;
  title: string;
  message: string;
  color: Color;
}

/** The words and pictures each variant starts with; every one can be overridden by a prop. */
export const ERROR_PAGE_DEFAULTS: Record<ErrorPageVariant, VariantDefaults> = {
  "404": {
    illustration: "error-404",
    code: "404",
    title: "Page not found",
    message: "The address may be mistyped, or the page has moved. Check the link, or go back to the start.",
    color: "warning",
  },
  "500": {
    illustration: "server-error",
    code: "500",
    title: "Something went wrong",
    message: "The server hit an error it could not recover from. Try again in a moment; if it keeps happening, the details below help whoever looks into it.",
    color: "danger",
  },
  offline: {
    illustration: "offline",
    code: "OFFLINE",
    title: "You're offline",
    message: "The connection to the server was lost. This page will work again as soon as the network is back.",
    color: "info",
  },
  forbidden: {
    illustration: "locked",
    code: "403",
    title: "No access",
    message: "Your account is signed in but is not allowed to see this page. Ask an administrator for access.",
    color: "secondary",
  },
};

export interface ErrorPageProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant: ErrorPageVariant;
  title?: ReactNode;
  message?: ReactNode;
  /** The small code line above the title; `false` hides it. */
  code?: ReactNode | false;
  /** Buttons or links, e.g. "Go home" and "Retry". */
  actions?: ReactNode;
  /** Technical details (request id, stack) in a closed disclosure. */
  details?: string;
  /** Fill the whole viewport height instead of 60% of it. */
  fullHeight?: boolean;
  /** Small print at the bottom (support contact, request id). */
  footer?: ReactNode;
}

/** A full-page error or status screen: 404, 500, offline, no access. */
export function ErrorPage({ variant, title, message, code, actions, details, fullHeight, footer, className, ...rest }: ErrorPageProps) {
  const d = ERROR_PAGE_DEFAULTS[variant];
  return (
    <div role="main" {...rest} className={cx("oq-error-page", fullHeight && "oq-error-page--full", colorClass(d.color), className)}>
      <Illustration name={d.illustration} width={200} />
      {code !== false && <div className="oq-error-page__code">{code ?? d.code}</div>}
      <h1 className="oq-error-page__title">{title ?? d.title}</h1>
      <p className="oq-error-page__message">{message ?? d.message}</p>
      {actions != null && <div className="oq-error-page__actions">{actions}</div>}
      {details && (
        <details className="oq-error-page__details">
          <summary>Technical details</summary>
          <pre className="oq-pre">{details}</pre>
        </details>
      )}
      {footer != null && <div className="oq-error-page__foot">{footer}</div>}
    </div>
  );
}
