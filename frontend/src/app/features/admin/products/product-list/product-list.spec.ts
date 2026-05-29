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

  // --- Category filter ---

  it('reloads products when category filter changes', () => {
    (component as unknown as { categoryId: { set: (v: number) => void }; onFilterChange: () => void }).categoryId.set(3);
    (component as unknown as { onFilterChange: () => void }).onFilterChange();

    expect(productService.listAdminProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 3, page: 0 }));
  });

  it('includes category filter in request params', () => {
    (component as unknown as { categoryId: { set: (v: number) => void }; onFilterChange: () => void }).categoryId.set(5);
    (component as unknown as { onFilterChange: () => void }).onFilterChange();

    const calls = productService.listAdminProducts.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.categoryId).toBe(5);
  });

  // --- Online status filter ---

  it('reloads products when online status filter changes', () => {
    (component as unknown as { onlineStatus: { set: (v: string) => void }; onFilterChange: () => void }).onlineStatus.set('PUBLISHED');
    (component as unknown as { onFilterChange: () => void }).onFilterChange();

    expect(productService.listAdminProducts).toHaveBeenLastCalledWith(expect.objectContaining({ onlineStatus: 'PUBLISHED', page: 0 }));
  });

  it('includes online status filter in request params', () => {
    (component as unknown as { onlineStatus: { set: (v: string) => void }; onFilterChange: () => void }).onlineStatus.set('DRAFT');
    (component as unknown as { onFilterChange: () => void }).onFilterChange();

    const calls = productService.listAdminProducts.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.onlineStatus).toBe('DRAFT');
  });

  // --- Pagination ---

  it('reloads products when page changes', () => {
    (component as unknown as { onPageChange: (event: { first: number; rows: number }) => void }).onPageChange({ first: 20, rows: 10 });

    expect(productService.listAdminProducts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('updates first and rows signals on page change', () => {
    (component as unknown as { onPageChange: (event: { first: number; rows: number }) => void }).onPageChange({ first: 30, rows: 20 });

    const comp = component as unknown as { first: () => number; rows: () => number };
    expect(comp.first()).toBe(30);
    expect(comp.rows()).toBe(20);
  });

  it('resets to first page when search changes', () => {
    (component as unknown as { first: { set: (v: number) => void }; onPageChange: (event: { first: number; rows: number }) => void }).onPageChange({ first: 20, rows: 10 });
    (component as unknown as { onSearch: (query: string) => void }).onSearch('yerba');

    const calls = productService.listAdminProducts.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.page).toBe(0);
  });

  // --- Sorting ---

  it('reloads products when sort changes', () => {
    (component as unknown as { onSort: (event: { field: string; order: number }) => void }).onSort({ field: 'salePrice', order: -1 });

    const calls = productService.listAdminProducts.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.sort).toBe('salePrice,desc');
  });

  it('resets to first page on sort change', () => {
    (component as unknown as { first: { set: (v: number) => void }; onSort: (event: { field: string; order: number }) => void }).onSort({ field: 'name', order: 1 });

    const calls = productService.listAdminProducts.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.page).toBe(0);
  });

  // --- Combined filters ---

  it('combines search, category and status filters', () => {
    (component as unknown as { searchQuery: { set: (v: string) => void }; categoryId: { set: (v: number) => void }; onlineStatus: { set: (v: string) => void }; refresh: () => void }).searchQuery.set('granola');
    (component as unknown as { categoryId: { set: (v: number) => void } }).categoryId.set(2);
    (component as unknown as { onlineStatus: { set: (v: string) => void } }).onlineStatus.set('PUBLISHED');
    (component as unknown as { refresh: () => void }).refresh();

    const calls = productService.listAdminProducts.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({
      search: 'granola',
      categoryId: 2,
      onlineStatus: 'PUBLISHED',
    }));
  });
});
