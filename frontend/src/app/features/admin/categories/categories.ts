import { Component, inject, signal, viewChild } from '@angular/core';

import { CategoryService } from '../../../core/services/category';
import { CategoryDto } from '../../../shared/models/category';
import { CategoryList } from './category-list/category-list';
import { CategoryForm } from './category-form/category-form';

/** Admin category page orchestrating list, form and shared category data. */
@Component({
  selector: 'app-categories',
  imports: [CategoryList, CategoryForm],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private readonly categoryService = inject(CategoryService);
  private readonly formComponent = viewChild.required(CategoryForm);

  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    this.refresh();
  }

  /** Reloads the category table after a successful mutation. */
  protected refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.categoryService.listAdminCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las categorias. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  /** Opens the category creation modal. */
  protected openCreate(): void {
    this.formComponent().openCreate();
  }

  /** Opens the category edition modal. */
  protected openEdit(category: CategoryDto): void {
    this.formComponent().openEdit(category);
  }
}
