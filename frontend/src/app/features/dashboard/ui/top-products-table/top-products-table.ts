import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { AppBadge } from '@shared/components/app-badge/app-badge';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import type { TopProductDto } from '@features/dashboard/domain/dashboard';

/**
 * Compact "top products" table for the operational dashboard.
 *
 * <p>Each row combines a position chip, the product name with a thumbnail,
 * its category, brand, barcode, the sold quantity, the total revenue and
 * the average price per unit. The template follows the same row hover
 * affordance used by the rest of the data tables in the admin shell.</p>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-top-products-table',
  imports: [CurrencyArPipe, Skeleton, AppBadge, EmptyState],
  templateUrl: './top-products-table.html',
  styleUrl: './top-products-table.css',
})
export class TopProductsTable {
  readonly products = input.required<TopProductDto[]>();
  readonly loading = input(false);
  readonly title = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);

  /** True when there is at least one product to display. */
  readonly hasData = computed(() => this.products().length > 0);

  /** Returns a fallback URL when the product has no image. */
  protected placeholderImage(): string {
    return '';
  }

  /** Builds the initials shown in the avatar when no image is available. */
  initials(name: string): string {
    if (!name) {
      return '?';
    }
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
