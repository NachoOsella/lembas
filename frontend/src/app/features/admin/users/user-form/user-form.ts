import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

import { ApiErrorResponse } from '../../../../core/services/auth';
import { UserService } from '../../../../core/services/user';
import { Branch, InternalRole, UserResponse } from '../../../../shared/models/user';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppModal } from '../../../../shared/components/app-modal/app-modal';
import { FormSection } from '../../../../shared/components/form-section/form-section';

/** Options for the role selector (internal roles only). */
const ROLE_OPTIONS: { label: string; value: InternalRole }[] = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Gerente', value: 'MANAGER' },
  { label: 'Empleado', value: 'EMPLOYEE' },
];

/** Maps a role to a compact operational description for select templates. */
const ROLE_DESCRIPTION: Record<InternalRole, string> = {
  ADMIN: 'Alcance global, configuracion y auditoria.',
  MANAGER: 'Gestiona una sucursal y sus operaciones.',
  EMPLOYEE: 'Opera ventas, stock y tareas de mostrador.',
};

/** Maps a role to a PrimeIcons glyph for select templates. */
const ROLE_ICON: Record<InternalRole, string> = {
  ADMIN: 'pi pi-shield',
  MANAGER: 'pi pi-briefcase',
  EMPLOYEE: 'pi pi-id-card',
};

@Component({
  selector: 'app-user-form',
  imports: [FormsModule, Select, InputText, AppButton, AppModal, FormSection],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
/** Create / Edit dialog for internal users with role-aware branch selection and inline validation. */
export class UserForm {
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------
  /** Branches for the branch selector dropdown. */
  readonly branches = input<Branch[]>([]);

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------
  /** Emitted when a user was successfully created or updated. */
  readonly saved = output<void>();

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  /**
   * Basic email format regex matching the Jakarta {@code @Email} constraint.
   */
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** True after the first submit attempt, used to reveal inline errors. */
  protected readonly formSubmitted = signal(false);

  protected readonly formEmailValid = computed(
    () => this.formEmail().trim().length > 0 && UserForm.EMAIL_REGEX.test(this.formEmail().trim()),
  );

  protected readonly formPasswordValid = computed(() => {
    const password = this.formPassword();
    return this.isEditMode() ? password.length === 0 || password.length >= 8 : password.length >= 8;
  });

  protected readonly formBranchValid = computed(
    () => this.formRole() === 'ADMIN' || this.formBranchId() !== null,
  );

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------
  protected readonly dialogVisible = signal(false);
  protected readonly editingUser = signal<UserResponse | null>(null);
  protected readonly submitting = signal(false);
  protected readonly dialogError = signal('');

  // ---------------------------------------------------------------------------
  // Form fields
  // ---------------------------------------------------------------------------
  protected readonly formEmail = signal('');
  protected readonly formPassword = signal('');
  protected readonly formFirstName = signal('');
  protected readonly formLastName = signal('');
  protected readonly formPhone = signal('');
  protected readonly formRole = signal<InternalRole>('EMPLOYEE');
  protected readonly formBranchId = signal<number | null>(null);

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  protected readonly isEditMode = computed(() => this.editingUser() !== null);
  protected readonly dialogTitle = computed(() =>
    this.isEditMode() ? 'Editar usuario' : 'Crear usuario',
  );
  protected readonly showBranchField = computed(
    () => this.formRole() === 'MANAGER' || this.formRole() === 'EMPLOYEE',
  );

  protected readonly roleOptions = ROLE_OPTIONS;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  /** Opens the dialog in create mode with an empty form. */
  openCreate(): void {
    this.editingUser.set(null);
    this.resetForm();
    this.dialogVisible.set(true);
  }

  /** Opens the dialog in edit mode, pre-populated with the given user. */
  openEdit(user: UserResponse): void {
    this.formSubmitted.set(false);
    this.dialogError.set('');
    this.editingUser.set(user);
    this.formEmail.set(user.email);
    this.formPassword.set('');
    this.formFirstName.set(user.firstName ?? '');
    this.formLastName.set(user.lastName ?? '');
    this.formPhone.set(user.phone ?? '');
    this.formRole.set(user.role as InternalRole);
    this.formBranchId.set(user.branchId);
    this.dialogVisible.set(true);
  }

  // ---------------------------------------------------------------------------
  // Role interaction
  // ---------------------------------------------------------------------------
  protected onRoleChange(role: InternalRole): void {
    this.formRole.set(role);
    if (role === 'ADMIN') {
      this.formBranchId.set(null);
    }
  }

  /** Normalizes PrimeNG select output so branch validation always receives a number or null. */
  protected onBranchChange(value: number | string | null): void {
    if (value === null || value === '') {
      this.formBranchId.set(null);
      return;
    }
    const branchId = Number(value);
    this.formBranchId.set(Number.isFinite(branchId) ? branchId : null);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  protected submit(): void {
    if (this.submitting()) return;

    const branchId: number | null = this.formRole() === 'ADMIN' ? null : this.formBranchId();

    this.formSubmitted.set(true);
    this.dialogError.set('');

    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Revise los campos marcados en rojo antes de continuar.',
      });
      return;
    }

    if (this.isEditMode()) {
      this.submitUpdate(branchId);
    } else {
      this.submitCreate(branchId);
    }
  }

  private isFormValid(): boolean {
    const hasIdentity = Boolean(this.formFirstName().trim() && this.formLastName().trim());
    return (
      hasIdentity && this.formEmailValid() && this.formPasswordValid() && this.formBranchValid()
    );
  }

  private submitCreate(branchId: number | null): void {
    this.submitting.set(true);
    this.userService
      .createUser({
        email: this.formEmail().trim(),
        password: this.formPassword(),
        firstName: this.formFirstName().trim(),
        lastName: this.formLastName().trim(),
        phone: this.formPhone().trim() || undefined,
        role: this.formRole(),
        branchId: branchId ?? undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Usuario creado',
            detail: 'El usuario se ha creado correctamente.',
          });
          this.dialogVisible.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.setDialogError(err);
        },
      });
  }

  private submitUpdate(branchId: number | null): void {
    const user = this.editingUser();
    if (!user) return;

    this.submitting.set(true);
    const request: Record<string, unknown> = {};

    if (this.formEmail() !== user.email) request['email'] = this.formEmail().trim();
    if (this.formPassword()) request['password'] = this.formPassword();
    if (this.formFirstName() !== (user.firstName ?? ''))
      request['firstName'] = this.formFirstName().trim();
    if (this.formLastName() !== (user.lastName ?? ''))
      request['lastName'] = this.formLastName().trim();
    if ((this.formPhone().trim() || null) !== user.phone)
      request['phone'] = this.formPhone().trim();
    if (this.formRole() !== user.role) request['role'] = this.formRole();
    if (branchId !== user.branchId) request['branchId'] = branchId;

    if (Object.keys(request).length === 0) {
      this.submitting.set(false);
      this.dialogVisible.set(false);
      return;
    }

    this.userService.updateUser(user.id, request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Usuario actualizado',
          detail: 'Los cambios se han guardado correctamente.',
        });
        this.dialogVisible.set(false);
        this.saved.emit();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.setDialogError(err);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Dialog close
  // ---------------------------------------------------------------------------
  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.submitting.set(false);
    this.dialogError.set('');
  }

  private resetForm(): void {
    this.formSubmitted.set(false);
    this.dialogError.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formFirstName.set('');
    this.formLastName.set('');
    this.formPhone.set('');
    this.formRole.set('EMPLOYEE');
    this.formBranchId.set(null);
  }

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  private setDialogError(err: unknown): void {
    const message = this.buildErrorMessage(err);
    if (message) this.dialogError.set(message);
  }

  private buildErrorMessage(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse)) {
      return 'No se pudo completar la operacion. Intente nuevamente.';
    }
    if (err.status === 0 || err.status >= 500) return null;

    const apiError = err.error as ApiErrorResponse | undefined;
    switch (apiError?.code) {
      case 'EMAIL_DUPLICATED':
        return 'Ya existe un usuario con este email.';
      case 'INVALID_USER_BRANCH':
        this.showBranchPolicyToast(apiError);
        return null;
      case 'VALIDATION_ERROR':
        return this.formatValidationError(apiError);
      default:
        return apiError?.message || this.defaultMessage(err.status);
    }
  }

  private formatValidationError(apiError: ApiErrorResponse): string {
    const fieldErrors = apiError.details?.fieldErrors ?? [];
    if (fieldErrors.length === 0) return 'Revise los datos ingresados.';
    const details = fieldErrors
      .map((fe) => `${this.translateField(fe.field)}: ${fe.message}`)
      .join('. ');
    return `Revise los datos ingresados. ${details}`;
  }

  private showBranchPolicyToast(apiError: ApiErrorResponse): void {
    const message = apiError?.message ?? '';
    const translated = message.includes('assigned to a branch')
      ? 'Los usuarios Gerente y Empleado deben tener una sucursal asignada.'
      : 'El rol seleccionado no es compatible con la sucursal.';
    this.messageService.add({
      severity: 'warn',
      summary: 'Conflicto de permisos',
      detail: translated,
    });
  }

  private translateField(field: string): string {
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Contrasena',
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Telefono',
      role: 'Rol',
      branchId: 'Sucursal',
      enabled: 'Estado',
    };
    return labels[field] ?? field;
  }

  private defaultMessage(status: number): string {
    switch (status) {
      case 400:
      case 422:
        return 'Revise los datos ingresados.';
      case 404:
        return 'El usuario ya no existe o fue eliminado.';
      case 409:
        return 'La operacion no se puede completar por una regla de negocio.';
      default:
        return 'No se pudo completar la operacion. Intente nuevamente.';
    }
  }

  // ---------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------
  protected roleDescription(role: InternalRole): string {
    return ROLE_DESCRIPTION[role];
  }

  protected roleIcon(role: InternalRole): string {
    return ROLE_ICON[role];
  }
}
