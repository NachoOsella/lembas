import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import { SupplierService } from '../data-access/supplier';
import type { SupplierPage, SupplierProductPage } from '../domain/supplier';
import { SuppliersPageStore } from './suppliers-page.store';

const EMPTY_SUPPLIERS: SupplierPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};
const EMPTY_PRODUCTS: SupplierProductPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
};

describe('SuppliersPageStore', () => {
  let store: SuppliersPageStore;
  let supplierService: {
    listSuppliers: ReturnType<typeof vi.fn>;
    listSupplierProducts: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    supplierService = {
      listSuppliers: vi.fn().mockReturnValue(of(EMPTY_SUPPLIERS)),
      listSupplierProducts: vi.fn().mockReturnValue(of(EMPTY_PRODUCTS)),
      createSupplier: vi.fn(),
      updateSupplier: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        SuppliersPageStore,
        { provide: SupplierService, useValue: supplierService },
        { provide: ProductService, useValue: { listAdminProducts: vi.fn() } },
        { provide: MessageService, useValue: { add: vi.fn() } },
        {
          provide: ErrorMappingService,
          useValue: { getMessage: vi.fn(() => 'Error controlado.') },
        },
      ],
    });
    store = TestBed.inject(SuppliersPageStore);
  });

  it('cancels superseded supplier filter requests and keeps the latest result', () => {
    const firstRequest = new Subject<SupplierPage>();
    const secondRequest = new Subject<SupplierPage>();
    supplierService.listSuppliers
      .mockReturnValueOnce(firstRequest.asObservable())
      .mockReturnValueOnce(secondRequest.asObservable());

    store.loadSuppliers();
    store.onSearch('yerba');

    expect(secondRequest.closed).toBe(false);
    expect(supplierService.listSuppliers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'yerba', page: 0 }),
    );
    secondRequest.next({
      ...EMPTY_SUPPLIERS,
      content: [{ id: 2, name: 'Ultimo resultado' }],
      totalElements: 1,
      empty: false,
    });
    firstRequest.next({
      ...EMPTY_SUPPLIERS,
      content: [{ id: 1, name: 'Resultado obsoleto' }],
      totalElements: 1,
      empty: false,
    });
    expect(store.suppliers().map((supplier) => supplier.name)).toEqual(['Ultimo resultado']);
  });

  it('exposes loading, empty, data, and retryable error states', () => {
    const pending = new Subject<SupplierPage>();
    supplierService.listSuppliers.mockReturnValueOnce(pending.asObservable());
    store.loadSuppliers();
    expect(store.supplierViewState()).toBe('loading');

    pending.next(EMPTY_SUPPLIERS);
    expect(store.supplierViewState()).toBe('empty');

    const data: SupplierPage = {
      ...EMPTY_SUPPLIERS,
      content: [{ id: 1, name: 'Distribuidora' }],
      totalElements: 1,
      empty: false,
    };
    supplierService.listSuppliers.mockReturnValueOnce(of(data));
    store.loadSuppliers();
    expect(store.supplierViewState()).toBe('data');

    supplierService.listSuppliers.mockReturnValueOnce(throwError(() => new Error('network')));
    store.loadSuppliers();
    expect(store.supplierViewState()).toBe('error');
    expect(store.error()).toBe('No pudimos cargar los proveedores.');

    supplierService.listSuppliers.mockReturnValueOnce(of(data));
    store.loadSuppliers();
    expect(store.supplierViewState()).toBe('data');
  });

  it('rejects an invalid supplier and saves a valid supplier with reset state', () => {
    store.supplierFormName.set(' ');
    store.saveSupplier();
    expect(supplierService.createSupplier).not.toHaveBeenCalled();
    expect(store.error()).toBe('El nombre del proveedor es obligatorio.');

    supplierService.createSupplier.mockReturnValue(of({ id: 1, name: 'Distribuidora' }));
    store.supplierFormName.set(' Distribuidora ');
    store.saveSupplier();

    expect(supplierService.createSupplier).toHaveBeenCalledWith({
      name: 'Distribuidora',
      contactName: null,
      phone: null,
      email: null,
      cuit: null,
    });
    expect(store.supplierDialogVisible()).toBe(false);
    expect(store.saving()).toBe(false);
  });
});
