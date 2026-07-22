import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PurchaseOrdersPageStore } from '@features/suppliers/public-api';
import type { PurchaseOrderStatus } from '@features/suppliers/domain/purchase-order';
import type { SupplierDto, SupplierProductDto } from '@features/suppliers/domain/supplier';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSelect } from '@shared/components/app-select/app-select';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';
import type { StatusBadgeConfig } from '@shared/components/status-badge/status-badge';
import { StatusBadge } from '@shared/components/status-badge/status-badge';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

const STATUS_OPTIONS: Option<PurchaseOrderStatus>[] = [
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Confirmada', value: 'CONFIRMED' },
  { label: 'Enviada', value: 'SENT' },
  { label: 'Cancelada', value: 'CANCELLED' },
];

const PURCHASE_ORDER_STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  DRAFT: { label: 'Borrador', tone: 'neutral', icon: 'pi pi-pencil' },
  CONFIRMED: { label: 'Confirmada', tone: 'success', icon: 'pi pi-check' },
  SENT: { label: 'Enviada', tone: 'info', icon: 'pi pi-send' },
  PARTIALLY_RECEIVED: { label: 'Parcial', tone: 'warning', icon: 'pi pi-inbox' },
  RECEIVED: { label: 'Recibida', tone: 'success', icon: 'pi pi-box' },
  CANCELLED: { label: 'Cancelada', tone: 'danger', icon: 'pi pi-times' },
};

/** Admin page shell for purchase-order creation and lifecycle actions. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-purchase-orders',
  imports: [
    AppButton,
    AppControlField,
    AppDataTable,
    AppDatePicker,
    AppFormField,
    AppInputNumber,
    AppModal,
    AppPageHeader,
    AppSelect,
    ErrorAlert,
    FormSection,
    FormsModule,
    StatusBadge,
  ],
  providers: [PurchaseOrdersPageStore],
  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.css',
})
export class PurchaseOrders {
  private readonly store = inject(PurchaseOrdersPageStore);

  protected readonly orders = this.store.orders;
  protected readonly suppliers = this.store.suppliers;
  protected readonly branches = this.store.branches;
  protected readonly supplierProducts = this.store.supplierProducts;
  protected readonly loading = this.store.loading;
  protected readonly loadingLookups = this.store.loadingLookups;
  protected readonly loadingProducts = this.store.loadingProducts;
  protected readonly saving = this.store.saving;
  protected readonly error = this.store.error;
  protected readonly dialogVisible = this.store.dialogVisible;
  protected readonly cancelDialogVisible = this.store.cancelDialogVisible;
  protected readonly editingOrder = this.store.editingOrder;
  protected readonly orderToCancel = this.store.orderToCancel;
  protected readonly cancelReason = this.store.cancelReason;
  protected readonly first = this.store.first;
  protected readonly pageSize = this.store.pageSize;
  protected readonly totalRecords = this.store.totalRecords;
  protected readonly supplierFilter = this.store.supplierFilter;
  protected readonly branchFilter = this.store.branchFilter;
  protected readonly statusFilter = this.store.statusFilter;
  protected readonly supplierId = this.store.supplierId;
  protected readonly branchId = this.store.branchId;
  protected readonly expectedDeliveryDate = this.store.expectedDeliveryDate;
  protected readonly notes = this.store.notes;
  protected readonly selectedSupplierProductId = this.store.selectedSupplierProductId;
  protected readonly draftItems = this.store.draftItems;
  protected readonly submitted = this.store.submitted;
  protected readonly total = this.store.total;
  protected readonly formValid = this.store.formValid;

  protected readonly columns: ColumnDef[] = [
    { field: 'id', header: 'OC', sortable: true },
    { field: 'supplierName', header: 'Proveedor', sortable: true },
    { field: 'branchName', header: 'Sucursal', sortable: true },
    { field: 'status', header: 'Estado', sortable: true },
    { field: 'expectedDeliveryDate', header: 'Entrega', sortable: true },
    { field: 'total', header: 'Total', sortable: true },
    { field: 'actions', header: 'Acciones', sortable: false, width: '15rem' },
  ];
  protected readonly itemColumns: ColumnDef[] = [
    { field: 'productName', header: 'Producto', sortable: false },
    { field: 'quantityOrdered', header: 'Cantidad', sortable: false, width: '14rem' },
    { field: 'unitCost', header: 'Costo unitario', sortable: false, width: '16rem' },
    { field: 'subtotal', header: 'Subtotal', sortable: false, width: '10rem' },
    { field: 'actions', header: '', sortable: false, width: '4rem' },
  ];
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statusBadges = PURCHASE_ORDER_STATUS_BADGES;
  protected readonly supplierOptions = computed<Option<number>[]>(() =>
    this.suppliers().map((supplier: SupplierDto) => ({ label: supplier.name, value: supplier.id })),
  );
  protected readonly branchOptions = computed<Option<number>[]>(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly supplierProductOptions = computed<Option<number>[]>(() =>
    this.supplierProducts().map((item: SupplierProductDto) => ({
      label: `${item.productName} - ${this.formatPrice(item.currentCost)}`,
      value: item.id,
    })),
  );

  constructor() {
    this.store.loadInitial();
  }

  protected loadOrders(): void {
    this.store.loadOrders();
  }

  protected applyFilters(): void {
    this.store.applyFilters();
  }

  protected onPageChange(event: { first: number; rows: number }): void {
    this.store.onPageChange(event);
  }

  protected openCreate(): void {
    this.store.openCreate();
  }

  protected openEdit(order: Parameters<PurchaseOrdersPageStore['openEdit']>[0]): void {
    this.store.openEdit(order);
  }

  protected onSupplierChange(value: number | null): void {
    this.store.onSupplierChange(value);
  }

  protected addSelectedItem(): void {
    this.store.addSelectedItem();
  }

  protected removeItem(supplierProductId: number): void {
    this.store.removeItem(supplierProductId);
  }

  protected save(): void {
    this.store.save();
  }

  protected confirm(order: Parameters<PurchaseOrdersPageStore['confirm']>[0]): void {
    this.store.confirm(order);
  }

  protected markSent(order: Parameters<PurchaseOrdersPageStore['markSent']>[0]): void {
    this.store.markSent(order);
  }

  protected openCancel(order: Parameters<PurchaseOrdersPageStore['openCancel']>[0]): void {
    this.store.openCancel(order);
  }

  protected cancelSelected(): void {
    this.store.cancelSelected();
  }

  protected downloadPdf(order: Parameters<PurchaseOrdersPageStore['downloadPdf']>[0]): void {
    this.store.downloadPdf(order);
  }

  protected canEdit(order: Parameters<PurchaseOrdersPageStore['canEdit']>[0]): boolean {
    return this.store.canEdit(order);
  }

  protected canConfirm(order: Parameters<PurchaseOrdersPageStore['canConfirm']>[0]): boolean {
    return this.store.canConfirm(order);
  }

  protected canSend(order: Parameters<PurchaseOrdersPageStore['canSend']>[0]): boolean {
    return this.store.canSend(order);
  }

  protected canCancel(order: Parameters<PurchaseOrdersPageStore['canCancel']>[0]): boolean {
    return this.store.canCancel(order);
  }

  protected itemSubtotal(item: Parameters<PurchaseOrdersPageStore['itemSubtotal']>[0]): number {
    return this.store.itemSubtotal(item);
  }

  protected statusLabel(status: PurchaseOrderStatus): string {
    return this.store.statusLabel(status);
  }

  protected formatPrice(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
      value ?? 0,
    );
  }
}
