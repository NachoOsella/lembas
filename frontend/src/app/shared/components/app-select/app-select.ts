import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

/** Generic option shape commonly used by admin selectors. */
export interface AppSelectOption<T = unknown> {
  readonly label: string;
  readonly value: T;
}

/**
 * Reusable Lembas select wrapper around PrimeNG Select.
 *
 * It enables client-side filtering by default so long option lists can be
 * searched by typing instead of manually scrolling. Use this component for
 * dropdowns that use the standard `{ label, value }` option shape.
 */
@Component({
  selector: 'app-select',
  imports: [FormsModule, Select],
  templateUrl: './app-select.html',
  styleUrl: './app-select.css',
})
export class AppSelect<T = unknown> {
  readonly options = input<AppSelectOption<T>[]>([]);
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

  readonly value = model<T | null>(null);
}
