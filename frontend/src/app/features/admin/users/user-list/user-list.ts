import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';

import { UserService } from '../../../../core/services/user';
import { Branch, UserResponse } from '../../../../shared/models/user';
import { ColumnDef } from '../../../../shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppDataTable } from '../../../../shared/components/app-data-table/app-data-table';
import {
  AppMetricItem,
  AppMetricStrip,
} from '../../../../shared/components/app-metric-strip/app-metric-strip';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppSearchBar } from '../../../../shared/components/app-search-bar/app-search-bar';

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

/** Column definitions for the users data table. */
const USER_COLUMNS: ColumnDef[] = [
  { field: 'firstName', header: 'Nombre', sortable: true, width: '18%' },
  { field: 'email', header: 'Email', sortable: true, width: '22%' },
  { field: 'role', header: 'Rol', sortable: true, width: '14%' },
  { field: 'branchId', header: 'Sucursal', sortable: false, width: '14%' },
  { field: 'enabled', header: 'Estado', sortable: true, width: '12%' },
  { field: 'id', header: 'Acciones', sortable: false, width: '20%' },
];

@Component({
  selector: 'app-user-list',
  imports: [
    FormsModule,
    ToggleSwitch,
    ButtonDirective,
    Ripple,
    AppPageHeader,
    AppDataTable,
    AppMetricStrip,
    AppButton,
    AppBadge,
    AppSearchBar,
  ],
  templateUrl: './user-list.html',
  styleUrl: '../users.css',
})
/** Displays the internal user directory with search, metrics, and status toggling. */
export class UserList implements OnInit {
  /** Emitted when the "Crear usuario" button is clicked. */
  readonly createUser = output<void>();

  /** Emitted when a user row's edit button is clicked. */
  readonly editUser = output<UserResponse>();

  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  // ---------------------------------------------------------------------------
  // Data state
  // ---------------------------------------------------------------------------
  protected readonly users = signal<UserResponse[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly loading = signal(false);

  /** Branch ID -> name map for display in the table. */
  readonly branchName = input<((id: number | null) => string | undefined) | undefined>();

  // ---------------------------------------------------------------------------
  // Search state
  // ---------------------------------------------------------------------------
  protected readonly searchQuery = signal('');

  protected readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.users();
    if (!query) return all;

    return all.filter((user) => {
      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase();
      const email = user.email.toLowerCase();
      const role = this.roleLabel(user.role).toLowerCase();
      const branchNameFn = this.branchName();
      const branch = (branchNameFn ? branchNameFn(user.branchId) : '')?.toLowerCase() ?? '';

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
    if (query) return `No se encontraron usuarios que coincidan con "${query}".`;
    return 'Cree el primer usuario interno para comenzar.';
  });

  protected readonly userColumns = USER_COLUMNS;

  /** Operational metrics for the metric strip. */
  protected readonly userMetrics = computed<readonly AppMetricItem[]>(() => {
    const list = this.users();
    const enabled = list.filter((u) => u.enabled).length;
    const branchBound = list.filter((u) => u.branchId != null).length;

    return [
      {
        label: 'Usuarios',
        value: list.length,
        detail: 'internos cargados',
        icon: 'pi pi-users',
        tone: 'forest',
      },
      {
        label: 'Activos',
        value: enabled,
        detail: `${list.length - enabled} inactivos`,
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
      error: () => this.loading.set(false),
    });
  }

  /** Exposed so parent can refresh after user changes. */
  refresh(): void {
    this.loadUsers();
  }

  private loadBranches(): void {
    this.userService.listBranches().subscribe({
      next: (b) => this.branches.set(b),
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
  // Status toggle
  // ---------------------------------------------------------------------------
  protected toggleStatus(user: UserResponse): void {
    const newStatus = !user.enabled;
    this.userService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.messageService.add({
          severity: 'success',
          summary: newStatus ? 'Usuario habilitado' : 'Usuario deshabilitado',
          detail: `${user.email} ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente.`,
        });
      },
      error: () => this.loadUsers(),
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
}
