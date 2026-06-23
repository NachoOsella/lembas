import { CurrencyArPipe } from './currency-ar.pipe';

describe('CurrencyArPipe', () => {
  const pipe = new CurrencyArPipe();

  it('formats an integer value as Argentine Pesos without decimals', () => {
    // The exact whitespace between $ and the digits depends on the runtime's
    // Intl implementation (some use NBSP). We only assert the visible
    // components -- currency symbol, thousands separator, and amount.
    expect(pipe.transform(1500)).toMatch(/\$\s*1\.500/);
  });

  it('rounds decimal values to whole pesos', () => {
    expect(pipe.transform(1500.6)).toMatch(/\$\s*1\.501/);
    expect(pipe.transform(1500.4)).toMatch(/\$\s*1\.500/);
  });

  it('returns the placeholder for null and undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('returns the placeholder for NaN', () => {
    expect(pipe.transform(Number.NaN)).toBe('—');
  });

  it('formats zero', () => {
    expect(pipe.transform(0)).toMatch(/\$\s*0/);
  });
});
