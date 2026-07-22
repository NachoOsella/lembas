import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@core/services/auth';
import { ErrorMappingService } from '@core/services/error-mapping';
import { UserService } from '@features/users/data-access/user';
import { AdminOrderService } from '@features/orders/data-access/admin-order';
import { AdminOrdersPageStore } from '@features/orders/public-api';
import type { OrderStatus, OrderSummary } from '@features/orders/domain/order';
import { Orders } from './orders';
import type { PageResponse } from '@shared/types/page';

function order(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 1,
    orderNumber: 'ON-001',
    type: 'ONLINE',
    status: 'PAID',
    fulfillmentType: 'PICKUP',
    branchId: 1,
    branchName: 'Centro',
    customerUserId: 10,
    customerName: 'Test Customer',
    subtotal: 200,
    discountTotal: 0,
    total: 200,
    itemCount: 1,
    paidAt: '2026-06-12T10:00:00Z',
    deliveredAt: null,
    createdAt: '2026-06-12T00:00:00Z',
    ...overrides,
  };
}

function page(content: OrderSummary[], number = 0): PageResponse<OrderSummary> {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number,
    size: 10,
    first: number === 0,
    last: true,
    empty: content.length === 0,
  };
}

type AdminOrderServiceMock = {
  listOrders: ReturnType<typeof vi.fn>;
  prepare: ReturnType<typeof vi.fn>;
  markReady: ReturnType<typeof vi.fn>;
  deliver: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};

describe('Admin order list decomposition', () => {
  let fixture: ComponentFixture<Orders>;
  let service: AdminOrderServiceMock;

  beforeEach(() => {
    service = {
      listOrders: vi.fn().mockReturnValue(of(page([]))),
      prepare: vi.fn(),
      markReady: vi.fn(),
      deliver: vi.fn(),
      cancel: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [Orders],
      providers: [
        provideNoopAnimations(),
        { provide: AdminOrderService, useValue: service },
        { provide: AuthService, useValue: { currentUser: () => null, getUserRole: () => 'ADMIN' } },
        { provide: ErrorMappingService, useValue: { getMessage: () => 'Error' } },
        { provide: MessageService, useValue: { add: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: UserService, useValue: { listBranches: vi.fn().mockReturnValue(of([])) } },
      ],
    });

    fixture = TestBed.createComponent(Orders);
  });

  it('loads and renders data rows', async () => {
    service.listOrders.mockReturnValue(of(page([order({ orderNumber: 'ON-100' })])));
    const store = fixture.debugElement.injector.get(AdminOrdersPageStore);
    store.load();
    await fixture.whenStable();

    expect(store.orders()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('ON-100');
  });

  it('renders an empty result without treating it as an error', async () => {
    const store = fixture.debugElement.injector.get(AdminOrdersPageStore);
    store.load();
    await fixture.whenStable();

    expect(store.orders()).toEqual([]);
    expect(store.error()).toBe('');
  });

  it('keeps only the latest filter response', () => {
    const oldResponse = new Subject<PageResponse<OrderSummary>>();
    const latestResponse = new Subject<PageResponse<OrderSummary>>();
    service.listOrders.mockImplementation((query: { search?: string }) =>
      query.search === 'old' ? oldResponse : latestResponse,
    );
    const store = fixture.debugElement.injector.get(AdminOrdersPageStore);

    store.setSearch('old');
    store.setSearch('new');
    latestResponse.next(page([order({ orderNumber: 'NEW' })]));
    oldResponse.next(page([order({ orderNumber: 'OLD' })]));

    expect(store.orders()[0]?.orderNumber).toBe('NEW');
  });

  it('maps failure and recovers on retry', async () => {
    service.listOrders.mockReturnValueOnce(throwError(() => new Error('network failure')));
    const store = fixture.debugElement.injector.get(AdminOrdersPageStore);
    store.load();
    await fixture.whenStable();
    expect(store.error()).toContain('No pudimos cargar');

    service.listOrders.mockReturnValue(of(page([order({ status: 'READY' })])));
    store.load();
    await fixture.whenStable();
    expect(store.error()).toBe('');
    expect(store.orders()[0]?.status).toBe('READY' satisfies OrderStatus);
  });

  it('resets filters and pagination while preserving the request contract', () => {
    const store = fixture.debugElement.injector.get(AdminOrdersPageStore);
    store.setStatus('CANCELLED');
    store.setSearch('pedido');
    store.setPage(20, 10);
    service.listOrders.mockClear();

    store.clearFilters();
    expect(service.listOrders).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      status: undefined,
      type: undefined,
      branchId: undefined,
      from: undefined,
      to: undefined,
      search: undefined,
      sort: undefined,
    });
  });
});
