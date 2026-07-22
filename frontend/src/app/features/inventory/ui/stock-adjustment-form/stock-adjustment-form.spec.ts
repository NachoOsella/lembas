import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ProductSummary } from '@features/catalog/domain/product';
import { StockAdjustmentForm } from './stock-adjustment-form';

const PRODUCT: ProductSummary = {
  id: 10,
  name: 'Granola',
  salePrice: 500,
  onlineStatus: 'PUBLISHED',
  categoryId: 1,
  categoryName: 'Cereales',
};

describe('StockAdjustmentForm', () => {
  let component: StockAdjustmentForm;
  let fixture: ComponentFixture<StockAdjustmentForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAdjustmentForm],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAdjustmentForm);
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

  it('emits a complete adjustment and reports product context changes', () => {
    const submitted: unknown[] = [];
    const contexts: unknown[] = [];
    component.submitted.subscribe((value) => submitted.push(value));
    component.stockContextChanged.subscribe((value) => contexts.push(value));

    component.setProduct(PRODUCT);
    component.setBranch(20);
    component.setType('WASTE');
    component.quantity.set(2);
    component.reason.set('Producto vencido');
    component.submit();

    expect(contexts).toEqual([
      { product: PRODUCT, branchId: null },
      { product: PRODUCT, branchId: 20 },
    ]);
    expect(submitted).toEqual([
      expect.objectContaining({
        product: expect.objectContaining({ id: 10, name: 'Granola' }),
        branchId: 20,
        type: 'WASTE',
        quantity: 2,
        reason: 'Producto vencido',
      }),
    ]);
  });

  it('ignores unsupported adjustment types and resets values on open', () => {
    component.setType('UNSUPPORTED');
    component.product.set(PRODUCT);
    component.branchId.set(20);
    component.quantity.set(2);
    component.reason.set('Recuento');
    component.ngOnChanges({
      visible: new SimpleChange(false, true, false),
    });

    expect(component.type()).toBe('MANUAL_ADJUSTMENT');
    expect(component.product()).toBeNull();
    expect(component.branchId()).toBeNull();
    expect(component.quantity()).toBeNull();
    expect(component.reason()).toBe('');
  });
});
