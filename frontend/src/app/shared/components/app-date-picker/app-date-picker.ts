import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';

/**
 * Reusable Lembas date-picker wrapper around PrimeNG DatePicker.
 *
 * Provides a branded date input with min/max constraints, custom date format,
 * and consistent appendTo behaviour to avoid overflow clipping in modals and
 * data tables.
 *
 * Usage:
 * ```html
 * <app-date-picker
 *   [(value)]="expirationDate"
 *   [minDate]="tomorrow()"
 *   dateFormat="yy-mm-dd"
 *   placeholder="Sin vencimiento"
 * />
 * ```
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-date-picker',
  imports: [FormsModule, DatePicker],
  templateUrl: './app-date-picker.html',
  styleUrl: './app-date-picker.css',
})
export class AppDatePicker {
  readonly inputId = input('');
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly dateFormat = input('yy-mm-dd');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly showIcon = input(false);
  readonly iconDisplay = input<'input' | 'button'>('input');
  readonly appendTo = input<HTMLElement | 'body' | null>('body');
  readonly name = input('');
  readonly selectionMode = input<'single' | 'range' | 'multiple'>('single');

  readonly value = model<Date | null>(null);
}
