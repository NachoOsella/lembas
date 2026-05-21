import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.css',
})
/** Displays a branded loading indicator for asynchronous sections and page states. */
export class LoadingSpinner {
  readonly label = input('Cargando...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly surface = input<'plain' | 'card' | 'band'>('plain');
}
