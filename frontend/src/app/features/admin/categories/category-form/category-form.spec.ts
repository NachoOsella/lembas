import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CategoryService } from '../../../../core/services/category';
import { CategoryForm } from './category-form';

/** Tests the category form creation and edition behaviour. */
describe('CategoryForm', () => {
  let fixture: ComponentFixture<CategoryForm>;
  let component: CategoryForm;
  const categoryService = {
    createCategory: vi.fn().mockReturnValue(of({ id: 10, name: 'Almacen' })),
    updateCategory: vi.fn().mockReturnValue(of({ id: 10, name: 'Almacen actualizado' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryForm],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: CategoryService, useValue: categoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', [{ id: 1, name: 'Raiz' }]);
  });

  it('opens in creation mode with an empty model', () => {
    component.openCreate();

    const form = component as unknown as {
      formName: () => string;
      formParentId: () => number | null;
    };
    expect(form.formName()).toBe('');
    expect(form.formParentId()).toBeNull();
  });

  it('opens in edit mode with the selected category data', () => {
    component.openEdit({ id: 2, parentId: 1, name: 'Granolas', description: 'Crujientes' });

    const form = component as unknown as {
      formName: () => string;
      formParentId: () => number | null;
    };
    expect(form.formName()).toBe('Granolas');
    expect(form.formParentId()).toBe(1);
  });
});
