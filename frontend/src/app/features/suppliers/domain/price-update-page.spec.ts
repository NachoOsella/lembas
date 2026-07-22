import { describe, expect, it } from 'vitest';

import {
  marginFromSalePrice,
  salePriceFromMargin,
  toEditablePriceRow,
  toPriceRowRequest,
} from './price-update-page';

describe('price update page policies', () => {
  it('uses the documented margin formula and derives margin from overrides', () => {
    expect(salePriceFromMargin(4000, 35)).toBe(6153.85);
    expect(marginFromSalePrice(4000, 6200)).toBeCloseTo(35.48, 2);
    expect(salePriceFromMargin(4000, 100)).toBeNull();
    expect(marginFromSalePrice(4000, 0)).toBeNull();
  });

  it('adapts backend rows and strips blank request values', () => {
    const item = {
      id: 100,
      supplierProductId: 200,
      productId: 300,
      productName: 'Yerba',
      supplierSku: null,
      supplierProductName: 'Yerba Mate',
      barcode: null,
      oldCost: 4000,
      newCost: 5000,
      supplierVariationPercentage: 25,
      newProductMarginPercentage: 35,
      oldSalePrice: 6000,
      suggestedSalePrice: 7692.31,
      finalSalePrice: 7692.31,
      applyCostUpdate: true,
      applySalePriceUpdate: true,
      createProduct: false,
      status: 'UPDATE' as const,
      errorMessage: null,
    };
    const row = toEditablePriceRow(item);
    row.supplierSku = ' ';
    row.productName = ' Producto ';
    expect(toPriceRowRequest(row)).toEqual({
      supplierSku: null,
      barcode: null,
      productName: 'Producto',
      newCost: 5000,
      newProductMarginPercentage: 35,
      finalSalePrice: 7692.31,
      applyCostUpdate: true,
      applySalePriceUpdate: true,
      createProduct: false,
      status: null,
    });
  });
});
