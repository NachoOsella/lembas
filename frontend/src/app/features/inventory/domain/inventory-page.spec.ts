import { describe, expect, it } from 'vitest';

import {
  createStockLotRequest,
  createStockAdjustmentRequest,
  isStockAdjustmentFormValid,
  isStockLotFormValid,
  toProductSummaryRequest,
} from './inventory-page';
import type { StockAdjustmentFormValue } from './inventory-page';

describe('inventory page request adapters', () => {
  it('adapts filters to the existing paginated product-summary contract', () => {
    expect(
      toProductSummaryRequest({
        search: ' Granola ',
        branchId: 20,
        expiringSoon: true,
        first: 20,
        pageSize: 10,
        sortField: 'totalAvailable',
        sortOrder: -1,
      }),
    ).toEqual({
      search: 'Granola',
      branchId: 20,
      expiringSoon: true,
      page: 2,
      size: 10,
      sort: 'totalAvailable,desc',
    });
  });

  it('uses the existing default sort and omits blank searches', () => {
    expect(
      toProductSummaryRequest({
        search: '   ',
        branchId: null,
        expiringSoon: false,
        first: 0,
        pageSize: 20,
        sortField: undefined,
        sortOrder: undefined,
      }),
    ).toEqual({
      search: undefined,
      branchId: null,
      expiringSoon: false,
      page: 0,
      size: 20,
      sort: 'productName,asc',
    });
  });

  it('validates and adapts a direct stock lot command without leaking blank values', () => {
    const form = {
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      quantity: 2.5,
      lotCode: ' L-001 ',
      expirationDate: new Date(2026, 5, 10),
      costPrice: 100,
    };

    expect(isStockLotFormValid(form)).toBe(true);
    expect(createStockLotRequest(form)).toEqual({
      productId: 10,
      branchId: 20,
      quantity: 2.5,
      lotCode: 'L-001',
      expirationDate: '2026-06-10',
      costPrice: 100,
    });
  });

  it('rejects an incomplete lot form and keeps optional values null in the request', () => {
    const invalidForm = {
      product: null,
      branchId: 20,
      quantity: 0,
      lotCode: '',
      expirationDate: null,
      costPrice: null,
    };
    const validForm = { ...invalidForm, product: { id: 10, name: 'Granola' }, quantity: 1 };

    expect(isStockLotFormValid(invalidForm)).toBe(false);
    expect(createStockLotRequest(validForm)).toEqual({
      productId: 10,
      branchId: 20,
      quantity: 1,
      lotCode: null,
      expirationDate: null,
      costPrice: null,
    });
  });

  it('validates the adjustment reason and applies the correct quantity sign', () => {
    const manual: StockAdjustmentFormValue = {
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      type: 'MANUAL_ADJUSTMENT',
      quantity: 3,
      reason: ' Recuento ',
    };
    const waste: StockAdjustmentFormValue = { ...manual, type: 'WASTE' };

    expect(isStockAdjustmentFormValid({ ...manual, reason: '   ' })).toBe(false);
    expect(isStockAdjustmentFormValid(waste)).toBe(true);
    expect(createStockAdjustmentRequest(manual)).toEqual({
      productId: 10,
      branchId: 20,
      quantity: 3,
      reason: 'Recuento',
      type: 'MANUAL_ADJUSTMENT',
    });
    expect(createStockAdjustmentRequest(waste)).toEqual({
      productId: 10,
      branchId: 20,
      quantity: -3,
      reason: 'Recuento',
      type: 'WASTE',
    });
  });
});
