import { Component, computed, input } from '@angular/core';

import { AppBadge } from '../app-badge/app-badge';

/** Semantic tone supported by the status badge. */
export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Configuration entry for a single status value. */
export interface StatusBadgeConfig {
  readonly label: string;
  readonly tone: StatusBadgeTone;
  readonly icon?: string;
}

/**
 * Reusable status badge that maps a status string to label, tone and icon.
 *
 * <p>Usage:</p>
 * ```html
 * <app-status-badge [status]="product.onlineStatus" [config]="PRODUCT_STATUS_BADGES" />
 * ```
 *
 * <p>The component renders an {@link AppBadge} internally and is fully
 * driven by the config map passed via the {@code config} input. This makes
 * it reusable across any domain that needs to visualise state: products,
 * orders, payments, cash sessions, stock levels, etc.</p>
 */
@Component({
  selector: 'app-status-badge',
  imports: [AppBadge],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  /** The current status string, e.g. ``'PUBLISHED'``. */
  readonly status = input.required<string>();

  /** A map of status values to badge configuration. */
  readonly config = input<Record<string, StatusBadgeConfig>>({});

  /** Derives the badge configuration for the current status, falling back to a neutral default. */
  protected readonly badge = computed(() => {
    const status = this.status();
    return (
      this.config()[status] ?? {
        label: status,
        tone: 'neutral' as StatusBadgeTone,
        icon: undefined,
      }
    );
  });
}
