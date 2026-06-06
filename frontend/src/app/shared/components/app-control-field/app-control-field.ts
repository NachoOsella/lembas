import { Component, computed, input } from '@angular/core';

import { AppFieldHint } from '../app-field-hint/app-field-hint';

/**
 * Generic projected form-control wrapper for PrimeNG or custom controls.
 *
 * Use this when a field needs the shared Lembas label, required marker,
 * hint/error copy, and spacing, but the actual control is not a plain text
 * input covered by AppFormField.
 */
@Component({
  selector: 'app-control-field',
  imports: [AppFieldHint],
  templateUrl: './app-control-field.html',
  styleUrl: './app-control-field.css',
})
export class AppControlField {
  readonly label = input.required<string>();
  readonly forId = input<string | null>(null);
  readonly required = input(false);
  readonly error = input<string>('');
  readonly hint = input<string>('');
  readonly wide = input(false);

  /** Indicates whether the field has validation feedback to render. */
  protected readonly hasError = computed(() => this.error().trim().length > 0);
}
