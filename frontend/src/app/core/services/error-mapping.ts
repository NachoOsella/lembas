import { Injectable } from '@angular/core';

/**
 * Field-level validation error returned inside ApiError.details.fieldErrors.
 */
export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Standard API error response from the backend.
 */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: {
    fieldErrors?: ApiFieldError[];
  };
  timestamp: string;
  path: string;
}

/**
 * Centralized service for mapping backend error codes to user-friendly Spanish messages.
 *
 * This service provides consistent error messages across the application by mapping
 * machine-readable error codes (e.g., EMAIL_DUPLICATED) to human-readable Spanish text.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorMappingService {
  /**
   * Maps backend error codes to Spanish user-friendly messages.
   *
   * Common error codes from the backend:
   * - INVALID_CREDENTIALS: Login failed due to wrong email/password
   * - ACCOUNT_DISABLED: User account is disabled
   * - EMAIL_DUPLICATED: Email already exists in the system
   * - VALIDATION_ERROR: Request validation failed (has fieldErrors)
   * - INVALID_USER_BRANCH: User-branch assignment policy violation
   * - DATA_INTEGRITY_VIOLATION: Database constraint violation
   * - ACCESS_DENIED: Insufficient permissions
   * - UNAUTHORIZED: Authentication required
   * - INTERNAL_ERROR: Unexpected server error
   * - INSUFFICIENT_STOCK: Not enough stock for the requested operation
   * - ORDER_INVALID_STATE: Order state transition not allowed
   * - NOT_FOUND: Resource not found
   */
  private readonly errorMessages: Record<string, string> = {
    // Auth errors
    INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
    ACCOUNT_DISABLED: 'La cuenta se encuentra deshabilitada.',
    UNAUTHORIZED: 'Debe iniciar sesión para continuar.',

    // User management errors
    EMAIL_DUPLICATED: 'Ya existe una cuenta con este email.',
    INVALID_USER_BRANCH: 'No se puede asignar esta sucursal al usuario.',

    // Validation errors
    VALIDATION_ERROR: 'Revise los datos ingresados.',

    // Database errors
    DATA_INTEGRITY_VIOLATION: 'Los datos ingresados conflictan con información existente.',

    // Authorization errors
    ACCESS_DENIED: 'No tiene permisos para realizar esta acción.',

    // Stock errors
    INSUFFICIENT_STOCK: 'No hay stock suficiente para completar la operación.',

    // Order errors
    ORDER_INVALID_STATE: 'No se puede realizar esta operación en el estado actual del pedido.',

    // Generic errors
    NOT_FOUND: 'El recurso solicitado no fue encontrado.',
    INTERNAL_ERROR: 'Ocurrió un error inesperado. Intente nuevamente más tarde.',
  };

  /**
   * Returns a user-friendly Spanish message for the given error code.
   *
   * @param errorCode - The machine-readable error code from the backend (e.g., EMAIL_DUPLICATED)
   * @param fallback - Optional fallback message if the code is not recognized
   * @returns A human-readable Spanish error message
   */
  getMessage(errorCode: string, fallback?: string): string {
    return this.errorMessages[errorCode] ?? fallback ?? 'Ocurrió un error inesperado.';
  }

  /**
   * Formats validation errors with field-level details.
   *
   * @param apiError - The API error response containing fieldErrors
   * @returns A formatted message listing all field errors
   */
  formatValidationErrors(apiError: ApiError): string {
    const fieldErrors = apiError.details?.fieldErrors ?? [];

    if (fieldErrors.length === 0) {
      return this.getMessage('VALIDATION_ERROR');
    }

    const details = fieldErrors.map((err) => `${err.field}: ${err.message}`).join(', ');
    return `Error de validación: ${details}`;
  }

}
