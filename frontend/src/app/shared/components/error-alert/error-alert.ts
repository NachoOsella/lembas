import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  imports: [],
  templateUrl: './error-alert.html',
  styleUrl: './error-alert.css',
})
/** Shows an accessible error message with an optional dismiss control. */
export class ErrorAlert {
  readonly title = input('No pudimos completar la accion');
  readonly message = input('Intentá nuevamente en unos minutos.');
  readonly dismissible = input(false);

  readonly dismissed = output<void>();

  /** Notifies parent components when the alert is dismissed. */
  protected onDismiss(): void {
    this.dismissed.emit();
  }
}
