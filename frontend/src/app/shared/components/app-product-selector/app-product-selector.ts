import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoComplete } from 'primeng/autocomplete';

import { ProductSummary } from '../../models/product';

/**
 * Reusable product selector with autocomplete search by name or barcode.
 *
 * <p>The component is intentionally presentation-only: parent pages own the API
 * search and pass the resulting suggestions. This keeps it reusable for stock,
 * POS, order, and catalog workflows.</p>
 */
@Component({
  selector: 'app-product-selector',
  imports: [AutoComplete, CurrencyPipe, FormsModule],
  templateUrl: './app-product-selector.html',
  styleUrl: './app-product-selector.css',
})
export class AppProductSelector {
  readonly inputId = input('product-selector');
  readonly label = input('Producto');
  readonly placeholder = input('Buscar producto por nombre o codigo');
  readonly required = input(false);
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly suggestions = input<ProductSummary[]>([]);
  readonly loading = input(false);
  readonly selected = model<ProductSummary | null>(null);
  readonly query = model('');

  readonly search = output<string>();

  protected readonly displayValue = computed(() => this.selected() ?? this.query());

  /** Emits a normalized query when PrimeNG requests suggestions. */
  protected complete(event: { query: string }): void {
    const value = event.query.trim();
    this.query.set(value);
    this.search.emit(value);
  }

  /** Stores the chosen product or clears selection when free text changes. */
  protected select(value: ProductSummary | string | null): void {
    if (value && typeof value === 'object') {
      this.selected.set(value);
      this.query.set(this.productLabel(value));
      return;
    }
    this.selected.set(null);
    this.query.set(typeof value === 'string' ? value : '');
  }

  /** Builds a compact product label with barcode context when available. */
  protected productLabel(product: ProductSummary): string {
    const barcode = product.barcode ? ` · ${product.barcode}` : '';
    return `${product.name}${barcode}`;
  }
}
