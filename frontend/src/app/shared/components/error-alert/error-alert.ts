import { Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

@Component({
  selector: 'app-error-alert',
  imports: [Button, Message],
  templateUrl: './error-alert.html',
  styleUrl: './error-alert.css',
})
/** Shows an accessible PrimeNG error message with an optional dismiss control. */
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
