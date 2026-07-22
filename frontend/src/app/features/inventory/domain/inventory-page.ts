import type { CreateStockLotRequest, StockAdjustmentRequest } from './inventory';
import type { ProductSummaryFilters } from '../data-access/inventory';

/** Minimal product data required by inventory forms. */
export interface InventoryProductOption {
  readonly id: number;
  readonly name: string;
}

/** Branch option displayed by inventory forms and filters. */
export interface InventoryBranchOption {
  readonly label: string;
  readonly value: number;
}

/** Editable values for direct stock lot registration. */
export interface StockLotFormValue {
  readonly product: InventoryProductOption | null;
  readonly branchId: number | null;
  readonly quantity: number | null;
  readonly lotCode: string;
  readonly expirationDate: Date | null;
  readonly costPrice: number | null;
}

export type StockAdjustmentType = 'MANUAL_ADJUSTMENT' | 'INTERNAL_CONSUMPTION' | 'WASTE';

/** Editable values for a manual stock adjustment. */
export interface StockAdjustmentFormValue {
  readonly product: InventoryProductOption | null;
  readonly branchId: number | null;
  readonly type: StockAdjustmentType;
  readonly quantity: number | null;
  readonly reason: string;
}

/** UI pagination and filters used by the stock product summary page. */
export interface InventoryProductFilters {
  readonly search: string;
  readonly branchId: number | null;
  readonly expiringSoon: boolean;
  readonly first: number;
  readonly pageSize: number;
  readonly sortField: string | undefined;
  readonly sortOrder: number | undefined;
}

/** Converts page-owned filters to the stable inventory endpoint contract. */
export function toProductSummaryRequest(filters: InventoryProductFilters): ProductSummaryFilters {
  const search = filters.search.trim();
  const direction = filters.sortOrder === -1 ? 'desc' : 'asc';
  const field =
    filters.sortField && [1, -1].includes(filters.sortOrder ?? 0)
      ? filters.sortField
      : 'productName';

  return {
    search: search || undefined,
    branchId: filters.branchId,
    expiringSoon: filters.expiringSoon,
    page: Math.floor(filters.first / filters.pageSize),
    size: filters.pageSize,
    sort: `${field},${direction}`,
  };
}

/** Returns whether a direct stock lot command has the required business inputs. */
export function isStockLotFormValid(value: StockLotFormValue): boolean {
  return value.product !== null && value.branchId !== null && (value.quantity ?? 0) > 0;
}

/** Adapts direct lot form values to the existing backend request contract. */
export function createStockLotRequest(value: StockLotFormValue): CreateStockLotRequest {
  if (
    !isStockLotFormValid(value) ||
    !value.product ||
    value.branchId === null ||
    value.quantity === null
  ) {
    throw new Error('A valid stock lot form is required.');
  }

  return {
    productId: value.product.id,
    branchId: value.branchId,
    quantity: value.quantity,
    lotCode: blankToNull(value.lotCode),
    expirationDate: value.expirationDate ? toLocalDate(value.expirationDate) : null,
    costPrice: value.costPrice,
  };
}

/** Returns whether a stock adjustment has the required product, branch, quantity, and reason. */
export function isStockAdjustmentFormValid(value: StockAdjustmentFormValue): boolean {
  return (
    value.product !== null &&
    value.branchId !== null &&
    (value.quantity ?? 0) > 0 &&
    value.reason.trim().length > 0
  );
}

/** Adapts adjustments to the signed quantity convention accepted by the backend. */
export function createStockAdjustmentRequest(
  value: StockAdjustmentFormValue,
): StockAdjustmentRequest {
  if (
    !isStockAdjustmentFormValid(value) ||
    !value.product ||
    value.branchId === null ||
    value.quantity === null
  ) {
    throw new Error('A valid stock adjustment form is required.');
  }

  return {
    productId: value.product.id,
    branchId: value.branchId,
    quantity: value.type === 'MANUAL_ADJUSTMENT' ? value.quantity : -value.quantity,
    reason: value.reason.trim(),
    type: value.type,
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function toLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
