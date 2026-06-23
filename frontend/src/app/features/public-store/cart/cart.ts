import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Cart, CartItem } from '../../../core/services/cart';
import { AuthService } from '../../../core/services/auth';
import { StoreBranchSelectionService } from '../../../core/services/store-branch-selection';
import { CurrencyArPipe } from '../../../core/pipes/currency-ar.pipe';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

/**
 * Public cart page accessible to all visitors.
 *
 * <p>Shows cart contents so customers can review their selections before
 * being asked to log in. Tapping "Finalizar compra" navigates to the
 * protected {@code /customer/checkout} where the auth guard intercepts
 * unauthenticated users and redirects them to login first.</p>
 */
@Component({
  selector: 'app-cart',
  imports: [CurrencyArPipe, AppButton, AppEyebrow, EmptyState],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export default class CartPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly cart = inject(Cart);
  protected readonly branchSelection = inject(StoreBranchSelectionService);

  /** Label shown for the selected pickup branch. */
  protected readonly branchLabel = computed(() => {
    const selected = this.branchSelection.selectedBranch();
    return selected?.name ?? 'Sucursal';
  });

  /** Whether the user is authenticated (controls the button wording). */
  protected readonly isLoggedIn = this.auth.isAuthenticated;

  /** Button label depends on auth state. */
  protected readonly checkoutLabel = computed(() =>
    this.isLoggedIn() ? 'Finalizar compra' : 'Iniciar sesion para comprar',
  );

  /** Whether there is a branch selected (needed before checking out). */
  protected readonly branchMissing = computed(
    () => !this.branchSelection.selectedBranchId(),
  );

  /** Removes a line from the cart. */
  protected removeItem(productId: number): void {
    this.cart.removeItem(productId);
  }

  /** Updates the quantity of a cart line. */
  protected updateQuantity(item: CartItem, quantity: number): void {
    this.cart.updateQuantity(item.productId, quantity);
  }

  /** Returns the minimum value for the quantity stepper. */
  protected minQuantity(): number {
    return 1;
  }

  /** Returns the maximum value for the quantity stepper. */
  protected maxQuantity(item: CartItem): number {
    return item.availableStock ? Math.max(1, item.availableStock) : 99;
  }

  /** Navigates to the protected checkout page (auth guard intercepts if needed). */
  protected goToCheckout(): void {
    this.router.navigate(['/customer/checkout']);
  }

  /** Navigates back to the catalog. */
  protected continueShopping(): void {
    this.router.navigate(['/store/products']);
  }
}
