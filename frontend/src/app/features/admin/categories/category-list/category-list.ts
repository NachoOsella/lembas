import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';

import { CategoryService } from '../../../../core/services/category';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { CategoryDto } from '../../../../shared/models/category';
import { getApiError } from '../../../../shared/models/api-error';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import {
  AppDataTable,
  ColumnDef,
} from '../../../../shared/components/app-data-table/app-data-table';
import { AppSearchBar } from '../../../../shared/components/app-search-bar/app-search-bar';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';

/** Time window for collapsing duplicate error toasts in this component. */
const DUPLICATE_TOAST_MS = 2000;

/** Displays the admin category directory using shared Lembas table and action components. */
@Component({
  selector: 'app-category-list',
  imports: [
    AppBadge,
    AppButton,
    AppDataTable,
    AppPageHeader,
    AppSearchBar,
    ConfirmDialog,
    ErrorAlert,
  ],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList {
  private readonly categoryService = inject(CategoryService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  readonly categories = input.required<CategoryDto[]>();
  readonly loading = input(false);
  readonly error = input('');
  readonly createCategory = output<void>();
  readonly editCategory = output<CategoryDto>();
  readonly deleted = output<void>();
  readonly retry = output<void>();
  readonly searchChange = output<string>();

  protected readonly categoryToDelete = signal<CategoryDto | null>(null);
  protected readonly deleting = signal(false);
  protected readonly searchQuery = signal('');
  /** Last error-toast key and timestamp to collapse rapid duplicates from re-entrant CD. */
  private lastDeleteError: { key: string; timestamp: number } | null = null;
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
    return category.parentId
      ? (this.parentNameById().get(category.parentId) ?? 'Sin encontrar')
      : 'Raiz';
  }

  // ---------------------------------------------------------------------------
  // Search handlers
  // ---------------------------------------------------------------------------

  protected onSearch(query: string): void {
    this.searchQuery.set(query);
    this.searchChange.emit(query);
  }

  protected onSearchClear(): void {
    this.searchQuery.set('');
    this.searchChange.emit('');
  }

  /** Opens the destructive confirmation dialog. */
  protected requestDelete(category: CategoryDto): void {
    this.categoryToDelete.set(category);
  }

  /** Maps backend delete error codes to Spanish copy using centralized service. */
  private deleteErrorForCode(code?: string): string {
    return this.errorMapping.getMessage(
      code ?? '',
      'No se pudo eliminar la categoria. Intenta nuevamente.',
    );
  }

  /** Deletes the selected category after explicit confirmation. */
  protected confirmDelete(): void {
    const category = this.categoryToDelete();
    if (!category || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Categoria eliminada',
          detail: `${category.name} se elimino correctamente.`,
          life: 3000,
        });
        this.categoryToDelete.set(null);
        this.deleting.set(false);
        this.deleted.emit();
      },
      error: (err: unknown) => {
        this.categoryToDelete.set(null);
        this.deleting.set(false);
        const apiError = getApiError(err);
        const detail = this.deleteErrorForCode(apiError?.code);
        const key = `delete-category|${detail}`;
        const now = Date.now();
        if (
          this.lastDeleteError?.key === key &&
          now - this.lastDeleteError.timestamp < DUPLICATE_TOAST_MS
        ) {
          return;
        }
        this.lastDeleteError = { key, timestamp: now };
        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail,
          life: 5000,
        });
      },
    });
  }
}
