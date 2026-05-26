import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';

import { UserService } from '../../../core/services/user';
import {
  Branch,
  InternalRole,
  UserResponse,
} from '../../../shared/models/user';
import { ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppDataTable } from '../../../shared/components/app-data-table/app-data-table';
import { AppMetricItem, AppMetricStrip } from '../../../shared/components/app-metric-strip/app-metric-strip';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppModal } from '../../../shared/components/app-modal/app-modal';
import { AppToast } from '../../../shared/components/app-toast/app-toast';
import { AppBadge } from '../../../shared/components/app-badge/app-badge';
import { AppSearchBar } from '../../../shared/components/app-search-bar/app-search-bar';

/** Options for the role selector (internal roles only). */
const ROLE_OPTIONS: { label: string; value: InternalRole }[] = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Gerente', value: 'MANAGER' },
  { label: 'Empleado', value: 'EMPLOYEE' },
];

/** Maps a role to an AppBadge tone. */
const ROLE_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ADMIN: 'info',
  MANAGER: 'warning',
  EMPLOYEE: 'success',
  CUSTOMER: 'neutral',
};

/** Maps a role to a Spanish label for display. */
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  EMPLOYEE: 'Empleado',
  CUSTOMER: 'Cliente',
};

/**
 * Column definitions for the users data table.
 * The body template renders cells in the same order.
 */
const USER_COLUMNS: ColumnDef[] = [
  { field: 'firstName', header: 'Nombre', sortable: true, width: '18%' },
  { field: 'email', header: 'Email', sortable: true, width: '22%' },
  { field: 'role', header: 'Rol', sortable: true, width: '14%' },
  { field: 'branchId', header: 'Sucursal', sortable: false, width: '14%' },
  { field: 'enabled', header: 'Estado', sortable: true, width: '12%' },
  { field: 'id', header: 'Acciones', sortable: false, width: '20%' },
];

@Component({
  selector: 'app-users',
  imports: [
    FormsModule,
    Select,
    InputText,
    ToggleSwitch,
    ButtonDirective,
    Ripple,
    AppPageHeader,
    AppDataTable,
    AppMetricStrip,
    AppButton,
    AppModal,
    AppToast,
    AppBadge,
    AppSearchBar,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
  providers: [MessageService],
})
export class Users implements OnInit {
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  // ---------------------------------------------------------------------------
  // Data state
  // ---------------------------------------------------------------------------
  protected readonly users = signal<UserResponse[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  private readonly branchMap = computed(() => {
    const map = new Map<number, string>();
    for (const b of this.branches()) {
      map.set(b.id, b.name);
    }
    return map;
  });
  protected readonly loading = signal(false);

  // ---------------------------------------------------------------------------
  // Search state
  // ---------------------------------------------------------------------------
  protected readonly searchQuery = signal('');
  protected readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const users = this.users();
    
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase();
      const email = user.email.toLowerCase();
      const role = this.roleLabel(user.role).toLowerCase();
      const branch = this.branchName(user.branchId)?.toLowerCase() ?? '';
      
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        branch.includes(query)
      );
    });
  });

  protected readonly emptyDescription = computed(() => {
    const query = this.searchQuery().trim();
    if (query) {
      return `No se encontraron usuarios que coincidan con "${query}".`;
    }
    return 'Cree el primer usuario interno para comenzar.';
  });

  protected readonly userColumns = USER_COLUMNS;

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------
  protected readonly dialogVisible = signal(false);
  protected readonly editingUser = signal<UserResponse | null>(null);
  protected readonly submitting = signal(false);

  // ---------------------------------------------------------------------------
  // Form signals
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
  protected readonly userMetrics = computed<readonly AppMetricItem[]>(() => {
    const users = this.users();
    const enabled = users.filter((user) => user.enabled).length;
    const branchBound = users.filter((user) => user.branchId != null).length;

    return [
      {
        label: 'Usuarios',
        value: users.length,
        detail: 'internos cargados',
        icon: 'pi pi-users',
        tone: 'forest',
      },
      {
        label: 'Activos',
        value: enabled,
        detail: `${users.length - enabled} inactivos`,
        icon: 'pi pi-shield',
        tone: 'sage',
      },
      {
        label: 'Sucursales',
        value: branchBound,
        detail: 'con asignacion operativa',
        icon: 'pi pi-building',
        tone: 'amber',
      },
    ];
  });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    this.loadUsers();
    this.loadBranches();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  protected loadUsers(): void {
    this.loading.set(true);
    this.userService.listUsers().subscribe({
      next: (page) => {
        this.users.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected loadBranches(): void {
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
    });
  }

  // ---------------------------------------------------------------------------
  // Search handlers
  // ---------------------------------------------------------------------------
  protected onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  protected onSearchClear(): void {
    this.searchQuery.set('');
  }

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------
  protected openCreateDialog(): void {
    this.editingUser.set(null);
    this.resetForm();
    this.dialogVisible.set(true);
  }

  protected openEditDialog(user: UserResponse): void {
    this.editingUser.set(user);
    this.formEmail.set(user.email);
    this.formPassword.set('');
    this.formFirstName.set(user.firstName ?? '');
    this.formLastName.set(user.lastName ?? '');
    this.formPhone.set(user.phone ?? '');
    // Cast is safe because editing only applies to internal roles.
    this.formRole.set(user.role as InternalRole);
    this.formBranchId.set(user.branchId);
    this.dialogVisible.set(true);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.submitting.set(false);
  }

  /** Resets every form field to its default value. */
  private resetForm(): void {
    this.formEmail.set('');
    this.formPassword.set('');
    this.formFirstName.set('');
    this.formLastName.set('');
    this.formPhone.set('');
    this.formRole.set('EMPLOYEE');
    this.formBranchId.set(null);
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

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    // Build payload, clearing branchId for ADMIN.
    const branchId: number | null =
      this.formRole() === 'ADMIN' ? null : this.formBranchId();

    if (!this.isFormValid(branchId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Revise email, nombre, apellido, contrasena y sucursal antes de continuar.',
      });
      return;
    }

    if (this.isEditMode()) {
      this.submitUpdate(branchId);
    } else {
      this.submitCreate(branchId);
    }
  }

  /** Validates required form fields before sending admin user changes. */
  private isFormValid(branchId: number | null): boolean {
    const hasIdentity = Boolean(
      this.formEmail().trim() &&
        this.formFirstName().trim() &&
        this.formLastName().trim(),
    );
    const hasPassword = this.isEditMode() || this.formPassword().length >= 8;
    const hasRequiredBranch = this.formRole() === 'ADMIN' || branchId !== null;

    return hasIdentity && hasPassword && hasRequiredBranch;
  }

  private submitCreate(branchId: number | null): void {
    this.submitting.set(true);
    const request = {
      email: this.formEmail().trim(),
      password: this.formPassword(),
      firstName: this.formFirstName().trim(),
      lastName: this.formLastName().trim(),
      phone: this.formPhone().trim() || undefined,
      role: this.formRole(),
      branchId: branchId ?? undefined,
    };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Usuario creado',
          detail: 'El usuario se ha creado correctamente.',
        });
        this.closeDialog();
        this.loadUsers();
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  private submitUpdate(branchId: number | null): void {
    const user = this.editingUser();
    if (!user) {
      return;
    }

    this.submitting.set(true);
    const request: Record<string, unknown> = {};
    if (this.formEmail() !== user.email) {
      request['email'] = this.formEmail().trim();
    }
    if (this.formPassword()) {
      request['password'] = this.formPassword();
    }
    if (this.formFirstName() !== (user.firstName ?? '')) {
      request['firstName'] = this.formFirstName().trim();
    }
    if (this.formLastName() !== (user.lastName ?? '')) {
      request['lastName'] = this.formLastName().trim();
    }
    if ((this.formPhone().trim() || null) !== user.phone) {
      request['phone'] = this.formPhone().trim();
    }
    if (this.formRole() !== user.role) {
      request['role'] = this.formRole();
    }
    if (branchId !== user.branchId) {
      request['branchId'] = branchId;
    }

    // Nothing changed — just close.
    if (Object.keys(request).length === 0) {
      this.closeDialog();
      return;
    }

    this.userService.updateUser(user.id, request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Usuario actualizado',
          detail: 'Los cambios se han guardado correctamente.',
        });
        this.closeDialog();
        this.loadUsers();
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Status toggle
  // ---------------------------------------------------------------------------
  protected toggleStatus(user: UserResponse): void {
    const newStatus = !user.enabled;
    this.userService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
        this.messageService.add({
          severity: 'success',
          summary: newStatus ? 'Usuario habilitado' : 'Usuario deshabilitado',
          detail: `${user.email} ${
            newStatus ? 'habilitado' : 'deshabilitado'
          } correctamente.`,
        });
      },
      error: () => {
        this.loadUsers();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------
  protected roleTone(role: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    return ROLE_TONE[role] ?? 'neutral';
  }

  protected roleLabel(role: string): string {
    return ROLE_LABEL[role] ?? role;
  }

  protected branchName(branchId: number | null): string | undefined {
    return branchId != null ? this.branchMap().get(branchId) : undefined;
  }
}
