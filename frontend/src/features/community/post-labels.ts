/**
 * The three kinds of post, as every screen names and draws them.
 *
 * Kept in one place because the composer used emoji (❓ 💬 📢) while every
 * other surface used Material Symbols, so the same label looked different
 * depending on where it was picked.
 */
export type PostLabel = 'QUESTION' | 'DISCUSSION' | 'ANNOUNCEMENT';

/** Text and Material Symbols glyph for one kind of post. */
export interface PostLabelMeta {
  readonly text: string;
  readonly icon: string;
}

/** Display metadata for each post kind, in the order the composer offers them. */
export const POST_LABEL_META: Readonly<Record<PostLabel, PostLabelMeta>> = {
  QUESTION: { text: 'Câu hỏi', icon: 'help' },
  DISCUSSION: { text: 'Thảo luận', icon: 'forum' },
  ANNOUNCEMENT: { text: 'Thông báo', icon: 'campaign' },
};
