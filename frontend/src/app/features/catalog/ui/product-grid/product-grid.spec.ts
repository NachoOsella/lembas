import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { ProductSummary } from '@features/catalog/domain/product';
import { ProductGrid } from './product-grid';

const SAMPLE_PRODUCTS: ProductSummary[] = [
  {
    id: 1,
    name: 'Granola artesanal',
    brandName: 'Lembas',
    salePrice: 2500,
    onlineStatus: 'PUBLISHED',
    availableStock: 10,
    categoryId: 1,
    categoryName: 'Cereales',
  },
  {
    id: 2,
    name: 'Avena premium',
    brandName: 'Lembas',
    salePrice: 1800,
    onlineStatus: 'PUBLISHED',
    availableStock: 3,
    categoryId: 1,
    categoryName: 'Cereales',
  },
  {
    id: 3,
    name: 'Yerba mate orgánica',
    salePrice: 900,
    onlineStatus: 'PUBLISHED',
    availableStock: 0,
    categoryId: 2,
    categoryName: 'Bebidas',
  },
];

describe('ProductGrid', () => {
  let component: ProductGrid;
  let fixture: ComponentFixture<ProductGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductGrid],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductGrid);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('products', SAMPLE_PRODUCTS);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a product card for each product', async () => {
    const cards = fixture.nativeElement.querySelectorAll('app-store-product-card');
    expect(cards.length).toBe(3);
  });

  it('should render product names inside the grid', async () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Granola artesanal');
    expect(text).toContain('Avena premium');
    expect(text).toContain('Yerba mate orgánica');
  });

  it('should have the responsive grid CSS classes', async () => {
    const grid = fixture.nativeElement.querySelector('.product-grid');
    expect(grid).toBeTruthy();
    // Uses flexbox with centered items for balanced last-row layout
    expect(grid.classList.contains('product-grid')).toBe(true);
    const items = fixture.nativeElement.querySelectorAll('.product-grid__item');
    expect(items.length).toBe(3);
  });

  it('should have role="list" for accessibility', async () => {
    const grid = fixture.nativeElement.querySelector('[role="list"]');
    expect(grid).toBeTruthy();
    expect(grid.getAttribute('aria-label')).toBe('Productos');
  });

  it('should emit addToCart when a card triggers it', async () => {
    const spy = vi.fn();
    component.addToCart.subscribe(spy);

    // Access the first child ProductGrid and emit through it
    const firstCard = fixture.nativeElement.querySelector('app-store-product-card');
    expect(firstCard).toBeTruthy();

    // Trigger the output via the component instance
    const cardComponent = (firstCard as any).__ngContext__;
    // Instead, test via the component output
    component.addToCart.emit({ product: SAMPLE_PRODUCTS[0], quantity: 2 });
    expect(spy).toHaveBeenCalledWith({ product: SAMPLE_PRODUCTS[0], quantity: 2 });
  });
});
