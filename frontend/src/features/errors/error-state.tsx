import type { ReactNode } from 'react';

import { Icon } from '../../components/icon';
import './error-state.css';

interface ErrorStateProps {
  /** Material Symbols glyph drawn above the heading. */
  readonly icon: string;
  /** Short code shown above the heading, such as "404"; omitted when there is none. */
  readonly code?: string;
  readonly title: string;
  readonly description: string;
  /** The way out: a link or a button, styled by the caller with `error-state__action`. */
  readonly action: ReactNode;
  /** Danger tint for states the reader caused nothing about but cannot pass, such as 403. */
  readonly tone?: 'neutral' | 'danger';
}

/**
 * Full-screen state for a page that cannot be shown.
 *
 * The 404, 403 and crash screens used to be three hand-styled copies with
 * inline colours; the 404 button drew white text on the ink colour, which
 * turns light in dark mode and left the label unreadable.
 */
export function ErrorState({ icon, code, title, description, action, tone = 'neutral' }: ErrorStateProps) {
  return (
    <main className={`error-state error-state--${tone}`}>
      <div className="error-state__mark">
        <Icon name={icon} size={32} />
      </div>
      {code && <p className="error-state__code">{code}</p>}
      <h1 className="error-state__title">{title}</h1>
      <p className="error-state__description">{description}</p>
      {action}
    </main>
  );
}
