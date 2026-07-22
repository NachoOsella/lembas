import { signal } from '@angular/core';
import type { Observable, Subscription } from 'rxjs';

/**
 * Page-scoped async state with cancellation and request identity protection.
 * A newer filter request always wins, even if a non-cancellable source emits late.
 */
export class ReportRequestState<T> {
  private activeSubscription: Subscription | null = null;
  private latestRequestId = 0;
  private destroyed = false;
  private retryRequest: (() => Observable<T>) | null = null;
  private retryErrorMessage = '';

  readonly data = signal<T | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  load(request: () => Observable<T>, errorMessage: string): void {
    if (this.destroyed) {
      return;
    }
    this.retryRequest = request;
    this.retryErrorMessage = errorMessage;
    this.start(request, errorMessage);
  }

  retry(): void {
    if (!this.destroyed && this.retryRequest) {
      this.start(this.retryRequest, this.retryErrorMessage);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.latestRequestId += 1;
    this.activeSubscription?.unsubscribe();
    this.activeSubscription = null;
    this.loading.set(false);
  }

  private start(request: () => Observable<T>, errorMessage: string): void {
    const requestId = ++this.latestRequestId;
    this.activeSubscription?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.activeSubscription = request().subscribe({
      next: (data) => {
        if (requestId !== this.latestRequestId) {
          return;
        }
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.latestRequestId) {
          return;
        }
        this.loading.set(false);
        this.errorMessage.set(errorMessage);
      },
    });
  }
}
