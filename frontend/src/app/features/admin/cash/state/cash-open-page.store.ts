import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';

import { ErrorMappingService } from '@core/services/error-mapping';
import { CashService } from '@features/cash/data-access/cash';
import type { CashSessionDto, OpenCashSessionRequest } from '@features/cash/domain/cash-session';
import { cashViewState, type CashViewState } from '@features/cash/public-api';
import { getApiError } from '@shared/types/api-error';
import type { Branch } from '@features/users/domain/user';
import { UserService } from '@features/users/data-access/user';

/** Page-scoped state for branch resolution and cash-session opening. */
@Injectable()
export class CashOpenPageStore {
  private readonly cashService = inject(CashService);
  private readonly userService = inject(UserService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private branchSubscription: Subscription | null = null;
  private sessionSubscription: Subscription | null = null;
  private latestSessionRequest = 0;
  private latestBranchRequest = 0;
  private lastRequestedBranchId: number | null = null;

  private readonly _loading = signal(true);
  private readonly _loadingBranches = signal(false);
  private readonly _saving = signal(false);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _branchId = signal<number | null>(null);
  private readonly _branches = signal<Branch[]>([]);
  private readonly _session = signal<CashSessionDto | null>(null);
  private readonly _openedSession = signal<CashSessionDto | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly loadingBranches = this._loadingBranches.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly branchId = this._branchId.asReadonly();
  readonly branches = this._branches.asReadonly();
  readonly session = this._session.asReadonly();
  readonly openedSession = this._openedSession.asReadonly();
  readonly viewState = computed<CashViewState>(() =>
    cashViewState(this._loading(), this._errorMessage(), this._branchId() !== null),
  );
  readonly hasReadyForm = computed(
    () => !this._loading() && this._errorMessage() === null && this._branchId() !== null,
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.latestSessionRequest += 1;
      this.latestBranchRequest += 1;
      this.branchSubscription?.unsubscribe();
      this.sessionSubscription?.unsubscribe();
    });
  }

  /** Loads active branches for ADMIN and resolves an optional requested branch. */
  loadBranches(requestedBranchId: number | null): void {
    this.lastRequestedBranchId = requestedBranchId;
    const requestId = ++this.latestBranchRequest;
    this.branchSubscription?.unsubscribe();
    this._loading.set(true);
    this._loadingBranches.set(true);
    this._errorMessage.set(null);

    this.branchSubscription = this.userService
      .listBranches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branches) => {
          if (requestId !== this.latestBranchRequest) {
            return;
          }
          this._branches.set(branches);
          this._loadingBranches.set(false);
          const requestedExists =
            requestedBranchId !== null &&
            branches.some((branch) => branch.id === requestedBranchId);
          const selectedBranchId = requestedExists
            ? requestedBranchId
            : branches.length === 1
              ? branches[0].id
              : null;
          this.selectBranch(selectedBranchId);
        },
        error: (error: unknown) => {
          if (requestId !== this.latestBranchRequest) {
            return;
          }
          this._loadingBranches.set(false);
          this._loading.set(false);
          this._errorMessage.set(
            this.messageForError(error, 'No se pudieron cargar las sucursales.'),
          );
        },
      });
  }

  /** Resolves the assigned branch for MANAGER/EMPLOYEE users. */
  selectAssignedBranch(branchId: number | null): void {
    if (branchId === null) {
      this._loading.set(false);
      this._errorMessage.set(this.errorMapping.getMessage('INVALID_USER_BRANCH'));
      return;
    }
    this.selectBranch(branchId);
  }

  /** Checks the current open session for a selected branch. */
  selectBranch(branchId: number | null): void {
    this._branchId.set(branchId);
    this._session.set(null);
    this._errorMessage.set(null);
    this.sessionSubscription?.unsubscribe();

    if (branchId === null) {
      this._loading.set(false);
      return;
    }

    const requestId = ++this.latestSessionRequest;
    this._loading.set(true);
    this.sessionSubscription = this.cashService
      .currentSession(branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          if (requestId !== this.latestSessionRequest) {
            return;
          }
          this._loading.set(false);
          this._session.set(session);
          this.messageService.add({
            severity: 'info',
            summary: 'Caja ya abierta',
            detail: 'Te llevamos al detalle de la caja abierta.',
          });
        },
        error: (error: unknown) => {
          if (requestId !== this.latestSessionRequest) {
            return;
          }
          this._loading.set(false);
          const apiError = getApiError(error);
          if (apiError?.code === 'CASH_SESSION_NOT_FOUND') {
            return;
          }
          if (apiError?.code === 'CASH_BRANCH_REQUIRED') {
            return;
          }
          this._errorMessage.set(
            this.messageForError(error, 'No se pudo verificar el estado de la caja.'),
          );
        },
      });
  }

  /** Retries the branch/session read using the current selection. */
  retry(): void {
    if (this._branches().length === 0) {
      this.loadBranches(this.lastRequestedBranchId);
      return;
    }
    this.selectBranch(this._branchId());
  }

  /** Sends the open command; the backend remains the authority for uniqueness. */
  openSession(request: OpenCashSessionRequest): void {
    if (this._saving()) {
      return;
    }
    this._saving.set(true);
    this._errorMessage.set(null);
    this.cashService
      .openSession(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this._saving.set(false);
          this._openedSession.set(session);
        },
        error: (error: unknown) => {
          this._saving.set(false);
          this._errorMessage.set(this.messageForError(error, 'No se pudo abrir la caja.'));
        },
      });
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) {
      return fallback;
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(apiError);
    }
    return this.errorMapping.getMessage(apiError.code, fallback);
  }
}
