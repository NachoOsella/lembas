import { Component, input } from '@angular/core';

/**
 * Visual tone that controls the card's background wash, border tint,
 * and decorative blob colour. Each maps to a Lembas palette role.
 */
export type MetricTone = 'forest' | 'amber' | 'sage';

/**
 * Trend direction that determines value colour and arrow badge.
 * - `'up'`      -> value in Lembas Leaf Green, up arrow
 * - `'down'`    -> value in Lembas Red, down arrow
 * - `'neutral'` -> value in muted grey, no arrow
 */
export type MetricTrend = 'up' | 'down' | 'neutral';

/**
 * Describes one compact metric shown in the reusable metric strip.
 */
export interface AppMetricItem {
  /** Primary label — displayed in uppercase, tight-tracked. */
  readonly label: string;
  /** Numeric or formatted value — displayed prominently. */
  readonly value: string | number;
  /** Optional secondary detail line beneath the value. */
  readonly detail?: string;
  /** PrimeIcons class for the leading icon circle (e.g. 'pi-shopping-cart'). */
  readonly icon?: string;
  /** Visual tone — defaults to 'forest' (Lembas Leaf Green wash). */
  readonly tone?: MetricTone;
  /** Trend direction — controls value colour and shows an arrow badge. */
  readonly trend?: MetricTrend;
}

@Component({
  selector: 'app-stat-card',
  templateUrl: './app-stat-card.html',
  styleUrl: './app-stat-card.css',
})
export class AppStatCard {
  readonly metrics = input.required<readonly AppMetricItem[]>();
}
