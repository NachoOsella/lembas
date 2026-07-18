import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { MessageService } from 'primeng/api';

import { PurchaseOrderService } from '@features/suppliers/data-access/purchase-order';
import { SupplierService } from '@features/suppliers/data-access/supplier';
import { UserService } from '@features/users/data-access/user';
import { ErrorMappingService } from '@core/services/error-mapping';
import { getApiError } from '@shared/types/api-error';
import type {
  PurchaseOrderDetailDto,
  PurchaseOrderStatus,
  PurchaseOrderSummaryDto,
} from '@features/suppliers/domain/purchase-order';
import type { SupplierDto, SupplierProductDto } from '@features/suppliers/domain/supplier';
import type { Branch } from '@features/users/domain/user';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSelect } from '@shared/components/app-select/app-select';
import type { StatusBadgeConfig } from '@shared/components/status-badge/status-badge';
import { StatusBadge } from '@shared/components/status-badge/status-badge';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

interface DraftItem {
  readonly supplierProductId: number;
  readonly productName: string;
  readonly supplierSku?: string | null;
  quantityOrdered: number | null;
  unitCost: number | null;
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

/** Admin screen for creating supplier purchase orders and downloading their PDF. */
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
  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.css',
})
export class PurchaseOrders {
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly supplierService = inject(SupplierService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly orders = signal<PurchaseOrderSummaryDto[]>([]);
  protected readonly suppliers = signal<SupplierDto[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly supplierProducts = signal<SupplierProductDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingLookups = signal(false);
  protected readonly loadingProducts = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly dialogVisible = signal(false);
  protected readonly cancelDialogVisible = signal(false);
  protected readonly editingOrder = signal<PurchaseOrderDetailDto | null>(null);
  protected readonly orderToCancel = signal<PurchaseOrderSummaryDto | null>(null);
  protected readonly cancelReason = signal('');

  protected readonly first = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly supplierFilter = signal<number | null>(null);
  protected readonly branchFilter = signal<number | null>(null);
  protected readonly statusFilter = signal<PurchaseOrderStatus | null>(null);

  protected readonly supplierId = signal<number | null>(null);
  protected readonly branchId = signal<number | null>(null);
  protected readonly expectedDeliveryDate = signal<Date | null>(null);
  protected readonly notes = signal('');
  protected readonly selectedSupplierProductId = signal<number | null>(null);
  protected readonly draftItems = signal<DraftItem[]>([]);
  protected readonly submitted = signal(false);

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
    this.suppliers().map((supplier) => ({ label: supplier.name, value: supplier.id })),
  );
  protected readonly branchOptions = computed<Option<number>[]>(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly supplierProductOptions = computed<Option<number>[]>(() =>
    this.supplierProducts().map((item) => ({
      label: `${item.productName} - ${this.formatPrice(item.currentCost)}`,
      value: item.id,
    })),
  );
  protected readonly total = computed(() =>
    this.draftItems().reduce((sum, item) => sum + this.itemSubtotal(item), 0),
  );
  protected readonly formValid = computed(
    () =>
      !!this.supplierId() &&
      !!this.branchId() &&
      this.draftItems().length > 0 &&
      this.draftItems().every(
        (item) => (item.quantityOrdered ?? 0) > 0 && (item.unitCost ?? 0) >= 0,
      ),
  );

  constructor() {
    this.loadLookups();
    this.loadOrders();
  }

  /** Reloads the purchase order table. */
  protected loadOrders(): void {
    this.loading.set(true);
    this.error.set('');
    this.purchaseOrderService
      .list({
        supplierId: this.supplierFilter(),
        branchId: this.branchFilter(),
        status: this.statusFilter(),
        page: Math.floor(this.first() / this.pageSize()),
        size: this.pageSize(),
      })
      .subscribe({
        next: (page) => {
          this.orders.set(page.content);
          this.totalRecords.set(page.totalElements);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(this.messageForError(error, 'No pudimos cargar las ordenes de compra.'));
          this.loading.set(false);
        },
      });
  }

  /** Applies filters and returns to the first page. */
  protected applyFilters(): void {
    this.first.set(0);
    this.loadOrders();
  }

  /** Handles lazy pagination events from the data table. */
  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadOrders();
  }

  /** Opens an empty draft form. */
  protected openCreate(): void {
    this.editingOrder.set(null);
    this.supplierId.set(null);
    this.branchId.set(null);
    this.expectedDeliveryDate.set(null);
    this.notes.set('');
    this.selectedSupplierProductId.set(null);
    this.supplierProducts.set([]);
    this.draftItems.set([]);
    this.submitted.set(false);
    this.dialogVisible.set(true);
  }

  /** Loads an order and opens it in edit mode when it is still a draft. */
  protected openEdit(order: PurchaseOrderSummaryDto): void {
    this.purchaseOrderService.get(order.id).subscribe({
      next: (detail) => {
        this.editingOrder.set(detail);
        this.supplierId.set(detail.supplierId);
        this.branchId.set(detail.branchId);
        this.expectedDeliveryDate.set(
          detail.expectedDeliveryDate ? new Date(`${detail.expectedDeliveryDate}T00:00:00`) : null,
        );
        this.notes.set(detail.notes ?? '');
        this.draftItems.set(
          detail.items.map((item) => ({
            supplierProductId: item.supplierProductId,
            productName: item.productName,
            supplierSku: item.supplierSku,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
          })),
        );
        this.submitted.set(false);
        this.dialogVisible.set(true);
        this.loadSupplierProducts(detail.supplierId);
      },
      error: (error) =>
        this.error.set(this.messageForError(error, 'No pudimos abrir la orden de compra.')),
    });
  }

  /** Reacts to supplier changes by loading associated products and clearing incompatible items. */
  protected onSupplierChange(value: number | null): void {
    this.supplierId.set(value);
    this.selectedSupplierProductId.set(null);
    this.draftItems.set([]);
    if (value) {
      this.loadSupplierProducts(value);
    } else {
      this.supplierProducts.set([]);
    }
  }

  /** Adds the selected supplier product as a draft order item with current cost preloaded. */
  protected addSelectedItem(): void {
    const supplierProductId = this.selectedSupplierProductId();
    if (
      !supplierProductId ||
      this.draftItems().some((item) => item.supplierProductId === supplierProductId)
    ) {
      return;
    }
    const supplierProduct = this.supplierProducts().find((item) => item.id === supplierProductId);
    if (!supplierProduct) {
      return;
    }
    this.draftItems.update((items) => [
      ...items,
      {
        supplierProductId: supplierProduct.id,
        productName: supplierProduct.productName,
        supplierSku: supplierProduct.supplierSku,
        quantityOrdered: 1,
        unitCost: supplierProduct.currentCost,
      },
    ]);
    this.selectedSupplierProductId.set(null);
  }

  /** Removes one draft item by supplier-product id. */
  protected removeItem(supplierProductId: number): void {
    this.draftItems.update((items) =>
      items.filter((item) => item.supplierProductId !== supplierProductId),
    );
  }

  /** Persists the create or update form. */
  protected save(): void {
    this.submitted.set(true);
    if (!this.formValid()) {
      return;
    }
    const supplierId = this.supplierId();
    const branchId = this.branchId();
    if (!supplierId || !branchId) {
      return;
    }
    this.saving.set(true);
    const request = {
      supplierId,
      branchId,
      expectedDeliveryDate: this.formatDate(this.expectedDeliveryDate()),
      notes: this.notes().trim() || null,
      items: this.draftItems().map((item) => ({
        supplierProductId: item.supplierProductId,
        quantityOrdered: Number(item.quantityOrdered),
        unitCost: Number(item.unitCost),
      })),
    };
    const current = this.editingOrder();
    const action = current
      ? this.purchaseOrderService.update(current.id, request)
      : this.purchaseOrderService.create(request);
    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Orden guardada',
          detail: 'La orden de compra fue actualizada.',
        });
        this.loadOrders();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(this.messageForError(error, 'No pudimos guardar la orden de compra.'));
      },
    });
  }

  /** Confirms a draft order. */
  protected confirm(order: PurchaseOrderSummaryDto): void {
    this.purchaseOrderService.confirm(order.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Orden confirmada',
          detail: 'La orden ya puede enviarse al proveedor.',
        });
        this.loadOrders();
      },
      error: (error) =>
        this.error.set(this.messageForError(error, 'No pudimos confirmar la orden.')),
    });
  }

  /** Marks an order as sent manually. */
  protected markSent(order: PurchaseOrderSummaryDto): void {
    this.purchaseOrderService.send(order.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Orden enviada',
          detail: 'La orden fue marcada como enviada manualmente.',
        });
        this.loadOrders();
      },
      error: (error) =>
        this.error.set(this.messageForError(error, 'No pudimos marcar la orden como enviada.')),
    });
  }

  /** Opens the cancel dialog for an order. */
  protected openCancel(order: PurchaseOrderSummaryDto): void {
    this.orderToCancel.set(order);
    this.cancelReason.set('');
    this.cancelDialogVisible.set(true);
  }

  /** Cancels the selected purchase order. */
  protected cancelSelected(): void {
    const order = this.orderToCancel();
    if (!order) {
      return;
    }
    this.purchaseOrderService
      .cancel(order.id, { reason: this.cancelReason().trim() || null })
      .subscribe({
        next: () => {
          this.cancelDialogVisible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Orden cancelada',
            detail: 'La orden de compra fue cancelada.',
          });
          this.loadOrders();
        },
        error: (error) =>
          this.error.set(this.messageForError(error, 'No pudimos cancelar la orden.')),
      });
  }

  /** Downloads the order PDF for manual sending to the supplier. */
  protected downloadPdf(order: PurchaseOrderSummaryDto): void {
    this.purchaseOrderService.downloadPdf(order.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `purchase-order-${order.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => this.error.set(this.messageForError(error, 'No pudimos descargar el PDF.')),
    });
  }

  /** Returns true when an order can still be edited. */
  protected canEdit(order: PurchaseOrderSummaryDto): boolean {
    return order.status === 'DRAFT';
  }

  /** Returns true when an order can be confirmed. */
  protected canConfirm(order: PurchaseOrderSummaryDto): boolean {
    return order.status === 'DRAFT';
  }

  /** Returns true when an order can be marked as sent. */
  protected canSend(order: PurchaseOrderSummaryDto): boolean {
    return order.status === 'CONFIRMED';
  }

  /** Returns true when an order can be cancelled. */
  protected canCancel(order: PurchaseOrderSummaryDto): boolean {
    return order.status === 'DRAFT' || order.status === 'CONFIRMED' || order.status === 'SENT';
  }

  /** Computes a draft item subtotal. */
  protected itemSubtotal(item: DraftItem): number {
    return Number(item.quantityOrdered ?? 0) * Number(item.unitCost ?? 0);
  }

  /** Formats a purchase order status for Spanish UI copy. */
  protected statusLabel(status: PurchaseOrderStatus): string {
    return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
  }

  /** Formats a money value for the admin UI. */
  protected formatPrice(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
      value ?? 0,
    );
  }

  /** Loads supplier and branch selectors. */
  private loadLookups(): void {
    this.loadingLookups.set(true);
    this.supplierService.listSuppliers({ page: 0, size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this.suppliers.set(page.content);
        this.loadingLookups.set(false);
      },
      error: () => this.loadingLookups.set(false),
    });
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.error.set('No pudimos cargar las sucursales.'),
    });
  }

  /** Loads active products associated with a supplier. */
  private loadSupplierProducts(supplierId: number): void {
    this.loadingProducts.set(true);
    this.supplierService
      .listSupplierProducts({ supplierId, page: 0, size: 100, sort: 'productName,asc' })
      .subscribe({
        next: (page) => {
          this.supplierProducts.set(page.content);
          this.loadingProducts.set(false);
        },
        error: () => {
          this.supplierProducts.set([]);
          this.loadingProducts.set(false);
        },
      });
  }

  /** Converts a Date to backend LocalDate format. */
  private formatDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Maps backend API errors to Spanish copy. */
  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) {
      return fallback;
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(apiError);
    }
    return this.errorMapping.getMessage(apiError.code);
  }
}
