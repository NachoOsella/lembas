import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Category, ProductSummary } from '../../shared/models/product';

/**
 * Public store catalog service.
 *
 * <p>Provides read-only access to the public store endpoints:
 * category listing and product browsing with search, category, and pagination.</p>
 *
 * <p>All methods call publicly accessible endpoints (no authentication required).</p>
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly categoriesUrl = '/api/store/categories';
  private readonly productsUrl = '/api/store/products';
  private readonly featuredUrl = '/api/store/products/featured';

  /**
   * Returns all categories for the store navigation, ordered alphabetically.
   *
   * @returns an observable emitting the category list
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.categoriesUrl);
  }

  /**
   * Returns a paginated list of published products, optionally filtered.
   *
   * @param query     optional full-text search query
   * @param categoryId optional category filter
   * @param branchId   optional branch filter (for stock availability)
   * @param page       zero-based page index
   * @param size       page size
   * @returns an observable emitting the paginated response
   */
  getProducts(
    query?: string,
    categoryId?: number,
    branchId?: number,
    page = 0,
    size = 20,
  ): Observable<{
    content: ProductSummary[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> {
    let params = new HttpParams().set('page', page).set('size', size);
    const normalizedQuery = query?.trim();
    if (normalizedQuery) {
      params = params.set('q', normalizedQuery);
    }
    if (categoryId != null) {
      params = params.set('categoryId', categoryId);
    }
    if (branchId != null) {
      params = params.set('branchId', branchId);
    }
    return this.http.get<{
      content: ProductSummary[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
      empty: boolean;
    }>(this.productsUrl, { params });
  }

  /**
   * Returns 15 random published products for the home page featured section.
   *
   * TODO: Replace random selection with metric-based ranking (views, sales, recency)
   *       once analytics events are captured.
   *
   * @returns an observable emitting the paginated response
   */
  getFeaturedProducts(): Observable<{
    content: ProductSummary[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> {
    return this.http.get<{
      content: ProductSummary[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
      empty: boolean;
    }>(this.featuredUrl);
  }

  /**
   * Returns a single product detail by ID.
   *
   * @param id       the product ID
   * @param branchId optional branch ID for stock availability
   * @returns an observable emitting the product detail
   */
  getProductDetail(id: number, branchId?: number): Observable<ProductSummary> {
    let params = new HttpParams();
    if (branchId != null) {
      params = params.set('branchId', branchId);
    }
    return this.http.get<ProductSummary>(`${this.productsUrl}/${id}`, { params });
  }
}
