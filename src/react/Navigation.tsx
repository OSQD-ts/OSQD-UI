import {
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { type Color, colorClass, cx } from "./cx";

/* ---------- Tabs ---------- */

export interface TabItem {
  value: string;
  label: ReactNode;
  /** Panel content; tabs without content are a plain tab strip (e.g. for routing). */
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  color?: Color;
  /** Keep hidden panels mounted (state survives switching). */
  keepMounted?: boolean;
}

/** WAI-ARIA tabs: arrows move between tabs, Home/End jump, focus follows selection. */
export function Tabs({ items, value, defaultValue, onChange, color, keepMounted, className, ...rest }: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? items.find((i) => !i.disabled)?.value);
  const current = value ?? inner;
  const base = useId();
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const select = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((i) => !i.disabled);
    const at = enabled.findIndex((i) => i.value === current);
    let to: number;
    if (e.key === "ArrowRight") to = (at + 1) % enabled.length;
    else if (e.key === "ArrowLeft") to = (at - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = enabled.length - 1;
    else return;
    e.preventDefault();
    const target = enabled[to];
    if (!target) return;
    select(target.value);
    refs.current.get(target.value)?.focus();
  };

  const hasPanels = items.some((i) => i.content !== undefined);
  return (
    <div {...rest} className={className}>
      <div role="tablist" className={cx("oq-tabs", colorClass(color))} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const selected = item.value === current;
          return (
            <button
              key={item.value}
              ref={(el) => {
                if (el) refs.current.set(item.value, el);
                else refs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={hasPanels ? `${base}-panel-${item.value}` : undefined}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className="oq-tab"
              onClick={() => select(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {hasPanels &&
        items.map((item) => {
          const selected = item.value === current;
          if (!selected && !keepMounted) return null;
          return (
            <div
              key={item.value}
              role="tabpanel"
              id={`${base}-panel-${item.value}`}
              aria-labelledby={`${base}-tab-${item.value}`}
              hidden={!selected}
              className="oq-tabpanel"
            >
              {item.content}
            </div>
          );
        })}
    </div>
  );
}

/* ---------- Segmented ---------- */

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: Array<string | { value: string; label: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}

/** A compact single-choice switch of a few options, e.g. a time range. */
export function Segmented({ options, value, onChange, className, ...rest }: SegmentedProps) {
  return (
    <div role="group" {...rest} className={cx("oq-segmented", className)}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <button key={opt.value} type="button" aria-pressed={opt.value === value} onClick={() => onChange(opt.value)}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- App shell ---------- */

export interface AppBarProps extends HTMLAttributes<HTMLElement> {
  brand?: ReactNode;
  sticky?: boolean;
}

/** The top bar of an application: brand, navigation and actions. */
export function AppBar({ brand, sticky, className, children, ...rest }: AppBarProps) {
  return (
    <header {...rest} className={cx("oq-appbar", sticky && "oq-appbar--sticky", className)}>
      {brand != null && <div className="oq-appbar__brand">{brand}</div>}
      {children}
    </header>
  );
}

export interface ShellProps extends HTMLAttributes<HTMLDivElement> {
  appBar?: ReactNode;
  sidebar?: ReactNode;
}

/** App bar across the top, sidebar on the left, main content scrolling beside it. */
export function Shell({ appBar, sidebar, className, children, ...rest }: ShellProps) {
  return (
    <div {...rest} className={cx("oq-shell", className)}>
      {appBar}
      {sidebar}
      <main className="oq-shell__main">{children}</main>
    </div>
  );
}

/** The side panel of a Shell that holds the navigation. */
export function Sidebar({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <aside {...rest} className={cx("oq-sidebar", className)} />;
}

/** A vertical list of navigation items. */
export function Nav({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <nav {...rest} className={cx("oq-nav", className)} />;
}

/** A small uppercase heading that groups items in a Nav. */
export function NavSection({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("oq-nav__section oq-overline", className)} />;
}

export interface NavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: ReactNode;
  active?: boolean;
  /** A trailing badge or chip. */
  end?: ReactNode;
}

/** A link when `href` is set, otherwise a button. */
export function NavItem({ icon, active, end, className, children, href, ...rest }: NavItemProps) {
  const cls = cx("oq-nav__item", className);
  const inner = (
    <>
      {icon}
      <span className="oq-truncate">{children}</span>
      {end}
    </>
  );
  if (href !== undefined) {
    return (
      <a href={href} aria-current={active ? "page" : undefined} {...rest} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      {...(rest as HTMLAttributes<HTMLButtonElement>)}
      className={cls}
    >
      {inner}
    </button>
  );
}

/* ---------- List, description list ---------- */

export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  /** Highlight rows on hover (for clickable lists). */
  hover?: boolean;
}

/** A vertical list of rows, optionally hoverable. */
export function List({ hover, className, ...rest }: ListProps) {
  return <ul {...rest} className={cx("oq-list", hover && "oq-list--hover", className)} />;
}

export interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
  primary?: ReactNode;
  secondary?: ReactNode;
  /** Right-aligned text: a time, a count. */
  meta?: ReactNode;
  /** Leading element: an avatar, icon, checkbox. */
  start?: ReactNode;
}

/** One row of a List: leading element, primary and secondary text, and meta on the right. */
export function ListItem({ primary, secondary, meta, start, className, children, ...rest }: ListItemProps) {
  return (
    <li {...rest} className={cx("oq-list__item", className)}>
      {start}
      {(primary != null || secondary != null) && (
        <div className="oq-list__text">
          {primary != null && <span className="oq-truncate">{primary}</span>}
          {secondary != null && <span className="oq-list__secondary oq-truncate">{secondary}</span>}
        </div>
      )}
      {children}
      {meta != null && <span className="oq-list__meta">{meta}</span>}
    </li>
  );
}

export interface DescriptionListProps extends HTMLAttributes<HTMLDListElement> {
  items: Array<[ReactNode, ReactNode]> | Record<string, ReactNode>;
}

/** Key–value pairs in two aligned columns, for detail panes and settings readouts. */
export function DescriptionList({ items, className, ...rest }: DescriptionListProps) {
  const pairs = Array.isArray(items) ? items : Object.entries(items);
  return (
    <dl {...rest} className={cx("oq-dl", className)}>
      {pairs.map(([k, v], i) => (
        <div key={i} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Breadcrumbs ---------- */

export interface Crumb {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: Crumb[];
}

/** The path to the current page as links, the last item marked current. */
export function Breadcrumbs({ items, className, ...rest }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" {...rest} className={className}>
      <ol className="oq-breadcrumbs">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i}>
              {last ? (
                <span aria-current="page">{c.label}</span>
              ) : (
                <a
                  href={c.href ?? "#"}
                  onClick={
                    c.onClick
                      ? (e) => {
                          e.preventDefault();
                          c.onClick?.();
                        }
                      : undefined
                  }
                >
                  {c.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- Pagination ---------- */

/** Page numbers to show: first, last, `siblings` either side of `page`, and "gap" where pages are skipped. */
export function pageWindow(page: number, count: number, siblings = 1): Array<number | "gap"> {
  if (count <= 0) return [];
  const pages = new Set<number>([1, count]);
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= count) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev === 2) out.push(p - 1);
    else if (p - prev > 2) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** 1-based. */
  page: number;
  count: number;
  onChange: (page: number) => void;
  siblings?: number;
}

/** Page buttons with previous/next and a window of pages around the current one. */
export function Pagination({ page, count, onChange, siblings = 1, className, ...rest }: PaginationProps) {
  return (
    <nav aria-label="Pagination" {...rest} className={cx("oq-pagination", className)}>
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {pageWindow(page, count, siblings).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="oq-pagination__gap">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            // Pages beside the current one; phones hide them and keep first, current and last.
            data-near={p !== page && p !== 1 && p !== count ? "" : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" aria-label="Next page" disabled={page >= count} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </nav>
  );
}
