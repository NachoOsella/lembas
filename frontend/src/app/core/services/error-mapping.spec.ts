import { TestBed } from '@angular/core/testing';

import { ApiError, ErrorMappingService } from './error-mapping';

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
    it('should return Spanish message for INVALID_CREDENTIALS', () => {
      expect(service.getMessage('INVALID_CREDENTIALS')).toBe(
        'Email o contraseña incorrectos.',
      );
    });

    it('should return Spanish message for ACCOUNT_DISABLED', () => {
      expect(service.getMessage('ACCOUNT_DISABLED')).toBe(
        'La cuenta se encuentra deshabilitada.',
      );
    });

    it('should return Spanish message for EMAIL_DUPLICATED', () => {
      expect(service.getMessage('EMAIL_DUPLICATED')).toBe(
        'Ya existe una cuenta con este email.',
      );
    });

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
      const apiError: ApiError = {
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
      expect(result).toContain('Error de validación:');
    });

    it('should return default validation message when no field errors exist', () => {
      const apiError: ApiError = {
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
      const apiError: ApiError = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        timestamp: '2026-06-01T12:00:00Z',
        path: '/api/auth/register',
      };

      const result = service.formatValidationErrors(apiError);

      expect(result).toBe('Revise los datos ingresados.');
    });
  });


});
