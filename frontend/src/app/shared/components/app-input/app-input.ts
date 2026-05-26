import { Component, computed, input, model, output } from '@angular/core';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';

/**
 * Lembas-styled wrapper over PrimeNG InputText.
 * Provides consistent form input styling with optional prefix/suffix icons.
 */
@Component({
  selector: 'app-input',
  imports: [InputText, IconField, InputIcon],
  templateUrl: './app-input.html',
  styleUrl: './app-input.css',
})
export class AppInput {
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly invalid = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly prefixIcon = input<string | undefined>(undefined);
  readonly suffixIcon = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | null>(null);
  readonly testId = input<string | null>(null);

  readonly value = model<string>('');
  readonly blur = output<void>();
  readonly focus = output<void>();

  protected readonly inputClass = computed(() =>
    ['app-input', `app-input--${this.size()}`, this.invalid() ? 'app-input--invalid' : ''].join(
      ' ',
    ),
  );

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }

  protected onBlur(): void {
    this.blur.emit();
  }

  protected onFocus(): void {
    this.focus.emit();
  }
}
