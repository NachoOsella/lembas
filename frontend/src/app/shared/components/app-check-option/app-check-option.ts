import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Checkbox } from 'primeng/checkbox';

/**
 * Reusable Lembas option checkbox with a larger, branded touch target.
 *
 * Use this component when a checkbox is part of a visible form option group.
 * It follows the Lembas design rules for warm surfaces, pill geometry,
 * leaf-green checked state, and comfortable spacing on desktop and mobile.
 */
@Component({
  selector: 'app-check-option',
  imports: [Checkbox, FormsModule],
  templateUrl: './app-check-option.html',
  styleUrl: './app-check-option.css',
})
export class AppCheckOption {
  readonly inputId = input('');
  readonly name = input('');
  readonly disabled = input(false);
  readonly compact = input(false);

  readonly value = model(false);
}
