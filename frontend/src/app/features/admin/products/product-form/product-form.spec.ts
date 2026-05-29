import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { CategoryService } from '../../../../core/services/category';
import { ProductService } from '../../../../core/services/product';
import { ProductForm } from './product-form';

const mockProduct = {
  id: 9,
  name: 'Granola',
  description: 'Integral',
  brandName: 'Lembas',
  barcode: '7790001',
  categoryId: 1,
  categoryName: 'Cereales',
  salePrice: 1200,
  minimumStock: 2,
  imageUrl: 'https://example.com/img.jpg',
  onlineStatus: 'DRAFT' as const,
};

const mockCategories = [
  { id: 1, name: 'Cereales' },
  { id: 2, name: 'Yerbas' },
];

/** Tests product form creation, edition, validation and navigation. */
describe('ProductForm', () => {
  let fixture: ComponentFixture<ProductForm>;
  let component: ProductForm;

  const productService = {
    getProduct: vi.fn().mockReturnValue(of(mockProduct)),
    createProduct: vi.fn().mockReturnValue(of({ id: 1 })),
    updateProduct: vi.fn().mockReturnValue(of({ id: 9 })),
  };
  const categoryService = {
    listAdminCategories: vi.fn().mockReturnValue(of(mockCategories)),
  };
  const router = { navigate: vi.fn() };

  async function setup(id: string | null = null): Promise<void> {
    vi.clearAllMocks();
    productService.getProduct.mockReturnValue(of(mockProduct));
    productService.createProduct.mockReturnValue(of({ id: 1 }));
    productService.updateProduct.mockReturnValue(of({ id: 9 }));
    categoryService.listAdminCategories.mockReturnValue(of(mockCategories));
    router.navigate.mockClear();

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

  // --- Creation mode ---

  it('shows create title when no id is provided', async () => {
    await setup();
    expect(fixture.nativeElement.textContent).toContain('Nuevo producto');
  });

  it('does not load a product when no id is provided', async () => {
    await setup();
    expect(productService.getProduct).not.toHaveBeenCalled();
  });

  it('does not submit when required fields are missing', async () => {
    await setup();
    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('shows validation errors after first submit attempt', async () => {
    await setup();
    (component as unknown as { save: () => void }).save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio');
    expect(fixture.nativeElement.textContent).toContain('La categoria es obligatoria');
  });

  it('creates a product with valid values and navigates back', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Granola');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(1200);

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Granola',
        categoryId: 1,
        salePrice: 1200,
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/admin/products']);
  });

  // --- Edit mode ---

  it('shows edit title when id is provided', async () => {
    await setup('9');
    expect(fixture.nativeElement.textContent).toContain('Editar producto');
  });

  it('loads product data in edit mode', async () => {
    await setup('9');
    expect(productService.getProduct).toHaveBeenCalledWith(9);
  });

  it('prefills form fields from loaded product', async () => {
    await setup('9');
    const comp = component as unknown as {
      name: () => string;
      brandName: () => string;
      barcode: () => string;
      categoryId: () => number;
      salePrice: () => number;
      description: () => string;
    };
    expect(comp.name()).toBe('Granola');
    expect(comp.brandName()).toBe('Lembas');
    expect(comp.barcode()).toBe('7790001');
    expect(comp.categoryId()).toBe(1);
    expect(comp.salePrice()).toBe(1200);
    expect(comp.description()).toBe('Integral');
  });

  it('updates a product in edit mode and navigates back', async () => {
    await setup('9');
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Granola updated');

    (component as unknown as { save: () => void }).save();

    expect(productService.updateProduct).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ name: 'Granola updated' }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/admin/products']);
  });

  // --- Barcode validation ---

  it('rejects invalid barcode format', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(100);
    (component as unknown as { barcode: { set: (v: string) => void } }).barcode.set('ab');

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('accepts valid barcode format', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(100);
    (component as unknown as { barcode: { set: (v: string) => void } }).barcode.set('7790001');

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).toHaveBeenCalled();
  });

  it('allows empty barcode', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(100);
    (component as unknown as { barcode: { set: (v: string) => void } }).barcode.set('');

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).toHaveBeenCalled();
  });

  // --- Image preview ---

  it('shows placeholder when no image url is set', async () => {
    await setup();
    (component as unknown as { imageUrl: { set: (v: string) => void } }).imageUrl.set('');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.product-form__preview img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('product-placeholder');
  });

  it('shows image url when set', async () => {
    await setup();
    (component as unknown as { imageUrl: { set: (v: string) => void } }).imageUrl.set(
      'https://example.com/photo.jpg',
    );
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.product-form__preview img');
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  // --- Error display ---

  it('shows error alert when loading fails', async () => {
    await setup('9');
    productService.getProduct.mockReturnValue(throwError(() => new Error('fail')));

    // Re-trigger the load by creating a new component
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: ProductService, useValue: productService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '9' } } } },
      ],
    }).compileComponents();

    const errorFixture = TestBed.createComponent(ProductForm);
    errorFixture.detectChanges();

    expect(errorFixture.nativeElement.textContent).toContain('No pudimos cargar el producto');
  });

  // --- Sale price validation ---

  it('rejects negative sale price', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(-100);

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('accepts zero sale price', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Free Sample');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(0);

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).toHaveBeenCalled();
  });

  it('accepts positive sale price', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Granola');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(1200);

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).toHaveBeenCalled();
  });

  it('rejects form when sale price is null', async () => {
    await setup();
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number | null) => void } }).salePrice.set(
      null,
    );

    (component as unknown as { save: () => void }).save();

    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  // --- Save error handling ---

  it('shows error message when create fails', async () => {
    await setup();
    productService.createProduct.mockReturnValue(
      throwError(() => ({ error: { code: 'PRODUCT_BARCODE_DUPLICATED' } })),
    );
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(100);

    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(
      'Ya existe un producto activo con ese barcode',
    );
  });

  it('shows generic error when save fails with unknown code', async () => {
    await setup();
    productService.createProduct.mockReturnValue(throwError(() => ({ error: {} })));
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(100);

    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No pudimos guardar el producto');
  });

  it('shows error when update fails', async () => {
    await setup('9');
    productService.updateProduct.mockReturnValue(
      throwError(() => ({ error: { code: 'PRODUCT_NOT_FOUND' } })),
    );

    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('El producto ya no existe o fue eliminado');
  });

  it('clears error on successful retry', async () => {
    await setup();
    productService.createProduct
      .mockReturnValueOnce(throwError(() => ({ error: {} })))
      .mockReturnValueOnce(of({ id: 1 }));
    (component as unknown as { name: { set: (v: string) => void } }).name.set('Test');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(1);
    (component as unknown as { salePrice: { set: (v: number) => void } }).salePrice.set(100);

    // First save fails
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No pudimos guardar el producto');

    // Second save succeeds
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/products']);
  });
});
