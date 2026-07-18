import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { AppMenu } from '@shared/components/app-menu/app-menu';
import { AppSelect } from '@shared/components/app-select/app-select';

import { CategoryService } from '@features/catalog/data-access/category';
import { ErrorMappingService } from '@core/services/error-mapping';
import type { ProductFilters } from '@features/catalog/data-access/product';
import { ProductService } from '@features/catalog/data-access/product';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppSearchBar } from '@shared/components/app-search-bar/app-search-bar';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { StatusBadge } from '@shared/components/status-badge/status-badge';
import type { CategoryDto } from '@features/catalog/domain/category';
import type { ProductOnlineStatus, ProductSummary } from '@features/catalog/domain/product';
import type { ProductStatusAction } from '@features/catalog/presentation/product-status';
import {
  PRODUCT_STATUS_ACTIONS,
  PRODUCT_STATUS_BADGES,
} from '@features/catalog/presentation/product-status';
import { getApiError } from '@shared/types/api-error';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

/** Admin product directory with filters, pagination, deletion and online-status publishing flow. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-product-list',
  imports: [
    AppButton,
    AppDataTable,
    AppMenu,
    AppPageHeader,
    AppSearchBar,
    AppSelect,
    ConfirmDialog,
    ErrorAlert,
    FormsModule,
    RouterLink,
    StatusBadge,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

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

  // --- Status change state ---
  protected readonly productToChangeStatus = signal<ProductSummary | null>(null);
  protected readonly pendingStatusAction = signal<ProductStatusAction | null>(null);
  protected readonly changingStatus = signal(false);
  protected readonly productStatusBadges = PRODUCT_STATUS_BADGES;
  private readonly statusActionMenuCache = new Map<string, MenuItem[]>();

  protected readonly columns: ColumnDef[] = [
    { field: 'name', header: 'Producto', sortable: true },
    { field: 'categoryName', header: 'Categoria', sortable: true },
    { field: 'salePrice', header: 'Precio', sortable: true },
    { field: 'onlineStatus', header: 'Estado online', sortable: true },
    { field: 'actions', header: 'Acciones', sortable: false, width: '11rem' },
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

  /** Navigates to the create-product form. */
  protected onCreate(): void {
    this.router.navigate(['/admin/products', 'new']);
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  /** Reloads the paginated product table using the current filters. */
  protected refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.statusActionMenuCache.clear();
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

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Status change
  // ---------------------------------------------------------------------------

  /** Returns the allowed status actions for the current product state as menu items. */
  protected statusActions(product: ProductSummary): MenuItem[] {
    const cacheKey = `${product.id}:${product.onlineStatus}`;
    const cachedActions = this.statusActionMenuCache.get(cacheKey);

    if (cachedActions) {
      return cachedActions;
    }

    // Keep PrimeNG menu models stable so the first item click executes the command immediately.
    const actions = PRODUCT_STATUS_ACTIONS[product.onlineStatus].map((action) => ({
      label: action.label,
      icon: action.icon,
      command: () => this.requestStatusChange(product, action),
    }));

    this.statusActionMenuCache.set(cacheKey, actions);
    return actions;
  }

  /** Opens the confirmation dialog for a product status change. */
  protected requestStatusChange(product: ProductSummary, action: ProductStatusAction): void {
    this.productToChangeStatus.set(product);
    this.pendingStatusAction.set(action);
  }

  /** Confirms and persists a product status change. */
  protected confirmStatusChange(): void {
    const product = this.productToChangeStatus();
    const action = this.pendingStatusAction();

    if (!product || !action || this.changingStatus()) {
      return;
    }

    this.changingStatus.set(true);

    this.productService.updateProductStatus(product.id, action.targetStatus).subscribe({
      next: (updatedProduct) => {
        this.products.update((items) =>
          items.map((item) => (item.id === updatedProduct.id ? updatedProduct : item)),
        );

        this.changingStatus.set(false);
        this.productToChangeStatus.set(null);
        this.pendingStatusAction.set(null);

        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `${updatedProduct.name} ahora esta ${PRODUCT_STATUS_BADGES[updatedProduct.onlineStatus].label.toLowerCase()}.`,
          life: 3000,
        });
      },
      error: (error: unknown) => {
        this.changingStatus.set(false);
        this.productToChangeStatus.set(null);
        this.pendingStatusAction.set(null);

        const apiError = getApiError(error);
        const detail = this.errorMapping.getMessage(
          apiError?.code ?? '',
          'No pudimos cambiar el estado del producto.',
        );

        this.messageService.add({
          severity: 'error',
          summary: 'Error al cambiar estado',
          detail,
          life: 5000,
        });
      },
    });
  }

  /** Cancels the pending status-change confirmation. */
  protected cancelStatusChange(): void {
    this.productToChangeStatus.set(null);
    this.pendingStatusAction.set(null);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

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
        this.messageService.add({
          severity: 'success',
          summary: 'Producto eliminado',
          detail: `${product.name} se elimino del catalogo.`,
          life: 3000,
        });
        this.refresh();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.productToDelete.set(null);

        const apiError = getApiError(error);
        const detail = this.errorMapping.getMessage(
          apiError?.code ?? '',
          'No se pudo eliminar el producto. Intenta nuevamente.',
        );

        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail,
          life: 5000,
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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
