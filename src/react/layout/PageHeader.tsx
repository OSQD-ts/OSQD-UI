import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Usually a <Breadcrumbs>. */
  breadcrumbs?: ReactNode;
  title: ReactNode;
  /** A chip or status dot shown next to the title. */
  status?: ReactNode;
  subtitle?: ReactNode;
  /** Short facts under the title (owner, updated, id); each entry becomes one item. */
  meta?: ReactNode[];
  /** Buttons on the right. */
  actions?: ReactNode;
  /** A <Tabs> strip under the header; with `bordered` it sits on the header's bottom line. */
  tabs?: ReactNode;
  /** Draw a line under the header. */
  bordered?: boolean;
  /** Heading level of the title. Default 1. */
  level?: 1 | 2;
}

/** The top of a page: where you are, what this is, and what you can do with it. */
export function PageHeader({ breadcrumbs, title, status, subtitle, meta, actions, tabs, bordered, level = 1, className, ...rest }: PageHeaderProps) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <header {...rest} className={cx("oq-page-header", bordered && "oq-page-header--bordered", className)}>
      {breadcrumbs}
      <div className="oq-page-header__row">
        <div className="oq-page-header__heading">
          <div className="oq-page-header__title-row">
            <H className="oq-page-header__title">{title}</H>
            {status}
          </div>
          {subtitle != null && <div className="oq-page-header__subtitle">{subtitle}</div>}
          {meta && meta.length > 0 && (
            <ul className="oq-page-header__meta">
              {meta.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
        {actions != null && <div className="oq-page-header__actions">{actions}</div>}
      </div>
      {tabs != null && <div className="oq-page-header__tabs">{tabs}</div>}
    </header>
  );
}

export interface DetailLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Usually a <PageHeader>. */
  header?: ReactNode;
  /** The right column: properties, people, related items. Moves above the main column on narrow screens. */
  aside?: ReactNode;
  /** Width of the aside, px or any CSS length. Default 300px. */
  asideWidth?: number | string;
}

/** A detail page: header across the top, the main content, and a column of properties beside it. */
export function DetailLayout({ header, aside, asideWidth, className, style, children, ...rest }: DetailLayoutProps) {
  const w = asideWidth === undefined ? undefined : typeof asideWidth === "number" ? `${asideWidth}px` : asideWidth;
  return (
    <div {...rest} className={cx("oq-detail", className)} style={{ ...(w ? { "--aside-w": w } : {}), ...style } as CSSProperties}>
      {header}
      <div className="oq-detail__main">{children}</div>
      {aside != null && <aside className="oq-detail__aside">{aside}</aside>}
    </div>
  );
}

export interface DetailSectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
}

/** A titled block in a DetailLayout's main column. */
export function DetailSection({ title, className, children, ...rest }: DetailSectionProps) {
  return (
    <section {...rest} className={cx("oq-detail__section", className)}>
      {title != null && <h2>{title}</h2>}
      {children}
    </section>
  );
}
