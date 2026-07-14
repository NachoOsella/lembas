import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CashOverviewDto,
  CashReportDto,
  CashSessionHistoryDto,
  CashSessionSummaryDto,
} from '../../shared/models/cash-report';
import { CashSessionStatus } from '../../shared/models/cash-session';

/**
 * HTTP client for the cash report endpoints (S4-US05).
 *
 * <p>List queries go through {@link getCashSessionHistory} which mirrors the
 * backend filter set (date range, opener, closer, status, pagination,
 * sort). Detail reports come from {@link getCashReport}.</p>
 */
@Injectable({ providedIn: 'root' })
export class CashReportService {
  private readonly http = inject(HttpClient);
  private readonly reportsUrl = '/api/admin/reports';

  /** Fetches the operational cash dashboard for the selected period and branch. */
  getCashOverview(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<CashOverviewDto> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http.get<CashOverviewDto>(`${this.reportsUrl}/cash-overview`, { params });
  }

  /**
   * Fetches the paginated, filtered list of cash sessions.
   *
   * @param branchId  optional branch filter
   * @param from      optional date range start (inclusive)
   * @param to        optional date range end (inclusive)
   * @param openedBy  optional user id of the opener
   * @param closedBy  optional user id of the closer
   * @param status    optional status filter
   * @param page      page number, defaults to 0
   * @param size      page size, defaults to 20
   * @param sort      sort field and direction (e.g. {@code openedAt,desc})
   */
  getCashSessionHistory(
    branchId?: number | null,
    from?: string | null,
    to?: string | null,
    openedBy?: number | null,
    closedBy?: number | null,
    status?: CashSessionStatus | null,
    page = 0,
    size = 20,
    sort = 'openedAt,desc',
  ): Observable<CashSessionHistoryDto> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', sort);
    if (branchId != null) params = params.set('branchId', String(branchId));
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (openedBy != null) params = params.set('openedBy', String(openedBy));
    if (closedBy != null) params = params.set('closedBy', String(closedBy));
    if (status) params = params.set('status', status);
    return this.http.get<CashSessionHistoryDto>(`${this.reportsUrl}/cash-sessions`, { params });
  }

  /** Fetches the full close-of-cash report for a single session. */
  getCashReport(sessionId: number): Observable<CashReportDto> {
    return this.http.get<CashReportDto>(`${this.reportsUrl}/cash-session/${sessionId}`);
  }
}

/** Re-export so consumers can keep the import path stable. */
export type { CashSessionSummaryDto };
