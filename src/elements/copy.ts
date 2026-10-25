import { emit, numberAttr, OqElement } from "./base";

/**
 * `<oq-copy>` around a button: a click copies text to the clipboard.
 *
 * What is copied, first match wins: the `text` attribute; the text of the element matched by
 * the `target` selector (an input's value for form fields); inside an `.oq-codeblock`, its
 * code lines joined by newlines.
 *
 * While "copied", the button gets `data-copied="true"` and its last text node reads the
 * `copied-label` attribute ("Copied") for `feedback` ms (1500).
 *
 * Events: `oq-copy` with `{ text }`, or `oq-copy-error` with `{ error }`.
 */
export class OqCopy extends OqElement {
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected setup(): void {
    this.ls.on(this, "click", (e) => {
      if ((e.target as Element).closest("button, [role=button]")) void this.copy();
    });
  }

  protected override cleanup(): void {
    clearTimeout(this.timer);
  }

  /** The text a click would copy now. */
  text(): string {
    const own = this.getAttribute("text");
    if (own !== null) return own;
    const sel = this.getAttribute("target");
    if (sel) {
      const t = this.ownerDocument.querySelector(sel);
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return t.value;
      return t?.textContent ?? "";
    }
    const block = this.closest(".oq-codeblock");
    if (block) {
      const lines = [...block.querySelectorAll(".oq-code-line")];
      return lines.length ? lines.map((l) => l.textContent ?? "").join("\n") : (block.querySelector("pre")?.textContent ?? "");
    }
    return "";
  }

  async copy(): Promise<void> {
    const text = this.text();
    try {
      await writeClipboard(text);
      emit(this, "oq-copy", { text });
      this.feedback();
    } catch (error) {
      emit(this, "oq-copy-error", { error });
    }
  }

  private feedback(): void {
    const btn = this.querySelector<HTMLElement>("button, [role=button]");
    if (!btn) return;
    const label = [...btn.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent?.trim());
    clearTimeout(this.timer);
    if (btn.dataset.copied !== "true" && label) btn.dataset.label = label.textContent ?? "";
    btn.dataset.copied = "true";
    if (label) label.textContent = this.getAttribute("copied-label") ?? "Copied";
    this.timer = setTimeout(
      () => {
        btn.dataset.copied = "false";
        if (label && btn.dataset.label !== undefined) label.textContent = btn.dataset.label;
      },
      numberAttr(this, "feedback", 1500),
    );
  }
}

async function writeClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // file:// pages and old browsers: the selection fallback.
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.append(ta);
  ta.select();
  const ok = document.execCommand?.("copy");
  ta.remove();
  if (!ok) throw new Error("clipboard unavailable");
}
