import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, submit, required, email, minLength } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { AuthService, LoginRequest } from '../../../core/services/auth';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { ApiErrorResponse } from '../../../shared/models/api-error';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { AppInput } from '../../../shared/components/app-input/app-input';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppToast } from '../../../shared/components/app-toast/app-toast';
import { PasswordToggle } from '../../../shared/components/password-toggle/password-toggle';

@Component({
  selector: 'app-login',
  imports: [ErrorAlert, AppToast, FormField, RouterLink, AppInput, AppButton, PasswordToggle],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errorMapping = inject(ErrorMappingService);

  /** Form model with the credential fields required by the login API. */
  protected readonly loginModel = signal({
    email: '',
    password: '',
  });

  /** General authentication error shown above the form. */
  readonly generalError = signal('');

  /** Whether the login request is currently in flight. */
  readonly submitting = signal(false);

  /** Toggles password visibility without changing the form value. */
  readonly passwordVisible = signal(false);

  /** Whether the user has just completed registration and should see a success message. */
  readonly showRegistrationSuccess = computed(() => {
    return this.route.snapshot.queryParamMap.get('registered') === 'true';
  });

  /** The return URL passed by route guards, if any. Preserved so the register link carries it. */
  protected readonly returnUrl = computed(() =>
    this.route.snapshot.queryParamMap.get('returnUrl') ?? null,
  );

  /** Whether the email field has user input and currently fails validation. */
  protected readonly showEmailRealtimeError = computed(() => {
    const emailValue = this.loginModel().email.trim();
    return emailValue.length > 0 && this.form.email().errors().length > 0;
  });

  /** Whether the password field has user input and currently fails validation. */
  protected readonly showPasswordRealtimeError = computed(() => {
    const passwordValue = this.loginModel().password;
    return passwordValue.length > 0 && this.form.password().errors().length > 0;
  });

  /** Signal-based form with validation rules for credentials. */
  readonly form = form(this.loginModel, (s) => {
    required(s.email, { message: 'El email es obligatorio' });
    email(s.email, { message: 'Ingrese un email valido' });

    required(s.password, { message: 'La contrasena es obligatoria' });
    minLength(s.password, 8, { message: 'Minimo 8 caracteres' });
  });

  /**
   * Submits credentials to the backend and stores auth state on success.
   * Invalid signal-form fields are marked as touched by submit before any HTTP call.
   */
  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    this.generalError.set('');
    submit(this.form, async () => {
      this.submitting.set(true);
      try {
        const m = this.loginModel();
        const request: LoginRequest = {
          email: m.email.trim(),
          password: m.password,
        };
        const response = await lastValueFrom(this.auth.login(request));
        this.auth.saveAuthResponse(response);

        try {
          await this.router.navigate([this.buildRedirectPath(response.user.role)]);
        } catch (navigationError) {
          // Keep the authenticated session even if a lazy route chunk fails to load.
          console.error('Login succeeded, but post-login navigation failed.', navigationError);
          this.generalError.set('Sesion iniciada. Recargue la pagina si no fue redirigido.');
        }
      } catch (err: unknown) {
        this.auth.clearAuth();
        console.error('Login request failed before authentication completed.', err);
        const message = this.buildBackendErrorMessage(err);
        if (message) {
          this.generalError.set(message);
        }
      } finally {
        this.submitting.set(false);
      }
    });
  }

  /** Converts backend API error codes into user-facing login messages. */
  private buildBackendErrorMessage(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Error al iniciar sesion. Intenta nuevamente.';
    }

    // Let the interceptor handle network and server errors
    if (err.status === 0 || err.status >= 500) {
      return null;
    }

    const apiError = err.error as ApiErrorResponse | undefined;
    const code = apiError?.code;

    if (!code) {
      return 'Error al iniciar sesion. Intenta nuevamente.';
    }

    // Use centralized error mapping with login-specific fallback
    return this.errorMapping.getMessage(code, 'Error al iniciar sesion. Intenta nuevamente.');
  }

  /** Routes customers to the store and staff users to the admin area after login.
   *  Honors a {@code returnUrl} query parameter set by route guards so users
   *  land back on the page they were trying to access before authenticating. */
  private buildRedirectPath(role: string): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && isSafeRelativeUrl(returnUrl)) {
      return returnUrl;
    }
    return role === 'CUSTOMER' ? '/store' : '/admin';
  }
}

/**
 * Rejects URLs that contain protocol schemas, double slashes, or do not
 * start with a forward slash. Only relative paths are safe for client-side
 * redirect after login.
 */
function isSafeRelativeUrl(url: string): boolean {
  if (!url.startsWith('/')) {
    return false;
  }
  if (url.includes('//')) {
    return false;
  }
  if (url.includes(':')) {
    return false;
  }
  return true;
}
