import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

import { CatalogService } from '../../../core/services/catalog';
import { ProductSummary } from '../../../shared/models/product';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, ButtonDirective, Ripple, LoadingSpinner, ErrorAlert],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  protected readonly product = signal<ProductSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly quantity = signal(1);

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

  protected increment(): void {
    this.quantity.update((q) => q + 1);
  }

  protected decrement(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  protected addToCart(): void {
    // Placeholder: cart service integration will go here
    this.messageService.add({
      severity: 'success',
      summary: 'Agregado',
      detail: `${this.quantity()}x ${this.product()?.name} agregado al carrito.`,
    });
  }
}
