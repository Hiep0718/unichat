import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CollapsibleBody } from './collapsible-body';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const short = 'Thử EXPLAIN ANALYZE xem query có dùng index không nhé.';
const long = 'Theo tài liệu của nhóm, '.repeat(60);

describe('CollapsibleBody', () => {
  it('should leave a short comment alone', () => {
    // Arrange and Act: folding something that already fits adds a click and
    // saves nothing.
    render(
      <CollapsibleBody text={short}>
        <p>{short}</p>
      </CollapsibleBody>,
    );

    // Assert
    expect(screen.queryByText('Xem thêm')).not.toBeInTheDocument();
    expect(screen.getByText(short)).toBeInTheDocument();
  });

  it('should fold a long one and offer to open it', () => {
    // Arrange and Act
    const { container } = render(
      <CollapsibleBody text={long}>
        <p>{long}</p>
      </CollapsibleBody>,
    );

    // Assert
    expect(screen.getByText('Xem thêm')).toBeInTheDocument();
    expect(container.querySelector('.foldable__body--folded')).toBeInTheDocument();
  });

  it('should keep the text in the page while folded', () => {
    // Arrange and Act: folded, not removed — so search, screen readers and
    // copy still reach it.
    const { container } = render(
      <CollapsibleBody text={long}>
        <p>{long}</p>
      </CollapsibleBody>,
    );

    // Assert: matched on a substring, because RTL normalises whitespace and the
    // exact repeated string would only be testing the matcher.
    const body = container.querySelector('.foldable__body');
    expect(body?.textContent).toContain('Theo tài liệu của nhóm');
    expect(body?.textContent?.length).toBeGreaterThan(600);
  });

  it('should unfold on click and offer to fold again', () => {
    // Arrange
    const { container } = render(
      <CollapsibleBody text={long}>
        <p>{long}</p>
      </CollapsibleBody>,
    );

    // Act
    fireEvent.click(screen.getByText('Xem thêm'));

    // Assert
    expect(container.querySelector('.foldable__body--folded')).not.toBeInTheDocument();
    expect(screen.getByText('Thu gọn')).toBeInTheDocument();
  });

  it('should fold again on a second click', () => {
    // Arrange
    const { container } = render(
      <CollapsibleBody text={long}>
        <p>{long}</p>
      </CollapsibleBody>,
    );

    // Act
    fireEvent.click(screen.getByText('Xem thêm'));
    fireEvent.click(screen.getByText('Thu gọn'));

    // Assert
    expect(container.querySelector('.foldable__body--folded')).toBeInTheDocument();
  });

  it('should report its state to assistive technology', () => {
    // Arrange and Act
    render(
      <CollapsibleBody text={long}>
        <p>{long}</p>
      </CollapsibleBody>,
    );

    // Assert
    const toggle = screen.getByRole('button', { name: /Xem thêm/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Thu gọn/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
