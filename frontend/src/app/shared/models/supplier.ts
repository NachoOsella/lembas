import { PageResponse } from './page';

/** Supplier shown in admin supplier management screens. */
export interface SupplierDto {
  readonly id: number;
  readonly name: string;
  readonly contactName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly cuit?: string | null;
}

/** Request used to create or update a supplier. */
export interface SupplierRequest {
  readonly name: string;
  readonly contactName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly cuit?: string | null;
}

/** Product-supplier association with current replacement cost. */
export interface SupplierProductDto {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly productBarcode?: string | null;
  readonly supplierId: number;
  readonly supplierName: string;
  readonly supplierSku?: string | null;
  readonly currentCost: number;
  readonly preferred: boolean;
}

/** Request used to associate a product with a supplier. */
export interface SupplierProductRequest {
  readonly productId: number;
  readonly supplierId: number;
  readonly supplierSku?: string | null;
  readonly currentCost: number;
  readonly preferred: boolean;
}

/** Replacement cost history row. */
export interface SupplierProductCostHistoryDto {
  readonly id: number;
  readonly supplierProductId: number;
  readonly oldCost?: number | null;
  readonly newCost: number;
  readonly source?: string | null;
  readonly validFrom: string;
  readonly createdAt: string;
}

export type SupplierPage = PageResponse<SupplierDto>;
export type SupplierProductPage = PageResponse<SupplierProductDto>;
export type SupplierProductCostHistoryPage = PageResponse<SupplierProductCostHistoryDto>;
