import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppEyebrow } from '@shared/components/app-eyebrow/app-eyebrow';
import { AppPagination } from '@shared/components/app-pagination/app-pagination';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { SeverityPillTone } from '@shared/components/severity-pill/severity-pill';
import { SeverityPill } from '@shared/components/severity-pill/severity-pill';
import { orderStatusLabel, orderStatusSeverity } from '@features/orders/domain/order';
import type { OrderSummary } from '@features/orders/domain/order';
import { CustomerOrdersPageStore } from '@features/orders/public-api';

const MOBILE_PAGE_SIZE = 8;

@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CustomerOrdersPageStore],
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
export class Orders {
  private readonly router = inject(Router);
  protected readonly store = inject(CustomerOrdersPageStore);
  protected readonly first = signal(0);
  protected readonly pageSize = signal(MOBILE_PAGE_SIZE);
  protected readonly orders = this.store.orders;
  protected readonly loading = this.store.loading;
  protected readonly errorMessage = this.store.errorMessage;

  protected readonly pagedOrders = computed(() => {
    const orders = this.orders();
    return orders.slice(this.first(), this.first() + this.pageSize());
  });

  protected readonly columns: ColumnDef[] = [
    { field: 'orderNumber', header: 'Nro. Pedido', sortable: false },
    { field: 'createdAt', header: 'Fecha', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
    { field: 'total', header: 'Total', sortable: false },
    { field: 'actions', header: '', sortable: false, width: '5rem' },
  ];

  constructor() {
    this.store.load();
  }

  protected retry(): void {
    this.store.load();
  }

  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected viewOrder(id: number): void {
    this.router.navigate(['/customer/orders', id]);
  }

  protected goToStore(): void {
    this.router.navigate(['/store/products']);
  }

  protected statusLabel(status: OrderSummary['status']): string {
    return orderStatusLabel(status);
  }

  protected statusSeverity(status: OrderSummary['status']): string {
    return orderStatusSeverity(status);
  }

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

  protected formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
