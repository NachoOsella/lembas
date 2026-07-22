import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { catchError, map, of, Subject, switchMap, tap } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';
import { getApiError } from '@shared/types/api-error';
import { PurchaseOrderService } from '../data-access/purchase-order';
import { SupplierService } from '../data-access/supplier';
import type {
  PurchaseOrderDetailDto,
  PurchaseOrderStatus,
  PurchaseOrderSummaryDto,
} from '../domain/purchase-order';
import type { SupplierDto, SupplierProductDto } from '../domain/supplier';
import {
  canCancelPurchaseOrder,
  canConfirmPurchaseOrder,
  canEditPurchaseOrder,
  canSendPurchaseOrder,
  createPurchaseOrderRequest,
  isPurchaseOrderFormValid,
  purchaseOrderItemSubtotal,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderDraftItem,
  type PurchaseOrderFormValue,
  type PurchaseOrderTableState,
} from '../domain/purchase-order-page';

export type PurchaseOrderViewState = 'loading' | 'error' | 'empty' | 'data';

type OrderListResult =
  | { readonly kind: 'success'; readonly orders: PurchaseOrderSummaryDto[]; readonly total: number }
  | { readonly kind: 'error'; readonly message: string };

/** Page-scoped state and effects for purchase-order listing and workflow actions. */
@Injectable()
export class PurchaseOrdersPageStore {
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly supplierService = inject(SupplierService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  private readonly orderRequests = new Subject<PurchaseOrderTableState>();
  private readonly supplierProductRequests = new Subject<number>();

  private readonly _orders = signal<PurchaseOrderSummaryDto[]>([]);
  private readonly _suppliers = signal<SupplierDto[]>([]);
  private readonly _branches = signal<Branch[]>([]);
  private readonly _supplierProducts = signal<SupplierProductDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingLookups = signal(false);
  private readonly _loadingProducts = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal('');
  private readonly _totalRecords = signal(0);

  readonly orders = this._orders;
  readonly suppliers = this._suppliers;
  readonly branches = this._branches;
  readonly supplierProducts = this._supplierProducts;
  readonly loading = this._loading;
  readonly loadingLookups = this._loadingLookups;
  readonly loadingProducts = this._loadingProducts;
  readonly saving = this._saving;
  readonly error = this._error;
  readonly totalRecords = this._totalRecords;
  readonly viewState = computed<PurchaseOrderViewState>(() => {
    if (this._error()) return 'error';
    if (this._loading()) return 'loading';
    return this._orders().length > 0 ? 'data' : 'empty';
  });

  readonly dialogVisible = signal(false);
  readonly cancelDialogVisible = signal(false);
  readonly editingOrder = signal<PurchaseOrderDetailDto | null>(null);
  readonly orderToCancel = signal<PurchaseOrderSummaryDto | null>(null);
  readonly cancelReason = signal('');
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly supplierFilter = signal<number | null>(null);
  readonly branchFilter = signal<number | null>(null);
  readonly statusFilter = signal<PurchaseOrderStatus | null>(null);
  readonly supplierId = signal<number | null>(null);
  readonly branchId = signal<number | null>(null);
  readonly expectedDeliveryDate = signal<Date | null>(null);
  readonly notes = signal('');
  readonly selectedSupplierProductId = signal<number | null>(null);
  readonly draftItems = signal<PurchaseOrderDraftItem[]>([]);
  readonly submitted = signal(false);
  readonly formValid = computed(() =>
    isPurchaseOrderFormValid({
      supplierId: this.supplierId(),
      branchId: this.branchId(),
      expectedDeliveryDate: this.expectedDeliveryDate(),
      notes: this.notes(),
      items: this.draftItems(),
    }),
  );
  readonly total = computed(() =>
    this.draftItems().reduce((sum, item) => sum + purchaseOrderItemSubtotal(item), 0),
  );

  constructor() {
    this.orderRequests
      .pipe(
        tap(() => {
          this._loading.set(true);
          this._error.set('');
        }),
        switchMap((state) =>
          this.purchaseOrderService
            .list({
              supplierId: state.supplierId,
              branchId: state.branchId,
              status: state.status,
              page: Math.floor(state.first / state.pageSize),
              size: state.pageSize,
            })
            .pipe(
              map(
                (page): OrderListResult => ({
                  kind: 'success',
                  orders: page.content,
                  total: page.totalElements,
                }),
              ),
              catchError((error: unknown) =>
                of<OrderListResult>({
                  kind: 'error',
                  message: this.messageForError(error, 'No pudimos cargar las ordenes de compra.'),
                }),
              ),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this._loading.set(false);
        if (result.kind === 'error') {
          this._error.set(result.message);
          return;
        }
        this._orders.set(result.orders);
        this._totalRecords.set(result.total);
      });

    this.supplierProductRequests
      .pipe(
        tap(() => {
          this._loadingProducts.set(true);
        }),
        switchMap((supplierId) =>
          this.supplierService
            .listSupplierProducts({ supplierId, page: 0, size: 100, sort: 'productName,asc' })
            .pipe(
              map((page) => page.content),
              catchError((error: unknown) => {
                this._error.set(this.messageForError(error, 'No pudimos cargar los productos.'));
                return of<SupplierProductDto[]>([]);
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((products) => {
        this._supplierProducts.set(products);
        this._loadingProducts.set(false);
      });
  }

  /** Loads lookup data and the current order page. */
  loadInitial(): void {
    this.loadLookups();
    this.loadOrders();
  }

  /** Reloads the current order page; superseded filter requests are cancelled. */
  loadOrders(): void {
    this.orderRequests.next({
      supplierId: this.supplierFilter(),
      branchId: this.branchFilter(),
      status: this.statusFilter(),
      first: this.first(),
      pageSize: this.pageSize(),
    });
  }

  /** Applies filters and returns to the first page. */
  applyFilters(): void {
    this.first.set(0);
    this.loadOrders();
  }

  /** Applies table pagination. */
  onPageChange(event: { readonly first: number; readonly rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadOrders();
  }

  /** Opens a fresh purchase-order draft. */
  openCreate(): void {
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

  /** Loads a draft order and opens the edit form. */
  openEdit(order: PurchaseOrderSummaryDto): void {
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
        this.supplierProductRequests.next(detail.supplierId);
      },
      error: (error: unknown) =>
        this._error.set(this.messageForError(error, 'No pudimos abrir la orden de compra.')),
    });
  }

  /** Changes supplier and clears lines that belong to another supplier. */
  onSupplierChange(value: number | null): void {
    this.supplierId.set(value);
    this.selectedSupplierProductId.set(null);
    this.draftItems.set([]);
    this._error.set('');
    if (value === null) {
      this.supplierProducts.set([]);
      return;
    }
    this.supplierProductRequests.next(value);
  }

  /** Adds the selected supplier product with its current replacement cost. */
  addSelectedItem(): void {
    const supplierProductId = this.selectedSupplierProductId();
    if (
      !supplierProductId ||
      this.draftItems().some((item) => item.supplierProductId === supplierProductId)
    ) {
      return;
    }
    const supplierProduct = this.supplierProducts().find((item) => item.id === supplierProductId);
    if (!supplierProduct) return;
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

  /** Removes one draft line. */
  removeItem(supplierProductId: number): void {
    this.draftItems.update((items) =>
      items.filter((item) => item.supplierProductId !== supplierProductId),
    );
  }

  /** Saves a draft order after pure validation and request adaptation. */
  save(): void {
    this.submitted.set(true);
    if (!this.formValid()) return;
    const value: PurchaseOrderFormValue = {
      supplierId: this.supplierId(),
      branchId: this.branchId(),
      expectedDeliveryDate: this.expectedDeliveryDate(),
      notes: this.notes(),
      items: this.draftItems(),
    };
    this._saving.set(true);
    this._error.set('');
    const current = this.editingOrder();
    const request = createPurchaseOrderRequest(value);
    const operation = current
      ? this.purchaseOrderService.update(current.id, request)
      : this.purchaseOrderService.create(request);
    operation.subscribe({
      next: () => {
        this._saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Orden guardada',
          detail: 'La orden de compra fue actualizada.',
        });
        this.loadOrders();
      },
      error: (error: unknown) => {
        this._saving.set(false);
        this._error.set(this.messageForError(error, 'No pudimos guardar la orden de compra.'));
      },
    });
  }

  /** Confirms a draft order. */
  confirm(order: PurchaseOrderSummaryDto): void {
    this.runOrderAction(
      order.id,
      'confirm',
      'Orden confirmada',
      'La orden ya puede enviarse al proveedor.',
      'No pudimos confirmar la orden.',
    );
  }

  /** Marks a confirmed order as sent. */
  markSent(order: PurchaseOrderSummaryDto): void {
    this.runOrderAction(
      order.id,
      'send',
      'Orden enviada',
      'La orden fue marcada como enviada manualmente.',
      'No pudimos marcar la orden como enviada.',
    );
  }

  /** Opens the cancellation dialog. */
  openCancel(order: PurchaseOrderSummaryDto): void {
    this.orderToCancel.set(order);
    this.cancelReason.set('');
    this.cancelDialogVisible.set(true);
  }

  /** Cancels the selected purchase order. */
  cancelSelected(): void {
    const order = this.orderToCancel();
    if (!order) return;
    this.purchaseOrderService
      .cancel(order.id, { reason: this.cancelReason().trim() || null })
      .subscribe({
        next: () => {
          this.cancelDialogVisible.set(false);
          this.orderToCancel.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Orden cancelada',
            detail: 'La orden de compra fue cancelada.',
          });
          this.loadOrders();
        },
        error: (error: unknown) =>
          this._error.set(this.messageForError(error, 'No pudimos cancelar la orden.')),
      });
  }

  /** Downloads the generated purchase-order PDF. */
  downloadPdf(order: PurchaseOrderSummaryDto): void {
    this.purchaseOrderService.downloadPdf(order.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `purchase-order-${order.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: unknown) =>
        this._error.set(this.messageForError(error, 'No pudimos descargar el PDF.')),
    });
  }

  canEdit(order: PurchaseOrderSummaryDto): boolean {
    return canEditPurchaseOrder(order.status);
  }

  canConfirm(order: PurchaseOrderSummaryDto): boolean {
    return canConfirmPurchaseOrder(order.status);
  }

  canSend(order: PurchaseOrderSummaryDto): boolean {
    return canSendPurchaseOrder(order.status);
  }

  canCancel(order: PurchaseOrderSummaryDto): boolean {
    return canCancelPurchaseOrder(order.status);
  }

  itemSubtotal(item: PurchaseOrderDraftItem): number {
    return purchaseOrderItemSubtotal(item);
  }

  statusLabel(status: PurchaseOrderStatus): string {
    return PURCHASE_ORDER_STATUS_LABELS[status];
  }

  private loadLookups(): void {
    this._loadingLookups.set(true);
    this.supplierService.listSuppliers({ page: 0, size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this._suppliers.set(page.content);
        this._loadingLookups.set(false);
      },
      error: (error: unknown) => {
        this._loadingLookups.set(false);
        this._error.set(this.messageForError(error, 'No pudimos cargar los proveedores.'));
      },
    });
    this.userService.listBranches().subscribe({
      next: (branches) => this._branches.set(branches),
      error: (error: unknown) =>
        this._error.set(this.messageForError(error, 'No pudimos cargar las sucursales.')),
    });
  }

  private runOrderAction(
    id: number,
    action: 'confirm' | 'send',
    summary: string,
    detail: string,
    fallback: string,
  ): void {
    const operation =
      action === 'confirm'
        ? this.purchaseOrderService.confirm(id)
        : this.purchaseOrderService.send(id);
    operation.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary, detail });
        this.loadOrders();
      },
      error: (error: unknown) => this._error.set(this.messageForError(error, fallback)),
    });
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) return fallback;
    return apiError.code === 'VALIDATION_ERROR'
      ? this.errorMapping.formatValidationErrors(apiError)
      : this.errorMapping.getMessage(apiError.code, fallback);
  }
}
