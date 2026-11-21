/**
 * A single-choice dropdown drawn by the app instead of the operating system.
 *
 * A native `<select>` opens the OS's own list — square, grey, system font,
 * blue highlight — which on a page of rounded white panels reads as a hole
 * punched through the design. This keeps the listbox semantics and keyboard
 * of a select and draws the list as one of the app's own panels.
 *
 * The list is portalled to `document.body` with fixed positioning because the
 * triggers live inside containers that clip (the welcome banner is
 * `overflow: hidden`); an absolutely placed list would be cut off at its edge.
 * How it is placed and dismissed lives in `select-menu-position.ts`.
 */
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from './icon';
import { nextIndex } from './select-menu-keys';
import { anchorFor, placement, useFollowAndDismiss } from './select-menu-position';

import type { Anchor } from './select-menu-position';

import './select-menu.css';

/** One choice in the list. */
export interface SelectMenuOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  /** A second, quieter line under the label — shown in the list only. */
  readonly description?: string;
}

interface SelectMenuProps<T extends string | number> {
  readonly value: T;
  readonly options: readonly SelectMenuOption<T>[];
  readonly onChange: (value: T) => void;
  /** Accessible name; the trigger shows only the current label. */
  readonly label: string;
  /** Icon drawn before the current label. */
  readonly icon?: string;
  /** Extra class on the trigger, so each place can size it to its context. */
  readonly className?: string;
  /** Which edge of the trigger the list lines up with. */
  readonly align?: 'start' | 'end';
  /**
   * `pill` for a compact filter in a toolbar; `field` for a form control that
   * should read as an input, full width with a rectangular border.
   */
  readonly variant?: 'pill' | 'field';
  /** Lets a `<label htmlFor>` point at the trigger. */
  readonly id?: string;
  readonly disabled?: boolean;
}

/**
 * Renders the trigger and, while open, the listbox beneath it.
 */
export function SelectMenu<T extends string | number>({
  value,
  options,
  onChange,
  label,
  icon,
  className = '',
  variant = 'pill',
  align = variant === 'field' ? 'start' : 'end',
  id,
  disabled = false,
}: SelectMenuProps<T>) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const open = anchor !== null;
  const current = options[selectedIndex];

  const close = useCallback((refocus: boolean) => {
    setAnchor(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openList = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setActiveIndex(selectedIndex);
    setAnchor(anchorFor(rect));
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close(true);
  };

  useFollowAndDismiss(open, triggerRef, listRef, close, setAnchor);

  useLayoutEffect(() => {
    // preventScroll: a focus that scrolled the page would fire the scroll
    // listener below and close the list the moment it opened.
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      // An Escape meant for the list must not also close the modal around it.
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
      return;
    }
    const next = nextIndex(event.key, activeIndex, options.length);
    if (next !== null) {
      event.preventDefault();
      setActiveIndex(next);
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        className={`select-menu__trigger select-menu__trigger--${variant} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${current?.label ?? ''}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        {icon && <Icon name={icon} size={18} />}
        <span className="select-menu__value">{current?.label}</span>
        <Icon name="expand_more" size={18} className="select-menu__chevron" />
      </button>

      {anchor &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${listId}-${activeIndex}`}
            className="select-menu__list"
            style={placement(anchor, align)}
            onKeyDown={onListKeyDown}
          >
            {options.map((option, index) => (
              <li
                key={String(option.value)}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                className={`select-menu__option ${index === activeIndex ? 'select-menu__option--active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span className="select-menu__text">
                  <span className="select-menu__label">{option.label}</span>
                  {option.description && (
                    <span className="select-menu__description">{option.description}</span>
                  )}
                </span>
                {index === selectedIndex && <Icon name="check" size={16} className="select-menu__check" />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
