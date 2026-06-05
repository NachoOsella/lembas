import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateStockLotRequest, StockLotDto, StockLotPage } from '../../shared/models/inventory';

/** Filters accepted by the admin stock lot endpoint. */
export interface StockLotFilters {
  readonly productId?: number | null;
  readonly branchId?: number | null;
  readonly expiringSoon?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Provides admin inventory operations for stock lot entries and queries. */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly stockLotsUrl = '/api/admin/stock/lots';

  /** Returns a paginated list of stock lots matching the provided filters. */
  listLots(filters: StockLotFilters = {}): Observable<StockLotPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'expirationDate,asc');

    if (filters.productId) {
      params = params.set('productId', filters.productId);
    }
    if (filters.branchId) {
      params = params.set('branchId', filters.branchId);
    }
    if (filters.expiringSoon) {
      params = params.set('expiringSoon', true);
    }

    return this.http.get<StockLotPage>(this.stockLotsUrl, { params });
  }

  /** Registers a new stock lot and returns the resulting product-branch stock total. */
  createStockLot(request: CreateStockLotRequest): Observable<StockLotDto> {
    return this.http.post<StockLotDto>(this.stockLotsUrl, request);
  }
}
