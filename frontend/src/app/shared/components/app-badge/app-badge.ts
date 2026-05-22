import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  templateUrl: './app-badge.html',
  styleUrl: './app-badge.css',
})
/** Displays a small semantic label for statuses, categories, and metadata. */
export class AppBadge {
  readonly tone = input<'success' | 'warning' | 'danger' | 'info' | 'neutral'>('neutral');
  readonly icon = input<string | null>(null);
}
