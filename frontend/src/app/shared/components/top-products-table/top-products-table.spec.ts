import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopProductsTable } from './top-products-table';
import { TopProductDto } from '../../models/dashboard';

describe('TopProductsTable', () => {
  let component: TopProductsTable;
  let fixture: ComponentFixture<TopProductsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopProductsTable],
    }).compileComponents();
    fixture = TestBed.createComponent(TopProductsTable);
    component = fixture.componentInstance;
  });

  it('renders the empty state when there are no products', () => {
    fixture.componentRef.setInput('products', []);
    fixture.detectChanges();
    expect(component.hasData()).toBe(false);
  });

  it('renders a row per product', () => {
    const products: TopProductDto[] = [
      {
        position: 1,
        productId: 1,
        productName: 'Granola',
        barcode: '12345',
        categoryId: 1,
        categoryName: 'Cereales',
        brandName: 'Lembas',
        quantitySold: 25,
        totalRevenue: 12500,
        averagePrice: 500,
        imageUrl: null,
      },
    ];
    fixture.componentRef.setInput('products', products);
    fixture.detectChanges();
    expect(component.hasData()).toBe(true);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('extracts initials from the product name when no image is set', () => {
    const initials = component.initials('Granola Artesanal');
    expect(initials).toBe('GA');
  });
});
