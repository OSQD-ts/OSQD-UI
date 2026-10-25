import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNarrowViewport } from "./charts/frame";
import { type Size, cx, sizeClass } from "./cx";
import { Icon } from "./Icon";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/* ================= Date helpers (pure, local time) ================= */

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DateRange {
  from: Date;
  to: Date;
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
export const sameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayNum = (d: Date) => startOfDay(d).getTime();

/** Same day-of-month n months later, clamped to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(d.getDate(), last));
  return first;
}

export function startOfWeek(d: Date, weekStartsOn: WeekStart = 1): Date {
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return startOfDay(addDays(d, -diff));
}

/** The 6 × 7 grid of days shown for a month, starting on `weekStartsOn` (Monday by default). */
export function monthMatrix(year: number, month: number, weekStartsOn: WeekStart = 1): Date[][] {
  const start = startOfWeek(new Date(year, month, 1), weekStartsOn);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i)));
}

/** A range with its ends in order. */
export function normalizeRange(a: Date, b: Date): DateRange {
  return dayNum(a) <= dayNum(b) ? { from: a, to: b } : { from: b, to: a };
}

/** Where a day sits relative to a range: "start", "end", "middle", "single" (start = end) or null. */
export function rangePosition(d: Date, from: Date | null | undefined, to: Date | null | undefined): "start" | "end" | "middle" | "single" | null {
  if (!from || !to) return sameDay(d, from) ? "single" : null;
  const { from: a, to: b } = normalizeRange(from, to);
  const x = dayNum(d);
  if (sameDay(a, b) && sameDay(d, a)) return "single";
  if (x === dayNum(a)) return "start";
  if (x === dayNum(b)) return "end";
  return x > dayNum(a) && x < dayNum(b) ? "middle" : null;
}

export interface DateLimits {
  min?: Date | undefined;
  max?: Date | undefined;
  /** Return true for days that cannot be picked (weekends, holidays …). */
  isDisabled?: ((d: Date) => boolean) | undefined;
}

export function isDateDisabled(d: Date, { min, max, isDisabled }: DateLimits): boolean {
  if (min && dayNum(d) < dayNum(min)) return true;
  if (max && dayNum(d) > dayNum(max)) return true;
  return isDisabled ? isDisabled(d) : false;
}

export interface RangePreset {
  key: string;
  label: string;
  range: (now: Date) => DateRange;
}

/** The usual operator ranges. "Last 24 hours" is a rolling window; the others are whole days. */
export const defaultRangePresets: RangePreset[] = [
  { key: "24h", label: "Last 24 hours", range: (now) => ({ from: new Date(now.getTime() - 86_400_000), to: now }) },
  { key: "7d", label: "Last 7 days", range: (now) => ({ from: startOfDay(addDays(now, -6)), to: endOfDay(now) }) },
  { key: "30d", label: "Last 30 days", range: (now) => ({ from: startOfDay(addDays(now, -29)), to: endOfDay(now) }) },
  { key: "month", label: "This month", range: (now) => ({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }) },
];

/** Short weekday names in the locale, in grid order. */
export function weekdayLabels(locale: string | undefined, weekStartsOn: WeekStart = 1, style: "short" | "narrow" | "long" = "short"): string[] {
  const f = new Intl.DateTimeFormat(locale, { weekday: style });
  // 2024-01-07 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 7 + ((weekStartsOn + i) % 7))));
}

const pad = (n: number) => String(n).padStart(2, "0");
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** The same day at a given "HH:MM". */
export const setTime = (d: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0);
};

/* ================= Calendar ================= */

export interface CalendarProps extends DateLimits {
  /** First visible month (any day in it). */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** Single selection. */
  selected?: Date | null | undefined;
  /** Range selection; `to` may be missing while the second end is being picked. */
  range?: { from: Date | null; to: Date | null } | null | undefined;
  /** The day under the pointer while picking the second end — previews the range. */
  preview?: Date | null | undefined;
  onSelect: (d: Date) => void;
  onHover?: ((d: Date | null) => void) | undefined;
  /** Escape inside the grid. */
  onEscape?: (() => void) | undefined;
  /** 1 (default) or 2 months side by side. */
  months?: 1 | 2;
  weekStartsOn?: WeekStart;
  locale?: string | undefined;
  /** Move focus into the grid when it mounts (pickers do; an inline calendar usually not). */
  autoFocus?: boolean;
  className?: string;
}

/** A month grid with the WAI-ARIA date-grid keyboard: arrows, PageUp/PageDown (+Shift for years), Home/End, Enter. */
export function Calendar({
  month,
  onMonthChange,
  selected,
  range,
  preview,
  onSelect,
  onHover,
  onEscape,
  months = 1,
  weekStartsOn = 1,
  locale,
  autoFocus = false,
  className,
  min,
  max,
  isDisabled,
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [focus, setFocus] = useState<Date>(() => selected ?? range?.from ?? (month.getMonth() === today.getMonth() ? today : new Date(month.getFullYear(), month.getMonth(), 1)));
  const [keyboard, setKeyboard] = useState(autoFocus);
  const root = useRef<HTMLDivElement>(null);
  const limits = { min, max, isDisabled };
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const full = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  const weekdays = weekdayLabels(locale, weekStartsOn, "short");
  const weekdaysLong = weekdayLabels(locale, weekStartsOn, "long");
  const shown = Array.from({ length: months }, (_, i) => addMonths(new Date(month.getFullYear(), month.getMonth(), 1), i));

  // Keep the focused day inside the visible months.
  useEffect(() => {
    const first = shown[0] as Date;
    const last = shown[shown.length - 1] as Date;
    const f = new Date(focus.getFullYear(), focus.getMonth(), 1).getTime();
    if (f < first.getTime()) onMonthChange(new Date(focus.getFullYear(), focus.getMonth(), 1));
    else if (f > last.getTime()) onMonthChange(addMonths(new Date(focus.getFullYear(), focus.getMonth(), 1), -(months - 1)));
    // Only the focus moving matters here, not every render.
  }, [focus]);

  useEffect(() => {
    if (!keyboard) return;
    root.current?.querySelector<HTMLButtonElement>('button[data-focus="true"]')?.focus();
  });

  const move = (d: Date) => {
    setKeyboard(true);
    setFocus(d);
    onHover?.(d);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    let next: Date | null = null;
    if (k === "ArrowLeft") next = addDays(focus, -1);
    else if (k === "ArrowRight") next = addDays(focus, 1);
    else if (k === "ArrowUp") next = addDays(focus, -7);
    else if (k === "ArrowDown") next = addDays(focus, 7);
    else if (k === "PageUp") next = addMonths(focus, e.shiftKey ? -12 : -1);
    else if (k === "PageDown") next = addMonths(focus, e.shiftKey ? 12 : 1);
    else if (k === "Home") next = startOfWeek(focus, weekStartsOn);
    else if (k === "End") next = addDays(startOfWeek(focus, weekStartsOn), 6);
    else if (k === "Enter" || k === " ") {
      e.preventDefault();
      if (!isDateDisabled(focus, limits)) onSelect(focus);
      return;
    } else if (k === "Escape") {
      if (onEscape) {
        e.preventDefault();
        onEscape();
      }
      return;
    }
    if (next) {
      e.preventDefault();
      move(next);
    }
  };

  const step = (n: number) => {
    onMonthChange(addMonths(new Date(month.getFullYear(), month.getMonth(), 1), n));
    setFocus(addMonths(focus, n));
  };

  const rangeTo = range ? (range.to ?? preview ?? null) : null;

  return (
    <div className={cx("oq-calendar", months === 2 && "oq-calendar--double", className)} ref={root} onKeyDown={onKey}>
      <div className="oq-calendar__header">
        <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" aria-label="Previous month" onClick={() => step(-1)}>
          <ChevronLeftIcon />
        </button>
        {shown.map((m) => (
          <div key={m.getTime()} className="oq-calendar__title" aria-live="polite">
            {title.format(m)}
          </div>
        ))}
        <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" aria-label="Next month" onClick={() => step(1)}>
          <ChevronRightIcon />
        </button>
      </div>
      <div className="oq-calendar__months">
        {shown.map((m) => (
          <table key={m.getTime()} className="oq-calendar__grid" role="grid" aria-label={title.format(m)}>
            <thead>
              <tr>
                {weekdays.map((w, i) => (
                  <th key={w} scope="col" className="oq-calendar__weekday" abbr={weekdaysLong[i]}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody onMouseLeave={() => onHover?.(null)}>
              {monthMatrix(m.getFullYear(), m.getMonth(), weekStartsOn).map((week) => (
                <tr key={week[0]?.getTime()}>
                  {week.map((d) => {
                    const outside = d.getMonth() !== m.getMonth();
                    // With two months side by side, a day belongs to one of them only.
                    if (outside && months === 2) return <td key={d.getTime()} />;
                    const disabled = isDateDisabled(d, limits);
                    const pos = range ? rangePosition(d, range.from, rangeTo) : null;
                    const isSel = range ? pos !== null && pos !== "middle" : sameDay(d, selected);
                    const isFocus = sameDay(d, focus) && !outside;
                    return (
                      <td key={d.getTime()} role="gridcell" aria-selected={isSel || pos === "middle"}>
                        <button
                          type="button"
                          className="oq-calendar__day"
                          tabIndex={isFocus ? 0 : -1}
                          data-focus={isFocus || undefined}
                          data-today={sameDay(d, today) || undefined}
                          data-outside={outside || undefined}
                          data-selected={isSel || undefined}
                          data-range={pos ?? undefined}
                          data-preview={(range && !range.to && pos !== null) || undefined}
                          disabled={disabled}
                          aria-label={full.format(d)}
                          aria-current={sameDay(d, today) ? "date" : undefined}
                          onClick={() => {
                            setFocus(d);
                            onSelect(d);
                          }}
                          onMouseEnter={() => onHover?.(d)}
                        >
                          {d.getDate()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
}

/* ================= Shared popover behaviour ================= */

function usePopover() {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    // pointerdown covers mouse, pen and touch; on a phone the panel is a bottom sheet and a tap
    // on the dimmed page above it lands here and closes it.
    const onDown = (e: PointerEvent) => {
      if (anchor.current && !e.composedPath().includes(anchor.current)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  return { open, setOpen, anchor, trigger, close };
}

const CalendarGlyph = () => <Icon name="calendar" size={16} className="oq-datepicker__icon" />;

interface PickerBase extends DateLimits {
  placeholder?: string;
  weekStartsOn?: WeekStart;
  locale?: string;
  /** Add time-of-day inputs. */
  withTime?: boolean;
  disabled?: boolean;
  size?: Size;
  id?: string;
  /** Accessible name when there is no visible <label for>. */
  "aria-label"?: string;
  className?: string;
}

/* ================= DatePicker ================= */

export interface DatePickerProps extends PickerBase {
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Show "Today" and "Clear" in the footer. Default true. */
  clearable?: boolean;
  /** Custom display format. */
  formatValue?: (d: Date) => string;
}

/** A date field that opens a calendar popover, with min/max, disabled days, optional time and Today/Clear. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  weekStartsOn = 1,
  locale,
  withTime = false,
  disabled,
  size,
  id,
  className,
  clearable = true,
  formatValue,
  min,
  max,
  isDisabled,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const pop = usePopover();
  const panelId = useId();
  const [month, setMonth] = useState(() => value ?? new Date());
  const fmt = formatValue ?? ((d: Date) => new Intl.DateTimeFormat(locale, withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(d));

  const pick = (d: Date) => {
    const next = withTime ? setTime(d, value ? timeOf(value) : "00:00") : startOfDay(d);
    onChange(next);
    if (!withTime) pop.close();
  };

  return (
    <div className={cx("oq-datepicker", className)} ref={pop.anchor}>
      <button
        ref={pop.trigger}
        id={id}
        type="button"
        className={cx("oq-input", "oq-datepicker__trigger", sizeClass(size))}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-controls={pop.open ? panelId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!pop.open) setMonth(value ?? new Date());
          pop.setOpen(!pop.open);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !pop.open) {
            e.preventDefault();
            pop.setOpen(true);
          }
        }}
      >
        <CalendarGlyph />
        <span className={value ? "oq-datepicker__value" : "oq-datepicker__placeholder"}>{value ? fmt(value) : placeholder}</span>
      </button>
      {pop.open && (
        <div className="oq-datepicker__panel" id={panelId} role="dialog" aria-label="Choose date">
          <Calendar
            month={month}
            onMonthChange={setMonth}
            selected={value}
            onSelect={pick}
            onEscape={() => pop.close()}
            weekStartsOn={weekStartsOn}
            locale={locale}
            min={min}
            max={max}
            isDisabled={isDisabled}
            autoFocus
          />
          {(withTime || clearable) && (
            <div className="oq-datepicker__footer">
              {withTime && (
                <input
                  type="time"
                  className="oq-input oq-sm oq-datepicker__time"
                  aria-label="Time"
                  value={value ? timeOf(value) : ""}
                  onChange={(e) => onChange(setTime(value ?? startOfDay(new Date()), e.target.value))}
                />
              )}
              <span className="oq-spacer" />
              {clearable && (
                <>
                  <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm" onClick={() => (onChange(null), pop.close())}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className="oq-btn oq-btn--ghost oq-sm"
                    disabled={isDateDisabled(new Date(), { min, max, isDisabled })}
                    onClick={() => pick(new Date())}
                  >
                    Today
                  </button>
                </>
              )}
              {withTime && (
                <button type="button" className="oq-btn oq-sm" onClick={() => pop.close()}>
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= DateRangePicker ================= */

export interface DateRangePickerProps extends PickerBase {
  value: DateRange | null;
  onChange: (value: DateRange | null, presetKey?: string) => void;
  /** Quick ranges beside the calendar; false hides them. Default: last 24 h / 7 d / 30 d / this month. */
  presets?: RangePreset[] | false;
  /** Months side by side. Default 2. */
  months?: 1 | 2;
  /** Label shown on the trigger instead of the dates (e.g. the chosen preset's). */
  displayLabel?: ReactNode;
}

/** Picks a start and end date on a two-month calendar, with quick ranges (last 24 hours, 7 days …) and optional times. */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select range",
  presets = defaultRangePresets,
  months = 2,
  weekStartsOn = 1,
  locale,
  withTime = false,
  disabled,
  size,
  id,
  className,
  displayLabel,
  min,
  max,
  isDisabled,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const pop = usePopover();
  const panelId = useId();
  // Two months do not fit a phone: show one there (the sheet would otherwise be two screens tall).
  const narrow = useNarrowViewport();
  const shownMonths = narrow ? 1 : months;
  const [month, setMonth] = useState(() => (value ? addMonths(value.to, months === 2 ? -1 : 0) : addMonths(new Date(), months === 2 ? -1 : 0)));
  const [draft, setDraft] = useState<{ from: Date | null; to: Date | null }>({ from: value?.from ?? null, to: value?.to ?? null });
  const [hover, setHover] = useState<Date | null>(null);
  const [preset, setPreset] = useState<string | null>(null);

  const dateFmt = new Intl.DateTimeFormat(locale, withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
  const label = (r: DateRange) => {
    const f = dateFmt as Intl.DateTimeFormat & { formatRange?: (a: Date, b: Date) => string };
    return f.formatRange ? f.formatRange(r.from, r.to) : `${f.format(r.from)} – ${f.format(r.to)}`;
  };
  const presetLabel = presets && preset ? presets.find((p) => p.key === preset)?.label : undefined;

  const openPanel = () => {
    setDraft({ from: value?.from ?? null, to: value?.to ?? null });
    setMonth(value ? addMonths(value.to, shownMonths === 2 ? -1 : 0) : addMonths(new Date(), shownMonths === 2 ? -1 : 0));
    pop.setOpen(true);
  };

  const commit = (r: DateRange, key?: string) => {
    setPreset(key ?? null);
    onChange(r, key);
    pop.close();
  };

  const pick = (d: Date) => {
    if (!draft.from || draft.to) {
      setDraft({ from: d, to: null });
      setPreset(null);
      return;
    }
    const n = normalizeRange(draft.from, d);
    const r = { from: startOfDay(n.from), to: endOfDay(n.to) };
    if (withTime) setDraft(r);
    else commit(r);
  };

  return (
    <div className={cx("oq-datepicker", "oq-rangepicker", className)} ref={pop.anchor}>
      <button
        ref={pop.trigger}
        id={id}
        type="button"
        className={cx("oq-input", "oq-datepicker__trigger", sizeClass(size))}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-controls={pop.open ? panelId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (pop.open ? pop.close(false) : openPanel())}
      >
        <CalendarGlyph />
        <span className={value ? "oq-datepicker__value" : "oq-datepicker__placeholder"}>
          {displayLabel ?? presetLabel ?? (value ? label(value) : placeholder)}
        </span>
      </button>
      {pop.open && (
        <div className="oq-datepicker__panel" id={panelId} role="dialog" aria-label="Choose date range">
          <div className="oq-rangepicker__body">
            {presets && (
              <div className="oq-datepicker__presets" role="listbox" aria-label="Quick ranges">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    role="option"
                    aria-selected={preset === p.key}
                    className="oq-datepicker__preset"
                    onClick={() => commit(p.range(new Date()), p.key)}
                  >
                    {p.label}
                  </button>
                ))}
                <button type="button" role="option" aria-selected={preset === null} className="oq-datepicker__preset" onClick={() => setPreset(null)}>
                  Custom
                </button>
              </div>
            )}
            <Calendar
              month={month}
              onMonthChange={setMonth}
              range={draft}
              preview={hover}
              onSelect={pick}
              onHover={setHover}
              onEscape={() => pop.close()}
              months={shownMonths}
              weekStartsOn={weekStartsOn}
              locale={locale}
              min={min}
              max={max}
              isDisabled={isDisabled}
              autoFocus
            />
          </div>
          <div className="oq-datepicker__footer">
            <span className="oq-small oq-muted oq-rangepicker__summary">
              {draft.from && draft.to ? label(normalizeRange(draft.from, draft.to)) : draft.from ? "Pick the end date" : "Pick the start date"}
            </span>
            {withTime && draft.from && draft.to && (
              <>
                <input
                  type="time"
                  className="oq-input oq-sm oq-datepicker__time"
                  aria-label="Start time"
                  value={timeOf(draft.from)}
                  onChange={(e) => setDraft((d) => ({ ...d, from: d.from && setTime(d.from, e.target.value) }))}
                />
                <span className="oq-faint">–</span>
                <input
                  type="time"
                  className="oq-input oq-sm oq-datepicker__time"
                  aria-label="End time"
                  value={timeOf(draft.to)}
                  onChange={(e) => setDraft((d) => ({ ...d, to: d.to && setTime(d.to, e.target.value) }))}
                />
              </>
            )}
            <span className="oq-spacer" />
            <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm" onClick={() => pop.close()}>
              Cancel
            </button>
            {withTime && (
              <button type="button" className="oq-btn oq-sm" disabled={!draft.from || !draft.to} onClick={() => draft.from && draft.to && commit(normalizeRange(draft.from, draft.to))}>
                Apply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
