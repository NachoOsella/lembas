import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';

import { InventoryService } from '../../../core/services/inventory';
import { ProductService } from '../../../core/services/product';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { StockProductSummaryDto } from '../../../shared/models/inventory';
import { ProductSummary } from '../../../shared/models/product';
import { Branch } from '../../../shared/models/user';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppModal } from '../../../shared/components/app-modal/app-modal';
import { AppControlField } from '../../../shared/components/app-control-field/app-control-field';
import { AppFormField } from '../../../shared/components/app-form-field/app-form-field';
import { AppProductSelector } from '../../../shared/components/app-product-selector/app-product-selector';
import { AppSearchBar } from '../../../shared/components/app-search-bar/app-search-bar';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { AppToggleSwitch } from '../../../shared/components/app-toggle-switch/app-toggle-switch';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../shared/components/form-section/form-section';

/** Admin page showing aggregated stock per product and branch. */
@Component({
  selector: 'app-inventory',
  imports: [
    AppButton,
    AppDataTable,
    AppControlField,
    AppFormField,
    AppModal,
    DatePicker,
    FormsModule,
    InputNumber,
    AppPageHeader,
    AppProductSelector,
    AppSearchBar,
    AppSelect,
    AppToggleSwitch,
    ErrorAlert,
    FormSection,
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
  protected readonly products = signal<StockProductSummaryDto[]>([]);
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

  // -- Adjustment dialog ------------------------------------------------------
  protected readonly adjDialogVisible = signal(false);
  protected readonly adjSelectedProduct = signal<ProductSummary | null>(null);
  protected readonly adjSelectedBranchId = signal<number | null>(null);
  protected readonly adjType = signal<string>('MANUAL_ADJUSTMENT');
  protected readonly adjQuantity = signal<number | null>(null);
  protected readonly adjReason = signal('');
  protected readonly adjSaving = signal(false);
  protected readonly adjError = signal('');
  protected readonly adjCurrentStockLabel = signal('');
  protected readonly adjProductSuggestions = signal<ProductSummary[]>([]);

  protected readonly adjTypeOptions = [
    { label: 'Ajuste manual', value: 'MANUAL_ADJUSTMENT' },
    { label: 'Consumo interno', value: 'INTERNAL_CONSUMPTION' },
    { label: 'Merma', value: 'WASTE' },
  ];

  // -- Computed options -------------------------------------------------------
  protected readonly branchOptions = computed(() =>
    this.branches().map((b) => ({ label: b.name, value: b.id })),
  );

  protected readonly minDate = computed(() => new Date());

  protected readonly columns: ColumnDef[] = [
    { field: 'productName', header: 'Producto', sortable: true },
    { field: 'branchName', header: 'Sucursal', sortable: true },
    { field: 'totalAvailable', header: 'Total disponible', sortable: false, width: '9rem' },
    { field: 'nearestExpirationDate', header: 'Proximo vencimiento', sortable: false },
    { field: 'actions', header: 'Acciones', sortable: false, width: '7rem' },
  ];

  constructor() {
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.loadProducts();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  protected loadProducts(): void {
    this.loading.set(true);
    this.error.set('');
    const page = Math.floor(this.first() / this.pageSize());
    const sort = this.buildSortParam(this.sortField(), this.sortOrder(), 'productName');
    this.inventoryService
      .listProductSummaries({
        search: this.search(),
        branchId: this.selectedBranchId(),
        expiringSoon: this.expiringSoon(),
        page,
        size: this.pageSize(),
        sort,
      })
      .subscribe({
        next: (response) => {
          this.products.set(response.content);
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

  protected onFilterChange(): void {
    this.first.set(0);
    this.loadProducts();
  }

  protected onSearch(query: string): void {
    this.search.set(query);
    this.onFilterChange();
  }

  protected clearSearch(): void {
    this.onSearch('');
  }

  // ---------------------------------------------------------------------------
  // Pagination handlers
  // ---------------------------------------------------------------------------

  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadProducts();
  }

  protected onSort(event: { field: string; order: number }): void {
    this.first.set(0);
    if (![1, -1].includes(event.order)) {
      this.sortField.set(undefined);
      this.sortOrder.set(undefined);
      this.loadProducts();
      return;
    }
    this.sortField.set(event.field);
    this.sortOrder.set(event.order);
    this.loadProducts();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  protected viewLots(item: StockProductSummaryDto): void {
    this.router.navigate(['/admin/inventory/product', item.productId, 'lots'], {
      queryParams: { branchId: item.branchId, productName: item.productName, branchName: item.branchName },
    });
  }

  protected navigateToReceipts(): void {
    this.router.navigate(['/admin/receips']);
  }

  // ---------------------------------------------------------------------------
  // Create lot dialog
  // ---------------------------------------------------------------------------

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
          this.loadProducts();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.messageForError(err, 'No pudimos crear el lote.'));
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Adjustment dialog
  // ---------------------------------------------------------------------------

  protected openAdjustDialog(item: StockProductSummaryDto): void {
    const product: ProductSummary = {
      id: item.productId,
      name: item.productName,
      salePrice: 0,
      onlineStatus: 'PUBLISHED',
      categoryId: 0,
      categoryName: '',
    };
    this.adjSelectedProduct.set(product);
    this.adjSelectedBranchId.set(item.branchId);
    this.adjType.set('MANUAL_ADJUSTMENT');
    this.adjQuantity.set(null);
    this.adjReason.set('');
    this.adjError.set('');
    this.adjCurrentStockLabel.set('');
    this.adjProductSuggestions.set([]);
    this.updateAdjStockLabel(item.productId, item.branchId);
    this.adjDialogVisible.set(true);
  }

  protected searchAdjProduct(query: string): void {
    if (query.length < 2) {
      this.adjProductSuggestions.set([]);
      return;
    }
    this.productService.listAdminProducts({ search: query, size: 10 }).subscribe({
      next: (page) => this.adjProductSuggestions.set(page.content),
      error: () => this.adjProductSuggestions.set([]),
    });
  }

  protected onAdjProductChange(product: ProductSummary | null): void {
    this.adjSelectedProduct.set(product);
    this.updateAdjStock();
  }

  protected onAdjBranchChange(branchId: number | null): void {
    this.adjSelectedBranchId.set(branchId);
    this.updateAdjStock();
  }

  private updateAdjStock(): void {
    const product = this.adjSelectedProduct();
    const branchId = this.adjSelectedBranchId();
    if (!product || !branchId) {
      this.adjCurrentStockLabel.set('');
      return;
    }
    this.updateAdjStockLabel(product.id, branchId);
  }

  private updateAdjStockLabel(productId: number, branchId: number): void {
    const productName = this.adjSelectedProduct()?.name ?? 'Producto';
    this.inventoryService.listProductSummaries({ search: productName, branchId, size: 20 }).subscribe({
      next: (page) => {
        const summary = page.content.find((item) => item.productId === productId && item.branchId === branchId);
        const available = summary?.totalAvailable ?? 0;
        this.adjCurrentStockLabel.set(`Stock actual: ${this.formatQuantity(available)} unidades de ${productName}`);
      },
      error: () => this.adjCurrentStockLabel.set(''),
    });
  }

  protected get canSubmitAdjustment(): boolean {
    return (
      this.adjSelectedProduct() !== null &&
      this.adjSelectedBranchId() !== null &&
      this.adjQuantity() !== null &&
      this.adjQuantity()! > 0 &&
      this.adjReason().trim().length > 0
    );
  }

  protected saveAdjustment(): void {
    const product = this.adjSelectedProduct();
    const branchId = this.adjSelectedBranchId();
    const quantity = this.adjQuantity();
    const reason = this.adjReason().trim();
    const type = this.adjType();

    if (!product || !branchId || !quantity || quantity <= 0 || !reason) {
      return;
    }

    this.adjSaving.set(true);
    this.adjError.set('');

    const signedQuantity = type === 'MANUAL_ADJUSTMENT' ? quantity : -quantity;

    this.inventoryService
      .adjustStock({
        productId: product.id,
        branchId,
        quantity: signedQuantity,
        reason,
        type: type as 'MANUAL_ADJUSTMENT' | 'INTERNAL_CONSUMPTION' | 'WASTE',
      })
      .subscribe({
        next: () => {
          this.adjSaving.set(false);
          this.adjDialogVisible.set(false);
          const typeLabel = this.adjTypeOptions.find((t) => t.value === type)?.label ?? type;
          this.messageService.add({
            severity: 'success',
            summary: 'Ajuste registrado',
            detail: `${typeLabel}: ${signedQuantity > 0 ? '+' : ''}${signedQuantity} unidades de ${product.name}`,
          });
          this.loadProducts();
        },
        error: (err) => {
          this.adjSaving.set(false);
          this.adjError.set(getApiError(err)?.message ?? 'Error al ejecutar el ajuste');
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  protected formatQuantity(value: number): string {
    return Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin venc.';
    return new Date(value).toLocaleDateString('es-AR');
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private buildSortParam(field: string | undefined, order: number | undefined, defaultField: string): string | undefined {
    if (!field || ![1, -1].includes(order ?? 0)) {
      return `${defaultField},asc`;
    }
    return `${field},${order === 1 ? 'asc' : 'desc'}`;
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }

  private blankToNull(value: string): string | null {
    return value.trim() ? value.trim() : null;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
