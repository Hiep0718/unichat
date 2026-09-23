/**
 * Blob URLs for profile pictures, shared across the page.
 *
 * The avatar endpoint needs a bearer token, which `<img src>` cannot send, so
 * each picture is fetched as a blob. A feed of twenty posts by four people
 * would otherwise issue twenty requests; this keeps one per person, and one
 * in-flight promise per person so simultaneous mounts do not race.
 *
 * Entries live for the page's lifetime. That is deliberate: a picture changes
 * rarely, and {@link forgetAvatar} clears the one case that matters — the
 * member replacing their own.
 */
import { fetchBlob } from '../lib/api-client';

const urls = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Resolves a member's picture to a blob URL.
 *
 * @returns the URL, or null when they have no picture or it could not be read
 */
export function loadAvatar(userId: string): Promise<string | null> {
  const cached = urls.get(userId);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = inFlight.get(userId);
  if (pending) {
    return pending;
  }

  const request = fetchBlob(`/users/${userId}/avatar`)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      urls.set(userId, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(userId);
    });

  inFlight.set(userId, request);
  return request;
}

/**
 * Drops a cached picture so the next render fetches it again.
 *
 * Called after the member changes their own, which would otherwise keep
 * showing the previous one until a full reload.
 */
export function forgetAvatar(userId: string): void {
  const url = urls.get(userId);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(userId);
  }
}
