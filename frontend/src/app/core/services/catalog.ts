import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PageResponse } from '../../shared/models/page';
import { Category, ProductSummary } from '../../shared/models/product';
import { StoreBranchSelectionService } from './store-branch-selection';

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
  private readonly branchSelection = inject(StoreBranchSelectionService);
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
   * @param page       zero-based page index
   * @param size       page size
   * @returns an observable emitting the paginated response
   *
   * Includes the selected pickup branch when available so backend stock availability can be branch-scoped.
   */
  getProducts(
    query?: string,
    categoryId?: number,
    page = 0,
    size = 20,
  ): Observable<PageResponse<ProductSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    const normalizedQuery = query?.trim();
    if (normalizedQuery) {
      params = params.set('q', normalizedQuery);
    }
    if (categoryId != null) {
      params = params.set('categoryId', categoryId);
    }
    params = this.withSelectedBranch(params);
    return this.http.get<PageResponse<ProductSummary>>(this.productsUrl, { params });
  }

  /**
   * Returns 15 random published products for the home page featured section.
   *
   * TODO: Replace random selection with metric-based ranking (views, sales, recency)
   *       once analytics events are captured.
   *
   * @returns an observable emitting the paginated response
   */
  getFeaturedProducts(): Observable<PageResponse<ProductSummary>> {
    return this.http.get<PageResponse<ProductSummary>>(this.featuredUrl, {
      params: this.withSelectedBranch(new HttpParams()),
    });
  }

  /**
   * Returns a single product detail by ID.
   *
   * @param id the product ID
   * @returns an observable emitting the product detail
   *
   * Includes the selected pickup branch when available so detail stock can be branch-scoped.
   */
  getProductDetail(id: number): Observable<ProductSummary> {
    return this.http.get<ProductSummary>(`${this.productsUrl}/${id}`, {
      params: this.withSelectedBranch(new HttpParams()),
    });
  }

  /**
   * Returns random published products from the same category, excluding the current product.
   * Used by the product detail page to show related products.
   *
   * @param productId the current product ID (backend resolves category and excludes it)
   * @returns an observable emitting the paginated response
   */
  getRelatedProducts(productId: number): Observable<PageResponse<ProductSummary>> {
    return this.http.get<PageResponse<ProductSummary>>(`${this.productsUrl}/${productId}/related`, {
      params: this.withSelectedBranch(new HttpParams()),
    });
  }

  /** Adds the selected pickup branch id to stock-sensitive store requests. */
  private withSelectedBranch(params: HttpParams): HttpParams {
    const branchId = this.branchSelection.selectedBranchId();
    return branchId == null ? params : params.set('branchId', branchId);
  }
}
