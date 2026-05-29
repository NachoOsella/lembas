import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { MessageService } from 'primeng/api';

import { ProductDetail } from './product-detail';
import { CatalogService } from '../../../core/services/catalog';
import { ProductSummary } from '../../../shared/models/product';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;

  const mockProduct: ProductSummary = {
    id: 1,
    name: 'Granola artesanal',
    description: 'Granola natural sin azúcar agregada.',
    brandName: 'Lembas',
    salePrice: 2500,
    onlineStatus: 'PUBLISHED',
    availableStock: 10,
    categoryId: 1,
    categoryName: 'Cereales',
    imageUrl: '/test.jpg',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        MessageService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '1' : null),
              },
            },
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getProductDetail: vi.fn().mockReturnValue(of(mockProduct)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load product on init', () => {
    expect((component as unknown as { product: () => { name: string } }).product().name).toBe(
      'Granola artesanal',
    );
  });
});
