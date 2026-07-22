import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PriceUpdateBatchService } from './price-update-batch';
import type {
  PriceUpdateBatchDetailDto,
  PriceUpdateBatchItemDto,
  PriceUpdateBatchItemUpdateRequest,
  PriceUpdateBatchPage,
} from '@features/suppliers/domain/price-update-batch';
import { PriceUpdateBatchSummaryDto } from '@features/suppliers/domain/price-update-batch';

describe('PriceUpdateBatchService', () => {
  let service: PriceUpdateBatchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PriceUpdateBatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list price update batches with default pagination', () => {
    const expected: PriceUpdateBatchPage = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: true,
    };

    service.list({}).subscribe((page) => expect(page).toEqual(expected));

    const req = httpMock.expectOne(
      (request) => request.url === '/api/admin/price-update-batches' && request.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('createdAt,desc');
    req.flush(expected);
  });

  it('should list with supplier, status and custom pagination', () => {
    service.list({ supplierId: 10, status: 'DRAFT', page: 1, size: 5 }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/admin/price-update-batches' && request.method === 'GET',
    );
    expect(req.request.params.get('supplierId')).toBe('10');
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

  it('should create a manual batch', () => {
    const request = {
      supplierId: 10,
      defaults: { newProductMarginPercentage: 35 },
      items: [{ supplierSku: 'SUP-1', barcode: null, productName: 'Producto', newCost: 5000 }],
      notes: null,
    };
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.createManual(request).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/admin/price-update-batches/manual' && request.method === 'POST',
    );
    expect(req.request.body).toEqual(request);
    req.flush(expected);
  });

  it('should import a supplier file', () => {
    const file = new File(['sku,cost\nSUP-1,5000'], 'prices.csv', { type: 'text/csv' });
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service
      .importFile(10, file, { newProductMarginPercentage: 35 }, 'test notes')
      .subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/admin/price-update-batches/import' && request.method === 'POST',
    );
    expect(req.request.method).toBe('POST');
    if (!(req.request.body instanceof FormData)) {
      throw new Error('Expected multipart form data.');
    }
    const formData = req.request.body;
    expect(formData.get('supplierId')).toBe('10');
    expect(formData.get('file')).toBe(file);
    expect(formData.get('newProductMarginPercentage')).toBe('35');
    expect(formData.get('notes')).toBe('test notes');
    req.flush(expected);
  });

  it('should import a supplier file without optional params', () => {
    const file = new File([''], 'prices.csv');
    const expected: PriceUpdateBatchDetailDto = detailDto(2);

    service.importFile(10, file, {}).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/admin/price-update-batches/import' && request.method === 'POST',
    );
    if (!(req.request.body instanceof FormData)) {
      throw new Error('Expected multipart form data.');
    }
    const formData = req.request.body;
    expect(formData.get('supplierId')).toBe('10');
    expect(formData.get('newProductMarginPercentage')).toBeNull();
    expect(formData.get('applyCostUpdatesByDefault')).toBeNull();
    req.flush(expected);
  });

  it('should get a batch detail', () => {
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.get(1).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1');
    expect(req.request.method).toBe('GET');
    req.flush(expected);
  });

  it('should update global defaults', () => {
    const request = {
      newProductMarginPercentage: 40,
      applyCostUpdatesByDefault: true,
      applySalePriceUpdatesByDefault: false,
      excludeUnchangedByDefault: true,
    };
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.updateDefaults(1, request).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1/defaults');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    req.flush(expected);
  });

  it('should apply defaults to all rows', () => {
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.applyDefaultsToAll(1).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1/apply-defaults-to-all');
    expect(req.request.method).toBe('PATCH');
    req.flush(expected);
  });

  it('should update a single preview item', () => {
    const request: PriceUpdateBatchItemUpdateRequest = {
      newProductMarginPercentage: 30,
      finalSalePrice: 8000,
    };
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.updateItem(1, 100, request).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1/items/100');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    req.flush(expected);
  });

  it('should validate a batch', () => {
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.validate(1).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1/validate');
    expect(req.request.method).toBe('PATCH');
    req.flush(expected);
  });

  it('should apply a batch', () => {
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.apply(1).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1/apply');
    expect(req.request.method).toBe('PATCH');
    req.flush(expected);
  });

  it('should cancel a batch', () => {
    const expected: PriceUpdateBatchDetailDto = detailDto(1);

    service.cancel(1).subscribe((dto) => expect(dto).toEqual(expected));

    const req = httpMock.expectOne('/api/admin/price-update-batches/1/cancel');
    expect(req.request.method).toBe('PATCH');
    req.flush(expected);
  });

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  function detailDto(id: number): PriceUpdateBatchDetailDto {
    const now = '2026-06-01T12:00:00Z';
    const item: PriceUpdateBatchItemDto = {
      id: 100,
      supplierProductId: 200,
      productId: 300,
      productName: 'Producto',
      supplierSku: 'SUP-1',
      supplierProductName: 'Producto Proveedor',
      barcode: '779001',
      oldCost: 4800,
      newCost: 5200,
      supplierVariationPercentage: 8.333,
      newProductMarginPercentage: 35,
      oldSalePrice: 7500,
      suggestedSalePrice: 8000,
      finalSalePrice: 8000,
      applyCostUpdate: true,
      applySalePriceUpdate: true,
      createProduct: false,
      status: 'UPDATE',
      errorMessage: null,
    };
    return {
      id,
      supplierId: 10,
      supplierName: 'Distribuidora',
      type: 'MANUAL_GRID',
      status: 'DRAFT',
      sourceFileName: null,
      defaultNewProductMarginPercentage: 35,
      applyCostUpdatesByDefault: true,
      applySalePriceUpdatesByDefault: true,
      excludeUnchangedByDefault: true,
      notes: null,
      createdAt: now,
      appliedAt: null,
      items: [item],
    };
  }
});
