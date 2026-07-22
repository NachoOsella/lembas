import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Compact, single-row filter bar for the report pages.
 *
 * <p>Matches the visual rhythm of the data-table toolbar (kicker + title
 * on the left, filters and actions on the right) so the filter sections
 * feel like a member of the same family. The bar is dense and fits inside
 * a single 56px row; the projected children fill the "fields" and
 * "actions" zones. Parents wire the inputs to their own signals.</p>
 *
 * <p>Layout:</p>
 * <pre>
 *   | caption / title | fields | actions |
 * </pre>
 *
 * <p>The optional {@link caption} shows a small kicker label on the left
 * ("Filtros", "Resumen", etc.). When omitted the bar still renders fine;
 * the zone simply collapses.</p>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-report-filter-bar',
  templateUrl: './app-report-filter-bar.html',
  styleUrl: './app-report-filter-bar.css',
})
export class AppReportFilterBar {
  /** Short kicker label shown on the left of the bar. Defaults to "Filtros". */
  readonly caption = input<string>('Filtros');
  /** Optional heading text shown below the kicker in a larger weight. */
  readonly title = input<string | null>(null);
  /** Optional descriptive copy under the kicker (shown when no title is set). */
  readonly description = input<string | null>(null);
}
