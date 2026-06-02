import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { CategoryService } from '../../../../core/services/category';
import { CategoryList } from './category-list';
import { AppSearchBar } from '../../../../shared/components/app-search-bar/app-search-bar';

/** Tests the admin category table states and destructive action flow. */
describe('CategoryList', () => {
  let fixture: ComponentFixture<CategoryList>;
  let component: CategoryList;
  const categoryService = { deleteCategory: vi.fn().mockReturnValue(of(void 0)) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryList, AppSearchBar],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: CategoryService, useValue: categoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryList);
    component = fixture.componentInstance;
  });

  it('shows the empty state when there are no categories', async () => {
    fixture.componentRef.setInput('categories', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay categorias');
  });

  it('renders category rows with parent labels', async () => {
    fixture.componentRef.setInput('categories', [
      { id: 1, name: 'Almacen' },
      { id: 2, name: 'Granolas', parentId: 1 },
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Granolas');
    expect(fixture.nativeElement.textContent).toContain('Almacen');
  });

  it('emits deleted after confirming deletion', () => {
    const emitSpy = vi.spyOn(component.deleted, 'emit');
    fixture.componentRef.setInput('categories', [{ id: 1, name: 'Almacen' }]);

    (
      component as unknown as { requestDelete: (category: { id: number; name: string }) => void }
    ).requestDelete({
      id: 1,
      name: 'Almacen',
    });
    (component as unknown as { confirmDelete: () => void }).confirmDelete();

    expect(categoryService.deleteCategory).toHaveBeenCalledWith(1);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits searchChange when search is triggered', () => {
    const emitSpy = vi.spyOn(component.searchChange, 'emit');
    fixture.componentRef.setInput('categories', []);

    (component as unknown as { onSearch: (query: string) => void }).onSearch('granola');

    expect(emitSpy).toHaveBeenCalledWith('granola');
  });

  it('emits searchChange with empty string when search is cleared', () => {
    const emitSpy = vi.spyOn(component.searchChange, 'emit');
    fixture.componentRef.setInput('categories', []);

    (component as unknown as { onSearchClear: () => void }).onSearchClear();

    expect(emitSpy).toHaveBeenCalledWith('');
  });

  it('renders search bar in toolbar', async () => {
    fixture.componentRef.setInput('categories', []);
    await fixture.whenStable();

    const searchBar = fixture.nativeElement.querySelector('app-search-bar');
    expect(searchBar).toBeTruthy();
  });

  // --- Delete error handling ---

  it('shows mapped error message when delete fails with CATEGORY_HAS_CHILDREN', async () => {
    const messageService = TestBed.inject(MessageService);
    const addSpy = vi.spyOn(messageService, 'add');
    fixture.componentRef.setInput('categories', [{ id: 1, name: 'Almacen' }]);

    categoryService.deleteCategory.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({
        error: { code: 'CATEGORY_HAS_CHILDREN' },
        status: 409,
        statusText: 'Conflict',
      })),
    );

    (
      component as unknown as { requestDelete: (category: { id: number; name: string }) => void }
    ).requestDelete({ id: 1, name: 'Almacen' });
    (component as unknown as { confirmDelete: () => void }).confirmDelete();
    await fixture.whenStable();

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'No se puede eliminar una categoria que tiene subcategorias. Elimina primero las subcategorias.',
      }),
    );
  });

  it('shows mapped error message when delete fails with CATEGORY_HAS_PRODUCTS', async () => {
    const messageService = TestBed.inject(MessageService);
    const addSpy = vi.spyOn(messageService, 'add');
    fixture.componentRef.setInput('categories', [{ id: 1, name: 'Almacen' }]);

    categoryService.deleteCategory.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({
        error: { code: 'CATEGORY_HAS_PRODUCTS' },
        status: 409,
        statusText: 'Conflict',
      })),
    );

    (
      component as unknown as { requestDelete: (category: { id: number; name: string }) => void }
    ).requestDelete({ id: 1, name: 'Almacen' });
    (component as unknown as { confirmDelete: () => void }).confirmDelete();
    await fixture.whenStable();

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'No se puede eliminar una categoria que tiene productos asociados. Reasigna los productos a otra categoria primero.',
      }),
    );
  });

  it('shows generic error message when delete fails with unknown code', async () => {
    const messageService = TestBed.inject(MessageService);
    const addSpy = vi.spyOn(messageService, 'add');
    fixture.componentRef.setInput('categories', [{ id: 1, name: 'Almacen' }]);

    categoryService.deleteCategory.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({
        error: { code: 'UNKNOWN_ERROR' },
        status: 500,
        statusText: 'Internal Server Error',
      })),
    );

    (
      component as unknown as { requestDelete: (category: { id: number; name: string }) => void }
    ).requestDelete({ id: 1, name: 'Almacen' });
    (component as unknown as { confirmDelete: () => void }).confirmDelete();
    await fixture.whenStable();

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'No se pudo eliminar la categoria. Intenta nuevamente.',
      }),
    );
  });
});
