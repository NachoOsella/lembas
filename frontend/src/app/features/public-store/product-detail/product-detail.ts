import { ViewportScroller } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';

import { Cart } from '../../../core/services/cart';
import { CatalogService } from '../../../core/services/catalog';
import { StoreBranchSelectionService } from '../../../core/services/store-branch-selection';
import { ProductSummary } from '../../../shared/models/product';
import { AppBadge } from '../../../shared/components/app-badge/app-badge';
import { AppBreadcrumb } from '../../../shared/components/app-breadcrumb/app-breadcrumb';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { ProductGrid } from '../../../shared/components/product-grid/product-grid';
import { QuantityStepper } from '../../../shared/components/quantity-stepper/quantity-stepper';

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    AppBadge,
    AppBreadcrumb,
    AppButton,
    AppEyebrow,
    ErrorAlert,
    LoadingSpinner,
    ProductGrid,
    QuantityStepper,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly branchSelection = inject(StoreBranchSelectionService);
  private readonly cartService = inject(Cart);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewportScroller = inject(ViewportScroller);

  protected readonly product = signal<ProductSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly quantity = signal(1);

  /** Current product route id, reused when branch selection changes. */
  private readonly currentProductId = signal<number | null>(null);

  /** Last branch id used to load detail stock availability. */
  private previousBranchId: number | null = this.branchSelection.selectedBranchId();

  /** Temporary feedback state after adding to cart. */
  protected readonly justAdded = signal(false);

  /** Related products from the same category (excludes current product). */
  protected readonly relatedProducts = signal<ProductSummary[]>([]);

  /** Dynamic title for the related products section. */
  protected readonly relatedTitle = signal('Productos relacionados');

  /** Category link for the related section header (null for featured fallback). */
  protected readonly relatedLink = signal<{ categoryId: number } | null>(null);

  constructor() {
    effect(() => {
      const branchId = this.branchSelection.selectedBranchId();
      const productId = this.currentProductId();
      if (!productId || branchId === this.previousBranchId) {
        return;
      }

      this.previousBranchId = branchId;
      this.loadProduct(productId);
    });
  }

  ngOnInit(): void {
    // Subscribe to paramMap so the component reacts when navigating between
    // different products (same route pattern, different :id param).
    const sub = this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id || isNaN(id)) {
        this.error.set(true);
        this.loading.set(false);
        return;
      }
      this.quantity.set(1);
      this.currentProductId.set(id);
      this.loadProduct(id);
      this.viewportScroller.scrollToPosition([0, 0]);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadProduct(id: number): void {
    this.loading.set(true);
    this.error.set(false);

    this.catalogService.getProductDetail(id).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
        this.loadRelatedProducts(p);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /**
   * Load random products from the same category, excluding the current one.
   * Falls back to featured (recommended) products when the category has no other products.
   */
  private loadRelatedProducts(current: ProductSummary): void {
    this.catalogService.getRelatedProducts(current.id).subscribe({
      next: (res) => {
        if (res.content.length > 0) {
          this.relatedProducts.set(res.content);
          this.relatedTitle.set(`Mas de ${current.categoryName}`);
          this.relatedLink.set({ categoryId: current.categoryId });
        } else {
          this.loadFeaturedAsFallback();
        }
      },
      error: () => this.loadFeaturedAsFallback(),
    });
  }

  /** Load featured/recommended products as fallback when no same-category products exist. */
  private loadFeaturedAsFallback(): void {
    this.catalogService.getFeaturedProducts().subscribe({
      next: (res) => {
        // Exclude the current product from featured list
        const p = this.product();
        const featured = res.content.filter((item) => item.id !== p?.id).slice(0, 6);
        this.relatedProducts.set(featured);
        this.relatedTitle.set('Recomendados para vos');
        this.relatedLink.set(null); // No category link for featured
      },
      // Silently ignore
    });
  }

  protected increment(): void {
    this.quantity.update((q) => q + 1);
  }

  protected decrement(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  protected addToCart(): void {
    const p = this.product();
    if (!p) return;

    // Add to cart service
    this.cartService.addItem(p, this.quantity());

    // Show temporary feedback
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 2000);
  }

  /** Whether the product is out of stock. */
  protected readonly isOutOfStock = computed(() => this.product()?.availableStock === 0);

  /** Whether the product has low stock (1-5 units). */
  protected readonly isLowStock = computed(() => {
    const stock = this.product()?.availableStock;
    return stock != null && stock > 0 && stock <= 5;
  });

  /** Breadcrumb items for navigation trail: Catalogo / {Product name}. */
  protected readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const p = this.product();
    return [{ label: 'Catalogo', routerLink: '/store/products' }, { label: p?.name ?? 'Producto' }];
  });

  /** Home item for the breadcrumb. */
  protected readonly breadcrumbHome: MenuItem = {
    icon: 'pi pi-home',
    routerLink: '/store',
  };
}
