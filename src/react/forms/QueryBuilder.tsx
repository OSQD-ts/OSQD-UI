import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "../cx";
import { CloseIcon, SearchIcon } from "../icons";
import { FieldShell, type FieldShellProps, shellProps } from "./FieldShell";
import {
  type FilterField,
  type FilterOp,
  type FilterTerm,
  type FilterValue,
  formatFilterTerm,
  type JqlQuery,
  FILTER_OP_SYMBOL,
  filterOpsFor,
  parseFilterText,
  toJql,
} from "./query";

export interface QueryBuilderProps extends FieldShellProps {
  fields: FilterField[];
  value?: FilterTerm[];
  defaultValue?: FilterTerm[];
  /** Gets the terms and the same filter as a JQL query document. */
  onChange?: (terms: FilterTerm[], query: JqlQuery) => void;
  placeholder?: string;
  /** Let words that are not `field:value` search all text. Default true. */
  freeText?: boolean;
  id?: string;
  className?: string;
}

interface Suggestion {
  key: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Replaces the draft; when `commit` is set the draft is turned into a chip right away. */
  draft: string;
  commit?: boolean;
}

const DRAFT = /^(-|!)?([A-Za-z_][\w.]*)?$/;
const DRAFT_VALUE = /^(-|!)?([A-Za-z_][\w.]*)(!=|>=|<=|:|>|<|~)(.*)$/;

function suggestionsFor(draft: string, fields: FilterField[], freeText: boolean): Suggestion[] {
  const out: Suggestion[] = [];
  const valueMatch = DRAFT_VALUE.exec(draft);
  if (valueMatch) {
    const [, neg = "", name = "", sym = "", raw = ""] = valueMatch;
    const field = fields.find((f) => f.name === name);
    const parts = raw.split(",");
    const partial = (parts[parts.length - 1] ?? "").toLowerCase();
    const before = parts.slice(0, -1);
    for (const opt of field?.options ?? []) {
      if (before.includes(opt) || !opt.toLowerCase().includes(partial)) continue;
      out.push({ key: `v:${opt}`, label: opt, hint: field?.label ?? name, draft: `${neg}${name}${sym}${[...before, opt].join(",")}`, commit: true });
    }
    return out.slice(0, 12);
  }
  const m = DRAFT.exec(draft);
  if (m) {
    const [, neg = "", partial = ""] = m;
    for (const f of fields) {
      if (partial && !f.name.toLowerCase().startsWith(partial.toLowerCase()) && !f.label?.toLowerCase().startsWith(partial.toLowerCase())) continue;
      const sym = f.type === "number" ? ">" : ":";
      out.push({
        key: `f:${f.name}`,
        label: (
          <>
            <span className="oq-mono">{`${neg}${f.name}${sym}`}</span>
            {f.label && <span className="oq-faint"> {f.label}</span>}
          </>
        ),
        hint: f.type ?? "string",
        draft: `${neg}${f.name}${sym}`,
      });
    }
  }
  if (freeText && draft.trim() && !draft.trim().startsWith("-")) {
    out.push({ key: "text", label: <>Search all text for “{draft.trim()}”</>, hint: "text", draft: draft.includes(" ") ? `"${draft.trim()}"` : draft.trim(), commit: true });
  }
  return out;
}

function valueText(v: FilterValue | FilterValue[]): string {
  return Array.isArray(v) ? v.join(", ") : String(v);
}

/**
 * A search box that turns `field:value` into chips: autocomplete for field names and their
 * values, an operator on each chip that cycles through the ones the field allows, free text for
 * the rest. Its value is a list of terms and, for a store or an API, a JQL query document.
 */
export function QueryBuilder(props: QueryBuilderProps) {
  const { fields, value, defaultValue = [], onChange, placeholder = "Filter… e.g. status:open p95>250", freeText = true, id: idProp, className } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const [inner, setInner] = useState<FilterTerm[]>(defaultValue);
  const terms = value ?? inner;
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => suggestionsFor(draft, fields, freeText), [draft, fields, freeText]);
  const listId = `${id}-suggest`;
  const showList = open && suggestions.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const commitTerms = (next: FilterTerm[]) => {
    if (value === undefined) setInner(next);
    onChange?.(next, toJql(next));
  };
  const commitDraft = (text: string) => {
    const parsed = parseFilterText(text, fields).filter((t) => freeText || t.op !== "text");
    if (parsed.length) commitTerms([...terms, ...parsed]);
    setDraft("");
    setActive(0);
  };
  const apply = (s: Suggestion) => {
    if (s.commit) commitDraft(s.draft);
    else {
      setDraft(s.draft);
      setActive(0);
    }
    input.current?.focus();
  };
  const removeAt = (i: number) => commitTerms(terms.filter((_, j) => j !== i));
  const editAt = (i: number) => {
    const t = terms[i] as FilterTerm;
    removeAt(i);
    setDraft(formatFilterTerm(t));
    setOpen(true);
    input.current?.focus();
  };
  const cycleOp = (i: number) => {
    const t = terms[i] as FilterTerm;
    const field = fields.find((f) => f.name === t.field);
    const ops = filterOpsFor(field);
    const nextOp = ops[(ops.indexOf(t.op) + 1) % ops.length] as FilterOp;
    let nextValue = t.value;
    if (nextOp === "in" && !Array.isArray(t.value)) nextValue = [t.value];
    else if (nextOp !== "in" && nextOp !== "ne" && Array.isArray(t.value)) nextValue = t.value[0] ?? "";
    commitTerms(terms.map((x, j) => (j === i ? { ...x, op: nextOp, value: nextValue } : x)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = showList ? suggestions[active] : undefined;
      // Enter takes the highlighted suggestion only once the person has moved to it or the draft
      // is a bare field prefix; a complete term like `p95>250` is committed as typed.
      if (s && (active > 0 || !DRAFT_VALUE.test(draft) || s.commit)) apply(s);
      else commitDraft(draft);
    } else if (e.key === "Tab" && showList && draft) {
      const s = suggestions[active];
      if (s && !s.commit) {
        e.preventDefault();
        apply(s);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && draft === "" && terms.length) {
      e.preventDefault();
      editAt(terms.length - 1);
    }
  };

  return (
    <FieldShell id={id} {...shellProps(props)}>
      <div ref={root} className={cx("oq-query", className)}>
        {/* Clicking anywhere in the box focuses its input; the input itself has the keyboard. */}
        <div className="oq-query__box" onClick={() => input.current?.focus()}>
          <SearchIcon className="oq-query__icon" aria-hidden="true" />
          {terms.map((t, i) => {
            const field = fields.find((f) => f.name === t.field);
            const unknown = t.op !== "text" && !field;
            const key = `${i}:${formatFilterTerm(t)}`;
            return (
              <span key={key} className={cx("oq-query__term", t.op === "text" && "oq-query__term--text", unknown && "is-unknown")} title={unknown ? `Unknown field “${t.field}”` : undefined}>
                {t.op !== "text" && (
                  <>
                    <button type="button" className="oq-query__field" onClick={() => editAt(i)} aria-label={`Edit filter ${formatFilterTerm(t)}`}>
                      {field?.label ?? t.field}
                    </button>
                    <button
                      type="button"
                      className="oq-query__op"
                      onClick={() => cycleOp(i)}
                      aria-label={`Operator: ${t.op === "ne" && Array.isArray(t.value) ? "not in" : t.op}. Click to change.`}
                    >
                      {t.op === "ne" && Array.isArray(t.value) ? "not in" : FILTER_OP_SYMBOL[t.op]}
                    </button>
                  </>
                )}
                <button type="button" className="oq-query__value" onClick={() => editAt(i)}>
                  {t.op === "text" ? `“${valueText(t.value)}”` : valueText(t.value)}
                </button>
                <button type="button" className="oq-query__remove" aria-label={`Remove filter ${formatFilterTerm(t)}`} onClick={() => removeAt(i)}>
                  <CloseIcon />
                </button>
              </span>
            );
          })}
          <input
            ref={input}
            id={id}
            className="oq-query__input"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${id}-s${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={terms.length ? "" : placeholder}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {terms.length > 0 && (
            <button type="button" className="oq-btn oq-btn--ghost oq-neutral oq-sm oq-query__clear" onClick={() => commitTerms([])}>
              Clear
            </button>
          )}
        </div>
        <ul id={listId} role="listbox" className="oq-listbox" hidden={!showList}>
          {suggestions.map((s, i) => (
            <li
              key={s.key}
              id={`${id}-s${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active || undefined}
              className="oq-option"
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(s)}
            >
              <span className="oq-truncate">{s.label}</span>
              {s.hint != null && <span className="oq-option__hint">{s.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </FieldShell>
  );
}
