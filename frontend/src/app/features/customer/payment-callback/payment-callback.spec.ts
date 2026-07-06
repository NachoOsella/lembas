import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaymentCallback } from './payment-callback';
import { CustomerOrderService } from '../../../core/services/customer-order';
import { OrderDetail } from '../../../shared/models/order';

function detail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 42,
    orderNumber: 'ON-1',
    type: 'ONLINE',
    status: 'PAID',
    fulfillmentType: 'PICKUP',
    branchId: 1,
    branchName: 'Centro',
    customerUserId: 10,
    customerName: 'Test',
    customerEmail: 'c@lembas.com',
    customerPhone: null,
    subtotal: 100,
    discountTotal: 0,
    total: 100,
    notes: null,
    cancellationReason: null,
    items: [],
    payments: [],
    paidAt: '2026-06-12T10:00:00Z',
    preparedAt: null,
    readyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: '2026-06-12T09:00:00Z',
    updatedAt: '2026-06-12T10:00:00Z',
    ...overrides,
  };
}

function routeWithQuery(orderId: string | null): ActivatedRoute {
  return {
    snapshot: {
      queryParamMap: {
        get: (key: string) => (key === 'orderId' ? orderId : null),
      },
    },
  } as unknown as ActivatedRoute;
}

function orderServiceMock(overrides: Partial<CustomerOrderService> = {}): CustomerOrderService {
  return {
    getOrder: vi.fn().mockReturnValue(of(detail())),
    getOrders: vi.fn(),
    createOrder: vi.fn(),
    ...overrides,
  } as unknown as CustomerOrderService;
}

describe('PaymentCallback', () => {
  let fixture: ComponentFixture<PaymentCallback>;
  let service: CustomerOrderService;

  async function configure(orderId: string | null, svc?: CustomerOrderService): Promise<void> {
    service = svc ?? orderServiceMock();
    await TestBed.configureTestingModule({
      imports: [PaymentCallback],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: CustomerOrderService, useValue: service },
        { provide: ActivatedRoute, useValue: routeWithQuery(orderId) },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentCallback);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show error state when orderId query param is missing', async () => {
    await configure(null);
    expect((fixture.componentInstance as unknown as { phase: () => string }).phase()).toBe('error');
  });

  it('should transition to success when the order is PAID', async () => {
    await configure(
      '42',
      orderServiceMock({ getOrder: vi.fn().mockReturnValue(of(detail({ status: 'PAID' }))) }),
    );
    expect((fixture.componentInstance as unknown as { phase: () => string }).phase()).toBe(
      'success',
    );
  });

  it('should transition to failure when the order is PAYMENT_FAILED', async () => {
    await configure(
      '42',
      orderServiceMock({
        getOrder: vi.fn().mockReturnValue(of(detail({ status: 'PAYMENT_FAILED' }))),
      }),
    );
    expect((fixture.componentInstance as unknown as { phase: () => string }).phase()).toBe(
      'failure',
    );
  });

  it('should transition to stock_conflict when the order is STOCK_CONFLICT', async () => {
    await configure(
      '42',
      orderServiceMock({
        getOrder: vi.fn().mockReturnValue(of(detail({ status: 'STOCK_CONFLICT' }))),
      }),
    );
    expect((fixture.componentInstance as unknown as { phase: () => string }).phase()).toBe(
      'stock_conflict',
    );
  });

  it('should fall back to pending after the polling budget is exhausted', async () => {
    vi.useFakeTimers();
    const getOrder = vi.fn().mockReturnValue(of(detail({ status: 'PENDING_PAYMENT' })));
    try {
      await configure('42', orderServiceMock({ getOrder }));
      // Advance through every polling attempt.
      for (let i = 0; i < 12; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      expect((fixture.componentInstance as unknown as { phase: () => string }).phase()).toBe(
        'pending',
      );
      expect(getOrder).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should surface error phase when getOrder fails', async () => {
    await configure(
      '42',
      orderServiceMock({ getOrder: vi.fn().mockReturnValue(throwError(() => new Error('boom'))) }),
    );
    expect((fixture.componentInstance as unknown as { phase: () => string }).phase()).toBe('error');
  });

  it('should navigate to /customer/orders when backToOrders is called', async () => {
    await configure('42');
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate');
    (fixture.componentInstance as unknown as { backToOrders: () => void }).backToOrders();
    expect(spy).toHaveBeenCalledWith(['/customer/orders']);
  });
});
