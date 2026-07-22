import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { CashService } from '@features/cash/data-access/cash';
import type {
  CashCloseRequestPayload,
  CashEntryDto,
  CashSessionDto,
  CashTotalsByMethod,
} from '@features/cash/domain/cash-session';
import { cashViewState, type CashViewState } from '@features/cash/public-api';
import { getApiError } from '@shared/types/api-error';

/** Page-scoped state for the close read and close command. */
@Injectable()
export class CashClosePageStore {
  private readonly cashService = inject(CashService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly destroyRef = inject(DestroyRef);

  private activeRead: Subscription | null = null;
  private latestRequestId = 0;
  private sessionId: number | null = null;

  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _session = signal<CashSessionDto | null>(null);
  private readonly _entries = signal<CashEntryDto[]>([]);
  private readonly _totalsByMethod = signal<CashTotalsByMethod | null>(null);
  private readonly _closedSession = signal<CashSessionDto | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly session = this._session.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly totalsByMethod = this._totalsByMethod.asReadonly();
  readonly closedSession = this._closedSession.asReadonly();
  readonly viewState = computed<CashViewState>(() =>
    cashViewState(this._loading(), this._errorMessage(), this._session() !== null),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.latestRequestId += 1;
      this.activeRead?.unsubscribe();
    });
  }

  /** Loads close data and ignores stale responses from superseded reads. */
  load(sessionId: number): void {
    this.sessionId = sessionId;
    const requestId = ++this.latestRequestId;
    this.activeRead?.unsubscribe();
    this._loading.set(true);
    this._errorMessage.set(null);
    this._closedSession.set(null);

    this.activeRead = this.cashService
      .getById(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          if (requestId !== this.latestRequestId) {
            return;
          }
          this._session.set(session);
          this._entries.set(session.entries ?? []);
          this._totalsByMethod.set(session.totalsByMethod ?? null);
          this._loading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.latestRequestId) {
            return;
          }
          this._loading.set(false);
          this._errorMessage.set(this.messageForError(error, 'No se pudo cargar la caja.'));
        },
      });
  }

  /** Stores a controlled route error without starting an HTTP request. */
  setInvalidRouteError(message: string): void {
    this._loading.set(false);
    this._errorMessage.set(message);
  }

  /** Reloads the last requested session after a recoverable read failure. */
  refresh(): void {
    if (this.sessionId !== null) {
      this.load(this.sessionId);
    }
  }

  /** Stores the authoritative closed response after a successful close command. */
  closeSession(request: CashCloseRequestPayload): void {
    if (this._saving() || this.sessionId === null) {
      return;
    }
    this._saving.set(true);
    this._errorMessage.set(null);
    this.cashService
      .closeSession(this.sessionId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this._saving.set(false);
          this._closedSession.set(session);
          this._session.set(session);
        },
        error: (error: unknown) => {
          this._saving.set(false);
          this._errorMessage.set(this.messageForError(error, 'No se pudo cerrar la caja.'));
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
