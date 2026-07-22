import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DecimalPipe } from '@angular/common';

import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSearchBar } from '@shared/components/app-search-bar/app-search-bar';
import { AppSelect } from '@shared/components/app-select/app-select';
import { ErrorMappingService } from '@core/services/error-mapping';
import { InventoryService } from '@features/inventory/data-access/inventory';
import { UserService } from '@features/users/data-access/user';
import { getApiError } from '@shared/types/api-error';
import type { StockMovementDto } from '@features/inventory/domain/inventory';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_SEVERITY } from '@features/inventory/domain/inventory';
import type { Branch } from '@features/users/domain/user';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stock-movements',
  imports: [
    DatePipe,
    DecimalPipe,
    AppButton,
    AppDataTable,
    ErrorAlert,
    AppPageHeader,
    AppSearchBar,
    AppSelect,
  ],
  templateUrl: './stock-movements.html',
  styleUrl: './stock-movements.css',
})
export class StockMovements {
  private readonly inventoryService = inject(InventoryService);
  private readonly userService = inject(UserService);
  private readonly errorMapping = inject(ErrorMappingService);

  readonly columns: ColumnDef[] = [
    { field: 'type', header: 'Tipo', sortable: true, width: '10rem' },
    { field: 'createdAt', header: 'Fecha', sortable: true, width: '9rem' },
    { field: 'productName', header: 'Producto', sortable: true },
    { field: 'branchName', header: 'Sucursal', sortable: true, width: '9rem' },
    { field: 'quantity', header: 'Cantidad', sortable: true, width: '9rem' },
    { field: 'reason', header: 'Motivo', sortable: false },
  ];

  readonly movements = signal<StockMovementDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly totalRecords = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly sortField = signal('createdAt');
  readonly sortOrder = signal(-1);

  readonly searchTerm = signal('');
  readonly typeFilter = signal<string | null>(null);
  readonly branchFilter = signal<number | null>(null);
  readonly branchOptions = signal<{ label: string; value: number }[]>([]);

  /** Builds the type filter dropdown options from the available movement types. */
  readonly typeFilterOptions = computed<
    readonly { readonly label: string; readonly value: string | null }[]
  >(() => {
    const entries = Object.entries(MOVEMENT_TYPE_LABELS);
    return [
      { label: 'Todos los tipos', value: null },
      ...entries.map(([value, label]) => ({ label, value })),
    ];
  });

  constructor() {
    this.loadBranches();
    this.loadMovements();
  }

  private loadBranches(): void {
    this.userService.listBranches().subscribe({
      next: (branches: Branch[]) => {
        this.branchOptions.set(branches.map((b) => ({ label: b.name, value: b.id })));
      },
      error: () => {
        this.branchOptions.set([]);
      },
    });
  }

  loadMovements(): void {
    this.loading.set(true);
    this.error.set('');

    const sortParam = `${this.sortField()},${this.sortOrder() === -1 ? 'desc' : 'asc'}`;

    this.inventoryService
      .listMovements({
        search: this.searchTerm().trim() || undefined,
        type: this.typeFilter() ?? undefined,
        branchId: this.branchFilter(),
        page: Math.floor(this.first() / this.pageSize()),
        size: this.pageSize(),
        sort: sortParam,
      })
      .subscribe({
        next: (page) => {
          this.movements.set(page.content);
          this.totalRecords.set(page.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const apiError = getApiError(err);
          this.error.set(
            apiError
              ? this.errorMapping.getMessage(apiError.code)
              : 'No pudimos cargar los movimientos.',
          );
        },
      });
  }

  onSearch(query: string): void {
    this.searchTerm.set(query);
    this.first.set(0);
    this.loadMovements();
  }

  onFilterChange(): void {
    this.first.set(0);
    this.loadMovements();
  }

  onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadMovements();
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField.set(event.field);
    this.sortOrder.set(event.order);
    this.first.set(0);
    this.loadMovements();
  }

  typeLabel(type: string): string {
    return MOVEMENT_TYPE_LABELS[type] ?? type;
  }

  typeSeverity(type: string): string {
    return MOVEMENT_TYPE_SEVERITY[type] ?? 'info';
  }
}
