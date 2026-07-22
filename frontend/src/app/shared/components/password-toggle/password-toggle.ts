import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';

/**
 * Reusable password visibility toggle button.
 *
 * Renders an eye/eye-slash icon button that toggles a boolean signal
 * for password visibility. Used in auth forms to avoid duplicating
 * the same button markup and CSS across login/register pages.
 *
 * Usage:
 * ```html
 * <app-password-toggle [(visible)]="passwordVisible" fieldId="password" />
 * ```
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-password-toggle',
  templateUrl: './password-toggle.html',
  styleUrl: './password-toggle.css',
})
export class PasswordToggle {
  /** Two-way bound signal for password visibility state. */
  readonly visible = model(false);

  /** ID of the associated input field for aria-controls. */
  readonly fieldId = input<string>('');

  /** Accessible label for the toggle button. */
  readonly ariaLabel = input<string>('Mostrar contrasena');
}
