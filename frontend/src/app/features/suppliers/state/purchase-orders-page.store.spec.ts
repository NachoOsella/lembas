import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorMappingService } from '@core/services/error-mapping';
import { UserService } from '@features/users/data-access/user';
import { PurchaseOrderService } from '../data-access/purchase-order';
import { SupplierService } from '../data-access/supplier';
import type { PurchaseOrderPage, PurchaseOrderSummaryDto } from '../domain/purchase-order';
import type { SupplierPage, SupplierProductPage } from '../domain/supplier';
import { PurchaseOrdersPageStore } from './purchase-orders-page.store';

const EMPTY_PAGE: PurchaseOrderPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};
const EMPTY_SUPPLIERS: SupplierPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};
const EMPTY_PRODUCTS: SupplierProductPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};

const order = (status: PurchaseOrderSummaryDto['status']): PurchaseOrderSummaryDto => ({
  id: 1,
  supplierId: 10,
  supplierName: 'Distribuidora',
  branchId: 20,
  branchName: 'Centro',
  status,
  orderDate: '2026-06-01T12:00:00Z',
  expectedDeliveryDate: null,
  total: 200,
  itemCount: 1,
  createdAt: '2026-06-01T12:00:00Z',
});

describe('PurchaseOrdersPageStore', () => {
  let store: PurchaseOrdersPageStore;
  let orderService: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    downloadPdf: ReturnType<typeof vi.fn>;
  };
  let supplierService: {
    listSuppliers: ReturnType<typeof vi.fn>;
    listSupplierProducts: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    orderService = {
      list: vi.fn().mockReturnValue(of(EMPTY_PAGE)),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      confirm: vi.fn(),
      send: vi.fn(),
      cancel: vi.fn(),
      downloadPdf: vi.fn(),
    };
    supplierService = {
      listSuppliers: vi.fn().mockReturnValue(of(EMPTY_SUPPLIERS)),
      listSupplierProducts: vi.fn().mockReturnValue(of(EMPTY_PRODUCTS)),
    };
    TestBed.configureTestingModule({
      providers: [
        PurchaseOrdersPageStore,
        { provide: PurchaseOrderService, useValue: orderService },
        { provide: SupplierService, useValue: supplierService },
        { provide: UserService, useValue: { listBranches: vi.fn().mockReturnValue(of([])) } },
        { provide: MessageService, useValue: { add: vi.fn() } },
        {
          provide: ErrorMappingService,
          useValue: { getMessage: vi.fn(() => 'Error controlado.') },
        },
      ],
    });
    store = TestBed.inject(PurchaseOrdersPageStore);
  });

  it('keeps the latest list filter request', () => {
    const firstRequest = new Subject<PurchaseOrderPage>();
    const secondRequest = new Subject<PurchaseOrderPage>();
    orderService.list
      .mockReturnValueOnce(firstRequest.asObservable())
      .mockReturnValueOnce(secondRequest.asObservable());

    store.loadOrders();
    store.supplierFilter.set(10);
    store.applyFilters();

    expect(secondRequest.closed).toBe(false);
    expect(orderService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ supplierId: 10, page: 0 }),
    );
    secondRequest.next({
      ...EMPTY_PAGE,
      content: [order('DRAFT')],
      totalElements: 1,
      empty: false,
    });
    firstRequest.next({
      ...EMPTY_PAGE,
      content: [order('CANCELLED')],
      totalElements: 1,
      empty: false,
    });
    expect(store.orders().map((value) => value.status)).toEqual(['DRAFT']);
  });

  it('exposes empty, data, and retryable failure states', () => {
    store.loadOrders();
    expect(store.viewState()).toBe('empty');

    orderService.list.mockReturnValueOnce(
      of({ ...EMPTY_PAGE, content: [order('DRAFT')], totalElements: 1 }),
    );
    store.loadOrders();
    expect(store.viewState()).toBe('data');

    orderService.list.mockReturnValueOnce(throwError(() => new Error('network')));
    store.loadOrders();
    expect(store.viewState()).toBe('error');
    expect(store.error()).toBe('No pudimos cargar las ordenes de compra.');
  });

  it('creates a valid order and preloads supplier cost', () => {
    orderService.create.mockReturnValue(of({ id: 1 }));
    store.supplierId.set(10);
    store.branchId.set(20);
    store.supplierProducts.set([
      {
        id: 30,
        productId: 40,
        productName: 'Yerba',
        supplierId: 10,
        supplierName: 'Distribuidora',
        currentCost: 2200,
        preferred: true,
      },
    ]);
    store.selectedSupplierProductId.set(30);
    store.addSelectedItem();
    store.save();

    expect(orderService.create).toHaveBeenCalledWith({
      supplierId: 10,
      branchId: 20,
      expectedDeliveryDate: null,
      notes: null,
      items: [{ supplierProductId: 30, quantityOrdered: 1, unitCost: 2200 }],
    });
    expect(store.dialogVisible()).toBe(false);
  });

  it('rejects invalid forms and resets cancellation state after success', () => {
    store.save();
    expect(orderService.create).not.toHaveBeenCalled();
    expect(store.submitted()).toBe(true);

    orderService.cancel.mockReturnValue(of({ id: 1, status: 'CANCELLED' }));
    store.openCancel(order('SENT'));
    store.cancelReason.set('Sin disponibilidad');
    store.cancelSelected();

    expect(orderService.cancel).toHaveBeenCalledWith(1, { reason: 'Sin disponibilidad' });
    expect(store.cancelDialogVisible()).toBe(false);
    expect(store.orderToCancel()).toBeNull();
  });
});
