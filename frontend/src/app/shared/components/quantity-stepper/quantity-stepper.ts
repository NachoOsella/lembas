import { Component, model, ChangeDetectionStrategy } from '@angular/core';

/**
 * Reusable quantity stepper component.
 *
 * Renders a minus/plus button pair with a centered count display.
 * Follows the DESING.md Numeric Stepper spec: circular 32x32px buttons,
 * subtle border, neutral gray icons, centered bold number.
 *
 * Usage:
 * ```html
 * <app-quantity-stepper [(value)]="quantity" [min]="1" [max]="99" />
 * ```
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quantity-stepper',
  templateUrl: './quantity-stepper.html',
  styleUrl: './quantity-stepper.css',
})
export class QuantityStepper {
  /** Current quantity value (two-way bindable). */
  readonly value = model(1);

  /** Minimum allowed value. Defaults to 1. */
  readonly min = model(1);

  /** Maximum allowed value. Defaults to 99. */
  readonly max = model(99);

  /** Whether the stepper is disabled. */
  readonly disabled = model(false);

  /** Decrements the value if above minimum. */
  protected decrement(): void {
    const current = this.value();
    if (current > this.min()) {
      this.value.set(current - 1);
    }
  }

  /** Increments the value if below maximum. */
  protected increment(): void {
    const current = this.value();
    if (current < this.max()) {
      this.value.set(current + 1);
    }
  }
}
