import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { ProductService } from '../../../core/services/product';
import { SupplierService } from '../../../core/services/supplier';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { Suppliers } from './suppliers';

/** Unit tests for the supplier management page. */
describe('Suppliers', () => {
  let component: Suppliers;
  let fixture: ComponentFixture<Suppliers>;
  let supplierService: {
    listSuppliers: ReturnType<typeof vi.fn>;
    listSupplierProducts: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    supplierService = {
      listSuppliers: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 })),
      listSupplierProducts: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 })),
      createSupplier: vi.fn().mockReturnValue(of({ id: 1, name: 'Distribuidora' })),
      updateSupplier: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Suppliers],
      providers: [
        MessageService,
        ErrorMappingService,
        { provide: SupplierService, useValue: supplierService },
        { provide: ProductService, useValue: { listAdminProducts: vi.fn().mockReturnValue(of({ content: [] })) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Suppliers);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load supplier tables', () => {
    expect(component).toBeTruthy();
    expect(supplierService.listSuppliers).toHaveBeenCalled();
    expect(supplierService.listSupplierProducts).toHaveBeenCalled();
  });

  it('should create a supplier from the dialog form', () => {
    component.supplierFormName.set('Distribuidora Cordoba');
    component.supplierFormContactName.set('');
    component.supplierFormPhone.set('');
    component.supplierFormEmail.set('');
    component.supplierFormCuit.set('');

    component.saveSupplier();

    expect(supplierService.createSupplier).toHaveBeenCalledWith({
      name: 'Distribuidora Cordoba',
      contactName: null,
      phone: null,
      email: null,
      cuit: null,
    });
  });
});
