import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor global que captura errores HTTP y muestra toasts automáticos.
 * Maneja casos especiales según el código de estado HTTP.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Extraer el mensaje del backend si está disponible
      const apiError = error.error as { message?: string; code?: string } | undefined;
      const backendMessage = apiError?.message;

      // Manejar según el código de estado HTTP
      switch (error.status) {
        case 0:
          // Error de red (sin respuesta del servidor)
          messageService.add({
            severity: 'error',
            summary: 'Error de conexión',
            detail: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
            life: 5000,
          });
          break;

        case 401:
          // No autenticado - limpiar sesión y redirigir a login
          messageService.add({
            severity: 'warn',
            summary: 'Sesión expirada',
            detail: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
            life: 5000,
          });
          localStorage.removeItem('lembas_access_token');
          localStorage.removeItem('lembas_refresh_token');
          localStorage.removeItem('lembas_user_first_name');
          router.navigate(['/auth/login']);
          break;

        case 403:
          // Acceso denegado
          messageService.add({
            severity: 'error',
            summary: 'Acceso denegado',
            detail: backendMessage || 'No tiene permisos para realizar esta acción.',
            life: 5000,
          });
          break;

        case 404:
          // Recurso no encontrado
          messageService.add({
            severity: 'error',
            summary: 'No encontrado',
            detail: backendMessage || 'El recurso solicitado no existe.',
            life: 5000,
          });
          break;

        case 409:
          // Conflicto - violación de regla de negocio
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: backendMessage || 'Se produjo un conflicto con la operación.',
            life: 5000,
          });
          break;

        case 422:
        case 400:
          // Error de validación
          const validationDetails = apiError?.code === 'VALIDATION_ERROR' && error.error?.details?.fieldErrors
            ? `Revise los campos del formulario.`
            : (backendMessage || 'Los datos enviados no son válidos.');
          messageService.add({
            severity: 'error',
            summary: 'Error de validación',
            detail: validationDetails,
            life: 5000,
          });
          break;

        case 500:
          // Error interno del servidor
          messageService.add({
            severity: 'error',
            summary: 'Error del servidor',
            detail: 'Ocurrió un error inesperado. Por favor, intente nuevamente más tarde.',
            life: 5000,
          });
          break;

        default:
          // Otros errores
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: backendMessage || 'Ocurrió un error inesperado.',
            life: 5000,
          });
          break;
      }

      // Propagar el error para que los componentes puedan manejarlo si es necesario
      return throwError(() => error);
    })
  );
};
