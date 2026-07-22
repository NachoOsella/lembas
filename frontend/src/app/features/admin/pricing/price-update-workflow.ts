import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import type { PriceUpdateBatchItemDto } from '@features/suppliers/domain/price-update-batch';
import type { EditablePriceRow } from '@features/suppliers/domain/price-update-page';
import { PriceUpdatePageStore } from '@features/suppliers/public-api';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppCheckOption } from '@shared/components/app-check-option/app-check-option';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '@features/catalog/public-api';
import { AppSelect } from '@shared/components/app-select/app-select';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';
import type { StatusBadgeConfig } from '@shared/components/status-badge/status-badge';
import { StatusBadge } from '@shared/components/status-badge/status-badge';

const ITEM_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  CREATE: { label: 'Crear', tone: 'info', icon: 'pi pi-plus' },
  UPDATE: { label: 'Actualizar', tone: 'warning', icon: 'pi pi-pencil' },
  UNCHANGED: { label: 'Sin cambio', tone: 'neutral', icon: 'pi pi-minus' },
  REVIEW: { label: 'Revisar', tone: 'warning', icon: 'pi pi-exclamation-triangle' },
  EXCLUDED: { label: 'Excluido', tone: 'neutral', icon: 'pi pi-ban' },
  ERROR: { label: 'Error', tone: 'danger', icon: 'pi pi-times-circle' },
};

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

const BATCH_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  DRAFT: { label: 'Borrador', tone: 'neutral', icon: 'pi pi-file' },
  VALIDATED: { label: 'Validado', tone: 'info', icon: 'pi pi-check' },
  APPLIED: { label: 'Aplicado', tone: 'success', icon: 'pi pi-check-circle' },
  CANCELLED: { label: 'Cancelado', tone: 'danger', icon: 'pi pi-times' },
};

/** Admin page shell for the reviewed supplier pricing workflow. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-price-update-workflow',
  imports: [
    AppButton,
    AppCheckOption,
    AppControlField,
    AppDataTable,
    AppFormField,
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
  providers: [PriceUpdatePageStore],
  templateUrl: './price-update-workflow.html',
  styleUrl: './price-update-workflow.css',
})
export class PriceUpdateWorkflow {
  private readonly store = inject(PriceUpdatePageStore);

  protected readonly allSuppliers = this.store.allSuppliers;
  protected readonly productSuggestions = this.store.productSuggestions;
  protected readonly loading = this.store.loading;
  protected readonly loadingLookups = this.store.loadingLookups;
  protected readonly saving = this.store.saving;
  protected readonly error = this.store.error;
  protected readonly batch = this.store.batch;
  protected readonly rows = this.store.rows;
  protected readonly confirmApplyVisible = this.store.confirmApplyVisible;
  protected readonly supplierId = this.store.supplierId;
  protected readonly defaultMargin = this.store.defaultMargin;
  protected readonly applyCostUpdates = this.store.applyCostUpdates;
  protected readonly applySalePriceUpdates = this.store.applySalePriceUpdates;
  protected readonly excludeUnchanged = this.store.excludeUnchanged;
  protected readonly notes = this.store.notes;
  protected readonly fileToImport = this.store.fileToImport;
  protected readonly manualSku = this.store.manualSku;
  protected readonly manualBarcode = this.store.manualBarcode;
  protected readonly manualProduct = this.store.manualProduct;
  protected readonly manualProductName = this.store.manualProductName;
  protected readonly manualCost = this.store.manualCost;
  protected readonly supplierOptions = this.store.supplierOptions;
  protected readonly tableRows = this.store.tableRows;
  protected readonly canApply = this.store.canApply;
  protected readonly hasBlockingItems = this.store.hasBlockingItems;
  protected readonly hasUnapprovedCreates = this.store.hasUnapprovedCreates;
  protected readonly itemStatusBadges = ITEM_STATUS_BADGES;
  protected readonly batchStatusBadges = BATCH_STATUS_BADGES;
  protected readonly errorMessageTranslations = ERROR_MESSAGE_TRANSLATIONS;
  protected readonly priceRowTrackBy = (_index: number, item: { readonly row: EditablePriceRow }) =>
    item.row.id;
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

  constructor() {
    this.store.loadInitial();
  }

  protected onFileSelected(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (this.supplierId() === null) {
      this.fileToImport.set(null);
      this.error.set('Selecciona un proveedor antes de importar el archivo.');
      return;
    }
    this.store.importSelectedFile(file);
  }

  protected onSupplierChanged(supplierId: number | null): void {
    this.store.onSupplierChanged(supplierId);
  }

  protected onProductSearch(query: string): void {
    this.store.onProductSearch(query);
  }

  protected onManualProductChange(
    product: Parameters<PriceUpdatePageStore['onManualProductChange']>[0],
  ): void {
    this.store.onManualProductChange(product);
  }

  protected importFile(): void {
    this.store.importFile();
  }

  protected createManualPreview(): void {
    this.store.createManualPreview();
  }

  protected saveDefaults(): void {
    this.store.saveDefaults();
  }

  protected applyDefaultsToAll(): void {
    this.store.applyDefaultsToAll();
  }

  protected saveAllRows(): void {
    this.store.saveAllRows();
  }

  protected excludeBlockingRows(): void {
    this.store.excludeBlockingRows();
  }

  protected approveAllCreates(): void {
    this.store.approveAllCreates();
  }

  protected applyBatch(): void {
    this.store.applyBatch();
  }

  protected confirmApplyBatch(): void {
    this.store.confirmApplyBatch();
  }

  protected cancelBatch(): void {
    this.store.cancelBatch();
  }

  protected onNewProductMarginChanged(value: number | null, row: EditablePriceRow): void {
    this.store.onNewProductMarginChanged(value, row);
  }

  protected onFinalPriceChanged(value: number | null, row: EditablePriceRow): void {
    this.store.onFinalPriceChanged(value, row);
  }

  protected onNewCostChanged(
    value: number | null,
    row: EditablePriceRow,
    _item: PriceUpdateBatchItemDto,
  ): void {
    this.store.onNewCostChanged(value, row);
  }
}
