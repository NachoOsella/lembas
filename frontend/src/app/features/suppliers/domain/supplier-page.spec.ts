import { describe, expect, it } from 'vitest';

import {
  createSupplierProductRequest,
  createSupplierRequest,
  isSupplierFormValid,
  isSupplierProductFormValid,
  toSupplierFilters,
} from './supplier-page';

describe('supplier page adapters', () => {
  it('normalizes supplier filters and pagination', () => {
    expect(
      toSupplierFilters({
        search: '  yerba ',
        first: 20,
        pageSize: 10,
        sortField: 'name',
        sortOrder: -1,
      }),
    ).toEqual({ search: 'yerba', page: 2, size: 10, sort: 'name,desc' });
  });

  it('validates and adapts supplier forms', () => {
    expect(
      isSupplierFormValid({ name: ' ', contactName: '', phone: '', email: '', cuit: '' }),
    ).toBe(false);
    expect(
      createSupplierRequest({
        name: ' Distribuidora ',
        contactName: ' Contacto ',
        phone: '',
        email: '',
        cuit: '',
      }),
    ).toEqual({
      name: 'Distribuidora',
      contactName: 'Contacto',
      phone: null,
      email: null,
      cuit: null,
    });
  });

  it('validates and adapts supplier-product forms', () => {
    const value = {
      product: {
        id: 10,
        name: 'Yerba',
        salePrice: 100,
        onlineStatus: 'PUBLISHED' as const,
        categoryId: 1,
        categoryName: 'Infusiones',
      },
      supplierId: 20,
      supplierSku: ' SKU-1 ',
      currentCost: 500,
      preferred: true,
    };
    expect(isSupplierProductFormValid(value)).toBe(true);
    expect(createSupplierProductRequest(value)).toEqual({
      productId: 10,
      supplierId: 20,
      supplierSku: 'SKU-1',
      currentCost: 500,
      preferred: true,
    });
    expect(isSupplierProductFormValid({ ...value, product: null, currentCost: -1 })).toBe(false);
  });
});
