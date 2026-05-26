import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpEvent } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { errorInterceptor } from './error-interceptor';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('errorInterceptor', () => {
  let interceptor: HttpInterceptorFn;
  let messageService: MessageService;
  let router: Router;
  let mockRequest: HttpRequest<unknown>;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
    });

    const messageServiceMock = {
      add: vi.fn(),
    };

    const routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: MessageService, useValue: messageServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    interceptor = (req, next) =>
      TestBed.runInInjectionContext(() => errorInterceptor(req, next));

    messageService = TestBed.inject(MessageService);
    router = TestBed.inject(Router);
    mockRequest = new HttpRequest('GET', '/api/test');

    // Limpiar localStorage antes de cada test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should show connection error toast for status 0', async () => {
    const error = new HttpErrorResponse({ status: 0, error: 'Network error' });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error de conexión',
        detail: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
        life: 5000,
      });
    }
  });

  it('should redirect to login and clear storage for status 401', async () => {
    localStorage.setItem('lembas_access_token', 'test-token');
    localStorage.setItem('lembas_refresh_token', 'test-refresh-token');
    localStorage.setItem('lembas_user_first_name', 'Test');

    const error = new HttpErrorResponse({ 
      status: 401, 
      error: { message: 'Unauthorized' } 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Sesión expirada',
        detail: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
        life: 5000,
      });
      expect(localStorage.getItem('lembas_access_token')).toBeNull();
      expect(localStorage.getItem('lembas_refresh_token')).toBeNull();
      expect(localStorage.getItem('lembas_user_first_name')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    }
  });

  it('should show access denied toast for status 403', async () => {
    const error = new HttpErrorResponse({ 
      status: 403, 
      error: { message: 'Access denied' } 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Acceso denegado',
        detail: 'Access denied',
        life: 5000,
      });
    }
  });

  it('should show not found toast for status 404', async () => {
    const error = new HttpErrorResponse({ 
      status: 404, 
      error: { message: 'Resource not found' } 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'No encontrado',
        detail: 'Resource not found',
        life: 5000,
      });
    }
  });

  it('should show conflict toast for status 409', async () => {
    const error = new HttpErrorResponse({ 
      status: 409, 
      error: { message: 'Business rule violation' } 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Business rule violation',
        life: 5000,
      });
    }
  });

  it('should show validation error toast for status 400', async () => {
    const error = new HttpErrorResponse({ 
      status: 400, 
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error de validación',
        detail: 'Validation failed',
        life: 5000,
      });
    }
  });

  it('should show server error toast for status 500', async () => {
    const error = new HttpErrorResponse({ 
      status: 500, 
      error: { message: 'Internal server error' } 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error del servidor',
        detail: 'Ocurrió un error inesperado. Por favor, intente nuevamente más tarde.',
        life: 5000,
      });
    }
  });

  it('should pass through successful responses', async () => {
    const successEvent: HttpEvent<unknown> = { type: 0 };

    const result = await firstValueFrom(interceptor(mockRequest, () => of(successEvent)));
    
    expect(result).toBe(successEvent);
    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('should use default message when backend message is missing', async () => {
    const error = new HttpErrorResponse({ 
      status: 403, 
      error: {} 
    });

    try {
      await firstValueFrom(interceptor(mockRequest, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Acceso denegado',
        detail: 'No tiene permisos para realizar esta acción.',
        life: 5000,
      });
    }
  });
});
