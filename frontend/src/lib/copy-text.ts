/**
 * Copying text to the clipboard, including over plain HTTP.
 *
 * `navigator.clipboard` exists only in secure contexts, and the deployed
 * environment is still served over HTTP; there the older `execCommand('copy')`
 * on a selected field is the only path that still works.
 */

/**
 * Copies `text`, falling back to selecting `field` and running the legacy copy
 * command when the async Clipboard API is unavailable or refused.
 *
 * @returns whether the browser reported the text as copied
 */
export async function copyText(text: string, field?: HTMLInputElement | null): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission refused: fall through to the legacy path below.
    }
  }
  return copyBySelection(field);
}

/** Selects the field so the user can copy by hand even if this fails. */
function copyBySelection(field?: HTMLInputElement | null): boolean {
  if (!field) return false;
  field.focus();
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}
