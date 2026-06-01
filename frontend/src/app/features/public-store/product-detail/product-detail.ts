import { ViewportScroller } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Cart } from '../../../core/services/cart';
import { CatalogService } from '../../../core/services/catalog';
import { ProductSummary } from '../../../shared/models/product';
import { AppBadge } from '../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { ProductGrid } from '../../../shared/components/product-grid/product-grid';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, AppBadge, AppButton, AppEyebrow, ErrorAlert, LoadingSpinner, ProductGrid],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(Cart);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewportScroller = inject(ViewportScroller);

  protected readonly product = signal<ProductSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly quantity = signal(1);

  /** Temporary feedback state after adding to cart. */
  protected readonly justAdded = signal(false);

  /** Related products from the same category (excludes current product). */
  protected readonly relatedProducts = signal<ProductSummary[]>([]);

  /** Dynamic title for the related products section. */
  protected readonly relatedTitle = signal('Productos relacionados');

  /** Category link for the related section header (null for featured fallback). */
  protected readonly relatedLink = signal<{ categoryId: number } | null>(null);

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
}
