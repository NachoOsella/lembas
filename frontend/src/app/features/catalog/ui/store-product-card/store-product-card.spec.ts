import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { ProductSummary } from '@features/catalog/domain/product';
import { StoreProductCard } from './store-product-card';

const PRODUCT: ProductSummary = {
  id: 42,
  name: 'Granola artesanal',
  brandName: 'Lembas',
  salePrice: 2500,
  onlineStatus: 'PUBLISHED',
  availableStock: 8,
  categoryId: 1,
  categoryName: 'Cereales',
};

const PRODUCT_LOW_STOCK: ProductSummary = {
  ...PRODUCT,
  id: 43,
  name: 'Avena fina',
  availableStock: 3,
};

const PRODUCT_OUT_OF_STOCK: ProductSummary = {
  ...PRODUCT,
  id: 44,
  name: 'Yerba agotada',
  availableStock: 0,
};

const PRODUCT_NO_STOCK_INFO: ProductSummary = {
  ...PRODUCT,
  id: 45,
  name: 'Sin info stock',
  availableStock: undefined,
};

describe('StoreProductCard', () => {
  let fixture: ComponentFixture<StoreProductCard>;

  function create(product: ProductSummary): void {
    TestBed.configureTestingModule({
      imports: [StoreProductCard],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(StoreProductCard);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
  }

  it('should create', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render product name and brand', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Granola artesanal');
    expect(text).toContain('Lembas');
  });

  it('should render formatted price', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('2.500');
  });

  it('should render category name', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Cereales');
  });

  it('should show brand fallback as "Lembas" when brandName is null', async () => {
    create({ ...PRODUCT, brandName: undefined });
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Lembas');
  });

  // --- Stock badge tests ---

  it('should not show stock badge when stock is healthy (> 5)', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const badge = fixture.nativeElement.querySelector('.store-product-card__stock');
    expect(badge).toBeNull();
  });

  it('should show low stock badge when stock is 1-5', async () => {
    create(PRODUCT_LOW_STOCK);
    await fixture.whenStable();
    const badge = fixture.nativeElement.querySelector('.store-product-card__stock--low');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('3 uds');
  });

  it('should show branch-specific out-of-stock badge when stock is 0', async () => {
    create(PRODUCT_OUT_OF_STOCK);
    await fixture.whenStable();
    const badge = fixture.nativeElement.querySelector('.store-product-card__stock--out');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Sin stock en esta sucursal');
    expect(fixture.nativeElement.textContent).toContain('Disponible solo si cambiás de sucursal');
  });

  it('should not show stock badge when availableStock is undefined', async () => {
    create(PRODUCT_NO_STOCK_INFO);
    await fixture.whenStable();
    const badge = fixture.nativeElement.querySelector('.store-product-card__stock');
    expect(badge).toBeNull();
  });

  // --- Add-to-cart button tests ---

  it('should show add-to-cart button when in stock', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('.store-product-card__add-btn');
    expect(btn).toBeTruthy();
  });

  it('should hide add-to-cart button when out of stock', async () => {
    create(PRODUCT_OUT_OF_STOCK);
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('.store-product-card__add-btn');
    expect(btn).toBeNull();
  });

  it('should emit addToCart when button is clicked', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const spy = vi.fn();
    fixture.componentInstance.addToCart.subscribe(spy);

    const btn = fixture.nativeElement.querySelector('.store-product-card__add-btn');
    btn.click();

    expect(spy).toHaveBeenCalledWith({ product: PRODUCT, quantity: 1 });
  });

  it('should prevent navigation when add-to-cart is clicked', async () => {
    create(PRODUCT);
    await fixture.whenStable();

    const btn = fixture.nativeElement.querySelector('.store-product-card__add-btn');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    btn.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
  });

  // --- Link / detail route tests ---

  it('should link to the product detail page', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const link = fixture.nativeElement.querySelector('a');
    expect(link).toBeTruthy();
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/store/products/42');
  });

  it('should have accessible aria-label on the card link', async () => {
    create(PRODUCT);
    await fixture.whenStable();
    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('aria-label')).toBe('Ver detalle de Granola artesanal');
  });

  // --- Compact density tests ---

  it('should apply compact class when density is compact', async () => {
    TestBed.configureTestingModule({
      imports: [StoreProductCard],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(StoreProductCard);
    fixture.componentRef.setInput('product', PRODUCT);
    fixture.componentRef.setInput('density', 'compact');
    fixture.detectChanges();
    await fixture.whenStable();

    const article = fixture.nativeElement.querySelector('article');
    expect(article.classList.contains('store-product-card--compact')).toBe(true);
  });

  it('should not show low-stock badge in compact mode', async () => {
    TestBed.configureTestingModule({
      imports: [StoreProductCard],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(StoreProductCard);
    fixture.componentRef.setInput('product', PRODUCT_LOW_STOCK);
    fixture.componentRef.setInput('density', 'compact');
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('.store-product-card__stock');
    expect(badge).toBeNull();
  });

  it('should show out-of-stock badge even in compact mode', async () => {
    TestBed.configureTestingModule({
      imports: [StoreProductCard],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(StoreProductCard);
    fixture.componentRef.setInput('product', PRODUCT_OUT_OF_STOCK);
    fixture.componentRef.setInput('density', 'compact');
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('.store-product-card__stock--out');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Sin stock en esta sucursal');
  });
});
