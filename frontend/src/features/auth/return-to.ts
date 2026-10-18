/**
 * Carries the page someone asked for across the login screen.
 *
 * Without this, a guard sends an unauthenticated visitor to `/login` and the
 * destination is simply lost: they sign in and land on the default page with
 * no idea what they clicked. That is survivable for an ordinary deep link and
 * fatal for an invite link, where the destination *is* the invitation.
 */

/** Query parameter naming the page to return to. */
export const RETURN_PARAM = 'redirect';

const DEFAULT_DESTINATION = '/workspaces';

/**
 * Validates a destination taken from the URL.
 *
 * Only a path inside this application is allowed. A value the visitor controls
 * that is handed straight to a redirect is an open redirect: a link to our own
 * domain that lands the victim on an attacker's login page, which is the
 * classic way to make a phishing page look legitimate.
 *
 * Rejected: absolute URLs, protocol-relative `//host`, and backslash forms that
 * some browsers normalise into `//`.
 *
 * @param raw the parameter as it arrived, or null when absent
 * @returns a safe in-app path, falling back to the default destination
 */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/')) {
    return DEFAULT_DESTINATION;
  }
  const secondCharacter = raw.charAt(1);
  if (secondCharacter === '/' || secondCharacter === '\\') {
    return DEFAULT_DESTINATION;
  }
  return raw;
}

/**
 * Builds the login URL that will come back to where the visitor was heading.
 *
 * @param destination path the visitor asked for, search and hash included
 */
export function loginPathFor(destination: string): string {
  if (safeReturnTo(destination) === DEFAULT_DESTINATION) {
    return '/login';
  }
  return `/login?${RETURN_PARAM}=${encodeURIComponent(destination)}`;
}

/** Carries the destination on to another auth screen, e.g. login to register. */
export function withReturnTo(path: string, destination: string | null): string {
  if (!destination || safeReturnTo(destination) === DEFAULT_DESTINATION) {
    return path;
  }
  return `${path}?${RETURN_PARAM}=${encodeURIComponent(destination)}`;
}
