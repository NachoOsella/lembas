import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { PriceUpdateBatchService } from '../../../core/services/price-update-batch';
import { SupplierService } from '../../../core/services/supplier';
import { ProductService } from '../../../core/services/product';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { PriceUpdateBatchDetailDto, PriceUpdateBatchItemDto } from '../../../shared/models/price-update-batch';
import { ProductSummary } from '../../../shared/models/product';
import { SupplierDto } from '../../../shared/models/supplier';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppCheckbox } from '../../../shared/components/app-checkbox/app-checkbox';
import { AppControlField } from '../../../shared/components/app-control-field/app-control-field';
import { AppInput } from '../../../shared/components/app-input/app-input';
import { AppInputNumber } from '../../../shared/components/app-input-number/app-input-number';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '../../../shared/components/app-product-selector/app-product-selector';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../shared/components/form-section/form-section';
import { StatusBadge, StatusBadgeConfig } from '../../../shared/components/status-badge/status-badge';

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
  'Row must include SKU, barcode or product name': 'La fila debe incluir SKU, codigo de barras o nombre',
  'New supplier cost is required and must be numeric': 'El costo es obligatorio y debe ser numerico',
  'New supplier cost is required': 'El costo del proveedor es obligatorio',
  'Multiple products match this supplier row name': 'Multiples productos coinciden con este nombre',
  'Product name is required to create a new product': 'El nombre es obligatorio para crear un producto nuevo',
  'Matched product has no supplier association for this supplier': 'El producto no tiene asociacion con este proveedor',
  'New product margin must be lower than 100': 'El margen del producto nuevo debe ser menor a 100',
  'Existing product is missing current cost or sale price': 'El producto existente no tiene costo o precio de venta',
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
  transferPercentage: number | null;
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
  selector: 'app-price-update-workflow',
  imports: [
    AppButton,
    AppCheckbox,
    AppControlField,
    AppDataTable,
    AppInput,
    AppInputNumber,
    AppPageHeader,
    AppProductSelector,
    AppSelect,
    ConfirmDialog,
    CurrencyPipe,
    DatePipe,
    ErrorAlert,
    FormSection,
    FormsModule,
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
  protected readonly defaultTransfer = signal<number | null>(100);
  protected readonly roundingMultiple = signal<number | null>(100);
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
    return !current.items.some((item) => item.status === 'REVIEW' || item.status === 'ERROR' || (item.status === 'CREATE' && !item.createProduct));
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
    return current.items.map((item, index) => ({ item, row: this.rows()[index] }));
  });

  protected readonly tableColumns: ColumnDef[] = [
    { field: 'status', header: 'Estado', sortable: false },
    { field: 'supplierProduct', header: 'Producto proveedor', sortable: false },
    { field: 'match', header: 'Match', sortable: false },
    { field: 'codes', header: 'SKU / barcode', sortable: false },
    { field: 'cost', header: 'Costo', sortable: false },
    { field: 'variation', header: 'Variacion', sortable: false },
    { field: 'salePrice', header: 'Precio venta', sortable: false },
    { field: 'overrides', header: 'Overrides', sortable: false },
    { field: 'apply', header: 'Aplicar', sortable: false },
    { field: 'actions', header: 'Acciones', sortable: false },
  ];

  protected readonly itemStatusBadges = ITEM_STATUS_BADGES;
  protected readonly batchStatusBadges = BATCH_STATUS_BADGES;
  protected readonly errorMessageTranslations = ERROR_MESSAGE_TRANSLATIONS;

  constructor() {
    this.loadLookups();
  }

  /** Stores the selected supplier file and triggers import immediately. */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileToImport.set(file);
    input.value = '';
    if (file) {
      this.importFile();
    }
  }

  /** Searches products by name or barcode for manual entry autocomplete. */
  protected onProductSearch(query: string): void {
    if (query.length < 2) return;
    this.products.listAdminProducts({ search: query, size: 10 }).subscribe({
      next: (page) => this.productSuggestions.set(page.content),
    });
  }

  /** Populates manual fields when a product is selected from autocomplete. */
  protected onManualProductChange(product: ProductSummary | null): void {
    if (product) {
      this.manualBarcode.set(product.barcode ?? '');
      this.manualProductName.set(product.name);
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
            productName: this.blankToNull(this.manualProductName()),
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

  /** Saves one edited preview row. */
  protected saveRow(row: EditablePriceRow): void {
    const current = this.batch();
    if (!current) return;
    this.saving.set(true);
    this.batches
      .updateItem(current.id, row.id, this.rowRequest(row))
      .subscribe({
        next: (batch) => this.setBatch(batch, 'Fila actualizada'),
        error: (error) => this.handleError(error, 'No pudimos actualizar la fila.'),
      });
  }

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
    const blockingRows = this.rows().filter((row) => row.excluded === false && (this.getItemStatus(row.id) === 'REVIEW' || this.getItemStatus(row.id) === 'ERROR'));
    if (blockingRows.length === 0) return;
    this.saving.set(true);
    this.excludeNextRow(current.id, blockingRows, 0);
  }

  /** Approves all CREATE rows so the batch can be applied. */
  protected approveAllCreates(): void {
    const current = this.batch();
    if (!current) return;
    const createRows = this.rows().filter((row) => this.getItemStatus(row.id) === 'CREATE' && !row.createProduct);
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
      transferPercentage: row.transferPercentage,
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
    this.defaultTransfer.set(batch.defaultTransferPercentage ?? 100);
    this.roundingMultiple.set(batch.defaultRoundingMultiple ?? 100);
    this.applyCostUpdates.set(batch.applyCostUpdatesByDefault);
    this.applySalePriceUpdates.set(batch.applySalePriceUpdatesByDefault);
    this.excludeUnchanged.set(batch.excludeUnchangedByDefault);
    this.rows.set(batch.items.map((item) => this.toEditableRow(item)));
    this.saving.set(false);
    this.error.set('');
    this.messages.add({ severity: 'success', summary: successSummary, detail: 'La operacion fue completada.' });
  }

  /** Converts a backend row into local editable state. */
  private toEditableRow(item: PriceUpdateBatchItemDto): EditablePriceRow {
    return {
      id: item.id,
      supplierSku: item.supplierSku ?? '',
      barcode: item.barcode ?? '',
      productName: item.supplierProductName ?? item.productName ?? '',
      newCost: item.newCost ?? null,
      transferPercentage: item.transferPercentage ?? null,
      newProductMarginPercentage: item.newProductMarginPercentage ?? null,
      finalSalePrice: item.finalSalePrice ?? null,
      applyCostUpdate: item.applyCostUpdate,
      applySalePriceUpdate: item.applySalePriceUpdate,
      createProduct: item.createProduct,
      excluded: item.status === 'EXCLUDED',
    };
  }

  /** Builds the current defaults request. */
  private defaults() {
    return {
      newProductMarginPercentage: this.defaultMargin(),
      transferPercentage: this.defaultTransfer(),
      roundingMultiple: this.roundingMultiple(),
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
    this.error.set(apiError ? this.errorMapping.getMessage(apiError.code, apiError.message || fallback) : fallback);
  }

  /** Converts blank text into null before sending API requests. */
  private blankToNull(value: string): string | null {
    return value.trim() ? value.trim() : null;
  }
}
