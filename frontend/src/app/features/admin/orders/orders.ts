import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import type { ConfirmDialogMode } from '@shared/components/confirm-dialog/confirm-dialog';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { AdminOrdersPageStore } from '@features/orders/public-api';
import { OrderFilters } from './ui/order-filters/order-filters';
import { OrderTable, type OrderQuickActionEvent } from './ui/order-table/order-table';
import type { OrderSummary } from '@features/orders/domain/order';
import { CANCEL_ORDER_ACTION, type OrderTransitionAction } from '@features/orders/public-api';

@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminOrdersPageStore],
  imports: [AppButton, AppPageHeader, ErrorAlert, ConfirmDialog, OrderFilters, OrderTable],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  protected readonly store = inject(AdminOrdersPageStore);
  private readonly router = inject(Router);

  protected readonly confirmVisible = signal(false);
  protected readonly confirmMode = signal<ConfirmDialogMode>('confirm');
  protected readonly pendingOrderId = signal<number | null>(null);
  protected readonly pendingAction = signal<
    OrderTransitionAction | typeof CANCEL_ORDER_ACTION | null
  >(null);
  protected readonly cancelReason = signal('');

  protected openQuickConfirm(event: OrderQuickActionEvent): void {
    this.pendingOrderId.set(event.order.id);
    this.pendingAction.set(event.action);
    this.confirmMode.set('confirm');
    this.confirmVisible.set(true);
  }

  protected openCancelConfirm(order: OrderSummary): void {
    this.cancelReason.set('');
    this.pendingOrderId.set(order.id);
    this.pendingAction.set(CANCEL_ORDER_ACTION);
    this.confirmMode.set('confirm-with-reason');
    this.confirmVisible.set(true);
  }

  protected cancelQuickConfirm(): void {
    this.confirmVisible.set(false);
    this.pendingAction.set(null);
    this.pendingOrderId.set(null);
    this.cancelReason.set('');
  }

  protected executeConfirmedAction(): void {
    const action = this.pendingAction();
    const orderId = this.pendingOrderId();
    if (!action || orderId === null) return;

    if (action.key === 'cancel') {
      const reason = this.cancelReason().trim();
      if (!reason) return;
      this.store.cancel(orderId, reason);
    } else {
      this.store.transition(orderId, action.key);
    }
    this.cancelQuickConfirm();
  }

  protected viewOrder(orderId: number): void {
    this.router.navigate(['/admin/orders', orderId]);
  }
}
