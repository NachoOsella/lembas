/** System roles matching the backend {@code Role} enum. */
export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';

/** Internal roles allowed for admin user management (excludes CUSTOMER). */
export type InternalRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

/**
 * User response DTO matching the backend {@code UserResponse} record.
 */
export interface UserResponse {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: Role;
  branchId: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating an internal user via POST /api/admin/users.
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: InternalRole;
  branchId?: number | null;
}

/**
 * Request payload for updating a user via PUT /api/admin/users/{id}.
 * All fields are optional.
 */
export interface UpdateUserRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: InternalRole;
  branchId?: number | null;
}

/**
 * Request payload for enabling/disabling a user via PATCH /api/admin/users/{id}/status.
 */
export interface UserStatusRequest {
  enabled: boolean;
}

/**
 * Branch DTO returned from GET /api/admin/branches.
 */
export interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  active?: boolean;
}

/**
 * Standard Spring Data paginated response.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
