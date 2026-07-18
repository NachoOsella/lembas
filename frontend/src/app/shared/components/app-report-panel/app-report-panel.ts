import { Component, input } from '@angular/core';

/** Semantic surface styles available for report panels. */
export type ReportPanelTone = 'surface' | 'muted' | 'warning';

/** Reusable report panel with an optional heading, actions, and projected content. */
@Component({
  selector: 'app-report-panel',
  templateUrl: './app-report-panel.html',
  styleUrl: './app-report-panel.css',
})
export class AppReportPanel {
  /** Optional contextual label shown above the title. */
  readonly eyebrow = input<string | null>(null);

  /** Panel heading. */
  readonly title = input<string | null>(null);

  /** Concise explanation of the contained report data. */
  readonly description = input<string | null>(null);

  /** Controls the panel surface treatment. */
  readonly tone = input<ReportPanelTone>('surface');
}
