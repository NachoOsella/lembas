import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { firstValueFrom, of, throwError } from 'rxjs';

import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
  let interceptor: HttpInterceptorFn;
  let messageService: MessageService;
  let router: Router;
  let mockRequest: HttpRequest<unknown>;
  let localStorageMock: { [key: string]: string };

  /** Runs the interceptor and returns the thrown HTTP error. */
  async function captureError(
    request: HttpRequest<unknown>,
    error: HttpErrorResponse,
  ): Promise<unknown> {
    try {
      await firstValueFrom(interceptor(request, () => throwError(() => error)));
      throw new Error('Expected error to be thrown');
    } catch (e) {
      return e;
    }
  }

  beforeEach(() => {
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

    interceptor = (req, next) => TestBed.runInInjectionContext(() => errorInterceptor(req, next));

    messageService = TestBed.inject(MessageService);
    router = TestBed.inject(Router);
    mockRequest = new HttpRequest('GET', '/api/test');
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should show connection error toast for status 0', async () => {
    const error = new HttpErrorResponse({ status: 0, error: 'Network error' });

    await captureError(mockRequest, error);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error de conexion',
      detail: 'No se pudo conectar con el servidor. Verifica tu conexion a internet.',
      life: 5000,
    });
  });

  it('should suppress duplicate global toasts from parallel failing requests', async () => {
    const firstRequest = new HttpRequest('GET', '/api/admin/users');
    const secondRequest = new HttpRequest('GET', '/api/admin/branches');
    const error = new HttpErrorResponse({ status: 0, error: 'Network error' });

    await captureError(firstRequest, error);
    await captureError(secondRequest, error);

    expect(messageService.add).toHaveBeenCalledTimes(1);
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error de conexion',
      detail: 'No se pudo conectar con el servidor. Verifica tu conexion a internet.',
      life: 5000,
    });
  });

  it('should redirect to login and clear storage for protected 401 responses', async () => {
    localStorage.setItem('lembas_access_token', 'test-token');
    localStorage.setItem('lembas_refresh_token', 'test-refresh-token');
    localStorage.setItem('lembas_user_first_name', 'Test');

    const error = new HttpErrorResponse({
      status: 401,
      error: { message: 'Unauthorized' },
    });

    await captureError(mockRequest, error);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: 'Sesion expirada',
      detail: 'Su sesion ha expirado. Por favor, inicie sesion nuevamente.',
      life: 5000,
    });
    expect(localStorage.getItem('lembas_access_token')).toBeNull();
    expect(localStorage.getItem('lembas_refresh_token')).toBeNull();
    expect(localStorage.getItem('lembas_user_first_name')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should let login 401 responses be handled by the login component', async () => {
    const loginRequest = new HttpRequest('POST', '/api/auth/login', {});
    const error = new HttpErrorResponse({
      status: 401,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });

    await captureError(loginRequest, error);

    expect(messageService.add).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should show access denied toast for status 403', async () => {
    const error = new HttpErrorResponse({
      status: 403,
      error: { message: 'Access denied' },
    });

    await captureError(mockRequest, error);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Acceso denegado',
      detail: 'No tiene permisos para realizar esta accion.',
      life: 5000,
    });
  });

  it('should not show a global toast for validation errors', async () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
    });

    await captureError(mockRequest, error);

    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('should not show a global toast for conflict errors', async () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'Business rule violation' },
    });

    await captureError(mockRequest, error);

    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('should not show a global toast for not-found errors', async () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { message: 'Resource not found' },
    });

    await captureError(mockRequest, error);

    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('should show server error toast for status 500', async () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { message: 'Internal server error' },
    });

    await captureError(mockRequest, error);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error del servidor',
      detail: 'Ocurrio un error inesperado. Por favor, intente nuevamente mas tarde.',
      life: 5000,
    });
  });

  it('should show server error toast for unexpected 5xx statuses', async () => {
    const error = new HttpErrorResponse({ status: 503, error: {} });

    await captureError(mockRequest, error);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error del servidor',
      detail: 'Ocurrio un error inesperado. Por favor, intente nuevamente mas tarde.',
      life: 5000,
    });
  });

  it('should pass through successful responses', async () => {
    const successEvent: HttpEvent<unknown> = { type: 0 };

    const result = await firstValueFrom(interceptor(mockRequest, () => of(successEvent)));

    expect(result).toBe(successEvent);
    expect(messageService.add).not.toHaveBeenCalled();
  });
});
