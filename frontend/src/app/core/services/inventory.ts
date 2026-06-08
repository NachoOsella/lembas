import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateStockLotRequest,
  PurchaseReceiptDto,
  PurchaseReceiptRequest,
  StockAdjustmentRequest,
  StockLotDto,
  StockLotPage,
  StockMovementDto,
  StockMovementPage,
  StockProductSummaryDto,
  StockProductSummaryPage,
} from '../../shared/models/inventory';

/** Filters accepted by the admin stock lot endpoint. */
export interface StockLotFilters {
  readonly search?: string;
  readonly productId?: number | null;
  readonly branchId?: number | null;
  readonly expiringSoon?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Filters accepted by the aggregated product summary endpoint. */
export interface ProductSummaryFilters {
  readonly search?: string;
  readonly branchId?: number | null;
  readonly expiringSoon?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Filters accepted by the stock movements list endpoint. */
export interface MovementFilters {
  readonly type?: string;
  readonly productId?: number | null;
  readonly branchId?: number | null;
  readonly from?: string;
  readonly to?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Provides admin inventory operations for stock lot entries and queries. */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly stockLotsUrl = '/api/admin/stock/lots';
  private readonly stockProductsUrl = '/api/admin/stock/products';
  private readonly stockAdjustmentsUrl = '/api/admin/stock/adjustments';
  private readonly stockMovementsUrl = '/api/admin/stock/movements';
  private readonly purchaseReceiptsUrl = '/api/admin/stock/receipts';

  /** Returns a paginated list of stock lots matching the provided filters. */
  listLots(filters: StockLotFilters = {}): Observable<StockLotPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'expirationDate,asc');

    if (filters.search) {
      params = params.set('search', filters.search);
    }
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

  /** Returns aggregated stock summaries grouped by product and branch. */
  listProductSummaries(filters: ProductSummaryFilters = {}): Observable<StockProductSummaryPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'productName,asc');

    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.branchId) {
      params = params.set('branchId', filters.branchId);
    }
    if (filters.expiringSoon) {
      params = params.set('expiringSoon', true);
    }

    return this.http.get<StockProductSummaryPage>(this.stockProductsUrl, { params });
  }

  /** Confirms a merchandise receipt and returns the generated stock lot summary. */
  createPurchaseReceipt(request: PurchaseReceiptRequest): Observable<PurchaseReceiptDto> {
    return this.http.post<PurchaseReceiptDto>(this.purchaseReceiptsUrl, request);
  }

  /** Sends a manual stock adjustment request. */
  adjustStock(request: StockAdjustmentRequest): Observable<void> {
    return this.http.post<void>(this.stockAdjustmentsUrl, request);
  }

  /** Returns a paginated list of stock movements with optional filters. */
  listMovements(filters: MovementFilters = {}): Observable<StockMovementPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'createdAt,desc');

    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.productId) {
      params = params.set('productId', filters.productId);
    }
    if (filters.branchId) {
      params = params.set('branchId', filters.branchId);
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }

    return this.http.get<StockMovementPage>(this.stockMovementsUrl, { params });
  }
}
