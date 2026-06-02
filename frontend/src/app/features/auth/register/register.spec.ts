import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { Register } from './register';
import { AuthResponse, AuthService } from '../../../core/services/auth';

/** Helper: fills an input field and dispatches the events signal-forms listens to. */
function fillField(fixture: ComponentFixture<Register>, selector: string, value: string): void {
  typeField(fixture, selector, value);
  const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  fixture.detectChanges();
}

/** Helper: types into an input without blurring it to verify real-time validation. */
function typeField(fixture: ComponentFixture<Register>, selector: string, value: string): void {
  const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  expect(el).toBeTruthy();
  el.value = '';
  for (const ch of value) {
    el.value += ch;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  fixture.detectChanges();
}

describe('Register component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const successResponse: AuthResponse = {
    token: 'jwt-access-token',
    user: {
      id: 1,
      email: 'frodo@lembas.com',
      firstName: 'Frodo',
      lastName: 'Baggins',
      role: 'CUSTOMER',
      branchId: null,
      branchName: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    // Reset auth state
    authService.clearAuth();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------

  /** Should create the component instance and inject dependencies. */
  it('Should_createComponent_when_instantiated', () => {
    expect(component).toBeTruthy();
    expect(authService).toBeTruthy();
    expect(router).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Form field rendering
  // ---------------------------------------------------------------------------

  /** Should render all six form fields. */
  it('Should_renderAllFormFields_when_componentLoaded', () => {
    const requiredIds = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phone'];
    for (const id of requiredIds) {
      const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
      expect(input).toBeTruthy();
    }
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /** Should display required errors for all mandatory fields on empty submit. */
  it('Should_showRequiredErrors_when_submitEmptyForm', async () => {
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    for (const field of requiredFields) {
      const errEl = fixture.nativeElement.querySelector(`[data-testid="${field}-error"]`);
      expect(errEl).toBeTruthy();
      expect(errEl.textContent).toBeTruthy();
    }
    // Phone is optional -- no error expected
    const phoneErr = fixture.nativeElement.querySelector('[data-testid="phone-error"]');
    expect(phoneErr).toBeNull();
  });

  /** Should show email validation error while the user types an invalid email. */
  it('Should_showEmailError_when_emailIsInvalidBeforeBlur', async () => {
    typeField(fixture, '#email', 'not-an-email');
    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="email-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent.toLowerCase()).toContain('email');
  });

  /** Should show email validation error when an invalid email is entered. */
  it('Should_showEmailError_when_emailIsInvalid', async () => {
    fillField(fixture, '#email', 'not-an-email');
    const emailInput = fixture.nativeElement.querySelector('#email') as HTMLInputElement;
    emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="email-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent.toLowerCase()).toContain('email');
  });

  /** Should show min-length error while the user types a short password. */
  it('Should_showPasswordMinLengthError_when_passwordTooShortBeforeBlur', async () => {
    typeField(fixture, '#password', 'Ab1');
    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="password-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent.toLowerCase()).toContain('8');
  });

  /** Should show min-length error when password is too short. */
  it('Should_showPasswordMinLengthError_when_passwordTooShort', async () => {
    fillField(fixture, '#password', 'Ab1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="password-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent.toLowerCase()).toContain('8');
  });

  /** Should show mismatch error while the user types a non-matching confirmation. */
  it('Should_showPasswordMismatchError_when_passwordsDontMatchBeforeBlur', async () => {
    typeField(fixture, '#password', 'StrongPass1');
    typeField(fixture, '#confirmPassword', 'DifferentPass1');
    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="confirmPassword-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent.toLowerCase()).toContain('coinciden');
  });

  /** Should show mismatch error when passwords do not match. */
  it('Should_showPasswordMismatchError_when_passwordsDontMatch', async () => {
    fillField(fixture, '#password', 'StrongPass1');
    fillField(fixture, '#confirmPassword', 'DifferentPass1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="confirmPassword-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent.toLowerCase()).toContain('coinciden');
  });

  // ---------------------------------------------------------------------------
  // Successful submission
  // ---------------------------------------------------------------------------

  /** Should call register API and navigate to login with a success message on valid submission. */
  it('Should_navigateToLoginWithSuccessMessage_when_registerSucceeds', async () => {
    // Spy on router.navigate before submit
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillField(fixture, '#firstName', 'Frodo');
    fillField(fixture, '#lastName', 'Baggins');
    fillField(fixture, '#email', 'frodo@lembas.com');
    fillField(fixture, '#password', 'StrongPass1');
    fillField(fixture, '#confirmPassword', 'StrongPass1');
    fillField(fixture, '#phone', '+54 351 1234567');

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/register');
    const loadingButton = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(true);
    expect(loadingButton.getAttribute('aria-busy')).toBe('true');
    expect(loadingButton.textContent).toContain('Creando cuenta...');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.firstName).toBe('Frodo');
    expect(req.request.body.lastName).toBe('Baggins');
    expect(req.request.body.email).toBe('frodo@lembas.com');
    expect(req.request.body.password).toBe('StrongPass1');
    expect(req.request.body.phone).toBe('+54 351 1234567');

    req.flush(successResponse);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.registrationSucceeded()).toBe(true);
    expect(authService.currentUser()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { registered: 'true' },
    });
  });

  /** Should omit phone from request when phone is empty. */
  it('Should_sendPhoneAsNull_when_phoneIsEmpty', async () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillField(fixture, '#firstName', 'Samwise');
    fillField(fixture, '#lastName', 'Gamgee');
    fillField(fixture, '#email', 'sam@lembas.com');
    fillField(fixture, '#password', 'StrongPass1');
    fillField(fixture, '#confirmPassword', 'StrongPass1');
    // Do NOT fill phone -- it stays as empty string

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body.phone).toBeNull();
    req.flush(successResponse);
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  /** Should display a duplicate-email error when the API returns 409. */
  it('Should_showDuplicateEmailError_when_registerReturns409', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillField(fixture, '#firstName', 'Frodo');
    fillField(fixture, '#lastName', 'Baggins');
    fillField(fixture, '#email', 'existing@lembas.com');
    fillField(fixture, '#password', 'StrongPass1');
    fillField(fixture, '#confirmPassword', 'StrongPass1');

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/register');
    const loadingButton = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(true);
    expect(loadingButton.textContent).toContain('Creando cuenta...');
    req.flush(
      {
        status: 409,
        code: 'EMAIL_DUPLICATED',
        message: 'An account with this email already exists',
      },
      { status: 409, statusText: 'Conflict' },
    );

    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="general-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent).toContain('Ya existe un usuario con este email.');
    expect(component.registrationSucceeded()).toBe(false);
    expect(component.submitting()).toBe(false);
    // User should NOT be saved
    expect(authService.currentUser()).toBeNull();
    // Should NOT navigate
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  /** Should display a validation error when the API returns 400. */
  it('Should_showValidationError_when_registerReturns400', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillField(fixture, '#firstName', 'Frodo');
    fillField(fixture, '#lastName', 'Baggins');
    fillField(fixture, '#email', 'frodo@lembas.com');
    fillField(fixture, '#password', 'StrongPass1');
    fillField(fixture, '#confirmPassword', 'StrongPass1');

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/register');
    req.flush(
      {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [{ field: 'password', message: 'size must be between 8 and 128' }],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="general-error"]');
    expect(errEl).toBeTruthy();
    expect(errEl.textContent).toContain('Verifica los datos ingresados');
    expect(errEl.textContent).toContain('Contrasena: debe tener entre 8 y 128 caracteres');
    expect(authService.currentUser()).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  /** Should leave network failures to the global error interceptor. */
  it('Should_notShowLocalError_when_networkFails', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillField(fixture, '#firstName', 'Frodo');
    fillField(fixture, '#lastName', 'Baggins');
    fillField(fixture, '#email', 'frodo@lembas.com');
    fillField(fixture, '#password', 'StrongPass1');
    fillField(fixture, '#confirmPassword', 'StrongPass1');

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="submit-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/register');
    req.error(new ProgressEvent('network error'));

    await fixture.whenStable();
    fixture.detectChanges();

    const errEl = fixture.nativeElement.querySelector('[data-testid="general-error"]');
    expect(errEl).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Password visibility toggle
  // ---------------------------------------------------------------------------

  /** Should toggle password input type when eye icon is clicked. */
  it('Should_togglePasswordVisibility_when_clickEyeIcon', () => {
    const passwordInput = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggleBtn = fixture.nativeElement.querySelector(
      '[data-testid="toggle-password"]',
    ) as HTMLButtonElement;

    expect(passwordInput.type).toBe('password');

    toggleBtn.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');

    toggleBtn.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('password');
  });

  /** Should toggle confirm-password input type when eye icon is clicked. */
  it('Should_toggleConfirmPasswordVisibility_when_clickEyeIcon', () => {
    const confirmInput = fixture.nativeElement.querySelector(
      '#confirmPassword',
    ) as HTMLInputElement;
    const toggleBtn = fixture.nativeElement.querySelector(
      '[data-testid="toggle-confirm-password"]',
    ) as HTMLButtonElement;

    expect(confirmInput.type).toBe('password');

    toggleBtn.click();
    fixture.detectChanges();
    expect(confirmInput.type).toBe('text');

    toggleBtn.click();
    fixture.detectChanges();
    expect(confirmInput.type).toBe('password');
  });
});
