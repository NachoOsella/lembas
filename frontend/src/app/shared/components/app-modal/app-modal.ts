import {
  Component,
  ViewEncapsulation,
  input,
  model,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-modal',
  host: { class: 'app-modal-host' },
  imports: [Dialog],
  templateUrl: './app-modal.html',
  styleUrl: './app-modal.css',
  encapsulation: ViewEncapsulation.None,
})
/** Shared PrimeNG dialog wrapper used by feature forms and admin modals. */
export class AppModal {
  readonly visible = model(false);
  readonly title = input<string>('');
  readonly width = input<string>('min(92vw, 28rem)');
  readonly dismissible = input(true);
  readonly closable = input(true);
  readonly draggable = input(false);
  readonly resizable = input(false);
  readonly modal = input(true);

  readonly hidden = output<void>();

  protected onHide(): void {
    this.visible.set(false);
    this.hidden.emit();
  }
}
