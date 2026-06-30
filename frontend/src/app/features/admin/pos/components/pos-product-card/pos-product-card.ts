import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
} from '@angular/core';

import { PosProductSearchItem } from '../../services/pos-product-search.service';

/** Visual state for the stock badge. */
type StockState = 'ok' | 'out' | 'unknown';

/**
 * Compact product card used in the POS search results grid.
 *
 * <p>Renders the fields the cashier needs to decide whether to add the
 * item to the cart: name, brand, price and a prominent stock badge.
 * When the stock is reported as 0 the card becomes a disabled affordance
 * and the {@code selected} emitter is suppressed.</p>
 *
 * <p>Stock label semantics:</p>
 * <ul>
 *   <li>positive value -> green pill, "N en stock" with check icon</li>
 *   <li>zero -> red pill, "Sin stock" with ban icon</li>
 *   <li>null (branch unresolved) -> neutral pill, "Verificar" with info icon</li>
 * </ul>
 */
@Component({
  selector: 'app-pos-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-product-card.html',
  styleUrl: './pos-product-card.css',
})
export class PosProductCardComponent {
  @Input({ required: true }) item!: PosProductSearchItem;
  @Input() disabled = false;

  @Output() readonly selected = new EventEmitter<PosProductSearchItem>();

  /**
   * The current visual state of the stock badge. Computed once per input
   * change and consumed by the template + tests.
   */
  protected readonly stockState = computed<StockState>(() => {
    const value = this.item?.availableStock;
    if (value == null) {
      return 'unknown';
    }
    return value > 0 ? 'ok' : 'out';
  });

  protected onClick(): void {
    if (this.disabled) {
      return;
    }
    this.selected.emit(this.item);
  }

  protected isOutOfStock(): boolean {
    return this.stockState() === 'out';
  }

  protected hasPositiveStock(): boolean {
    return this.stockState() === 'ok';
  }

  protected stockLabel(): string {
    switch (this.stockState()) {
      case 'ok':
        return `${this.item.availableStock} en stock`;
      case 'out':
        return 'Sin stock';
      case 'unknown':
        return 'Verificar stock';
    }
  }

  protected stockIcon(): string {
    switch (this.stockState()) {
      case 'ok':
        return 'pi-check-circle';
      case 'out':
        return 'pi-ban';
      case 'unknown':
        return 'pi-question-circle';
    }
  }

  /** Price formatted as es-AR currency without trailing zeros noise. */
  protected priceFormatted(): string {
    return new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 0,
    }).format(this.item?.salePrice ?? 0);
  }

  /** Full a11y label so screen readers announce name + price + stock state. */
  protected ariaLabel(): string {
    const stock = this.stockLabel();
    const price = `$${this.priceFormatted()}`;
    return `${this.item?.name ?? 'Producto'}, ${price}, ${stock}${
      this.disabled ? ' (sin stock)' : ''
    }`;
  }
}
