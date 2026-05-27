import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CategoryService } from '../../../../core/services/category';
import { CategoryList } from './category-list';

/** Tests the admin category table states and destructive action flow. */
describe('CategoryList', () => {
  let fixture: ComponentFixture<CategoryList>;
  let component: CategoryList;
  const categoryService = { deleteCategory: vi.fn().mockReturnValue(of(void 0)) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryList],
      providers: [provideNoopAnimations(), { provide: CategoryService, useValue: categoryService }],
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

    (component as unknown as { requestDelete: (category: { id: number; name: string }) => void }).requestDelete({
      id: 1,
      name: 'Almacen',
    });
    (component as unknown as { confirmDelete: () => void }).confirmDelete();

    expect(categoryService.deleteCategory).toHaveBeenCalledWith(1);
    expect(emitSpy).toHaveBeenCalled();
  });
});
