import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a numeric value as Argentine Pesos with no fractional digits.
 *
 * <p>Centralised so the public store, checkout, order detail, and payment
 * callback render the same currency format. Rounding to whole pesos keeps the
 * UI consistent with the rest of the catalog (no decimals anywhere).</p>
 */
@Pipe({ name: 'currencyAr', standalone: true })
export class CurrencyArPipe implements PipeTransform {
  private static readonly FORMATTER = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  transform(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return CurrencyArPipe.FORMATTER.format(value);
  }
}
