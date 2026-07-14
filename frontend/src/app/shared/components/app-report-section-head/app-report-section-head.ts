import { Component, input } from '@angular/core';

/**
 * Polished section header for the new report pages.
 *
 * <p>Mirrors the visual rhythm of the data-table toolbar (kicker + title)
 * so the section headers do not feel like a different family. The
 * leading icon is opt-in: the vast majority of sections do not need it
 * and the report hubs intentionally skip it to keep the visual cadence
 * quiet. Pass {@link icon} to add a small leading glyph.</p>
 */
@Component({
  selector: 'app-report-section-head',
  templateUrl: './app-report-section-head.html',
  styleUrl: './app-report-section-head.css',
})
export class AppReportSectionHead {
  /** Optional leading icon. Default is no icon. */
  readonly icon = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
