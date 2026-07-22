import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import { PriceUpdateBatchService } from '../data-access/price-update-batch';
import type {
  PriceUpdateBatchDetailDto,
  PriceUpdateBatchItemDto,
} from '../domain/price-update-batch';
import { SupplierService } from '../data-access/supplier';
import { PriceUpdatePageStore } from './price-update-page.store';

const now = '2026-06-01T12:00:00Z';

function batch(
  status: PriceUpdateBatchDetailDto['status'] = 'DRAFT',
  items: PriceUpdateBatchItemDto[] = [
    {
      id: 100,
      supplierProductId: 200,
      productId: 300,
      productName: 'Yerba',
      supplierSku: 'YER-1',
      supplierProductName: 'Yerba Mate',
      barcode: '779001',
      oldCost: 4800,
      newCost: 5200,
      supplierVariationPercentage: 8.333,
      newProductMarginPercentage: 35,
      oldSalePrice: 7500,
      suggestedSalePrice: 8000,
      finalSalePrice: 8000,
      applyCostUpdate: true,
      applySalePriceUpdate: true,
      createProduct: false,
      status: 'UPDATE',
      errorMessage: null,
    },
  ],
): PriceUpdateBatchDetailDto {
  return {
    id: 1,
    supplierId: 10,
    supplierName: 'Distribuidora',
    type: 'SUPPLIER_FILE',
    status,
    sourceFileName: 'prices.csv',
    defaultNewProductMarginPercentage: 35,
    applyCostUpdatesByDefault: true,
    applySalePriceUpdatesByDefault: true,
    excludeUnchangedByDefault: true,
    notes: null,
    createdAt: now,
    appliedAt: null,
    items,
  };
}

describe('PriceUpdatePageStore', () => {
  let store: PriceUpdatePageStore;
  let batchService: {
    importFile: ReturnType<typeof vi.fn>;
    createManual: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    updateDefaults: ReturnType<typeof vi.fn>;
    applyDefaultsToAll: ReturnType<typeof vi.fn>;
    updateItem: ReturnType<typeof vi.fn>;
    apply: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    batchService = {
      importFile: vi.fn(),
      createManual: vi.fn(),
      get: vi.fn(),
      updateDefaults: vi.fn(),
      applyDefaultsToAll: vi.fn(),
      updateItem: vi.fn(),
      apply: vi.fn(),
      cancel: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        PriceUpdatePageStore,
        { provide: PriceUpdateBatchService, useValue: batchService },
        {
          provide: SupplierService,
          useValue: { listSuppliers: vi.fn().mockReturnValue(of({ content: [] })) },
        },
        { provide: ProductService, useValue: { listAdminProducts: vi.fn() } },
        { provide: MessageService, useValue: { add: vi.fn() } },
        {
          provide: ErrorMappingService,
          useValue: { getMessage: vi.fn(() => 'Error controlado.') },
        },
      ],
    });
    store = TestBed.inject(PriceUpdatePageStore);
  });

  it('rejects incomplete manual input and reports empty state', () => {
    expect(store.viewState()).toBe('empty');
    store.createManualPreview();
    expect(batchService.createManual).not.toHaveBeenCalled();
    expect(store.error()).toContain('costo');
  });

  it('creates a preview and resets saving/error state on success', () => {
    batchService.createManual.mockReturnValue(of(batch()));
    store.supplierId.set(10);
    store.manualCost.set(5000);
    store.error.set('Error anterior');

    store.createManualPreview();

    expect(batchService.createManual).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: 10,
        items: [expect.objectContaining({ newCost: 5000 })],
      }),
    );
    expect(store.batch()?.id).toBe(1);
    expect(store.saving()).toBe(false);
    expect(store.error()).toBe('');
    expect(store.viewState()).toBe('data');
  });

  it('keeps the preview visible with a controlled failure and allows retry', () => {
    batchService.importFile.mockReturnValueOnce(throwError(() => new Error('network')));
    store.supplierId.set(10);
    store.fileToImport.set(new File(['sku,cost'], 'prices.csv'));
    store.importFile();

    expect(store.error()).toBe('No pudimos importar la lista del proveedor.');
    expect(store.saving()).toBe(false);

    batchService.importFile.mockReturnValueOnce(of(batch()));
    store.importFile();
    expect(store.batch()?.status).toBe('DRAFT');
    expect(store.error()).toBe('');
  });

  it('recalculates a row and applies or cancels a batch with state reset', () => {
    batchService.createManual.mockReturnValue(of(batch()));
    store.supplierId.set(10);
    store.manualCost.set(4000);
    store.createManualPreview();
    const row = store.rows()[0];
    store.onNewProductMarginChanged(30, row);
    expect(row.finalSalePrice).toBeCloseTo(7428.57, 1);

    batchService.apply.mockReturnValue(of(batch('APPLIED')));
    store.applyBatch();
    expect(store.confirmApplyVisible()).toBe(true);
    store.confirmApplyBatch();
    expect(batchService.apply).toHaveBeenCalledWith(1);
    expect(store.batch()?.status).toBe('APPLIED');

    batchService.cancel.mockReturnValue(of(batch('CANCELLED')));
    store.cancelBatch();
    expect(batchService.cancel).toHaveBeenCalledWith(1);
    expect(store.batch()?.status).toBe('CANCELLED');
  });
});
