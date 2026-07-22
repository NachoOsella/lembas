import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import { InventoryService } from '@features/inventory/data-access/inventory';
import type { StockProductSummaryPage } from '@features/inventory/domain/inventory';
import { InventoryPageStore } from './inventory-page.store';

const EMPTY_PAGE: StockProductSummaryPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};

const PAGE_WITH_PRODUCT: StockProductSummaryPage = {
  ...EMPTY_PAGE,
  content: [
    {
      productId: 10,
      productName: 'Granola',
      branchId: 20,
      branchName: 'Centro',
      totalAvailable: 5,
      nearestExpirationDate: '2026-12-31',
      activeLotCount: 1,
    },
  ],
  totalElements: 1,
  totalPages: 1,
  empty: false,
};

const PRODUCT_SUMMARY = {
  productId: 10,
  productName: 'Granola',
  branchId: 20,
  branchName: 'Centro',
  totalAvailable: 5,
  nearestExpirationDate: null,
  activeLotCount: 1,
};

function apiError(code: string, status = 409): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { status, code, message: 'Backend detail must not reach the UI.' },
  });
}

describe('InventoryPageStore', () => {
  let store: InventoryPageStore;
  let inventoryService: {
    listProductSummaries: ReturnType<typeof vi.fn>;
    createStockLot: ReturnType<typeof vi.fn>;
    adjustStock: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    inventoryService = {
      listProductSummaries: vi.fn().mockReturnValue(of(EMPTY_PAGE)),
      createStockLot: vi.fn(),
      adjustStock: vi.fn(),
    };
    messageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        InventoryPageStore,
        { provide: InventoryService, useValue: inventoryService },
        { provide: ProductService, useValue: { listAdminProducts: vi.fn() } },
        {
          provide: ErrorMappingService,
          useValue: {
            getMessage: vi.fn((code: string) =>
              code === 'INSUFFICIENT_STOCK' ? 'Stock insuficiente.' : `Mapped ${code}.`,
            ),
          },
        },
        { provide: MessageService, useValue: messageService },
      ],
    });
    store = TestBed.inject(InventoryPageStore);
  });

  it('loads filter, sort, and pagination changes through the page store', () => {
    store.loadProducts();
    store.search(' Granola ');
    store.selectBranch(20);
    store.setExpiringSoon(true);
    store.changeSort({ field: 'branchName', order: -1 });
    store.changePage({ first: 20, rows: 20 });

    expect(inventoryService.listProductSummaries).toHaveBeenLastCalledWith({
      search: 'Granola',
      branchId: 20,
      expiringSoon: true,
      page: 1,
      size: 20,
      sort: 'branchName,desc',
    });
  });

  it('keeps the latest filter response and ignores the superseded response', () => {
    const firstRequest = new Subject<StockProductSummaryPage>();
    const latestRequest = new Subject<StockProductSummaryPage>();
    inventoryService.listProductSummaries
      .mockImplementationOnce(() => firstRequest.asObservable())
      .mockImplementationOnce(() => latestRequest.asObservable());

    store.loadProducts();
    store.search('Granola');
    firstRequest.next(PAGE_WITH_PRODUCT);

    expect(store.products()).toEqual([]);

    latestRequest.next(PAGE_WITH_PRODUCT);
    expect(store.products()).toEqual(PAGE_WITH_PRODUCT.content);
  });

  it('exposes loading, empty, data, and controlled error states', () => {
    const pending = new Subject<StockProductSummaryPage>();
    inventoryService.listProductSummaries.mockReturnValue(pending.asObservable());

    store.loadProducts();
    expect(store.viewState()).toBe('loading');

    pending.next(EMPTY_PAGE);
    expect(store.viewState()).toBe('empty');

    inventoryService.listProductSummaries.mockReturnValue(of(PAGE_WITH_PRODUCT));
    store.refresh();
    expect(store.viewState()).toBe('data');

    inventoryService.listProductSummaries.mockReturnValue(
      throwError(() => apiError('INTERNAL_ERROR', 500)),
    );
    store.refresh();
    expect(store.viewState()).toBe('error');
    expect(store.listError()).toBe('Mapped INTERNAL_ERROR.');
  });

  it('rejects an invalid lot without sending a command', () => {
    store.openCreateLot();
    store.createLot({
      product: null,
      branchId: 20,
      quantity: 0,
      lotCode: '',
      expirationDate: null,
      costPrice: null,
    });

    expect(inventoryService.createStockLot).not.toHaveBeenCalled();
    expect(store.lotError()).toBe('Completa todos los campos obligatorios.');
    expect(store.createLotVisible()).toBe(true);

    store.setCreateLotVisible(false);
    expect(store.lotError()).toBe('');
  });

  it('creates a valid lot, closes its dialog, and refreshes the current list', () => {
    inventoryService.createStockLot.mockReturnValue(of({ id: 1 }));
    store.openCreateLot();

    store.createLot({
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      quantity: 2,
      lotCode: '',
      expirationDate: null,
      costPrice: null,
    });

    expect(inventoryService.createStockLot).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 10, lotCode: null }),
    );
    expect(store.createLotVisible()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Lote creado' }),
    );
    expect(inventoryService.listProductSummaries).toHaveBeenCalledTimes(1);
  });

  it('keeps the lot dialog open and maps a known command error safely', () => {
    inventoryService.createStockLot.mockReturnValue(
      throwError(() => apiError('INSUFFICIENT_STOCK')),
    );
    store.openCreateLot();

    store.createLot({
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      quantity: 2,
      lotCode: '',
      expirationDate: null,
      costPrice: null,
    });

    expect(store.createLotVisible()).toBe(true);
    expect(store.lotSaving()).toBe(false);
    expect(store.lotError()).toBe('Stock insuficiente.');
  });

  it('rejects an invalid adjustment and clears transient state on close', () => {
    store.openAdjustment(PRODUCT_SUMMARY);
    store.createAdjustment({
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      type: 'WASTE',
      quantity: 1,
      reason: ' ',
    });

    expect(inventoryService.adjustStock).not.toHaveBeenCalled();
    expect(store.adjustmentError()).toBe('Completa todos los campos obligatorios.');

    store.setAdjustmentVisible(false);
    expect(store.adjustmentError()).toBe('');
    expect(store.adjustmentStockLabel()).toBe('');
  });

  it('submits a successful adjustment with the domain sign convention', () => {
    inventoryService.adjustStock.mockReturnValue(of(void 0));
    store.openAdjustment(PRODUCT_SUMMARY);

    store.createAdjustment({
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      type: 'WASTE',
      quantity: 2,
      reason: 'Producto vencido',
    });

    expect(inventoryService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: -2, type: 'WASTE' }),
    );
    expect(store.adjustmentVisible()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Ajuste registrado' }),
    );
  });

  it('keeps the adjustment dialog open and maps a known command error safely', () => {
    inventoryService.adjustStock.mockReturnValue(throwError(() => apiError('INSUFFICIENT_STOCK')));
    store.openAdjustment(PRODUCT_SUMMARY);

    store.createAdjustment({
      product: { id: 10, name: 'Granola' },
      branchId: 20,
      type: 'WASTE',
      quantity: 2,
      reason: 'Producto vencido',
    });

    expect(store.adjustmentVisible()).toBe(true);
    expect(store.adjustmentSaving()).toBe(false);
    expect(store.adjustmentError()).toBe('Stock insuficiente.');
  });
});
