import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PosSaleService, CreatePosSaleRequest } from './pos-sale.service';
import { OrderDetail } from '../../../../shared/models/order';

/** Unit tests for {@link PosSaleService}. */
describe('PosSaleService', () => {
  let service: PosSaleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PosSaleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('POSTs to /api/pos/sales with the provided request', () => {
    const request: CreatePosSaleRequest = {
      items: [{ productId: 100, quantity: 2 }],
      paymentMethod: 'CASH',
      cashReceived: 5000,
      notes: 'cliente frecuente',
    };
    const mockResponse: Partial<OrderDetail> = {
      id: 1,
      orderNumber: 'PS-20260630-000001',
      type: 'POS',
      status: 'PAID',
      total: 5000,
    };

    let received: OrderDetail | undefined;
    service.createSale(request).subscribe((detail) => (received = detail as OrderDetail));

    const req = httpMock.expectOne('/api/pos/sales');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);

    expect(received).toBeDefined();
    expect(received!.id).toBe(1);
    expect(received!.type).toBe('POS');
  });

  it('forwards a 4xx with the API error body so the FE can map it', () => {
    const request: CreatePosSaleRequest = {
      items: [{ productId: 100, quantity: 99 }],
      paymentMethod: 'CASH',
      cashReceived: null,
      notes: null,
    };

    let received: OrderDetail | undefined;
    let errorStatus: number | undefined;
    service.createSale(request).subscribe({
      next: (d) => (received = d),
      error: (err) => (errorStatus = err.status),
    });

    const req = httpMock.expectOne('/api/pos/sales');
    req.flush(
      { status: 409, code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(received).toBeUndefined();
    expect(errorStatus).toBe(409);
  });

  it('sends null cashReceived for non-CASH payments', () => {
    const request: CreatePosSaleRequest = {
      items: [{ productId: 100, quantity: 1 }],
      paymentMethod: 'QR',
      cashReceived: null,
      notes: null,
    };

    service.createSale(request).subscribe();

    const req = httpMock.expectOne('/api/pos/sales');
    expect(req.request.body).toEqual(request);
    req.flush({});
  });
});
