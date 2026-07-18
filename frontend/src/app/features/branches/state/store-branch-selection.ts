import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

import type { StoreBranch } from '@features/branches/domain/branch';

/** Local storage key for the selected public store pickup branch. */
const SELECTED_BRANCH_STORAGE_KEY = 'lembas.store.selectedBranchId';

/**
 * Holds the customer-facing pickup branch selection for the public store.
 *
 * The service loads public active branches, automatically selects the only
 * branch when the backend returns a single option, and persists explicit user
 * choices so catalog stock requests can include the selected branch id.
 */
@Injectable({ providedIn: 'root' })
export class StoreBranchSelectionService {
  private readonly http = inject(HttpClient);
  private readonly branchesUrl = '/api/store/branches';

  readonly branches = signal<StoreBranch[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly selectedBranchId = signal<number | null>(this.loadStoredBranchId());

  /** Selected branch object, or null when no valid selection exists. */
  readonly selectedBranch = computed(() => {
    const id = this.selectedBranchId();
    if (id == null) return null;
    return this.branches().find((branch) => branch.id === id) ?? null;
  });

  /** Whether the UI should ask the user to choose a branch. */
  readonly needsSelection = computed(
    () => !this.loading() && !this.error() && this.branches().length > 1 && !this.selectedBranch(),
  );

  /** Loads public active branches and reconciles the persisted selection. */
  loadBranches(): Observable<StoreBranch[]> {
    this.loading.set(true);
    this.error.set(false);

    return this.http.get<StoreBranch[]>(this.branchesUrl).pipe(
      tap({
        next: (branches) => {
          this.branches.set(branches);
          this.reconcileSelection(branches);
          this.loading.set(false);
        },
        error: () => {
          this.branches.set([]);
          this.error.set(true);
          this.loading.set(false);
        },
      }),
    );
  }

  /** Persists a customer-selected pickup branch. */
  selectBranch(branchId: number | null): void {
    const branch = branchId == null ? null : this.branches().find((item) => item.id === branchId);
    if (!branch) {
      this.clearSelection();
      return;
    }

    this.selectedBranchId.set(branch.id);
    this.storage()?.setItem(SELECTED_BRANCH_STORAGE_KEY, String(branch.id));
  }

  /** Clears the branch selection and persisted value. */
  clearSelection(): void {
    this.selectedBranchId.set(null);
    this.storage()?.removeItem(SELECTED_BRANCH_STORAGE_KEY);
  }

  /** Keeps persisted branch ids valid and auto-selects single-branch stores. */
  private reconcileSelection(branches: StoreBranch[]): void {
    if (branches.length === 1) {
      this.selectBranch(branches[0].id);
      return;
    }

    const selectedId = this.selectedBranchId();
    if (selectedId != null && branches.some((branch) => branch.id === selectedId)) {
      return;
    }

    this.clearSelection();
  }

  /** Reads a previously selected branch id from local storage. */
  private loadStoredBranchId(): number | null {
    const value = this.storage()?.getItem(SELECTED_BRANCH_STORAGE_KEY);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Safely accesses browser storage; tests/SSR may not provide localStorage. */
  private storage(): Storage | null {
    return globalThis.localStorage ?? null;
  }
}
