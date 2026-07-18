import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { Tag } from 'primeng/tag';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-badge',
  imports: [Tag],
  templateUrl: './app-badge.html',
  styleUrl: './app-badge.css',
})
export class AppBadge {
  readonly tone = input<'success' | 'warning' | 'danger' | 'info' | 'neutral'>('neutral');
  readonly icon = input<string | null>(null);

  /** Maps app tone names to PrimeNG tag severities. */
  protected readonly severity = computed(() => {
    const toneToSeverity = {
      success: 'success',
      warning: 'warn',
      danger: 'danger',
      info: 'info',
      neutral: 'secondary',
    } as const;

    return toneToSeverity[this.tone()];
  });
}
