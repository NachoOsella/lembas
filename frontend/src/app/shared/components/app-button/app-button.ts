import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './app-button.html',
  styleUrl: './app-button.css',
})
export class AppButton {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'hero'
    | 'success'
    | 'green-on-green'
    | 'outlined-on-dark'
    | 'dark-outlined'
    | 'consent'
  >('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly icon = input<string | null>(null);
  readonly iconOnly = input(false);
  readonly loadingLabel = input('Cargando...');
  readonly ariaLabel = input<string | null>(null);
  readonly testId = input<string | null>(null);

  /** Optional routerLink — when set, renders as <a> instead of <button>. */
  readonly routerLink = input<string | string[] | null>(null);

  /** Prevents user interaction while the button is disabled or submitting. */
  protected readonly isDisabled = computed(() => this.disabled() || this.loading());

  /** Whether to render as an anchor tag. */
  protected readonly isLink = computed(() => this.routerLink() != null);

  /** Builds PrimeNG-compatible classes for the selected semantic variant and size. */
  protected readonly buttonClass = computed(() => {
    const classes = ['app-button', `app-button--${this.variant()}`, `app-button--${this.size()}`];
    if (this.iconOnly()) {
      classes.push('app-button--icon-only');
    }
    return classes.join(' ');
  });
}
