import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProductSummary } from '../../models/product';

/** Visual density options for public store product cards. */
export type StoreProductCardDensity = 'regular' | 'compact';

@Component({
  selector: 'app-store-product-card',
  imports: [NgClass, RouterLink],
  templateUrl: './store-product-card.html',
  styleUrl: './store-product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreProductCard {
  /** Product summary to render. */
  readonly product = input.required<ProductSummary>();

  /** Card density for different surfaces, such as catalog grids or carousels. */
  readonly density = input<StoreProductCardDensity>('regular');

  /** Extra classes applied to the host article for layout-specific sizing. */
  readonly cardClass = input('');

  /** Detail route for the current product. */
  protected readonly productRoute = computed(() => ['/store/product', this.product().id]);

  /** Accessible label for the card link. */
  protected readonly detailLabel = computed(() => `Ver detalle de ${this.product().name}`);

  /** Whether the compact visual density is enabled. */
  protected readonly isCompact = computed(() => this.density() === 'compact');
}
