import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { catchError, concatMap, from, last, map, of, Subject, switchMap } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import type { ProductSummary } from '@features/catalog/domain/product';
import { getApiError } from '@shared/types/api-error';
import { PriceUpdateBatchService } from '../data-access/price-update-batch';
import type {
  PriceUpdateBatchDetailDto,
  PriceUpdateBatchItemDto,
} from '../domain/price-update-batch';
import {
  createPriceBatchDefaults,
  marginFromSalePrice,
  salePriceFromMargin,
  toEditablePriceRow,
  toPriceRowRequest,
  type EditablePriceRow,
  type PriceTableRow,
} from '../domain/price-update-page';
import { SupplierService } from '../data-access/supplier';
import type { SupplierDto } from '../domain/supplier';

export type PriceUpdateViewState = 'loading' | 'error' | 'empty' | 'data';

/** Page-scoped state and effects for supplier price previews and application. */
@Injectable()
export class PriceUpdatePageStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly batches = inject(PriceUpdateBatchService);
  private readonly suppliers = inject(SupplierService);
  private readonly products = inject(ProductService);
  private readonly messages = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  private readonly productSearchRequests = new Subject<string>();

  private readonly _allSuppliers = signal<SupplierDto[]>([]);
  private readonly _productSuggestions = signal<ProductSummary[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingLookups = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal('');
  private readonly _batch = signal<PriceUpdateBatchDetailDto | null>(null);
  private readonly _rows = signal<EditablePriceRow[]>([]);

  readonly allSuppliers = this._allSuppliers;
  readonly productSuggestions = this._productSuggestions;
  readonly loading = this._loading;
  readonly loadingLookups = this._loadingLookups;
  readonly saving = this._saving;
  readonly error = this._error;
  readonly batch = this._batch;
  readonly rows = this._rows;
  readonly supplierId = signal<number | null>(null);
  readonly defaultMargin = signal<number | null>(35);
  readonly applyCostUpdates = signal(true);
  readonly applySalePriceUpdates = signal(true);
  readonly excludeUnchanged = signal(true);
  readonly notes = signal('');
  readonly fileToImport = signal<File | null>(null);
  readonly manualSku = signal('');
  readonly manualBarcode = signal('');
  readonly manualProduct = signal<ProductSummary | null>(null);
  readonly manualProductName = signal('');
  readonly manualCost = signal<number | null>(null);
  readonly confirmApplyVisible = signal(false);

  readonly supplierOptions = computed(() =>
    this._allSuppliers().map((supplier) => ({ label: supplier.name, value: supplier.id })),
  );
  readonly tableRows = computed<PriceTableRow[]>(() => {
    const current = this._batch();
    if (!current) return [];
    const rowsById = new Map(this._rows().map((row) => [row.id, row]));
    return current.items
      .filter((item) => item.status !== 'EXCLUDED')
      .map((item) => ({ item, row: rowsById.get(item.id) ?? toEditablePriceRow(item) }));
  });
  readonly canApply = computed(() => {
    const current = this._batch();
    if (!current || current.status === 'APPLIED' || current.status === 'CANCELLED') return false;
    return !current.items.some(
      (item) =>
        item.status === 'REVIEW' ||
        item.status === 'ERROR' ||
        (item.status === 'CREATE' && !item.createProduct),
    );
  });
  readonly hasBlockingItems = computed(() => {
    const current = this._batch();
    return (
      current?.items.some((item) => item.status === 'REVIEW' || item.status === 'ERROR') ?? false
    );
  });
  readonly hasUnapprovedCreates = computed(() => {
    const current = this._batch();
    return current?.items.some((item) => item.status === 'CREATE' && !item.createProduct) ?? false;
  });
  readonly viewState = computed<PriceUpdateViewState>(() => {
    if (this._error()) return 'error';
    if (this._loading() || this._saving()) return 'loading';
    return this._batch() ? 'data' : 'empty';
  });

  constructor() {
    this.productSearchRequests
      .pipe(
        switchMap((query) =>
          this.products.listAdminProducts({ search: query, size: 10 }).pipe(
            map((page) => page.content),
            catchError(() => of<ProductSummary[]>([])),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((products) => this._productSuggestions.set(products));
  }

  /** Loads suppliers for the workflow selectors. */
  loadInitial(): void {
    this._loadingLookups.set(true);
    this.suppliers.listSuppliers({ page: 0, size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this._allSuppliers.set(page.content);
        this._loadingLookups.set(false);
      },
      error: (error: unknown) => {
        this._allSuppliers.set([]);
        this._loadingLookups.set(false);
        this._error.set(this.messageForError(error, 'No pudimos cargar los proveedores.'));
      },
    });
  }

  /** Stores the selected supplier and clears dependent manual-entry values. */
  onSupplierChanged(supplierId: number | null): void {
    if (this.supplierId() === supplierId) return;
    this.supplierId.set(supplierId);
    this.clearManualRow();
  }

  /** Searches products with latest-request-wins behavior. */
  onProductSearch(query: string): void {
    const normalizedQuery = query.trim();
    if (!this.supplierId() || normalizedQuery.length < 2) {
      this._productSuggestions.set([]);
      return;
    }
    this.productSearchRequests.next(normalizedQuery);
  }

  /** Stores the selected product and copies its barcode when available. */
  onManualProductChange(product: ProductSummary | null): void {
    this.manualProduct.set(product);
    if (product?.barcode && !this.manualBarcode().trim()) {
      this.manualBarcode.set(product.barcode);
    }
  }

  /** Stores a selected supplier file and creates its preview. */
  importSelectedFile(file: File | null): void {
    this.fileToImport.set(file);
    if (file) this.importFile();
  }

  /** Creates a preview from the selected CSV/XLSX file. */
  importFile(): void {
    const supplierId = this.supplierId();
    const file = this.fileToImport();
    if (supplierId === null || !file) {
      this._error.set('Selecciona proveedor y archivo CSV/XLSX.');
      return;
    }
    this._saving.set(true);
    this._error.set('');
    this.batches.importFile(supplierId, file, this.defaults(), this.notes()).subscribe({
      next: (batch) => this.setBatch(batch, 'Lista importada'),
      error: (error: unknown) =>
        this.handleError(error, 'No pudimos importar la lista del proveedor.'),
    });
  }

  /** Creates a one-row manual preview. */
  createManualPreview(): void {
    const supplierId = this.supplierId();
    const cost = this.manualCost();
    if (supplierId === null || cost === null || cost < 0) {
      this._error.set('Selecciona proveedor e ingresa un costo valido.');
      return;
    }
    this._saving.set(true);
    this._error.set('');
    this.batches
      .createManual({
        supplierId,
        defaults: this.defaults(),
        notes: this.notes().trim() || null,
        items: [
          {
            supplierSku: blankToNull(this.manualSku()),
            barcode: blankToNull(this.manualBarcode()),
            productName:
              blankToNull(this.manualProductName()) ?? this.manualProduct()?.name ?? null,
            newCost: cost,
          },
        ],
      })
      .subscribe({
        next: (batch) => this.setBatch(batch, 'Lote manual creado'),
        error: (error: unknown) => this.handleError(error, 'No pudimos crear el lote manual.'),
      });
  }

  /** Persists the current global defaults. */
  saveDefaults(): void {
    const current = this._batch();
    if (!current) return;
    this._saving.set(true);
    this.batches.updateDefaults(current.id, this.defaults()).subscribe({
      next: (batch) => this.setBatch(batch, 'Defaults actualizados'),
      error: (error: unknown) => this.handleError(error, 'No pudimos actualizar los defaults.'),
    });
  }

  /** Applies global defaults to every row. */
  applyDefaultsToAll(): void {
    const current = this._batch();
    if (!current) return;
    this._saving.set(true);
    this.batches.applyDefaultsToAll(current.id).subscribe({
      next: (batch) => this.setBatch(batch, 'Defaults aplicados a todas las filas'),
      error: (error: unknown) => this.handleError(error, 'No pudimos aplicar los defaults.'),
    });
  }

  /** Saves all local row edits in deterministic order without nested subscriptions. */
  saveAllRows(): void {
    const current = this._batch();
    const rows = this._rows();
    if (!current || rows.length === 0) return;
    this._saving.set(true);
    from(rows)
      .pipe(
        concatMap((row, index) =>
          this.batches
            .updateItem(current.id, row.id, toPriceRowRequest(row))
            .pipe(map(() => index)),
        ),
        last(),
        switchMap(() => this.batches.get(current.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (batch) => this.setBatch(batch, 'Todas las filas guardadas'),
        error: (error: unknown) => this.handleError(error, 'No pudimos guardar las filas.'),
      });
  }

  /** Excludes all currently blocking rows in deterministic order. */
  excludeBlockingRows(): void {
    const current = this._batch();
    if (!current) return;
    const rows = this._rows().filter(
      (row) => this.getItemStatus(row.id) === 'REVIEW' || this.getItemStatus(row.id) === 'ERROR',
    );
    if (rows.length === 0) return;
    rows.forEach((row) => (row.excluded = true));
    this._saving.set(true);
    from(rows)
      .pipe(
        concatMap((row, index) =>
          this.batches
            .updateItem(current.id, row.id, toPriceRowRequest(row))
            .pipe(map(() => index)),
        ),
        last(),
        switchMap(() => this.batches.get(current.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (batch) => this.setBatch(batch, 'Filas problematicas excluidas'),
        error: (error: unknown) => this.handleError(error, 'No pudimos excluir las filas.'),
      });
  }

  /** Approves every unapproved CREATE row and persists them in sequence. */
  approveAllCreates(): void {
    const current = this._batch();
    if (!current) return;
    const rows = this._rows().filter(
      (row) => this.getItemStatus(row.id) === 'CREATE' && !row.createProduct,
    );
    if (rows.length === 0) return;
    rows.forEach((row) => (row.createProduct = true));
    this._rows.update((value) => [...value]);
    this._saving.set(true);
    from(rows)
      .pipe(
        concatMap((row, index) =>
          this.batches
            .updateItem(current.id, row.id, toPriceRowRequest(row))
            .pipe(map(() => index)),
        ),
        last(),
        switchMap(() => this.batches.get(current.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (batch) => this.setBatch(batch, 'Productos nuevos aprobados'),
        error: (error: unknown) =>
          this.handleError(error, 'No pudimos aprobar los productos nuevos.'),
      });
  }

  /** Opens the confirmation dialog when the batch is currently applicable. */
  applyBatch(): void {
    if (this._batch() && this.canApply()) this.confirmApplyVisible.set(true);
  }

  /** Applies the batch after explicit human confirmation. */
  confirmApplyBatch(): void {
    const current = this._batch();
    this.confirmApplyVisible.set(false);
    if (!current || !this.canApply()) return;
    this._saving.set(true);
    this.batches.apply(current.id).subscribe({
      next: (batch) => this.setBatch(batch, 'Lote aplicado'),
      error: (error: unknown) => this.handleError(error, 'No pudimos aplicar el lote.'),
    });
  }

  /** Cancels the current draft or validated batch. */
  cancelBatch(): void {
    const current = this._batch();
    if (!current) return;
    this._saving.set(true);
    this.batches.cancel(current.id).subscribe({
      next: (batch) => this.setBatch(batch, 'Lote cancelado'),
      error: (error: unknown) => this.handleError(error, 'No pudimos cancelar el lote.'),
    });
  }

  /** Recalculates sale price after a margin change. */
  onNewProductMarginChanged(value: number | null, row: EditablePriceRow): void {
    row.newProductMarginPercentage = value;
    row.finalSalePrice = salePriceFromMargin(row.newCost, value ?? this.defaultMargin());
    this._rows.update((rows) => [...rows]);
  }

  /** Derives margin after a final price change. */
  onFinalPriceChanged(value: number | null, row: EditablePriceRow): void {
    row.finalSalePrice = value;
    row.newProductMarginPercentage = marginFromSalePrice(row.newCost, value);
    this._rows.update((rows) => [...rows]);
  }

  /** Recalculates sale price after a cost change. */
  onNewCostChanged(value: number | null, row: EditablePriceRow): void {
    row.newCost = value;
    row.finalSalePrice = salePriceFromMargin(
      row.newCost,
      row.newProductMarginPercentage ?? this.defaultMargin(),
    );
    this._rows.update((rows) => [...rows]);
  }

  private defaults() {
    return createPriceBatchDefaults(
      this.defaultMargin(),
      this.applyCostUpdates(),
      this.applySalePriceUpdates(),
      this.excludeUnchanged(),
    );
  }

  private setBatch(batch: PriceUpdateBatchDetailDto, successSummary: string): void {
    this._batch.set(batch);
    this.defaultMargin.set(batch.defaultNewProductMarginPercentage ?? 35);
    this.applyCostUpdates.set(batch.applyCostUpdatesByDefault);
    this.applySalePriceUpdates.set(batch.applySalePriceUpdatesByDefault);
    this.excludeUnchanged.set(batch.excludeUnchangedByDefault);
    this._rows.set(batch.items.map((item) => toEditablePriceRow(item)));
    this._saving.set(false);
    this._loading.set(false);
    this._error.set('');
    this.messages.add({
      severity: 'success',
      summary: successSummary,
      detail: 'La operacion fue completada.',
    });
  }

  private getItemStatus(rowId: number): PriceUpdateBatchItemDto['status'] | undefined {
    return this._batch()?.items.find((item) => item.id === rowId)?.status;
  }

  private clearManualRow(): void {
    this.manualProduct.set(null);
    this._productSuggestions.set([]);
    this.manualSku.set('');
    this.manualBarcode.set('');
    this.manualProductName.set('');
    this.manualCost.set(null);
  }

  private handleError(error: unknown, fallback: string): void {
    this._saving.set(false);
    this._loading.set(false);
    this._error.set(this.messageForError(error, fallback));
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, fallback) : fallback;
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
