/**
 * Category DTO returned from GET /api/store/categories.
 */
export interface Category {
  id: number;
  name: string;
  productCount: number;
}

/**
 * Product summary DTO returned from GET /api/store/products.
 *
 * <p>Fields prefixed with {@code ?} are optional / only present in detail views.</p>
 */
export interface ProductSummary {
  id: number;
  name: string;
  description?: string;
  brandName?: string;
  barcode?: string;
  salePrice: number;
  onlineStatus: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'HIDDEN';
  imageUrl?: string;
  availableStock: number;
  categoryId: number;
  categoryName: string;
}
