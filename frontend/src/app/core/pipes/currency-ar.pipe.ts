import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

/**
 * Formats a numeric value as Argentine Pesos with no fractional digits.
 *
 * <p>Centralised so the public store, checkout, order detail, and payment
 * callback render the same currency format. Rounding to whole pesos keeps the
 * UI consistent with the rest of the catalog (no decimals anywhere).</p>
 *
 * <p>Strings are accepted because the backend serialises {@code BigDecimal}
 * fields as JSON strings; the pipe parses them with the same locale rules
 * used by the rest of the app (comma as the decimal separator, dot as the
 * thousands separator).</p>
 */
@Pipe({ name: 'currencyAr', standalone: true })
export class CurrencyArPipe implements PipeTransform {
  private static readonly FORMATTER = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  transform(value: number | string | null | undefined): string {
    if (value == null || value === '') {
      return '—';
    }
    const numeric = typeof value === 'number' ? value : this.parseDecimal(value);
    if (!Number.isFinite(numeric)) {
      return '—';
    }
    return CurrencyArPipe.FORMATTER.format(numeric);
  }

  /**
   * Parses an AR-formatted decimal string (e.g. {@code "1234.56"} or
   * {@code "1234,56"}). The backend uses the Java BigDecimal string format
   * which always uses a dot; we still accept commas for safety.
   */
  private parseDecimal(value: string): number {
    const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
}
