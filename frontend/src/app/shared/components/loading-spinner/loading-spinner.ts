import { Component, computed, input } from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [ProgressSpinner],
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.css',
})
export class LoadingSpinner {
  readonly label = input('Cargando...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly surface = input<'plain' | 'card' | 'band'>('plain');

  /** Maps semantic sizes to PrimeNG spinner dimensions. */
  protected readonly spinnerSize = computed(() => {
    const sizes = {
      sm: '2rem',
      md: '2.75rem',
      lg: '3.5rem',
    } satisfies Record<'sm' | 'md' | 'lg', string>;

    return sizes[this.size()];
  });
}
