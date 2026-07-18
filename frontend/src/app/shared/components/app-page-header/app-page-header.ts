import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-header',
  templateUrl: './app-page-header.html',
  styleUrl: './app-page-header.css',
})
export class AppPageHeader {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly tone = input<'light' | 'dark'>('light');
}
