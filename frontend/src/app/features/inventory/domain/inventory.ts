import type { PageResponse } from '@shared/types/page';

/** Request sent by admins to register a legacy direct stock lot. Prefer purchase receipts for normal stock entry. */
export interface CreateStockLotRequest {
  readonly productId: number;
  readonly branchId: number;
  readonly quantity: number;
  readonly lotCode?: string | null;
  readonly expirationDate?: string | null;
  readonly costPrice?: number | null;
}

/** Request line used to confirm merchandise for one purchase-order item. */
export interface PurchaseReceiptItemRequest {
  readonly purchaseOrderItemId: number;
  readonly quantityReceived: number;
  readonly unitCost: number;
  readonly lotCode?: string | null;
  readonly expirationDate?: string | null;
}

/** Request sent by admins to confirm received merchandise and generate stock. */
export interface PurchaseReceiptRequest {
  readonly purchaseOrderId: number;
  readonly invoiceNumber?: string | null;
  readonly notes?: string | null;
  readonly items: PurchaseReceiptItemRequest[];
}

/** Stock lot returned by the inventory API. */
export interface StockLotDto {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly branchId: number;
  readonly branchName: string;
  readonly initialQuantity: number;
  readonly quantityAvailable: number;
  readonly lotCode?: string | null;
  readonly expirationDate?: string | null;
  readonly costPrice?: number | null;
  readonly unitCost: number;
  readonly status: string;
  readonly supplierId?: number | null;
  readonly supplierProductId?: number | null;
  readonly purchaseReceiptId?: number | null;
  readonly purchaseReceiptItemId?: number | null;
  readonly totalAvailableForProductBranch?: number | null;
}

/** Confirmed purchase receipt line returned by the inventory API. */
export interface PurchaseReceiptItemDto {
  readonly id: number;
  readonly purchaseOrderItemId?: number | null;
  readonly productId: number;
  readonly productName: string;
  readonly quantityReceived: number;
  readonly unitCost: number;
  readonly lotCode?: string | null;
  readonly expirationDate?: string | null;
  readonly createdStockLotId?: number | null;
}

/** Result returned after a purchase receipt creates stock. */
export interface PurchaseReceiptDto {
  readonly id: number;
  readonly purchaseOrderId: number;
  readonly supplierId: number;
  readonly supplierName: string;
  readonly branchId: number;
  readonly branchName: string;
  readonly status: string;
  readonly invoiceNumber?: string | null;
  readonly receivedAt?: string | null;
  readonly confirmedAt?: string | null;
  readonly purchaseOrderStatus: string;
  readonly totalReceivedQuantity: number;
  readonly items: PurchaseReceiptItemDto[];
}

/** Aggregated stock summary for one product in one branch. */
export interface StockProductSummaryDto {
  readonly productId: number;
  readonly productName: string;
  readonly branchId: number;
  readonly branchName: string;
  readonly totalAvailable: number;
  readonly nearestExpirationDate?: string | null;
  readonly activeLotCount: number;
}

/** Paginated response for stock lot listings. */
export type StockLotPage = PageResponse<StockLotDto>;

/** Paginated response for product summaries. */
export type StockProductSummaryPage = PageResponse<StockProductSummaryDto>;

/** Request sent by admins to manually adjust stock. */
export interface StockAdjustmentRequest {
  readonly productId: number;
  readonly branchId: number;
  readonly quantity: number;
  readonly reason: string;
  readonly type: 'MANUAL_ADJUSTMENT' | 'INTERNAL_CONSUMPTION' | 'WASTE';
  readonly stockLotId?: number | null;
}

/** Stock movement returned by the movements list endpoint. */
export interface StockMovementDto {
  readonly id: number;
  readonly stockLotId: number;
  readonly productId: number;
  readonly productName: string;
  readonly branchId: number;
  readonly branchName: string;
  readonly type: string;
  readonly quantity: number;
  readonly unitCostSnapshot?: number | null;
  readonly reason?: string | null;
  readonly createdByUserId?: number | null;
  readonly createdAt: string;
}

/** Paginated response for stock movements. */
export type StockMovementPage = PageResponse<StockMovementDto>;

/** Movement type translated labels for display. */
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE_ENTRY: 'Entrada de compra',
  POS_SALE: 'Venta (POS)',
  ONLINE_SALE: 'Venta (Online)',
  CANCELLATION_RETURN: 'Devolucion',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  INTERNAL_CONSUMPTION: 'Consumo interno',
  WASTE: 'Merma',
};

/** Movement type badge severity mapping. */
export const MOVEMENT_TYPE_SEVERITY: Record<string, string> = {
  PURCHASE_ENTRY: 'success',
  POS_SALE: 'info',
  ONLINE_SALE: 'info',
  CANCELLATION_RETURN: 'warn',
  MANUAL_ADJUSTMENT: 'warn',
  INTERNAL_CONSUMPTION: 'contrast',
  WASTE: 'danger',
};
