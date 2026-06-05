import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { InventoryService } from '../../../core/services/inventory';
import { ProductService } from '../../../core/services/product';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { StockEntry } from './stock-entry';

const product = {
  id: 10,
  name: 'Granola',
  brandName: 'Lembas',
  barcode: '7790001',
  salePrice: 1000,
  onlineStatus: 'PUBLISHED' as const,
  categoryId: 1,
  categoryName: 'Cereales',
};

/** Unit tests for the stock entry form validation and submit flow. */
describe('StockEntry', () => {
  let fixture: ComponentFixture<StockEntry>;
  let component: StockEntry;
  let inventoryService: { createStockLot: ReturnType<typeof vi.fn> };
  let productService: { listAdminProducts: ReturnType<typeof vi.fn> };
  let userService: { listBranches: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    inventoryService = { createStockLot: vi.fn() };
    productService = { listAdminProducts: vi.fn().mockReturnValue(of({ content: [product] })) };
    userService = { listBranches: vi.fn().mockReturnValue(of([{ id: 20, name: 'Centro' }])) };

    await TestBed.configureTestingModule({
      imports: [StockEntry],
      providers: [
        MessageService,
        ErrorMappingService,
        { provide: InventoryService, useValue: inventoryService },
        { provide: ProductService, useValue: productService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockEntry);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load the only branch by default', () => {
    expect(component).toBeTruthy();
    expect(userService.listBranches).toHaveBeenCalled();
    expect((component as any).branchId()).toBe(20);
  });

  it('should reject submit when product is missing', () => {
    (component as any).quantity.set(2);

    (component as any).save();

    expect((component as any).productInvalid()).toBe(true);
    expect(inventoryService.createStockLot).not.toHaveBeenCalled();
  });

  it('should reject submit when quantity is not positive', () => {
    (component as any).selectedProduct.set(product);
    (component as any).quantity.set(0);

    (component as any).save();

    expect((component as any).quantityInvalid()).toBe(true);
    expect(inventoryService.createStockLot).not.toHaveBeenCalled();
  });

  it('should submit a valid stock entry and show the created summary', () => {
    inventoryService.createStockLot.mockReturnValue(
      of({
        id: 1,
        productId: 10,
        productName: 'Granola',
        branchId: 20,
        branchName: 'Centro',
        initialQuantity: 2,
        quantityAvailable: 2,
        unitCost: 0,
        status: 'ACTIVE',
        totalAvailableForProductBranch: 7,
      }),
    );
    (component as any).selectedProduct.set(product);
    (component as any).quantity.set(2);
    (component as any).lotCode.set('L-001');

    (component as any).save();

    expect(inventoryService.createStockLot).toHaveBeenCalledWith({
      productId: 10,
      branchId: 20,
      quantity: 2,
      lotCode: 'L-001',
      expirationDate: null,
      costPrice: null,
    });
    expect((component as any).createdLot()?.totalAvailableForProductBranch).toBe(7);
  });

  it('should expose an error message when backend creation fails', () => {
    inventoryService.createStockLot.mockReturnValue(throwError(() => new Error('boom')));
    (component as any).selectedProduct.set(product);
    (component as any).quantity.set(2);

    (component as any).save();

    expect((component as any).error()).toBe('No pudimos registrar el ingreso de stock.');
  });
});
