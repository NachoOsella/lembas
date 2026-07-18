import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { MessageService } from 'primeng/api';

import { ProductDetail } from './product-detail';
import { CatalogService } from '@features/catalog/data-access/catalog';
import { StoreBranchSelectionService } from '@features/branches/state/store-branch-selection';
import type { ProductSummary } from '@features/catalog/domain/product';

const MOCK_PRODUCT: ProductSummary = {
  id: 1,
  name: 'Granola artesanal',
  description: 'Granola natural sin azucar agregada.',
  brandName: 'Lembas',
  salePrice: 2500,
  onlineStatus: 'PUBLISHED',
  availableStock: 10,
  categoryId: 1,
  categoryName: 'Cereales',
  imageUrl: '/test.jpg',
};

const MOCK_PRODUCT_LOW_STOCK: ProductSummary = {
  ...MOCK_PRODUCT,
  id: 2,
  name: 'Avena fina',
  availableStock: 3,
};

const MOCK_PRODUCT_OUT_OF_STOCK: ProductSummary = {
  ...MOCK_PRODUCT,
  id: 3,
  name: 'Yerba agotada',
  availableStock: 0,
};

function setupActivatedRoute(id: string | number = '1'): unknown {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? String(id) : null),
      },
    },
    paramMap: of({
      get: (key: string) => (key === 'id' ? String(id) : null),
    }),
  };
}

const EMPTY_PRODUCT_PAGE = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 6,
  first: true,
  last: true,
  empty: true,
};

function setupCatalogService(product: ProductSummary = MOCK_PRODUCT): unknown {
  return {
    getProductDetail: vi.fn().mockReturnValue(of(product)),
    getRelatedProducts: vi.fn().mockReturnValue(of(EMPTY_PRODUCT_PAGE)),
    getFeaturedProducts: vi.fn().mockReturnValue(of(EMPTY_PRODUCT_PAGE)),
  };
}

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;

  async function configure(
    product: ProductSummary = MOCK_PRODUCT,
    routeId: string | number = '1',
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        MessageService,
        { provide: ActivatedRoute, useValue: setupActivatedRoute(routeId) },
        { provide: CatalogService, useValue: setupCatalogService(product) },
        { provide: StoreBranchSelectionService, useValue: { selectedBranchId: signal(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await configure();
    expect(component).toBeTruthy();
  });

  it('should load product on init', async () => {
    await configure();
    const p = (component as any).product() as ProductSummary;
    expect(p.name).toBe('Granola artesanal');
  });

  it('should display product name', async () => {
    await configure();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent?.trim()).toContain('Granola artesanal');
  });

  it('should display product price formatted', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('2.500');
  });

  it('should display product description', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Granola natural sin azucar agregada.');
  });

  it('should display brand name', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Lembas');
  });

  it('should display category name', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Cereales');
  });

  it('should show error state for invalid id', async () => {
    await configure(MOCK_PRODUCT, 'abc');
    const error = (component as any).error() as boolean;
    expect(error).toBe(true);
  });

  it('should show error state when API fails', async () => {
    TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        MessageService,
        { provide: ActivatedRoute, useValue: setupActivatedRoute(999) },
        {
          provide: CatalogService,
          useValue: {
            getProductDetail: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
            getRelatedProducts: vi.fn().mockReturnValue(of(EMPTY_PRODUCT_PAGE)),
            getFeaturedProducts: vi.fn().mockReturnValue(of(EMPTY_PRODUCT_PAGE)),
          },
        },
        { provide: StoreBranchSelectionService, useValue: { selectedBranchId: signal(null) } },
      ],
    });

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect((component as any).error()).toBe(true);
  });

  // --- Stock display tests ---

  it('should show available stock count when stock is healthy', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('10 unidades disponibles');
  });

  it('should show low stock warning when stock is 1-5', async () => {
    await configure(MOCK_PRODUCT_LOW_STOCK);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Ultimas 3 unidades');
  });

  it('should show branch-specific out-of-stock message when stock is 0', async () => {
    await configure(MOCK_PRODUCT_OUT_OF_STOCK);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Sin stock en esta sucursal');
    expect(text).toContain('no está disponible para la sucursal de retiro seleccionada');
  });

  it('should show generic availability when availableStock is undefined', async () => {
    await configure({ ...MOCK_PRODUCT, availableStock: undefined } as ProductSummary);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Disponible para retiro');
  });

  // --- Add-to-cart tests ---

  it('should show add-to-cart button text when in stock', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Agregar al pedido');
  });

  it('should show branch-specific disabled button text when out of stock', async () => {
    await configure(MOCK_PRODUCT_OUT_OF_STOCK);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Sin stock en esta sucursal');
  });

  it('should call addToCart method on button click', async () => {
    await configure();
    const spy = vi.spyOn(component as any, 'addToCart');

    // Find the button that contains the shopping-bag icon (the add-to-cart button)
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const addBtn = Array.from(buttons).find((b: any) =>
      b.textContent?.includes('Agregar al pedido'),
    ) as HTMLButtonElement | undefined;
    addBtn?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should show feedback after addToCart', async () => {
    await configure();

    // Call addToCart directly
    (component as any).addToCart();

    // The component sets justAdded to true as temporary feedback
    expect((component as any).justAdded()).toBe(true);

    // Wait for the timeout to reset the feedback
    await new Promise((resolve) => setTimeout(resolve, 2100));
    expect((component as any).justAdded()).toBe(false);
  });

  // --- Quantity selector tests ---

  it('should increment quantity via signal', async () => {
    await configure();
    const before = (component as any).quantity() as number;

    // Find and click the increment button in the quantity stepper
    const incrementBtn = fixture.nativeElement.querySelector(
      'app-quantity-stepper .quantity-stepper__btn:last-child',
    );
    incrementBtn?.click();
    fixture.detectChanges();

    expect((component as any).quantity()).toBe(before + 1);
  });

  it('should decrement quantity via signal but not below 1', async () => {
    await configure();
    // Set quantity to 3 first
    (component as any).quantity.set(3);
    fixture.detectChanges();

    const decrementBtn = fixture.nativeElement.querySelector(
      'app-quantity-stepper .quantity-stepper__btn:first-child',
    );
    decrementBtn?.click();
    fixture.detectChanges();
    expect((component as any).quantity()).toBe(2);

    decrementBtn?.click();
    fixture.detectChanges();
    expect((component as any).quantity()).toBe(1);

    // Should not go below 1
    decrementBtn?.click();
    fixture.detectChanges();
    expect((component as any).quantity()).toBe(1);
  });

  it('should hide quantity selector when out of stock', async () => {
    await configure(MOCK_PRODUCT_OUT_OF_STOCK);
    const quantityStepper = fixture.nativeElement.querySelector('app-quantity-stepper');
    expect(quantityStepper).toBeNull();
  });
});
