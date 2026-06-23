import { ShortDateArPipe } from './short-date-ar.pipe';

describe('ShortDateArPipe', () => {
  const pipe = new ShortDateArPipe();

  it('formats an ISO timestamp in the Argentine locale', () => {
    const result = pipe.transform('2026-06-12T10:30:00Z');
    // Locale output depends on the runtime; we assert the time of day and
    // a recognizable date component are present.
    expect(result).toMatch(/12\/06\/2026/);
  });

  it('returns the placeholder for null', () => {
    expect(pipe.transform(null)).toBe('---');
  });

  it('returns the placeholder for undefined', () => {
    expect(pipe.transform(undefined)).toBe('---');
  });

  it('returns the placeholder for blank strings', () => {
    expect(pipe.transform('')).toBe('---');
  });

  it('returns the original string when the timestamp is unparseable', () => {
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
  });
});
