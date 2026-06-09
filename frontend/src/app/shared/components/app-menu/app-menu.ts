import { Component, input, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

/**
 * Reusable Lembas menu wrapper around PrimeNG Menu.
 *
 * Supports both static (inline) and popup (contextual) menus with consistent
 * appendTo behaviour. Use for dropdown action menus, user menus, and status
 * change menus in admin tables.
 *
 * Popup usage:
 * ```html
 * <app-menu #menu [model]="items" [popup]="true" appendTo="body" />
 * <app-button (click)="menu.toggle($event)">Open</app-button>
 * ```
 *
 * The component exposes `.toggle(event)` so template reference variables
 * work the same as with PrimeNG's native p-menu.
 */
@Component({
  selector: 'app-menu',
  imports: [Menu],
  templateUrl: './app-menu.html',
  styleUrl: './app-menu.css',
})
export class AppMenu {
  readonly model = input.required<MenuItem[]>();
  readonly popup = input(false);
  readonly appendTo = input<HTMLElement | 'body' | null>('body');

  /** Reference to the inner p-menu for popup toggle delegation. */
  private readonly menu = viewChild<Menu>(Menu);

  /** Toggles the popup menu at the given event position. */
  toggle(event: Event): void {
    this.menu()?.toggle(event);
  }
}
