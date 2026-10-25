import {
  type ButtonHTMLAttributes,
  createContext,
  type CSSProperties,
  forwardRef,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cx } from "./cx";
import { useFitInViewport } from "./viewport";
import { CloseIcon } from "./icons";

/* ---------- Dialog (native <dialog>) ---------- */

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "title" | "open"> {
  open: boolean;
  /** Called on Escape, backdrop click and the close button. The parent sets `open` to false. */
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  /** A panel sliding in from the right instead of a centred box. */
  drawer?: boolean;
  /** Width in px (or any CSS length). */
  width?: number | string;
  /** Hide the × button in the header. */
  hideClose?: boolean;
}

/** A modal dialog on the native dialog element, or a drawer sliding in from the right; Escape and a backdrop click call `onClose`. */
export function Dialog({ open, onClose, title, footer, drawer, width, hideClose, className, style, children, ...rest }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      {...rest}
      className={cx("oq-dialog", drawer && "oq-dialog--drawer", className)}
      style={{ ...(width !== undefined ? { "--w": typeof width === "number" ? `${width}px` : width } : {}), ...style } as CSSProperties}
      onCancel={(e) => {
        // Escape: keep the element open until the parent says otherwise, so `open` stays the truth.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the <dialog> itself (not its content) is a click on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {(title != null || !hideClose) && (
        <div className="oq-dialog__header">
          {title != null && <h2 className="oq-dialog__title">{title}</h2>}
          {!hideClose && (
            <button type="button" className="oq-btn oq-btn--ghost oq-btn--icon oq-sm oq-neutral oq-dialog__close" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      <div className="oq-dialog__body">{children}</div>
      {footer != null && <div className="oq-dialog__footer">{footer}</div>}
    </dialog>
  );
}

/* ---------- Menu ---------- */

const CloseMenu = createContext<(() => void) | null>(null);

/** A floating list of actions, usually inside a Dropdown. */
export const Menu = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Menu({ className, ...rest }, ref) {
  return <div ref={ref} role="menu" {...rest} className={cx("oq-menu", className)} />;
});

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  /** Right-aligned hint, e.g. a shortcut. */
  hint?: ReactNode;
  danger?: boolean;
}

/** One action in a Menu, with an optional icon and shortcut hint. */
export function MenuItem({ icon, hint, danger, className, children, onClick, ...rest }: MenuItemProps) {
  const close = useContext(CloseMenu);
  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      className={cx("oq-menu__item", danger && "oq-danger", className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) close?.();
      }}
    >
      {icon}
      <span className="oq-grow oq-truncate">{children}</span>
      {hint != null && <span className="oq-menu__hint">{hint}</span>}
    </button>
  );
}

/** A thin line between groups of menu items. */
export function MenuSeparator() {
  return <div role="separator" className="oq-menu__sep" />;
}

/** A small heading over a group of menu items. */
export function MenuLabel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("oq-menu__label oq-overline", className)} />;
}

export interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Renders the trigger; spread `props` onto the element that opens the menu. */
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => ReactNode;
  /** Menu items (MenuItem, MenuSeparator, MenuLabel). */
  children: ReactNode;
  /** Align the menu to the trigger's right edge. */
  align?: "start" | "end";
}

/** A trigger and a menu that closes on outside click, Escape, or choosing an item. */
export function Dropdown({ trigger, children, align = "start", className, ...rest }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const side = useFitInViewport(menu, open, "bottom");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} {...rest} className={cx("oq-dropdown", align === "end" && "oq-dropdown--end", className)}>
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <CloseMenu.Provider value={() => setOpen(false)}>
          <Menu ref={menu} data-side={side}>
            {children}
          </Menu>
        </CloseMenu.Provider>
      )}
    </div>
  );
}
