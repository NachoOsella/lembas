import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { Select } from 'primeng/select';

import { CategoryService } from '../../../../core/services/category';
import { ProductFilters, ProductService } from '../../../../core/services/product';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../../shared/components/app-data-table/app-data-table';
import { AppSearchBar } from '../../../../shared/components/app-search-bar/app-search-bar';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { CategoryDto } from '../../../../shared/models/category';
import { ProductOnlineStatus, ProductSummary } from '../../../../shared/models/product';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

/** Admin product directory with filters, pagination and deletion flow. */
@Component({
  selector: 'app-product-list',
  imports: [AppBadge, AppButton, AppDataTable, AppSearchBar, ButtonDirective, ConfirmDialog, FormsModule, Ripple, RouterLink, Select],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly messageService = inject(MessageService);

  protected readonly products = signal<ProductSummary[]>([]);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly deleting = signal(false);
  protected readonly productToDelete = signal<ProductSummary | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly onlineStatus = signal<ProductOnlineStatus | null>(null);
  protected readonly first = signal(0);
  protected readonly rows = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly sortField = signal<string>('name');
  protected readonly sortOrder = signal<number>(1);

  protected readonly columns: ColumnDef[] = [
    { field: 'name', header: 'Producto', sortable: true },
    { field: 'categoryName', header: 'Categoria', sortable: true },
    { field: 'salePrice', header: 'Precio', sortable: true },
    { field: 'onlineStatus', header: 'Estado online', sortable: true },
    { field: 'actions', header: 'Acciones', sortable: false, width: '9rem' },
  ];

  protected readonly categoryOptions = computed<Option<number | null>[]>(() => [
    { label: 'Todas las categorias', value: null },
    ...this.categories().map((category) => ({ label: category.name, value: category.id })),
  ]);

  protected readonly statusOptions: Option<ProductOnlineStatus | null>[] = [
    { label: 'Todos los estados', value: null },
    { label: 'Borrador', value: 'DRAFT' },
    { label: 'Publicado', value: 'PUBLISHED' },
    { label: 'Pausado', value: 'PAUSED' },
    { label: 'Oculto', value: 'HIDDEN' },
  ];

  constructor() {
    this.loadCategories();
    this.refresh();
  }

  /** Reloads the paginated product table using the current filters. */
  protected refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.productService.listAdminProducts(this.currentFilters()).subscribe({
      next: (page) => {
        this.products.set(page.content);
        this.totalRecords.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los productos. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }

  /** Applies a text search and resets to the first page. */
  protected onSearch(query: string): void {
    this.searchQuery.set(query);
    this.first.set(0);
    this.refresh();
  }

  /** Clears the text search filter. */
  protected onSearchClear(): void {
    this.onSearch('');
  }

  /** Applies category or status filters and resets to the first page. */
  protected onFilterChange(): void {
    this.first.set(0);
    this.refresh();
  }

  /** Handles lazy pagination emitted by the shared table. */
  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.rows.set(event.rows);
    this.refresh();
  }

  /** Handles column sort changes from the table header. */
  protected onSort(event: { field: string; order: number }): void {
    this.sortField.set(event.field);
    this.sortOrder.set(event.order);
    this.first.set(0);
    this.refresh();
  }

  /** Returns UI metadata for online-status badges. */
  protected statusBadge(status: ProductOnlineStatus): { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' } {
    const badges = {
      DRAFT: { label: 'Borrador', tone: 'neutral' },
      PUBLISHED: { label: 'Publicado', tone: 'success' },
      PAUSED: { label: 'Pausado', tone: 'warning' },
      HIDDEN: { label: 'Oculto', tone: 'danger' },
    } as const;
    return badges[status];
  }

  /** Formats a product price with Argentine peso conventions. */
  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  }

  /** Opens the destructive confirmation dialog. */
  protected requestDelete(product: ProductSummary): void {
    this.productToDelete.set(product);
  }

  /** Deletes the selected product after confirmation. */
  protected confirmDelete(): void {
    const product = this.productToDelete();
    if (!product || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.productToDelete.set(null);
        this.messageService.add({ severity: 'success', summary: 'Producto eliminado', detail: `${product.name} se elimino del catalogo.`, life: 3000 });
        this.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.productToDelete.set(null);
        const detail = error.error?.message ?? 'No se pudo eliminar el producto. Intenta nuevamente.';
        this.messageService.add({ severity: 'error', summary: 'Error al eliminar', detail, life: 5000 });
      },
    });
  }

  /** Builds the API filter object from table state. */
  private currentFilters(): ProductFilters {
    const order = this.sortOrder() === 1 ? 'asc' : 'desc';
    return {
      search: this.searchQuery(),
      categoryId: this.categoryId(),
      onlineStatus: this.onlineStatus(),
      page: Math.floor(this.first() / this.rows()),
      size: this.rows(),
      sort: `${this.sortField()},${order}`,
    };
  }

  /** Loads category options used by the filter select. */
  private loadCategories(): void {
    this.categoryService.listAdminCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }
}
