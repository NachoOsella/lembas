import { Component, computed, input, model, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { AppInput } from '../app-input/app-input';
import { AppFieldHint } from '../app-field-hint/app-field-hint';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-form-field',
  imports: [AppInput, AppFieldHint, FormsModule, InputText],
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
  /** Enables floating label mode: label animates inside the input border. */
  readonly floating = input(false);
  /** When true, renders a textarea instead of a single-line input. */
  readonly multiline = input(false);

  readonly value = model<string>('');

  protected readonly isFocused = signal(false);

  protected readonly hasError = computed(() => !!this.error());
  protected readonly inputId = computed(() => {
    const base = this.testId() ?? 'field';
    return `${base}-input`;
  });

  protected onFocus(): void {
    this.isFocused.set(true);
  }

  protected onBlur(): void {
    this.isFocused.set(false);
  }
}
