import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { CustomerOrderService } from '@features/orders/data-access/customer-order';
import type { OrderSummary } from '@features/orders/domain/order';
import { getApiError } from '@shared/types/api-error';

@Injectable()
export class CustomerOrdersPageStore {
  private readonly service = inject(CustomerOrderService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<void>();

  private readonly ordersState = signal<OrderSummary[]>([]);
  private readonly loadingState = signal(true);
  private readonly errorMessageState = signal('');

  readonly orders = this.ordersState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loadingState.set(true);
          this.errorMessageState.set('');
        }),
        switchMap(() =>
          this.service.getOrders().pipe(
            catchError((error: unknown) => {
              this.ordersState.set([]);
              this.loadingState.set(false);
              this.errorMessageState.set(
                this.messageForError(error, 'No pudimos cargar tus pedidos. Intentá nuevamente.'),
              );
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((orders) => {
        this.ordersState.set(orders);
        this.loadingState.set(false);
      });
  }

  load(): void {
    this.requests.next();
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code) : fallback;
  }
}
