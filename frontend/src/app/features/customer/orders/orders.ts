import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CustomerOrderService } from '../../../core/services/customer-order';
import { OrderSummary, orderStatusLabel, orderStatusSeverity } from '../../../shared/models/order';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

/**
 * Lists the authenticated customer's order history.
 *
 * <p>Guards on the parent route enforce auth + CUSTOMER role so this
 * component always runs with a hydrated customer session.</p>
 */
@Component({
  selector: 'app-orders',
  imports: [AppButton, AppEyebrow, AppDataTable, EmptyState, ErrorAlert, LoadingSpinner],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private readonly service = inject(CustomerOrderService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly orders = signal<OrderSummary[]>([]);

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
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
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
