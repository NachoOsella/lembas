import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  EmployeeReportDto,
  InventoryReportDto,
  SalesReportDto,
  SuppliersReportDto,
} from '../../shared/models/reports';

/**
 * Shared service for the three new admin report endpoints (Ventas,
 * Inventario, Proveedores). Each method handles the optional date
 * range filters and degrades gracefully on a 404 (returns
 * {@code null}) so the page can render the empty state without
 * the UI crashing. Other errors are re-thrown so the component can
 * show a meaningful error message.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/reports';

  /**
   * Sales report. The {@code from}/{@code to} filters are inclusive
   * ISO {@code yyyy-MM-dd}. Both arguments are optional; an empty
   * call returns the report for "the trailing 30 days" on the backend.
   */
  getSalesReport(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<SalesReportDto | null> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http
      .get<SalesReportDto>(`${this.baseUrl}/sales`, { params })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  /** Employee performance from attributable POS sales and cash activity. */
  getEmployeeReport(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<EmployeeReportDto | null> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http
      .get<EmployeeReportDto>(`${this.baseUrl}/employees`, { params })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  /** Inventory valuation + rotation + expiring lots. */
  getInventoryReport(branchId?: number | null): Observable<InventoryReportDto | null> {
    let params = new HttpParams();
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http
      .get<InventoryReportDto>(`${this.baseUrl}/inventory`, { params })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  /** Suppliers performance over the optional date range. */
  getSuppliersReport(
    from?: string | null,
    to?: string | null,
    branchId?: number | null,
  ): Observable<SuppliersReportDto | null> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http
      .get<SuppliersReportDto>(`${this.baseUrl}/suppliers`, { params })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  /**
   * On 404 (endpoint not implemented) we degrade gracefully and return
   * {@code null} so the page renders the empty state. Any other error
   * is re-thrown so the component subscription can show a proper
   * error message.
   */
  private handleError(err: HttpErrorResponse): Observable<null> {
    if (err.status === 404) {
      return of(null);
    }
    return throwError(() => err);
  }
}
