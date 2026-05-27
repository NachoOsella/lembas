import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

import { CategoryService } from '../../../../core/services/category';
import { CategoryDto } from '../../../../shared/models/category';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../../shared/components/app-data-table/app-data-table';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';

/** Displays the admin category directory using shared Lembas table and action components. */
@Component({
  selector: 'app-category-list',
  imports: [AppBadge, AppButton, AppDataTable, ButtonDirective, ConfirmDialog, Ripple],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList {
  private readonly categoryService = inject(CategoryService);

  readonly categories = input.required<CategoryDto[]>();
  readonly loading = input(false);
  readonly error = input('');
  readonly createCategory = output<void>();
  readonly editCategory = output<CategoryDto>();
  readonly deleted = output<void>();
  readonly retry = output<void>();

  protected readonly categoryToDelete = signal<CategoryDto | null>(null);
  protected readonly categoryColumns: ColumnDef[] = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'parentId', header: 'Categoria padre', sortable: false },
    { field: 'description', header: 'Descripcion', sortable: false },
    { field: 'actions', header: 'Acciones', sortable: false, width: '9rem' },
  ];

  protected readonly parentNameById = computed(() => {
    const map = new Map<number, string>();
    for (const category of this.categories()) {
      map.set(category.id, category.name);
    }
    return map;
  });

  /** Returns a human-readable parent label for the table. */
  protected parentName(category: CategoryDto): string {
    return category.parentId ? (this.parentNameById().get(category.parentId) ?? 'Sin encontrar') : 'Raiz';
  }

  /** Opens the destructive confirmation dialog. */
  protected requestDelete(category: CategoryDto): void {
    this.categoryToDelete.set(category);
  }

  /** Deletes the selected category after explicit confirmation. */
  protected confirmDelete(): void {
    const category = this.categoryToDelete();
    if (!category) {
      return;
    }
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.categoryToDelete.set(null);
        this.deleted.emit();
      },
      error: () => this.categoryToDelete.set(null),
    });
  }
}
