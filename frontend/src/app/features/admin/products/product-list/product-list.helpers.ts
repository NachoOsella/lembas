import type { ProductFilters } from '@features/catalog/data-access/product';
import type { ProductOnlineStatus } from '@features/catalog/domain/product';

export interface ProductListQueryState {
  readonly search: string;
  readonly categoryId: number | null;
  readonly onlineStatus: ProductOnlineStatus | null;
  readonly first: number;
  readonly rows: number;
  readonly sortField: string;
  readonly sortOrder: number;
}

/** Converts table state into the stable query contract used by the product API. */
export function toProductFilters(state: ProductListQueryState): ProductFilters {
  return {
    search: state.search,
    categoryId: state.categoryId,
    onlineStatus: state.onlineStatus,
    page: Math.floor(state.first / Math.max(state.rows, 1)),
    size: state.rows,
    sort: `${state.sortField},${state.sortOrder === 1 ? 'asc' : 'desc'}`,
  };
}

/** Formats prices consistently with the Argentine storefront locale. */
export function formatProductPrice(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}
