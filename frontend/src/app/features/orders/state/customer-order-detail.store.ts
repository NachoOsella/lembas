import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { CustomerCheckoutService } from '@features/checkout/data-access/customer-checkout';
import { CustomerOrderService } from '@features/orders/data-access/customer-order';
import type { OrderDetail } from '@features/orders/domain/order';
import { getApiError } from '@shared/types/api-error';

@Injectable()
export class CustomerOrderDetailStore {
  private readonly service = inject(CustomerOrderService);
  private readonly checkoutService = inject(CustomerCheckoutService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<number>();

  private readonly orderState = signal<OrderDetail | null>(null);
  private readonly loadingState = signal(true);
  private readonly errorCodeState = signal<string | null>(null);
  private readonly payingState = signal(false);

  readonly order = this.orderState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly errorCode = this.errorCodeState.asReadonly();
  readonly paying = this.payingState.asReadonly();
  readonly canPay = computed(() => {
    const status = this.orderState()?.status;
    return status === 'PENDING_PAYMENT' || status === 'PAYMENT_FAILED';
  });
  readonly errorMessage = computed(() => {
    switch (this.errorCodeState()) {
      case 'ORDER_NOT_FOUND':
        return 'El pedido no existe o no te pertenece.';
      case 'FORBIDDEN':
        return 'No tenes acceso a este pedido.';
      case null:
        return null;
      default:
        return 'No pudimos cargar el pedido. Intentá nuevamente.';
    }
  });

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loadingState.set(true);
          this.errorCodeState.set(null);
          this.orderState.set(null);
        }),
        switchMap((id) =>
          this.service.getOrder(id).pipe(
            catchError((error: unknown) => {
              const apiError = getApiError(error);
              this.loadingState.set(false);
              this.errorCodeState.set(apiError?.code ?? 'UNKNOWN');
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
    this.requests.next(id);
  }

  pay(): void {
    const order = this.orderState();
    if (!order || this.payingState() || !this.canPay()) return;

    this.payingState.set(true);
    this.checkoutService
      .createPreference(order.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.initPoint) {
            window.location.href = response.initPoint;
            return;
          }
          this.payingState.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'No se pudo iniciar el pago',
            detail: 'Mercado Pago no devolvio una URL de redireccion.',
          });
        },
        error: (error: unknown) => {
          this.payingState.set(false);
          const apiError = getApiError(error);
          this.messageService.add({
            severity: 'error',
            summary: 'No se pudo iniciar el pago',
            detail: apiError
              ? this.errorMapping.getMessage(apiError.code)
              : 'No se pudo iniciar el pago. Intentá nuevamente.',
          });
        },
      });
  }
}
