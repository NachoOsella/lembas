import type { PageResponse } from '@shared/types/page';

export type PriceUpdateBatchStatus = 'DRAFT' | 'VALIDATED' | 'APPLIED' | 'CANCELLED';
export type PriceUpdateBatchType =
  | 'SUPPLIER_FILE'
  | 'PERCENTAGE_INCREASE'
  | 'MANUAL_GRID'
  | 'SINGLE_PRODUCT_MANUAL';
export type PriceUpdateBatchItemStatus =
  | 'CREATE'
  | 'UPDATE'
  | 'UNCHANGED'
  | 'REVIEW'
  | 'EXCLUDED'
  | 'ERROR';

/** Global defaults used to calculate batch preview rows. */
export interface PriceUpdateBatchDefaultsRequest {
  readonly newProductMarginPercentage?: number | null;
  readonly applyCostUpdatesByDefault?: boolean | null;
  readonly applySalePriceUpdatesByDefault?: boolean | null;
  readonly excludeUnchangedByDefault?: boolean | null;
}

/** Manual supplier price row used to create a preview batch. */
export interface PriceUpdateManualItemRequest {
  readonly supplierSku?: string | null;
  readonly barcode?: string | null;
  readonly productName?: string | null;
  readonly newCost?: number | null;
}

/** Request used to create a manual-grid batch. */
export interface PriceUpdateManualBatchRequest {
  readonly supplierId: number;
  readonly defaults?: PriceUpdateBatchDefaultsRequest | null;
  readonly items: PriceUpdateManualItemRequest[];
  readonly notes?: string | null;
}

/** Row-level override request for a preview item. */
export interface PriceUpdateBatchItemUpdateRequest {
  readonly productId?: number | null;
  readonly supplierSku?: string | null;
  readonly barcode?: string | null;
  readonly productName?: string | null;
  readonly newCost?: number | null;
  readonly newProductMarginPercentage?: number | null;
  readonly finalSalePrice?: number | null;
  readonly applyCostUpdate?: boolean | null;
  readonly applySalePriceUpdate?: boolean | null;
  readonly createProduct?: boolean | null;
  readonly status?: PriceUpdateBatchItemStatus | null;
}

/** Compact batch row for list views. */
export interface PriceUpdateBatchSummaryDto {
  readonly id: number;
  readonly supplierId?: number | null;
  readonly supplierName?: string | null;
  readonly type: PriceUpdateBatchType;
  readonly status: PriceUpdateBatchStatus;
  readonly sourceFileName?: string | null;
  readonly createdAt: string;
  readonly appliedAt?: string | null;
}

/** Preview row returned by the backend. */
export interface PriceUpdateBatchItemDto {
  readonly id: number;
  readonly supplierProductId?: number | null;
  readonly productId?: number | null;
  readonly productName?: string | null;
  readonly supplierSku?: string | null;
  readonly supplierProductName?: string | null;
  readonly barcode?: string | null;
  readonly oldCost?: number | null;
  readonly newCost?: number | null;
  readonly supplierVariationPercentage?: number | null;
  readonly newProductMarginPercentage?: number | null;
  readonly oldSalePrice?: number | null;
  readonly suggestedSalePrice?: number | null;
  readonly finalSalePrice?: number | null;
  readonly applyCostUpdate: boolean;
  readonly applySalePriceUpdate: boolean;
  readonly createProduct: boolean;
  readonly status: PriceUpdateBatchItemStatus;
  readonly errorMessage?: string | null;
}

/** Full batch preview with defaults and editable rows. */
export interface PriceUpdateBatchDetailDto extends PriceUpdateBatchSummaryDto {
  readonly defaultNewProductMarginPercentage?: number | null;
  readonly applyCostUpdatesByDefault: boolean;
  readonly applySalePriceUpdatesByDefault: boolean;
  readonly excludeUnchangedByDefault: boolean;
  readonly notes?: string | null;
  readonly items: PriceUpdateBatchItemDto[];
}

export type PriceUpdateBatchPage = PageResponse<PriceUpdateBatchSummaryDto>;
