import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readRailCollapsed, writeRailCollapsed } from './rail-state';

describe('rail-state', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('should start open for someone who has never collapsed it', () => {
    expect(readRailCollapsed()).toBe(false);
  });

  it('should remember a collapse across reloads', () => {
    // Arrange, Act
    writeRailCollapsed(true);

    // Assert
    expect(readRailCollapsed()).toBe(true);
  });

  it('should remember re-opening it too', () => {
    // Arrange
    writeRailCollapsed(true);

    // Act
    writeRailCollapsed(false);

    // Assert
    expect(readRailCollapsed()).toBe(false);
  });

  it('should treat a value it does not understand as open', () => {
    // Arrange: một bản cũ của ứng dụng, hoặc người dùng tự sửa lưu trữ.
    window.localStorage.setItem('unichat.rail', 'halfway');

    // Act, Assert
    expect(readRailCollapsed()).toBe(false);
  });

  it('should still work when the browser blocks storage', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    // Act, Assert
    expect(() => writeRailCollapsed(true)).not.toThrow();
    expect(readRailCollapsed()).toBe(false);
  });
});
