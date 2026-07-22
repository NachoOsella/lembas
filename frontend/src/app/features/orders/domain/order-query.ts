import type { OrderStatus, OrderType } from './order';

export interface AdminOrdersQuery {
  readonly status?: OrderStatus;
  readonly branchId?: number;
  readonly type?: OrderType;
  readonly from?: string;
  readonly to?: string;
  readonly search?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface AdminOrderFilters {
  readonly status: OrderStatus | null;
  readonly type: OrderType | null;
  readonly branchId: number | null;
  readonly from: Date | null;
  readonly to: Date | null;
  readonly search: string;
}

export interface AdminOrderTableState {
  readonly first: number;
  readonly pageSize: number;
  readonly sortField: string | undefined;
  readonly sortOrder: number | undefined;
}

export const EMPTY_ADMIN_ORDER_FILTERS: AdminOrderFilters = {
  status: null,
  type: null,
  branchId: null,
  from: null,
  to: null,
  search: '',
};

export const DEFAULT_ADMIN_ORDER_TABLE: AdminOrderTableState = {
  first: 0,
  pageSize: 10,
  sortField: undefined,
  sortOrder: undefined,
};

export function toAdminOrdersQuery(
  filters: AdminOrderFilters,
  table: AdminOrderTableState,
): AdminOrdersQuery {
  return {
    status: filters.status ?? undefined,
    type: filters.type ?? undefined,
    branchId: filters.branchId ?? undefined,
    from: formatDateParam(filters.from),
    to: formatDateParam(filters.to),
    search: normalizeSearch(filters.search),
    page: Math.floor(table.first / table.pageSize),
    size: table.pageSize,
    sort: formatSort(table.sortField, table.sortOrder),
  };
}

export function formatDateParam(date: Date | null): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeSearch(search: string): string | undefined {
  const normalized = search.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function formatSort(
  field: string | undefined,
  order: number | undefined,
): string | undefined {
  if (!field || (order !== 1 && order !== -1)) return undefined;
  return `${field},${order === 1 ? 'asc' : 'desc'}`;
}
