import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CashSessionDto, OpenCashSessionRequest } from '../../shared/models/cash-session';

/** Provides admin operations for cash register sessions (S3-US06). */
@Injectable({ providedIn: 'root' })
export class CashService {
  private readonly http = inject(HttpClient);
  private readonly cashSessionsUrl = '/api/admin/cash-sessions';

  /** Opens a new cash session for the resolved branch. */
  openSession(request: OpenCashSessionRequest): Observable<CashSessionDto> {
    return this.http.post<CashSessionDto>(`${this.cashSessionsUrl}/open`, request);
  }

  /** Returns the OPEN session for the resolved branch, or 404 CASH_SESSION_NOT_FOUND. */
  currentSession(branchId?: number | null): Observable<CashSessionDto> {
    let params = new HttpParams();
    if (branchId != null) {
      params = params.set('branchId', branchId);
    }
    return this.http.get<CashSessionDto>(`${this.cashSessionsUrl}/current`, { params });
  }

  /** Returns a single cash session by id (cash detail screen). */
  getById(id: number): Observable<CashSessionDto> {
    return this.http.get<CashSessionDto>(`${this.cashSessionsUrl}/${id}`);
  }
}
