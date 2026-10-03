/**
 * Blob URLs for group cover pictures, shared across the page.
 *
 * The cover endpoint needs a bearer token, which `<img src>` cannot send, so
 * each picture is fetched as a blob. The same group appears both in "Truy cập
 * nhanh" and in the full list below it, which would otherwise fetch the same
 * picture twice; this keeps one request per group, and one in-flight promise
 * per group so simultaneous mounts do not race.
 *
 * Mirrors {@link ../../../components/avatar-image-cache} deliberately — same
 * problem, same shape, so neither has a surprise the other lacks.
 */
import { fetchBlob } from '../../../lib/api-client';

const urls = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Resolves a group's cover to a blob URL.
 *
 * @returns the URL, or null when the group has none or it could not be read
 */
export function loadCover(workspaceId: string): Promise<string | null> {
  const cached = urls.get(workspaceId);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = inFlight.get(workspaceId);
  if (pending) {
    return pending;
  }

  const request = fetchBlob(`/workspaces/${workspaceId}/cover`)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      urls.set(workspaceId, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(workspaceId);
    });

  inFlight.set(workspaceId, request);
  return request;
}

/**
 * Drops a cached cover so the next render fetches it again.
 *
 * Called after an owner changes one, which would otherwise keep showing the
 * previous picture until a full reload.
 */
export function forgetCover(workspaceId: string): void {
  const url = urls.get(workspaceId);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(workspaceId);
  }
}
