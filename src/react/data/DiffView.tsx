import { type HTMLAttributes, type ReactNode, useMemo, useState } from "react";
import { useMediaQuery } from "../charts/frame";
import { cx } from "../cx";
import { collapseDiff, type DiffLine, type DiffRow, diffLines, diffStats, diffWords, pairChanges } from "./logic";

export type DiffMode = "unified" | "split";

export interface DiffViewProps extends HTMLAttributes<HTMLDivElement> {
  oldText: string;
  newText: string;
  oldLabel?: ReactNode;
  newLabel?: ReactNode;
  mode?: DiffMode;
  defaultMode?: DiffMode;
  onModeChange?: (mode: DiffMode) => void;
  /** Show the unified/split switch in the header. Default true. */
  modeToggle?: boolean;
  /** Unchanged lines kept around each change; longer runs fold behind a button. Default 3. Infinity shows everything. */
  context?: number;
  /** Highlight the changed words inside a changed line. Default true. */
  wordDiff?: boolean;
  /** Max height of the body in px; it scrolls past that. */
  maxHeight?: number;
}

function Words({ line, pair, side }: { line: DiffLine; pair: DiffLine | undefined; side: "del" | "add" }) {
  if (!pair) return <>{line.text}</>;
  const segs = side === "del" ? diffWords(line.text, pair.text) : diffWords(pair.text, line.text);
  return (
    <>
      {segs.map((s, i) => {
        if (s.type === "equal") return s.text;
        if (s.type !== side) return null;
        const Tag = side === "add" ? "ins" : "del";
        return (
          // Positions are stable for one rendering of one pair.
          <Tag key={i} className="oq-diff__word">
            {s.text}
          </Tag>
        );
      })}
    </>
  );
}

const sign = { equal: " ", add: "+", del: "−" } as const;

/**
 * Two texts compared line by line (Myers' shortest edit script), unified or side by side, with
 * line numbers, folded context and the changed words marked inside each changed line.
 */
export function DiffView({
  oldText,
  newText,
  oldLabel = "Before",
  newLabel = "After",
  mode: modeProp,
  defaultMode = "unified",
  onModeChange,
  modeToggle = true,
  context = 3,
  wordDiff = true,
  maxHeight,
  className,
  ...rest
}: DiffViewProps) {
  const [modeState, setModeState] = useState<DiffMode>(defaultMode);
  // Two columns of code do not fit a phone: below 720px the view is always unified and the
  // switch is hidden; the chosen mode comes back when there is room again.
  const narrow = useMediaQuery("(max-width: 720px)");
  const mode: DiffMode = narrow ? "unified" : (modeProp ?? modeState);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const lines = useMemo(() => diffLines(oldText, newText), [oldText, newText]);
  const pairs = useMemo(() => (wordDiff ? pairChanges(lines) : new Map<DiffLine, DiffLine>()), [lines, wordDiff]);
  const stats = diffStats(lines);
  const rows = useMemo(() => {
    const folded = collapseDiff(lines, Number.isFinite(context) ? context : lines.length);
    // Expanded folds become their lines again.
    return folded.flatMap((r): DiffRow[] => (r.kind === "skip" && open.has(r.id) ? r.lines.map((line) => ({ kind: "line", line })) : [r]));
  }, [lines, context, open]);

  const setMode = (m: DiffMode) => {
    if (modeProp === undefined) setModeState(m);
    onModeChange?.(m);
  };

  const skipRow = (r: Extract<DiffRow, { kind: "skip" }>, span: number) => (
    <tr key={`skip-${r.id}`} className="oq-diff__skip">
      <td colSpan={span}>
        <button type="button" onClick={() => setOpen((s) => new Set(s).add(r.id))}>
          … {r.count} unchanged line{r.count === 1 ? "" : "s"}
        </button>
      </td>
    </tr>
  );

  const text = (l: DiffLine) => (l.type === "equal" ? l.text : <Words line={l} pair={pairs.get(l)} side={l.type} />);

  let body: ReactNode;
  if (mode === "unified") {
    body = rows.map((r, i) =>
      r.kind === "skip" ? (
        skipRow(r, 4)
      ) : (
        <tr key={i} className={cx("oq-diff__line", `is-${r.line.type}`)}>
          <td className="oq-diff__num">{r.line.oldNo ?? ""}</td>
          <td className="oq-diff__num">{r.line.newNo ?? ""}</td>
          <td className="oq-diff__sign">{sign[r.line.type]}</td>
          <td className="oq-diff__code">{text(r.line)}</td>
        </tr>
      ),
    );
  } else {
    // Side by side: equal lines on both sides; a change block puts its removals left and its
    // additions right, row by row, padding the shorter side.
    const out: ReactNode[] = [];
    let i = 0;
    while (i < rows.length) {
      const r = rows[i] as DiffRow;
      if (r.kind === "skip") {
        out.push(skipRow(r, 4));
        i++;
        continue;
      }
      if (r.line.type === "equal") {
        out.push(
          <tr key={i} className="oq-diff__line is-equal">
            <td className="oq-diff__num">{r.line.oldNo}</td>
            <td className="oq-diff__code">{r.line.text}</td>
            <td className="oq-diff__num">{r.line.newNo}</td>
            <td className="oq-diff__code">{r.line.text}</td>
          </tr>,
        );
        i++;
        continue;
      }
      const dels: DiffLine[] = [];
      const adds: DiffLine[] = [];
      while (i < rows.length) {
        const x = rows[i] as DiffRow;
        if (x.kind !== "line" || x.line.type === "equal") break;
        (x.line.type === "del" ? dels : adds).push(x.line);
        i++;
      }
      for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
        const d = dels[k];
        const a = adds[k];
        out.push(
          <tr key={`c${i}-${k}`} className="oq-diff__line">
            <td className={cx("oq-diff__num", d ? "is-del" : "is-blank")}>{d?.oldNo ?? ""}</td>
            <td className={cx("oq-diff__code", d ? "is-del" : "is-blank")}>{d ? text(d) : ""}</td>
            <td className={cx("oq-diff__num", a ? "is-add" : "is-blank")}>{a?.newNo ?? ""}</td>
            <td className={cx("oq-diff__code", a ? "is-add" : "is-blank")}>{a ? text(a) : ""}</td>
          </tr>,
        );
      }
    }
    body = out;
  }

  return (
    <div {...rest} className={cx("oq-diff", mode === "split" && "oq-diff--split", className)}>
      <div className="oq-diff__header">
        <span className="oq-diff__label">{mode === "split" ? oldLabel : <>{oldLabel} → {newLabel}</>}</span>
        {mode === "split" && <span className="oq-diff__label">{newLabel}</span>}
        <span className="oq-spacer" />
        <span className="oq-diff__stat is-add">+{stats.added}</span>
        <span className="oq-diff__stat is-del">−{stats.removed}</span>
        {modeToggle && !narrow && (
          <div className="oq-segmented" role="group" aria-label="Diff layout">
            <button type="button" aria-pressed={mode === "unified"} onClick={() => setMode("unified")}>
              Unified
            </button>
            <button type="button" aria-pressed={mode === "split"} onClick={() => setMode("split")}>
              Split
            </button>
          </div>
        )}
      </div>
      <div className="oq-diff__body" style={maxHeight ? { maxHeight } : undefined}>
        {lines.length === 0 ? (
          <div className="oq-diff__empty">Both sides are empty</div>
        ) : stats.added + stats.removed === 0 ? (
          <div className="oq-diff__empty">No changes</div>
        ) : (
          <table className="oq-diff__table">
            <colgroup>
              {mode === "unified" ? (
                <>
                  <col className="oq-diff__numcol" />
                  <col className="oq-diff__numcol" />
                  <col className="oq-diff__signcol" />
                  <col />
                </>
              ) : (
                <>
                  <col className="oq-diff__numcol" />
                  <col />
                  <col className="oq-diff__numcol" />
                  <col />
                </>
              )}
            </colgroup>
            <tbody>{body}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
