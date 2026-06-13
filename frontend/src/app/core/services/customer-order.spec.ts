import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { CustomerOrderService, CreateOnlineOrderRequest, OrderCreated } from './customer-order';

describe('CustomerOrderService', () => {
  let service: CustomerOrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomerOrderService,
      ],
    });
    service = TestBed.inject(CustomerOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------
  // createOrder
  // -------------------------------------------------------------------
  it('should POST to /api/customer/orders', () => {
    const request: CreateOnlineOrderRequest = {
      branchId: 1,
      items: [{ productId: 10, quantity: 2 }],
    };

    service.createOrder(request).subscribe();

    const req = httpMock.expectOne('/api/customer/orders');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 1, orderNumber: 'ON-001', status: 'PENDING_PAYMENT', total: 3000 });
  });

  it('should return OrderCreated response', () => {
    const mockResponse: OrderCreated = {
      id: 42,
      orderNumber: 'ON-20260612-000001',
      status: 'PENDING_PAYMENT',
      total: 5000,
    };

    const request: CreateOnlineOrderRequest = {
      branchId: 1,
      items: [{ productId: 10, quantity: 1 }],
    };

    service.createOrder(request).subscribe((result) => {
      expect(result.id).toBe(42);
      expect(result.orderNumber).toBe('ON-20260612-000001');
      expect(result.status).toBe('PENDING_PAYMENT');
      expect(result.total).toBe(5000);
    });

    const req = httpMock.expectOne('/api/customer/orders');
    req.flush(mockResponse);
  });

  it('should send notes when provided', () => {
    const request: CreateOnlineOrderRequest = {
      branchId: 1,
      items: [{ productId: 10, quantity: 1 }],
      notes: 'Sin TACC por favor',
    };

    service.createOrder(request).subscribe();

    const req = httpMock.expectOne('/api/customer/orders');
    expect(req.request.body.notes).toBe('Sin TACC por favor');
    req.flush({ id: 1, orderNumber: 'ON-001', status: 'PENDING_PAYMENT', total: 100 });
  });

  it('should send multiple items', () => {
    const request: CreateOnlineOrderRequest = {
      branchId: 2,
      items: [
        { productId: 10, quantity: 2 },
        { productId: 20, quantity: 1 },
        { productId: 30, quantity: 3 },
      ],
    };

    service.createOrder(request).subscribe();

    const req = httpMock.expectOne('/api/customer/orders');
    expect(req.request.body.items).toHaveLength(3);
    req.flush({ id: 1, orderNumber: 'ON-001', status: 'PENDING_PAYMENT', total: 100 });
  });

  it('should propagate HTTP errors', () => {
    const request: CreateOnlineOrderRequest = {
      branchId: 1,
      items: [{ productId: 10, quantity: 100 }],
    };

    service.createOrder(request).subscribe({
      next: () => {
        throw new Error('Expected an error');
      },
      error: (error) => {
        expect(error.status).toBe(409);
        expect(error.error.code).toBe('INSUFFICIENT_STOCK');
      },
    });

    const req = httpMock.expectOne('/api/customer/orders');
    req.flush(
      { code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock' },
      { status: 409, statusText: 'Conflict' },
    );
  });

  it('should handle 404 for product not found', () => {
    const request: CreateOnlineOrderRequest = {
      branchId: 1,
      items: [{ productId: 999, quantity: 1 }],
    };

    service.createOrder(request).subscribe({
      next: () => {
        throw new Error('Expected an error');
      },
      error: (error) => {
        expect(error.status).toBe(404);
        expect(error.error.code).toBe('PRODUCT_NOT_FOUND');
      },
    });

    const req = httpMock.expectOne('/api/customer/orders');
    req.flush(
      { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      { status: 404, statusText: 'Not Found' },
    );
  });
});
