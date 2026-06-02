import { Injectable, computed, signal } from '@angular/core';

import { ProductSummary } from '../../shared/models/product';

/** Represents an item in the shopping cart. */
export interface CartItem {
  readonly product: ProductSummary;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class Cart {
  private readonly items = signal<Map<number, CartItem>>(new Map());

  /** Total number of items in the cart (sum of all quantities). */
  readonly totalItems = computed(() => {
    let total = 0;
    this.items().forEach((item) => (total += item.quantity));
    return total;
  });

  /** Adds a product to the cart or increases its quantity if already present. */
  addItem(product: ProductSummary, quantity: number = 1): void {
    const currentItems = this.items();
    const existing = currentItems.get(product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      currentItems.set(product.id, { product, quantity });
    }

    // Trigger reactivity by creating a new Map
    this.items.set(new Map(currentItems));
  }

  /** Returns all items in the cart as an array. */
  getItems(): CartItem[] {
    return Array.from(this.items().values());
  }

  /** Removes a product from the cart. */
  removeItem(productId: number): void {
    const currentItems = this.items();
    currentItems.delete(productId);
    this.items.set(new Map(currentItems));
  }

  /** Clears all items from the cart. */
  clear(): void {
    this.items.set(new Map());
  }
}
