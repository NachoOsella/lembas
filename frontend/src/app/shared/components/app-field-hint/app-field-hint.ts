import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { Message } from 'primeng/message';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-field-hint',
  imports: [Message],
  templateUrl: './app-field-hint.html',
  styleUrl: './app-field-hint.css',
})
export class AppFieldHint {
  readonly tone = input<'hint' | 'success' | 'error'>('hint');

  /** Maps app tone names to PrimeNG message severities. */
  protected readonly severity = computed(() => {
    const toneToSeverity = {
      hint: 'info',
      success: 'success',
      error: 'error',
    } as const;

    return toneToSeverity[this.tone()];
  });

  /** Selects the matching PrimeIcons icon for the current message tone. */
  protected readonly icon = computed(() => {
    const toneToIcon = {
      hint: 'pi pi-info-circle',
      success: 'pi pi-check-circle',
      error: 'pi pi-exclamation-circle',
    } as const;

    return toneToIcon[this.tone()];
  });
}
