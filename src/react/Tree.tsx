import { type HTMLAttributes, type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { type Color, colorClass, cx } from "./cx";
import { ChevronRightIcon } from "./icons";

export interface TreeNode {
  id: string;
  label: ReactNode;
  /** Replaces the default folder/file icon; `false` hides it. */
  icon?: ReactNode | false;
  /** Right-aligned text, e.g. a size or a count. */
  meta?: ReactNode;
  children?: TreeNode[];
}

export interface TreeViewProps extends Omit<HTMLAttributes<HTMLUListElement>, "onSelect"> {
  nodes: TreeNode[];
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  selected?: string | null;
  defaultSelected?: string | null;
  onSelect?: (id: string, node: TreeNode) => void;
  color?: Color;
}

const FolderIcon = () => (
  <svg className="oq-tree__icon oq-tree__icon--folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const FileIcon = () => (
  <svg className="oq-tree__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
  </svg>
);

interface Visible {
  node: TreeNode;
  parent: string | null;
}

/** A WAI-ARIA tree: ↑↓ move, → opens or enters, ← closes or goes to the parent, Enter/Space select, Home/End jump. */
export function TreeView({
  nodes,
  expanded,
  defaultExpanded = [],
  onExpandedChange,
  selected,
  defaultSelected = null,
  onSelect,
  color,
  className,
  ...rest
}: TreeViewProps) {
  const [innerOpen, setInnerOpen] = useState(defaultExpanded);
  const open = expanded ?? innerOpen;
  const [innerSel, setInnerSel] = useState(defaultSelected);
  const sel = selected !== undefined ? selected : innerSel;
  const [focus, setFocus] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLLIElement>());

  // The rows in display order, which is what the arrow keys walk.
  const visible = useMemo(() => {
    const out: Visible[] = [];
    const walk = (list: TreeNode[], parent: string | null) => {
      for (const node of list) {
        out.push({ node, parent });
        if (node.children?.length && open.includes(node.id)) walk(node.children, node.id);
      }
    };
    walk(nodes, null);
    return out;
  }, [nodes, open]);

  const setOpen = (next: string[]) => {
    if (expanded === undefined) setInnerOpen(next);
    onExpandedChange?.(next);
  };
  const toggle = (id: string, to?: boolean) => {
    const isOpen = open.includes(id);
    const want = to ?? !isOpen;
    if (want !== isOpen) setOpen(want ? [...open, id] : open.filter((x) => x !== id));
  };
  const select = (node: TreeNode) => {
    if (selected === undefined) setInnerSel(node.id);
    onSelect?.(node.id, node);
  };
  const moveTo = (id: string | undefined) => {
    if (!id) return;
    setFocus(id);
    refs.current.get(id)?.focus();
  };

  const tabStop = focus ?? sel ?? visible[0]?.node.id;

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const at = visible.findIndex((v) => v.node.id === (focus ?? tabStop));
    const row = visible[at];
    if (!row) return;
    const hasKids = !!row.node.children?.length;
    const isOpen = open.includes(row.node.id);
    switch (e.key) {
      case "ArrowDown":
        moveTo(visible[at + 1]?.node.id);
        break;
      case "ArrowUp":
        moveTo(visible[at - 1]?.node.id);
        break;
      case "ArrowRight":
        if (hasKids && !isOpen) toggle(row.node.id, true);
        else if (hasKids) moveTo(row.node.children?.[0]?.id);
        break;
      case "ArrowLeft":
        if (hasKids && isOpen) toggle(row.node.id, false);
        else moveTo(row.parent ?? undefined);
        break;
      case "Home":
        moveTo(visible[0]?.node.id);
        break;
      case "End":
        moveTo(visible[visible.length - 1]?.node.id);
        break;
      case "Enter":
      case " ":
        select(row.node);
        if (hasKids && e.key === "Enter") toggle(row.node.id);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const render = (list: TreeNode[], level: number): ReactNode =>
    list.map((node) => {
      const hasKids = !!node.children?.length;
      const isOpen = open.includes(node.id);
      return (
        <li
          key={node.id}
          ref={(el) => {
            if (el) refs.current.set(node.id, el);
            else refs.current.delete(node.id);
          }}
          role="treeitem"
          aria-level={level}
          aria-expanded={hasKids ? isOpen : undefined}
          aria-selected={node.id === sel}
          tabIndex={node.id === tabStop ? 0 : -1}
          onFocus={(e) => {
            if (e.target === e.currentTarget) setFocus(node.id);
          }}
        >
          <div
            className="oq-tree__row"
            onClick={() => {
              select(node);
              if (hasKids) toggle(node.id);
              moveTo(node.id);
            }}
          >
            <span className="oq-tree__twisty">{hasKids ? <ChevronRightIcon /> : null}</span>
            {node.icon === false ? null : (node.icon ?? (hasKids ? <FolderIcon /> : <FileIcon />))}
            <span className="oq-truncate">{node.label}</span>
            {node.meta != null && <span className="oq-tree__meta">{node.meta}</span>}
          </div>
          {hasKids && isOpen && <ul role="group">{render(node.children ?? [], level + 1)}</ul>}
        </li>
      );
    });

  return (
    <ul role="tree" {...rest} className={cx("oq-tree", colorClass(color), className)} onKeyDown={onKeyDown}>
      {render(nodes, 1)}
    </ul>
  );
}
