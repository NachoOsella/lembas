import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import { PriceUpdateBatchService } from '@features/suppliers/data-access/price-update-batch';
import { SupplierService } from '@features/suppliers/data-access/supplier';
import { PriceUpdatePageStore } from '@features/suppliers/public-api';
import { PriceUpdateWorkflow } from './price-update-workflow';

describe('PriceUpdateWorkflow', () => {
  let fixture: ComponentFixture<PriceUpdateWorkflow>;
  let supplierService: { listSuppliers: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    supplierService = {
      listSuppliers: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 })),
    };
    await TestBed.configureTestingModule({
      imports: [PriceUpdateWorkflow],
      providers: [
        provideNoopAnimations(),
        MessageService,
        ErrorMappingService,
        { provide: PriceUpdateBatchService, useValue: { list: vi.fn() } },
        { provide: SupplierService, useValue: supplierService },
        { provide: ProductService, useValue: { listAdminProducts: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PriceUpdateWorkflow);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('creates the page and loads supplier selectors', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(supplierService.listSuppliers).toHaveBeenCalledOnce();
    expect(fixture.debugElement.injector.get(PriceUpdatePageStore).viewState()).toBe('empty');
  });
});
