import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import type { StockProductSummaryDto } from '@features/inventory/domain/inventory';
import type { InventoryViewState } from '@features/inventory/state/inventory-page.store';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';

/** Product-branch inventory results table with pagination and row-level actions. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory-table',
  host: { '[attr.data-state]': 'state()' },
  imports: [AppButton, AppDataTable],
  templateUrl: './inventory-table.html',
  styleUrl: './inventory-table.css',
})
export class InventoryTable {
  readonly products = input<StockProductSummaryDto[]>([]);
  readonly loading = input(false);
  readonly state = input.required<InventoryViewState>();
  readonly totalRecords = input(0);
  readonly first = input(0);
  readonly rows = input(10);
  readonly canManage = input(false);

  readonly pageChanged = output<{ readonly first: number; readonly rows: number }>();
  readonly sortChanged = output<{ readonly field: string; readonly order: number }>();
  readonly viewLots = output<StockProductSummaryDto>();
  readonly adjust = output<StockProductSummaryDto>();
  readonly emptyAction = output<void>();

  readonly columns = computed<ColumnDef[]>(() => {
    const columns: ColumnDef[] = [
      { field: 'productName', header: 'Producto', sortable: true },
      { field: 'branchName', header: 'Sucursal', sortable: true },
      { field: 'totalAvailable', header: 'Total disponible', sortable: false, width: '9rem' },
      { field: 'nearestExpirationDate', header: 'Proximo vencimiento', sortable: false },
    ];
    if (this.canManage()) {
      columns.push({ field: 'actions', header: 'Acciones', sortable: false, width: '7rem' });
    }
    return columns;
  });

  formatQuantity(value: number): string {
    return Number(value).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin venc.';
    }

    // Date-only API values must be parsed as local dates to avoid a timezone shift.
    const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return date.toLocaleDateString('es-AR');
  }
}
