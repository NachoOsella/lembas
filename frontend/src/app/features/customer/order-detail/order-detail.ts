import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CustomerCheckoutService } from '../../../core/services/customer-checkout';
import { CustomerOrderService } from '../../../core/services/customer-order';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import {
  OrderDetail as OrderDetailData,
  OrderStatus,
  orderStatusLabel,
  orderStatusSeverity,
  paymentStatusLabel,
  paymentStatusSeverity,
} from '../../../shared/models/order';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

/** Visual state for one step in the order journey. */
type TimelineStepState = 'done' | 'current' | 'upcoming' | 'alert';

/** A single step in the order status timeline. */
interface TimelineStep {
  readonly label: string;
  readonly description: string;
  readonly date: string | null;
  readonly icon: string;
  readonly state: TimelineStepState;
}

/**
 * Full detail view for one customer-owned order.
 *
 * <p>Guards on the parent route enforce auth + CUSTOMER role.</p>
 */
@Component({
  selector: 'app-order-detail',
  imports: [AppButton, AppEyebrow, ErrorAlert, LoadingSpinner],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CustomerOrderService);
  private readonly checkoutService = inject(CustomerCheckoutService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly errorCode = signal<string | null>(null);
  protected readonly order = signal<OrderDetailData | null>(null);
  protected readonly paying = signal(false);

  /** Whether the order is in a state that allows the customer to initiate payment. */
  protected readonly canPay = computed(() => this.order()?.status === 'PENDING_PAYMENT');

  /** Human-readable error message derived from the backend error code. */
  protected readonly errorMessage = computed(() => {
    const code = this.errorCode();
    if (code === 'ORDER_NOT_FOUND') {
      return 'El pedido no existe o no te pertenece.';
    }
    if (code === 'FORBIDDEN') {
      return 'No tenes acceso a este pedido.';
    }
    return code ? 'No pudimos cargar el pedido. Intentá nuevamente.' : null;
  });

  /** Builds a chronological timeline from the order timestamps. */
  protected readonly timeline = computed((): TimelineStep[] => {
    const o = this.order();
    if (!o) return [];

    const status = o.status;
    const normalFlow: TimelineStep[] = [
      this.timelineStep(
        'Pedido creado',
        'Recibimos tu pedido y lo dejamos listo para avanzar.',
        o.createdAt,
        'pi pi-receipt',
        'done',
      ),
      this.timelineStep(
        'Pago pendiente',
        'El pedido queda reservado para iniciar el pago cuando quieras.',
        null,
        'pi pi-wallet',
        status === 'PENDING_PAYMENT' ? 'current' : 'done',
      ),
      this.timelineStep(
        'Pago confirmado',
        'Acreditamos el pago correctamente.',
        o.paidAt,
        'pi pi-check-circle',
        status === 'PAID'
          ? 'current'
          : ['PREPARING', 'READY', 'DELIVERED'].includes(status)
            ? 'done'
            : 'upcoming',
      ),
      this.timelineStep(
        'Preparando',
        'Estamos armando tu pedido con criterio FEFO.',
        o.preparedAt,
        'pi pi-box',
        status === 'PREPARING'
          ? 'current'
          : ['READY', 'DELIVERED'].includes(status)
            ? 'done'
            : 'upcoming',
      ),
      this.timelineStep(
        'Listo para retirar',
        `Te esperamos en la sucursal ${o.branchName}.`,
        null,
        'pi pi-map-marker',
        status === 'READY' ? 'current' : status === 'DELIVERED' ? 'done' : 'upcoming',
      ),
      this.timelineStep(
        'Entregado',
        'Pedido retirado en sucursal. Gracias por elegir Lembas.',
        o.deliveredAt,
        'pi pi-shopping-bag',
        status === 'DELIVERED' ? 'current' : 'upcoming',
      ),
    ];

    if (status === 'CANCELLED') {
      return [
        normalFlow[0],
        this.timelineStep(
          'Cancelado',
          'El pedido fue cancelado y cualquier stock afectado se revierte.',
          o.cancelledAt,
          'pi pi-times-circle',
          'alert',
        ),
      ];
    }

    if (status === 'PAYMENT_FAILED') {
      return [
        normalFlow[0],
        this.timelineStep(
          'Pago rechazado',
          'No se pudo confirmar el pago. Podés intentar nuevamente.',
          null,
          'pi pi-exclamation-triangle',
          'alert',
        ),
      ];
    }

    return normalFlow;
  });

  /** Creates a timeline step with a consistent shape for the template. */
  private timelineStep(
    label: string,
    description: string,
    date: string | null,
    icon: string,
    state: TimelineStepState,
  ): TimelineStep {
    return { label, description, date, icon, state };
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorCode.set('ORDER_NOT_FOUND');
      this.loading.set(false);
      return;
    }
    this.loadOrder(id);
  }

  /** Fetches the order detail from the backend. */
  private loadOrder(id: number): void {
    this.loading.set(true);
    this.errorCode.set(null);
    this.service.getOrder(id).subscribe({
      next: (data) => {
        this.order.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorCode.set(err?.error?.code ?? 'UNKNOWN');
        this.loading.set(false);
      },
    });
  }

  /** Navigates to the Mercado Pago checkout flow. */
  protected goToPayment(): void {
    const current = this.order();
    if (!current || this.paying()) {
      return;
    }
    if (current.status !== 'PENDING_PAYMENT' && current.status !== 'PAYMENT_FAILED') {
      return;
    }
    this.paying.set(true);
    this.checkoutService.createPreference(current.id).subscribe({
      next: (response) => {
        if (response.initPoint) {
          window.location.href = response.initPoint;
          return;
        }
        this.paying.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo iniciar el pago',
          detail: 'Mercado Pago no devolvio una URL de redireccion.',
        });
      },
      error: (err: unknown) => {
        this.paying.set(false);
        const code = (err as { error?: { code?: string } } | null)?.error?.code;
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo iniciar el pago',
          detail: this.errorMapping.getMessage(code ?? 'INTERNAL_ERROR'),
        });
      },
    });
  }

  /** Navigates back to the customer orders list. */
  protected backToOrders(): void {
    this.router.navigate(['/customer/orders']);
  }

  /** Formats a number as Argentine Pesos. */
  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  /** Formats an ISO date string as a locale-aware short date/time. */
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

  /** Returns a human-readable label for the given order status. */
  protected statusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  /** Returns a PrimeNG severity key for order status badge colouring. */
  protected statusSeverity(status: OrderStatus): string {
    return orderStatusSeverity(status);
  }

  /** Returns a human-readable label for a payment status. */
  protected paymentLabel(status: string): string {
    return paymentStatusLabel(status as any);
  }

  /** Returns a PrimeNG severity key for payment status badge colouring. */
  protected paymentSeverity(status: string): string {
    return paymentStatusSeverity(status as any);
  }
}
