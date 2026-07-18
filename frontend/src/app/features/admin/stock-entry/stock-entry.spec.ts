import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { InventoryService } from '@features/inventory/data-access/inventory';
import { PurchaseOrderService } from '@features/suppliers/data-access/purchase-order';
import { ErrorMappingService } from '@core/services/error-mapping';
import { StockEntry } from './stock-entry';

const orderSummary = {
  id: 1,
  supplierId: 30,
  supplierName: 'Proveedor',
  branchId: 20,
  branchName: 'Centro',
  status: 'SENT' as const,
  orderDate: '2026-06-01T12:00:00Z',
  expectedDeliveryDate: '2026-06-10',
  total: 1000,
  itemCount: 1,
  createdAt: '2026-06-01T12:00:00Z',
};

const orderDetail = {
  ...orderSummary,
  supplierPhone: null,
  supplierEmail: null,
  supplierCuit: null,
  notes: null,
  items: [
    {
      id: 100,
      productId: 10,
      productName: 'Granola',
      productBarcode: '7790001',
      supplierProductId: 40,
      supplierSku: 'GRA-1',
      quantityOrdered: 2,
      unitCost: 500,
      subtotal: 1000,
    },
  ],
  confirmedAt: '2026-06-01T12:30:00Z',
  sentAt: '2026-06-01T13:00:00Z',
  cancelledAt: null,
  cancellationReason: null,
};

/** Unit tests for purchase receipt form validation and submit flow. */
describe('StockEntry', () => {
  let fixture: ComponentFixture<StockEntry>;
  let component: StockEntry;
  let inventoryService: { createPurchaseReceipt: ReturnType<typeof vi.fn> };
  let purchaseOrderService: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    inventoryService = { createPurchaseReceipt: vi.fn() };
    purchaseOrderService = {
      list: vi.fn((filters) => of({ content: filters.status === 'SENT' ? [orderSummary] : [] })),
      get: vi.fn().mockReturnValue(of(orderDetail)),
    };

    await TestBed.configureTestingModule({
      imports: [StockEntry],
      providers: [
        MessageService,
        ErrorMappingService,
        { provide: InventoryService, useValue: inventoryService },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockEntry);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load receivable purchase orders', () => {
    expect(component).toBeTruthy();
    expect(purchaseOrderService.list).toHaveBeenCalledWith({
      status: 'SENT',
      page: 0,
      size: 50,
      sort: 'createdAt,desc',
    });
    expect(purchaseOrderService.list).toHaveBeenCalledWith({
      status: 'PARTIALLY_RECEIVED',
      page: 0,
      size: 50,
      sort: 'createdAt,desc',
    });
    expect((component as any).orders()).toEqual([orderSummary]);
  });

  it('should load selected order and initialize receipt rows from order items', () => {
    (component as any).selectOrder(1);

    expect(purchaseOrderService.get).toHaveBeenCalledWith(1);
    expect((component as any).rows()[0]).toEqual({
      purchaseOrderItemId: 100,
      productName: 'Granola',
      productBarcode: '7790001',
      orderedQuantity: 2,
      unitCost: 500,
      quantityReceived: 2,
      lotCode: '',
      expirationDate: null,
    });
  });

  it('should reject submit when no order is selected', () => {
    (component as any).save();

    expect((component as any).formValid()).toBe(false);
    expect(inventoryService.createPurchaseReceipt).not.toHaveBeenCalled();
  });

  it('should submit a valid purchase receipt and show the confirmation summary', () => {
    inventoryService.createPurchaseReceipt.mockReturnValue(
      of({
        id: 50,
        purchaseOrderId: 1,
        supplierId: 30,
        supplierName: 'Proveedor',
        branchId: 20,
        branchName: 'Centro',
        status: 'CONFIRMED',
        purchaseOrderStatus: 'RECEIVED',
        totalReceivedQuantity: 2,
        items: [
          {
            id: 60,
            purchaseOrderItemId: 100,
            productId: 10,
            productName: 'Granola',
            quantityReceived: 2,
            unitCost: 500,
            lotCode: 'L-1',
            createdStockLotId: 70,
          },
        ],
      }),
    );
    (component as any).selectOrder(1);
    (component as any).updateRow(100, { lotCode: 'L-1' });
    (component as any).invoiceNumber.set('FAC-1');

    (component as any).save();

    expect(inventoryService.createPurchaseReceipt).toHaveBeenCalledWith({
      purchaseOrderId: 1,
      invoiceNumber: 'FAC-1',
      notes: null,
      items: [
        {
          purchaseOrderItemId: 100,
          quantityReceived: 2,
          unitCost: 500,
          lotCode: 'L-1',
          expirationDate: null,
        },
      ],
    });
    expect((component as any).confirmedReceipt()?.id).toBe(50);
  });

  it('should expose an error message when backend confirmation fails', () => {
    inventoryService.createPurchaseReceipt.mockReturnValue(throwError(() => new Error('boom')));
    (component as any).selectOrder(1);

    (component as any).save();

    expect((component as any).error()).toBe('No pudimos confirmar la recepcion.');
  });
});
