import { Component, ChangeDetectionStrategy } from '@angular/core';

import { Skeleton } from '@shared/components/skeleton/skeleton';

/**
 * Skeleton placeholder that mimics the layout of a {@link StoreProductCard}
 * while product data is loading. Renders animated placeholder blocks for
 * the image, text lines, and price.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-catalog-skeleton-card',
  imports: [Skeleton],
  templateUrl: './catalog-skeleton-card.html',
  styleUrl: './catalog-skeleton-card.css',
})
export class CatalogSkeletonCard {}
