import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { StoreBranchSelectionService } from '@features/branches/public-api';
import { CatalogService } from './catalog';

describe('CatalogService', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;
  let branchSelection: StoreBranchSelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    branchSelection = TestBed.inject(StoreBranchSelectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- getCategories ---

  it('should GET /api/store/categories', () => {
    const mockCategories = [
      { id: 1, name: 'Cereales', productCount: 3 },
      { id: 2, name: 'Bebidas', productCount: 5 },
    ];

    service.getCategories().subscribe((cats) => {
      expect(cats.length).toBe(2);
      expect(cats[0].name).toBe('Cereales');
    });

    const req = httpMock.expectOne('/api/store/categories');
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
  });

  // --- getProducts ---

  it('should GET /api/store/products with default params', () => {
    const mockResponse = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
      first: true,
      last: true,
      empty: true,
    };

    service.getProducts().subscribe((res) => {
      expect(res.content).toEqual([]);
      expect(res.totalElements).toBe(0);
    });

    const req = httpMock.expectOne((r) => r.url === '/api/store/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(mockResponse);
  });

  it('should include query, category and pagination params when provided', () => {
    const mockResponse = {
      content: [{ id: 1, name: 'Test', salePrice: 100 }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: false,
    };

    service.getProducts('granola', 2, 1, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/store/products');
    expect(req.request.params.get('q')).toBe('granola');
    expect(req.request.params.get('categoryId')).toBe('2');
    expect(req.request.params.has('branchId')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(mockResponse);
  });

  it('should not include optional params when undefined', () => {
    service.getProducts(undefined, undefined, 0, 20).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/store/products');
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.has('categoryId')).toBe(false);
    expect(req.request.params.has('branchId')).toBe(false);
    req.flush({ content: [], totalElements: 0 });
  });

  it('should include selected branchId in product queries', () => {
    branchSelection.selectedBranchId.set(7);

    service.getProducts(undefined, undefined, 0, 20).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/store/products');
    expect(req.request.params.get('branchId')).toBe('7');
    req.flush({ content: [], totalElements: 0 });
  });

  // --- getFeaturedProducts ---

  it('should GET /api/store/products/featured', () => {
    const mockResponse = {
      content: [{ id: 1, name: 'Featured', salePrice: 500 }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 15,
      first: true,
      last: true,
      empty: false,
    };

    service.getFeaturedProducts().subscribe((res) => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].name).toBe('Featured');
    });

    const req = httpMock.expectOne((r) => r.url === '/api/store/products/featured');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  // --- getProductDetail ---

  it('should GET /api/store/products/:id', () => {
    const mockProduct = {
      id: 42,
      name: 'Granola',
      salePrice: 2500,
      onlineStatus: 'PUBLISHED',
      categoryId: 1,
      categoryName: 'Cereales',
    };

    service.getProductDetail(42).subscribe((p) => {
      expect(p.name).toBe('Granola');
    });

    const req = httpMock.expectOne((r) => r.url === '/api/store/products/42');
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  // --- getRelatedProducts ---

  it('should GET /api/store/products/:id/related', () => {
    const mockResponse = {
      content: [
        { id: 10, name: 'Related A', salePrice: 1000 },
        { id: 11, name: 'Related B', salePrice: 2000 },
      ],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 6,
      first: true,
      last: true,
      empty: false,
    };

    service.getRelatedProducts(42).subscribe((res) => {
      expect(res.content.length).toBe(2);
      expect(res.content[0].name).toBe('Related A');
    });

    const req = httpMock.expectOne((r) => r.url === '/api/store/products/42/related');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
