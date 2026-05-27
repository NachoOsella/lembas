import { Component, input, model, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-modal',
  imports: [Dialog],
  templateUrl: './app-modal.html',
  styleUrl: './app-modal.css',
})
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
