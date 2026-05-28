import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CategoryService } from '../../../../core/services/category';
import { ProductService } from '../../../../core/services/product';
import { ProductForm } from './product-form';

/** Tests product form creation, edition prefill and client validations. */
describe('ProductForm', () => {
  let fixture: ComponentFixture<ProductForm>;
  let component: ProductForm;
  const productService = {
    getProduct: vi.fn(),
    createProduct: vi.fn().mockReturnValue(of({ id: 1 })),
    updateProduct: vi.fn().mockReturnValue(of({ id: 1 })),
  };
  const categoryService = { listAdminCategories: vi.fn().mockReturnValue(of([{ id: 1, name: 'Cereales' }])) };
  const router = { navigate: vi.fn() };

  async function setup(id: string | null = null): Promise<void> {
    vi.clearAllMocks();
    productService.getProduct.mockReturnValue(of({
      id: 9,
      name: 'Granola',
      description: 'Integral',
      brandName: 'Lembas',
      barcode: '7790001',
      categoryId: 1,
      categoryName: 'Cereales',
      salePrice: 1200,
      minimumStock: 2,
      onlineStatus: 'DRAFT',
    }));
    await TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: ProductService, useValue: productService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => id } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('does not submit when required fields are missing', async () => {
    await setup();

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('creates a product with valid values', async () => {
    await setup();
    (component as unknown as { name: { set: (value: string) => void } }).name.set('Granola');
    (component as unknown as { categoryId: { set: (value: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (value: number) => void } }).salePrice.set(1200);

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Granola', categoryId: 1, salePrice: 1200 }));
  });

  it('loads product data in edit mode', async () => {
    await setup('9');

    expect(productService.getProduct).toHaveBeenCalledWith(9);
    expect(fixture.nativeElement.textContent).toContain('Editar producto');
  });
});
