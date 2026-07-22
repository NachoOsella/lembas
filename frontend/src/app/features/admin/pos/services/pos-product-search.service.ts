import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

/** Compact product row returned by the POS search endpoint. */
export interface PosProductSearchItem {
  readonly id: number;
  readonly name: string;
  readonly brandName: string | null;
  readonly barcode: string | null;
  readonly salePrice: number;
  /** Available stock at the resolved branch; null if the branch is unknown. */
  readonly availableStock: number | null;
  readonly imageUrl: string | null;
}

/**
 * HTTP service for the POS product search endpoint.
 *
 * <p>Calls the authenticated {@code GET /api/pos/products/search?q=&branchId=}
 * endpoint. The branch id is optional: when omitted, the backend reports
 * {@code availableStock} as null on every row, which the UI renders as
 * "stock: —".</p>
 */
@Injectable()
export class PosProductSearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/pos/products/search';

  /**
   * Runs a product search.
   *
   * @param query    the raw user input (will be trimmed; empty yields an empty stream)
   * @param branchId optional branch id used to resolve the available stock
   * @returns a cold observable emitting the matching products
   */
  search(query: string, branchId: number | null): Observable<PosProductSearchItem[]> {
    const trimmed = (query ?? '').trim();
    if (!trimmed) {
      return of([]);
    }

    let params = new HttpParams().set('q', trimmed);
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }

    return this.http.get<PosProductSearchItem[]>(this.apiUrl, { params });
  }
}
