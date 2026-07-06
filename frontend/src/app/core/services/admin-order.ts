import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { OrderDetail, OrderStatus, OrderSummary, OrderType } from '../../shared/models/order';
import { PageResponse } from '../../shared/models/page';

/** Query parameters accepted by the admin orders list endpoint. */
export interface AdminOrdersQuery {
  readonly status?: OrderStatus;
  readonly branchId?: number;
  readonly type?: OrderType;
  readonly from?: string;
  readonly to?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Request body for cancelling an order. Reason is mandatory (1-500 chars). */
export interface CancelOrderRequest {
  readonly reason: string;
}

/**
 * HTTP service for admin-facing order operations.
 *
 * <p>Covers the lifecycle transition endpoints (prepare, ready, deliver)
 * plus the filtered list and detail retrieval. All endpoints require
 * ADMIN, MANAGER, or EMPLOYEE roles, enforced by the backend.</p>
 */
@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/orders';

  /** Returns a paginated, filterable list of orders. */
  listOrders(params: AdminOrdersQuery = {}): Observable<PageResponse<OrderSummary>> {
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.branchId != null) httpParams = httpParams.set('branchId', String(params.branchId));
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<PageResponse<OrderSummary>>(this.baseUrl, { params: httpParams });
  }

  /** Returns full order detail including items, payments, and status timestamps. */
  getOrder(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.baseUrl}/${id}`);
  }

  /** Transitions the order to PREPARING. */
  prepare(id: number): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.baseUrl}/${id}/prepare`, {});
  }

  /** Transitions the order to READY. */
  markReady(id: number): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.baseUrl}/${id}/ready`, {});
  }

  /** Transitions the order to DELIVERED. */
  deliver(id: number): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.baseUrl}/${id}/delivered`, {});
  }

  /**
   * Cancels the order, reversing any deducted stock and marking payments as CANCELLED.
   *
   * <p>Rejects with {@code ORDER_INVALID_STATE} (409) for DELIVERED or already
   * CANCELLED orders, with {@code CANCEL_REASON_REQUIRED} (400) when the reason
   * is blank, and with {@code ORDER_REFUNDED_CONFLICT} (409) when any payment
   * has already been refunded.</p>
   */
  cancel(id: number, body: CancelOrderRequest): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.baseUrl}/${id}/cancel`, body);
  }
}
