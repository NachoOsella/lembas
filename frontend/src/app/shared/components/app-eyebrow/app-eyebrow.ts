import { Component, input } from '@angular/core';

/**
 * Reusable eyebrow text component.
 *
 * Renders a small uppercase label above headings, used for section labels
 * like "Seleccion curada", "Gondola", "Como funciona", etc.
 *
 * Color variants:
 * - `green`: Lembas Leaf Green (#2f8d72) — default for light backgrounds
 * - `light`: White with 70% opacity — for dark green backgrounds
 * - `bark`: Brown Bark (#9a5b19) — for editorial / category nav modal
 */
@Component({
  selector: 'app-eyebrow',
  templateUrl: './app-eyebrow.html',
  styleUrl: './app-eyebrow.css',
})
export class AppEyebrow {
  /** Color variant. */
  readonly color = input<'green' | 'light' | 'bark'>('green');
}
