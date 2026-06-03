import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitch } from 'primeng/toggleswitch';

/**
 * Reusable Lembas-branded boolean toggle built on PrimeNG ToggleSwitch.
 *
 * <p>The component centralizes switch styling and accessibility so feature screens
 * do not need one-off PrimeNG overrides.</p>
 */
@Component({
  selector: 'app-toggle-switch',
  imports: [FormsModule, ToggleSwitch],
  templateUrl: './app-toggle-switch.html',
  styleUrl: './app-toggle-switch.css',
})
export class AppToggleSwitch {
  /** Current checked state, compatible with Angular two-way binding. */
  readonly checked = model(false);

  /** Disables user interaction while preserving the visual state. */
  readonly disabled = input(false);

  /** Accessible label announced by assistive technologies. */
  readonly ariaLabel = input<string | null>(null);

  /** Optional DOM id for external labels and tests. */
  readonly inputId = input<string | null>(null);

  /** Optional compact table variant. */
  readonly size = input<'sm' | 'md'>('md');

  /** Visual treatment for toggles that are disabled for business-rule reasons. */
  readonly disabledAppearance = input<'default' | 'subtleActive'>('default');

  /** Classes applied to the host PrimeNG switch. */
  protected readonly switchClass = computed(() => {
    const disabledClass = `app-toggle-switch--disabled-${this.disabledAppearance()}`;
    return `app-toggle-switch app-toggle-switch--${this.size()} ${disabledClass}`;
  });

  /** Maps the app compact option to PrimeNG's native small toggle size. */
  protected readonly primeSize = computed(() => (this.size() === 'sm' ? 'small' : undefined));

  /** Updates the model from PrimeNG's ngModel change event. */
  protected onCheckedChange(value: boolean): void {
    this.checked.set(value);
  }
}
