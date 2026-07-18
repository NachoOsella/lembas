/** Category DTO returned by admin category endpoints. */
export interface CategoryDto {
  id: number;
  parentId?: number;
  name: string;
  description?: string;
}

/** Request payload for creating or updating a category. */
export interface CategoryRequest {
  name: string;
  parentId?: number | null;
  description?: string;
}

/** Public category DTO returned by GET /api/store/categories. */
export interface StoreCategory {
  id: number;
  name: string;
  productCount: number;
}
