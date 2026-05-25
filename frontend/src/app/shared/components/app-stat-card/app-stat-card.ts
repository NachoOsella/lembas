import { Component, input } from '@angular/core';

/**
 * Lembas-styled stat card for dashboards and summary sections.
 * Displays a metric value, label, and optional trend indicator.
 */
@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './app-stat-card.html',
  styleUrl: './app-stat-card.css',
})
export class AppStatCard {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly trend = input<'up' | 'down' | 'neutral'>('neutral');
  readonly trendValue = input<string>('');
  readonly tone = input<'surface' | 'muted' | 'dark'>('surface');
}
