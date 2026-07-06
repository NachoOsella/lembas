import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminOrderService } from '../../../core/services/admin-order';
import { UserService } from '../../../core/services/user';
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
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../../shared/components/app-date-picker/app-date-picker';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import {
  StatusBadge,
  StatusBadgeConfig,
} from '../../../shared/components/status-badge/status-badge';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
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
  readonly key: 'prepare' | 'ready' | 'deliver';
  readonly label: string;
  readonly description: string;
  readonly icon: string;
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

@Component({
  selector: 'app-orders',
  imports: [
    AppButton,
    AppDataTable,
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
  protected readonly branches = signal<Branch[]>([]);

  // -- Lazy pagination + sorting ----------------------------------------------
  protected readonly first = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal<number | undefined>(undefined);

  // -- Confirm dialog state (for quick row transitions) -----------------------
  protected readonly confirmVisible = signal(false);
  protected readonly pendingOrderId = signal<number | null>(null);
  protected readonly pendingAction = signal<QuickAction | null>(null);
  protected readonly actionLoading = signal<'prepare' | 'ready' | 'deliver' | null>(null);

  // -- Column definition ------------------------------------------------------
  protected readonly columns: ColumnDef[] = [
    { field: 'orderNumber', header: 'Pedido', sortable: true },
    { field: 'customerName', header: 'Cliente', sortable: true },
    { field: 'status', header: 'Estado', sortable: true, width: '13rem' },
    { field: 'branchName', header: 'Sucursal', sortable: true },
    { field: 'total', header: 'Total', sortable: true, width: '8rem' },
    { field: 'createdAt', header: 'Fecha', sortable: true, width: '10rem' },
    { field: 'actions', header: '', sortable: false, width: '9rem' },
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
    this.loadOrders();
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
    this.confirmVisible.set(true);
  }

  /** Cancels the quick confirm dialog. */
  protected cancelQuickConfirm(): void {
    this.confirmVisible.set(false);
    this.pendingAction.set(null);
    this.pendingOrderId.set(null);
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
      }
    })();

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

  /** Clears all filters and reloads. */
  protected clearFilters(): void {
    this.statusFilter.set(null);
    this.typeFilter.set(null);
    this.selectedBranchId.set(null);
    this.dateFrom.set(null);
    this.dateTo.set(null);
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

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }
}
