import { Injectable, computed, signal } from '@angular/core';

/** A line in the POS cart. */
export interface PosCartLine {
  readonly productId: number;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

/**
 * In-memory cart store for the POS sale flow.
 *
 * <p>The cart is intentionally ephemeral: a POS sale is only persisted when
 * the cashier confirms payment (see S3-US10, LEMBAS-54). This service owns
 * the line aggregation and exposes derived totals via signals.</p>
 *
 * <p>Quantity management, removal and clear helpers are added here so that
 * the upcoming US10 implementation can wire up the UI without re-plumbing
 * the state container.</p>
 */
@Injectable({ providedIn: 'root' })
export class PosCartStore {
  private readonly _lines = signal<PosCartLine[]>([]);

  /** Read-only view of the cart lines in insertion order. */
  readonly lines = this._lines.asReadonly();

  /** Sum of {@code unitPrice * quantity} across all lines. */
  readonly total = computed(() =>
    this._lines().reduce(
      (acc, line) => acc + line.unitPrice * line.quantity,
      0,
    ),
  );

  /** Total number of units across all lines. */
  readonly itemCount = computed(() =>
    this._lines().reduce((acc, line) => acc + line.quantity, 0),
  );

  /**
   * Adds an item to the cart.
   *
   * <p>If a line with the same {@code productId} exists, its quantity is
   * incremented. Otherwise a new line with {@code quantity = 1} is appended.</p>
   */
  addItem(input: { productId: number; name: string; unitPrice: number }): void {
    this._lines.update((lines) => {
      const existingIndex = lines.findIndex(
        (line) => line.productId === input.productId,
      );
      if (existingIndex >= 0) {
        const copy = [...lines];
        const existing = copy[existingIndex];
        copy[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
        return copy;
      }
      return [
        ...lines,
        { productId: input.productId, name: input.name, unitPrice: input.unitPrice, quantity: 1 },
      ];
    });
  }

  /** Removes a line from the cart. */
  removeLine(productId: number): void {
    this._lines.update((lines) => lines.filter((line) => line.productId !== productId));
  }

  /** Clears the cart. */
  clear(): void {
    this._lines.set([]);
  }
}
