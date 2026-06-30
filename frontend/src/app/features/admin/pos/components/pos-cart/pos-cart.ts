import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { PaymentMethod } from '../../../../../shared/models/order';
import { PosCartLine, PosCartStore } from '../../state/pos-cart.store';

import { AppBadge } from '../../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../../shared/components/app-button/app-button';
import { AppInputNumber } from '../../../../../shared/components/app-input-number/app-input-number';
import { AppSectionCard } from '../../../../../shared/components/app-section-card/app-section-card';
import { EmptyState } from '../../../../../shared/components/empty-state/empty-state';

import { PosPaymentSelectorComponent } from '../pos-payment-selector/pos-payment-selector';

/**
 * POS cart panel: list of cart lines with inline quantity editor, the
 * payment-method selector, optional cash-received capture for CASH
 * payments, and the primary "Cobrar" action.
 *
 * <p>Selection state for the payment method and the cash received lives
 * inside the component. The parent observes these via the public
 * {@code selectedMethod} and {@code cashReceived} read-only signals and
 * drives the actual sale through the {@code checkoutRequested} output.</p>
 */
@Component({
  selector: 'app-pos-cart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppBadge,
    AppButton,
    AppInputNumber,
    AppSectionCard,
    EmptyState,
    PosPaymentSelectorComponent,
  ],
  templateUrl: './pos-cart.html',
  styleUrl: './pos-cart.css',
})
export class PosCartComponent {
  protected readonly cart = inject(PosCartStore);

  /** True while the parent is processing a sale. Disables the checkout CTA. */
  readonly processing = input(false);

  /**
   * Whether the parent is in a state that allows charging (cart not empty
   * AND a cash session is open). When false, the "Cobrar" button stays
   * disabled regardless of the local selection.
   */
  readonly canCheckout = input(false);

  /**
   * Emitted when the user clicks "Cobrar" (or hits F8 upstream). The parent
   * is responsible for invoking the sale endpoint and reacting to the
   * response.
   */
  readonly checkoutRequested = output<void>();

  protected readonly lines = this.cart.lines;
  protected readonly total = this.cart.total;
  protected readonly itemCount = this.cart.itemCount;
  protected readonly hasLines = computed(() => this.cart.lines().length > 0);

  protected readonly selectedMethod = signal<PaymentMethod | null>(null);
  protected readonly cashReceived = signal<number | null>(null);

  /** CASH requires the cashier to enter how much was received. */
  protected readonly requiresCash = computed(
    () => this.selectedMethod() === 'CASH',
  );

  /** Cash short: entered amount is below the total. */
  protected readonly cashShort = computed(() => {
    const entered = this.cashReceived();
    if (entered == null) {
      return null;
    }
    const diff = this.cart.total() - entered;
    return diff > 0 ? diff : null;
  });

  /** Cash change: entered amount exceeds the total. */
  protected readonly cashChange = computed(() => {
    const entered = this.cashReceived();
    if (entered == null) {
      return null;
    }
    const diff = entered - this.cart.total();
    return diff > 0 ? diff : null;
  });

  protected readonly canConfirmCheckout = computed(() => {
    if (this.processing() || !this.canCheckout()) {
      return false;
    }
    if (!this.selectedMethod()) {
      return false;
    }
    if (this.requiresCash()) {
      const entered = this.cashReceived();
      if (entered == null || entered < this.cart.total()) {
        return false;
      }
    }
    return true;
  });

  /** Subtotal formatted with the es-AR currency style. */
  protected totalFormatted(): string {
    return this.formatCurrency(this.cart.total());
  }

  protected lineSubtotalFormatted(line: PosCartLine): string {
    return this.formatCurrency(line.unitPrice * line.quantity);
  }

  protected unitPriceFormatted(line: PosCartLine): string {
    return this.formatCurrency(line.unitPrice);
  }

  protected onQuantityChange(productId: number, value: number | null): void {
    this.cart.setQuantity(productId, value ?? 0);
  }

  protected onCheckout(): void {
    if (this.canConfirmCheckout()) {
      this.checkoutRequested.emit();
    }
  }

  protected onClearCart(): void {
    this.cart.clear();
    this.resetSelection();
  }

  /** Clears the local payment-method and cash-received state. */
  resetSelection(): void {
    this.selectedMethod.set(null);
    this.cashReceived.set(null);
  }

  /**
   * Returns the current selection. Public so the parent page can read it
   * via {@code viewChild} when the cashier presses the checkout button
   * (or the F8 shortcut).
   */
  getSelection(): { paymentMethod: PaymentMethod | null; cashReceived: number | null } {
    return {
      paymentMethod: this.selectedMethod(),
      cashReceived: this.cashReceived(),
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
