import { Component, ViewEncapsulation, input, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';

import { AppButton } from '../app-button/app-button';

@Component({
  selector: 'app-confirm-dialog',
  host: { class: 'confirm-dialog-host' },
  imports: [AppButton, Dialog],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  encapsulation: ViewEncapsulation.None,
})
/** Shared confirmation dialog that asks users to approve or cancel an action. */
export class ConfirmDialog {
  readonly visible = input(false);
  readonly title = input('Confirmar accion');
  readonly message = input('Esta accion no se puede deshacer.');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly destructive = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  /** Emits when the user accepts the confirmation request. */
  protected onConfirm(): void {
    this.confirmed.emit();
  }

  /** Emits when the user cancels or closes the confirmation request. */
  protected onCancel(): void {
    this.cancelled.emit();
  }
}
