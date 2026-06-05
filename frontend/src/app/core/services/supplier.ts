import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  SupplierDto,
  SupplierPage,
  SupplierProductCostHistoryPage,
  SupplierProductDto,
  SupplierProductPage,
  SupplierProductRequest,
  SupplierRequest,
} from '../../shared/models/supplier';

/** Filters accepted by the admin supplier endpoint. */
export interface SupplierFilters {
  readonly search?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

/** Filters accepted by the admin supplier-product endpoint. */
export interface SupplierProductFilters extends SupplierFilters {
  readonly productId?: number | null;
  readonly supplierId?: number | null;
}

/** Provides admin operations for suppliers and supplier replacement costs. */
@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly suppliersUrl = '/api/admin/suppliers';
  private readonly supplierProductsUrl = '/api/admin/supplier-products';

  /** Lists suppliers with optional search and pagination. */
  listSuppliers(filters: SupplierFilters = {}): Observable<SupplierPage> {
    let params = this.pageParams(filters, 'name,asc');
    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    return this.http.get<SupplierPage>(this.suppliersUrl, { params });
  }

  /** Creates a supplier. */
  createSupplier(request: SupplierRequest): Observable<SupplierDto> {
    return this.http.post<SupplierDto>(this.suppliersUrl, request);
  }

  /** Updates a supplier. */
  updateSupplier(id: number, request: SupplierRequest): Observable<SupplierDto> {
    return this.http.put<SupplierDto>(`${this.suppliersUrl}/${id}`, request);
  }

  /** Deletes a supplier softly. */
  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.suppliersUrl}/${id}`);
  }

  /** Lists supplier-product associations with optional filters. */
  listSupplierProducts(filters: SupplierProductFilters = {}): Observable<SupplierProductPage> {
    let params = this.pageParams(filters, 'productName,asc');
    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.productId) {
      params = params.set('productId', filters.productId);
    }
    if (filters.supplierId) {
      params = params.set('supplierId', filters.supplierId);
    }
    return this.http.get<SupplierProductPage>(this.supplierProductsUrl, { params });
  }

  /** Creates a supplier-product association. */
  createSupplierProduct(request: SupplierProductRequest): Observable<SupplierProductDto> {
    return this.http.post<SupplierProductDto>(this.supplierProductsUrl, request);
  }

  /** Updates a supplier-product association. */
  updateSupplierProduct(id: number, request: SupplierProductRequest): Observable<SupplierProductDto> {
    return this.http.put<SupplierProductDto>(`${this.supplierProductsUrl}/${id}`, request);
  }

  /** Deletes a supplier-product association softly. */
  deleteSupplierProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.supplierProductsUrl}/${id}`);
  }

  /** Lists replacement cost history for one supplier-product association. */
  listCostHistory(id: number): Observable<SupplierProductCostHistoryPage> {
    return this.http.get<SupplierProductCostHistoryPage>(`${this.supplierProductsUrl}/${id}/cost-history`);
  }

  /** Builds common pagination parameters. */
  private pageParams(filters: SupplierFilters, defaultSort: string): HttpParams {
    return new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? defaultSort);
  }
}
