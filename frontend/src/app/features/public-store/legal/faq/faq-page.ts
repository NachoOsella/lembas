import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PanelModule } from 'primeng/panel';

import { LegalContentService } from '../../../../core/services/legal-content';
import { FaqDocument, FaqItem } from '../../../../shared/models/legal-content';
import { AppEyebrow } from '../../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

/**
 * Easing curve mandated by the Lembas design system for expanders/accordions.
 * Mirrors the 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) defined in DESING.md.
 */
const ACCORDION_TRANSITION = '300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';

/**
 * Public FAQ page.
 *
 * <p>Renders the FAQ entries as a vertically stacked accordion using
 * PrimeNG's {@code p-panel} with the design system transition. Each item
 * can be expanded/collapsed independently.</p>
 */
@Component({
  selector: 'app-faq-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelModule, AppEyebrow, ErrorAlert, LoadingSpinner],
  templateUrl: './faq-page.html',
  styleUrl: './faq-page.css',
})
export class FaqPage implements OnInit {
  private readonly legalContent = inject(LegalContentService);

  protected readonly faq = signal<FaqDocument | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  /** Transition options consumed by p-panel.transitionOptions. */
  protected readonly transitionOptions = ACCORDION_TRANSITION;

  /** Track-by value that keeps Angular from recreating the panels on re-render. */
  protected readonly trackById = (_: number, item: FaqItem) => item.id;

  /** Group items by category so the page can show a category eyebrow per group. */
  protected readonly groups = computed<{ category: string; items: FaqItem[] }[]>(() => {
    const doc = this.faq();
    if (!doc) return [];
    const map = new Map<string, FaqItem[]>();
    for (const item of doc.items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  });

  ngOnInit(): void {
    this.load();
  }

  /** Loads the FAQ document from the backend. */
  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.legalContent.getFaq().subscribe({
      next: (doc) => {
        this.faq.set(doc);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Retry handler for the error state. */
  protected retry(): void {
    this.load();
  }
}
