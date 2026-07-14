import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { DashboardService } from '../services/dashboard';
import { DashboardStore } from './dashboard.store';
import { DashboardDto } from '../../shared/models/dashboard';

/** Unit tests for the dashboard signal-based store. */
describe('DashboardStore', () => {
  let store: DashboardStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(DashboardStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    store.stopAutoRefresh();
    httpMock.verify();
  });

  it('starts in the empty state and loads the dashboard on demand', async () => {
    const stub = buildStub();

    expect(store.data()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();

    store.load('2026-07-13');
    expect(store.loading()).toBe(true);

    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/reports/dashboard',
    );
    expect(req.request.params.get('date')).toBe('2026-07-13');
    req.flush(stub);

    // Yield to the microtask queue so the subscription callback runs.
    await Promise.resolve();
    expect(store.data()).toEqual(stub);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.lastRefreshed()).toBeInstanceOf(Date);
    expect(store.selectedDate()).toBe('2026-07-13');
  });

  it('captures the error message when the load fails', async () => {
    store.load('2026-07-13');
    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/reports/dashboard',
    );
    req.flush(
      { message: 'boom' },
      { status: 500, statusText: 'Server Error' },
    );

    await Promise.resolve();
    expect(store.data()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('boom');
  });

  it('exposes 10 stat cards grouped in rows of 4', () => {
    const stub = buildStub();
    stub.todaySales = { ...stub.todaySales, value: '$ 1' };
    stub.onlineSales = { ...stub.onlineSales, value: '$ 1' };
    stub.posSales = { ...stub.posSales, value: '$ 1' };
    stub.pendingOrders = { ...stub.pendingOrders, value: '$ 1' };
    stub.lowStockProducts = { ...stub.lowStockProducts, value: '$ 1' };
    stub.expiringLots = { ...stub.expiringLots, value: '$ 1' };
    stub.todayTransactions = { ...stub.todayTransactions, value: '$ 1' };
    stub.avgOrderValue = { ...stub.avgOrderValue, value: '$ 1' };
    stub.totalProducts = { ...stub.totalProducts, value: '$ 1' };
    stub.totalSuppliers = { ...stub.totalSuppliers, value: '$ 1' };

    // Inject the stub directly via the service for simplicity.
    const svc = TestBed.inject(DashboardService);
    vi.spyOn(svc, 'getDashboard').mockReturnValue(of(stub));

    store.load();
    expect(store.statCardRows().length).toBe(3);
    expect(store.statCardRows()[0].length).toBe(4);
    expect(store.statCardRows()[2].length).toBe(2);
  });

  function buildStub(): DashboardDto {
    const card = (label: string, value: string) => ({
      label,
      value,
      iconName: 'pi pi-shopping-cart',
      colorStyle: 'SUCCESS' as const,
    });
    return {
      reportDate: '2026-07-13',
      branchId: null,
      branchName: null,
      generatedAt: '2026-07-13T10:00:00Z',
      todaySales: card('Ventas', '$ 0'),
      onlineSales: card('Online', '$ 0'),
      posSales: card('POS', '$ 0'),
      pendingOrders: card('Pendientes', '0'),
      lowStockProducts: card('Stock bajo', '0'),
      expiringLots: card('Lotes', '0'),
      todayTransactions: card('Transacciones', '0'),
      avgOrderValue: card('Ticket prom.', '$ 0'),
      totalProducts: card('Productos', '0'),
      totalSuppliers: card('Proveedores', '0'),
      topProducts: [],
      salesByHour: [],
      salesByMethod: [],
      salesTrendPercentage: null,
      transactionsTrendPercentage: null,
      avgOrderTrendPercentage: null,
    };
  }
});
