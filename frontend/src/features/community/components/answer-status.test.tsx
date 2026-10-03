import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AnswerStatusBadge, resolveAnswerStatus } from './answer-status';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

describe('resolveAnswerStatus', () => {
  it('should report a question with no replies as unanswered', () => {
    expect(resolveAnswerStatus(0, false)).toBe('UNANSWERED');
  });

  it('should report a question with replies but no accepted answer as discussing', () => {
    expect(resolveAnswerStatus(4, false)).toBe('DISCUSSING');
  });

  it('should report a question with an accepted answer as resolved', () => {
    expect(resolveAnswerStatus(4, true)).toBe('RESOLVED');
  });

  it('should prefer resolved over reply count when an answer was accepted', () => {
    // An answer can be accepted while the counter is stale or zero.
    expect(resolveAnswerStatus(0, true)).toBe('RESOLVED');
  });
});

describe('AnswerStatusBadge', () => {
  it('should label an unanswered question so it stands out in the feed', () => {
    // Arrange and Act
    render(<AnswerStatusBadge replyCount={0} hasAcceptedAnswer={false} />);

    // Assert
    expect(screen.getByText('Chưa có lời giải')).toBeInTheDocument();
  });

  it('should label a resolved question', () => {
    // Arrange and Act
    render(<AnswerStatusBadge replyCount={2} hasAcceptedAnswer />);

    // Assert
    expect(screen.getByText('Đã giải đáp')).toBeInTheDocument();
  });

  it('should show the reply count instead of a label in the compact rail', () => {
    // Arrange and Act
    render(<AnswerStatusBadge replyCount={7} hasAcceptedAnswer={false} compact />);

    // Assert
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText('Đang thảo luận')).not.toBeInTheDocument();
  });
});
