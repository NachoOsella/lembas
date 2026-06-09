import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth';

/** Guard result supported by Angular route guards. */
type GuardResult = boolean | UrlTree;

/** Returns true when the injected auth service can hydrate HttpOnly cookie sessions. */
function canHydrateSession(authService: AuthService): boolean {
  return typeof authService.ensureSession === 'function';
}

/** Hydrates auth state from HttpOnly cookies. */
function ensureSession(authService: AuthService): Observable<boolean> {
  return authService.ensureSession();
}

/** Builds the staff-role decision once auth state is known. */
function staffDecision(authService: AuthService, router: Router): GuardResult {
  const role = authService.getUserRole();
  return role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE'
    ? true
    : router.createUrlTree(['/store']);
}

/** Allows access only to authenticated users. */
export const authGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  if (!canHydrateSession(authService)) {
    return router.createUrlTree(['/auth/login']);
  }

  return ensureSession(authService).pipe(
    map((authenticated) => (authenticated ? true : router.createUrlTree(['/auth/login']))),
  );
};

/** Allows access only to staff users (ADMIN, MANAGER, EMPLOYEE). */
export const adminGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return staffDecision(authService, router);
  }
  if (!canHydrateSession(authService)) {
    return router.createUrlTree(['/auth/login']);
  }

  return ensureSession(authService).pipe(
    map((authenticated) =>
      authenticated ? staffDecision(authService, router) : router.createUrlTree(['/auth/login']),
    ),
  );
};

/** Redirects authenticated users away from login/register pages. */
export const guestGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const redirectAuthenticated = (): UrlTree =>
    authService.getUserRole() === 'CUSTOMER'
      ? router.createUrlTree(['/store'])
      : router.createUrlTree(['/admin']);

  if (authService.isAuthenticated()) {
    return redirectAuthenticated();
  }
  if (!canHydrateSession(authService)) {
    return true;
  }

  return ensureSession(authService).pipe(
    map((authenticated) => (authenticated ? redirectAuthenticated() : true)),
  );
};

/** Allows access only to ADMIN users within the admin area. */
export const adminOnlyGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (): GuardResult =>
    authService.getUserRole() === 'ADMIN' ? true : router.createUrlTree(['/admin/dashboard']);

  if (authService.isAuthenticated()) {
    return decide();
  }
  if (!canHydrateSession(authService)) {
    return router.createUrlTree(['/auth/login']);
  }

  return ensureSession(authService).pipe(
    map((authenticated) => (authenticated ? decide() : router.createUrlTree(['/auth/login']))),
  );
};

/** Allows access only to CUSTOMER users. */
export const customerGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (): GuardResult =>
    authService.getUserRole() === 'CUSTOMER' ? true : router.createUrlTree(['/admin']);

  if (authService.isAuthenticated()) {
    return decide();
  }
  if (!canHydrateSession(authService)) {
    return router.createUrlTree(['/auth/login']);
  }

  return ensureSession(authService).pipe(
    map((authenticated) => (authenticated ? decide() : router.createUrlTree(['/auth/login']))),
  );
};
