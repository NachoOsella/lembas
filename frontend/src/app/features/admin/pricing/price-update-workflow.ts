import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MessageService } from 'primeng/api';

import { PriceUpdateBatchService } from '@features/suppliers/data-access/price-update-batch';
import { SupplierService } from '@features/suppliers/data-access/supplier';
import { ProductService } from '@features/catalog/data-access/product';
import { ErrorMappingService } from '@core/services/error-mapping';
import { getApiError } from '@shared/types/api-error';
import type {
  PriceUpdateBatchDetailDto,
  PriceUpdateBatchItemDto,
} from '@features/suppliers/domain/price-update-batch';
import type { ProductSummary } from '@features/catalog/domain/product';
import type { SupplierDto } from '@features/suppliers/domain/supplier';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppCheckOption } from '@shared/components/app-check-option/app-check-option';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '@features/catalog/ui/app-product-selector/app-product-selector';
import { AppSelect } from '@shared/components/app-select/app-select';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';
import type { StatusBadgeConfig } from '@shared/components/status-badge/status-badge';
import { StatusBadge } from '@shared/components/status-badge/status-badge';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

/** Status badge configuration for batch item statuses. */
const ITEM_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  CREATE: { label: 'Crear', tone: 'info', icon: 'pi pi-plus' },
  UPDATE: { label: 'Actualizar', tone: 'warning', icon: 'pi pi-pencil' },
  UNCHANGED: { label: 'Sin cambio', tone: 'neutral', icon: 'pi pi-minus' },
  REVIEW: { label: 'Revisar', tone: 'warning', icon: 'pi pi-exclamation-triangle' },
  EXCLUDED: { label: 'Excluido', tone: 'neutral', icon: 'pi pi-ban' },
  ERROR: { label: 'Error', tone: 'danger', icon: 'pi pi-times-circle' },
};

/** Translates backend per-row error messages to Spanish. */
const ERROR_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Row must include SKU, barcode or product name':
    'La fila debe incluir SKU, codigo de barras o nombre',
  'New supplier cost is required and must be numeric':
    'El costo es obligatorio y debe ser numerico',
  'New supplier cost is required': 'El costo del proveedor es obligatorio',
  'Multiple products match this supplier row name': 'Multiples productos coinciden con este nombre',
  'Product name is required to create a new product':
    'El nombre es obligatorio para crear un producto nuevo',
  'Matched product has no supplier association for this supplier':
    'El producto no tiene asociacion con este proveedor',
  'New product margin must be lower than 100': 'El margen del producto nuevo debe ser menor a 100',
  'Existing product is missing current cost or sale price':
    'El producto existente no tiene costo o precio de venta',
};

/** Status badge configuration for batch-level statuses. */
const BATCH_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  DRAFT: { label: 'Borrador', tone: 'neutral', icon: 'pi pi-file' },
  VALIDATED: { label: 'Validado', tone: 'info', icon: 'pi pi-check' },
  APPLIED: { label: 'Aplicado', tone: 'success', icon: 'pi pi-check-circle' },
  CANCELLED: { label: 'Cancelado', tone: 'danger', icon: 'pi pi-times' },
};

interface EditablePriceRow {
  readonly id: number;
  supplierSku: string;
  barcode: string;
  productName: string;
  newCost: number | null;
  newProductMarginPercentage: number | null;
  finalSalePrice: number | null;
  applyCostUpdate: boolean;
  applySalePriceUpdate: boolean;
  createProduct: boolean;
  excluded: boolean;
}

/** Table view-model that keeps immutable backend data and editable row state together. */
interface PriceTableRow {
  readonly item: PriceUpdateBatchItemDto;
  readonly row: EditablePriceRow;
}

/** Unified admin workflow for supplier file/manual catalog and price updates. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-price-update-workflow',
  imports: [
    AppButton,
    AppCheckOption,
    AppControlField,
    AppFormField,
    AppDataTable,
    AppInput,
    AppInputNumber,
    AppPageHeader,
    AppProductSelector,
    AppSelect,
    ConfirmDialog,
    DatePipe,
    ErrorAlert,
    FormSection,
    StatusBadge,
  ],
  templateUrl: './price-update-workflow.html',
  styleUrl: './price-update-workflow.css',
})
export class PriceUpdateWorkflow {
  private readonly batches = inject(PriceUpdateBatchService);
  private readonly suppliers = inject(SupplierService);
  private readonly products = inject(ProductService);
  private readonly messages = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly allSuppliers = signal<SupplierDto[]>([]);
  protected readonly productSuggestions = signal<ProductSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingLookups = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly batch = signal<PriceUpdateBatchDetailDto | null>(null);
  protected readonly rows = signal<EditablePriceRow[]>([]);
  protected readonly confirmApplyVisible = signal(false);

  protected readonly supplierId = signal<number | null>(null);
  protected readonly defaultMargin = signal<number | null>(35);
  protected readonly applyCostUpdates = signal(true);
  protected readonly applySalePriceUpdates = signal(true);
  protected readonly excludeUnchanged = signal(true);
  protected readonly notes = signal('');
  protected readonly fileToImport = signal<File | null>(null);

  protected readonly manualSku = signal('');
  protected readonly manualBarcode = signal('');
  protected readonly manualProduct = signal<ProductSummary | null>(null);
  protected readonly manualProductName = signal('');
  protected readonly manualCost = signal<number | null>(null);

  protected readonly canApply = computed(() => {
    const current = this.batch();
    if (!current || current.status === 'APPLIED' || current.status === 'CANCELLED') {
      return false;
    }
    return !current.items.some(
      (item) =>
        item.status === 'REVIEW' ||
        item.status === 'ERROR' ||
        (item.status === 'CREATE' && !item.createProduct),
    );
  });

  protected readonly hasBlockingItems = computed(() => {
    const current = this.batch();
    if (!current) return false;
    return current.items.some((item) => item.status === 'REVIEW' || item.status === 'ERROR');
  });

  protected readonly hasUnapprovedCreates = computed(() => {
    const current = this.batch();
    if (!current) return false;
    return current.items.some((item) => item.status === 'CREATE' && !item.createProduct);
  });

  /** Precomputed supplier options for AppSelect (label/value shape). */
  protected readonly supplierOptions = computed<Option<number>[]>(() =>
    this.allSuppliers().map((s) => ({ label: s.name, value: s.id })),
  );

  protected readonly tableRows = computed<PriceTableRow[]>(() => {
    const current = this.batch();
    if (!current) return [];
    const rowsMap = new Map(this.rows().map((r) => [r.id, r]));
    return current.items
      .filter((item) => item.status !== 'EXCLUDED')
      .map((item) => {
        const row = rowsMap.get(item.id) ?? this.toEditableRow(item);
        return { item, row };
      });
  });

  protected readonly tableColumns: ColumnDef[] = [
    { field: 'status', header: 'Estado', sortable: false, width: '9rem' },
    { field: 'supplierProduct', header: 'Producto proveedor', sortable: false, width: '13rem' },
    { field: 'codes', header: 'SKU / barcode', sortable: false, width: '12rem' },
    { field: 'cost', header: 'Costo', sortable: false, width: '11rem' },
    { field: 'variation', header: 'Variacion', sortable: false, width: '8rem' },
    { field: 'salePrice', header: 'Precio venta', sortable: false, width: '13rem' },
    { field: 'margin', header: 'Margen', sortable: false, width: '10rem' },
    { field: 'apply', header: 'Aplicar', sortable: false, width: '10rem' },
  ];

  protected readonly itemStatusBadges = ITEM_STATUS_BADGES;
  protected readonly batchStatusBadges = BATCH_STATUS_BADGES;
  protected readonly errorMessageTranslations = ERROR_MESSAGE_TRANSLATIONS;

  /** Stable row identity for PrimeNG trackBy — prevents unnecessary DOM recreation. */
  protected readonly priceRowTrackBy = (_index: number, item: PriceTableRow) => item.row.id;

  constructor() {
    this.loadLookups();
  }

  /** Stores the selected supplier file and triggers import immediately when a supplier is selected. */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!this.supplierId()) {
      this.fileToImport.set(null);
      this.error.set('Selecciona un proveedor antes de importar el archivo.');
      return;
    }
    this.fileToImport.set(file);
    if (file) {
      this.importFile();
    }
  }

  /** Updates the selected supplier and clears manual product data that depends on it. */
  protected onSupplierChanged(supplierId: number | null): void {
    if (this.supplierId() === supplierId) return;
    this.supplierId.set(supplierId);
    this.clearManualRow();
  }

  /** Searches products by name or barcode for manual entry autocomplete. */
  protected onProductSearch(query: string): void {
    if (!this.supplierId() || query.length < 2) return;
    this.products.listAdminProducts({ search: query, size: 10 }).subscribe({
      next: (page) => this.productSuggestions.set(page.content),
    });
  }

  /** Stores the selected product and copies only technical identifiers when available. */
  protected onManualProductChange(product: ProductSummary | null): void {
    this.manualProduct.set(product);
    if (!product) return;
    if (product.barcode && !this.manualBarcode().trim()) {
      this.manualBarcode.set(product.barcode);
    }
  }

  /** Creates a preview from a CSV/XLSX supplier list. */
  protected importFile(): void {
    const sid = this.supplierId();
    const file = this.fileToImport();
    if (!sid || !file) {
      this.error.set('Selecciona proveedor y archivo CSV/XLSX.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.batches.importFile(sid, file, this.defaults(), this.notes()).subscribe({
      next: (batch) => this.setBatch(batch, 'Lista importada'),
      error: (error) => this.handleError(error, 'No pudimos importar la lista del proveedor.'),
    });
  }

  /** Creates a one-row manual preview. */
  protected createManualPreview(): void {
    const sid = this.supplierId();
    if (!sid || !this.manualCost()) {
      this.error.set('Selecciona proveedor e ingresa un costo valido.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.batches
      .createManual({
        supplierId: sid,
        defaults: this.defaults(),
        notes: this.notes().trim() || null,
        items: [
          {
            supplierSku: this.blankToNull(this.manualSku()),
            barcode: this.blankToNull(this.manualBarcode()),
            productName:
              this.blankToNull(this.manualProductName()) ?? this.manualProduct()?.name ?? null,
            newCost: this.manualCost(),
          },
        ],
      })
      .subscribe({
        next: (batch) => this.setBatch(batch, 'Lote manual creado'),
        error: (error) => this.handleError(error, 'No pudimos crear el lote manual.'),
      });
  }

  /** Persists global defaults and recalculates the preview. */
  protected saveDefaults(): void {
    const current = this.batch();
    if (!current) return;
    this.saving.set(true);
    this.batches.updateDefaults(current.id, this.defaults()).subscribe({
      next: (batch) => this.setBatch(batch, 'Defaults actualizados'),
      error: (error) => this.handleError(error, 'No pudimos actualizar los defaults.'),
    });
  }

  /** Applies current defaults to every row. */
  protected applyDefaultsToAll(): void {
    const current = this.batch();
    if (!current) return;
    this.saving.set(true);
    this.batches.applyDefaultsToAll(current.id).subscribe({
      next: (batch) => this.setBatch(batch, 'Defaults aplicados a todas las filas'),
      error: (error) => this.handleError(error, 'No pudimos aplicar los defaults.'),
    });
  }

  /**
   * Saves one edited preview row and merges the server response.
   * Preserves unsaved edits on other rows while updating the saved row
   * and batch metadata (status, suggested prices, etc.) from the server.
   */
  /** Saves all editable preview rows sequentially. */
  protected saveAllRows(): void {
    const current = this.batch();
    if (!current) return;
    const allRows = this.rows();
    if (allRows.length === 0) return;
    this.saving.set(true);
    this.saveNextRow(current.id, allRows, 0);
  }

  /** Excludes all rows with REVIEW or ERROR status so the batch can be applied. */
  protected excludeBlockingRows(): void {
    const current = this.batch();
    if (!current) return;
    const blockingRows = this.rows().filter(
      (row) =>
        row.excluded === false &&
        (this.getItemStatus(row.id) === 'REVIEW' || this.getItemStatus(row.id) === 'ERROR'),
    );
    if (blockingRows.length === 0) return;
    this.saving.set(true);
    this.excludeNextRow(current.id, blockingRows, 0);
  }

  /** Approves all CREATE rows so the batch can be applied. */
  protected approveAllCreates(): void {
    const current = this.batch();
    if (!current) return;
    const createRows = this.rows().filter(
      (row) => this.getItemStatus(row.id) === 'CREATE' && !row.createProduct,
    );
    if (createRows.length === 0) return;
    createRows.forEach((row) => (row.createProduct = true));
    this.saving.set(true);
    this.saveNextRow(current.id, createRows, 0);
  }

  /** Applies the current batch after human confirmation. */
  protected applyBatch(): void {
    if (!this.batch() || !this.canApply()) return;
    this.confirmApplyVisible.set(true);
  }

  /** Applies the batch after the shared confirmation dialog is accepted. */
  protected confirmApplyBatch(): void {
    const current = this.batch();
    this.confirmApplyVisible.set(false);
    if (!current || !this.canApply()) return;
    this.saving.set(true);
    this.batches.apply(current.id).subscribe({
      next: (batch) => this.setBatch(batch, 'Lote aplicado'),
      error: (error) => this.handleError(error, 'No pudimos aplicar el lote.'),
    });
  }

  /** Cancels the current draft or validated batch. */
  protected cancelBatch(): void {
    const current = this.batch();
    if (!current) return;
    this.saving.set(true);
    this.batches.cancel(current.id).subscribe({
      next: (batch) => this.setBatch(batch, 'Lote cancelado'),
      error: (error) => this.handleError(error, 'No pudimos cancelar el lote.'),
    });
  }

  /** Recursively saves rows one at a time until all are done. */
  private saveNextRow(batchId: number, rows: EditablePriceRow[], index: number): void {
    if (index >= rows.length) {
      this.batches.get(batchId).subscribe({
        next: (batch) => this.setBatch(batch, 'Todas las filas guardadas'),
        error: (error) => this.handleError(error, 'No pudimos recargar el lote.'),
      });
      return;
    }
    this.batches.updateItem(batchId, rows[index].id, this.rowRequest(rows[index])).subscribe({
      next: () => this.saveNextRow(batchId, rows, index + 1),
      error: (error) => {
        this.handleError(error, `No pudimos guardar la fila ${index + 1}.`);
      },
    });
  }

  /** Recursively excludes blocking rows one at a time. */
  private excludeNextRow(batchId: number, rows: EditablePriceRow[], index: number): void {
    if (index >= rows.length) {
      this.batches.get(batchId).subscribe({
        next: (batch) => this.setBatch(batch, 'Filas problematicas excluidas'),
        error: (error) => this.handleError(error, 'No pudimos recargar el lote.'),
      });
      return;
    }
    const row = rows[index];
    row.excluded = true;
    this.batches.updateItem(batchId, row.id, this.rowRequest(row)).subscribe({
      next: () => this.excludeNextRow(batchId, rows, index + 1),
      error: (error) => this.handleError(error, `No pudimos excluir la fila ${index + 1}.`),
    });
  }

  /** Returns the original backend status for a row by its id. */
  private getItemStatus(rowId: number): string | undefined {
    const current = this.batch();
    if (!current) return undefined;
    return current.items.find((item) => item.id === rowId)?.status;
  }

  /** Builds the update request payload for a single row. */
  private rowRequest(row: EditablePriceRow) {
    return {
      supplierSku: this.blankToNull(row.supplierSku),
      barcode: this.blankToNull(row.barcode),
      productName: this.blankToNull(row.productName),
      newCost: row.newCost,
      newProductMarginPercentage: row.newProductMarginPercentage,
      finalSalePrice: row.finalSalePrice,
      applyCostUpdate: row.applyCostUpdate,
      applySalePriceUpdate: row.applySalePriceUpdate,
      createProduct: row.createProduct,
      status: row.excluded ? ('EXCLUDED' as const) : null,
    };
  }

  /** Loads suppliers for the supplier selector. */
  private loadLookups(): void {
    this.loadingLookups.set(true);
    this.suppliers.listSuppliers({ page: 0, size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this.allSuppliers.set(page.content);
        this.loadingLookups.set(false);
      },
      error: () => this.loadingLookups.set(false),
    });
  }

  /** Updates local preview state from the backend batch. */
  private setBatch(batch: PriceUpdateBatchDetailDto, successSummary: string): void {
    this.batch.set(batch);
    this.defaultMargin.set(batch.defaultNewProductMarginPercentage ?? 35);
    this.applyCostUpdates.set(batch.applyCostUpdatesByDefault);
    this.applySalePriceUpdates.set(batch.applySalePriceUpdatesByDefault);
    this.excludeUnchanged.set(batch.excludeUnchangedByDefault);
    this.rows.set(batch.items.map((item) => this.toEditableRow(item)));
    this.saving.set(false);
    this.error.set('');
    this.messages.add({
      severity: 'success',
      summary: successSummary,
      detail: 'La operacion fue completada.',
    });
  }

  /** Converts a backend row into local editable state. */
  private toEditableRow(item: PriceUpdateBatchItemDto): EditablePriceRow {
    return {
      id: item.id,
      supplierSku: item.supplierSku ?? '',
      barcode: item.barcode ?? '',
      productName: item.supplierProductName ?? item.productName ?? '',
      newCost: item.newCost ?? null,
      newProductMarginPercentage: item.newProductMarginPercentage ?? null,
      finalSalePrice: item.finalSalePrice ?? null,
      applyCostUpdate: item.applyCostUpdate,
      applySalePriceUpdate: item.applySalePriceUpdate,
      createProduct: item.createProduct,
      excluded: item.status === 'EXCLUDED',
    };
  }

  /**
   * Merges a server-updated batch into local state.
   * Preserves edits on unsaved rows; only refreshes the saved row and
   * batch-level metadata (status, suggested prices, variation, etc.).
   */
  /** Builds the current defaults request. */
  private defaults() {
    return {
      newProductMarginPercentage: this.defaultMargin(),
      applyCostUpdatesByDefault: this.applyCostUpdates(),
      applySalePriceUpdatesByDefault: this.applySalePriceUpdates(),
      excludeUnchangedByDefault: this.excludeUnchanged(),
    };
  }

  /** Maps backend or network errors to user-facing copy. */
  private handleError(error: unknown, fallback: string): void {
    this.saving.set(false);
    this.loading.set(false);
    const apiError = getApiError(error);
    this.error.set(apiError ? this.errorMapping.getMessage(apiError.code, fallback) : fallback);
  }

  // ---------------------------------------------------------------
  // Local recalc: instant feedback when any pricing input changes
  // ---------------------------------------------------------------

  /** Handles margin changes and recalculates the final sale price. */
  protected onNewProductMarginChanged(value: number | null, row: EditablePriceRow): void {
    row.newProductMarginPercentage = value;
    this.recalcFromMargin(row);
    this.rows.update((r) => [...r]);
  }

  /** Handles final sale price changes and derives the resulting margin. */
  protected onFinalPriceChanged(value: number | null, row: EditablePriceRow): void {
    row.finalSalePrice = value;
    this.deriveMargin(row);
    this.rows.update((r) => [...r]);
  }

  /** Handles new cost changes and recalculates the final sale price from margin. */
  protected onNewCostChanged(
    value: number | null,
    row: EditablePriceRow,
    _item: PriceUpdateBatchItemDto,
  ): void {
    row.newCost = value;
    this.recalcFromMargin(row);
    this.rows.update((r) => [...r]);
  }

  // ---------------------------------------------------------------
  // Core recalculation: margin ↔ price
  // ---------------------------------------------------------------

  /** Recalculates sale price from cost and margin: price = cost / (1 - margin%). */
  private recalcFromMargin(row: EditablePriceRow): void {
    if (row.newCost == null) return;
    const margin = row.newProductMarginPercentage ?? this.defaultMargin() ?? 35;
    if (margin < 0 || margin >= 100) return;
    const price = row.newCost / (1 - margin / 100);
    row.finalSalePrice = price > 0 ? Math.round(price * 100) / 100 : 0;
  }

  /** Derives margin from the current price and cost: margin% = (1 - cost/price) * 100.
   *  Clamped to zero — margin is never negative. */
  private deriveMargin(row: EditablePriceRow): void {
    const price = row.finalSalePrice;
    const cost = row.newCost;
    if (price == null || cost == null || price <= 0) return;
    const margin = (1 - cost / price) * 100;
    row.newProductMarginPercentage = Math.max(0, margin);
  }

  /** Clears manual row fields when the selected supplier changes. */
  private clearManualRow(): void {
    this.manualProduct.set(null);
    this.productSuggestions.set([]);
    this.manualSku.set('');
    this.manualBarcode.set('');
    this.manualProductName.set('');
    this.manualCost.set(null);
  }

  /** Converts blank text into null before sending API requests. */
  private blankToNull(value: string): string | null {
    return value.trim() ? value.trim() : null;
  }
}
