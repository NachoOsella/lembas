import { Component, input } from '@angular/core';

/** Describes one compact metric shown in a reusable metric strip. */
export interface AppMetricItem {
  readonly label: string;
  readonly value: string | number;
  readonly detail?: string;
  readonly icon?: string;
  readonly tone?: 'forest' | 'amber' | 'ink' | 'sage';
}

/**
 * Reusable responsive strip for small dashboard metrics and page summaries.
 */
@Component({
  selector: 'app-metric-strip',
  templateUrl: './app-metric-strip.html',
  styleUrl: './app-metric-strip.css',
})
export class AppMetricStrip {
  readonly metrics = input.required<readonly AppMetricItem[]>();
}
