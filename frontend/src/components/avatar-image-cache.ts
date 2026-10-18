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
 *
 * Groups share the cache rather than having one of their own, because the
 * problem is the same one: a bearer token an <img> cannot send. Their entries
 * are keyed apart so a conversation id can never collide with a user id.
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
  return load(userId, `/users/${userId}/avatar`);
}

/**
 * Resolves a group's picture to a blob URL.
 *
 * @returns the URL, or null when the group has none or it could not be read
 */
export function loadGroupAvatar(conversationId: string): Promise<string | null> {
  return load(groupKey(conversationId), `/work-chat/conversations/${conversationId}/avatar`);
}

/** One request per picture, and one in-flight promise per picture. */
function load(cacheKey: string, path: string): Promise<string | null> {
  const cached = urls.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = inFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = fetchBlob(path)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      urls.set(cacheKey, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);
  return request;
}

/** Keeps conversation entries from colliding with user entries. */
function groupKey(conversationId: string): string {
  return `group:${conversationId}`;
}

/**
 * Drops a cached picture so the next render fetches it again.
 *
 * Called after the member changes their own, which would otherwise keep
 * showing the previous one until a full reload.
 */
export function forgetAvatar(userId: string): void {
  forget(userId);
}

/**
 * Drops a cached group picture so the next render fetches it again.
 *
 * Called after the owner changes it, and when the socket reports that someone
 * else did — otherwise the other members keep the old one until a reload.
 */
export function forgetGroupAvatar(conversationId: string): void {
  forget(groupKey(conversationId));
}

function forget(cacheKey: string): void {
  const url = urls.get(cacheKey);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(cacheKey);
  }
}
