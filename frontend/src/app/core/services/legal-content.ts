import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { FaqDocument, TermsDocument } from '../../shared/models/legal-content';

/**
 * Public store content service.
 *
 * <p>Exposes read-only access to the legal and FAQ content of the public
 * store. All endpoints are publicly accessible, so no authentication is
 * required.</p>
 */
@Injectable({ providedIn: 'root' })
export class LegalContentService {
  private readonly http = inject(HttpClient);
  private readonly termsUrl = '/api/store/terms';
  private readonly faqUrl = '/api/store/faq';

  /**
   * Returns the full terms and conditions document.
   *
   * @returns an observable emitting the terms document
   */
  getTerms(): Observable<TermsDocument> {
    return this.http.get<TermsDocument>(this.termsUrl);
  }

  /**
   * Returns the FAQ document with all entries.
   *
   * @returns an observable emitting the FAQ document
   */
  getFaq(): Observable<FaqDocument> {
    return this.http.get<FaqDocument>(this.faqUrl);
  }
}
