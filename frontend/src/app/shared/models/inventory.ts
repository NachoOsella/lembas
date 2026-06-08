import { PageResponse } from './page';

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

/** Paginated response for stock lot listings. */
export type StockLotPage = PageResponse<StockLotDto>;
