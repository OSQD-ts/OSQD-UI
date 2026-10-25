import type { HTMLAttributes } from "react";
import { cx } from "../cx";
import { Skeleton } from "../Feedback";

// Varied widths so placeholder text reads as text, not as a stack of identical bars.
const WIDTHS = ["92%", "78%", "86%", "70%", "96%", "64%"];
const width = (i: number) => WIDTHS[i % WIDTHS.length] ?? "80%";

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

/** Lines of placeholder text; the last one is shorter. */
export function SkeletonText({ lines = 3, className, ...rest }: SkeletonTextProps) {
  return (
    <div aria-hidden="true" {...rest} className={cx("oq-skeleton-text", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={width(i)} />
      ))}
    </div>
  );
}

export interface SkeletonListProps extends HTMLAttributes<HTMLUListElement> {
  rows?: number;
  /** A round placeholder at the start of each row. Default true. */
  avatar?: boolean;
  /** Text lines per row. Default 2. */
  lines?: number;
}

/** Placeholder rows for a <List>. */
export function SkeletonList({ rows = 4, avatar = true, lines = 2, className, ...rest }: SkeletonListProps) {
  return (
    <ul aria-hidden="true" {...rest} className={cx("oq-skeleton-list", className)}>
      {Array.from({ length: rows }, (_, r) => (
        <li key={r}>
          {avatar && <Skeleton className="oq-skeleton--circle" width={32} height={32} />}
          <SkeletonText lines={lines} />
          <Skeleton width={36} height="0.75em" />
        </li>
      ))}
    </ul>
  );
}

export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  /** A media block across the top. */
  media?: boolean;
  lines?: number;
  /** A footer with two button-sized placeholders. */
  actions?: boolean;
}

/** A placeholder <Card>: optional media, a title, text and actions. */
export function SkeletonCard({ media, lines = 3, actions, className, ...rest }: SkeletonCardProps) {
  return (
    <div aria-hidden="true" {...rest} className={cx("oq-card", className)}>
      {media && <Skeleton className="oq-skeleton-card__media" />}
      <div className="oq-card__body oq-stack oq-gap-3">
        <Skeleton width="45%" height="1.15em" />
        <SkeletonText lines={lines} />
      </div>
      {actions && (
        <div className="oq-card__footer">
          <Skeleton width={64} height="var(--oq-control-md)" />
          <Skeleton width={80} height="var(--oq-control-md)" />
        </div>
      )}
    </div>
  );
}

export interface SkeletonTableProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  cols?: number;
  /** Matches <Table dense>. */
  dense?: boolean;
}

/** A placeholder table with a header row; numeric-looking last column right-aligned. */
export function SkeletonTable({ rows = 5, cols = 4, dense, className, ...rest }: SkeletonTableProps) {
  const cells = Array.from({ length: cols }, (_, c) => c);
  return (
    <div aria-hidden="true" {...rest} className={cx("oq-table-wrap", className)}>
      <table className={cx("oq-table oq-skeleton-table", dense && "oq-table--dense")}>
        <thead>
          <tr>
            {cells.map((c) => (
              <th key={c} className={c === cols - 1 && cols > 1 ? "oq-num" : undefined}>
                <Skeleton width={c === 0 ? "40%" : "55%"} style={c === cols - 1 && cols > 1 ? { marginLeft: "auto" } : undefined} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {cells.map((c) => (
                <td key={c} className={c === cols - 1 && cols > 1 ? "oq-num" : undefined}>
                  <Skeleton
                    width={c === cols - 1 && cols > 1 ? "40%" : width(r + c)}
                    style={c === cols - 1 && cols > 1 ? { marginLeft: "auto" } : undefined}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
