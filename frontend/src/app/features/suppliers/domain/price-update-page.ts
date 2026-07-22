import type {
  PriceUpdateBatchDefaultsRequest,
  PriceUpdateBatchItemDto,
  PriceUpdateBatchItemUpdateRequest,
} from './price-update-batch';

/** Editable values for one supplier price preview row. */
export interface EditablePriceRow {
  readonly id: number;
  supplierSku: string;
  barcode: string;
  productName: string;
  newCost: number | null;
  newProductMarginPercentage: number | null;
  finalSalePrice: number | null;
  applyCostUpdate: boolean;
  applySalePriceUpdate: boolean;
  createProduct: boolean;
  excluded: boolean;
}

/** Table row combining immutable backend data with local editable values. */
export interface PriceTableRow {
  readonly item: PriceUpdateBatchItemDto;
  readonly row: EditablePriceRow;
}

/** Converts page defaults to the existing batch API contract. */
export function createPriceBatchDefaults(
  margin: number | null,
  applyCostUpdates: boolean,
  applySalePriceUpdates: boolean,
  excludeUnchanged: boolean,
): PriceUpdateBatchDefaultsRequest {
  return {
    newProductMarginPercentage: margin,
    applyCostUpdatesByDefault: applyCostUpdates,
    applySalePriceUpdatesByDefault: applySalePriceUpdates,
    excludeUnchangedByDefault: excludeUnchanged,
  };
}

/** Converts a backend preview item into local editable row state. */
export function toEditablePriceRow(item: PriceUpdateBatchItemDto): EditablePriceRow {
  return {
    id: item.id,
    supplierSku: item.supplierSku ?? '',
    barcode: item.barcode ?? '',
    productName: item.supplierProductName ?? item.productName ?? '',
    newCost: item.newCost ?? null,
    newProductMarginPercentage: item.newProductMarginPercentage ?? null,
    finalSalePrice: item.finalSalePrice ?? null,
    applyCostUpdate: item.applyCostUpdate,
    applySalePriceUpdate: item.applySalePriceUpdate,
    createProduct: item.createProduct,
    excluded: item.status === 'EXCLUDED',
  };
}

/** Builds an item update request without leaking blank optional fields. */
export function toPriceRowRequest(row: EditablePriceRow): PriceUpdateBatchItemUpdateRequest {
  return {
    supplierSku: blankToNull(row.supplierSku),
    barcode: blankToNull(row.barcode),
    productName: blankToNull(row.productName),
    newCost: row.newCost,
    newProductMarginPercentage: row.newProductMarginPercentage,
    finalSalePrice: row.finalSalePrice,
    applyCostUpdate: row.applyCostUpdate,
    applySalePriceUpdate: row.applySalePriceUpdate,
    createProduct: row.createProduct,
    status: row.excluded ? 'EXCLUDED' : null,
  };
}

/** Recalculates sale price using the documented margin formula. */
export function salePriceFromMargin(cost: number | null, margin: number | null): number | null {
  if (cost === null || margin === null || !Number.isFinite(cost) || !Number.isFinite(margin)) {
    return null;
  }
  if (cost < 0 || margin < 0 || margin >= 100) {
    return null;
  }
  const price = cost / (1 - margin / 100);
  return Math.round(price * 100) / 100;
}

/** Derives a non-negative margin percentage from cost and final sale price. */
export function marginFromSalePrice(cost: number | null, price: number | null): number | null {
  if (cost === null || price === null || !Number.isFinite(cost) || !Number.isFinite(price)) {
    return null;
  }
  if (cost < 0 || price <= 0) {
    return null;
  }
  return Math.max(0, (1 - cost / price) * 100);
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
