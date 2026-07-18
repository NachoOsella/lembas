import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryService } from './inventory';

/** Unit tests for the admin inventory HTTP service. */
describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post a legacy stock lot entry', () => {
    const response = {
      id: 1,
      productId: 10,
      productName: 'Granola',
      branchId: 20,
      branchName: 'Centro',
      quantityAvailable: 2,
      totalAvailableForProductBranch: 5,
    };

    service
      .createStockLot({ productId: 10, branchId: 20, quantity: 2, lotCode: null })
      .subscribe((lot) => {
        expect(lot).toEqual(response);
      });

    const req = httpMock.expectOne('/api/admin/stock/lots');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 10, branchId: 20, quantity: 2, lotCode: null });
    req.flush(response);
  });

  it('should post a purchase receipt for an order', () => {
    const response = {
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
          createdStockLotId: 70,
        },
      ],
    };

    service
      .createPurchaseReceipt({
        purchaseOrderId: 1,
        invoiceNumber: 'FAC-1',
        items: [{ purchaseOrderItemId: 100, quantityReceived: 2, unitCost: 500, lotCode: 'L-1' }],
      })
      .subscribe((receipt) => {
        expect(receipt).toEqual(response);
      });

    const req = httpMock.expectOne('/api/admin/stock/receipts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      purchaseOrderId: 1,
      invoiceNumber: 'FAC-1',
      items: [{ purchaseOrderItemId: 100, quantityReceived: 2, unitCost: 500, lotCode: 'L-1' }],
    });
    req.flush(response);
  });

  it('should list stock lots with filters', () => {
    service
      .listLots({ productId: 10, branchId: 20, expiringSoon: true, page: 1, size: 5 })
      .subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/admin/stock/lots');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('productId')).toBe('10');
    expect(req.request.params.get('branchId')).toBe('20');
    expect(req.request.params.get('expiringSoon')).toBe('true');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('5');
    req.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 1,
      size: 5,
      first: false,
      last: true,
      empty: true,
    });
  });
});
