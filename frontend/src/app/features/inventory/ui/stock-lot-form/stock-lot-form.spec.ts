import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ProductSummary } from '@features/catalog/domain/product';
import { StockLotForm } from './stock-lot-form';

const PRODUCT: ProductSummary = {
  id: 10,
  name: 'Granola',
  salePrice: 500,
  onlineStatus: 'PUBLISHED',
  categoryId: 1,
  categoryName: 'Cereales',
};

describe('StockLotForm', () => {
  let component: StockLotForm;
  let fixture: ComponentFixture<StockLotForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockLotForm],
    }).compileComponents();

    fixture = TestBed.createComponent(StockLotForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('reports validation feedback without emitting an incomplete command', () => {
    const submitted: unknown[] = [];
    component.submitted.subscribe((value) => submitted.push(value));

    component.submit();

    expect(component.formError()).toBe('Completa todos los campos obligatorios.');
    expect(submitted).toEqual([]);
  });

  it('emits the typed lot value when the required fields are complete', () => {
    const submitted: unknown[] = [];
    component.submitted.subscribe((value) => submitted.push(value));
    component.product.set(PRODUCT);
    component.branchId.set(20);
    component.quantity.set(2.5);
    component.lotCode.set('L-001');

    component.submit();

    expect(submitted).toEqual([
      expect.objectContaining({
        product: expect.objectContaining({ id: 10, name: 'Granola' }),
        branchId: 20,
        quantity: 2.5,
        lotCode: 'L-001',
      }),
    ]);
    expect(component.formError()).toBe('');
  });

  it('resets editable values when the dialog becomes visible', () => {
    component.product.set(PRODUCT);
    component.branchId.set(20);
    component.quantity.set(2);
    component.lotCode.set('L-001');
    component.visible.set(false);
    component.ngOnChanges({
      visible: new SimpleChange(false, true, false),
    });

    expect(component.product()).toBeNull();
    expect(component.branchId()).toBeNull();
    expect(component.quantity()).toBeNull();
    expect(component.lotCode()).toBe('');
    expect(component.formError()).toBe('');
  });
});
