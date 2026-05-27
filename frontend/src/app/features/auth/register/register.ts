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
import { ButtonDirective, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

import { ApiErrorResponse, AuthService, RegisterRequest } from '../../../core/services/auth';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink, ButtonDirective, ButtonLabel, InputText],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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
      return 'Error al registrar. Intente nuevamente';
    }

    if (err.status === 0 || err.status >= 500) {
      return null;
    }

    const apiError = err.error as ApiErrorResponse | undefined;
    switch (apiError?.code) {
      case 'EMAIL_DUPLICATED':
        return 'Ya existe una cuenta con este email';
      case 'VALIDATION_ERROR':
        return this.formatValidationError(apiError);
      default:
        return 'Error al registrar. Intente nuevamente';
    }
  }

  /**
   * Builds a concise message using backend validation details when available.
   */
  private formatValidationError(apiError: ApiErrorResponse): string {
    const fieldErrors = apiError.details?.fieldErrors ?? [];
    if (fieldErrors.length === 0) {
      return 'Verifique los datos ingresados';
    }

    const details = fieldErrors
      .map((fieldError) => `${this.translateFieldName(fieldError.field)}: ${fieldError.message}`)
      .join('. ');

    return `Verifique los datos ingresados. ${details}`;
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
}
