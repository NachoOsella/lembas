import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { OrderDetail, OrderSummary } from '@features/orders/domain/order';

/** Request line used to create an online order from the local cart. */
export interface CreateOnlineOrderItemRequest {
  readonly productId: number;
  readonly quantity: number;
}

/** Request sent to POST /api/customer/orders. */
export interface CreateOnlineOrderRequest {
  readonly branchId: number;
  readonly items: CreateOnlineOrderItemRequest[];
  readonly notes?: string;
}

/** Minimal response returned after the backend creates a pending-payment order. */
export interface OrderCreated {
  readonly id: number;
  readonly orderNumber: string;
  readonly status: 'PENDING_PAYMENT';
  readonly total: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerOrderService {
  private readonly http = inject(HttpClient);
  private readonly ordersUrl = '/api/customer/orders';

  /** Creates an online order without clearing the local cart. */
  createOrder(request: CreateOnlineOrderRequest): Observable<OrderCreated> {
    return this.http.post<OrderCreated>(this.ordersUrl, request);
  }

  /** Returns the authenticated customer's own orders, newest first. */
  getOrders(): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>(this.ordersUrl);
  }

  /** Returns full detail for one customer-owned order. */
  getOrder(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.ordersUrl}/${id}`);
  }
}
