import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from './copy-text';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubContext(secure: boolean, writeText?: (text: string) => Promise<void>) {
  vi.stubGlobal('isSecureContext', secure);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

function stubExecCommand(result: boolean | Error) {
  const exec = vi.fn(() => {
    if (result instanceof Error) throw result;
    return result;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: exec });
  return exec;
}

describe('copyText', () => {
  it('should use the Clipboard API in a secure context', async () => {
    // Arrange
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubContext(true, writeText);

    // Act
    const ok = await copyText('https://x/invite/abc');

    // Assert
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://x/invite/abc');
  });

  it('should select the field and use the legacy command over plain HTTP', async () => {
    // Arrange
    stubContext(false);
    const exec = stubExecCommand(true);
    const field = document.createElement('input');
    field.value = 'https://x/invite/abc';
    document.body.append(field);

    // Act
    const ok = await copyText(field.value, field);

    // Assert
    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it('should fall back when the Clipboard API refuses permission', async () => {
    // Arrange
    stubContext(true, vi.fn().mockRejectedValue(new Error('denied')));
    stubExecCommand(true);

    // Act
    const ok = await copyText('link', document.createElement('input'));

    // Assert
    expect(ok).toBe(true);
  });

  it('should report failure when there is no field to fall back on', async () => {
    // Arrange
    stubContext(false);

    // Act, Assert
    expect(await copyText('link')).toBe(false);
  });

  it('should report failure when the legacy command throws', async () => {
    // Arrange
    stubContext(false);
    stubExecCommand(new Error('unsupported'));

    // Act, Assert
    expect(await copyText('link', document.createElement('input'))).toBe(false);
  });
});
