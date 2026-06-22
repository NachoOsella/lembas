import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { CustomerCheckoutService, CreatePreferenceResponse } from './customer-checkout';

describe('CustomerCheckoutService', () => {
  let service: CustomerCheckoutService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CustomerCheckoutService],
    });
    service = TestBed.inject(CustomerCheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST to the preference endpoint and return the init point', () => {
    const response: CreatePreferenceResponse = {
      paymentId: 99,
      preferenceId: 'PREF-1',
      initPoint: 'https://www.mercadopago.com/checkout?pref=PREF-1',
    };

    let received: CreatePreferenceResponse | undefined;
    service.createPreference(42).subscribe((data) => (received = data));

    const req = httpMock.expectOne('/api/customer/orders/42/payments/preference');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(response);

    expect(received).toEqual(response);
  });

  it('should propagate 409 when the order is not payable', () => {
    let error: unknown;
    service.createPreference(42).subscribe({
      next: () => undefined,
      error: (err) => (error = err),
    });

    const req = httpMock.expectOne('/api/customer/orders/42/payments/preference');
    req.flush(
      { code: 'ORDER_NOT_PAYABLE', message: 'Order is not in a payable state' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(error).toBeTruthy();
  });
});
