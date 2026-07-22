import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, Subject, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import type { ProductSummary } from '@features/catalog/domain/product';
import { InventoryService } from '@features/inventory/data-access/inventory';
import type { ProductSummaryFilters } from '@features/inventory/data-access/inventory';
import type {
  StockProductSummaryDto,
  StockProductSummaryPage,
} from '@features/inventory/domain/inventory';
import {
  createStockAdjustmentRequest,
  createStockLotRequest,
  isStockAdjustmentFormValid,
  isStockLotFormValid,
  toProductSummaryRequest,
} from '@features/inventory/domain/inventory-page';
import type {
  InventoryProductFilters,
  StockAdjustmentFormValue,
  StockLotFormValue,
} from '@features/inventory/domain/inventory-page';
import { getApiError } from '@shared/types/api-error';

export type InventoryViewState = 'loading' | 'error' | 'empty' | 'data';

type SummaryResult =
  | { readonly kind: 'success'; readonly page: StockProductSummaryPage }
  | { readonly kind: 'error'; readonly message: string };

/** Page-scoped state and asynchronous effects for the inventory summary workflow. */
@Injectable()
export class InventoryPageStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);

  private readonly summaryRequests = new Subject<ProductSummaryFilters>();
  private readonly productSearchRequests = new Subject<string>();
  private readonly adjustmentStockRequests = new Subject<{
    readonly product: ProductSummary;
    readonly branchId: number;
  }>();

  private readonly _products = signal<StockProductSummaryDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _listError = signal('');
  private readonly _totalRecords = signal(0);
  private readonly _search = signal('');
  private readonly _selectedBranchId = signal<number | null>(null);
  private readonly _expiringSoon = signal(false);
  private readonly _first = signal(0);
  private readonly _pageSize = signal(10);
  private readonly _sortField = signal<string | undefined>(undefined);
  private readonly _sortOrder = signal<number | undefined>(undefined);
  private readonly _productSuggestions = signal<ProductSummary[]>([]);
  private readonly _adjustmentStockLabel = signal('');
  private readonly _createLotVisible = signal(false);
  private readonly _adjustmentVisible = signal(false);
  private readonly _lotSaving = signal(false);
  private readonly _adjustmentSaving = signal(false);
  private readonly _lotError = signal('');
  private readonly _adjustmentError = signal('');
  private readonly _adjustmentInitialProduct = signal<ProductSummary | null>(null);
  private readonly _adjustmentInitialBranchId = signal<number | null>(null);

  readonly products = this._products.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly listError = this._listError.asReadonly();
  readonly totalRecords = this._totalRecords.asReadonly();
  readonly searchValue = this._search.asReadonly();
  readonly selectedBranchId = this._selectedBranchId.asReadonly();
  readonly expiringSoon = this._expiringSoon.asReadonly();
  readonly first = this._first.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortOrder = this._sortOrder.asReadonly();
  readonly productSuggestions = this._productSuggestions.asReadonly();
  readonly adjustmentStockLabel = this._adjustmentStockLabel.asReadonly();
  readonly createLotVisible = this._createLotVisible.asReadonly();
  readonly adjustmentVisible = this._adjustmentVisible.asReadonly();
  readonly lotSaving = this._lotSaving.asReadonly();
  readonly adjustmentSaving = this._adjustmentSaving.asReadonly();
  readonly lotError = this._lotError.asReadonly();
  readonly adjustmentError = this._adjustmentError.asReadonly();
  readonly adjustmentInitialProduct = this._adjustmentInitialProduct.asReadonly();
  readonly adjustmentInitialBranchId = this._adjustmentInitialBranchId.asReadonly();
  readonly viewState = computed<InventoryViewState>(() => {
    if (this._listError()) {
      return 'error';
    }
    if (this._loading()) {
      return 'loading';
    }
    return this._products().length === 0 ? 'empty' : 'data';
  });

  constructor() {
    this.summaryRequests
      .pipe(
        tap(() => {
          this._loading.set(true);
          this._listError.set('');
        }),
        switchMap((request) =>
          this.inventoryService.listProductSummaries(request).pipe(
            map((page): SummaryResult => ({ kind: 'success', page })),
            catchError((error: unknown) =>
              of<SummaryResult>({
                kind: 'error',
                message: this.messageForError(error, 'No pudimos cargar el inventario.'),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.applySummaryResult(result));

    this.productSearchRequests
      .pipe(
        switchMap((query) =>
          this.productService.listAdminProducts({ search: query, size: 10 }).pipe(
            map((page) => page.content),
            catchError(() => of<ProductSummary[]>([])),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((products) => this._productSuggestions.set(products));

    this.adjustmentStockRequests
      .pipe(
        switchMap(({ product, branchId }) =>
          this.inventoryService
            .listProductSummaries({ search: product.name, branchId, size: 20 })
            .pipe(
              map((page) => {
                const summary = page.content.find(
                  (item) => item.productId === product.id && item.branchId === branchId,
                );
                return this.stockLabel(summary?.totalAvailable ?? 0, product.name);
              }),
              catchError(() => of('')),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((label) => this._adjustmentStockLabel.set(label));
  }

  /** Requests the current page with the active filters. */
  loadProducts(): void {
    this.summaryRequests.next(this.summaryRequest());
  }

  /** Reloads the active query without changing pagination. */
  refresh(): void {
    this.loadProducts();
  }

  /** Applies a search and resets pagination. */
  search(value: string): void {
    this._search.set(value);
    this.resetToFirstPage();
    this.loadProducts();
  }

  /** Applies the selected branch and resets pagination. */
  selectBranch(branchId: number | null): void {
    this._selectedBranchId.set(branchId);
    this.resetToFirstPage();
    this.loadProducts();
  }

  /** Applies the expiring-soon filter and resets pagination. */
  setExpiringSoon(value: boolean): void {
    this._expiringSoon.set(value);
    this.resetToFirstPage();
    this.loadProducts();
  }

  /** Applies data-table pagination. */
  changePage(event: { readonly first: number; readonly rows: number }): void {
    this._first.set(event.first);
    this._pageSize.set(event.rows);
    this.loadProducts();
  }

  /** Applies a supported sort direction and resets pagination. */
  changeSort(event: { readonly field: string; readonly order: number }): void {
    this.resetToFirstPage();
    if ([1, -1].includes(event.order)) {
      this._sortField.set(event.field);
      this._sortOrder.set(event.order);
    } else {
      this._sortField.set(undefined);
      this._sortOrder.set(undefined);
    }
    this.loadProducts();
  }

  /** Opens a fresh direct-lot form, optionally preselecting the assigned branch. */
  openCreateLot(): void {
    this._lotError.set('');
    this._productSuggestions.set([]);
    this._createLotVisible.set(true);
  }

  /** Reflects a user-driven dialog close. */
  setCreateLotVisible(visible: boolean): void {
    this._createLotVisible.set(visible);
    if (!visible) {
      this._lotError.set('');
      this._productSuggestions.set([]);
    }
  }

  /** Submits a validated direct-lot command. */
  createLot(value: StockLotFormValue): void {
    if (!isStockLotFormValid(value)) {
      this._lotError.set('Completa todos los campos obligatorios.');
      return;
    }

    this._lotSaving.set(true);
    this._lotError.set('');
    this.inventoryService
      .createStockLot(createStockLotRequest(value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._lotSaving.set(false);
          this.setCreateLotVisible(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Lote creado',
            detail: 'El lote de stock fue registrado correctamente.',
          });
          this.loadProducts();
        },
        error: (error: unknown) => {
          this._lotSaving.set(false);
          this._lotError.set(this.messageForError(error, 'No pudimos crear el lote.'));
        },
      });
  }

  /** Opens an adjustment prefilled from the selected product-branch summary. */
  openAdjustment(item: StockProductSummaryDto): void {
    this._adjustmentError.set('');
    this._productSuggestions.set([]);
    this._adjustmentInitialProduct.set({
      id: item.productId,
      name: item.productName,
      salePrice: 0,
      onlineStatus: 'PUBLISHED',
      categoryId: 0,
      categoryName: '',
    });
    this._adjustmentInitialBranchId.set(item.branchId);
    this._adjustmentStockLabel.set('');
    this._adjustmentVisible.set(true);
    this.requestAdjustmentStock(this._adjustmentInitialProduct(), item.branchId);
  }

  /** Reflects a user-driven adjustment dialog close and clears transient errors. */
  setAdjustmentVisible(visible: boolean): void {
    this._adjustmentVisible.set(visible);
    if (!visible) {
      this._adjustmentError.set('');
      this._adjustmentStockLabel.set('');
      this._productSuggestions.set([]);
    }
  }

  /** Closes the adjustment dialog for explicit cancellation. */
  closeAdjustment(): void {
    this.setAdjustmentVisible(false);
  }

  /** Loads autocomplete suggestions; short queries intentionally clear stale suggestions. */
  searchProducts(query: string): void {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      this._productSuggestions.set([]);
      return;
    }
    this.productSearchRequests.next(normalizedQuery);
  }

  /** Refreshes the stock label after an adjustment product or branch changes. */
  updateAdjustmentStock(product: ProductSummary | null, branchId: number | null): void {
    this._adjustmentStockLabel.set('');
    this.requestAdjustmentStock(product, branchId);
  }

  /** Submits a validated manual stock adjustment. */
  createAdjustment(value: StockAdjustmentFormValue): void {
    if (!isStockAdjustmentFormValid(value)) {
      this._adjustmentError.set('Completa todos los campos obligatorios.');
      return;
    }

    const request = createStockAdjustmentRequest(value);
    this._adjustmentSaving.set(true);
    this._adjustmentError.set('');
    this.inventoryService
      .adjustStock(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._adjustmentSaving.set(false);
          this.setAdjustmentVisible(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Ajuste registrado',
            detail: `${this.adjustmentTypeLabel(request.type)}: ${request.quantity > 0 ? '+' : ''}${request.quantity} unidades de ${value.product?.name ?? ''}`,
          });
          this.loadProducts();
        },
        error: (error: unknown) => {
          this._adjustmentSaving.set(false);
          this._adjustmentError.set(this.messageForError(error, 'No pudimos ejecutar el ajuste.'));
        },
      });
  }

  private applySummaryResult(result: SummaryResult): void {
    this._loading.set(false);
    if (result.kind === 'error') {
      this._listError.set(result.message);
      return;
    }

    this._products.set(result.page.content);
    this._totalRecords.set(result.page.totalElements);
  }

  private summaryRequest(): ProductSummaryFilters {
    const filters: InventoryProductFilters = {
      search: this._search(),
      branchId: this._selectedBranchId(),
      expiringSoon: this._expiringSoon(),
      first: this._first(),
      pageSize: this._pageSize(),
      sortField: this._sortField(),
      sortOrder: this._sortOrder(),
    };
    return toProductSummaryRequest(filters);
  }

  private requestAdjustmentStock(product: ProductSummary | null, branchId: number | null): void {
    if (!product || branchId === null) {
      return;
    }
    this.adjustmentStockRequests.next({ product, branchId });
  }

  private resetToFirstPage(): void {
    this._first.set(0);
  }

  private stockLabel(quantity: number, productName: string): string {
    const formattedQuantity = Number(quantity).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
    return `Stock actual: ${formattedQuantity} unidades de ${productName}`;
  }

  private adjustmentTypeLabel(type: StockAdjustmentFormValue['type']): string {
    const labels: Record<StockAdjustmentFormValue['type'], string> = {
      MANUAL_ADJUSTMENT: 'Ajuste manual',
      INTERNAL_CONSUMPTION: 'Consumo interno',
      WASTE: 'Merma',
    };
    return labels[type];
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code) : fallback;
  }
}
