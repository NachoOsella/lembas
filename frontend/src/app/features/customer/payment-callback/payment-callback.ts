import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { CustomerOrderService } from '../../../core/services/customer-order';
import { ShortDateArPipe } from '../../../core/pipes/short-date-ar.pipe';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { OrderDetail, OrderStatus } from '../../../shared/models/order';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

/** Phase reported by the callback page after the polling loop. */
type CallbackPhase = 'loading' | 'pending' | 'success' | 'failure' | 'stock_conflict' | 'error';

/** Key persisted in sessionStorage by the checkout when it kicks off the MP redirect. */
const PENDING_ORDER_KEY = 'pendingOrderId';

/**
 * Polls the backend for the order status after the customer is redirected back
 * from Mercado Pago and renders the appropriate outcome.
 *
 * <p>The webhook is asynchronous so the page polls every 3s, up to 10 attempts
 * (~30s). After the loop the page falls back to a 'pending' phase with a
 * CTA to view the orders list; the order detail page is the source of truth
 * for the final status.</p>
 */
@Component({
  selector: 'app-payment-callback',
  imports: [AppButton, AppEyebrow, ErrorAlert, LoadingSpinner, ShortDateArPipe],
  templateUrl: './payment-callback.html',
})
export class PaymentCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(CustomerOrderService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly destroyRef = inject(DestroyRef);

  /** Maximum number of polling attempts before falling back to 'pending'. */
  private static readonly MAX_ATTEMPTS = 10;

  /** Interval between polling attempts in milliseconds. */
  private static readonly POLL_INTERVAL_MS = 3000;

  protected readonly phase = signal<CallbackPhase>('loading');
  protected readonly order = signal<OrderDetail | null>(null);
  protected readonly attempts = signal(0);
  protected readonly errorCode = signal<string | null>(null);

  /** Number of poll attempts rendered for transparency. */
  protected readonly attemptsLabel = computed(() => this.attempts());

  /** User-friendly error derived from the backend error code. */
  protected readonly errorMessage = computed(() => {
    const code = this.errorCode();
    return code ? this.errorMapping.getMessage(code) : null;
  });

  ngOnInit(): void {
    // Prefer the query parameter (set by MP via the success/failure URL
    // configured on the preference). Fall back to sessionStorage so retries
    // triggered after the user already consumed the redirect still work.
    const fromQuery = Number(this.route.snapshot.queryParamMap.get('orderId'));
    const fromSession = Number(sessionStorage.getItem(PENDING_ORDER_KEY));
    const orderId = Number.isFinite(fromQuery) && fromQuery > 0
        ? fromQuery
        : Number.isFinite(fromSession) && fromSession > 0
            ? fromSession
            : NaN;
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    if (!Number.isFinite(orderId)) {
      this.phase.set('error');
      this.errorCode.set('ORDER_NOT_FOUND');
      return;
    }
    this.pollOrder(orderId, 1);
  }

  /** Polls the order detail until it reaches a terminal status or the budget is exhausted. */
  private pollOrder(orderId: number, attempt: number): void {
    this.attempts.set(attempt);
    this.orderService.getOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          const phase = mapStatusToPhase(order.status);
          if (phase !== 'loading') {
            this.phase.set(phase);
            return;
          }
          if (attempt >= PaymentCallback.MAX_ATTEMPTS) {
            this.phase.set('pending');
            return;
          }
          setTimeout(() => this.pollOrder(orderId, attempt + 1), PaymentCallback.POLL_INTERVAL_MS);
        },
        error: (err: unknown) => {
          this.phase.set('error');
          this.errorCode.set(
            (err as { error?: { code?: string } } | null)?.error?.code ?? 'INTERNAL_ERROR',
          );
        },
      });
  }

  /** Resumes polling after the user retries from a transient error. */
  protected retry(): void {
    const fromQuery = Number(this.route.snapshot.queryParamMap.get('orderId'));
    const orderId = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : NaN;
    if (!Number.isFinite(orderId)) {
      this.phase.set('error');
      this.errorCode.set('ORDER_NOT_FOUND');
      return;
    }
    this.phase.set('loading');
    this.errorCode.set(null);
    this.pollOrder(orderId, 1);
  }

  /** Navigates to the customer orders list. */
  protected backToOrders(): void {
    this.router.navigate(['/customer/orders']);
  }

  /** Navigates to the affected order detail page. */
  protected viewOrder(): void {
    const orderId = this.order()?.id;
    if (orderId) {
      this.router.navigate(['/customer/orders', orderId]);
      return;
    }
    this.backToOrders();
  }

  /** Resumes the payment flow by routing the user back to the order detail page. */
  protected retryPayment(): void {
    const orderId = this.order()?.id;
    if (orderId) {
      this.router.navigate(['/customer/orders', orderId]);
    } else {
      this.backToOrders();
    }
  }
}

/** Maps an OrderStatus to a page phase; the order detail is the source of truth. */
function mapStatusToPhase(status: OrderStatus): CallbackPhase {
  switch (status) {
    case 'PAID':
    case 'PREPARING':
    case 'READY':
    case 'DELIVERED':
      return 'success';
    case 'PAYMENT_FAILED':
    case 'CANCELLED':
      return 'failure';
    case 'STOCK_CONFLICT':
      return 'stock_conflict';
    default:
      return 'loading';
  }
}
