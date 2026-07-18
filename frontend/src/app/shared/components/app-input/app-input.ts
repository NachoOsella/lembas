import type { ElementRef } from '@angular/core';
import {
  Component,
  computed,
  input,
  model,
  output,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import type { FieldTree } from '@angular/forms/signals';
import { FormField } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-input',
  imports: [InputText, IconField, InputIcon, FormField],
  templateUrl: './app-input.html',
  styleUrl: './app-input.css',
})
export class AppInput {
  /**
   * Reference to the underlying native input. Used by parent components
   * (e.g. {@link AppSearchBar}) to programmatically blur the field and
   * dismiss the mobile soft keyboard after a submit.
   */
  protected readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  /** Programmatically removes focus from the input (closes the mobile keyboard). */
  blurInput(): void {
    this.inputRef()?.nativeElement.blur();
  }
  readonly inputId = input<string | null>(null);
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string | null>(null);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly invalid = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly prefixIcon = input<string | undefined>(undefined);
  readonly suffixIcon = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | null>(null);
  readonly testId = input<string | null>(null);

  /** When provided, binds to Angular signal forms instead of the value model. */
  readonly formField = input<FieldTree<string> | undefined>(undefined);

  readonly value = model<string>('');
  readonly blur = output<void>();
  readonly focus = output<void>();
  readonly enter = output<void>();

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

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.enter.emit();
    }
  }
}
