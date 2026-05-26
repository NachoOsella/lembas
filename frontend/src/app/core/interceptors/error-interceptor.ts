import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/** API paths whose errors are handled directly by their owning forms. */
const FORM_OWNED_AUTH_PATHS = ['/api/auth/login', '/api/auth/register'];

/** Returns true when a request error should be translated by the page/component. */
function isFormOwnedRequest(url: string): boolean {
  return FORM_OWNED_AUTH_PATHS.some((path) => url.startsWith(path));
}

/**
 * Global HTTP error interceptor for cross-cutting infrastructure errors only.
 *
 * Form validation, conflicts, not-found states, and login/register failures are
 * propagated without a toast so the owning component can show contextual UI.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const handledByComponent = isFormOwnedRequest(req.url);

      switch (error.status) {
        case 0:
          // Network errors are global because no component can recover with field-level feedback.
          messageService.add({
            severity: 'error',
            summary: 'Error de conexion',
            detail: 'No se pudo conectar con el servidor. Verifique su conexion a internet.',
            life: 5000,
          });
          break;

        case 401:
          // Login/register 401 responses are business feedback, not expired-session events.
          if (!handledByComponent) {
            messageService.add({
              severity: 'warn',
              summary: 'Sesion expirada',
              detail: 'Su sesion ha expirado. Por favor, inicie sesion nuevamente.',
              life: 5000,
            });
            localStorage.removeItem('lembas_access_token');
            localStorage.removeItem('lembas_refresh_token');
            localStorage.removeItem('lembas_user_first_name');
            router.navigate(['/auth/login']);
          }
          break;

        case 403:
          // Authorization failures are global because they are independent of form validation.
          messageService.add({
            severity: 'error',
            summary: 'Acceso denegado',
            detail: 'No tiene permisos para realizar esta accion.',
            life: 5000,
          });
          break;

        default:
          // Only unexpected server failures are global. 4xx business errors stay local.
          if (error.status >= 500) {
            messageService.add({
              severity: 'error',
              summary: 'Error del servidor',
              detail: 'Ocurrio un error inesperado. Por favor, intente nuevamente mas tarde.',
              life: 5000,
            });
          }
          break;
      }

      return throwError(() => error);
    }),
  );
};
