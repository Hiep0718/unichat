/**
 * Formats an ISO-8601 timestamp into Vietnamese relative time.
 * Pure function — no external dependencies.
 *
 * @param isoString ISO-8601 date string from the server
 * @returns human-readable Vietnamese relative time string
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return 'Vừa xong';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Vừa xong';
  }

  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  if (days === 1) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `Hôm qua, ${hh}:${mm}`;
  }

  if (days < 7) {
    return `${days} ngày trước`;
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} tuần trước`;
  }

  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mo}/${yyyy}`;
}
