import { type HTMLAttributes, type ReactNode, useEffect, useState } from "react";
import { type Color, colorClass, cx } from "./cx";
import { CheckIcon } from "./icons";

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  code: string;
  /** Shown in the header, e.g. "ts" or "bash". */
  language?: string;
  filename?: ReactNode;
  lineNumbers?: boolean;
  /** 1-based line numbers to highlight. */
  highlight?: number[];
  /** Show the copy button. Default true. */
  copyable?: boolean;
  /** Colour of highlighted lines. Default primary. */
  color?: Color;
  /** Max height before the code scrolls. */
  maxHeight?: number | string;
}

const CopyIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

/** Preformatted code with a header (language, filename), a copy button, optional line numbers and highlighted lines. */
export function CodeBlock({
  code,
  language,
  filename,
  lineNumbers,
  highlight = [],
  copyable = true,
  color = "primary",
  maxHeight,
  className,
  ...rest
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const lines = code.replace(/\n$/, "").split("\n");
  const hasHeader = filename != null || language != null || copyable;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard refused (insecure origin, permissions): leave the button as it was.
    }
  };

  return (
    <div {...rest} className={cx("oq-codeblock", lineNumbers && "oq-codeblock--numbered", colorClass(color), className)}>
      {hasHeader && (
        <div className="oq-codeblock__header">
          {filename != null && <span className="oq-codeblock__file">{filename}</span>}
          {language != null && <span className="oq-codeblock__lang">{language}</span>}
          {copyable && (
            <button
              type="button"
              className="oq-btn oq-btn--ghost oq-neutral oq-sm oq-codeblock__copy"
              data-copied={copied || undefined}
              onClick={copy}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      )}
      <pre className="oq-pre" style={maxHeight !== undefined ? { maxHeight } : undefined}>
        <code>
          {lines.map((line, i) => (
            <span key={i} className="oq-code-line" data-highlight={highlight.includes(i + 1) || undefined}>
              {line || " "}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
