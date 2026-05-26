import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';

import { UserService } from '../../../../core/services/user';
import { Branch, UserResponse } from '../../../../shared/models/user';
import { ColumnDef } from '../../../../shared/components/app-data-table/app-data-table';
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
    AppDataTable,
    AppMetricStrip,
    AppButton,
    AppBadge,
    AppSearchBar,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
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
  protected readonly first = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly metrics = signal({ totalUsers: 0, enabledUsers: 0, usersWithBranch: 0 });

  /** Branch ID -> name map for display in the table. */
  readonly branchName = input<((id: number | null) => string | undefined) | undefined>();

  // ---------------------------------------------------------------------------
  // Search state
  // ---------------------------------------------------------------------------
  protected readonly searchQuery = signal('');

  protected readonly emptyDescription = computed(() => {
    const query = this.searchQuery().trim();
    if (query) return `No se encontraron usuarios que coincidan con "${query}".`;
    return 'Cree el primer usuario interno para comenzar.';
  });

  protected readonly displayTotalRecords = computed(() => this.totalRecords());

  protected readonly userColumns = USER_COLUMNS;

  /** Operational metrics for the metric strip. */
  protected readonly userMetrics = computed<readonly AppMetricItem[]>(() => {
    const m = this.metrics();
    return [
      {
        label: 'Usuarios',
        value: m.totalUsers,
        detail: 'internos cargados',
        icon: 'pi pi-users',
        tone: 'forest',
      },
      {
        label: 'Activos',
        value: m.enabledUsers,
        detail: `${m.totalUsers - m.enabledUsers} inactivos`,
        icon: 'pi pi-shield',
        tone: 'sage',
      },
      {
        label: 'Sucursales',
        value: m.usersWithBranch,
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
    this.loadMetrics();
    this.loadBranches();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  protected loadMetrics(): void {
    this.userService.getUserMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Metricas no disponibles',
          detail: 'No se pudieron cargar las metricas de usuarios.',
        });
      },
    });
  }

  protected loadUsers(): void {
    const page = Math.floor(this.first() / this.pageSize());
    this.loading.set(true);
    this.userService.listUsers(undefined, undefined, page, this.pageSize(), this.searchQuery()).subscribe({
      next: (response) => {
        this.users.set(response.content);
        this.totalRecords.set(response.totalElements);
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
    this.first.set(0);
    this.searchQuery.set(query);
    this.loadUsers();
  }

  protected onSearchClear(): void {
    this.first.set(0);
    this.searchQuery.set('');
    this.loadUsers();
  }

  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.pageSize.set(event.rows);
    this.loadUsers();
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
