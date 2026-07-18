import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { InventoryService } from '@features/inventory/data-access/inventory';
import { UserService } from '@features/users/data-access/user';
import { StockMovements } from './stock-movements';

const MOVEMENTS_PAGE = {
  content: [
    {
      id: 1,
      stockLotId: 2,
      productId: 10,
      productName: 'Granola',
      branchId: 20,
      branchName: 'Centro',
      type: 'MANUAL_ADJUSTMENT',
      quantity: 3,
      unitCostSnapshot: 500,
      reason: 'Reconteo',
      createdByUserId: 100,
      createdAt: '2026-06-08T15:00:00Z',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: false,
};

/** Creates the stock movement page with mocked inventory dependencies. */
describe('StockMovements', () => {
  let fixture: ComponentFixture<StockMovements>;
  let component: StockMovements;
  let inventoryService: { listMovements: ReturnType<typeof vi.fn> };
  let userService: { listBranches: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    inventoryService = {
      listMovements: vi.fn().mockReturnValue(of(MOVEMENTS_PAGE)),
    };
    userService = {
      listBranches: vi.fn().mockReturnValue(of([{ id: 20, name: 'Centro' }])),
    };

    await TestBed.configureTestingModule({
      imports: [StockMovements],
      providers: [
        provideNoopAnimations(),
        { provide: InventoryService, useValue: inventoryService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockMovements);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Should_loadMovements_when_componentStarts', () => {
    expect(component).toBeTruthy();
    expect(inventoryService.listMovements).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 10, sort: 'createdAt,desc' }),
    );
    expect((component as any).movements().length).toBe(1);
  });

  it('Should_sendSearchFilterAndResetPage_when_searching', () => {
    const cmp = component as any;
    cmp.first.set(20);

    cmp.onSearch('Granola');

    expect(cmp.first()).toBe(0);
    expect(inventoryService.listMovements).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Granola' }),
    );
  });

  it('Should_renderCustomMovementCells_when_dataIsLoaded', () => {
    const badge = fixture.nativeElement.querySelector('.movement-type-badge');
    const quantity = fixture.nativeElement.querySelector('.movement-quantity--positive');

    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('Ajuste manual');
    expect(quantity).toBeTruthy();
  });
});
