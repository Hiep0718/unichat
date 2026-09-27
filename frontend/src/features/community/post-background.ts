/**
 * The colours a short post can sit on.
 *
 * Only the key travels to the server; these gradients live here, so restyling
 * the set never needs a migration and never leaves rows holding colours the
 * design no longer has. The key names must stay in step with `PostBackground`
 * on the server, which rejects anything it does not know — an unknown key
 * would otherwise render as no background and silently lose the author's
 * choice.
 *
 * Every preset is dark enough at the centre to carry white text, which is
 * measured rather than assumed; the check lives in the scratchpad contrast
 * script alongside the one for group themes.
 */

export interface PostBackgroundPreset {
  readonly key: string;
  readonly label: string;
  readonly background: string;
}

/**
 * Longest body that may carry a background.
 *
 * Mirrors `PostBackground.MAX_BODY_LENGTH` on the server. The picker hides
 * itself past this length, so the rule is met before the request is sent
 * rather than coming back as an error.
 */
export const MAX_BACKGROUND_BODY = 280;

export const POST_BACKGROUNDS: readonly PostBackgroundPreset[] = [
  { key: 'dusk', label: 'Hoàng hôn', background: 'linear-gradient(140deg, #4f46e5 0%, #a21caf 100%)' },
  { key: 'ocean', label: 'Đại dương', background: 'linear-gradient(140deg, #0284c7 0%, #0f766e 100%)' },
  { key: 'sunrise', label: 'Bình minh', background: 'linear-gradient(140deg, #ea580c 0%, #be123c 100%)' },
  { key: 'forest', label: 'Rừng xanh', background: 'linear-gradient(140deg, #15803d 0%, #0f766e 100%)' },
  { key: 'grape', label: 'Nho tím', background: 'linear-gradient(140deg, #7e22ce 0%, #4338ca 100%)' },
  { key: 'ember', label: 'Than hồng', background: 'linear-gradient(140deg, #b91c1c 0%, #c2410c 100%)' },
  { key: 'mint', label: 'Bạc hà', background: 'linear-gradient(140deg, #0d9488 0%, #1d4ed8 100%)' },
  { key: 'slate', label: 'Khói xám', background: 'linear-gradient(140deg, #334155 0%, #0f172a 100%)' },
];

/**
 * Resolves a stored key to its gradient.
 *
 * @returns the preset, or null for no background and for a key this build does
 *          not know — a post styled by a newer deploy renders plainly rather
 *          than breaking.
 */
export function backgroundFor(key: string | null | undefined): PostBackgroundPreset | null {
  if (!key) {
    return null;
  }
  return POST_BACKGROUNDS.find((preset) => preset.key === key) ?? null;
}

/**
 * Whether a body is short enough to sit on a colour.
 *
 * A gradient stops being readable behind more than a line or two, which is why
 * the option disappears rather than the text shrinking to fit.
 */
export function canUseBackground(body: string): boolean {
  return body.trim().length <= MAX_BACKGROUND_BODY;
}
