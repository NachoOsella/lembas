import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PurchaseOrderService } from '@features/suppliers/data-access/purchase-order';
import { SupplierService } from '@features/suppliers/data-access/supplier';
import { PurchaseOrdersPageStore } from '@features/suppliers/public-api';
import { UserService } from '@features/users/data-access/user';
import { ErrorMappingService } from '@core/services/error-mapping';
import { PurchaseOrders } from './purchase-orders';

/** Unit tests for the purchase order admin page. */
describe('PurchaseOrders', () => {
  let component: PurchaseOrders;
  let fixture: ComponentFixture<PurchaseOrders>;
  let purchaseOrderService: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    downloadPdf: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    purchaseOrderService = {
      list: vi.fn().mockReturnValue(
        of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 10,
          first: true,
          last: true,
          empty: true,
        }),
      ),
      get: vi.fn(),
      create: vi.fn().mockReturnValue(of({ id: 1, items: [] })),
      update: vi.fn(),
      confirm: vi.fn().mockReturnValue(of({ id: 1, status: 'CONFIRMED' })),
      send: vi.fn().mockReturnValue(of({ id: 1, status: 'SENT' })),
      cancel: vi.fn().mockReturnValue(of({ id: 1, status: 'CANCELLED' })),
      downloadPdf: vi.fn().mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' }))),
    };

    await TestBed.configureTestingModule({
      imports: [PurchaseOrders],
      providers: [
        provideNoopAnimations(),
        MessageService,
        ErrorMappingService,
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        {
          provide: SupplierService,
          useValue: {
            listSuppliers: vi
              .fn()
              .mockReturnValue(
                of({ content: [{ id: 10, name: 'Distribuidora' }], totalElements: 1 }),
              ),
            listSupplierProducts: vi.fn().mockReturnValue(
              of({
                content: [
                  {
                    id: 30,
                    productId: 40,
                    productName: 'Yerba',
                    supplierId: 10,
                    supplierName: 'Distribuidora',
                    currentCost: 2200,
                    preferred: true,
                  },
                ],
                totalElements: 1,
              }),
            ),
          },
        },
        {
          provide: UserService,
          useValue: { listBranches: vi.fn().mockReturnValue(of([{ id: 20, name: 'Centro' }])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should load the purchase order list', () => {
    expect(component).toBeTruthy();
    expect(purchaseOrderService.list).toHaveBeenCalled();
  });

  it('should create a purchase order with preloaded supplier product cost', () => {
    const store = fixture.debugElement.injector.get(PurchaseOrdersPageStore);
    store.supplierId.set(10);
    store.branchId.set(20);
    store.supplierProducts.set([
      {
        id: 30,
        productId: 40,
        productName: 'Yerba',
        supplierId: 10,
        supplierName: 'Distribuidora',
        supplierSku: 'YER',
        currentCost: 2200,
        preferred: true,
      },
    ]);
    store.selectedSupplierProductId.set(30);

    store.addSelectedItem();
    store.save();

    expect(purchaseOrderService.create).toHaveBeenCalledWith({
      supplierId: 10,
      branchId: 20,
      expectedDeliveryDate: null,
      notes: null,
      items: [{ supplierProductId: 30, quantityOrdered: 1, unitCost: 2200 }],
    });
  });

  it('should request the PDF download for manual sending', () => {
    const store = fixture.debugElement.injector.get(PurchaseOrdersPageStore);
    const createObjectUrl = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:purchase-order');
    const revokeObjectUrl = vi
      .spyOn(window.URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    store.downloadPdf({
      id: 1,
      supplierId: 10,
      supplierName: 'Distribuidora',
      branchId: 20,
      branchName: 'Centro',
      status: 'SENT',
      orderDate: '2026-06-01T12:00:00Z',
      expectedDeliveryDate: null,
      total: 0,
      itemCount: 0,
      createdAt: '2026-06-01T12:00:00Z',
    });

    expect(purchaseOrderService.downloadPdf).toHaveBeenCalledWith(1);
    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:purchase-order');

    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
  });
});
