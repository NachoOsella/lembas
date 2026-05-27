import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProductSummary } from '../../models/product';
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

describe('StoreProductCard', () => {
  let fixture: ComponentFixture<StoreProductCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreProductCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreProductCard);
    fixture.componentRef.setInput('product', PRODUCT);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render product data', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Granola artesanal');
    expect(text).toContain('Lembas');
    expect(text).toContain('2.500');
  });
});
