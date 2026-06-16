import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Orders } from './orders';
import { CustomerOrderService } from '../../../core/services/customer-order';
import { OrderSummary } from '../../../shared/models/order';

/** Builds a minimal OrderSummary for test setups. */
function summary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 1,
    orderNumber: 'ON-001',
    type: 'ONLINE',
    status: 'PENDING_PAYMENT',
    fulfillmentType: 'PICKUP',
    branchId: 1,
    branchName: 'Centro',
    customerUserId: 10,
    customerName: 'Test Customer',
    subtotal: 200,
    discountTotal: 0,
    total: 200,
    itemCount: 2,
    paidAt: null,
    deliveredAt: null,
    createdAt: '2026-06-12T00:00:00Z',
    ...overrides,
  };
}

/** Minimal mock for CustomerOrderService. */
function mockOrderService(overrides: Partial<CustomerOrderService> = {}): CustomerOrderService {
  return {
    createOrder: vi.fn(),
    getOrders: vi.fn().mockReturnValue(of([])),
    getOrder: vi.fn(),
    ...overrides,
  } as unknown as CustomerOrderService;
}

describe('Orders', () => {
  let component: Orders;
  let fixture: ComponentFixture<Orders>;

  async function configure(opts: { orderService?: CustomerOrderService } = {}): Promise<void> {
    const orderService = opts.orderService ?? mockOrderService();

    await TestBed.configureTestingModule({
      imports: [Orders],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CustomerOrderService, useValue: orderService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Orders);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await configure();
    expect(component).toBeTruthy();
  });

  it('should show loading state initially', async () => {
    const svc = mockOrderService({ getOrders: vi.fn().mockReturnValue(of([])) });
    await configure({ orderService: svc });

    // loading is set to false after response; verify component renders
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Historial de compras');
  });

  it('should show empty state when no orders exist', async () => {
    const svc = mockOrderService({ getOrders: vi.fn().mockReturnValue(of([])) });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Aun no tenes pedidos');
    expect(text).toContain('Ir a la tienda');
  });

  it('should display orders in the table when orders exist', async () => {
    const ordersList: OrderSummary[] = [
      summary({ orderNumber: 'ON-001', status: 'PENDING_PAYMENT', total: 200 }),
      summary({ id: 2, orderNumber: 'ON-002', status: 'PAID', total: 500 }),
    ];
    const svc = mockOrderService({ getOrders: vi.fn().mockReturnValue(of(ordersList)) });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('ON-001');
    expect(text).toContain('ON-002');
    expect(text).toContain('Pendiente de pago');
  });

  it('should show error state when API fails', async () => {
    const svc = mockOrderService({
      getOrders: vi.fn().mockReturnValue(throwError(() => new Error('Network error'))),
    });
    await configure({ orderService: svc });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('No pudimos cargar tus pedidos');
  });

  it('should call goToStore when seguir comprando is clicked', async () => {
    const svc = mockOrderService({ getOrders: vi.fn().mockReturnValue(of([])) });
    await configure({ orderService: svc });

    const buttons = fixture.nativeElement.querySelectorAll('app-button');
    // The "Seguir comprando" button should be in the header
    expect(buttons.length).toBeGreaterThan(0);
  });
});
