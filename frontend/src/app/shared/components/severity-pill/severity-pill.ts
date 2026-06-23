import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Visual tone used to colour the {@link SeverityPill}.
 *
 * <p>Maps to the documented design-system palette: success uses Lembas
 * Leaf Green on Mint Leaf Wash, warn uses Amber text on Amber Tint, danger
 * uses Red on Red Surface, and neutral falls back to surface-warm.</p>
 */
export type SeverityPillTone = 'success' | 'warn' | 'danger' | 'neutral';

const TONE_CLASSES: Readonly<Record<SeverityPillTone, string>> = {
  success: 'bg-mint-wash text-primary',
  warn: 'bg-amber-tint text-amber-text',
  danger: 'bg-red-tint text-red',
  neutral: 'bg-surface-warm text-text-muted',
} as const;

/**
 * Compact pill badge that maps a semantic tone to the design-system colours.
 *
 * <p>Use this anywhere the codebase previously inlined a ternary expression
 * like
 * {@code [class.bg-mint-wash text-primary] : [class.bg-red-50 text-red] : ...}.
 * The host's content slot is the visible label; the tone input drives only
 * the colour.</p>
 */
@Component({
  selector: 'app-severity-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './severity-pill.html',
  styleUrl: './severity-pill.css',
})
export class SeverityPill {
  /** Visual tone. Defaults to neutral when callers pass a value the
   *  mapper does not know about (e.g. an unmapped enum). */
  readonly tone = input<SeverityPillTone>('neutral');

  /** Pre-computed Tailwind class string for the requested tone. */
  protected readonly classes = computed(() => TONE_CLASSES[this.tone()]);
}
