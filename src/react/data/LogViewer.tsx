import { type CSSProperties, type HTMLAttributes, type Key, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../charts/frame";
import { cx } from "../cx";
import { Icon } from "../Icon";
import { copyText, highlightText } from "./highlight";
import { findAll, virtualWindow } from "./logic";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export const logLevels: readonly LogLevel[] = ["debug", "info", "warn", "error", "fatal"];

export interface LogLine {
  id?: Key;
  /** A Date, epoch milliseconds, or text shown as-is. */
  time?: Date | number | string;
  level: LogLevel;
  source?: string;
  message: string;
}

export interface LogViewerProps extends Omit<HTMLAttributes<HTMLDivElement>, "onCopy"> {
  lines: readonly LogLine[];
  /** Height of the scrolling area in px. Default 360. */
  height?: number;
  /** Row height in px when not wrapping. Default 22, or 30 on a touch screen. */
  lineHeight?: number;
  /** Start following the tail. Default true. */
  defaultFollow?: boolean;
  defaultWrap?: boolean;
  /** Levels shown at first. Default all. */
  defaultLevels?: LogLevel[];
  /** Show the time column. Default true. */
  showTime?: boolean;
  showSource?: boolean;
  /** Toolbar with search, level chips, wrap, follow and next-error. Default true. */
  toolbar?: boolean;
  /** Called after a line is copied (the copy button on each line). */
  onCopy?: (line: LogLine, text: string) => void;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** HH:MM:SS.mmm for dates and epoch numbers; strings pass through. */
export function formatLogTime(time: LogLine["time"]): string {
  if (time === undefined) return "";
  if (typeof time === "string") return time;
  const d = typeof time === "number" ? new Date(time) : time;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** One line as plain text, the way the copy button puts it on the clipboard. */
export function formatLogLine(l: LogLine): string {
  return [formatLogTime(l.time), l.level.toUpperCase(), l.source ? `[${l.source}]` : "", l.message].filter(Boolean).join(" ");
}

const isError = (l: LogLine) => l.level === "error" || l.level === "fatal";

/**
 * A log stream: virtualised so a long tail stays fast, follows new lines unless you scroll up
 * (then a pill counts what arrived), and searches with next/previous over every match.
 * With wrapping on, lines take their natural height and the browser skips off-screen ones
 * (content-visibility) instead of the fixed-height window.
 */
export function LogViewer({
  lines,
  height = 360,
  lineHeight: lineHeightProp,
  defaultFollow = true,
  defaultWrap = false,
  defaultLevels,
  showTime = true,
  showSource = true,
  toolbar = true,
  onCopy,
  className,
  ...rest
}: LogViewerProps) {
  // One source for the line height: the virtual window and the CSS (--oq-log-line) both read it.
  // Touch screens get taller lines so the copy button is a real target.
  const coarse = useMediaQuery("(pointer: coarse)");
  const lineHeight = lineHeightProp ?? (coarse ? 30 : 22);
  const viewport = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [follow, setFollow] = useState(defaultFollow);
  const [wrap, setWrap] = useState(defaultWrap);
  const [levels, setLevels] = useState<Set<LogLevel>>(() => new Set(defaultLevels ?? logLevels));
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [activeLine, setActiveLine] = useState(-1);
  const [unseen, setUnseen] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const seen = useRef(lines.length);

  const shown = useMemo(() => lines.filter((l) => levels.has(l.level)), [lines, levels]);
  const counts = useMemo(() => {
    const c: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
    for (const l of lines) c[l.level]++;
    return c;
  }, [lines]);

  // Every match as [line index in `shown`, occurrence within that line].
  const matches = useMemo(() => {
    const out: Array<[number, number]> = [];
    if (!query) return out;
    shown.forEach((l, i) => {
      const n = findAll(l.message, query).length;
      for (let k = 0; k < n; k++) out.push([i, k]);
    });
    return out;
  }, [shown, query]);
  const current = matches.length ? matches[Math.min(matchIndex, matches.length - 1)] : undefined;

  const scrollTo = (top: number) => {
    const el = viewport.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTop = top;
  };
  const scrollToLine = (i: number) => {
    const el = viewport.current;
    if (!el) return;
    if (wrap) {
      el.querySelector<HTMLElement>(`[data-line="${i}"]`)?.scrollIntoView({ block: "center" });
      return;
    }
    const top = i * lineHeight;
    if (top < el.scrollTop || top + lineHeight > el.scrollTop + el.clientHeight) scrollTo(Math.max(0, top - el.clientHeight / 2));
  };

  // Follow the tail; count arrivals while not following.
  useLayoutEffect(() => {
    const added = lines.length - seen.current;
    seen.current = lines.length;
    if (follow) {
      const el = viewport.current;
      if (el) scrollTo(el.scrollHeight);
    } else if (added > 0) setUnseen((u) => u + added);
  }, [lines.length, follow]);

  useEffect(() => {
    if (current) {
      setActiveLine(current[0]);
      scrollToLine(current[0]);
    }
    // Moves only when the match changes, not on every render.
  }, [current?.[0], current?.[1]]);

  const onScroll = () => {
    const el = viewport.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (programmatic.current) {
      programmatic.current = false;
      return;
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    if (atBottom && !follow) {
      setFollow(true);
      setUnseen(0);
    } else if (!atBottom && follow) setFollow(false);
  };

  const resume = () => {
    setFollow(true);
    setUnseen(0);
    const el = viewport.current;
    if (el) scrollTo(el.scrollHeight);
  };

  const nextError = () => {
    const from = activeLine + 1;
    let i = shown.findIndex((l, k) => k >= from && isError(l));
    if (i === -1) i = shown.findIndex(isError);
    if (i === -1) return;
    setFollow(false);
    setActiveLine(i);
    scrollToLine(i);
  };

  const step = (d: number) => {
    if (!matches.length) return;
    setFollow(false);
    setMatchIndex((m) => (m + d + matches.length) % matches.length);
  };

  const copy = async (l: LogLine, i: number) => {
    const text = formatLogLine(l);
    await copyText(text);
    onCopy?.(l, text);
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1200);
  };

  const toggleLevel = (lv: LogLevel) =>
    setLevels((s) => {
      const n = new Set(s);
      if (n.has(lv)) n.delete(lv);
      else n.add(lv);
      return n;
    });

  const win = wrap
    ? { start: 0, end: shown.length, offset: 0, total: 0 }
    : virtualWindow({ scrollTop, viewportHeight: height, rowHeight: lineHeight, count: shown.length, overscan: 12 });

  const renderLine = (l: LogLine, i: number) => {
    const occ = current && current[0] === i ? current[1] : -1;
    return (
      <div
        key={l.id ?? i}
        data-line={i}
        data-level={l.level}
        className={cx("oq-log__line", i === activeLine && "is-active")}
        style={wrap ? undefined : { height: lineHeight }}
      >
        {showTime && <span className="oq-log__time">{formatLogTime(l.time)}</span>}
        <span className="oq-log__level">{l.level}</span>
        {showSource && l.source !== undefined && <span className="oq-log__source">{l.source}</span>}
        <span className="oq-log__msg">{query ? highlightText(l.message, query, "oq-log__match", occ) : l.message}</span>
        <button type="button" className="oq-log__copy" aria-label="Copy line" onClick={() => copy(l, i)}>
          {copied === i ? "Copied" : "Copy"}
        </button>
      </div>
    );
  };

  return (
    <div {...rest} className={cx("oq-log", wrap && "oq-log--wrap", className)} style={{ "--oq-log-line": `${lineHeight}px`, ...rest.style } as CSSProperties}>
      {toolbar && (
        <div className="oq-log__toolbar">
          <div className="oq-input-group oq-log__search">
            <input
              className="oq-input oq-sm"
              type="search"
              placeholder="Search…"
              aria-label="Search log"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
              }}
            />
            <span className="oq-addon oq-addon--plain oq-mono">{query ? `${matches.length ? Math.min(matchIndex, matches.length - 1) + 1 : 0}/${matches.length}` : ""}</span>
            <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm" aria-label="Previous match" disabled={!matches.length} onClick={() => step(-1)}>
              <Icon name="chevron-up" size={14} />
            </button>
            <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm" aria-label="Next match" disabled={!matches.length} onClick={() => step(1)}>
              <Icon name="chevron-down" size={14} />
            </button>
          </div>
          <div className="oq-log__levels" role="group" aria-label="Levels">
            {logLevels.map((lv) => (
              <button key={lv} type="button" className="oq-chip oq-sm oq-log__chip" data-level={lv} aria-pressed={levels.has(lv)} onClick={() => toggleLevel(lv)}>
                {lv} <span className="oq-log__count">{counts[lv]}</span>
              </button>
            ))}
          </div>
          <span className="oq-spacer" />
          <button type="button" className="oq-btn oq-btn--ghost oq-danger oq-sm" onClick={nextError} disabled={!counts.error && !counts.fatal}>
            Next error
          </button>
          <label className="oq-check oq-small">
            <input type="checkbox" role="switch" className="oq-switch" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> Wrap
          </label>
          <label className="oq-check oq-small">
            <input
              type="checkbox"
              role="switch"
              className="oq-switch"
              checked={follow}
              onChange={(e) => (e.target.checked ? resume() : setFollow(false))}
            />{" "}
            Follow
          </label>
        </div>
      )}
      <div className="oq-log__frame">
        <div ref={viewport} className="oq-log__viewport" style={{ height }} onScroll={onScroll} role="log" aria-live={follow ? "polite" : "off"}>
          {shown.length === 0 ? (
            <div className="oq-log__empty">No lines{lines.length ? " at the selected levels" : " yet"}</div>
          ) : wrap ? (
            shown.map(renderLine)
          ) : (
            <div style={{ height: win.total, position: "relative" }}>
              <div style={{ transform: `translateY(${win.offset}px)` }}>{shown.slice(win.start, win.end).map((l, n) => renderLine(l, win.start + n))}</div>
            </div>
          )}
        </div>
        {!follow && unseen > 0 && (
          <button type="button" className="oq-log__pill" onClick={resume}>
            {unseen.toLocaleString("en-US")} new line{unseen === 1 ? "" : "s"} <Icon name="arrow-down" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
