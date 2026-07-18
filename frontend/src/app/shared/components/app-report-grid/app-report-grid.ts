import { Component, computed, input, ViewEncapsulation } from '@angular/core';

/** Defines the responsive composition used to group report content. */
export type ReportGridLayout = 'metrics' | 'balanced' | 'emphasis' | 'single';

/** Shared responsive report surface that groups related metrics, charts, or detail panels. */
@Component({
  selector: 'app-report-grid',
  templateUrl: './app-report-grid.html',
  styleUrl: './app-report-grid.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'hostClass()',
  },
})
export class AppReportGrid {
  /** Selects the column composition and responsive collapse behavior. */
  readonly layout = input<ReportGridLayout>('balanced');

  protected readonly hostClass = computed(() => `report-grid report-grid--${this.layout()}`);
}
