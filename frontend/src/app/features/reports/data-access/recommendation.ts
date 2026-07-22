import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  RecommendationDto,
  RecommendationType,
  RecommendationUrgency,
} from '@features/reports/domain/recommendation';

/**
 * HTTP client for the recommendations endpoint (S4-US06).
 *
 * <p>The service exposes one method per common use case (mini panel on the
 * dashboard, full page with all filters) so the FE never has to assemble
 * {@link HttpParams} by hand.</p>
 */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly http = inject(HttpClient);
  private readonly recommendationsUrl = '/api/admin/recommendations';

  /**
   * Fetches recommendations with full control over the filters. Pass
   * {@code null} for any argument to skip that filter.
   */
  getRecommendations(
    branchId?: number | null,
    minUrgency?: RecommendationUrgency | null,
    type?: RecommendationType | null,
    productId?: number | null,
    limit?: number | null,
  ): Observable<RecommendationDto[]> {
    let params = new HttpParams();
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }
    if (minUrgency) {
      params = params.set('minUrgency', minUrgency);
    }
    if (type) {
      params = params.set('type', type);
    }
    if (productId != null) {
      params = params.set('productId', String(productId));
    }
    if (limit != null) {
      params = params.set('limit', String(limit));
    }
    return this.http.get<RecommendationDto[]>(this.recommendationsUrl, { params });
  }

  /**
   * Convenience: top 5 recommendations for the dashboard mini panel.
   * Keeps the same urgency ranking (HIGH first) and uses the current user's
   * branch scope on the server side.
   */
  getDashboardPanel(branchId?: number | null): Observable<RecommendationDto[]> {
    return this.getRecommendations(branchId, null, null, null, 5);
  }
}
