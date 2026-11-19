import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectMenu } from './select-menu';
import { nextIndex } from './select-menu-keys';
import { anchorFor } from './select-menu-position';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const OPTIONS = [
  { value: 'a', label: 'Quản lý dự án' },
  { value: 'b', label: 'Trí tuệ nhân tạo' },
  { value: 'c', label: 'Mongodb' },
] as const;

function renderMenu(value: 'a' | 'b' | 'c' = 'a') {
  const onChange = vi.fn();
  render(<SelectMenu label="Nhóm để hỏi" value={value} options={OPTIONS} onChange={onChange} />);
  return { onChange, trigger: screen.getByRole('button', { name: /Nhóm để hỏi/ }) };
}

describe('SelectMenu', () => {
  it('should show the current choice on a closed trigger', () => {
    // Arrange and Act
    const { trigger } = renderMenu('b');

    // Assert
    expect(trigger).toHaveTextContent('Trí tuệ nhân tạo');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should open its own list with the current choice marked', async () => {
    // Arrange
    const { trigger } = renderMenu('b');

    // Act
    await userEvent.click(trigger);

    // Assert
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Trí tuệ nhân tạo' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('should report a clicked choice and close', async () => {
    // Arrange
    const { trigger, onChange } = renderMenu();
    await userEvent.click(trigger);

    // Act
    await userEvent.click(screen.getByRole('option', { name: 'Mongodb' }));

    // Assert
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should be usable from the keyboard alone', async () => {
    // Arrange
    const { trigger, onChange } = renderMenu();
    trigger.focus();

    // Act: open with the arrow, move down one, pick.
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    // Assert
    expect(onChange).toHaveBeenCalledWith('b');
    expect(trigger).toHaveFocus();
  });

  it('should close without choosing on Escape', async () => {
    // Arrange
    const { trigger, onChange } = renderMenu();
    await userEvent.click(trigger);

    // Act
    await userEvent.keyboard('{Escape}');

    // Assert
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should close when the user presses outside it', async () => {
    // Arrange
    const { trigger } = renderMenu();
    await userEvent.click(trigger);

    // Act
    await userEvent.click(document.body);

    // Assert
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('SelectMenu while the page moves', () => {
  it('should stay open when the page scrolls after it opened', async () => {
    // Arrange: a driver or a trackpad delivers its scroll after the click.
    const { trigger } = renderMenu();
    await userEvent.click(trigger);

    // Act
    await act(async () => {
      fireEvent.scroll(window);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    // Assert
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should stay open while the user scrolls the list itself', async () => {
    // Arrange
    const { trigger } = renderMenu();
    await userEvent.click(trigger);

    // Act
    fireEvent.scroll(screen.getByRole('listbox'));

    // Assert
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should be choosable with a number value', async () => {
    // Arrange
    const onChange = vi.fn();
    render(
      <SelectMenu
        label="Số dòng"
        value={10}
        options={[{ value: 10, label: '10 dòng' }, { value: 20, label: '20 dòng' }]}
        onChange={onChange}
      />,
    );

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Số dòng/ }));
    await userEvent.click(screen.getByRole('option', { name: '20 dòng' }));

    // Assert: the value comes back as the number it went in as.
    expect(onChange).toHaveBeenCalledWith(20);
  });
});

describe('anchorFor', () => {
  const rectAt = (top: number) => ({ top, bottom: top + 36, left: 100, right: 300, width: 200 }) as DOMRect;

  it('should open below a trigger with room under it', () => {
    // Arrange
    window.innerHeight = 900;

    // Act
    const anchor = anchorFor(rectAt(100));

    // Assert
    expect(anchor.top).toBe(142);
    expect(anchor.bottom).toBeUndefined();
  });

  it('should flip above a trigger near the bottom of the viewport', () => {
    // Arrange
    window.innerHeight = 900;

    // Act
    const anchor = anchorFor(rectAt(820));

    // Assert
    expect(anchor.top).toBeUndefined();
    expect(anchor.bottom).toBe(86);
  });
});

describe('nextIndex', () => {
  it('should stop at the ends instead of wrapping, like a native select', () => {
    expect(nextIndex('ArrowUp', 0, 3)).toBe(0);
    expect(nextIndex('ArrowDown', 2, 3)).toBe(2);
  });

  it('should jump to the first and last option', () => {
    expect(nextIndex('Home', 2, 3)).toBe(0);
    expect(nextIndex('End', 0, 3)).toBe(2);
  });

  it('should ignore keys that do not move the highlight', () => {
    expect(nextIndex('a', 1, 3)).toBeNull();
    expect(nextIndex('ArrowDown', 0, 0)).toBeNull();
  });
});
