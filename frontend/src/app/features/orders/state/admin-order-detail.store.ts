import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import type { Observable } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { AdminOrderService } from '@features/orders/data-access/admin-order';
import type { OrderDetail } from '@features/orders/domain/order';
import type { OrderTransitionKey } from '@features/orders/domain/order-presentation';
import { getApiError } from '@shared/types/api-error';

export type AdminOrderDetailAction = OrderTransitionKey | 'cancel';

@Injectable()
export class AdminOrderDetailStore {
  private readonly adminOrderService = inject(AdminOrderService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<number>();

  private readonly orderState = signal<OrderDetail | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  private readonly orderIdState = signal<number | null>(null);
  private readonly actionLoadingState = signal<AdminOrderDetailAction | null>(null);

  readonly order = this.orderState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly orderId = this.orderIdState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loadingState.set(true);
          this.errorState.set('');
          this.orderState.set(null);
        }),
        switchMap((id) =>
          this.adminOrderService.getOrder(id).pipe(
            catchError((error: unknown) => {
              this.loadingState.set(false);
              this.errorState.set(this.messageForError(error, 'No pudimos cargar el pedido.'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((order) => {
        this.orderState.set(order);
        this.loadingState.set(false);
      });
  }

  load(id: number): void {
    this.orderIdState.set(id);
    this.requests.next(id);
  }

  transition(action: OrderTransitionKey): void {
    const order = this.orderState();
    if (!order || this.actionLoadingState()) return;
    this.runAction(
      this.transitionRequest(order.id, action),
      action,
      'No se pudo completar la accion.',
    );
  }

  cancel(reason: string): void {
    const order = this.orderState();
    if (!order || this.actionLoadingState() || reason.trim().length === 0) return;
    this.runAction(
      this.adminOrderService.cancel(order.id, { reason: reason.trim() }),
      'cancel',
      'No se pudo cancelar el pedido.',
    );
  }

  private transitionRequest(id: number, action: OrderTransitionKey): Observable<OrderDetail> {
    switch (action) {
      case 'prepare':
        return this.adminOrderService.prepare(id);
      case 'ready':
        return this.adminOrderService.markReady(id);
      case 'deliver':
        return this.adminOrderService.deliver(id);
    }
  }

  private runAction(
    request: Observable<OrderDetail>,
    action: AdminOrderDetailAction,
    fallback: string,
  ): void {
    this.actionLoadingState.set(action);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedOrder) => {
        this.orderState.set(updatedOrder);
        this.actionLoadingState.set(null);
        this.messageService.add({
          severity: 'success',
          summary: action === 'cancel' ? 'Pedido cancelado' : 'Estado actualizado',
          detail: `${updatedOrder.orderNumber} ahora esta en ${updatedOrder.status}.`,
          life: 4000,
        });
      },
      error: (error: unknown) => {
        this.actionLoadingState.set(null);
        const apiError = getApiError(error);
        this.messageService.add({
          severity: 'error',
          summary: action === 'cancel' ? 'No se pudo cancelar' : 'Error',
          detail: apiError ? this.errorMapping.getMessage(apiError.code) : fallback,
          life: 6000,
        });
      },
    });
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code) : fallback;
  }
}
