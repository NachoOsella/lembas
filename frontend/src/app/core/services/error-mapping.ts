import { Injectable } from '@angular/core';
import { ApiErrorResponse } from '../../shared/models/api-error';

/**
 * Re-export for backward compatibility with existing imports.
 * @deprecated Import directly from 'shared/models/api-error' instead.
 */
export type { ApiErrorResponse, ApiFieldError } from '../../shared/models/api-error';

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
   * - NAME_REQUIRED: Name field is required
   * - PARENT_NOT_FOUND: Parent category does not exist
   * - PARENT_INVALID: Category cannot be parent of itself
   * - CATEGORY_NAME_DUPLICATED: Category name already exists at same level
   * - PRODUCT_BARCODE_DUPLICATED: Product barcode already exists
   * - CATEGORY_NOT_FOUND: Category does not exist
   * - PRODUCT_NOT_FOUND: Product does not exist
   */
  private readonly errorMessages: Record<string, string> = {
    // Auth errors
    INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
    ACCOUNT_DISABLED: 'La cuenta se encuentra deshabilitada.',
    UNAUTHORIZED: 'Debe iniciar sesión para continuar.',

    // User management errors
    EMAIL_DUPLICATED: 'Ya existe un usuario con este email.',
    INVALID_USER_BRANCH: 'Los usuarios Gerente y Empleado deben tener una sucursal asignada.',
    SELF_ROLE_CHANGE_FORBIDDEN: 'No puede cambiar su propio rol.',

    // Validation errors
    VALIDATION_ERROR: 'Revise los datos ingresados.',
    NAME_REQUIRED: 'El nombre es obligatorio.',

    // Category errors
    PARENT_NOT_FOUND: 'La categoría padre ya no existe.',
    PARENT_INVALID: 'Una categoría no puede ser padre de sí misma.',
    CATEGORY_NAME_DUPLICATED: 'Ya existe una categoría con ese nombre en el mismo nivel.',
    CATEGORY_NOT_FOUND: 'La categoría seleccionada ya no existe.',
    CATEGORY_HAS_CHILDREN:
      'No se puede eliminar una categoria que tiene subcategorias. Elimina primero las subcategorias.',
    CATEGORY_HAS_PRODUCTS:
      'No se puede eliminar una categoria que tiene productos asociados. Reasigna los productos a otra categoria primero.',

    // Product errors
    PRODUCT_BARCODE_DUPLICATED: 'Ya existe un producto con ese código de barras.',
    PRODUCT_NOT_FOUND: 'El producto solicitado no fue encontrado.',
    PRODUCT_HAS_ORDERS: 'No se puede eliminar un producto que tiene pedidos asociados.',
    PRODUCT_STATUS_INVALID_TRANSITION:
      'El producto ya no permite ese cambio de estado. Actualiza la tabla e intenta nuevamente.',

    // Inventory errors
    BRANCH_NOT_FOUND: 'La sucursal seleccionada no fue encontrada o esta inactiva.',

    // Supplier errors
    SUPPLIER_NOT_FOUND: 'El proveedor seleccionado no fue encontrado.',
    SUPPLIER_CUIT_DUPLICATED: 'Ya existe un proveedor activo con ese CUIT.',
    SUPPLIER_PRODUCT_NOT_FOUND: 'La asociacion producto-proveedor no fue encontrada.',
    SUPPLIER_PRODUCT_DUPLICATED: 'Ese producto ya esta asociado a este proveedor.',

    // Purchase order errors
    PURCHASE_ORDER_NOT_FOUND: 'La orden de compra solicitada no fue encontrada.',
    PURCHASE_ORDER_INVALID_STATE: 'La orden de compra ya no permite esa operacion.',
    PURCHASE_ORDER_EMPTY: 'La orden de compra debe tener al menos un item.',
    PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID: 'El producto no esta asociado al proveedor seleccionado.',
    PURCHASE_RECEIPT_INVALID_STATE: 'Solo se pueden recepcionar ordenes enviadas o parcialmente recibidas.',
    PURCHASE_RECEIPT_ITEM_INVALID: 'Un item de la recepcion no pertenece a la orden seleccionada.',
    PURCHASE_RECEIPT_ITEM_DUPLICATED: 'Hay items duplicados en la recepcion.',
    PURCHASE_RECEIPT_OVER_RECEIVED: 'La cantidad recibida supera la cantidad pendiente de la orden.',

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
   * @param fieldTranslator - Optional function to translate field names to user-friendly labels
   * @param prefix - Optional custom prefix for the message (defaults to VALIDATION_ERROR message)
   * @param messageTranslator - Optional function to translate backend validation messages to user-friendly text
   * @returns A formatted message listing all field errors
   */
  formatValidationErrors(
    apiError: ApiErrorResponse,
    fieldTranslator?: (field: string) => string,
    prefix?: string,
    messageTranslator?: (message: string) => string,
  ): string {
    const fieldErrors = apiError.details?.fieldErrors ?? [];

    if (fieldErrors.length === 0) {
      return prefix ?? this.getMessage('VALIDATION_ERROR');
    }

    const details = fieldErrors
      .map((err) => {
        const fieldName = fieldTranslator ? fieldTranslator(err.field) : err.field;
        const fieldMessage = messageTranslator ? messageTranslator(err.message) : err.message;
        return `${fieldName}: ${fieldMessage}`;
      })
      .join('. ');

    const messagePrefix = prefix ?? this.getMessage('VALIDATION_ERROR');
    return `${messagePrefix} ${details}`;
  }
}
