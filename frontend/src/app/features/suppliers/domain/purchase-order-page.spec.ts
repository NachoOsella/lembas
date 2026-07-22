import { describe, expect, it } from 'vitest';

import {
  canCancelPurchaseOrder,
  createPurchaseOrderRequest,
  isPurchaseOrderFormValid,
  purchaseOrderItemSubtotal,
  toPurchaseOrderFilters,
} from './purchase-order-page';

describe('purchase-order page adapters', () => {
  const item = {
    supplierProductId: 30,
    productName: 'Yerba',
    quantityOrdered: 2,
    unitCost: 100,
  };

  it('adapts filters and date values', () => {
    expect(
      toPurchaseOrderFilters({
        supplierId: 10,
        branchId: 20,
        status: 'DRAFT',
        first: 10,
        pageSize: 10,
      }),
    ).toEqual({ supplierId: 10, branchId: 20, status: 'DRAFT', page: 1, size: 10 });
    expect(
      createPurchaseOrderRequest({
        supplierId: 10,
        branchId: 20,
        expectedDeliveryDate: new Date(2026, 5, 15),
        notes: ' Nota ',
        items: [item],
      }),
    ).toEqual({
      supplierId: 10,
      branchId: 20,
      expectedDeliveryDate: '2026-06-15',
      notes: 'Nota',
      items: [{ supplierProductId: 30, quantityOrdered: 2, unitCost: 100 }],
    });
  });

  it('validates line quantities and computes totals', () => {
    expect(
      isPurchaseOrderFormValid({
        supplierId: 10,
        branchId: 20,
        expectedDeliveryDate: null,
        notes: '',
        items: [item],
      }),
    ).toBe(true);
    expect(
      isPurchaseOrderFormValid({
        supplierId: 10,
        branchId: 20,
        expectedDeliveryDate: null,
        notes: '',
        items: [{ ...item, quantityOrdered: 0 }],
      }),
    ).toBe(false);
    expect(purchaseOrderItemSubtotal(item)).toBe(200);
    expect(canCancelPurchaseOrder('SENT')).toBe(true);
    expect(canCancelPurchaseOrder('RECEIVED')).toBe(false);
  });
});
