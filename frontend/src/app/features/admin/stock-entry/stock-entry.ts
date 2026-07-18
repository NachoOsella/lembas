import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { MessageService } from 'primeng/api';

import { InventoryService } from '@features/inventory/data-access/inventory';
import { PurchaseOrderService } from '@features/suppliers/data-access/purchase-order';
import { ErrorMappingService } from '@core/services/error-mapping';
import { getApiError } from '@shared/types/api-error';
import type {
  PurchaseOrderDetailDto,
  PurchaseOrderItemDto,
  PurchaseOrderSummaryDto,
} from '@features/suppliers/domain/purchase-order';
import type { PurchaseReceiptDto } from '@features/inventory/domain/inventory';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSelect } from '@shared/components/app-select/app-select';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
interface Option<T> {
  readonly label: string;
  readonly value: T;
}

interface ReceiptRow {
  readonly purchaseOrderItemId: number;
  readonly productName: string;
  readonly productBarcode?: string | null;
  readonly orderedQuantity: number;
  readonly unitCost: number | null;
  quantityReceived: number | null;
  lotCode: string;
  expirationDate: Date | null;
}

/** Admin page for confirming purchase receipts and generating stock lots. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stock-entry',
  imports: [
    AppButton,
    AppControlField,
    AppDataTable,
    AppDatePicker,
    AppFormField,
    AppInput,
    AppInputNumber,
    AppPageHeader,
    AppSelect,
    ErrorAlert,
    FormsModule,
  ],
  templateUrl: './stock-entry.html',
  styleUrl: './stock-entry.css',
})
export class StockEntry {
  private readonly inventoryService = inject(InventoryService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);

  protected readonly loadingOrders = signal(false);
  protected readonly loadingOrderDetail = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly orders = signal<PurchaseOrderSummaryDto[]>([]);
  protected readonly selectedOrderId = signal<number | null>(null);
  protected readonly selectedOrder = signal<PurchaseOrderDetailDto | null>(null);
  protected readonly rows = signal<ReceiptRow[]>([]);
  protected readonly invoiceNumber = signal('');
  protected readonly notes = signal('');
  protected readonly confirmedReceipt = signal<PurchaseReceiptDto | null>(null);

  protected readonly receiptColumns: ColumnDef[] = [
    { field: 'productName', header: 'Producto', width: '18rem' },
    { field: 'orderedQuantity', header: 'Pedido', width: '6rem' },
    { field: 'quantityReceived', header: 'Recibido', width: '12rem' },
    { field: 'lotCode', header: 'Lote', width: '12rem' },
    { field: 'expirationDate', header: 'Vencimiento', width: '12rem' },
    { field: 'unitCost', header: 'Costo real', width: '12rem' },
  ];

  protected readonly orderOptions = computed<Option<number>[]>(() =>
    this.orders().map((order) => ({
      label: `#${order.id} - ${order.supplierName} - ${order.branchName}`,
      value: order.id,
    })),
  );

  protected readonly minExpirationDate = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  protected readonly selectedOrderDescription = computed(() => {
    const order = this.selectedOrder();
    if (!order) {
      return 'Selecciona una orden enviada para cargar las cantidades recibidas.';
    }
    return `${order.supplierName} · ${order.branchName} · estado ${order.status}`;
  });

  protected readonly totalReceived = computed(() =>
    this.rows().reduce((total, row) => total + Number(row.quantityReceived ?? 0), 0),
  );

  protected readonly hasReceivableRows = computed(() =>
    this.rows().some((row) => Number(row.quantityReceived ?? 0) > 0),
  );

  protected readonly formValid = computed(
    () =>
      !!this.selectedOrder() &&
      this.hasReceivableRows() &&
      this.rows().every((row) => this.rowValid(row)),
  );

  constructor() {
    this.loadOrders();
  }

  /** Loads purchase orders that can receive merchandise. */
  protected loadOrders(): void {
    this.loadingOrders.set(true);
    this.error.set('');
    this.purchaseOrderService
      .list({ status: 'SENT', page: 0, size: 50, sort: 'createdAt,desc' })
      .subscribe({
        next: (sentPage) => {
          this.purchaseOrderService
            .list({ status: 'PARTIALLY_RECEIVED', page: 0, size: 50, sort: 'createdAt,desc' })
            .subscribe({
              next: (partialPage) => {
                this.orders.set([...sentPage.content, ...partialPage.content]);
                this.loadingOrders.set(false);
              },
              error: (error) => this.handleLoadError(error),
            });
        },
        error: (error) => this.handleLoadError(error),
      });
  }

  /** Loads the selected order detail and initializes editable receipt rows. */
  protected selectOrder(orderId: number | null): void {
    this.selectedOrderId.set(orderId);
    this.selectedOrder.set(null);
    this.rows.set([]);
    this.confirmedReceipt.set(null);
    this.submitted.set(false);
    if (!orderId) {
      return;
    }

    this.loadingOrderDetail.set(true);
    this.error.set('');
    this.purchaseOrderService.get(orderId).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.rows.set(order.items.map((item) => this.toReceiptRow(item)));
        this.loadingOrderDetail.set(false);
      },
      error: (error) => {
        this.loadingOrderDetail.set(false);
        this.error.set(this.messageForError(error, 'No pudimos cargar la orden de compra.'));
      },
    });
  }

  /** Updates an editable row and triggers signal change detection. */
  protected updateRow(purchaseOrderItemId: number, patch: Partial<ReceiptRow>): void {
    this.confirmedReceipt.set(null);
    this.rows.update((rows) =>
      rows.map((row) =>
        row.purchaseOrderItemId === purchaseOrderItemId ? { ...row, ...patch } : row,
      ),
    );
  }

  /** Returns whether a row is invalid after submit. */
  protected rowInvalid(row: ReceiptRow): boolean {
    return this.submitted() && !this.rowValid(row);
  }

  /** Confirms the receipt and lets the backend create stock lots and movements. */
  protected save(): void {
    this.submitted.set(true);
    this.error.set('');
    this.confirmedReceipt.set(null);
    if (!this.formValid()) {
      return;
    }

    const order = this.selectedOrder();
    if (!order) {
      return;
    }

    this.submitting.set(true);
    this.inventoryService
      .createPurchaseReceipt({
        purchaseOrderId: order.id,
        invoiceNumber: this.invoiceNumber().trim() || null,
        notes: this.notes().trim() || null,
        items: this.rows()
          .filter((row) => Number(row.quantityReceived ?? 0) > 0)
          .map((row) => ({
            purchaseOrderItemId: row.purchaseOrderItemId,
            quantityReceived: Number(row.quantityReceived),
            unitCost: Number(row.unitCost),
            lotCode: row.lotCode.trim() || null,
            expirationDate: this.formatDate(row.expirationDate),
          })),
      })
      .subscribe({
        next: (receipt) => {
          this.submitting.set(false);
          this.confirmedReceipt.set(receipt);
          this.messageService.add({
            severity: 'success',
            summary: 'Recepcion confirmada',
            detail: `Se crearon ${receipt.items.length} lote(s) y movimientos de stock.`,
            life: 3500,
          });
          this.afterSuccessfulReceipt(receipt);
        },
        error: (error) => {
          this.submitting.set(false);
          this.error.set(this.messageForError(error, 'No pudimos confirmar la recepcion.'));
        },
      });
  }

  /** Builds a receipt row with defaults from the purchase-order item. */
  private toReceiptRow(item: PurchaseOrderItemDto): ReceiptRow {
    return {
      purchaseOrderItemId: item.id,
      productName: item.productName,
      productBarcode: item.productBarcode,
      orderedQuantity: item.quantityOrdered,
      unitCost: item.unitCost,
      quantityReceived: item.quantityOrdered,
      lotCode: '',
      expirationDate: null,
    };
  }

  /** Validates one row. Zero quantity rows are allowed because they are skipped. */
  private rowValid(row: ReceiptRow): boolean {
    const quantity = Number(row.quantityReceived ?? 0);
    return quantity >= 0 && quantity <= row.orderedQuantity && Number(row.unitCost ?? 0) >= 0;
  }

  /** Refreshes the order selector after a successful receipt. */
  private afterSuccessfulReceipt(receipt: PurchaseReceiptDto): void {
    if (receipt.purchaseOrderStatus === 'RECEIVED') {
      this.selectedOrderId.set(null);
      this.selectedOrder.set(null);
      this.rows.set([]);
    }
    this.invoiceNumber.set('');
    this.notes.set('');
    this.submitted.set(false);
    this.loadOrders();
  }

  /** Handles errors while loading the order selector data. */
  private handleLoadError(error: unknown): void {
    this.loadingOrders.set(false);
    this.error.set(
      this.messageForError(error, 'No pudimos cargar las ordenes pendientes de recepcion.'),
    );
  }

  /** Converts a Date to the backend LocalDate format. */
  private formatDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Maps backend ApiError codes to user-facing copy. */
  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) {
      return fallback;
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(apiError, this.fieldLabel);
    }
    return this.errorMapping.getMessage(apiError.code);
  }

  /** Translates backend validation field names to form labels. */
  private fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      purchaseOrderId: 'Orden de compra',
      invoiceNumber: 'Numero de factura/remito',
      notes: 'Notas',
      items: 'Items recibidos',
      purchaseOrderItemId: 'Item de orden',
      quantityReceived: 'Cantidad recibida',
      unitCost: 'Costo real',
      lotCode: 'Codigo de lote',
      expirationDate: 'Vencimiento',
    };
    return labels[field] ?? field;
  }
}
