import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import type { OrderDetail, PaymentMethod } from '@features/orders/domain/order';
import { AppBadge } from '@shared/components/app-badge/app-badge';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppModal } from '@shared/components/app-modal/app-modal';

const MAX_ITEMS_DISPLAYED = 5;

/** Human label for each payment method shown in the receipt. */
const METHOD_LABEL: Record<PaymentMethod, string> = {
  CHECKOUT_PRO: 'Mercado Pago',
  CASH: 'Efectivo',
  QR: 'QR',
  TRANSFER: 'Transferencia',
  DEBIT_CARD: 'Tarjeta de debito',
  CREDIT_CARD: 'Tarjeta de credito',
  OTHER: 'Otro',
};

/**
 * Receipt dialog shown after a successful POS sale.
 *
 * <p>Surfaces the order number, total, payment method, and a truncated
 * list of items. Two actions: "Nueva venta" (emits {@code newSale}) and
 * the default close action.</p>
 */
@Component({
  selector: 'app-pos-checkout-result-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppBadge, AppButton, AppModal],
  templateUrl: './pos-checkout-result-dialog.html',
  styleUrl: './pos-checkout-result-dialog.css',
})
export class PosCheckoutResultDialogComponent {
  readonly visible = model(false);
  readonly order = input.required<OrderDetail>();

  readonly newSale = output<void>();
  readonly hidden = output<void>();

  /** First N items to show, with the remainder collapsed. */
  protected readonly visibleItems = computed(() => {
    const items = this.order().items ?? [];
    return items.slice(0, MAX_ITEMS_DISPLAYED);
  });

  protected readonly overflow = computed(() => {
    const total = (this.order().items ?? []).length;
    return Math.max(0, total - MAX_ITEMS_DISPLAYED);
  });

  protected readonly paymentMethod = computed<PaymentMethod | null>(() => {
    const payment = this.order().payments?.[0];
    return payment?.method ?? null;
  });

  protected paymentMethodLabel(): string {
    const method = this.paymentMethod();
    return method ? METHOD_LABEL[method] : 'Sin metodo';
  }

  protected totalFormatted(): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(this.order().total);
  }

  protected lineSubtotalFormatted(unitPrice: number, quantity: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(unitPrice * quantity);
  }

  protected onNewSale(): void {
    this.newSale.emit();
  }
}
