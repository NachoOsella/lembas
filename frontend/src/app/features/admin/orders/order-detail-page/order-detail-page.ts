import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ConfirmDialogMode } from '@shared/components/confirm-dialog/confirm-dialog';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSectionCard } from '@shared/components/app-section-card/app-section-card';
import { StatusBadge } from '@shared/components/status-badge/status-badge';
import {
  CANCEL_ORDER_ACTION,
  ORDER_STATUS_BADGES,
  buildAdminOrderTimeline,
  canCancelOrder,
  orderTransitionForStatus,
  paymentMethodLabel,
  paymentStatusBadges,
  type OrderCancelAction,
  type OrderTransitionAction,
} from '@features/orders/public-api';
import type { OrderStatus, PaymentStatus } from '@features/orders/domain/order';
import { orderStatusLabel } from '@features/orders/domain/order';
import { AdminOrderDetailStore } from '@features/orders/public-api';
import { OrderDetailTimeline } from '../ui/order-detail-timeline/order-detail-timeline';

@Component({
  selector: 'app-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminOrderDetailStore],
  imports: [
    AppButton,
    AppPageHeader,
    AppSectionCard,
    StatusBadge,
    ConfirmDialog,
    LoadingSpinner,
    ErrorAlert,
    CurrencyArPipe,
    ShortDateArPipe,
    RouterLink,
    OrderDetailTimeline,
  ],
  templateUrl: './order-detail-page.html',
  styleUrl: './order-detail-page.css',
})
export class OrderDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(AdminOrderDetailStore);

  protected readonly order = this.store.order;
  protected readonly loading = this.store.loading;
  protected readonly actionLoading = this.store.actionLoading;
  protected readonly statusBadges = ORDER_STATUS_BADGES;
  protected readonly paymentStatusBadges = paymentStatusBadges();
  protected readonly confirmVisible = signal(false);
  protected readonly confirmMode = signal<ConfirmDialogMode>('confirm');
  protected readonly pendingAction = signal<OrderTransitionAction | OrderCancelAction | null>(null);
  protected readonly cancelReason = signal('');
  private readonly invalidRoute = signal('');
  protected readonly error = computed(() => this.invalidRoute() || this.store.error());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const parsedId = id === null ? NaN : Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      this.invalidRoute.set('No se especifico un ID de pedido.');
      return;
    }
    this.store.load(parsedId);
  }

  protected retry(): void {
    const id = this.store.orderId();
    if (id !== null) this.store.load(id);
  }

  protected availableTransition(): OrderTransitionAction | null {
    const order = this.order();
    return order?.type === 'ONLINE' ? orderTransitionForStatus(order.status) : null;
  }

  protected isCancellable(): boolean {
    const status = this.order()?.status;
    return status !== undefined && canCancelOrder(status);
  }

  protected openCancelConfirm(): void {
    this.cancelReason.set('');
    this.pendingAction.set(CANCEL_ORDER_ACTION);
    this.confirmMode.set('confirm-with-reason');
    this.confirmVisible.set(true);
  }

  protected openConfirm(action: OrderTransitionAction): void {
    this.pendingAction.set(action);
    this.confirmMode.set('confirm');
    this.confirmVisible.set(true);
  }

  protected cancelConfirm(): void {
    this.confirmVisible.set(false);
    this.pendingAction.set(null);
    this.cancelReason.set('');
  }

  protected executeConfirmedAction(): void {
    const action = this.pendingAction();
    if (!action) return;
    if (action.key === 'cancel') {
      this.store.cancel(this.cancelReason());
    } else {
      this.store.transition(action.key);
    }
    this.cancelConfirm();
  }

  protected buildTimeline() {
    const order = this.order();
    return order ? buildAdminOrderTimeline(order) : [];
  }

  protected isOnline(): boolean {
    return this.order()?.type === 'ONLINE';
  }

  protected isDelivered(): boolean {
    return this.order()?.status === 'DELIVERED';
  }

  protected isAwaitingPayment(): boolean {
    const status = this.order()?.status;
    return (
      status === 'PENDING_PAYMENT' || status === 'PAYMENT_FAILED' || status === 'STOCK_CONFLICT'
    );
  }

  protected typeLabel(): string {
    const type = this.order()?.type;
    return type === 'ONLINE' ? 'Online' : type === 'POS' ? 'POS' : 'Pedido';
  }

  protected orderStatusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  protected paymentBadge(status: PaymentStatus) {
    return this.paymentStatusBadges[status];
  }

  protected formatPaymentMethod(method: string): string {
    return paymentMethodLabel(method);
  }
}
