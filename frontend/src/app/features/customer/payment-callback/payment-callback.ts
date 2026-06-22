import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CustomerOrderService } from '../../../core/services/customer-order';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import {
  OrderDetail,
  OrderStatus,
  paymentStatusLabel,
  paymentStatusSeverity,
} from '../../../shared/models/order';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

/** Phase reported by the callback page after the polling loop. */
type CallbackPhase = 'loading' | 'pending' | 'success' | 'failure' | 'stock_conflict' | 'error';

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
  imports: [AppButton, AppEyebrow, ErrorAlert, LoadingSpinner],
  templateUrl: './payment-callback.html',
  styleUrl: './payment-callback.css',
})
export class PaymentCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(CustomerOrderService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);

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
    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    if (!orderId) {
      this.phase.set('error');
      this.errorCode.set('ORDER_NOT_FOUND');
      return;
    }
    this.pollOrder(orderId, 1);
  }

  /** Polls the order detail until it reaches a terminal status or the budget is exhausted. */
  private pollOrder(orderId: number, attempt: number): void {
    this.attempts.set(attempt);
    this.orderService.getOrder(orderId).subscribe({
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
          (err as { error?: { code?: string } } | null)?.error?.code ?? 'INTERNAL_ERROR'
        );
      },
    });
  }

  /** Resumes polling after the user retries from a transient error. */
  protected retry(): void {
    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    if (!orderId) {
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

  /** Resumes the payment flow by re-issuing the preference for the order. */
  protected retryPayment(): void {
    const orderId = this.order()?.id;
    if (orderId) {
      this.router.navigate(['/customer/orders', orderId]);
    } else {
      this.backToOrders();
    }
  }

  /** Formats an ISO timestamp for the headline. */
  protected formatDate(iso: string | null): string {
    if (!iso) return '---';
    try {
      return new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  /** Returns the human-readable payment status label for a payment entry. */
  protected paymentLabel(status: string): string {
    return paymentStatusLabel(status as never);
  }

  /** Returns the PrimeNG severity key for a payment status badge. */
  protected paymentSeverity(status: string): string {
    return paymentStatusSeverity(status as never);
  }
}

/** Maps an OrderStatus to a page phase; the order detail is the source of truth. */
function mapStatusToPhase(status: OrderStatus): CallbackPhase {
  switch (status) {
    case 'PAID':
      return 'success';
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
