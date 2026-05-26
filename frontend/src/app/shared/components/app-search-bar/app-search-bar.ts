import { Component, input, model, output } from '@angular/core';
import { AppInput } from '../app-input/app-input';
import { Button } from 'primeng/button';

/**
 * Lembas-styled search bar with integrated search icon and clear button.
 */
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

  protected onInput(value: string): void {
    this.value.set(value);
    if (!value) {
      this.clear.emit();
    }
  }

  protected onEnter(): void {
    this.search.emit(this.value());
  }

  protected onClear(): void {
    this.value.set('');
    this.clear.emit();
  }
}
