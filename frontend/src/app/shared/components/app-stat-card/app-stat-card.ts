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
  selector: 'app-stat-card',
  templateUrl: './app-stat-card.html',
  styleUrl: './app-stat-card.css',
})
export class AppStatCard {
  readonly metrics = input.required<readonly AppMetricItem[]>();
}
