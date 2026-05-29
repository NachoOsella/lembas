import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '../../shared/models/page';
import { ProductDetail, ProductOnlineStatus, ProductRequest, ProductSummary } from '../../shared/models/product';

/** Filters accepted by the admin product directory endpoint. */
export interface ProductFilters {
  readonly search?: string;
  readonly categoryId?: number | null;
  readonly onlineStatus?: ProductOnlineStatus | null;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Provides admin CRUD operations for catalog products. */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = '/api/admin/products';

  /** Returns a Spring page of products matching the provided filters. */
  listAdminProducts(filters: ProductFilters = {}): Observable<PageResponse<ProductSummary>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'name,asc');

    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }
    if (filters.onlineStatus) {
      params = params.set('onlineStatus', filters.onlineStatus);
    }

    return this.http.get<PageResponse<ProductSummary>>(this.adminUrl, { params });
  }

  /** Returns one product for edit mode. */
  getProduct(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.adminUrl}/${id}`);
  }

  /** Creates a new catalog product. */
  createProduct(request: ProductRequest): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(this.adminUrl, request);
  }

  /** Updates an existing catalog product. */
  updateProduct(id: number, request: ProductRequest): Observable<ProductDetail> {
    return this.http.put<ProductDetail>(`${this.adminUrl}/${id}`, request);
  }

  /** Soft-deletes a product from admin listings. */
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}
