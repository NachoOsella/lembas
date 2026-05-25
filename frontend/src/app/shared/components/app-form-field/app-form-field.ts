import { Component, computed, input, model } from '@angular/core';
import { AppInput } from '../app-input/app-input';
import { AppFieldHint } from '../app-field-hint/app-field-hint';

/**
 * Lembas form-field wrapper combining label, input, hint, and error messages
 * into a single accessible and consistently-styled component.
 */
@Component({
  selector: 'app-form-field',
  imports: [AppInput, AppFieldHint],
  templateUrl: './app-form-field.html',
  styleUrl: './app-form-field.css',
})
export class AppFormField {
  readonly label = input.required<string>();
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly prefixIcon = input<string | undefined>(undefined);
  readonly suffixIcon = input<string | undefined>(undefined);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly testId = input<string | null>(null);

  readonly value = model<string>('');

  protected readonly hasError = computed(() => !!this.error());
  protected readonly inputId = computed(() => {
    const base = this.testId() ?? 'field';
    return `${base}-input`;
  });
}
