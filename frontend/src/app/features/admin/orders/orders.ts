import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminOrderService, CancelOrderRequest } from '../../../core/services/admin-order';
import { UserService } from '../../../core/services/user';
import { AuthService } from '../../../core/services/auth';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import {
  OrderStatus,
  OrderSummary,
  OrderType,
  orderStatusLabel,
  orderStatusSeverity,
} from '../../../shared/models/order';
import { Branch } from '../../../shared/models/user';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppInput } from '../../../shared/components/app-input/app-input';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../../shared/components/app-date-picker/app-date-picker';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import {
  StatusBadge,
  StatusBadgeConfig,
} from '../../../shared/components/status-badge/status-badge';
import {
  ConfirmDialog,
  ConfirmDialogMode,
} from '../../../shared/components/confirm-dialog/confirm-dialog';
import { CurrencyArPipe } from '../../../core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '../../../core/pipes/short-date-ar.pipe';

// ----------------------------------------------------------------
// Badge config
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
// Quick transition action descriptor
// ----------------------------------------------------------------
interface QuickAction {
  readonly key: 'prepare' | 'ready' | 'deliver' | 'cancel';
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  /** When true, renders the dialog in destructive style (red icon, danger button). */
  readonly destructive?: boolean;
  /** When true, the dialog requires a reason text. */
  readonly requiresReason?: boolean;
}

function quickActionForStatus(status: OrderStatus): QuickAction | null {
  switch (status) {
    case 'PAID':
      return {
        key: 'prepare',
        label: 'Preparar pedido',
        description: 'Pasara a estado Preparando.',
        icon: 'pi pi-play',
      };
    case 'PREPARING':
      return {
        key: 'ready',
        label: 'Marcar listo',
        description: 'El pedido quedara listo para retirar.',
        icon: 'pi pi-check',
      };
    case 'READY':
      return {
        key: 'deliver',
        label: 'Confirmar entrega',
        description: 'El cliente retiro el pedido en sucursal.',
        icon: 'pi pi-box',
      };
    default:
      return null;
  }
}

/** Quick action descriptor used by the row-level cancel button. */
const CANCEL_ROW_ACTION: QuickAction = {
  key: 'cancel',
  label: 'Cancelar pedido',
  description:
    'Esta accion no se puede deshacer. Si hay stock descontado, sera devuelto a los lotes originales y los pagos quedaran como cancelados.',
  icon: 'pi pi-times-circle',
  destructive: true,
  requiresReason: true,
};

/** Statuses that disallow row-level cancellation. */
const NON_CANCELLABLE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'DELIVERED',
  'CANCELLED',
]);

@Component({
  selector: 'app-orders',
  imports: [
    AppButton,
    AppDataTable,
    AppInput,
    AppPageHeader,
    AppSelect,
    AppDatePicker,
    ErrorAlert,
    StatusBadge,
    ConfirmDialog,
    CurrencyArPipe,
    ShortDateArPipe,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
/** Admin orders list with filters, sorting, pagination and quick state transitions. */
export class Orders {
  private readonly adminOrderService = inject(AdminOrderService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  // -- Table data -------------------------------------------------------------
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  // -- Filters ----------------------------------------------------------------
  protected readonly statusFilter = signal<OrderStatus | null>(null);
  protected readonly typeFilter = signal<OrderType | null>(null);
  protected readonly selectedBranchId = signal<number | null>(null);
  protected readonly dateFrom = signal<Date | null>(null);
  protected readonly dateTo = signal<Date | null>(null);
  protected readonly searchQuery = signal<string>('');
  protected readonly branches = signal<Branch[]>([]);

  /** Effective role of the current user (ADMIN can see any branch; others are
   *  restricted server-side, and locked in the UI to their own branch). */
  protected readonly currentRole = computed(() => this.authService.getUserRole());
  /** True when the current user is not ADMIN (and therefore restricted to one branch). */
  protected readonly isBranchRestricted = computed(
    () => this.currentRole() !== null && this.currentRole() !== 'ADMIN',
  );

  // -- Lazy pagination + sorting ----------------------------------------------
  protected readonly first = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal<number | undefined>(undefined);

  // -- Confirm dialog state (for quick row transitions) -----------------------
  protected readonly confirmVisible = signal(false);
  protected readonly confirmMode = signal<ConfirmDialogMode>('confirm');
  protected readonly pendingOrderId = signal<number | null>(null);
  protected readonly pendingAction = signal<QuickAction | null>(null);
  protected readonly actionLoading = signal<'prepare' | 'ready' | 'deliver' | 'cancel' | null>(
    null,
  );
  /** Reason text bound to the confirm dialog's two-way model in confirm-with-reason mode. */
  protected readonly cancelReason = signal('');

  // -- Column definition ------------------------------------------------------
  protected readonly columns: ColumnDef[] = [
    { field: 'orderNumber', header: 'Pedido', sortable: true },
    { field: 'customerName', header: 'Cliente', sortable: true },
    { field: 'status', header: 'Estado', sortable: true, width: '13rem' },
    { field: 'branchName', header: 'Sucursal', sortable: true },
    { field: 'total', header: 'Total', sortable: true, width: '8rem' },
    { field: 'createdAt', header: 'Fecha', sortable: true, width: '10rem' },
    { field: 'actions', header: '', sortable: false, width: '11rem' },
  ];

  // -- Filter options ---------------------------------------------------------
  protected readonly statusOptions = [
    { label: 'Todos los estados', value: null },
    ...(
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
    ).map((s) => ({ label: orderStatusLabel(s), value: s })),
  ];

  protected readonly typeOptions = [
    { label: 'Todos los tipos', value: null },
    { label: 'Online', value: 'ONLINE' as OrderType },
    { label: 'POS', value: 'POS' as OrderType },
  ];

  protected readonly branchOptions = computed(() => [
    { label: 'Todas las sucursales', value: null },
    ...this.branches().map((b) => ({ label: b.name, value: b.id })),
  ]);

  protected readonly statusBadges = ORDER_STATUS_BADGES;

  // -- Quick action helpers ---------------------------------------------------
  /** Returns the quick action descriptor for an ONLINE order with a valid next transition. */
  protected quickActionFor(order: OrderSummary): QuickAction | null {
    if (order.type !== 'ONLINE') return null;
    return quickActionForStatus(order.status);
  }

  /** Whether the row-level cancel button should be shown for a non-terminal order. */
  protected canCancel(order: OrderSummary): boolean {
    return !NON_CANCELLABLE_STATUSES.has(order.status);
  }

  /** Type chip label. */
  protected typeLabel(type: OrderType): string {
    return type === 'ONLINE' ? 'Online' : 'POS';
  }

  /** Whether the order is of ONLINE type. */
  protected isOnline(order: OrderSummary): boolean {
    return order.type === 'ONLINE';
  }

  constructor() {
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.autosetBranchForCurrentUser();
    this.loadOrders();
  }

  /**
   * Locks the branch filter to the current user's assigned branch when the
   * user is not an ADMIN. The backend enforces the same restriction server-
   * side; this method only keeps the UI in sync and prevents the user from
   * trying to query other branches.
   */
  private autosetBranchForCurrentUser(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    if (user.role === 'ADMIN' || user.role === 'CUSTOMER') return;
    if (user.branchId != null) {
      this.selectedBranchId.set(user.branchId);
    }
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  /** Reloads the orders list with the current filters. */
  public loadOrders(): void {
    this.loading.set(true);
    this.error.set('');
    const page = Math.floor(this.first() / this.pageSize());
    this.adminOrderService
      .listOrders({
        status: this.statusFilter() ?? undefined,
        branchId: this.selectedBranchId() ?? undefined,
        type: this.typeFilter() ?? undefined,
        from: this.formatDateParam(this.dateFrom()),
        to: this.formatDateParam(this.dateTo()),
        search: this.normalizedSearch(),
        page,
        size: this.pageSize(),
        sort: this.buildSortParam(),
      })
      .subscribe({
        next: (response) => {
          this.orders.set(response.content);
          this.totalRecords.set(response.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.messageForError(err, 'No pudimos cargar los pedidos.'));
          this.loading.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Quick transition flow
  // ---------------------------------------------------------------------------

  /** Opens the confirmation dialog for a quick table-row transition. */
  protected openQuickConfirm(order: OrderSummary, action: QuickAction): void {
    this.pendingOrderId.set(order.id);
    this.pendingAction.set(action);
    this.confirmMode.set('confirm');
    this.confirmVisible.set(true);
  }

  /** Opens the confirm dialog in confirm-with-reason mode for a row-level cancellation. */
  protected openCancelConfirm(order: OrderSummary, event: Event): void {
    event.stopPropagation();
    this.cancelReason.set('');
    this.pendingOrderId.set(order.id);
    this.pendingAction.set(CANCEL_ROW_ACTION);
    this.confirmMode.set('confirm-with-reason');
    this.confirmVisible.set(true);
  }

  /** Cancels the quick confirm dialog. */
  protected cancelQuickConfirm(): void {
    this.confirmVisible.set(false);
    this.pendingAction.set(null);
    this.pendingOrderId.set(null);
    this.cancelReason.set('');
  }

  /** Dispatches the confirmed action: either a state transition or a cancellation. */
  protected executeConfirmedAction(): void {
    const action = this.pendingAction();
    if (!action) return;
    if (action.key === 'cancel') {
      this.executeCancel();
    } else {
      this.executeQuickTransition();
    }
  }

  /** Executes the confirmed quick transition. */
  protected executeQuickTransition(): void {
    const action = this.pendingAction();
    const orderId = this.pendingOrderId();
    if (!action || !orderId) return;

    this.confirmVisible.set(false);
    this.actionLoading.set(action.key);

    const call = (() => {
      switch (action.key) {
        case 'prepare':
          return this.adminOrderService.prepare(orderId);
        case 'ready':
          return this.adminOrderService.markReady(orderId);
        case 'deliver':
          return this.adminOrderService.deliver(orderId);
        default:
          return null;
      }
    })();

    if (!call) {
      this.actionLoading.set(null);
      this.pendingAction.set(null);
      this.pendingOrderId.set(null);
      return;
    }

    call.subscribe({
      next: (updated) => {
        this.actionLoading.set(null);
        this.pendingAction.set(null);
        this.pendingOrderId.set(null);
        this.loadOrders();
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `${updated.orderNumber} ahora esta en ${orderStatusLabel(updated.status)}.`,
          life: 3500,
        });
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.pendingAction.set(null);
        this.pendingOrderId.set(null);
        const apiError = getApiError(err);
        const detail = apiError
          ? this.errorMapping.getMessage(apiError.code, apiError.message)
          : 'No se pudo completar la accion.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
          life: 5000,
        });
      },
    });
  }

  /** Executes the confirmed row-level cancellation. */
  protected executeCancel(): void {
    const orderId = this.pendingOrderId();
    if (!orderId) return;
    const reason = this.cancelReason().trim();
    if (reason.length === 0) {
      // The dialog itself blocks the confirm emission; this is a safety net.
      return;
    }
    this.confirmVisible.set(false);
    this.actionLoading.set('cancel');
    const body: CancelOrderRequest = { reason };
    this.adminOrderService.cancel(orderId, body).subscribe({
      next: (updated) => {
        this.actionLoading.set(null);
        this.pendingAction.set(null);
        this.pendingOrderId.set(null);
        this.cancelReason.set('');
        this.loadOrders();
        this.messageService.add({
          severity: 'success',
          summary: 'Pedido cancelado',
          detail: `Pedido ${updated.orderNumber} cancelado correctamente.`,
          life: 4000,
        });
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.pendingAction.set(null);
        this.pendingOrderId.set(null);
        this.cancelReason.set('');
        const apiError = getApiError(err);
        const detail = apiError
          ? this.errorMapping.getMessage(apiError.code, apiError.message)
          : 'No se pudo cancelar el pedido.';
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo cancelar',
          detail,
          life: 6000,
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Filter handlers
  // ---------------------------------------------------------------------------

  protected onStatusChange(value: unknown): void {
    this.statusFilter.set((value as OrderStatus) ?? null);
    this.first.set(0);
    this.loadOrders();
  }

  protected onTypeChange(value: unknown): void {
    this.typeFilter.set((value as OrderType) ?? null);
    this.first.set(0);
    this.loadOrders();
  }

  protected onBranchChange(value: number | null): void {
    // For non-ADMIN users the branch is forced to their own and the dropdown
    // is disabled, but the value can still be set programmatically via clear.
    if (this.isBranchRestricted() && value !== this.authService.currentUser()?.branchId) {
      return;
    }
    this.selectedBranchId.set(value);
    this.first.set(0);
    this.loadOrders();
  }

  protected onDateFromChange(date: Date | null): void {
    this.dateFrom.set(date);
    this.first.set(0);
    this.loadOrders();
  }

  protected onDateToChange(date: Date | null): void {
    this.dateTo.set(date);
    this.first.set(0);
    this.loadOrders();
  }

  /** Updates the search query and reloads. Trimmed; empty input clears the filter. */
  protected onSearchChange(value: string | null): void {
    this.searchQuery.set((value ?? '').trim());
    this.first.set(0);
    this.loadOrders();
  }

  /** Clears the search input and reloads. */
  protected onSearchClear(): void {
    this.searchQuery.set('');
    this.first.set(0);
    this.loadOrders();
  }

  /** Clears all filters and reloads. */
  protected clearFilters(): void {
    this.statusFilter.set(null);
    this.typeFilter.set(null);
    // Branch is left as-is when restricted; only ADMIN clears it.
    if (!this.isBranchRestricted()) {
      this.selectedBranchId.set(null);
    }
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.searchQuery.set('');
    this.first.set(0);
    this.loadOrders();
  }

  // ---------------------------------------------------------------------------
  // Pagination + Sorting
  // ---------------------------------------------------------------------------

  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadOrders();
  }

  protected onSort(event: { field: string; order: number }): void {
    this.first.set(0);
    if (this.sortField() === event.field && this.sortOrder() === event.order) {
      this.sortField.set(undefined);
      this.sortOrder.set(undefined);
    } else {
      this.sortField.set(event.field);
      this.sortOrder.set(event.order);
    }
    this.loadOrders();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  protected viewOrder(order: OrderSummary): void {
    this.router.navigate(['/admin/orders', order.id]);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildSortParam(): string | undefined {
    const field = this.sortField();
    const order = this.sortOrder();
    if (!field || order == null || ![1, -1].includes(order)) return undefined;
    return `${field},${order === 1 ? 'asc' : 'desc'}`;
  }

  private formatDateParam(date: Date | null): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Returns the trimmed search query or undefined when empty (server ignores undefined). */
  private normalizedSearch(): string | undefined {
    const q = this.searchQuery().trim();
    return q.length === 0 ? undefined : q;
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }
}
