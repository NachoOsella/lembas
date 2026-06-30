import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import {
  PosProductSearchItem,
  PosProductSearchService,
} from './pos-product-search.service';

/** Unit tests for {@link PosProductSearchService}. */
describe('PosProductSearchService', () => {
  let service: PosProductSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PosProductSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns an empty observable without hitting HTTP when the query is blank', () => {
    let received: PosProductSearchItem[] | undefined;
    service.search('   ', 1).subscribe((items) => (received = items));
    expect(received).toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('returns an empty observable without hitting HTTP when the query is null', () => {
    let received: PosProductSearchItem[] | undefined;
    service
      .search(null as unknown as string, 1)
      .subscribe((items) => (received = items));
    expect(received).toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('hits /api/pos/products/search with the trimmed q and branchId', () => {
    const mock: PosProductSearchItem[] = [
      {
        id: 1,
        name: 'Aceite',
        brandName: null,
        barcode: '7501',
        salePrice: 200,
        availableStock: 5,
        imageUrl: null,
      },
    ];

    let received: PosProductSearchItem[] | undefined;
    service.search('  aceite  ', 2).subscribe((items) => (received = items));

    const req = httpMock.expectOne((r) => r.url === '/api/pos/products/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('aceite');
    expect(req.request.params.get('branchId')).toBe('2');
    req.flush(mock);

    expect(received).toEqual(mock);
  });

  it('omits the branchId query param when null', () => {
    service.search('ace', null).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/pos/products/search');
    expect(req.request.params.has('branchId')).toBe(false);
    expect(req.request.params.get('q')).toBe('ace');
    req.flush([]);
  });
});
