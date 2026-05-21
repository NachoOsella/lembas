import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
/** Renders a lightweight confirmation modal for sensitive user actions. */
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
