import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { OrderDetail } from './order-detail';
import { CustomerCheckoutService } from '@features/checkout/data-access/customer-checkout';
import { CustomerOrderService } from '@features/orders/data-access/customer-order';
import type { OrderDetail as OrderDetailData } from '@features/orders/domain/order';

/** Builds a minimal OrderDetail payload for tests. */
function detailPayload(overrides: Partial<OrderDetailData> = {}): OrderDetailData {
  return {
    id: 42,
    orderNumber: 'ON-20260612-000001',
    type: 'ONLINE',
    status: 'PENDING_PAYMENT',
    fulfillmentType: 'PICKUP',
    branchId: 1,
    branchName: 'Centro',
    customerUserId: 10,
    customerName: 'Test Customer',
    customerEmail: 'c@lembas.com',
    customerPhone: null,
    subtotal: 300,
    discountTotal: 0,
    total: 300,
    notes: null,
    cancellationReason: null,
    items: [
      {
        id: 100,
        productId: 5,
        productName: 'Yerba Mate',
        productBarcode: '123',
        quantity: 2,
        unitPrice: 150,
        discountAmount: 0,
        subtotalAmount: 300,
      },
    ],
    payments: [],
    paidAt: null,
    preparedAt: null,
    readyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: '2026-06-12T00:00:00Z',
    updatedAt: '2026-06-12T00:00:00Z',
    ...overrides,
  };
}

/** Minimal mock for CustomerOrderService. */
function mockOrderService(overrides: Partial<CustomerOrderService> = {}): CustomerOrderService {
  return {
    createOrder: vi.fn(),
    getOrders: vi.fn(),
    getOrder: vi.fn().mockReturnValue(of(detailPayload())),
    ...overrides,
  } as unknown as CustomerOrderService;
}

/** Minimal mock for CustomerCheckoutService. */
function mockCheckoutService(): CustomerCheckoutService {
  return {
    createPreference: vi
      .fn()
      .mockReturnValue(
        of({ paymentId: 99, preferenceId: 'PREF-1', initPoint: 'https://init/PREF-1' }),
      ),
  } as unknown as CustomerCheckoutService;
}

/** Minimal mock for ActivatedRoute with a paramMap observable. */
function mockRoute(id: string): ActivatedRoute {
  const params$ = new BehaviorSubject(convertToParamMap({ id }));
  return {
    snapshot: {
      paramMap: convertToParamMap({ id }),
    },
    paramMap: params$.asObservable(),
  } as unknown as ActivatedRoute;
}

describe('OrderDetail', () => {
  let component: OrderDetail;
  let fixture: ComponentFixture<OrderDetail>;

  async function configure(
    opts: {
      orderService?: CustomerOrderService;
      routeId?: string;
    } = {},
  ): Promise<void> {
    const orderService = opts.orderService ?? mockOrderService();
    const route = mockRoute(opts.routeId ?? '42');

    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CustomerOrderService, useValue: orderService },
        { provide: CustomerCheckoutService, useValue: mockCheckoutService() },
        { provide: ActivatedRoute, useValue: route },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await configure();
    expect(component).toBeTruthy();
  });

  it('should show order detail with items and totals', async () => {
    await configure();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('ON-20260612-000001');
    expect(text).toContain('Yerba Mate');
    expect(text).toContain('Pendiente de pago');
  });

  it('should show error when order not found', async () => {
    const svc = mockOrderService({
      getOrder: vi.fn().mockReturnValue(throwError(() => ({ error: { code: 'ORDER_NOT_FOUND' } }))),
    });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('no existe');
  });

  it('should show error when forbidden', async () => {
    const svc = mockOrderService({
      getOrder: vi.fn().mockReturnValue(throwError(() => ({ error: { code: 'FORBIDDEN' } }))),
    });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('No tenes acceso');
  });

  it('should show payment button when PENDING_PAYMENT', async () => {
    await configure();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Pagar con Mercado Pago');
  });

  it('should not show payment button for PAID status', async () => {
    const svc = mockOrderService({
      getOrder: vi.fn().mockReturnValue(of(detailPayload({ status: 'PAID' }))),
    });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Pagar con Mercado Pago');
  });

  it('should show cancellation reason when present', async () => {
    const svc = mockOrderService({
      getOrder: vi
        .fn()
        .mockReturnValue(
          of(detailPayload({ status: 'CANCELLED', cancellationReason: 'Producto vencido' })),
        ),
    });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Producto vencido');
  });
});
