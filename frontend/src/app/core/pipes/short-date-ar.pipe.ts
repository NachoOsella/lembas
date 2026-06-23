import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats an ISO timestamp as a short date/time in the Argentine locale.
 *
 * <p>Returns a neutral placeholder ({@code ---}) when the input is null,
 * blank, or unparseable so templates do not need to guard against missing
 * timestamps before invoking the pipe.</p>
 */
@Pipe({ name: 'shortDateAr', standalone: true })
export class ShortDateArPipe implements PipeTransform {
  private static readonly FORMATTER = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  transform(value: string | null | undefined): string {
    if (!value) {
      return '---';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return ShortDateArPipe.FORMATTER.format(date);
  }
}
