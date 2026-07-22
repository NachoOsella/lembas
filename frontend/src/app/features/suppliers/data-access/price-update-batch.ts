import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  PriceUpdateBatchDefaultsRequest,
  PriceUpdateBatchDetailDto,
  PriceUpdateBatchItemUpdateRequest,
  PriceUpdateBatchPage,
  PriceUpdateBatchStatus,
  PriceUpdateManualBatchRequest,
} from '@features/suppliers/domain/price-update-batch';

/** Filters accepted by the admin price update batch list endpoint. */
export interface PriceUpdateBatchFilters {
  readonly supplierId?: number | null;
  readonly status?: PriceUpdateBatchStatus | null;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Provides admin operations for supplier price/catalog update batches. */
@Injectable({ providedIn: 'root' })
export class PriceUpdateBatchService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/price-update-batches';

  /** Lists price update batches with optional filters. */
  list(filters: PriceUpdateBatchFilters = {}): Observable<PriceUpdateBatchPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'createdAt,desc');
    if (filters.supplierId) {
      params = params.set('supplierId', filters.supplierId);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return this.http.get<PriceUpdateBatchPage>(this.url, { params });
  }

  /** Creates a manual-grid batch. */
  createManual(request: PriceUpdateManualBatchRequest): Observable<PriceUpdateBatchDetailDto> {
    return this.http.post<PriceUpdateBatchDetailDto>(`${this.url}/manual`, request);
  }

  /** Imports a CSV/XLSX supplier list. */
  importFile(
    supplierId: number,
    file: File,
    defaults: PriceUpdateBatchDefaultsRequest,
    notes?: string | null,
  ): Observable<PriceUpdateBatchDetailDto> {
    const data = new FormData();
    data.append('supplierId', String(supplierId));
    data.append('file', file);
    this.appendNumber(data, 'newProductMarginPercentage', defaults.newProductMarginPercentage);
    this.appendBoolean(data, 'applyCostUpdatesByDefault', defaults.applyCostUpdatesByDefault);
    this.appendBoolean(
      data,
      'applySalePriceUpdatesByDefault',
      defaults.applySalePriceUpdatesByDefault,
    );
    this.appendBoolean(data, 'excludeUnchangedByDefault', defaults.excludeUnchangedByDefault);
    if (notes?.trim()) {
      data.append('notes', notes.trim());
    }
    return this.http.post<PriceUpdateBatchDetailDto>(`${this.url}/import`, data);
  }

  /** Loads one batch detail. */
  get(id: number): Observable<PriceUpdateBatchDetailDto> {
    return this.http.get<PriceUpdateBatchDetailDto>(`${this.url}/${id}`);
  }

  /** Updates global defaults. */
  updateDefaults(
    id: number,
    request: PriceUpdateBatchDefaultsRequest,
  ): Observable<PriceUpdateBatchDetailDto> {
    return this.http.patch<PriceUpdateBatchDetailDto>(`${this.url}/${id}/defaults`, request);
  }

  /** Applies defaults to all rows. */
  applyDefaultsToAll(id: number): Observable<PriceUpdateBatchDetailDto> {
    return this.http.patch<PriceUpdateBatchDetailDto>(
      `${this.url}/${id}/apply-defaults-to-all`,
      {},
    );
  }

  /** Updates one preview row. */
  updateItem(
    id: number,
    itemId: number,
    request: PriceUpdateBatchItemUpdateRequest,
  ): Observable<PriceUpdateBatchDetailDto> {
    return this.http.patch<PriceUpdateBatchDetailDto>(`${this.url}/${id}/items/${itemId}`, request);
  }

  /** Validates unresolved rows before application. */
  validate(id: number): Observable<PriceUpdateBatchDetailDto> {
    return this.http.patch<PriceUpdateBatchDetailDto>(`${this.url}/${id}/validate`, {});
  }

  /** Applies the batch transactionally. */
  apply(id: number): Observable<PriceUpdateBatchDetailDto> {
    return this.http.patch<PriceUpdateBatchDetailDto>(`${this.url}/${id}/apply`, {});
  }

  /** Cancels a draft or validated batch. */
  cancel(id: number): Observable<PriceUpdateBatchDetailDto> {
    return this.http.patch<PriceUpdateBatchDetailDto>(`${this.url}/${id}/cancel`, {});
  }

  /** Appends an optional numeric form-data field. */
  private appendNumber(data: FormData, key: string, value?: number | null): void {
    if (value !== null && value !== undefined) {
      data.append(key, String(value));
    }
  }

  /** Appends an optional boolean form-data field. */
  private appendBoolean(data: FormData, key: string, value?: boolean | null): void {
    if (value !== null && value !== undefined) {
      data.append(key, String(value));
    }
  }
}
