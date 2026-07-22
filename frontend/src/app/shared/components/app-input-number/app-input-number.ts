import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';

export type InputNumberMode = 'decimal' | 'currency';

/**
 * Reusable Lembas input-number wrapper around PrimeNG InputNumber.
 *
 * Provides a branded numeric input for currency, decimal, and integer values.
 * Supports the same currency, min/max, and fraction-digit options as the
 * underlying PrimeNG component.
 *
 * Usage:
 * ```html
 * <app-input-number
 *   [(value)]="salePrice"
 *   mode="currency"
 *   currency="ARS"
 *   locale="es-AR"
 *   [min]="0"
 *   [maxFractionDigits]="2"
 * />
 * ```
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-input-number',
  imports: [FormsModule, InputNumber],
  templateUrl: './app-input-number.html',
  styleUrl: './app-input-number.css',
})
export class AppInputNumber {
  readonly inputId = input('');
  readonly mode = input<InputNumberMode>('decimal');
  readonly currency = input('ARS');
  readonly locale = input('es-AR');
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly minFractionDigits = input(0);
  readonly maxFractionDigits = input(2);
  readonly showButtons = input(false);
  readonly name = input('');

  readonly value = model<number | null>(null);
}
