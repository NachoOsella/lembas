import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CategoryService } from '../../../../core/services/category';
import { ProductService } from '../../../../core/services/product';
import { ProductList } from './product-list';

/** Tests the admin product table filters and deletion flow. */
describe('ProductList', () => {
  let fixture: ComponentFixture<ProductList>;
  let component: ProductList;
  const productService = {
    listAdminProducts: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true, empty: true })),
    deleteProduct: vi.fn().mockReturnValue(of(void 0)),
  };
  const categoryService = { listAdminCategories: vi.fn().mockReturnValue(of([{ id: 1, name: 'Cereales' }])) };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: ProductService, useValue: productService },
        { provide: CategoryService, useValue: categoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows empty state when no products are available', () => {
    expect(fixture.nativeElement.textContent).toContain('No hay productos');
  });

  it('reloads products when search changes', () => {
    (component as unknown as { onSearch: (query: string) => void }).onSearch('granola');

    expect(productService.listAdminProducts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'granola', page: 0 }));
  });

  it('deletes the selected product after confirmation', () => {
    (component as unknown as { requestDelete: (product: { id: number; name: string }) => void }).requestDelete({ id: 7, name: 'Granola' });
    (component as unknown as { confirmDelete: () => void }).confirmDelete();

    expect(productService.deleteProduct).toHaveBeenCalledWith(7);
  });
});
