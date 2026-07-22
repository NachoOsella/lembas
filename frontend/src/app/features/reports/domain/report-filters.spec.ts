import {
  currentMonthRange,
  parseReportId,
  toReportIsoDate,
  trailingDaysRange,
} from './report-filters';

describe('report filters', () => {
  it('serializes local calendar dates without applying a timezone shift', () => {
    const date = new Date(2026, 6, 18, 23, 45);

    expect(toReportIsoDate(date)).toBe('2026-07-18');
    expect(toReportIsoDate(null)).toBeNull();
  });

  it('creates the current month range from the supplied calendar date', () => {
    const range = currentMonthRange(new Date(2026, 6, 18, 12));

    expect(toReportIsoDate(range.from)).toBe('2026-07-01');
    expect(toReportIsoDate(range.to)).toBe('2026-07-18');
  });

  it('creates an inclusive trailing range', () => {
    const range = trailingDaysRange(7, new Date(2026, 6, 18, 12));

    expect(toReportIsoDate(range.from)).toBe('2026-07-12');
    expect(toReportIsoDate(range.to)).toBe('2026-07-18');
  });

  it('accepts only positive integer report identifiers', () => {
    expect(parseReportId('42')).toBe(42);
    expect(parseReportId('0')).toBeNull();
    expect(parseReportId('4.2')).toBeNull();
    expect(parseReportId('42abc')).toBeNull();
    expect(parseReportId(null)).toBeNull();
  });
});
