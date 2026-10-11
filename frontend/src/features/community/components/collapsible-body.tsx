/**
 * Folds a long comment down to a readable height.
 *
 * The assistant's answers are the reason this exists — a retrieval answer with
 * headings, lists and a diagram can be twenty times the height of the question
 * it sits under, which pushes every other reply off the screen.
 *
 * It folds by length rather than by author, though. A rule that depends on who
 * wrote something surprises the person who pasted an essay and saw it left
 * alone, and the problem is the height either way.
 *
 * Citations are deliberately left outside the fold by the caller: they are the
 * evidence for the answer, and evidence hidden behind a click is evidence
 * nobody checks.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import './collapsible-body.css';

interface CollapsibleBodyProps {
  /** The raw text, measured to decide whether folding is warranted. */
  readonly text: string;
  readonly children: React.ReactNode;
}

/**
 * Below this a comment fits on screen beside its neighbours, so folding it
 * would add a click and save nothing.
 *
 * Measured on the raw text rather than the rendered height: reading the DOM
 * back means writing state from an effect on every comment in the thread, and
 * a character count is predictable, testable, and wrong only at the margin.
 */
const FOLD_ABOVE_CHARS = 600;

export function CollapsibleBody({ text, children }: CollapsibleBodyProps) {
  const [open, setOpen] = useState(false);

  if (text.trim().length <= FOLD_ABOVE_CHARS) {
    return <>{children}</>;
  }

  return (
    <div className="foldable">
      <div className={`foldable__body ${open ? '' : 'foldable__body--folded'}`}>
        {children}
      </div>
      <button
        type="button"
        className="foldable__toggle"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
      >
        <Icon name={open ? 'expand_less' : 'expand_more'} size={16} />
        {open ? 'Thu gọn' : 'Xem thêm'}
      </button>
    </div>
  );
}
