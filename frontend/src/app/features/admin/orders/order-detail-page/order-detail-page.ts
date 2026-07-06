import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminOrderService } from '../../../../core/services/admin-order';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import {
  OrderDetail,
  OrderStatus,
  orderStatusLabel,
  orderStatusSeverity,
  paymentStatusLabel,
  paymentStatusSeverity,
} from '../../../../shared/models/order';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppSectionCard } from '../../../../shared/components/app-section-card/app-section-card';
import {
  StatusBadge,
  StatusBadgeConfig,
} from '../../../../shared/components/status-badge/status-badge';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { CurrencyArPipe } from '../../../../core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '../../../../core/pipes/short-date-ar.pipe';

// ----------------------------------------------------------------
// Transition action descriptors
// ----------------------------------------------------------------
interface TransitionAction {
  readonly key: 'prepare' | 'ready' | 'deliver';
  readonly label: string;
  readonly description: string;
  readonly confirmTitle: string;
  readonly confirmMessage: string;
  readonly icon: string;
}

const PREPARE_ACTION: TransitionAction = {
  key: 'prepare',
  label: 'Preparar pedido',
  description: 'Marcar como preparando',
  confirmTitle: 'Iniciar preparacion',
  confirmMessage: 'El pedido pasara a estado Preparando. Los productos se comenzaran a reunir para el retiro.',
  icon: 'pi pi-play',
};

const READY_ACTION: TransitionAction = {
  key: 'ready',
  label: 'Marcar como listo',
  description: 'Listo para retirar',
  confirmTitle: 'Marcar como listo para retirar',
  confirmMessage: 'El pedido quedara marcado como Listo para retirar. El cliente podra pasar por la sucursal.',
  icon: 'pi pi-check',
};

const DELIVER_ACTION: TransitionAction = {
  key: 'deliver',
  label: 'Confirmar entrega',
  description: 'Entregar al cliente',
  confirmTitle: 'Confirmar entrega al cliente',
  confirmMessage: 'Confirmas que el cliente ya retiro el pedido en la sucursal? El pedido quedara como Entregado.',
  icon: 'pi pi-box',
};

/** Maps the current ONLINE order status to its available transition action. */
function transitionForStatus(status: OrderStatus): TransitionAction | null {
  switch (status) {
    case 'PAID':
      return PREPARE_ACTION;
    case 'PREPARING':
      return READY_ACTION;
    case 'READY':
      return DELIVER_ACTION;
    default:
      return null;
  }
}

// ----------------------------------------------------------------
// Order status badge config
// ----------------------------------------------------------------
const ORDER_STATUS_BADGES: Record<string, StatusBadgeConfig> = Object.fromEntries(
  (
    [
      'PENDING_PAYMENT',
      'PAID',
      'PREPARING',
      'READY',
      'DELIVERED',
      'CANCELLED',
      'PAYMENT_FAILED',
      'STOCK_CONFLICT',
    ] as OrderStatus[]
  ).map((s) => {
    const primeSeverity = orderStatusSeverity(s);
    let tone: StatusBadgeConfig['tone'];
    if (primeSeverity === 'secondary') tone = 'neutral';
    else if (primeSeverity === 'warn') tone = 'warning';
    else tone = primeSeverity as StatusBadgeConfig['tone'];
    return [s, { label: orderStatusLabel(s), tone }];
  }),
);

// ----------------------------------------------------------------
// Timeline step descriptor
// ----------------------------------------------------------------
interface TimelineStep {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly timestamp: string | null;
  readonly state: 'completed' | 'active' | 'pending' | 'cancelled';
}

// ----------------------------------------------------------------
// Payment status badge config
// ----------------------------------------------------------------
const PAYMENT_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  PENDING: { label: paymentStatusLabel('PENDING'), tone: 'info' },
  APPROVED: { label: paymentStatusLabel('APPROVED'), tone: 'success' },
  REJECTED: { label: paymentStatusLabel('REJECTED'), tone: 'danger' },
  CANCELLED: { label: paymentStatusLabel('CANCELLED'), tone: 'neutral' },
  REFUNDED: { label: paymentStatusLabel('REFUNDED'), tone: 'warning' },
  EXPIRED: { label: paymentStatusLabel('EXPIRED'), tone: 'neutral' },
  IN_PROCESS: { label: paymentStatusLabel('IN_PROCESS'), tone: 'info' },
};

@Component({
  selector: 'app-order-detail-page',
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
  ],
  templateUrl: './order-detail-page.html',
  styleUrl: './order-detail-page.css',
})
/** Admin page showing full order detail with timeline, items, payments, and transition actions. */
export class OrderDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminOrderService = inject(AdminOrderService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  // -- Data state -------------------------------------------------------------
  protected readonly order = signal<OrderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  // -- Transition action state ------------------------------------------------
  protected readonly actionLoading = signal<'prepare' | 'ready' | 'deliver' | null>(null);

  // -- Confirm dialog state ---------------------------------------------------
  protected readonly confirmVisible = signal(false);
  protected readonly pendingAction = signal<TransitionAction | null>(null);

  // -- Badge configs ----------------------------------------------------------
  protected readonly statusBadges = ORDER_STATUS_BADGES;
  protected readonly paymentStatusBadges = PAYMENT_STATUS_BADGES;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadOrder(Number(idParam));
    } else {
      this.error.set('No se especifico un ID de pedido.');
      this.loading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  private loadOrder(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.adminOrderService.getOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.messageForError(err, 'No pudimos cargar el pedido.'));
        this.loading.set(false);
      },
    });
  }

  /** Public reload — bound to the retry button on errors. */
  protected retry(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadOrder(Number(idParam));
    }
  }

  // ---------------------------------------------------------------------------
  // Transition logic
  // ---------------------------------------------------------------------------

  /** The next valid transition action for this ONLINE order, or null. */
  protected availableTransition(): TransitionAction | null {
    const o = this.order();
    if (!o || o.type !== 'ONLINE') return null;
    return transitionForStatus(o.status);
  }

  /** Opens the confirmation dialog for the next transition. */
  protected openConfirm(action: TransitionAction): void {
    this.pendingAction.set(action);
    this.confirmVisible.set(true);
  }

  /** Cancels the confirmation dialog. */
  protected cancelConfirm(): void {
    this.confirmVisible.set(false);
    this.pendingAction.set(null);
  }

  /** Executes the confirmed transition via the API. */
  protected executeTransition(): void {
    const action = this.pendingAction();
    const order = this.order();
    if (!action || !order) return;

    this.confirmVisible.set(false);
    this.actionLoading.set(action.key);

    const call = (() => {
      switch (action.key) {
        case 'prepare':
          return this.adminOrderService.prepare(order.id);
        case 'ready':
          return this.adminOrderService.markReady(order.id);
        case 'deliver':
          return this.adminOrderService.deliver(order.id);
      }
    })();

    call.subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.actionLoading.set(null);
        this.pendingAction.set(null);
        const statusLabel = orderStatusLabel(updatedOrder.status);
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El pedido ahora esta en estado "${statusLabel}".`,
          life: 3500,
        });
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.pendingAction.set(null);
        const apiError = getApiError(err);
        const detail = apiError
          ? this.errorMapping.getMessage(apiError.code, apiError.message)
          : 'No se pudo completar la accion. Intenta nuevamente.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
          life: 5000,
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------------

  /** Builds the timeline steps from the order's status timestamps. */
  protected buildTimeline(): TimelineStep[] {
    const o = this.order();
    if (!o) return [];

    const isCancelled = o.status === 'CANCELLED';
    const hasPaid = o.paidAt != null || isAfterStatus(o.status, 'PAID');
    const hasPreparing = o.preparedAt != null || isAfterStatus(o.status, 'PREPARING');
    const hasReady = o.readyAt != null || isAfterStatus(o.status, 'READY');
    const hasDelivered = o.deliveredAt != null;

    const baseSteps: TimelineStep[] = [
      {
        key: 'created',
        label: 'Pedido creado',
        description: 'El cliente completo la orden.',
        timestamp: o.createdAt,
        state: 'completed',
      },
      {
        key: 'paid',
        label: 'Pago confirmado',
        description: 'Mercado Pago aprobo el cobro.',
        timestamp: o.paidAt,
        state: hasPaid ? 'completed' : 'pending',
      },
      {
        key: 'preparing',
        label: 'En preparacion',
        description: 'Reunimos los productos en la sucursal.',
        timestamp: o.preparedAt,
        state: hasPreparing ? 'completed' : o.status === 'PAID' ? 'active' : 'pending',
      },
      {
        key: 'ready',
        label: 'Listo para retirar',
        description: 'Avisamos al cliente para que pase a buscar.',
        timestamp: o.readyAt,
        state: hasReady ? 'completed' : o.status === 'PREPARING' ? 'active' : 'pending',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        description: 'El cliente retiro el pedido en la sucursal.',
        timestamp: o.deliveredAt,
        state: hasDelivered ? 'completed' : o.status === 'READY' ? 'active' : 'pending',
      },
    ];

    if (isCancelled && o.cancelledAt) {
      baseSteps.push({
        key: 'cancelled',
        label: 'Cancelado',
        description: o.cancellationReason ?? 'Pedido cancelado.',
        timestamp: o.cancelledAt,
        state: 'cancelled',
      });
    }

    return baseSteps;
  }

  /** Whether the order is of ONLINE type (preparation flow applies). */
  protected isOnline(): boolean {
    return this.order()?.type === 'ONLINE';
  }

  /** Whether the order is in a completed terminal state. */
  protected isDelivered(): boolean {
    return this.order()?.status === 'DELIVERED';
  }

  /** Whether the order is waiting for a payment confirmation. */
  protected isAwaitingPayment(): boolean {
    const s = this.order()?.status;
    return s === 'PENDING_PAYMENT' || s === 'PAYMENT_FAILED' || s === 'STOCK_CONFLICT';
  }

  /** Title prefix based on the order type. */
  protected typeLabel(): string {
    const t = this.order()?.type;
    return t === 'ONLINE' ? 'Online' : t === 'POS' ? 'POS' : 'Pedido';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  protected formatPaymentMethod(method: string): string {
    const map: Record<string, string> = {
      CHECKOUT_PRO: 'Mercado Pago',
      CASH: 'Efectivo',
      QR: 'QR',
      TRANSFER: 'Transferencia',
      DEBIT_CARD: 'Debito',
      CREDIT_CARD: 'Credito',
      OTHER: 'Otro',
    };
    return map[method] ?? method;
  }

  protected paymentStatusLabel(s: string): string {
    return paymentStatusLabel(s as Parameters<typeof paymentStatusLabel>[0]);
  }

  protected paymentSeverityToTone(s: string): StatusBadgeConfig['tone'] {
    const sev = paymentStatusSeverity(s as Parameters<typeof paymentStatusSeverity>[0]);
    if (sev === 'secondary') return 'neutral';
    if (sev === 'warn') return 'warning';
    return sev as StatusBadgeConfig['tone'];
  }

  protected paymentBadge(status: string): StatusBadgeConfig {
    return (
      this.paymentStatusBadges[status] ?? {
        label: status,
        tone: 'neutral' as const,
      }
    );
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }
}

// ----------------------------------------------------------------
// Utility
// ----------------------------------------------------------------

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAYMENT_FAILED: 1,
  STOCK_CONFLICT: 2,
  PAID: 3,
  PREPARING: 4,
  READY: 5,
  DELIVERED: 6,
  CANCELLED: 7,
};

function isAfterStatus(current: OrderStatus, reference: OrderStatus): boolean {
  // Linear progress only: ignores CANCELLED, PAYMENT_FAILED, STOCK_CONFLICT
  // which are branches on the state machine, not forward progress.
  return (STATUS_ORDER[current] ?? -1) > (STATUS_ORDER[reference] ?? -1);
}
