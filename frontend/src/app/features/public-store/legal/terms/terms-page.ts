import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { LegalContentService } from '../../../../core/services/legal-content';
import { TermsDocument } from '../../../../shared/models/legal-content';
import { AppEyebrow } from '../../../../shared/components/app-eyebrow/app-eyebrow';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

/**
 * Public terms and conditions page.
 *
 * <p>Renders the terms document split into sections so customers can read
 * the rules that govern their purchases on the online store.</p>
 */
@Component({
  selector: 'app-terms-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppEyebrow, ErrorAlert, LoadingSpinner],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.css',
})
export class TermsPage implements OnInit {
  private readonly legalContent = inject(LegalContentService);

  protected readonly terms = signal<TermsDocument | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.legalContent.getTerms().subscribe({
      next: (doc) => {
        this.terms.set(doc);
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
    this.loading.set(true);
    this.error.set(false);
    this.legalContent.getTerms().subscribe({
      next: (doc) => {
        this.terms.set(doc);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Formats the last-updated ISO date as DD/MM/YYYY for display. */
  protected formattedLastUpdated(isoDate: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!match) return isoDate;
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
}
