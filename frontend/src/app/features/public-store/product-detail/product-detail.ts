import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { Cart } from '../../../core/services/cart';
import { CatalogService } from '../../../core/services/catalog';
import { ProductSummary } from '../../../shared/models/product';
import { AppBadge } from '../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StoreProductCard } from '../../../shared/components/store-product-card/store-product-card';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, AppBadge, AppButton, ErrorAlert, LoadingSpinner, StoreProductCard],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(Cart);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  protected readonly product = signal<ProductSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly quantity = signal(1);

  /** Related products from the same category (excludes current product). */
  protected readonly relatedProducts = signal<ProductSummary[]>([]);

  /** Dynamic title for the related products section. */
  protected readonly relatedTitle = signal('Productos relacionados');

  /** Category link for the related section header (null for featured fallback). */
  protected readonly relatedLink = signal<{ categoryId: number } | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loadProduct(id);
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
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el producto.',
        });
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
    this.messageService.add({
      severity: 'success',
      summary: 'Agregado',
      detail: `${this.quantity()}x ${p.name} agregado al pedido.`,
    });
  }

  /** Whether the product is out of stock. */
  protected readonly isOutOfStock = computed(() => this.product()?.availableStock === 0);

  /** Whether the product has low stock (1-5 units). */
  protected readonly isLowStock = computed(() => {
    const stock = this.product()?.availableStock;
    return stock != null && stock > 0 && stock <= 5;
  });
}
