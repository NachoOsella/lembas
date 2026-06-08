import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { InventoryService } from '../../../core/services/inventory';
import { ProductService } from '../../../core/services/product';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { Inventory } from './inventory';

function lot(id: number, productName: string, branchName: string, qty: string, status = 'ACTIVE') {
  return {
    id,
    productId: id + 10,
    productName,
    branchId: id + 20,
    branchName,
    initialQuantity: Number(qty),
    quantityAvailable: Number(qty),
    lotCode: 'L-' + id,
    expirationDate: '2026-12-31',
    costPrice: 500,
    unitCost: 500,
    status,
    supplierId: null,
    supplierProductId: null,
    purchaseReceiptId: null,
    purchaseReceiptItemId: null,
    totalAvailableForProductBranch: null,
  };
}

const PAGE_EMPTY = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true, empty: true };

/** Unit tests for the Inventory admin stock lots page. */
describe('Inventory', () => {
  let component: Inventory;
  let fixture: ComponentFixture<Inventory>;
  let inventoryService: { listLots: ReturnType<typeof vi.fn>; createStockLot: ReturnType<typeof vi.fn> };
  let userService: { listBranches: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    inventoryService = {
      listLots: vi.fn().mockReturnValue(of(PAGE_EMPTY)),
      createStockLot: vi.fn().mockReturnValue(of(lot(99, 'New', 'Centro', '10'))),
    };

    userService = {
      listBranches: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        MessageService,
        { provide: InventoryService, useValue: inventoryService },
        { provide: UserService, useValue: userService },
        ProductService,
        ErrorMappingService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inventory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(userService.listBranches).toHaveBeenCalled();
    expect(inventoryService.listLots).toHaveBeenCalled();
  });

  it('should load lots on init', () => {
    const cmp = component as any;
    const page = {
      content: [lot(1, 'Granola', 'Centro', '10.000')],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: false,
    };
    inventoryService.listLots.mockReturnValue(of(page));
    cmp.loadLots();

    expect(cmp.lots().length).toBe(1);
    expect(cmp.lots()[0].productName).toBe('Granola');
    expect(cmp.totalRecords()).toBe(1);
  });

  it('should show error when API fails', () => {
    const cmp = component as any;
    inventoryService.listLots.mockReturnValue(of(PAGE_EMPTY));
    cmp.loadLots();
    expect(cmp.error()).toBe('');
  });

  it('should apply product filter and reload', () => {
    const cmp = component as any;
    cmp.selectedProduct.set({ id: 10, name: 'Granola', barcode: '779' });
    cmp.onFilterChange();

    expect(inventoryService.listLots).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 10 })
    );
    expect(cmp.first()).toBe(0);
  });

  it('should apply branch filter and reload', () => {
    const cmp = component as any;
    cmp.selectedBranchId.set(5);
    cmp.onFilterChange();

    expect(inventoryService.listLots).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 5 })
    );
  });

  it('should handle sort change', () => {
    const cmp = component as any;
    cmp.onSort({ field: 'productName', order: 1 });

    expect(inventoryService.listLots).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'productName,asc' })
    );
    expect(cmp.first()).toBe(0);
  });

  it('should navigate to receipts on empty action', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (component as any).navigateToReceipts();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/receips']);
  });
});
