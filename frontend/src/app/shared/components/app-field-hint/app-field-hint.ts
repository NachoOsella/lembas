import { Component, input } from '@angular/core';

@Component({
  selector: 'app-field-hint',
  templateUrl: './app-field-hint.html',
  styleUrl: './app-field-hint.css',
})
/** Shows consistent helper, success, or error copy below form controls. */
export class AppFieldHint {
  readonly tone = input<'hint' | 'success' | 'error'>('hint');
}
