import { StoreCategory } from './category';

/** Category DTO returned from GET /api/store/categories. */
export type Category = StoreCategory;

/** Product publication state used by admin and store catalog flows. */
export type ProductOnlineStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'HIDDEN';

/** Product summary DTO returned from GET /api/store/products and admin product listings. */
export interface ProductSummary {
  id: number;
  name: string;
  description?: string;
  brandName?: string;
  barcode?: string;
  salePrice: number;
  onlineStatus: ProductOnlineStatus;
  imageUrl?: string;
  /**
   * Branch-level stock availability.
   *
   * TODO: Populate this field when the inventory module exposes stock lots by branch.
   * Until then, undefined means the public catalog does not know real availability.
   */
  availableStock?: number;
  minimumStock?: number;
  categoryId: number;
  categoryName: string;
}

/** Detailed product DTO returned from GET /api/admin/products/:id. */
export interface ProductDetail extends ProductSummary {
  description?: string;
  minimumStock?: number;
}

/** Product payload used by admin create and edit forms. */
export interface ProductRequest {
  name: string;
  description?: string;
  brandName?: string;
  barcode?: string;
  categoryId: number;
  salePrice: number;
  minimumStock?: number;
  imageUrl?: string;
  onlineStatus: ProductOnlineStatus;
}
