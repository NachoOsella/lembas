import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './app-button.html',
  styleUrl: './app-button.css',
})
/** Reusable application button that centralizes visual variants and loading states. */
export class AppButton {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly icon = input<string | null>(null);
  readonly loadingLabel = input('Cargando...');
  readonly ariaLabel = input<string | null>(null);
  readonly testId = input<string | null>(null);

  /** Prevents user interaction while the button is disabled or submitting. */
  protected readonly isDisabled = computed(() => this.disabled() || this.loading());

  /** Builds the CSS classes for the selected semantic variant and size. */
  protected readonly buttonClass = computed(() => [
    'app-button',
    `app-button--${this.variant()}`,
    `app-button--${this.size()}`,
  ].join(' '));
}
