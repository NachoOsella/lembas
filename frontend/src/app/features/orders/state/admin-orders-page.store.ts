import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import type { Observable } from 'rxjs';

import { AuthService } from '@core/services/auth';
import { ErrorMappingService } from '@core/services/error-mapping';
import { AdminOrderService } from '@features/orders/data-access/admin-order';
import {
  EMPTY_ADMIN_ORDER_FILTERS,
  DEFAULT_ADMIN_ORDER_TABLE,
  type AdminOrderFilters,
  type AdminOrdersQuery,
  type AdminOrderTableState,
  toAdminOrdersQuery,
} from '@features/orders/domain/order-query';
import type {
  OrderDetail,
  OrderStatus,
  OrderSummary,
  OrderType,
} from '@features/orders/domain/order';
import type { OrderTransitionKey } from '@features/orders/domain/order-presentation';
import type { Branch } from '@features/users/domain/user';
import { UserService } from '@features/users/data-access/user';
import type { PageResponse } from '@shared/types/page';
import { getApiError } from '@shared/types/api-error';

export type AdminOrderAction = OrderTransitionKey | 'cancel';

@Injectable()
export class AdminOrdersPageStore {
  private readonly adminOrderService = inject(AdminOrderService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<AdminOrdersQuery>();

  private readonly filtersState = signal<AdminOrderFilters>(EMPTY_ADMIN_ORDER_FILTERS);
  private readonly tableState = signal<AdminOrderTableState>(DEFAULT_ADMIN_ORDER_TABLE);
  private readonly ordersState = signal<OrderSummary[]>([]);
  private readonly branchesState = signal<Branch[]>([]);
  private readonly loadingState = signal(true);
  private readonly errorState = signal('');
  private readonly totalRecordsState = signal(0);
  private readonly actionLoadingState = signal<AdminOrderAction | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly table = this.tableState.asReadonly();
  readonly orders = this.ordersState.asReadonly();
  readonly branches = this.branchesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly totalRecords = this.totalRecordsState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly currentRole = computed(() => this.authService.getUserRole());
  readonly isBranchRestricted = computed(
    () => this.currentRole() !== null && this.currentRole() !== 'ADMIN',
  );

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loadingState.set(true);
          this.errorState.set('');
        }),
        switchMap((query) =>
          this.adminOrderService.listOrders(query).pipe(
            catchError((error: unknown) => {
              this.ordersState.set([]);
              this.totalRecordsState.set(0);
              this.errorState.set(this.messageForError(error, 'No pudimos cargar los pedidos.'));
              this.loadingState.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response: PageResponse<OrderSummary>) => {
        this.ordersState.set(response.content);
        this.totalRecordsState.set(response.totalElements);
        this.loadingState.set(false);
      });

    this.userService
      .listBranches()
      .pipe(
        catchError(() => {
          this.branchesState.set([]);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((branches) => this.branchesState.set(branches));

    this.autosetBranchForCurrentUser();
    this.load();
  }

  load(): void {
    this.requests.next(toAdminOrdersQuery(this.filtersState(), this.tableState()));
  }

  setStatus(status: OrderStatus | null): void {
    this.updateFilters({ status });
  }

  setType(type: OrderType | null): void {
    this.updateFilters({ type });
  }

  setBranch(branchId: number | null): void {
    if (this.isBranchRestricted() && branchId !== this.authService.currentUser()?.branchId) {
      return;
    }
    this.updateFilters({ branchId });
  }

  setDateFrom(from: Date | null): void {
    this.updateFilters({ from });
  }

  setDateTo(to: Date | null): void {
    this.updateFilters({ to });
  }

  setSearch(search: string): void {
    this.updateFilters({ search: search.trim() });
  }

  clearFilters(): void {
    const branchId = this.isBranchRestricted() ? this.filtersState().branchId : null;
    this.filtersState.set({ ...EMPTY_ADMIN_ORDER_FILTERS, branchId });
    this.resetToFirstPageAndLoad();
  }

  setPage(first: number, pageSize: number): void {
    this.tableState.update((table) => ({ ...table, first, pageSize }));
    this.load();
  }

  setSort(field: string, order: number): void {
    const table = this.tableState();
    const isSameSort = table.sortField === field && table.sortOrder === order;
    this.tableState.set({
      ...table,
      first: 0,
      sortField: isSameSort ? undefined : field,
      sortOrder: isSameSort ? undefined : order,
    });
    this.load();
  }

  transition(orderId: number, action: OrderTransitionKey): void {
    if (this.actionLoadingState()) return;
    const request = this.transitionRequest(orderId, action);
    this.runAction(request, action, 'No se pudo completar la accion.', 'Estado actualizado');
  }

  cancel(orderId: number, reason: string): void {
    if (this.actionLoadingState() || reason.trim().length === 0) return;
    this.runAction(
      this.adminOrderService.cancel(orderId, { reason: reason.trim() }),
      'cancel',
      'No se pudo cancelar el pedido.',
      'Pedido cancelado',
    );
  }

  private updateFilters(changes: Partial<AdminOrderFilters>): void {
    this.filtersState.update((filters) => ({ ...filters, ...changes }));
    this.resetToFirstPageAndLoad();
  }

  private resetToFirstPageAndLoad(): void {
    this.tableState.update((table) => ({ ...table, first: 0 }));
    this.load();
  }

  private transitionRequest(orderId: number, action: OrderTransitionKey): Observable<OrderDetail> {
    switch (action) {
      case 'prepare':
        return this.adminOrderService.prepare(orderId);
      case 'ready':
        return this.adminOrderService.markReady(orderId);
      case 'deliver':
        return this.adminOrderService.deliver(orderId);
    }
  }

  private runAction(
    request: Observable<OrderDetail>,
    action: AdminOrderAction,
    fallback: string,
    successSummary: string,
  ): void {
    this.actionLoadingState.set(action);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedOrder) => {
        this.actionLoadingState.set(null);
        this.load();
        this.messageService.add({
          severity: 'success',
          summary: successSummary,
          detail: `${updatedOrder.orderNumber} ahora esta en ${updatedOrder.status}.`,
          life: 4000,
        });
      },
      error: (error: unknown) => {
        this.actionLoadingState.set(null);
        const apiError = getApiError(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: apiError ? this.errorMapping.getMessage(apiError.code) : fallback,
          life: 6000,
        });
      },
    });
  }

  private autosetBranchForCurrentUser(): void {
    const user = this.authService.currentUser();
    if (!user || user.role === 'ADMIN' || user.role === 'CUSTOMER' || user.branchId == null) return;
    this.filtersState.update((filters) => ({ ...filters, branchId: user.branchId ?? null }));
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code) : fallback;
  }
}
