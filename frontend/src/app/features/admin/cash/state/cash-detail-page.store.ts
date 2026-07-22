import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { CashService } from '@features/cash/data-access/cash';
import type { CashEntryDto, CashSessionDto } from '@features/cash/domain/cash-session';
import { cashViewState, type CashViewState } from '@features/cash/public-api';
import { getApiError } from '@shared/types/api-error';

/** Page-scoped read state for the current cash-session detail. */
@Injectable()
export class CashDetailPageStore {
  private readonly cashService = inject(CashService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly destroyRef = inject(DestroyRef);

  private activeRead: Subscription | null = null;
  private latestRequestId = 0;
  private currentSessionId: number | null = null;

  private readonly _loading = signal(false);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _session = signal<CashSessionDto | null>(null);
  private readonly _entries = signal<CashEntryDto[]>([]);

  readonly loading = this._loading.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly session = this._session.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly viewState = computed<CashViewState>(() =>
    cashViewState(this._loading(), this._errorMessage(), this._session() !== null),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.latestRequestId += 1;
      this.activeRead?.unsubscribe();
    });
  }

  /** Loads a session and ignores late emissions from superseded reads. */
  load(sessionId: number): void {
    this.currentSessionId = sessionId;
    const requestId = ++this.latestRequestId;
    this.activeRead?.unsubscribe();
    this._loading.set(true);
    this._errorMessage.set(null);

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

  /** Reloads the last requested session after a successful movement. */
  refresh(): void {
    if (this.currentSessionId !== null) {
      this.load(this.currentSessionId);
    }
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
