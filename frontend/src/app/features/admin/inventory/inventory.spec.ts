import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@core/services/auth';
import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import { InventoryService } from '@features/inventory/data-access/inventory';
import { UserService } from '@features/users/data-access/user';
import { Inventory } from './inventory';

const EMPTY_PAGE = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};

const PRODUCT_PAGE = {
  ...EMPTY_PAGE,
  content: [
    {
      productId: 10,
      productName: 'Granola',
      branchId: 20,
      branchName: 'Centro',
      totalAvailable: 25.5,
      nearestExpirationDate: '2026-12-31',
      activeLotCount: 2,
    },
  ],
  totalElements: 1,
  totalPages: 1,
  empty: false,
};

describe('Inventory', () => {
  let component: Inventory;
  let fixture: ComponentFixture<Inventory>;
  let inventoryService: {
    listProductSummaries: ReturnType<typeof vi.fn>;
    createStockLot: ReturnType<typeof vi.fn>;
    adjustStock: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inventoryService = {
      listProductSummaries: vi.fn().mockReturnValue(of(PRODUCT_PAGE)),
      createStockLot: vi.fn(),
      adjustStock: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        MessageService,
        {
          provide: AuthService,
          useValue: {
            getUserRole: vi.fn(() => 'MANAGER'),
            currentUser: vi.fn(() => ({ branchId: 20 })),
          },
        },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ProductService, useValue: { listAdminProducts: vi.fn() } },
        {
          provide: UserService,
          useValue: { listBranches: vi.fn().mockReturnValue(of([{ id: 20, name: 'Centro' }])) },
        },
        {
          provide: ErrorMappingService,
          useValue: { getMessage: vi.fn(() => 'Error controlado.') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inventory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('loads the first inventory page and renders data state', () => {
    expect(component.store.products()).toEqual(PRODUCT_PAGE.content);
    expect(component.store.viewState()).toBe('data');
    expect(inventoryService.listProductSummaries).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 10, sort: 'productName,asc' }),
    );
  });

  it('applies search, branch, expiration, sort, and pagination filters', () => {
    component.store.search('Granola');
    component.store.selectBranch(20);
    component.store.setExpiringSoon(true);
    component.store.changeSort({ field: 'branchName', order: -1 });
    component.store.changePage({ first: 20, rows: 20 });

    expect(inventoryService.listProductSummaries).toHaveBeenLastCalledWith({
      search: 'Granola',
      branchId: 20,
      expiringSoon: true,
      page: 1,
      size: 20,
      sort: 'branchName,desc',
    });
  });

  it('opens a clean lot form with the assigned branch', () => {
    component.openCreateLot();

    expect(component.store.createLotVisible()).toBe(true);
    expect(component.assignedBranchId()).toBe(20);
    expect(component.store.lotError()).toBe('');
  });

  it('navigates to receipts from the empty-state action', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.navigateToReceipts();

    expect(navigate).toHaveBeenCalledWith(['/admin/receipts']);
  });

  it('navigates to the selected product-branch lots', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.viewLots(PRODUCT_PAGE.content[0]);

    expect(navigate).toHaveBeenCalledWith(['/admin/inventory/product', 10, 'lots'], {
      queryParams: { branchId: 20, productName: 'Granola', branchName: 'Centro' },
    });
  });
});
