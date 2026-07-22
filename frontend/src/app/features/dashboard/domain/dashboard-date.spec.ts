import { formatDashboardDate, parseDashboardDate } from './dashboard-date';

describe('dashboard date policy', () => {
  it('formats local dates without applying a UTC offset', () => {
    expect(formatDashboardDate(new Date(2026, 6, 13))).toBe('2026-07-13');
  });

  it('parses valid API dates as local dates', () => {
    const parsed = parseDashboardDate('2026-07-13');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(13);
  });

  it('falls back to today for invalid API dates', () => {
    const parsed = parseDashboardDate('2026-02-30');
    const today = new Date();

    expect(formatDashboardDate(parsed)).toBe(formatDashboardDate(today));
  });
});
