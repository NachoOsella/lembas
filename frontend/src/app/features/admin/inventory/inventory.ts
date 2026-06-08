import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { DatePicker } from 'primeng/datepicker';

import { InventoryService } from '../../../core/services/inventory';
import { ProductService } from '../../../core/services/product';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { StockLotDto } from '../../../shared/models/inventory';
import { ProductSummary } from '../../../shared/models/product';
import { Branch } from '../../../shared/models/user';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppFormField } from '../../../shared/components/app-form-field/app-form-field';
import { AppModal } from '../../../shared/components/app-modal/app-modal';
import { AppProductSelector } from '../../../shared/components/app-product-selector/app-product-selector';
import { AppSearchBar } from '../../../shared/components/app-search-bar/app-search-bar';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { AppToggleSwitch } from '../../../shared/components/app-toggle-switch/app-toggle-switch';
import { StatusBadge, StatusBadgeConfig } from '../../../shared/components/status-badge/status-badge';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../shared/components/form-section/form-section';

/** Fields that the backend supports for server-side sorting on the stock lots endpoint. */
const STOCK_LOT_SORT_FIELDS = new Set([
  'productName',
  'branchName',
  'initialQuantity',
  'quantityAvailable',
  'expirationDate',
  'unitCost',
  'status',
]);

/** Status badge visual configuration for stock lot lifecycle states. */
const STOCK_LOT_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  ACTIVE: { label: 'Activo', tone: 'success', icon: 'pi pi-check-circle' },
  DEPLETED: { label: 'Agotado', tone: 'neutral', icon: 'pi pi-stop-circle' },
  CANCELLED: { label: 'Cancelado', tone: 'danger', icon: 'pi pi-times-circle' },
};

/** Admin page for browsing stock lots, filtering by product/branch/expiration, and creating manual lots. */
@Component({
  selector: 'app-inventory',
  imports: [
    AppButton,
    AppDataTable,
    AppFormField,
    AppModal,
    AppPageHeader,
    AppProductSelector,
    AppSearchBar,
    AppSelect,
    AppToggleSwitch,
    DatePicker,
    ErrorAlert,
    FormSection,
    FormsModule,
    InputNumber,
    StatusBadge,
  ],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory {
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  // -- Table data -------------------------------------------------------------
  protected readonly lots = signal<StockLotDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  // -- Filters ----------------------------------------------------------------
  protected readonly search = signal('');
  protected readonly selectedBranchId = signal<number | null>(null);
  protected readonly expiringSoon = signal(false);
  protected readonly branches = signal<Branch[]>([]);

  // -- Lazy pagination --------------------------------------------------------
  protected readonly first = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal<number | undefined>(undefined);

  // -- Create lot dialog ------------------------------------------------------
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly newProduct = signal<ProductSummary | null>(null);
  protected readonly newBranchId = signal<number | null>(null);
  protected readonly newQuantity = signal<number | null>(null);
  protected readonly newLotCode = signal('');
  protected readonly newExpirationDate = signal<Date | null>(null);
  protected readonly newCostPrice = signal<number | null>(null);
  protected readonly newProductSuggestions = signal<ProductSummary[]>([]);

  // -- Computed options -------------------------------------------------------
  protected readonly branchOptions = computed(() =>
    this.branches().map((b) => ({ label: b.name, value: b.id })),
  );

  /** Minimum selectable date for date pickers (today). */
  protected readonly minDate = computed(() => new Date());

  protected readonly columns: ColumnDef[] = [
    { field: 'productName', header: 'Producto', sortable: true },
    { field: 'branchName', header: 'Sucursal', sortable: true },
    { field: 'quantityAvailable', header: 'Disponible', sortable: true },
    { field: 'initialQuantity', header: 'Recibido', sortable: true },
    { field: 'lotCode', header: 'Lote', sortable: false },
    { field: 'expirationDate', header: 'Vencimiento', sortable: true },
    { field: 'unitCost', header: 'Costo unit.', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
  ];

  protected readonly statusBadges = STOCK_LOT_STATUS_BADGES;

  constructor() {
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.loadLots();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  /** Loads the stock lots page with current filters, pagination, and sort. */
  protected loadLots(): void {
    this.loading.set(true);
    this.error.set('');
    const page = Math.floor(this.first() / this.pageSize());
    const sort = this.buildSortParam(this.sortField(), this.sortOrder(), 'expirationDate');
    this.inventoryService
      .listLots({
        search: this.search(),
        branchId: this.selectedBranchId(),
        expiringSoon: this.expiringSoon(),
        page,
        size: this.pageSize(),
        sort,
      })
      .subscribe({
        next: (response) => {
          this.lots.set(response.content);
          this.totalRecords.set(response.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.messageForError(err, 'No pudimos cargar el inventario.'));
          this.loading.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Filter handlers
  // ---------------------------------------------------------------------------

  /** Called when any filter changes: resets to first page and reloads. */
  protected onFilterChange(): void {
    this.first.set(0);
    this.loadLots();
  }

  /** Applies search filter, resetting to first page. */
  protected onSearch(query: string): void {
    this.search.set(query);
    this.first.set(0);
    this.loadLots();
  }

  /** Clears search filter, resetting to first page. */
  protected clearSearch(): void {
    this.onSearch('');
  }

  // ---------------------------------------------------------------------------
  // Pagination handlers
  // ---------------------------------------------------------------------------

  /** Handles page change from the data table. */
  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadLots();
  }

  /** Handles sort change from the data table. */
  protected onSort(event: { field: string; order: number }): void {
    this.first.set(0);

    if (!STOCK_LOT_SORT_FIELDS.has(event.field) || ![1, -1].includes(event.order)) {
      this.sortField.set(undefined);
      this.sortOrder.set(undefined);
      this.loadLots();
      return;
    }

    this.sortField.set(event.field);
    this.sortOrder.set(event.order);
    this.loadLots();
  }

  // ---------------------------------------------------------------------------
  // Create lot dialog
  // ---------------------------------------------------------------------------

  /** Opens the dialog to manually create a stock lot. */
  protected openCreateDialog(): void {
    this.newProduct.set(null);
    this.newBranchId.set(null);
    this.newQuantity.set(null);
    this.newLotCode.set('');
    this.newExpirationDate.set(null);
    this.newCostPrice.set(null);
    this.newProductSuggestions.set([]);
    this.dialogVisible.set(true);
  }

  /** Searches products for the create-lot dialog autocomplete. */
  protected searchNewProduct(query: string): void {
    if (query.length < 2) {
      this.newProductSuggestions.set([]);
      return;
    }
    this.productService.listAdminProducts({ search: query, size: 10 }).subscribe({
      next: (page) => this.newProductSuggestions.set(page.content),
      error: () => this.newProductSuggestions.set([]),
    });
  }

  /** Persists a new stock lot via the direct entry endpoint. */
  protected saveLot(): void {
    const product = this.newProduct();
    const branchId = this.newBranchId();
    const quantity = this.newQuantity();

    if (!product || !branchId || quantity === null || quantity <= 0) {
      this.error.set('Completa todos los campos obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const expDate = this.newExpirationDate();
    this.inventoryService
      .createStockLot({
        productId: product.id,
        branchId,
        quantity,
        lotCode: this.blankToNull(this.newLotCode()),
        expirationDate: expDate ? this.toDateString(expDate) : null,
        costPrice: this.newCostPrice(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Lote creado', detail: 'El lote de stock fue registrado correctamente.' });
          this.loadLots();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.messageForError(err, 'No pudimos crear el lote.'));
        },
      });
  }

  /** Navigates to the purchase receipts page. */
  protected navigateToReceipts(): void {
    this.router.navigate(['/admin/receips']);
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  /** Formats a decimal quantity for display. */
  protected formatQuantity(value: number): string {
    return Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  /** Formats a price value for Argentina pesos. */
  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  }

  /** Formats a date string for display. */
  protected formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin venc.';
    return new Date(value).toLocaleDateString('es-AR');
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Builds a Spring Data sort param string from field and order signals. */
  private buildSortParam(field: string | undefined, order: number | undefined, defaultField: string): string | undefined {
    if (!field || ![1, -1].includes(order ?? 0)) {
      return `${defaultField},asc`;
    }
    return `${field},${order === 1 ? 'asc' : 'desc'}`;
  }

  /** Maps backend errors to user-facing messages. */
  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }

  /** Converts empty text fields to null for API requests. */
  private blankToNull(value: string): string | null {
    return value.trim() ? value.trim() : null;
  }

  /** Converts a Date to an ISO date string (yyyy-MM-dd). */
  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
