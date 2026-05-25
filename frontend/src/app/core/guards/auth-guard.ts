import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

/**
 * Route guard that allows access only to authenticated users.
 *
 * <p>If the user is not authenticated (no valid JWT token), the guard
 * redirects to {@code /auth/login} and returns {@code false}.</p>
 *
 * <p>Used as the base guard for customer and admin routes, combined with
 * role-specific guards via {@code canActivate: [authGuard, customerGuard]}
 * or {@code canActivate: [authGuard, adminGuard]}.</p>
 *
 * @returns true when a valid auth state exists, false and redirects otherwise
 */
export const authGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

/**
 * Route guard that allows access only to staff users (ADMIN, MANAGER, EMPLOYEE).
 *
 * @returns true when the user is authenticated and has a staff role
 */
export const adminGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const role = authService.getUserRole();

  if (role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE') {
    return true;
  }

  // Non-staff user -- redirect to the store
  return router.createUrlTree(['/store']);
};

/**
 * Route guard that allows access only to CUSTOMER users.
 *
 * @returns true when the user is authenticated and has the CUSTOMER role
 */
export const customerGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  if (authService.getUserRole() === 'CUSTOMER') {
    return true;
  }

  // Non-customer user -- redirect to admin
  return router.createUrlTree(['/admin']);
};
