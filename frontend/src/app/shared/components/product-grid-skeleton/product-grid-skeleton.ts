import { Component, computed, input } from '@angular/core';

import { CatalogSkeletonCard } from '../catalog-skeleton-card/catalog-skeleton-card';

/**
 * Skeleton loading placeholder for the product grid.
 * Renders a configurable number of {@link CatalogSkeletonCard} items
 * in the same responsive grid layout used by {@link ProductGrid}.
 */
@Component({
  selector: 'app-product-grid-skeleton',
  imports: [CatalogSkeletonCard],
  templateUrl: './product-grid-skeleton.html',
  styleUrl: './product-grid-skeleton.css',
})
export class ProductGridSkeleton {
  /** Number of skeleton cards to render. Defaults to 8. */
  readonly count = input(8);

  /** Array of the correct length for @for iteration. */
  protected readonly skeletonItems = computed(() => Array.from({ length: this.count() }));
}
