import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyArPipe } from '../../../core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '../../../core/pipes/short-date-ar.pipe';
import { AppBadge } from '../app-badge/app-badge';
import { AppButton } from '../app-button/app-button';
import { Skeleton } from '../skeleton/skeleton';
import {
  RecommendationDto,
  RecommendationUrgency,
} from '../../models/recommendation';

const URGENCY_TONE: Record<RecommendationUrgency, 'danger' | 'warning' | 'info'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

const URGENCY_LABEL: Record<RecommendationUrgency, string> = {
  HIGH: 'Urgencia alta',
  MEDIUM: 'Urgencia media',
  LOW: 'Urgencia baja',
};

/**
 * Single recommendation card. Surfaces the rule's icon, title, description,
 * urgency badge, and the contextual data (stock level, expiration date,
 * rotation, days without sales). The action button is a RouterLink to the
 * detail page (e.g. product lots screen).
 */
@Component({
  selector: 'app-recommendation-card',
  imports: [AppBadge, AppButton, CurrencyArPipe, ShortDateArPipe, Skeleton],
  templateUrl: './recommendation-card.html',
  styleUrl: './recommendation-card.css',
})
export class RecommendationCard {
  readonly recommendation = input.required<RecommendationDto>();
  readonly loading = input(false);

  private readonly router = inject(Router);

  public readonly tone = computed(() => URGENCY_TONE[this.recommendation().urgency] ?? 'info');
  public readonly urgencyLabel = computed(() => URGENCY_LABEL[this.recommendation().urgency] ?? '');

  /** Resolves the action click — the backend provides a full in-app route. */
  protected activate(event: MouseEvent): void {
    const link = this.recommendation()?.link;
    if (!link) {
      return;
    }
    if (/^https?:\/\//.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    event.preventDefault();
    void this.router.navigateByUrl(link);
  }
}
