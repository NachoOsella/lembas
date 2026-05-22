import { Component, signal, inject } from '@angular/core';
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
import { lastValueFrom } from 'rxjs';

import { Auth, RegisterRequest } from '../../../core/services/auth';
import { AppButton } from '../../../shared/components';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink, AppButton],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /** Form model -- all field initial values. confirmPassword is client-side only. */
  private readonly registrationModel = signal({
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

  /** Toggle password field visibility. */
  readonly passwordVisible = signal(false);

  /** Toggle confirm-password field visibility. */
  readonly confirmPasswordVisible = signal(false);

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
    this.generalError.set('');
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
        const response = await lastValueFrom(this.auth.register(request));
        this.auth.saveAuthResponse(response);
        await this.router.navigate(['/store']);
      } catch (err: unknown) {
        const httpErr = err as { status?: number; error?: { code?: string } };
        if (httpErr.status === 409) {
          this.generalError.set('Ya existe una cuenta con este email');
        } else if (httpErr.status === 400) {
          this.generalError.set('Verifique los datos ingresados');
        } else {
          this.generalError.set('Error al registrar. Intente nuevamente');
        }
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
