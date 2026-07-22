import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppEyebrow } from '@shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { SeverityPillTone } from '@shared/components/severity-pill/severity-pill';
import { SeverityPill } from '@shared/components/severity-pill/severity-pill';
import type { OrderStatus, PaymentStatus } from '@features/orders/domain/order';
import { orderStatusLabel, paymentStatusLabel } from '@features/orders/domain/order';
import {
  buildCustomerOrderTimeline,
  orderStatusTone,
  paymentMethodLabel,
  paymentStatusTone,
} from '@features/orders/public-api';
import { CustomerOrderDetailStore } from '@features/orders/public-api';

@Component({
  selector: 'app-order-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CustomerOrderDetailStore],
  imports: [
    AppButton,
    AppEyebrow,
    ErrorAlert,
    LoadingSpinner,
    SeverityPill,
    CurrencyArPipe,
    ShortDateArPipe,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CustomerOrderDetailStore);

  private readonly invalidRoute = signal('');
  protected readonly loading = computed(
    () => this.invalidRoute().length === 0 && this.store.loading(),
  );
  protected readonly errorMessage = computed(
    () => this.invalidRoute() || this.store.errorMessage(),
  );
  protected readonly order = this.store.order;
  protected readonly paying = this.store.paying;
  protected readonly canPay = this.store.canPay;
  protected readonly timeline = computed(() => {
    const order = this.order();
    return order ? buildCustomerOrderTimeline(order) : [];
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const value = params.get('id');
      const id = value === null ? NaN : Number(value);
      if (!Number.isInteger(id) || id <= 0) {
        this.invalidRoute.set('No se especifico un ID de pedido.');
        return;
      }
      this.invalidRoute.set('');
      this.store.load(id);
    });
  }

  protected goToPayment(): void {
    this.store.pay();
  }

  protected backToOrders(): void {
    this.router.navigate(['/customer/orders']);
  }

  protected statusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  protected orderStatusTone(status: OrderStatus): SeverityPillTone {
    return orderStatusTone(status);
  }

  protected paymentStatusLabel(status: PaymentStatus): string {
    return paymentStatusLabel(status);
  }

  protected paymentStatusTone(status: PaymentStatus): SeverityPillTone {
    return paymentStatusTone(status);
  }

  protected paymentMethodLabelFor(method: string): string {
    return paymentMethodLabel(method);
  }
}
