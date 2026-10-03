import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PostBackgroundPanel } from './post-background-panel';
import { BackgroundPicker } from './background-picker';
import { MAX_BACKGROUND_BODY, backgroundFor, canUseBackground } from '../post-background';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

describe('PostBackgroundPanel', () => {
  it('should show the body on its colour', () => {
    // Arrange and Act
    const { container } = render(
      <PostBackgroundPanel backgroundKey="ocean" body="Họp lúc 3 giờ nhé" />,
    );

    // Assert
    expect(screen.getByText('Họp lúc 3 giờ nhé')).toBeInTheDocument();
    const panel = container.querySelector('.post-bg') as HTMLElement;
    expect(panel.style.background).toContain('linear-gradient');
  });

  it('should render nothing for an ordinary post', () => {
    // Arrange and Act
    const { container } = render(<PostBackgroundPanel backgroundKey={null} body="Nội dung" />);

    // Assert: callers place it unconditionally, so it has to be silent.
    expect(container.querySelector('.post-bg')).not.toBeInTheDocument();
  });

  it('should render plainly for a colour this build does not know', () => {
    // Arrange: a post styled by a newer deploy must not break this one.
    const { container } = render(
      <PostBackgroundPanel backgroundKey="colour-from-the-future" body="Nội dung" />,
    );

    // Assert
    expect(container.querySelector('.post-bg')).not.toBeInTheDocument();
  });

  it('should render nothing when there is no text to show', () => {
    // Arrange and Act
    const { container } = render(<PostBackgroundPanel backgroundKey="ocean" body="   " />);

    // Assert: an empty coloured slab is worse than no panel.
    expect(container.querySelector('.post-bg')).not.toBeInTheDocument();
  });
});

describe('background rules', () => {
  it('should allow a body up to the limit and refuse one past it', () => {
    // Arrange and Act and Assert: the boundary is pinned on both sides so the
    // picker and the server agree about where it sits.
    expect(canUseBackground('a'.repeat(MAX_BACKGROUND_BODY))).toBe(true);
    expect(canUseBackground('a'.repeat(MAX_BACKGROUND_BODY + 1))).toBe(false);
  });

  it('should ignore surrounding whitespace when measuring', () => {
    // Arrange and Act and Assert
    expect(canUseBackground(`  ${'a'.repeat(MAX_BACKGROUND_BODY)}  `)).toBe(true);
  });

  it('should resolve only the keys the server accepts', () => {
    // Arrange and Act and Assert
    expect(backgroundFor('ocean')).not.toBeNull();
    expect(backgroundFor('neon-zebra')).toBeNull();
    expect(backgroundFor(null)).toBeNull();
  });
});

describe('BackgroundPicker', () => {
  it('should disappear rather than refuse when the post does not qualify', () => {
    // Arrange and Act: a visible control that will not work invites the
    // question "why not"; withdrawing it answers by showing.
    const { container } = render(
      <BackgroundPicker value={null} onChange={() => {}} visible={false} />,
    );

    // Assert
    expect(container.querySelector('.bg-picker')).not.toBeInTheDocument();
  });

  it('should offer a way back to no background at all', () => {
    // Arrange and Act: picking a colour has to be reversible without
    // reopening the composer.
    render(<BackgroundPicker value="ocean" onChange={() => {}} visible />);

    // Assert
    expect(screen.getByLabelText('Không dùng nền')).toBeInTheDocument();
  });
});
