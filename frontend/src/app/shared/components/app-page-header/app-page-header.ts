import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './app-page-header.html',
  styleUrl: './app-page-header.css',
})
/** Renders a consistent page hero/header with optional projected actions. */
export class AppPageHeader {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly tone = input<'light' | 'dark'>('light');
}
