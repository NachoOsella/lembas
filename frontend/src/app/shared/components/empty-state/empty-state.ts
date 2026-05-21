import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
/** Presents a friendly empty-data message with an optional recovery action. */
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
