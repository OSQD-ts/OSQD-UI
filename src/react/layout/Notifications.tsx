import { type HTMLAttributes, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "../Button";
import { type Color, colorClass, cx } from "../cx";
import { CheckIcon, CloseIcon } from "../icons";

export interface NotificationItem {
  id: string;
  title: ReactNode;
  body?: ReactNode;
  /** When it happened: a Date or epoch milliseconds. */
  time: Date | number;
  read?: boolean;
  /** Colour of the unread marker. Default primary. */
  color?: Color;
  /** Makes the title a link. */
  href?: string;
}

const DAY = 86_400_000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const ms = (t: Date | number) => (typeof t === "number" ? t : t.getTime());

/** "Today", "Yesterday", or a short date ("Mon, Oct 20"), in local time. */
export function dayLabel(time: Date | number, now: Date | number = Date.now()): string {
  const days = Math.round((startOfDay(ms(now)) - startOfDay(ms(time))) / DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(ms(time));
  const sameYear = d.getFullYear() === new Date(ms(now)).getFullYear();
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

/** Notifications newest first, in groups by day. */
export function groupByDay<T extends { time: Date | number }>(items: T[], now: Date | number = Date.now()): Array<{ label: string; items: T[] }> {
  const sorted = [...items].sort((a, b) => ms(b.time) - ms(a.time));
  const groups: Array<{ label: string; items: T[] }> = [];
  for (const it of sorted) {
    const label = dayLabel(it.time, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  }
  return groups;
}

/** "now", "5 min", "3 h", "2 d" — short enough for a list column. */
export function timeAgo(time: Date | number, now: Date | number = Date.now()): string {
  const s = Math.max(0, Math.round((ms(now) - ms(time)) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < DAY / 1000) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / (DAY / 1000))} d`;
}

export interface NotificationsApi {
  items: NotificationItem[];
  unread: number;
  add: (n: Omit<NotificationItem, "time"> & { time?: Date | number }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

/** A small in-memory notification store for a <NotificationCenter>. */
export function useNotifications(initial: NotificationItem[] = []): NotificationsApi {
  const [items, setItems] = useState(initial);
  const add = useCallback<NotificationsApi["add"]>((n) => setItems((xs) => [{ ...n, time: n.time ?? Date.now() }, ...xs.filter((x) => x.id !== n.id)]), []);
  const markRead = useCallback((id: string) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x))), []);
  const markAllRead = useCallback(() => setItems((xs) => xs.map((x) => (x.read ? x : { ...x, read: true }))), []);
  const dismiss = useCallback((id: string) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const unread = items.filter((x) => !x.read).length;
  return { items, unread, add, markRead, markAllRead, dismiss, clear };
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export interface NotificationPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  items: NotificationItem[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  /** Link in the footer to the full list. */
  viewAllHref?: string;
  title?: ReactNode;
  /** The clock used for day groups and times (for tests and server rendering). */
  now?: Date | number;
  /** Draw in place instead of as a dropdown. */
  inline?: boolean;
}

/** The list of notifications, grouped by day. Used inside NotificationCenter, or on its own page. */
export function NotificationPanel({
  items,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  viewAllHref,
  title = "Notifications",
  now,
  inline,
  className,
  ...rest
}: NotificationPanelProps) {
  const clock = now ?? Date.now();
  const groups = groupByDay(items, clock);
  const unread = items.some((x) => !x.read);
  return (
    <div {...rest} className={cx("oq-notify__panel", inline && "oq-notify__panel--static", className)}>
      <div className="oq-notify__header">
        <h2 className="oq-notify__title">{title}</h2>
        {onMarkAllRead && (
          <button type="button" className="oq-btn oq-btn--ghost oq-sm" disabled={!unread} onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="oq-empty">
          <BellIcon />
          <div className="oq-empty__title">You're all caught up</div>
          <div className="oq-small">New notifications will show up here.</div>
        </div>
      ) : (
        <ul className="oq-notify__list">
          {groups.map((g) => [
            <li key={`g-${g.label}`} className="oq-notify__group oq-overline" role="presentation">
              {g.label}
            </li>,
            ...g.items.map((n) => (
              <li key={n.id} className={cx("oq-notify__item", !n.read && "is-unread", colorClass(n.color ?? "primary"))}>
                <span className="oq-notify__mark" aria-hidden="true" />
                <div className="oq-notify__body">
                  {!n.read && <span className="oq-sr-only">Unread: </span>}
                  {n.href ? (
                    <a className="oq-notify__link" href={n.href} onClick={() => onMarkRead?.(n.id)}>
                      <span className="oq-notify__item-title">{n.title}</span>
                    </a>
                  ) : (
                    <span className="oq-notify__item-title">{n.title}</span>
                  )}
                  {n.body != null && <span className="oq-notify__text">{n.body}</span>}
                  <time className="oq-notify__time" dateTime={new Date(ms(n.time)).toISOString()}>
                    {timeAgo(n.time, clock)}
                  </time>
                </div>
                <div className="oq-notify__actions">
                  {!n.read && onMarkRead && (
                    <IconButton size="sm" label="Mark as read" tooltip onClick={() => onMarkRead(n.id)}>
                      <CheckIcon size={14} />
                    </IconButton>
                  )}
                  {onDismiss && (
                    <IconButton size="sm" label="Dismiss" tooltip onClick={() => onDismiss(n.id)}>
                      <CloseIcon size={14} />
                    </IconButton>
                  )}
                </div>
              </li>
            )),
          ])}
        </ul>
      )}
      {viewAllHref && (
        <div className="oq-notify__footer">
          <a href={viewAllHref}>View all notifications</a>
        </div>
      )}
    </div>
  );
}

export interface NotificationCenterProps extends Omit<NotificationPanelProps, "inline"> {
  /** Open the panel to the right of the bell instead of to the left. */
  alignStart?: boolean;
}

/** A bell with an unread count that opens the notification panel. */
export function NotificationCenter({ items, alignStart, ...panel }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const unread = useMemo(() => items.filter((x) => !x.read).length, [items]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={cx("oq-notify", alignStart && "oq-notify--start")}>
      <span className="oq-badge-anchor">
        <IconButton
          label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
        >
          <BellIcon />
        </IconButton>
        {unread > 0 && (
          <span className="oq-badge oq-danger" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </span>
      {open && <NotificationPanel role="dialog" aria-label="Notifications" items={items} {...panel} />}
    </div>
  );
}
