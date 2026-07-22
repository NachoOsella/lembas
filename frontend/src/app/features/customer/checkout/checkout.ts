import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '@core/services/auth';
import type { CartItem } from '@features/checkout/public-api';
import { Cart } from '@features/checkout/public-api';
import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { CustomerCheckoutService } from '@features/checkout/data-access/customer-checkout';
import type { OrderCreated } from '@features/orders/data-access/customer-order';
import { CustomerOrderService } from '@features/orders/data-access/customer-order';
import { StoreBranchSelectionService } from '@features/branches/public-api';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppEyebrow } from '@shared/components/app-eyebrow/app-eyebrow';
import { AppSelect } from '@shared/components/app-select/app-select';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { getApiError } from '@shared/types/api-error';
import { QuantityStepper } from '@shared/components/quantity-stepper/quantity-stepper';

@Component({
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppButton,
    AppEyebrow,
    AppSelect,
    EmptyState,
    ErrorAlert,
    QuantityStepper,
    CurrencyArPipe,
  ],
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

  /** Options for changing the pickup branch before order confirmation. */
  protected readonly branchOptions = computed(() =>
    this.branchSelection.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );

  /** Updates the pickup branch without leaving checkout. */
  protected onBranchChange(branchId: number | null): void {
    this.branchSelection.selectBranch(branchId);
  }

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

    const branchId = this.branchSelection.selectedBranchId();
    if (branchId === null) {
      this.errorCode.set('BRANCH_NOT_FOUND');
      this.submitting.set(false);
      return;
    }

    this.customerOrderService
      .createOrder({
        branchId,
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
          this.errorCode.set(getCheckoutErrorCode(error));
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
        this.errorCode.set(getCheckoutErrorCode(error, 'PAYMENT_PREFERENCE_FAILED'));
        this.redirecting.set(false);
      },
    });
  }

  /** Navigates back to the catalog while preserving the local cart. */
  protected continueShopping(): void {
    this.router.navigate(['/store/products']);
  }
}

function getCheckoutErrorCode(error: unknown, fallback = 'UNKNOWN'): string {
  const apiError = getApiError(error);
  if (apiError) return apiError.code;

  if (typeof error !== 'object' || error === null || !('error' in error)) {
    return fallback;
  }
  const payload = error.error;
  if (typeof payload !== 'object' || payload === null || !('code' in payload)) {
    return fallback;
  }
  return typeof payload.code === 'string' && payload.code.length > 0 ? payload.code : fallback;
}
