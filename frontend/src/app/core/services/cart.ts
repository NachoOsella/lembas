import { Injectable, computed, signal } from '@angular/core';

import { ProductSummary } from '../../shared/models/product';

/** Serializable cart item persisted in browser localStorage. */
export interface CartItem {
  readonly productId: number;
  readonly name: string;
  readonly price: number;
  readonly imageUrl?: string;
  readonly availableStock?: number;
  readonly quantity: number;
}

const STORAGE_KEY = 'lembas_cart';

@Injectable({ providedIn: 'root' })
export class Cart {
  private readonly cartItems = signal<CartItem[]>(this.readStoredItems());

  /** Read-only cart items signal for components. */
  readonly items = this.cartItems.asReadonly();

  /** Total number of units in the cart. */
  readonly totalItems = computed(() => this.cartItems().reduce((sum, item) => sum + item.quantity, 0));

  /** Total amount for all cart lines. */
  readonly total = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  /** True when there are no cart lines. */
  readonly isEmpty = computed(() => this.cartItems().length === 0);

  /** Adds a product or increases its quantity, bounded by known stock when available. */
  addItem(product: ProductSummary, quantity = 1): void {
    const normalizedQuantity = this.normalizeQuantity(quantity);
    this.cartItems.update((items) => {
      const existing = items.find((item) => item.productId === product.id);
      if (!existing) {
        return this.persist([
          ...items,
          this.toCartItem(product, this.capQuantity(normalizedQuantity, product.availableStock)),
        ]);
      }

      return this.persist(
        items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: this.capQuantity(item.quantity + normalizedQuantity, product.availableStock),
                availableStock: product.availableStock,
              }
            : item,
        ),
      );
    });
  }

  /** Updates a cart line quantity, removing the line when quantity is zero. */
  updateQuantity(productId: number, quantity: number): void {
    const normalizedQuantity = Math.floor(Number(quantity));
    if (normalizedQuantity <= 0) {
      this.removeItem(productId);
      return;
    }

    this.cartItems.update((items) =>
      this.persist(
        items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: this.capQuantity(normalizedQuantity, item.availableStock) }
            : item,
        ),
      ),
    );
  }

  /** Removes one product from the cart. */
  removeItem(productId: number): void {
    this.cartItems.update((items) => this.persist(items.filter((item) => item.productId !== productId)));
  }

  /** Clears the complete cart. */
  clearCart(): void {
    this.cartItems.set(this.persist([]));
  }

  /** Backwards-compatible alias used by existing callers. */
  clear(): void {
    this.clearCart();
  }

  /** Backwards-compatible snapshot getter. */
  getItems(): CartItem[] {
    return this.cartItems();
  }

  /** Returns the current line total for a product. */
  lineTotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  /** Converts a product card DTO into a cart DTO. */
  private toCartItem(product: ProductSummary, quantity: number): CartItem {
    return {
      productId: product.id,
      name: product.name,
      price: product.salePrice,
      imageUrl: product.imageUrl,
      availableStock: product.availableStock,
      quantity,
    };
  }

  /** Keeps quantities as positive whole units for the storefront cart. */
  private normalizeQuantity(quantity: number): number {
    return Math.max(1, Math.floor(Number(quantity) || 1));
  }

  /** Prevents local cart quantities from exceeding known branch stock. */
  private capQuantity(quantity: number, availableStock?: number): number {
    if (availableStock == null) {
      return quantity;
    }
    return Math.max(0, Math.min(quantity, Math.floor(availableStock)));
  }

  /** Persists new state and returns the same state for signal update chaining. */
  private persist(items: CartItem[]): CartItem[] {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    return items;
  }

  /** Loads persisted cart lines, discarding malformed data safely. */
  private readStoredItems(): CartItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed) ? parsed.filter((item) => item.productId && item.quantity > 0) : [];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }
}
