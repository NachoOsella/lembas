import { Component, computed, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  form,
  FormField,
  submit,
  required,
  email,
  minLength,
  validate,
} from '@angular/forms/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { InputText } from 'primeng/inputtext';

import { AuthService, RegisterRequest } from '../../../core/services/auth';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppToast } from '../../../shared/components/app-toast/app-toast';

@Component({
  selector: 'app-register',
  imports: [ErrorAlert, AppToast, FormField, RouterLink, AppButton, InputText],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorMapping = inject(ErrorMappingService);

  /** Form model -- all field initial values. confirmPassword is client-side only. */
  protected readonly registrationModel = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  /** General (non-field-level) error message, e.g. 409/400 from the API. */
  readonly generalError = signal('');

  /** Whether the submit HTTP call is in flight. Used for button loading state. */
  readonly submitting = signal(false);

  /** Whether the registration finished successfully and the redirect is being resolved. */
  readonly registrationSucceeded = signal(false);

  /** Toggle password field visibility. */
  readonly passwordVisible = signal(false);

  /** Toggle confirm-password field visibility. */
  readonly confirmPasswordVisible = signal(false);

  /** Whether the email field has user input and currently fails validation. */
  protected readonly showEmailRealtimeError = computed(() => {
    const emailValue = this.registrationModel().email.trim();
    return emailValue.length > 0 && this.form.email().errors().length > 0;
  });

  /** Whether the password field has user input and currently fails validation. */
  protected readonly showPasswordRealtimeError = computed(() => {
    const passwordValue = this.registrationModel().password;
    return passwordValue.length > 0 && this.form.password().errors().length > 0;
  });

  /** Whether the confirmation field has user input and does not match the password. */
  protected readonly showConfirmPasswordRealtimeError = computed(() => {
    const confirmPasswordValue = this.registrationModel().confirmPassword;
    return confirmPasswordValue.length > 0 && this.form.confirmPassword().errors().length > 0;
  });

  /** Signal-based form with validation rules. */
  readonly form = form(this.registrationModel, (s) => {
    required(s.firstName, { message: 'El nombre es obligatorio' });
    required(s.lastName, { message: 'El apellido es obligatorio' });

    required(s.email, { message: 'El email es obligatorio' });
    email(s.email, { message: 'Ingrese un email valido' });

    required(s.password, { message: 'La contrasena es obligatoria' });
    minLength(s.password, 8, { message: 'Minimo 8 caracteres' });

    required(s.confirmPassword, { message: 'Confirme la contrasena' });
    validate(s.confirmPassword, ({ valueOf }) => {
      if (valueOf(s.password) !== valueOf(s.confirmPassword)) {
        return { kind: 'mismatch', message: 'Las contrasenas no coinciden' };
      }
      return undefined;
    });
  });

  /**
   * Submits the registration form.
   *
   * If the form is invalid the caller (submit) marks all fields as touched and
   * stops there. When valid the async callback fires the HTTP request and, on
   * success, stores the auth state and redirects to /store.
   */
  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    this.generalError.set('');
    this.registrationSucceeded.set(false);
    submit(this.form, async () => {
      this.submitting.set(true);
      try {
        const m = this.registrationModel();
        const request: RegisterRequest = {
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          password: m.password,
          phone: m.phone || null,
        };
        await lastValueFrom(this.auth.register(request));
        this.registrationSucceeded.set(true);
        await this.router.navigate(['/auth/login'], {
          queryParams: { registered: 'true' },
        });
      } catch (err: unknown) {
        this.registrationSucceeded.set(false);
        const message = this.buildBackendErrorMessage(err);
        if (message) {
          this.generalError.set(message);
        }
      } finally {
        this.submitting.set(false);
      }
    });
  }

  /**
   * Converts backend API error codes into user-facing registration messages.
   */
  private buildBackendErrorMessage(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Error al registrar. Intenta nuevamente.';
    }

    // Let the interceptor handle network and server errors
    if (err.status === 0 || err.status >= 500) {
      return null;
    }

    const apiError = getApiError(err);
    const code = apiError?.code;

    if (!code || !apiError) {
      return 'Error al registrar. Intenta nuevamente.';
    }

    // Special handling for validation errors with field translation
    if (code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(
        apiError,
        this.translateFieldName,
        'Verifica los datos ingresados.',
        this.translateValidationMessage
      );
    }

    // Use centralized error mapping with register-specific fallback
    return this.errorMapping.getMessage(code, 'Error al registrar. Intenta nuevamente.');
  }

  /**
   * Translates backend DTO field names to labels understood by users.
   */
  private translateFieldName(field: string): string {
    const labels: Record<string, string> = {
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Email',
      password: 'Contrasena',
      phone: 'Telefono',
    };

    return labels[field] ?? field;
  }

  /**
   * Translates backend validation messages to user-friendly Spanish text.
   */
  private translateValidationMessage(message: string): string {
    const messages: Record<string, string> = {
      'must be well-formed': 'debe tener un formato válido',
      'size must be between 8 and 128': 'debe tener entre 8 y 128 caracteres',
      'must not be blank': 'es obligatorio',
      'must not be empty': 'es obligatorio',
      'must not be null': 'es obligatorio',
    };

    return messages[message] ?? message;
  }
}
