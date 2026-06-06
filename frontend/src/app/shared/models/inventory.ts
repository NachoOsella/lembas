import { PageResponse } from './page';

/** Request sent by admins to register a new stock lot. */
export interface CreateStockLotRequest {
  readonly productId: number;
  readonly branchId: number;
  readonly quantity: number;
  readonly lotCode?: string | null;
  readonly expirationDate?: string | null;
  readonly costPrice?: number | null;
}

/** Request sent by admins to confirm received merchandise and generate stock. */
export interface PurchaseReceiptRequest {
  readonly productId: number;
  readonly branchId: number;
  readonly quantity: number;
  readonly lotCode?: string | null;
  readonly expirationDate?: string | null;
  readonly unitCost?: number | null;
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

/** Result returned after a purchase receipt creates stock. */
export interface PurchaseReceiptDto {
  readonly stockLotId: number;
  readonly stockLot: StockLotDto;
  readonly totalAvailableForProductBranch?: number | null;
}

/** Paginated response for stock lot listings. */
export type StockLotPage = PageResponse<StockLotDto>;
