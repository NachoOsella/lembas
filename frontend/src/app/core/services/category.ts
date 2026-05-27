import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CategoryDto, CategoryRequest, StoreCategory } from '../../shared/models/category';

/** Provides admin CRUD and public read operations for product categories. */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = '/api/admin/categories';
  private readonly storeUrl = '/api/store/categories';

  /** Returns all admin categories ordered by name. */
  listAdminCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(this.adminUrl);
  }

  /** Creates a root or child category. */
  createCategory(request: CategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.adminUrl, request);
  }

  /** Updates an existing category. */
  updateCategory(id: number, request: CategoryRequest): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.adminUrl}/${id}`, request);
  }

  /** Deletes a category by id. */
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }

  /** Returns public store categories with product counts. */
  listStoreCategories(): Observable<StoreCategory[]> {
    return this.http.get<StoreCategory[]>(this.storeUrl);
  }
}
