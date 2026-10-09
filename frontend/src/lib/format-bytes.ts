/**
 * Human-readable file sizes.
 *
 * Lives here rather than beside a component because two unrelated screens show
 * the size of the same uploaded file, and a component file that also exports a
 * helper stops hot reload from working.
 */

/**
 * Formats a byte count for a reader, in binary units.
 *
 * @param bytes size in bytes
 * @returns the size with its unit, such as `1.5 MB`
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
