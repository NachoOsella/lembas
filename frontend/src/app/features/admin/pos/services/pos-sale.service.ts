import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  OrderDetail,
  PaymentMethod,
} from '../../../../shared/models/order';

/** Single line on a POS sale request. */
export interface CreatePosSaleItemRequest {
  readonly productId: number;
  readonly quantity: number;
}

/** Request body for POST /api/pos/sales. */
export interface CreatePosSaleRequest {
  readonly items: CreatePosSaleItemRequest[];
  readonly paymentMethod: PaymentMethod;
  /** Optional, only meaningful for CASH payments. Null for QR/TRANSFER/CARD/OTHER. */
  readonly cashReceived: number | null;
  readonly notes: string | null;
  /**
   * Optional branch id for ADMIN users who need to specify which branch
   * they are selling at. Ignored for MANAGER and EMPLOYEE (the backend
   * derives the branch from the authenticated user).
   */
  readonly branchId?: number | null;
}

/**
 * HTTP service for the POS sale endpoint.
 *
 * <p>Calls the authenticated {@code POST /api/pos/sales} endpoint, which
 * atomically registers the order, manual payment, and FEFO stock
 * deductions.</p>
 */
@Injectable({ providedIn: 'root' })
export class PosSaleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/pos/sales';

  /**
   * Registers a POS sale and returns the persisted order detail.
   *
   * <p>Errors raised by the backend bubble up as {@code HttpErrorResponse}
   * with the standard {@code ApiError} body; the FE surfaces them via
   * {@code ErrorMappingService}.</p>
   */
  createSale(request: CreatePosSaleRequest): Observable<OrderDetail> {
    return this.http.post<OrderDetail>(this.apiUrl, request);
  }
}
