import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { StockProductSummaryDto } from '@features/inventory/domain/inventory';
import { InventoryTable } from './inventory-table';

const PRODUCT: StockProductSummaryDto = {
  productId: 10,
  productName: 'Granola',
  branchId: 20,
  branchName: 'Centro',
  totalAvailable: 5.25,
  nearestExpirationDate: '2026-12-31',
  activeLotCount: 1,
};

describe('InventoryTable', () => {
  let component: InventoryTable;
  let fixture: ComponentFixture<InventoryTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryTable],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryTable);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('products', [PRODUCT]);
    fixture.componentRef.setInput('state', 'data');
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('totalRecords', 1);
    await fixture.whenStable();
  });

  it('renders product data and management actions for the data state', () => {
    const text = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Granola');
    expect(text).toContain('Centro');
    expect(text).toContain('5,25');
    expect(component.state()).toBe('data');
    expect(component.columns()).toHaveLength(5);
  });

  it('formats quantities and missing expiration dates for display', () => {
    expect(component.formatQuantity(5.25)).toBe('5,25');
    expect(component.formatDate('2026-12-31')).toContain('31');
    expect(component.formatDate(null)).toBe('Sin venc.');
  });

  it('omits row actions when the user cannot manage inventory', async () => {
    fixture.componentRef.setInput('canManage', false);
    await fixture.whenStable();

    expect(component.columns()).toHaveLength(4);
  });
});
