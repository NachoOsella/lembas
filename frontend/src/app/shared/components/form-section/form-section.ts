import { Component, input } from '@angular/core';

/**
 * Generic numbered form section wrapper.
 *
 * Renders a consistent section header with a numbered badge, title and optional
 * description, then projects the section body via content projection.
 *
 * Usage:
 * ```html
 * <app-form-section [index]="1" title="Datos principales" description="Informacion basica del producto.">
 *   <div class="grid"> ... fields ... </div>
 * </app-form-section>
 * ```
 */
@Component({
  selector: 'app-form-section',
  templateUrl: './form-section.html',
  styleUrl: './form-section.css',
})
export class FormSection {
  /** Section number displayed in the badge (1-based). */
  readonly index = input.required<number>();

  /** Section heading text. */
  readonly title = input.required<string>();

  /** Optional description text below the heading. */
  readonly description = input('');
}
