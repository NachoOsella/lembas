import { Component, input, output } from '@angular/core';

import { ProductSummary } from '../../models/product';
import { StoreProductCard } from '../store-product-card/store-product-card';

/** Emitted when the user clicks "add to cart" on a product card. */
export interface ProductGridAddToCartEvent {
  readonly product: ProductSummary;
  readonly quantity: number;
}

/**
 * Responsive product grid component for the public store.
 *
 * Renders a list of {@link ProductSummary} items inside a responsive CSS grid
 * (1 col mobile, 2 col sm, 3 col xl, 4 col 2xl) using {@link StoreProductCard}.
 */
@Component({
  selector: 'app-product-grid',
  imports: [StoreProductCard],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.css',
})
export class ProductGrid {
  /** Products to render in the grid. */
  readonly products = input.required<ProductSummary[]>();

  /** Optional extra CSS classes applied to the host element. */
  readonly gridClass = input('');

  /** Emitted when a card triggers "add to cart". */
  readonly addToCart = output<ProductGridAddToCartEvent>();
}
