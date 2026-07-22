import type {
  PurchaseOrderItemRequest,
  PurchaseOrderRequest,
  PurchaseOrderStatus,
} from './purchase-order';

/** Editable purchase-order line used by the page form. */
export interface PurchaseOrderDraftItem {
  readonly supplierProductId: number;
  readonly productName: string;
  readonly supplierSku?: string | null;
  quantityOrdered: number | null;
  unitCost: number | null;
}

/** Editable purchase-order form values. */
export interface PurchaseOrderFormValue {
  readonly supplierId: number | null;
  readonly branchId: number | null;
  readonly expectedDeliveryDate: Date | null;
  readonly notes: string;
  readonly items: readonly PurchaseOrderDraftItem[];
}

/** Filters and table state used by the purchase-order list. */
export interface PurchaseOrderTableState {
  readonly supplierId: number | null;
  readonly branchId: number | null;
  readonly status: PurchaseOrderStatus | null;
  readonly first: number;
  readonly pageSize: number;
}

/** User-facing status labels shared by the page and its tests. */
export const PURCHASE_ORDER_STATUS_LABELS: Readonly<Record<PurchaseOrderStatus, string>> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

/** Converts table state to the existing purchase-order service filter contract. */
export function toPurchaseOrderFilters(state: PurchaseOrderTableState): {
  readonly supplierId: number | null;
  readonly branchId: number | null;
  readonly status: PurchaseOrderStatus | null;
  readonly page: number;
  readonly size: number;
} {
  return {
    supplierId: state.supplierId,
    branchId: state.branchId,
    status: state.status,
    page: Math.floor(state.first / state.pageSize),
    size: state.pageSize,
  };
}

/** Validates the business-required purchase-order form values. */
export function isPurchaseOrderFormValid(value: PurchaseOrderFormValue): boolean {
  return (
    value.supplierId !== null &&
    value.branchId !== null &&
    value.items.length > 0 &&
    value.items.every(
      (item) =>
        Number.isFinite(item.quantityOrdered) &&
        (item.quantityOrdered ?? 0) > 0 &&
        Number.isFinite(item.unitCost) &&
        (item.unitCost ?? 0) >= 0,
    )
  );
}

/** Converts form values into the established purchase-order API request shape. */
export function createPurchaseOrderRequest(value: PurchaseOrderFormValue): PurchaseOrderRequest {
  if (!isPurchaseOrderFormValid(value) || value.supplierId === null || value.branchId === null) {
    throw new Error('A valid purchase-order form is required.');
  }
  const items: PurchaseOrderItemRequest[] = value.items.map((item) => ({
    supplierProductId: item.supplierProductId,
    quantityOrdered: Number(item.quantityOrdered),
    unitCost: Number(item.unitCost),
  }));
  return {
    supplierId: value.supplierId,
    branchId: value.branchId,
    expectedDeliveryDate: toLocalDate(value.expectedDeliveryDate),
    notes: blankToNull(value.notes),
    items,
  };
}

/** Returns whether the current order status permits editing. */
export function canEditPurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === 'DRAFT';
}

/** Returns whether the current order status permits confirmation. */
export function canConfirmPurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === 'DRAFT';
}

/** Returns whether the current order status permits sending. */
export function canSendPurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === 'CONFIRMED';
}

/** Returns whether the current order status permits cancellation. */
export function canCancelPurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === 'DRAFT' || status === 'CONFIRMED' || status === 'SENT';
}

/** Calculates one draft item subtotal. */
export function purchaseOrderItemSubtotal(item: PurchaseOrderDraftItem): number {
  return Number(item.quantityOrdered ?? 0) * Number(item.unitCost ?? 0);
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function toLocalDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
