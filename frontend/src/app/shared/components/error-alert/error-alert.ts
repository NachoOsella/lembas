import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-error-alert',
  imports: [Button, Message],
  templateUrl: './error-alert.html',
  styleUrl: './error-alert.css',
})
export class ErrorAlert {
  readonly title = input('No pudimos completar la accion.');
  readonly message = input('Intenta nuevamente en unos minutos.');
  /** 'card' wraps in PrimeNG Message with icon circle; 'inline' renders a lightweight flex row. */
  readonly variant = input<'card' | 'inline'>('card');
  readonly testId = input<string | null>(null);
  readonly dismissible = input(false);

  readonly dismissed = output<void>();

  protected onDismiss(): void {
    this.dismissed.emit();
  }
}
