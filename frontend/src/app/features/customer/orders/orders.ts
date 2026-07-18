import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CustomerOrderService } from '@features/orders/data-access/customer-order';
import type { OrderSummary } from '@features/orders/domain/order';
import { orderStatusLabel, orderStatusSeverity } from '@features/orders/domain/order';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppEyebrow } from '@shared/components/app-eyebrow/app-eyebrow';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppPagination } from '@shared/components/app-pagination/app-pagination';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { SeverityPillTone } from '@shared/components/severity-pill/severity-pill';
import { SeverityPill } from '@shared/components/severity-pill/severity-pill';

/** Page size used by the mobile card list. */
const MOBILE_PAGE_SIZE = 8;

/**
 * Lists the authenticated customer's order history.
 *
 * <p>Guards on the parent route enforce auth + CUSTOMER role so this
 * component always runs with a hydrated customer session.</p>
 */
@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppButton,
    AppEyebrow,
    AppDataTable,
    AppPagination,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    SeverityPill,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private readonly service = inject(CustomerOrderService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly orders = signal<OrderSummary[]>([]);

  /** Mobile card list pagination state. */
  protected readonly first = signal(0);
  protected readonly pageSize = signal(MOBILE_PAGE_SIZE);

  /** Slice of `orders` for the current mobile page. */
  protected readonly pagedOrders = computed(() => {
    const all = this.orders();
    const start = this.first();
    return all.slice(start, start + this.pageSize());
  });

  /** Column definitions for the app-data-table. */
  protected readonly columns: ColumnDef[] = [
    { field: 'orderNumber', header: 'Nro. Pedido', sortable: false },
    { field: 'createdAt', header: 'Fecha', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
    { field: 'total', header: 'Total', sortable: false },
    { field: 'actions', header: '', sortable: false, width: '5rem' },
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  /** Fetches the order list from the backend. */
  protected loadOrders(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service.getOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.first.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Handles page changes for the mobile card list pagination. */
  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Navigates to the detail page for one order. */
  protected viewOrder(id: number): void {
    this.router.navigate(['/customer/orders', id]);
  }

  /** Navigates back to the store catalog. */
  protected goToStore(): void {
    this.router.navigate(['/store/products']);
  }

  /** Returns a human-readable label for the given order status. */
  protected statusLabel(status: OrderSummary['status']): string {
    return orderStatusLabel(status);
  }

  /** Returns a PrimeNG severity key for status badge colouring. */
  protected statusSeverity(status: OrderSummary['status']): string {
    return orderStatusSeverity(status);
  }

  /**
   * Maps the PrimeNG-style severity to the {@link SeverityPillTone}
   * vocabulary used by the mobile card's status pill.
   */
  protected statusTone(status: OrderSummary['status']): SeverityPillTone {
    switch (orderStatusSeverity(status)) {
      case 'success':
        return 'success';
      case 'warn':
        return 'warn';
      case 'danger':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  /** Formats an ISO date string as a locale-aware short date. */
  protected formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso ?? '';
    }
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
}
