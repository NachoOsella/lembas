import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { InventoryService } from '../../../core/services/inventory';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { StockLotDto } from '../../../shared/models/inventory';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { StatusBadge, StatusBadgeConfig } from '../../../shared/components/status-badge/status-badge';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';

const STOCK_LOT_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  ACTIVE: { label: 'Activo', tone: 'success', icon: 'pi pi-check-circle' },
  DEPLETED: { label: 'Agotado', tone: 'neutral', icon: 'pi pi-stop-circle' },
  CANCELLED: { label: 'Cancelado', tone: 'danger', icon: 'pi pi-times-circle' },
};

/** Displays all individual lots for a given product in a branch, with pagination. */
@Component({
  selector: 'app-stock-lot-detail',
  imports: [
    AppButton,
    AppDataTable,
    AppPageHeader,
    ErrorAlert,
    StatusBadge,
  ],
  templateUrl: './stock-lot-detail.html',
  styleUrl: './stock-lot-detail.css',
})
export class StockLotDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventoryService = inject(InventoryService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly lots = signal<StockLotDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly productId = signal<number>(0);
  protected readonly branchId = signal<number>(0);
  protected readonly productName = signal('');
  protected readonly branchName = signal('');

  // -- Lazy pagination --------------------------------------------------------
  protected readonly first = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);

  protected readonly columns: ColumnDef[] = [
    { field: 'lotCode', header: 'Lote', sortable: false },
    { field: 'expirationDate', header: 'Vencimiento', sortable: false },
    { field: 'quantityAvailable', header: 'Disponible', sortable: false },
    { field: 'unitCost', header: 'Costo unit.', sortable: false },
    { field: 'status', header: 'Estado', sortable: false },
  ];

  protected readonly statusBadges = STOCK_LOT_STATUS_BADGES;

  ngOnInit(): void {
    const pid = Number(this.route.snapshot.params['productId']);
    const bid = Number(this.route.snapshot.queryParams['branchId']);
    const pName = this.route.snapshot.queryParams['productName'] ?? 'Producto';
    const bName = this.route.snapshot.queryParams['branchName'] ?? 'Sucursal';

    this.productId.set(pid);
    this.branchId.set(bid);
    this.productName.set(decodeURIComponent(pName));
    this.branchName.set(decodeURIComponent(bName));

    this.loadLots();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  protected loadLots(): void {
    this.loading.set(true);
    this.error.set('');
    const page = Math.floor(this.first() / this.pageSize());
    this.inventoryService
      .listLots({
        productId: this.productId(),
        branchId: this.branchId(),
        page,
        size: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.lots.set(response.content);
          this.totalRecords.set(response.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.messageForError(err, 'No pudimos cargar los lotes.'));
          this.loading.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadLots();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  protected goBack(): void {
    this.router.navigate(['/admin/inventory']);
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  protected formatQuantity(value: number): string {
    return Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin venc.';
    return new Date(value).toLocaleDateString('es-AR');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }
}
