import type { PageResponse } from '@shared/types/page';

/** Purchase order lifecycle states supported by the admin workflow. */
export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

/** Request item for a supplier purchase order. */
export interface PurchaseOrderItemRequest {
  readonly supplierProductId: number;
  readonly quantityOrdered: number;
  readonly unitCost?: number | null;
}

/** Request used to create or update a purchase order. */
export interface PurchaseOrderRequest {
  readonly supplierId: number;
  readonly branchId: number;
  readonly expectedDeliveryDate?: string | null;
  readonly notes?: string | null;
  readonly items: PurchaseOrderItemRequest[];
}

/** Request used to cancel a purchase order. */
export interface PurchaseOrderCancelRequest {
  readonly reason?: string | null;
}

/** Product line returned by the purchase order API. */
export interface PurchaseOrderItemDto {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly productBarcode?: string | null;
  readonly supplierProductId: number;
  readonly supplierSku?: string | null;
  readonly quantityOrdered: number;
  readonly unitCost: number;
  readonly subtotal: number;
}

/** Lightweight purchase order row for admin listings. */
export interface PurchaseOrderSummaryDto {
  readonly id: number;
  readonly supplierId: number;
  readonly supplierName: string;
  readonly branchId: number;
  readonly branchName: string;
  readonly status: PurchaseOrderStatus;
  readonly orderDate: string;
  readonly expectedDeliveryDate?: string | null;
  readonly total: number;
  readonly itemCount: number;
  readonly createdAt: string;
}

/** Detailed purchase order returned by the admin API. */
export interface PurchaseOrderDetailDto extends PurchaseOrderSummaryDto {
  readonly supplierPhone?: string | null;
  readonly supplierEmail?: string | null;
  readonly supplierCuit?: string | null;
  readonly notes?: string | null;
  readonly items: PurchaseOrderItemDto[];
  readonly confirmedAt?: string | null;
  readonly sentAt?: string | null;
  readonly cancelledAt?: string | null;
  readonly cancellationReason?: string | null;
}

export type PurchaseOrderPage = PageResponse<PurchaseOrderSummaryDto>;
