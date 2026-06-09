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

function summary(productName: string, branchName: string, qty: string) {
  return {
    productId: 10,
    productName,
    branchId: 20,
    branchName,
    totalAvailable: Number(qty),
    nearestExpirationDate: '2026-12-31',
    activeLotCount: 2,
  };
}

const PAGE_EMPTY = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};

describe('Inventory', () => {
  let component: Inventory;
  let fixture: ComponentFixture<Inventory>;
  let inventoryService: {
    listProductSummaries: ReturnType<typeof vi.fn>;
    createStockLot: ReturnType<typeof vi.fn>;
  };
  let userService: { listBranches: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    inventoryService = {
      listProductSummaries: vi.fn().mockReturnValue(of(PAGE_EMPTY)),
      createStockLot: vi.fn(),
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
    expect(inventoryService.listProductSummaries).toHaveBeenCalled();
  });

  it('should load products on init', () => {
    const cmp = component as any;
    const page = {
      content: [summary('Granola', 'Centro', '25.500')],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: false,
    };
    inventoryService.listProductSummaries.mockReturnValue(of(page));
    cmp.loadProducts();

    expect(cmp.products().length).toBe(1);
    expect(cmp.products()[0].productName).toBe('Granola');
    expect(cmp.totalRecords()).toBe(1);
  });

  it('should show error when API fails', () => {
    const cmp = component as any;
    inventoryService.listProductSummaries.mockReturnValue(of(PAGE_EMPTY));
    cmp.loadProducts();
    expect(cmp.error()).toBe('');
  });

  it('should search by product name and reload', () => {
    const cmp = component as any;
    cmp.onSearch('Granola');

    expect(cmp.search()).toBe('Granola');
    expect(inventoryService.listProductSummaries).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Granola' }),
    );
    expect(cmp.first()).toBe(0);
  });

  it('should clear search and reload', () => {
    const cmp = component as any;
    cmp.search.set('Yerba');
    cmp.clearSearch();

    expect(cmp.search()).toBe('');
    expect(inventoryService.listProductSummaries).toHaveBeenCalledWith(
      expect.objectContaining({ search: '' }),
    );
  });

  it('should apply branch filter and reload', () => {
    const cmp = component as any;
    cmp.selectedBranchId.set(5);
    cmp.onFilterChange();

    expect(inventoryService.listProductSummaries).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 5 }),
    );
  });

  it('should handle sort change', () => {
    const cmp = component as any;
    cmp.onSort({ field: 'productName', order: 1 });

    expect(inventoryService.listProductSummaries).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'productName,asc' }),
    );
    expect(cmp.first()).toBe(0);
  });

  it('should navigate to receipts on empty action', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (component as any).navigateToReceipts();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/receipts']);
  });

  it('should navigate to lot detail when viewLots is called', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const item = summary('Granola', 'Centro', '10');

    (component as any).viewLots(item);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/admin/inventory/product', 10, 'lots'],
      { queryParams: { branchId: 20, productName: 'Granola', branchName: 'Centro' } },
    );
  });
});
