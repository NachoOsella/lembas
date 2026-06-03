import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CatalogService } from '../../../core/services/catalog';
import { Category, ProductSummary } from '../../../shared/models/product';
import { ProductGridSkeleton } from '../../../shared/components/product-grid-skeleton/product-grid-skeleton';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { AppPagination } from '../../../shared/components/app-pagination/app-pagination';
import {
  ProductGrid,
  ProductGridAddToCartEvent,
} from '../../../shared/components/product-grid/product-grid';
import { HeroFlowers } from '../../../shared/components/hero-flowers/hero-flowers';
import { CategoryNav } from '../category-nav/category-nav';

/** Page size for the product grid. */
const PAGE_SIZE = 20;

@Component({
  selector: 'app-catalog',
  imports: [
    EmptyState,
    ErrorAlert,
    AppEyebrow,
    AppPagination,
    ProductGrid,
    ProductGridSkeleton,
    HeroFlowers,
    CategoryNav,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ---------------------------------------------------------------------------
  // Categories state
  // ---------------------------------------------------------------------------
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesLoading = signal(false);
  protected readonly categoriesError = signal(false);

  /** The currently selected category id, or null for "Todas". */
  protected readonly selectedCategoryId = signal<number | null>(null);

  /** True when the category filter has been initialised from the URL. */
  private readonly categoriesReady = signal(false);

  /** Derived: categories are loaded and the filter is ready for interaction. */
  protected readonly showFilter = computed(
    () => this.categoriesReady() && !this.categoriesLoading() && !this.categoriesError(),
  );

  // ---------------------------------------------------------------------------
  // Products state
  // ---------------------------------------------------------------------------
  protected readonly products = signal<ProductSummary[]>([]);
  protected readonly productsLoading = signal(false);
  protected readonly productsError = signal(false);

  protected readonly totalRecords = signal(0);
  protected readonly first = signal(0);
  protected readonly pageSize = signal(20);

  /** Current search query from the URL. */
  protected readonly searchQuery = signal('');

  /** True when the initial load has completed, to distinguish "no products" from "not loaded yet". */
  protected readonly initialLoadDone = signal(false);

  /** Derived empty-state description. */
  protected readonly emptyDescription = computed(() => {
    const query = this.searchQuery().trim();
    const catName = this.selectedCategoryName();
    if (query && catName) {
      return `No encontramos productos que coincidan con "${query}" en ${catName}.`;
    }
    if (query) {
      return `No encontramos productos que coincidan con "${query}".`;
    }
    if (catName) {
      return `Todavia no hay productos publicados en ${catName}.`;
    }
    return 'Todavia no hay productos publicados. Vuelve pronto para descubrir nuestra seleccion.';
  });

  /** Derived category name for empty-state messages. */
  private readonly selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (id == null) return null;
    return this.categories().find((c) => c.id === id)?.name ?? null;
  });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    this.loadCategories();

    // Read initial query params from the URL (search query may come from store nav).
    this.route.queryParams.subscribe((params) => {
      const q = ((params['q'] as string | undefined) ?? '').trim();
      const catId = params['categoryId'] ? Number(params['categoryId']) : null;
      const nextCategoryId = catId != null && !isNaN(catId) ? catId : null;
      const queryChanged = this.searchQuery() !== q;
      const categoryChanged = this.selectedCategoryId() !== nextCategoryId;

      this.searchQuery.set(q);

      // After categories are loaded, URL changes are the single source of truth
      // for filters, including searches triggered from the store navigation.
      if (this.categoriesReady()) {
        this.selectedCategoryId.set(nextCategoryId);
        if (queryChanged || categoryChanged) {
          this.first.set(0);
          this.loadProducts();
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);

    this.catalogService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.categoriesLoading.set(false);
        this.categoriesReady.set(true);

        // Read categoryId from URL after categories are ready.
        const catId = this.route.snapshot.queryParams['categoryId'];
        this.selectedCategoryId.set(catId != null && !isNaN(Number(catId)) ? Number(catId) : null);

        this.loadProducts();
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.categoriesError.set(true);
        this.categoriesReady.set(true);
      },
    });
  }

  protected loadProducts(): void {
    const catChanged = this.prevCategoryId !== this.selectedCategoryId();
    const searchChanged = this.prevSearchQuery !== this.searchQuery();
    const isFilterChange = catChanged || searchChanged;

    this.prevCategoryId = this.selectedCategoryId();
    this.prevSearchQuery = this.searchQuery();

    // Clear products only on category/search switch to avoid flicker on pagination.
    if (isFilterChange) {
      this.products.set([]);
    }

    this.productsLoading.set(true);
    this.productsError.set(false);

    const page = Math.floor(this.first() / this.pageSize());

    this.catalogService
      .getProducts(
        this.searchQuery() || undefined,
        this.selectedCategoryId() ?? undefined,
        page,
        this.pageSize(),
      )
      .subscribe({
        next: (response) => {
          this.products.set(response.content);
          this.totalRecords.set(response.totalElements);
          this.productsLoading.set(false);
          this.initialLoadDone.set(true);
        },
        error: () => {
          this.productsLoading.set(false);
          this.productsError.set(true);
          this.initialLoadDone.set(true);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  /** Clears the search query and reloads products. */
  protected clearSearch(): void {
    this.searchQuery.set('');
    this.first.set(0);
    this.updateUrl();
    this.loadProducts();
  }

  // ---------------------------------------------------------------------------
  // Category filter
  // ---------------------------------------------------------------------------
  /** Previous category id to detect category switches. */
  private prevCategoryId: number | null = null;

  /** Previous search query to detect search changes. */
  private prevSearchQuery = '';

  /** Selects "Todas" (clears the category filter). */
  protected selectAllCategories(): void {
    this.selectedCategoryId.set(null);
    this.first.set(0);
    this.updateUrl();
    this.loadProducts();
  }

  /** Selects a specific category. */
  protected selectCategory(categoryId: number): void {
    this.selectedCategoryId.set(categoryId);
    this.first.set(0);
    this.updateUrl();
    this.loadProducts();
  }

  /** Whether the given category id is currently selected. */
  protected isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryId() === categoryId;
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------------------------------------------------------------------
  // Cart integration
  // ---------------------------------------------------------------------------
  protected onAddToCart(event: ProductGridAddToCartEvent): void {
    // Toast removed - public store does not use toasts
  }

  // ---------------------------------------------------------------------------
  // URL synchronisation
  // ---------------------------------------------------------------------------
  /**
   * Updates the URL query params to reflect the current filter state, so users
   * can share or bookmark filtered views.
   */
  private updateUrl(): void {
    const params: Record<string, string> = {};
    const q = this.searchQuery().trim();
    if (q) {
      params['q'] = q;
    }
    const catId = this.selectedCategoryId();
    if (catId != null) {
      params['categoryId'] = String(catId);
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true,
    });
  }
}
