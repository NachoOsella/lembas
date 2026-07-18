import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { DashboardDto } from '@features/dashboard/domain/dashboard';

/**
 * HTTP client for the operational dashboard endpoint (S4-US04).
 *
 * <p>The single {@code getDashboard} method accepts the optional date and
 * branch filters described in the implementation plan; the service leaves
 * query string assembly to {@link HttpParams} so callers do not have to
 * worry about null/empty values.</p>
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashboardUrl = '/api/admin/reports/dashboard';

  /**
   * Fetches the dashboard payload for a given date and optional branch scope.
   *
   * @param date     ISO date (yyyy-MM-dd) for the report; {@code null} uses today
   * @param branchId optional branch filter (ADMIN only); {@code null} = consolidated
   */
  getDashboard(date?: string | null, branchId?: number | null): Observable<DashboardDto> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }
    return this.http.get<DashboardDto>(this.dashboardUrl, { params });
  }
}
