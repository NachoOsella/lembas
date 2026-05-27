import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Branch,
  CreateUserRequest,
  Page,
  UpdateUserRequest,
  UserMetrics,
  UserResponse,
} from '../../shared/models/user';

/**
 * CRUD service for admin user management and branch listing.
 *
 * <p>All methods require the caller to be authenticated with ADMIN role;
 * the backend enforces this via {@code @PreAuthorize}.</p>
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = '/api/admin/users';
  private readonly branchesUrl = '/api/admin/branches';

  /**
   * Returns a paginated list of internal users, optionally filtered by role or branch.
   */
  listUsers(
    role?: string,
    branchId?: number,
    page = 0,
    size = 20,
    search?: string,
    sort?: string,
  ): Observable<Page<UserResponse>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (role) {
      params = params.set('role', role);
    }
    if (branchId != null) {
      params = params.set('branchId', branchId);
    }
    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      params = params.set('search', normalizedSearch);
    }
    if (sort) {
      params = params.set('sort', sort);
    }
    return this.http.get<Page<UserResponse>>(this.usersUrl, { params });
  }

  /**
   * Creates a new internal user.
   *
   * @param request the creation payload
   * @returns the created user
   */
  createUser(request: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.usersUrl, request);
  }

  /**
   * Updates an existing internal user. Only non-null fields are applied.
   *
   * @param id the user ID
   * @param request the update payload (all fields optional)
   * @returns the updated user
   */
  updateUser(id: number, request: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.usersUrl}/${id}`, request);
  }

  /**
   * Enables or disables a user account.
   *
   * @param id the user ID
   * @param enabled the new enabled state
   * @returns the updated user
   */
  updateUserStatus(id: number, enabled: boolean): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.usersUrl}/${id}/status`, { enabled });
  }

  /**
   * Fetches all active branches for the branch dropdown.
   */
  listBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.branchesUrl);
  }

  /**
   * Returns aggregate metrics for the internal users directory.
   */
  getUserMetrics(): Observable<UserMetrics> {
    return this.http.get<UserMetrics>(`${this.usersUrl}/metrics`);
  }
}
