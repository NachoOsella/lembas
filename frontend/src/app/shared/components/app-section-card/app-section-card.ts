import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-card',
  templateUrl: './app-section-card.html',
  styleUrl: './app-section-card.css',
})
/** Provides a consistent card container for dashboards, forms, and content sections. */
export class AppSectionCard {
  readonly eyebrow = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly tone = input<'surface' | 'muted' | 'dark'>('surface');
}
