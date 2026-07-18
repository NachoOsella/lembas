import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PriceUpdateBatchService } from '@features/suppliers/data-access/price-update-batch';
import { SupplierService } from '@features/suppliers/data-access/supplier';
import { ProductService } from '@features/catalog/data-access/product';
import { ErrorMappingService } from '@core/services/error-mapping';
import { PriceUpdateWorkflow } from './price-update-workflow';
import type {
  PriceUpdateBatchDetailDto,
  PriceUpdateBatchItemDto,
} from '@features/suppliers/domain/price-update-batch';

describe('PriceUpdateWorkflow', () => {
  let component: PriceUpdateWorkflow;
  let cmp: any;
  let fixture: ComponentFixture<PriceUpdateWorkflow>;
  let batchService: {
    importFile: ReturnType<typeof vi.fn>;
    createManual: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    updateDefaults: ReturnType<typeof vi.fn>;
    applyDefaultsToAll: ReturnType<typeof vi.fn>;
    updateItem: ReturnType<typeof vi.fn>;
    validate: ReturnType<typeof vi.fn>;
    apply: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let supplierService: {
    listSuppliers: ReturnType<typeof vi.fn>;
  };
  let productService: {
    listAdminProducts: ReturnType<typeof vi.fn>;
  };

  const now = '2026-06-01T12:00:00Z';

  /** Builds a sample batch detail with configurable status. */
  function sampleBatch(
    id: number,
    status: 'DRAFT' | 'VALIDATED' | 'APPLIED' | 'CANCELLED' = 'DRAFT',
    items: PriceUpdateBatchItemDto[] | null = null,
  ): PriceUpdateBatchDetailDto {
    return {
      id,
      supplierId: 10,
      supplierName: 'Distribuidora',
      type: 'SUPPLIER_FILE',
      status,
      sourceFileName: 'prices.xlsx',
      defaultNewProductMarginPercentage: 35,
      applyCostUpdatesByDefault: true,
      applySalePriceUpdatesByDefault: true,
      excludeUnchangedByDefault: true,
      notes: null,
      createdAt: now,
      appliedAt: null,
      items: items ?? [
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
    };
  }

  beforeEach(async () => {
    batchService = {
      importFile: vi.fn(),
      createManual: vi.fn(),
      get: vi.fn(),
      list: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 })),
      updateDefaults: vi.fn(),
      applyDefaultsToAll: vi.fn(),
      updateItem: vi.fn(),
      validate: vi.fn(),
      apply: vi.fn(),
      cancel: vi.fn(),
    };
    supplierService = {
      listSuppliers: vi.fn().mockReturnValue(
        of({
          content: [
            {
              id: 10,
              name: 'Distribuidora',
              contactName: null,
              phone: null,
              email: null,
              cuit: '30-12345678-9',
              active: true,
            },
            {
              id: 20,
              name: 'Mayorista SRL',
              contactName: null,
              phone: null,
              email: null,
              cuit: '30-87654321-0',
              active: true,
            },
          ],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 100,
          first: true,
          last: true,
          empty: false,
        }),
      ),
    };
    productService = {
      listAdminProducts: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 })),
    };

    await TestBed.configureTestingModule({
      imports: [PriceUpdateWorkflow],
      providers: [
        provideNoopAnimations(),
        MessageService,
        ErrorMappingService,
        { provide: PriceUpdateBatchService, useValue: batchService },
        { provide: SupplierService, useValue: supplierService },
        { provide: ProductService, useValue: productService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceUpdateWorkflow);
    component = fixture.componentInstance;
    cmp = component as any;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should load suppliers on init', () => {
    expect(component).toBeTruthy();
    expect(supplierService.listSuppliers).toHaveBeenCalledOnce();
    expect(cmp.allSuppliers().length).toBe(2);
  });

  it('should set error when importing without supplier or file', () => {
    cmp.importFile();

    expect(cmp.error()).toBeTruthy();
  });

  it('should set error when creating manual preview without supplier or cost', () => {
    cmp.createManualPreview();

    expect(cmp.error()).toBeTruthy();
  });

  it('should ignore file selection when supplier is missing', () => {
    const input = document.createElement('input');
    const file = new File(['sku,nombre,costo\n'], 'prices.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });

    cmp.onFileSelected({ target: input } as unknown as Event);

    expect(batchService.importFile).not.toHaveBeenCalled();
    expect(cmp.fileToImport()).toBeNull();
    expect(cmp.error()).toContain('proveedor');
  });

  it('should import a file and set batch preview', () => {
    const batch = sampleBatch(1);
    batchService.importFile.mockReturnValue(of(batch));
    cmp.supplierId.set(10);
    cmp.fileToImport.set(new File([''], 'prices.csv'));

    cmp.importFile();

    expect(batchService.importFile).toHaveBeenCalledOnce();
    expect(cmp.batch()?.id).toBe(1);
    expect(cmp.saving()).toBe(false);
    expect(cmp.error()).toBe('');
  });

  it('should handle import error', () => {
    batchService.importFile.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { code: 'PRICE_BATCH_FILE_EMPTY', message: 'El archivo esta vacio' },
      })),
    );
    cmp.supplierId.set(10);
    cmp.fileToImport.set(new File([''], 'prices.csv'));

    cmp.importFile();

    expect(cmp.error()).toBeTruthy();
    expect(cmp.saving()).toBe(false);
  });

  it('should create manual preview and set batch', () => {
    const batch = sampleBatch(1);
    batchService.createManual.mockReturnValue(of(batch));
    cmp.supplierId.set(10);
    cmp.manualCost.set(5000);

    cmp.createManualPreview();

    expect(batchService.createManual).toHaveBeenCalledOnce();
    expect(cmp.batch()?.id).toBe(1);
  });

  it('should save defaults', () => {
    const batch = sampleBatch(2);
    batchService.updateDefaults.mockReturnValue(of(batch));
    cmp.batch.set(sampleBatch(1));
    cmp.defaultMargin.set(40);

    cmp.saveDefaults();

    expect(batchService.updateDefaults).toHaveBeenCalledWith(1, {
      newProductMarginPercentage: 40,
      applyCostUpdatesByDefault: true,
      applySalePriceUpdatesByDefault: true,
      excludeUnchangedByDefault: true,
    });
    expect(cmp.batch()?.id).toBe(2);
  });

  it('should apply defaults to all rows', () => {
    const batch = sampleBatch(2);
    batchService.applyDefaultsToAll.mockReturnValue(of(batch));
    cmp.batch.set(sampleBatch(1));

    cmp.applyDefaultsToAll();

    expect(batchService.applyDefaultsToAll).toHaveBeenCalledWith(1);
    expect(cmp.batch()?.id).toBe(2);
  });

  it('should apply a batch after confirmation', () => {
    const batch = sampleBatch(2, 'APPLIED');
    batchService.apply.mockReturnValue(of(batch));
    cmp.batch.set(sampleBatch(1));

    cmp.confirmApplyBatch();

    expect(batchService.apply).toHaveBeenCalledWith(1);
    expect(cmp.saving()).toBe(false);
  });

  it('should cancel a batch', () => {
    const batch = sampleBatch(2, 'CANCELLED');
    batchService.cancel.mockReturnValue(of(batch));
    cmp.batch.set(sampleBatch(1));

    cmp.cancelBatch();

    expect(batchService.cancel).toHaveBeenCalledWith(1);
    expect(cmp.saving()).toBe(false);
  });

  it('should compute canApply as true when no blocking items', () => {
    cmp.batch.set(sampleBatch(1));

    expect(cmp.canApply()).toBe(true);
  });

  it('should compute canApply as false when batch is applied', () => {
    cmp.batch.set(sampleBatch(1, 'APPLIED'));

    expect(cmp.canApply()).toBe(false);
  });

  it('should compute canApply as false when batch has review items', () => {
    const items: PriceUpdateBatchItemDto[] = [
      {
        ...sampleBatch(1).items[0],
        status: 'REVIEW',
        errorMessage: 'Multiple products match this supplier row name',
      },
    ];
    cmp.batch.set(sampleBatch(1, 'DRAFT', items));

    expect(cmp.canApply()).toBe(false);
  });

  it('should compute canApply as false when batch has unapproved creates', () => {
    const items: PriceUpdateBatchItemDto[] = [
      {
        ...sampleBatch(1).items[0],
        status: 'CREATE',
        createProduct: false,
      },
    ];
    cmp.batch.set(sampleBatch(1, 'DRAFT', items));

    expect(cmp.canApply()).toBe(false);
  });

  it('should save all rows sequentially', () => {
    const batch = sampleBatch(1);
    batchService.updateItem.mockReturnValue(of({}));
    batchService.get.mockReturnValue(of(sampleBatch(2)));

    cmp.batch.set(batch);
    cmp.saveAllRows();

    expect(cmp.saving()).toBe(false);
  });

  it('should exclude blocking rows', () => {
    const items: PriceUpdateBatchItemDto[] = [
      {
        ...sampleBatch(1).items[0],
        id: 101,
        status: 'REVIEW',
        errorMessage: 'Ambiguous match',
      },
    ];
    const batch = sampleBatch(1, 'DRAFT', items);
    batchService.updateItem.mockReturnValue(of({}));
    batchService.get.mockReturnValue(of(sampleBatch(2)));

    cmp.batch.set(batch);
    cmp.excludeBlockingRows();

    expect(cmp.saving()).toBe(false);
  });

  it('should approve all CREATE rows', () => {
    const items: PriceUpdateBatchItemDto[] = [
      {
        ...sampleBatch(1).items[0],
        id: 101,
        status: 'CREATE',
        createProduct: false,
        productId: null,
        productName: null,
        supplierProductId: null,
      },
    ];
    const batch = sampleBatch(1, 'DRAFT', items);
    batchService.updateItem.mockReturnValue(of({}));
    batchService.get.mockReturnValue(of(sampleBatch(2)));

    cmp.batch.set(batch);
    cmp.approveAllCreates();

    expect(cmp.saving()).toBe(false);
  });

  it('should toggle confirm dialog visibility on apply', () => {
    cmp.batch.set(sampleBatch(1));

    expect(cmp.confirmApplyVisible()).toBe(false);
    cmp.applyBatch();
    expect(cmp.confirmApplyVisible()).toBe(true);
  });

  it('should not open confirm dialog when batch cannot be applied', () => {
    cmp.batch.set(sampleBatch(1, 'APPLIED'));

    cmp.applyBatch();
    expect(cmp.confirmApplyVisible()).toBe(false);
  });

  it('should not save defaults when no batch is loaded', () => {
    cmp.saveDefaults();

    expect(batchService.updateDefaults).not.toHaveBeenCalled();
  });

  it('should not apply defaults when no batch is loaded', () => {
    cmp.applyDefaultsToAll();

    expect(batchService.applyDefaultsToAll).not.toHaveBeenCalled();
  });

  it('should show supplier options in computed', () => {
    expect(cmp.supplierOptions()).toEqual([
      { label: 'Distribuidora', value: 10 },
      { label: 'Mayorista SRL', value: 20 },
    ]);
  });

  it('should clear error on successful operation', () => {
    cmp.error.set('Anterior error');
    const batch = sampleBatch(1);
    batchService.importFile.mockReturnValue(of(batch));
    cmp.supplierId.set(10);
    cmp.fileToImport.set(new File([''], 'prices.csv'));

    cmp.importFile();

    expect(cmp.error()).toBe('');
  });

  it('should clear manual row when supplier changes', () => {
    cmp.manualProduct.set({
      id: 1,
      name: 'Yerba',
      barcode: '779001',
      categoryId: 1,
      categoryName: 'Alimentos',
      onlineStatus: 'PUBLISHED',
      salePrice: 0,
      cost: 0,
    } as any);
    cmp.manualSku.set('YER-1');
    cmp.manualCost.set(5000);

    cmp.onSupplierChanged(20);

    expect(cmp.manualProduct()).toBeNull();
    expect(cmp.manualSku()).toBe('');
    expect(cmp.manualCost()).toBeNull();
  });

  it('should derive margin from final price on change', () => {
    const row = {
      id: 100,
      supplierSku: 'SUP-1',
      barcode: '779001',
      productName: 'Producto',
      newCost: 4000,
      newProductMarginPercentage: 35,
      finalSalePrice: 6200,
      applyCostUpdate: true,
      applySalePriceUpdate: true,
      createProduct: false,
      excluded: false,
    };

    cmp.onFinalPriceChanged(6200, row);

    // margin = (1 - 4000/6200) * 100 = 35.48...
    expect(row.finalSalePrice).toBe(6200);
    expect(row.newProductMarginPercentage).toBeGreaterThan(35);
    expect(row.newProductMarginPercentage).toBeLessThan(36);
  });

  it('should recalc final price from margin on change', () => {
    const row = {
      id: 101,
      supplierSku: '',
      barcode: '',
      productName: 'Nuevo',
      newCost: 4000,
      newProductMarginPercentage: 30,
      finalSalePrice: null,
      applyCostUpdate: true,
      applySalePriceUpdate: true,
      createProduct: true,
      excluded: false,
    };

    cmp.onNewProductMarginChanged(30, row);

    expect(row.newProductMarginPercentage).toBe(30);
    expect(row.finalSalePrice).toBeGreaterThan(0);
    // price = 4000 / (1 - 0.30) = 5714.2857... -> rounded to 5714.29
    expect(row.finalSalePrice).toBeCloseTo(5714.29, 1);
  });
});
