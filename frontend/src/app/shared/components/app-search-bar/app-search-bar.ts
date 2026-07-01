import { Component, input, model, output, viewChild } from '@angular/core';
import { AppInput } from '../app-input/app-input';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-search-bar',
  imports: [AppInput, Button],
  templateUrl: './app-search-bar.html',
  styleUrl: './app-search-bar.css',
})
export class AppSearchBar {
  readonly placeholder = input('Buscar...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);

  readonly value = model<string>('');
  readonly search = output<string>();
  readonly clear = output<void>();

  /** Reference to the wrapped input so we can dismiss the soft keyboard on submit. */
  private readonly inputRef = viewChild(AppInput);

  protected onInput(value: string): void {
    this.value.set(value);
    if (!value) {
      this.clear.emit();
    }
  }

  protected onEnter(): void {
    const query = this.value();
    if (!query) {
      return;
    }
    this.search.emit(query);
    // Drop focus so the mobile soft keyboard closes after the submit
    // and the user sees the page (and the auto-scrolled results) instead
    // of the keyboard covering half the viewport.
    this.inputRef()?.blurInput();
  }

  protected onClear(): void {
    this.value.set('');
    this.clear.emit();
    this.inputRef()?.blurInput();
  }
}
