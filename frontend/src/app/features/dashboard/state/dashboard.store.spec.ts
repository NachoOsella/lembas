import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { finalize, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { DashboardService } from '@features/dashboard/data-access/dashboard';
import { DashboardStore } from './dashboard.store';
import type { DashboardDto, DashboardStatCardDto } from '@features/dashboard/domain/dashboard';

/** Unit tests for the dashboard signal-based store. */
describe('DashboardStore', () => {
  let store: DashboardStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(DashboardStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    store.stopAutoRefresh();
    httpMock.verify({ ignoreCancelled: true });
    vi.restoreAllMocks();
  });

  it('starts in the empty state and loads the dashboard on demand', async () => {
    const stub = buildStub();

    expect(store.data()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();

    store.load('2026-07-13');
    expect(store.loading()).toBe(true);

    const req = httpMock.expectOne((r) => r.url === '/api/admin/reports/dashboard');
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

  it('marks an all-zero payload as empty data', async () => {
    store.load('2026-07-13');
    const req = httpMock.expectOne((r) => r.url === '/api/admin/reports/dashboard');
    req.flush(buildStub());

    await Promise.resolve();
    expect(store.data()).not.toBeNull();
    expect(store.isEmpty()).toBe(true);
  });

  it('captures the error message when the load fails', async () => {
    store.load('2026-07-13');
    const req = httpMock.expectOne((r) => r.url === '/api/admin/reports/dashboard');
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    await Promise.resolve();
    expect(store.data()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('INTERNAL_ERROR');
  });

  it('keeps the load stream recoverable so refresh can retry the selected date', async () => {
    store.load('2026-07-13');
    const failedRequest = httpMock.expectOne((r) => r.url === '/api/admin/reports/dashboard');
    failedRequest.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();

    store.refresh();
    const retriedRequest = httpMock.expectOne((r) => r.url === '/api/admin/reports/dashboard');
    expect(retriedRequest.request.params.get('date')).toBe('2026-07-13');
    retriedRequest.flush(buildStub());

    await Promise.resolve();
    expect(store.error()).toBeNull();
    expect(store.data()).not.toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('cancels an older request when a newer date is selected', () => {
    const firstResponse = new Subject<DashboardDto>();
    const secondResponse = new Subject<DashboardDto>();
    const firstCancelled = vi.fn();
    const service = TestBed.inject(DashboardService);

    vi.spyOn(service, 'getDashboard').mockImplementation((date) =>
      date === '2026-07-12' ? firstResponse.pipe(finalize(firstCancelled)) : secondResponse,
    );

    store.load('2026-07-12');
    store.load('2026-07-13');

    expect(firstCancelled).toHaveBeenCalledOnce();
    expect(store.selectedDate()).toBe('2026-07-13');

    firstResponse.next({ ...buildStub(), reportDate: '2026-07-12' });
    expect(store.data()).toBeNull();

    const newestData = { ...buildStub(), reportDate: '2026-07-13' };
    secondResponse.next(newestData);
    expect(store.data()).toEqual(newestData);
  });

  it('does not run auto-refresh after the page-scoped store is destroyed', () => {
    vi.useFakeTimers();
    try {
      const service = TestBed.inject(DashboardService);
      const getDashboard = vi.spyOn(service, 'getDashboard').mockReturnValue(of(buildStub()));

      store.startAutoRefresh();
      store.ngOnDestroy();
      vi.advanceTimersByTime(60_001);

      expect(getDashboard).not.toHaveBeenCalled();
      expect(store.autoRefreshEnabled()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
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
    const card = (label: string, value: string): DashboardStatCardDto => ({
      label,
      value,
      iconName: 'pi pi-shopping-cart',
      colorStyle: 'SUCCESS',
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
