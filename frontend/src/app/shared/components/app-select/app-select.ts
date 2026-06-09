import { Component, contentChild, input, model, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

/**
 * Reusable Lembas select wrapper around PrimeNG Select.
 *
 * Supports both `{ label, value }` option objects via `AppSelectOption` and
 * custom option shapes via `optionLabel` / `optionValue`.
 *
 * The type parameter `TValue` represents the selected value type (usually
 * `number | string | null`). Options can be any shape; `optionLabel` and
 * `optionValue` control how PrimeNG reads them.
 *
 * For rich item displays (icons, descriptions), pass named templates:
 * ```html
 * <app-select ...>
 *   <ng-template #selectedItem let-option>...</ng-template>
 *   <ng-template #item let-option>...</ng-template>
 * </app-select>
 * ```
 */
@Component({
  selector: 'app-select',
  imports: [FormsModule, NgTemplateOutlet, Select],
  templateUrl: './app-select.html',
  styleUrl: './app-select.css',
})
export class AppSelect<TValue = unknown> {
  /** Options array. Accepts any shape; optionLabel/optionValue control how PrimeNG reads them. */
  readonly options = input<unknown[] | readonly unknown[]>([]);
  readonly optionLabel = input<string>('label');
  readonly optionValue = input<string>('value');
  readonly placeholder = input('Seleccionar');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly showClear = input(false);
  readonly filter = input(true);
  readonly filterPlaceholder = input('Buscar...');
  readonly emptyMessage = input('No hay opciones disponibles');
  readonly emptyFilterMessage = input('No encontramos resultados');
  readonly inputId = input('');
  readonly name = input('');
  readonly appendTo = input<HTMLElement | 'body' | null>('body');

  readonly value = model<TValue | null>(null);

  /** Optional custom item template projected by the consumer. */
  protected readonly itemTemplate = contentChild<TemplateRef<unknown>>('item');
  /** Optional custom selected-item template projected by the consumer. */
  protected readonly selectedItemTemplate = contentChild<TemplateRef<unknown>>('selectedItem');
}
