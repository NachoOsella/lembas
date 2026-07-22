import {
  Component,
  ViewEncapsulation,
  input,
  model,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';

import { AppButton } from '../app-button/app-button';

/** Dialog mode. 'confirm' is the standard yes/no dialog. 'confirm-with-reason' shows a textarea. */
export type ConfirmDialogMode = 'confirm' | 'confirm-with-reason';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-confirm-dialog',
  host: { class: 'confirm-dialog-host' },
  imports: [AppButton, Dialog, FormsModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  encapsulation: ViewEncapsulation.None,
})
/**
 * Shared confirmation dialog that asks users to approve or cancel an action.
 *
 * <p>Two modes are supported:
 * <ul>
 *   <li>{@code confirm} (default): standard yes/no dialog.</li>
 *   <li>{@code confirm-with-reason}: shows a required textarea. The
 *       {@code confirmed} event is only emitted when the reason is non-blank.</li>
 * </ul></p>
 */
export class ConfirmDialog {
  readonly visible = input(false);
  readonly title = input('Confirmar accion');
  readonly message = input('Esta accion no se puede deshacer.');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly destructive = input(false);

  /** Dialog mode. 'confirm-with-reason' shows a required textarea. */
  readonly mode = input<ConfirmDialogMode>('confirm');
  /** Label for the reason input. */
  readonly reasonLabel = input('Motivo');
  /** Placeholder for the reason textarea. */
  readonly reasonPlaceholder = input('');
  /** Maximum length for the reason text. */
  readonly reasonMaxLength = input(500);
  /** Whether the reason is required (true in 'confirm-with-reason' mode). */
  readonly reasonRequired = input(false);
  /**
   * Two-way bound reason text. The parent can read or write this to control
   * the textarea contents, including clearing it after a successful action.
   */
  readonly reason = model<string>('');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  /** Inline error shown when the user tries to confirm with an empty reason. */
  readonly reasonError = signal('');

  /** Resets the inline reason error when the dialog is hidden. */
  onHide(): void {
    this.reasonError.set('');
    this.cancelled.emit();
  }

  /**
   * Emits the {@code confirmed} event. In 'confirm-with-reason' mode, validates
   * that the reason is non-blank before emitting and shows an inline error otherwise.
   */
  onConfirm(): void {
    if (this.mode() === 'confirm-with-reason' && this.reasonRequired()) {
      const trimmed = (this.reason() ?? '').trim();
      if (trimmed.length === 0) {
        this.reasonError.set('El motivo es obligatorio');
        return;
      }
      if (trimmed.length > this.reasonMaxLength()) {
        this.reasonError.set(`El motivo no puede superar los ${this.reasonMaxLength()} caracteres`);
        return;
      }
    }
    this.reasonError.set('');
    this.confirmed.emit();
  }

  /** Emits the {@code cancelled} event and clears any inline reason error. */
  onCancel(): void {
    this.reasonError.set('');
    this.cancelled.emit();
  }

  /** Clears the inline reason error as soon as the user types. */
  onReasonInput(): void {
    if (this.reasonError()) {
      this.reasonError.set('');
    }
  }
}
