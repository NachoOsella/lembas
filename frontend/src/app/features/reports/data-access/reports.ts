import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import type {
  EmployeeReportDto,
  InventoryReportDto,
  SalesReportDto,
  SuppliersReportDto,
} from '@features/reports/domain/reports';

/**
 * HTTP client for the staged report endpoints. These methods are explicitly
 * optional until their corresponding backend deployment is available. Other
 * report services do not use this handler, so their 404 responses remain errors.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/reports';

  getSalesReport(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<SalesReportDto | null> {
    return this.http
      .get<SalesReportDto>(`${this.baseUrl}/sales`, {
        params: this.dateRangeParams(from, to, branchId),
      })
      .pipe(catchError((error: unknown) => this.handleOptionalEndpointError(error)));
  }

  getEmployeeReport(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<EmployeeReportDto | null> {
    return this.http
      .get<EmployeeReportDto>(`${this.baseUrl}/employees`, {
        params: this.dateRangeParams(from, to, branchId),
      })
      .pipe(catchError((error: unknown) => this.handleOptionalEndpointError(error)));
  }

  getInventoryReport(branchId?: number | null): Observable<InventoryReportDto | null> {
    let params = new HttpParams();
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }
    return this.http
      .get<InventoryReportDto>(`${this.baseUrl}/inventory`, { params })
      .pipe(catchError((error: unknown) => this.handleOptionalEndpointError(error)));
  }

  getSuppliersReport(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<SuppliersReportDto | null> {
    return this.http
      .get<SuppliersReportDto>(`${this.baseUrl}/suppliers`, {
        params: this.dateRangeParams(from, to, branchId),
      })
      .pipe(catchError((error: unknown) => this.handleOptionalEndpointError(error)));
  }

  private dateRangeParams(
    from: string | null | undefined,
    to: string | null | undefined,
    branchId: number | null | undefined,
  ): HttpParams {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }
    return params;
  }

  private handleOptionalEndpointError(error: unknown): Observable<null> {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return of(null);
    }
    return throwError(() => error);
  }
}
