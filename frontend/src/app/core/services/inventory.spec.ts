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

  it('should post a stock lot entry', () => {
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
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 5, first: false, last: true, empty: true });
  });
});
