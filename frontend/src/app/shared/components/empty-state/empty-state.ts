import { NgClass } from '@angular/common';
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { AppButton } from '../app-button/app-button';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-empty-state',
  imports: [AppButton, NgClass],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  readonly icon = input('pi pi-inbox');
  readonly title = input('No hay resultados');
  readonly description = input('Todavia no hay informacion para mostrar.');
  readonly actionLabel = input<string | null>(null);

  readonly action = output<void>();

  /** Emits the optional empty-state action selected by the user. */
  protected onAction(): void {
    this.action.emit();
  }
}
