import type { HTMLAttributes, ReactNode } from "react";
import { type Color, colorClass, cx } from "./cx";
import { CheckIcon, CloseIcon } from "./icons";

/* ---------- Stepper ---------- */

export type StepState = "done" | "current" | "upcoming" | "error";

export interface StepItem {
  label: ReactNode;
  description?: ReactNode;
  /** Overrides the state derived from `active`. */
  state?: StepState;
}

export interface StepperProps extends HTMLAttributes<HTMLOListElement> {
  steps: StepItem[];
  /** Index of the current step; earlier steps are done, later ones upcoming. */
  active?: number;
  orientation?: "horizontal" | "vertical";
  color?: Color;
}

/** Shows progress through ordered steps, horizontal or vertical, each done, current, upcoming or in error. */
export function Stepper({ steps, active = 0, orientation = "horizontal", color, className, ...rest }: StepperProps) {
  // Phones show the marker row plus this one line instead of every label.
  const current = steps[active]?.label;
  const summary = `Step ${Math.min(active + 1, steps.length)} of ${steps.length}${typeof current === "string" || typeof current === "number" ? ` · ${current}` : ""}`;
  return (
    <ol
      {...rest}
      data-summary={orientation === "horizontal" ? summary : undefined}
      className={cx("oq-stepper", orientation === "vertical" && "oq-stepper--vertical", colorClass(color), className)}
    >
      {steps.map((step, i) => {
        const state: StepState = step.state ?? (i < active ? "done" : i === active ? "current" : "upcoming");
        const text = (
          <>
            <span className="oq-step__label">{step.label}</span>
            {step.description != null && <span className="oq-step__desc">{step.description}</span>}
          </>
        );
        return (
          <li key={i} className="oq-step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            {/* An empty marker shows the step number through a CSS counter. */}
            <span className="oq-step__marker">
              {state === "done" ? <CheckIcon /> : state === "error" ? <CloseIcon /> : null}
            </span>
            {orientation === "vertical" ? <span className="oq-step__text">{text}</span> : text}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Timeline ---------- */

export interface TimelineItem {
  title: ReactNode;
  time?: ReactNode;
  body?: ReactNode;
  color?: Color;
  /** A solid dot instead of a ring — for the events that matter most. */
  filled?: boolean;
}

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[];
}

/** A vertical log of events, each with a coloured dot, time, title and body. */
export function Timeline({ items, className, ...rest }: TimelineProps) {
  return (
    <ol {...rest} className={cx("oq-timeline", className)}>
      {items.map((item, i) => (
        <li key={i} className={cx("oq-timeline__item", item.filled && "oq-timeline__item--filled", colorClass(item.color ?? "neutral"))}>
          <span className="oq-timeline__dot" aria-hidden="true" />
          <div className="oq-timeline__content">
            <div className="oq-timeline__head">
              <span className="oq-timeline__title">{item.title}</span>
              {item.time != null && <span className="oq-timeline__time">{item.time}</span>}
            </div>
            {item.body != null && <div className="oq-timeline__body">{item.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
