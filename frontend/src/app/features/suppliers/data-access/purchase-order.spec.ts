import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PurchaseOrderService } from './purchase-order';

/** Unit tests for the admin purchase order HTTP service. */
describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PurchaseOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list purchase orders with filters', () => {
    service.list({ supplierId: 10, branchId: 20, status: 'DRAFT', page: 1, size: 5 }).subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/admin/purchase-orders');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('supplierId')).toBe('10');
    expect(req.request.params.get('branchId')).toBe('20');
    expect(req.request.params.get('status')).toBe('DRAFT');
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

  it('should create and download a purchase order PDF', () => {
    service
      .create({
        supplierId: 10,
        branchId: 20,
        items: [{ supplierProductId: 30, quantityOrdered: 2, unitCost: 100 }],
      })
      .subscribe();

    const createReq = httpMock.expectOne('/api/admin/purchase-orders');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ id: 1, items: [] });

    service.downloadPdf(1).subscribe((blob) => {
      expect(blob.type).toBe('application/pdf');
    });

    const pdfReq = httpMock.expectOne('/api/admin/purchase-orders/1/pdf');
    expect(pdfReq.request.method).toBe('GET');
    expect(pdfReq.request.responseType).toBe('blob');
    pdfReq.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
