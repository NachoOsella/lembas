import { TestBed } from '@angular/core/testing';

import { ErrorMappingService } from './error-mapping';
import { ApiErrorResponse } from '../../shared/models/api-error';

describe('ErrorMappingService', () => {
  let service: ErrorMappingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorMappingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMessage', () => {
    // Authentication errors
    it('should return Spanish message for INVALID_CREDENTIALS', () => {
      expect(service.getMessage('INVALID_CREDENTIALS')).toBe('Email o contraseña incorrectos.');
    });

    it('should return Spanish message for ACCOUNT_DISABLED', () => {
      expect(service.getMessage('ACCOUNT_DISABLED')).toBe('La cuenta se encuentra deshabilitada.');
    });

    it('should return Spanish message for INVALID_USER_BRANCH', () => {
      expect(service.getMessage('INVALID_USER_BRANCH')).toBe(
        'Los usuarios Gerente y Empleado deben tener una sucursal asignada.',
      );
    });

    // User errors
    it('should return Spanish message for EMAIL_DUPLICATED', () => {
      expect(service.getMessage('EMAIL_DUPLICATED')).toBe('Ya existe un usuario con este email.');
    });

    // Category errors
    it('should return Spanish message for NAME_REQUIRED', () => {
      expect(service.getMessage('NAME_REQUIRED')).toBe('El nombre es obligatorio.');
    });

    it('should return Spanish message for PARENT_NOT_FOUND', () => {
      expect(service.getMessage('PARENT_NOT_FOUND')).toBe('La categoría padre ya no existe.');
    });

    it('should return Spanish message for PARENT_INVALID', () => {
      expect(service.getMessage('PARENT_INVALID')).toBe(
        'Una categoría no puede ser padre de sí misma.',
      );
    });

    it('should return Spanish message for CATEGORY_NAME_DUPLICATED', () => {
      expect(service.getMessage('CATEGORY_NAME_DUPLICATED')).toBe(
        'Ya existe una categoría con ese nombre en el mismo nivel.',
      );
    });

    it('should return Spanish message for CATEGORY_NOT_FOUND', () => {
      expect(service.getMessage('CATEGORY_NOT_FOUND')).toBe(
        'La categoría seleccionada ya no existe.',
      );
    });

    it('should return Spanish message for CATEGORY_HAS_CHILDREN', () => {
      expect(service.getMessage('CATEGORY_HAS_CHILDREN')).toBe(
        'No se puede eliminar una categoria que tiene subcategorias. Elimina primero las subcategorias.',
      );
    });

    it('should return Spanish message for CATEGORY_HAS_PRODUCTS', () => {
      expect(service.getMessage('CATEGORY_HAS_PRODUCTS')).toBe(
        'No se puede eliminar una categoria que tiene productos asociados. Reasigna los productos a otra categoria primero.',
      );
    });

    // Product errors
    it('should return Spanish message for PRODUCT_BARCODE_DUPLICATED', () => {
      expect(service.getMessage('PRODUCT_BARCODE_DUPLICATED')).toBe(
        'Ya existe un producto con ese código de barras.',
      );
    });

    it('should return Spanish message for PRODUCT_NOT_FOUND', () => {
      expect(service.getMessage('PRODUCT_NOT_FOUND')).toBe(
        'El producto solicitado no fue encontrado.',
      );
    });

    it('should return Spanish message for PRODUCT_HAS_ORDERS', () => {
      expect(service.getMessage('PRODUCT_HAS_ORDERS')).toBe(
        'No se puede eliminar un producto que tiene pedidos asociados.',
      );
    });

    it('should return Spanish message for PRODUCT_STATUS_INVALID_TRANSITION', () => {
      expect(service.getMessage('PRODUCT_STATUS_INVALID_TRANSITION')).toBe(
        'El producto ya no permite ese cambio de estado. Actualiza la tabla e intenta nuevamente.',
      );
    });

    // Generic errors
    it('should return Spanish message for VALIDATION_ERROR', () => {
      expect(service.getMessage('VALIDATION_ERROR')).toBe('Revise los datos ingresados.');
    });

    it('should return Spanish message for ACCESS_DENIED', () => {
      expect(service.getMessage('ACCESS_DENIED')).toBe(
        'No tiene permisos para realizar esta acción.',
      );
    });

    it('should return Spanish message for INSUFFICIENT_STOCK', () => {
      expect(service.getMessage('INSUFFICIENT_STOCK')).toBe(
        'No hay stock suficiente para completar la operación.',
      );
    });

    it('should return Spanish message for INTERNAL_ERROR', () => {
      expect(service.getMessage('INTERNAL_ERROR')).toBe(
        'Ocurrió un error inesperado. Intente nuevamente más tarde.',
      );
    });

    // Fallback behavior
    it('should return fallback message for unknown error code', () => {
      expect(service.getMessage('UNKNOWN_ERROR', 'Mensaje personalizado')).toBe(
        'Mensaje personalizado',
      );
    });

    it('should return default message when no fallback is provided for unknown code', () => {
      expect(service.getMessage('UNKNOWN_ERROR')).toBe('Ocurrió un error inesperado.');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format field errors into a readable message', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [
            { field: 'email', message: 'must be well-formed' },
            { field: 'password', message: 'size must be between 8 and 128' },
          ],
        },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const result = service.formatValidationErrors(apiError);

      expect(result).toContain('email: must be well-formed');
      expect(result).toContain('password: size must be between 8 and 128');
      expect(result).toContain('Revise los datos ingresados.');
    });

    it('should return default validation message when no field errors exist', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {},
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const result = service.formatValidationErrors(apiError);

      expect(result).toBe('Revise los datos ingresados.');
    });

    it('should handle missing details object', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const result = service.formatValidationErrors(apiError);

      expect(result).toBe('Revise los datos ingresados.');
    });

    it('should use fieldTranslator when provided', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [
            { field: 'firstName', message: 'is required' },
            { field: 'email', message: 'must be valid' },
          ],
        },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const translator = (field: string) => {
        const labels: Record<string, string> = {
          firstName: 'Nombre',
          email: 'Email',
        };
        return labels[field] ?? field;
      };

      const result = service.formatValidationErrors(apiError, translator);

      expect(result).toContain('Nombre: is required');
      expect(result).toContain('Email: must be valid');
    });

    it('should use custom prefix when provided', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [{ field: 'email', message: 'is invalid' }],
        },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const result = service.formatValidationErrors(
        apiError,
        undefined,
        'Verifica los datos ingresados.',
      );

      expect(result).toContain('Verifica los datos ingresados.');
      expect(result).toContain('email: is invalid');
    });

    it('should use both fieldTranslator and custom prefix', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [{ field: 'password', message: 'too short' }],
        },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const translator = (field: string) => (field === 'password' ? 'Contraseña' : field);
      const result = service.formatValidationErrors(apiError, translator, 'Revisa los campos.');

      expect(result).toContain('Revisa los campos.');
      expect(result).toContain('Contraseña: too short');
    });

    it('should return prefix when no field errors and prefix is provided', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { fieldErrors: [] },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const result = service.formatValidationErrors(apiError, undefined, 'Verifica los datos.');

      expect(result).toBe('Verifica los datos.');
    });

    it('should use messageTranslator when provided', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [
            { field: 'email', message: 'must be well-formed' },
            { field: 'password', message: 'size must be between 8 and 128' },
          ],
        },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const messageTranslator = (message: string) => {
        const translations: Record<string, string> = {
          'must be well-formed': 'debe tener un formato valido',
          'size must be between 8 and 128': 'debe tener entre 8 y 128 caracteres',
        };
        return translations[message] ?? message;
      };

      const result = service.formatValidationErrors(
        apiError,
        undefined,
        undefined,
        messageTranslator,
      );

      expect(result).toContain('email: debe tener un formato valido');
      expect(result).toContain('password: debe tener entre 8 y 128 caracteres');
    });

    it('should use all parameters together', () => {
      const apiError: ApiErrorResponse = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [
            { field: 'firstName', message: 'is required' },
            { field: 'email', message: 'must be valid' },
          ],
        },
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const fieldTranslator = (field: string) => {
        const labels: Record<string, string> = {
          firstName: 'Nombre',
          email: 'Email',
        };
        return labels[field] ?? field;
      };

      const messageTranslator = (message: string) => {
        const translations: Record<string, string> = {
          'is required': 'es obligatorio',
          'must be valid': 'debe ser valido',
        };
        return translations[message] ?? message;
      };

      const result = service.formatValidationErrors(
        apiError,
        fieldTranslator,
        'Por favor revisa:',
        messageTranslator,
      );

      expect(result).toContain('Por favor revisa:');
      expect(result).toContain('Nombre: es obligatorio');
      expect(result).toContain('Email: debe ser valido');
    });
  });
});
