/**
 * UUID validation utility for mobile navigation routes and query parameters.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks whether a given string is a valid RFC 4122 UUID.
 *
 * @param value String to test
 * @returns true if value is a valid UUID, false otherwise
 */
export function isValidUuid(value?: string | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value.trim());
}
