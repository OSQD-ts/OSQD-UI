/**
 * Importing this defines every element (`import "@osqd/ui/elements/auto"`). It is also the
 * entry of the standalone `assets/osqd-ui-elements.js`, where these exports become `window.OQ`
 * (`OQ.toast({ title: "Saved", color: "success" })`).
 */
import { defineAll } from "./index";

export * from "./index";

defineAll();
