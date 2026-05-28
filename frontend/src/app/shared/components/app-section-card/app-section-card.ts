import { Component, input } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-section-card',
  imports: [Card],
  templateUrl: './app-section-card.html',
  styleUrl: './app-section-card.css',
})
export class AppSectionCard {
  readonly eyebrow = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly tone = input<'surface' | 'muted' | 'dark'>('surface');
}
