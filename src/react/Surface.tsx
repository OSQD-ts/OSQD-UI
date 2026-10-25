import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { type Color, colorClass, cx } from "./cx";

export interface PaperProps extends HTMLAttributes<HTMLDivElement> {
  /** "outlined" (default) has a border, "raised" adds a shadow, "flat" has neither. */
  variant?: "outlined" | "raised" | "flat";
  padding?: 0 | 2 | 3 | 4 | 6;
}

/** A plain surface with a hairline border, optionally raised with a shadow. */
export const Paper = forwardRef<HTMLDivElement, PaperProps>(function Paper({ variant = "outlined", padding, className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cx("oq-paper", variant !== "outlined" && `oq-paper--${variant}`, padding !== undefined && `oq-p-${padding}`, className)}
    />
  );
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** A coloured strip on the left edge. */
  accent?: Color;
}

/** A bordered surface that groups related content, with optional header, body and footer. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ accent, className, ...rest }, ref) {
  return <div ref={ref} {...rest} className={cx("oq-card", accent && "oq-card--accent", colorClass(accent), className)} />;
});

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned controls. */
  actions?: ReactNode;
}

/** The top row of a Card: title, subtitle and actions. */
export function CardHeader({ title, subtitle, actions, className, children, ...rest }: CardHeaderProps) {
  return (
    <div {...rest} className={cx("oq-card__header", className)}>
      {(title != null || subtitle != null) && (
        <div className="oq-stack oq-gap-0">
          {title != null && <h3 className="oq-card__title">{title}</h3>}
          {subtitle != null && <div className="oq-card__subtitle">{subtitle}</div>}
        </div>
      )}
      {children}
      {actions != null && <div className="oq-card__actions">{actions}</div>}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** No padding — for tables and lists that run edge to edge. */
  flush?: boolean;
}

/** The padded content area of a Card; `flush` removes the padding for tables and lists. */
export function CardBody({ flush, className, ...rest }: CardBodyProps) {
  return <div {...rest} className={cx("oq-card__body", flush && "oq-card__body--flush", className)} />;
}

/** The bottom row of a Card, usually holding its buttons. */
export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("oq-card__footer", className)} />;
}

/* ---------- Accordion ---------- */

/** A stack of collapsible sections. */
export function Accordion({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("oq-accordion", className)} />;
}

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDetailsElement>, "title"> {
  title: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
}

/** One collapsible section of an Accordion: a summary line and its content. */
export function AccordionItem({ title, defaultOpen, open, children, ...rest }: AccordionItemProps) {
  return (
    <details {...rest} open={open ?? defaultOpen}>
      <summary>{title}</summary>
      <div className="oq-accordion__body">{children}</div>
    </details>
  );
}

/* ---------- Stat tile ---------- */

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: ReactNode;
  /** Colours the delta: up is success, down is danger. */
  trend?: "up" | "down";
}

/** A KPI tile: label, large value with unit, and a change shown as up or down. */
export function Stat({ label, value, unit, delta, trend, className, ...rest }: StatProps) {
  return (
    <div {...rest} className={cx("oq-stat", className)}>
      <div className="oq-stat__label">{label}</div>
      <div className="oq-stat__value">
        {value}
        {unit != null && <span className="oq-stat__unit">{unit}</span>}
      </div>
      {delta != null && <div className={cx("oq-stat__delta", trend && `is-${trend}`)}>{delta}</div>}
    </div>
  );
}

/* ---------- Empty state ---------- */

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

/** The message shown where content would be but there is none yet, with an optional action. */
export function EmptyState({ icon, title, description, action, className, children, ...rest }: EmptyStateProps) {
  return (
    <div {...rest} className={cx("oq-empty", className)}>
      {icon}
      {title != null && <div className="oq-empty__title">{title}</div>}
      {description != null && <div>{description}</div>}
      {children}
      {action}
    </div>
  );
}
