import { formatRelativeTime, formatFullDateTime } from '../../src/lib/format-time';

describe('format-time utility', () => {
  it('should return "Vừa xong" for timestamps less than 60 seconds ago', async () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Vừa xong');
  });

  it('should return relative minutes for recent timestamps', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinutesAgo)).toBe('10 phút trước');
  });

  it('should return relative hours for timestamps earlier today', async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 giờ trước');
  });

  it('should format full date time', async () => {
    const iso = '2026-09-21T08:30:00.000Z';
    const formatted = formatFullDateTime(iso);
    expect(formatted).toBeTruthy();
  });
});
