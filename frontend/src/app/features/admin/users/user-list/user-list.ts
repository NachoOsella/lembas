import type { OnInit } from '@angular/core';
import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MessageService } from 'primeng/api';

import {
  buildUserSort,
  userEmptyDescription,
  userRoleLabel,
  userRoleTone,
  type UserBadgeTone,
} from './user-list.helpers';
import { UserService } from '@features/users/data-access/user';
import type { Branch, UserResponse } from '@features/users/domain/user';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppBadge } from '@shared/components/app-badge/app-badge';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSearchBar } from '@shared/components/app-search-bar/app-search-bar';
import { AppToggleSwitch } from '@shared/components/app-toggle-switch/app-toggle-switch';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-list',
  imports: [AppDataTable, AppButton, AppBadge, AppPageHeader, AppSearchBar, AppToggleSwitch],
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
  protected readonly sortField = signal<string | undefined>(undefined);
  protected readonly sortOrder = signal<number | undefined>(undefined);
  /** Branch ID -> name map for display in the table. */
  readonly branchName = input<((id: number | null) => string | undefined) | undefined>();

  // ---------------------------------------------------------------------------
  // Search state
  // ---------------------------------------------------------------------------
  protected readonly searchQuery = signal('');

  protected readonly emptyDescription = computed(() => userEmptyDescription(this.searchQuery()));

  protected readonly displayTotalRecords = computed(() => this.totalRecords());

  protected readonly userColumns = USER_COLUMNS;

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
    const page = Math.floor(this.first() / this.pageSize());
    const sort = this.buildSortParam();
    this.loading.set(true);
    this.userService
      .listUsers(undefined, undefined, page, this.pageSize(), this.searchQuery(), sort)
      .subscribe({
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

  protected onSort(event: { field: string; order: number }): void {
    this.first.set(0);

    const sort = buildUserSort(event.field, event.order);
    if (!sort) {
      this.sortField.set(undefined);
      this.sortOrder.set(undefined);
      this.loadUsers();
      return;
    }

    this.sortField.set(event.field);
    this.sortOrder.set(event.order);
    this.loadUsers();
  }

  /** Builds the Spring Data sort parameter from the current validated table state. */
  private buildSortParam(): string | undefined {
    return buildUserSort(this.sortField(), this.sortOrder());
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
  protected roleTone(role: string): UserBadgeTone {
    return userRoleTone(role);
  }

  protected roleLabel(role: string): string {
    return userRoleLabel(role);
  }
}
