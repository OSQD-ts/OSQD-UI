/**
 * @osqd/ui/elements — custom elements for pages without React or a build step.
 *
 * Every element renders into the light DOM and enhances markup that already uses the kit's
 * classes, so a page looks right before the script loads and works once it has. Importing this
 * module defines nothing; call `defineAll()`, or import `@osqd/ui/elements/auto`, or load the
 * standalone `assets/osqd-ui-elements.js`, which does both and exposes `window.OQ`.
 */
import { define } from "./base";
import { OqCombobox } from "./combobox";
import { OqCopy } from "./copy";
import { installOpener, OqDialog } from "./dialog";
import { OqDropdown } from "./dropdown";
import { OqDropzone, OqNumber, OqTagInput } from "./inputs";
import { OqCommandPalette } from "./palette";
import { OqSortableTable } from "./table";
import { OqTabs } from "./tabs";
import { OqThemeSelect } from "./theme-select";
import { installToastTrigger, OqToastRegion } from "./toast";
import { OqTree } from "./tree";

export type { ComboOption } from "./combobox";
export { accepts, type DropRejection, formatBytes } from "./inputs";
export { matchesHotkey, type PaletteCommand } from "./palette";
export { compare, type SortDirection } from "./table";
export { type ToastColor, type ToastOptions, toast } from "./toast";
export {
  OqCombobox,
  OqCommandPalette,
  OqCopy,
  OqDialog,
  OqDropdown,
  OqDropzone,
  OqNumber,
  OqSortableTable,
  OqTabs,
  OqTagInput,
  OqThemeSelect,
  OqToastRegion,
  OqTree,
};

/** Tag name → class, for every element in the layer. */
export const elements = {
  "oq-dialog": OqDialog,
  "oq-tabs": OqTabs,
  "oq-dropdown": OqDropdown,
  "oq-toast-region": OqToastRegion,
  "oq-combobox": OqCombobox,
  "oq-tree": OqTree,
  "oq-command-palette": OqCommandPalette,
  "oq-sortable-table": OqSortableTable,
  "oq-copy": OqCopy,
  "oq-theme-select": OqThemeSelect,
  "oq-number": OqNumber,
  "oq-tag-input": OqTagInput,
  "oq-dropzone": OqDropzone,
} as const;

export type ElementTag = keyof typeof elements;

/**
 * Define every element and install the two document-level helpers (`data-oq-open` openers and
 * `data-oq-toast-*` triggers). Safe to call twice, and a no-op outside a browser.
 */
export function defineAll(): void {
  if (typeof customElements === "undefined") return;
  for (const [name, ctor] of Object.entries(elements)) define(name, ctor);
  installOpener();
  installToastTrigger();
}

declare global {
  interface HTMLElementTagNameMap {
    "oq-dialog": OqDialog;
    "oq-tabs": OqTabs;
    "oq-dropdown": OqDropdown;
    "oq-toast-region": OqToastRegion;
    "oq-combobox": OqCombobox;
    "oq-tree": OqTree;
    "oq-command-palette": OqCommandPalette;
    "oq-sortable-table": OqSortableTable;
    "oq-copy": OqCopy;
    "oq-theme-select": OqThemeSelect;
    "oq-number": OqNumber;
    "oq-tag-input": OqTagInput;
    "oq-dropzone": OqDropzone;
  }
}
