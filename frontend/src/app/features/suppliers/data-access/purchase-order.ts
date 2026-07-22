import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  PurchaseOrderCancelRequest,
  PurchaseOrderDetailDto,
  PurchaseOrderPage,
  PurchaseOrderRequest,
  PurchaseOrderStatus,
} from '@features/suppliers/domain/purchase-order';

/** Filters accepted by the admin purchase order endpoint. */
export interface PurchaseOrderFilters {
  readonly supplierId?: number | null;
  readonly branchId?: number | null;
  readonly status?: PurchaseOrderStatus | null;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Provides admin operations for supplier purchase orders and PDFs. */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/purchase-orders';

  /** Lists purchase orders with optional filters and pagination. */
  list(filters: PurchaseOrderFilters = {}): Observable<PurchaseOrderPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'createdAt,desc');
    if (filters.supplierId) {
      params = params.set('supplierId', filters.supplierId);
    }
    if (filters.branchId) {
      params = params.set('branchId', filters.branchId);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return this.http.get<PurchaseOrderPage>(this.baseUrl, { params });
  }

  /** Loads a purchase order detail by id. */
  get(id: number): Observable<PurchaseOrderDetailDto> {
    return this.http.get<PurchaseOrderDetailDto>(`${this.baseUrl}/${id}`);
  }

  /** Creates a draft purchase order. */
  create(request: PurchaseOrderRequest): Observable<PurchaseOrderDetailDto> {
    return this.http.post<PurchaseOrderDetailDto>(this.baseUrl, request);
  }

  /** Updates a draft purchase order. */
  update(id: number, request: PurchaseOrderRequest): Observable<PurchaseOrderDetailDto> {
    return this.http.put<PurchaseOrderDetailDto>(`${this.baseUrl}/${id}`, request);
  }

  /** Confirms a draft purchase order. */
  confirm(id: number): Observable<PurchaseOrderDetailDto> {
    return this.http.patch<PurchaseOrderDetailDto>(`${this.baseUrl}/${id}/confirm`, {});
  }

  /** Marks a confirmed purchase order as sent manually. */
  send(id: number): Observable<PurchaseOrderDetailDto> {
    return this.http.patch<PurchaseOrderDetailDto>(`${this.baseUrl}/${id}/send`, {});
  }

  /** Cancels a purchase order. */
  cancel(id: number, request: PurchaseOrderCancelRequest): Observable<PurchaseOrderDetailDto> {
    return this.http.patch<PurchaseOrderDetailDto>(`${this.baseUrl}/${id}/cancel`, request);
  }

  /** Downloads the generated purchase order PDF as a Blob. */
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
