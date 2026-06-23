import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../core/services/auth';
import { Cart, CartItem } from '../../../core/services/cart';
import { CurrencyArPipe } from '../../../core/pipes/currency-ar.pipe';
import { CustomerCheckoutService } from '../../../core/services/customer-checkout';
import { CustomerOrderService, OrderCreated } from '../../../core/services/customer-order';
import { StoreBranchSelectionService } from '../../../core/services/store-branch-selection';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { QuantityStepper } from '../../../shared/components/quantity-stepper/quantity-stepper';

@Component({
  selector: 'app-checkout',
  imports: [RouterLink, AppButton, AppEyebrow, EmptyState, ErrorAlert, QuantityStepper, CurrencyArPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(Cart);
  private readonly customerOrderService = inject(CustomerOrderService);
  private readonly customerCheckout = inject(CustomerCheckoutService);
  protected readonly branchSelection = inject(StoreBranchSelectionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** Customer display info from the authenticated session. */
  protected readonly customerName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    const first = user.firstName ?? '';
    const last = user.lastName ?? '';
    const full = (first + ' ' + last).trim();
    return full || user.email;
  });

  protected readonly customerEmail = computed(() => this.auth.currentUser()?.email ?? '');

  protected readonly submitting = signal(false);
  protected readonly errorCode = signal<string | null>(null);
  protected readonly createdOrder = signal<OrderCreated | null>(null);

  /** Current selected pickup branch label for the order summary. */
  protected readonly branchLabel = computed(() => {
    const branch = this.branchSelection.selectedBranch();
    if (!branch) return 'Sin sucursal seleccionada';
    return branch.address ? `${branch.name} - ${branch.address}` : branch.name;
  });

  /** Human-readable error for controlled backend/API failures. */
  protected readonly errorMessage = computed(() => {
    const code = this.errorCode();
    if (code === 'INSUFFICIENT_STOCK') {
      return 'Algún producto ya no tiene stock suficiente. Revisá cantidades o cambiá de sucursal.';
    }
    if (code === 'PRODUCT_NOT_FOUND' || code === 'PRODUCT_NOT_PUBLISHED') {
      return 'Algún producto del carrito ya no está disponible para compra online.';
    }
    if (code === 'BRANCH_NOT_FOUND') {
      return 'Seleccioná una sucursal de retiro válida antes de confirmar.';
    }
    if (code === 'ACCESS_DENIED') {
      return 'Necesitás iniciar sesión como cliente para confirmar el pedido.';
    }
    return code ? 'No pudimos crear el pedido. Intentá nuevamente en unos segundos.' : null;
  });

  /** Whether the user data is available for display. */
  protected readonly hasCustomerData = computed(() => this.auth.currentUser() != null);

  /** True while creating a preference to redirect the customer to MP. */
  protected readonly redirecting = signal(false);

  /** Whether there is no branch selected to fulfill the order. */
  protected readonly branchMissing = computed(
    () => this.branchSelection.selectedBranchId() == null,
  );

  /** Returns the maximum quantity allowed for an item based on known stock. */
  protected maxQuantity(item: CartItem): number {
    return item.availableStock != null ? Math.max(1, Math.floor(item.availableStock)) : 99;
  }

  /** Updates the local cart quantity for a line. */
  protected updateQuantity(item: CartItem, quantity: number): void {
    this.cart.updateQuantity(item.productId, quantity);
  }

  /** Removes one line from the local cart. */
  protected removeItem(productId: number): void {
    this.cart.removeItem(productId);
  }

  /** Creates the pending order and clears the cart so the customer can start a new one. */
  protected createOrder(): void {
    if (this.branchMissing() || this.cart.isEmpty()) {
      this.errorCode.set(this.branchMissing() ? 'BRANCH_NOT_FOUND' : 'EMPTY_CART');
      return;
    }

    this.submitting.set(true);
    this.errorCode.set(null);

    this.customerOrderService
      .createOrder({
        branchId: this.branchSelection.selectedBranchId()!,
        items: this.cart.items().map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
      .subscribe({
        next: (order) => {
          this.createdOrder.set(order);
          this.cart.clearCart();
          this.submitting.set(false);
          this.toast.add({
            severity: 'success',
            summary: 'Pedido creado',
            detail: `Pedido ${order.orderNumber} listo para pagar.`,
            life: 4000,
          });
        },
        error: (error) => {
          this.errorCode.set(error?.error?.code ?? 'UNKNOWN');
          this.submitting.set(false);
        },
      });
  }

  /**
   * Creates a Checkout Pro preference for the order and redirects the customer
   * to the Mercado Pago hosted checkout. Stores the order id in sessionStorage
   * so the payment callback can retrieve it after the redirect.
   */
  protected goToPayment(): void {
    const order = this.createdOrder();
    if (!order) return;

    this.redirecting.set(true);
    this.errorCode.set(null);

    this.customerCheckout.createPreference(order.id).subscribe({
      next: (preference) => {
        sessionStorage.setItem('pendingOrderId', String(order.id));
        window.location.href = preference.initPoint;
      },
      error: (error) => {
        this.errorCode.set(error?.error?.code ?? 'PAYMENT_PREFERENCE_FAILED');
        this.redirecting.set(false);
      },
    });
  }

  /** Navigates back to the catalog while preserving the local cart. */
  protected continueShopping(): void {
    this.router.navigate(['/store/products']);
  }
}
