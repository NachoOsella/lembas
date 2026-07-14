import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';

import { DashboardStatCardDto } from '../../models/dashboard';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Maps the backend's semantic color style to a CSS class name. Each tone
 * reuses the existing Lembas palette tokens to stay consistent with the
 * {@code app-stat-card} hero strip used by the cash module.
 */
const TONE_CLASS: Record<DashboardStatCardDto['colorStyle'], string> = {
  SUCCESS: 'stat-card--success',
  WARNING: 'stat-card--warning',
  DANGER: 'stat-card--danger',
  INFO: 'stat-card--info',
  NEUTRAL: 'stat-card--neutral',
};

const TREND_ICON: Record<'UP' | 'DOWN' | 'FLAT', string> = {
  UP: 'pi pi-arrow-up',
  DOWN: 'pi pi-arrow-down',
  FLAT: 'pi pi-minus',
};

/**
 * Reusable stat card for the operational dashboard (S4-US04).
 *
 * <p>Follows the DESING.md stat-card spec: metric color, wash, leaf-green
 * accent on hover, 12px radius, whisper-soft shadow. Clicking the card
 * (when {@code link} is set) navigates via Angular Router without a full
 * page reload.</p>
 */
@Component({
  selector: 'app-dashboard-stat-card',
  imports: [NgClass, Skeleton],
  templateUrl: './dashboard-stat-card.html',
  styleUrl: './dashboard-stat-card.css',
})
export class DashboardStatCard {
  readonly card = input.required<DashboardStatCardDto>();
  readonly loading = input(false);

  public readonly toneClass = computed(
    () => TONE_CLASS[this.card().colorStyle] ?? 'stat-card--neutral',
  );
  public readonly trendIcon = computed(() => TREND_ICON[this.card().trend ?? 'FLAT']);

  /**
   * Indicates whether the card is clickable. Driven by the presence of a
   * non-null {@code link}.
   */
  public readonly clickable = computed(() => !!this.card().link);

  public readonly trendValue = computed(() => {
    const value = this.card().trendPercentage;
    if (value == null) {
      return '';
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  });

  private readonly router = inject(Router);

  /**
   * Navigates to the configured link. Centralised here so the template does
   * not have to know about the Router service.
   */
  protected onActivate(event: MouseEvent): void {
    if (!this.clickable()) {
      return;
    }
    const link = this.card().link;
    if (!link) {
      return;
    }
    // External absolute URLs (start with http) are opened in a new tab; in-app
    // paths are routed through the Angular router so the SPA state survives.
    if (/^https?:\/\//.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    event.preventDefault();
    void this.router.navigateByUrl(link);
  }
}
