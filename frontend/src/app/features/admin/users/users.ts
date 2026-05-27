import { Component, inject, signal, computed, viewChild } from '@angular/core';

import { UserService } from '../../../core/services/user';
import { Branch, UserResponse } from '../../../shared/models/user';
import { AppToast } from '../../../shared/components/app-toast/app-toast';
import { UserList } from './user-list/user-list';
import { UserForm } from './user-form/user-form';

@Component({
  selector: 'app-users',
  imports: [AppToast, UserList, UserForm],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
/** Users page orchestrator: owns shared data (branches, branchMap) and wires UserList + UserForm. */
export class Users {
  private readonly userService = inject(UserService);

  /** Child component references for programmatic interaction. */
  private readonly listComponent = viewChild.required(UserList);
  private readonly formComponent = viewChild.required(UserForm);

  protected readonly branches = signal<Branch[]>([]);

  /** Branch ID -> name map used by the list table. */
  protected readonly branchMap = computed(() => {
    const map = new Map<number, string>();
    for (const b of this.branches()) {
      map.set(b.id, b.name);
    }
    return map;
  });

  /** Branch name lookup function passed down to UserList. */
  protected readonly branchNameFn = (branchId: number | null): string | undefined =>
    branchId != null ? this.branchMap().get(branchId) : undefined;

  constructor() {
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
    });
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  protected onOpenCreate(): void {
    this.formComponent().openCreate();
  }

  protected onOpenEdit(user: UserResponse): void {
    this.formComponent().openEdit(user);
  }

  protected onSaved(): void {
    this.listComponent().refresh();
  }
}
