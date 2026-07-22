import type { ProductSummary } from '@features/catalog/domain/product';
import type { SupplierProductRequest, SupplierRequest } from './supplier';

/** Editable values for the supplier dialog. */
export interface SupplierFormValue {
  readonly name: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email: string;
  readonly cuit: string;
}

/** Editable values for the supplier-product dialog. */
export interface SupplierProductFormValue {
  readonly product: ProductSummary | null;
  readonly supplierId: number | null;
  readonly supplierSku: string;
  readonly currentCost: number | null;
  readonly preferred: boolean;
}

/** Table pagination and sorting state owned by the supplier page. */
export interface SupplierTableState {
  readonly search: string;
  readonly first: number;
  readonly pageSize: number;
  readonly sortField: string | undefined;
  readonly sortOrder: number | undefined;
}

const SUPPLIER_SORT_FIELDS = new Set(['name', 'contactName', 'cuit']);
const SUPPLIER_PRODUCT_SORT_FIELDS = new Set([
  'productName',
  'supplierName',
  'supplierSku',
  'currentCost',
  'preferred',
]);

/** Builds a stable Spring sort value from a table event. */
export function toSupplierSort(
  field: string | undefined,
  order: number | undefined,
  defaultField: string,
  allowedFields: ReadonlySet<string>,
): string {
  const validField = field && allowedFields.has(field) ? field : defaultField;
  return `${validField},${order === -1 ? 'desc' : 'asc'}`;
}

/** Adapts supplier table state to the existing HTTP service contract. */
export function toSupplierFilters(state: SupplierTableState): {
  readonly search?: string;
  readonly page: number;
  readonly size: number;
  readonly sort: string;
} {
  const search = state.search.trim();
  return {
    search: search || undefined,
    page: Math.floor(state.first / state.pageSize),
    size: state.pageSize,
    sort: toSupplierSort(state.sortField, state.sortOrder, 'name', SUPPLIER_SORT_FIELDS),
  };
}

/** Adapts supplier-product table state to the existing HTTP service contract. */
export function toSupplierProductFilters(state: SupplierTableState): {
  readonly search?: string;
  readonly page: number;
  readonly size: number;
  readonly sort: string;
} {
  const search = state.search.trim();
  return {
    search: search || undefined,
    page: Math.floor(state.first / state.pageSize),
    size: state.pageSize,
    sort: toSupplierSort(
      state.sortField,
      state.sortOrder,
      'productName',
      SUPPLIER_PRODUCT_SORT_FIELDS,
    ),
  };
}

/** Validates the required supplier form fields. */
export function isSupplierFormValid(value: SupplierFormValue): boolean {
  return value.name.trim().length > 0;
}

/** Converts supplier form values to the established API request shape. */
export function createSupplierRequest(value: SupplierFormValue): SupplierRequest {
  if (!isSupplierFormValid(value)) {
    throw new Error('A valid supplier form is required.');
  }
  return {
    name: value.name.trim(),
    contactName: blankToNull(value.contactName),
    phone: blankToNull(value.phone),
    email: blankToNull(value.email),
    cuit: blankToNull(value.cuit),
  };
}

/** Validates the supplier-product association form. */
export function isSupplierProductFormValid(value: SupplierProductFormValue): boolean {
  return (
    value.product !== null &&
    value.supplierId !== null &&
    value.currentCost !== null &&
    Number.isFinite(value.currentCost) &&
    value.currentCost >= 0
  );
}

/** Converts supplier-product form values to the established API request shape. */
export function createSupplierProductRequest(
  value: SupplierProductFormValue,
): SupplierProductRequest {
  if (!isSupplierProductFormValid(value) || !value.product || value.supplierId === null) {
    throw new Error('A valid supplier-product form is required.');
  }
  return {
    productId: value.product.id,
    supplierId: value.supplierId,
    supplierSku: blankToNull(value.supplierSku),
    currentCost: value.currentCost ?? 0,
    preferred: value.preferred,
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
