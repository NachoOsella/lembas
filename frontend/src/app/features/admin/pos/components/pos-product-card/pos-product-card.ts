import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { PosProductSearchItem } from '../../services/pos-product-search.service';

/**
 * Compact product card used in the POS search results grid.
 *
 * <p>Renders the fields the cashier needs to decide whether to add the item
 * to the cart: name, brand, price, barcode and available stock. When the
 * stock is reported as 0 (or null + "—") the card becomes a disabled
 * affordance and the {@code selected} emitter is suppressed.</p>
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

  protected onClick(): void {
    if (this.disabled) {
      return;
    }
    this.selected.emit(this.item);
  }

  /** True when the product has stock information and it is zero or negative. */
  protected isOutOfStock(): boolean {
    return this.item.availableStock != null && this.item.availableStock <= 0;
  }

  /** True when stock is reported but the cashier can still sell (positive). */
  protected hasPositiveStock(): boolean {
    return this.item.availableStock != null && this.item.availableStock > 0;
  }

  /** Stock label displayed in the card footer. */
  protected stockLabel(): string {
    if (this.item.availableStock == null) {
      return 'stock: —';
    }
    if (this.item.availableStock <= 0) {
      return 'sin stock';
    }
    return `stock: ${this.item.availableStock}`;
  }
}
