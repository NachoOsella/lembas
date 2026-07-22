import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import type { PaymentMethod } from '@features/orders/domain/order';

/** UI metadata for one selectable payment method. */
interface PaymentMethodOption {
  readonly value: Exclude<PaymentMethod, 'CHECKOUT_PRO'>;
  readonly label: string;
  readonly icon: string;
}

/** POS-eligible payment methods. Excludes CHECKOUT_PRO (online) and OTHER. */
const METHOD_OPTIONS: ReadonlyArray<PaymentMethodOption> = [
  { value: 'CASH', label: 'Efectivo', icon: 'pi pi-money-bill' },
  { value: 'QR', label: 'QR', icon: 'pi pi-qrcode' },
  { value: 'TRANSFER', label: 'Transferencia', icon: 'pi pi-receipt' },
  { value: 'DEBIT_CARD', label: 'Debito', icon: 'pi pi-credit-card' },
  { value: 'CREDIT_CARD', label: 'Credito', icon: 'pi pi-credit-card' },
];

/**
 * POS payment-method selector.
 *
 * <p>Renders the five POS-eligible payment methods (CASH, QR, TRANSFER,
 * DEBIT_CARD, CREDIT_CARD) as a horizontal row of radio-pill buttons.
 * Excludes {@code CHECKOUT_PRO} and {@code OTHER} because the cashier
 * terminal does not handle hosted online checkout or the generic fallback.</p>
 */
@Component({
  selector: 'app-pos-payment-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-payment-selector.html',
  styleUrl: './pos-payment-selector.css',
})
export class PosPaymentSelectorComponent {
  /** Two-way bound selection. */
  readonly value = model<PaymentMethod | null>(null);

  /** Disables every option (e.g. while the parent is processing the sale). */
  readonly disabled = input(false);

  /** Read-only view of the option list for the template. */
  protected readonly options = METHOD_OPTIONS;

  protected selectMethod(method: PaymentMethod): void {
    if (this.disabled()) {
      return;
    }
    this.value.set(method);
  }

  protected isActive(method: PaymentMethod): boolean {
    return this.value() === method;
  }
}
