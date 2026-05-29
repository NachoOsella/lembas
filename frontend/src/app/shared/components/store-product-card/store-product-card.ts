import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProductSummary } from '../../models/product';

/** Visual density options for public store product cards. */
export type StoreProductCardDensity = 'regular' | 'compact';

/** Event emitted when the user clicks "add to cart" on a product card. */
export interface StoreProductCardAddToCartEvent {
  readonly product: ProductSummary;
  readonly quantity: number;
}

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

  /** Emitted when the user clicks the "add to cart" button. */
  readonly addToCart = output<StoreProductCardAddToCartEvent>();

  /** Detail route for the current product. */
  protected readonly productRoute = computed(() => ['/store/product', this.product().id]);

  /** Accessible label for the card link. */
  protected readonly detailLabel = computed(() => `Ver detalle de ${this.product().name}`);

  /** Whether the compact visual density is enabled. */
  protected readonly isCompact = computed(() => this.density() === 'compact');

  /** Whether the product has stock available (availableStock > 0 or undefined). */
  protected readonly hasStock = computed(() => {
    const stock = this.product().availableStock;
    return stock == null || stock > 0;
  });

  /** Whether the product is out of stock (explicitly 0). */
  protected readonly isOutOfStock = computed(() => this.product().availableStock === 0);

  /** Handles the add-to-cart button click without navigating to the detail page. */
  protected onAddToCartClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.addToCart.emit({ product: this.product(), quantity: 1 });
  }
}
