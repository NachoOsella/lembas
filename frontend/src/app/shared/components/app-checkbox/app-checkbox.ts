import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Checkbox } from 'primeng/checkbox';

/**
 * Reusable Lembas checkbox wrapper around PrimeNG Checkbox.
 *
 * Supports both binary (standalone toggle) and labelled modes. Use binary mode
 * for simple yes/no fields and the projected label for richer markup.
 *
 * Usage:
 * ```html
 * <app-checkbox [(value)]="isPreferred" [binary]="true">
 *   Marcar como proveedor preferido
 * </app-checkbox>
 * ```
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-checkbox',
  imports: [FormsModule, Checkbox],
  templateUrl: './app-checkbox.html',
  styleUrl: './app-checkbox.css',
})
export class AppCheckbox {
  readonly inputId = input('');
  readonly name = input('');
  readonly binary = input(true);
  readonly disabled = input(false);
  readonly label = input<string | null>(null);

  readonly value = model<boolean>(false);
}
