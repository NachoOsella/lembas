import type { OnDestroy } from '@angular/core';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, of, Subject, switchMap } from 'rxjs';

import { DashboardService } from '@features/dashboard/data-access/dashboard';
import { type DashboardDto, type DashboardStatCardDto } from '@features/dashboard/domain/dashboard';
import { todayDashboardIso } from '@features/dashboard/domain/dashboard-date';
import { getApiError } from '@shared/types/api-error';

/**
 * Internal state shape for the operational dashboard store.
 *
 * <p>The store keeps a flat shape so computed signals can read the exact
 * slices they care about without going through deep object paths.</p>
 */
interface DashboardState {
  data: DashboardDto | null;
  loading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
  selectedDate: string;
  autoRefreshEnabled: boolean;
  refreshIntervalMs: number;
}

type DashboardLoadResult =
  | { readonly kind: 'success'; readonly date: string; readonly data: DashboardDto }
  | { readonly kind: 'error'; readonly date: string; readonly errorCode: string };

const DEFAULT_AUTO_REFRESH_MS = 60_000;

/**
 * Signal-based store powering the operational dashboard (S4-US04).
 *
 * <p>Exposes raw data and a series of computed selectors that the template
 * consumes. The store owns the auto-refresh interval so the page component
 * can subscribe to {@link startAutoRefresh} once and forget about cleanup
 * ({@link stopAutoRefresh} is called from the {@code OnDestroy} hook).</p>
 */
@Injectable()
export class DashboardStore implements OnDestroy {
  private readonly service = inject(DashboardService);

  private readonly state = signal<DashboardState>({
    data: null,
    loading: false,
    error: null,
    lastRefreshed: null,
    selectedDate: todayDashboardIso(),
    autoRefreshEnabled: false,
    refreshIntervalMs: DEFAULT_AUTO_REFRESH_MS,
  });

  private readonly loadRequests = new Subject<string>();
  private readonly loadSubscription = this.loadRequests
    .pipe(
      // A new date or refresh cancels the previous HTTP request. This keeps
      // the selected date and rendered data aligned with the latest command.
      switchMap((date) =>
        this.service.getDashboard(date).pipe(
          map(
            (data): DashboardLoadResult => ({
              kind: 'success',
              date,
              data,
            }),
          ),
          catchError((error: unknown) =>
            of<DashboardLoadResult>({
              kind: 'error',
              date,
              errorCode: getApiError(error)?.code ?? 'INTERNAL_ERROR',
            }),
          ),
        ),
      ),
    )
    .subscribe((result) => {
      // The date guard complements switchMap in case an upstream observable
      // emits after cancellation. A response can only update its own request.
      if (result.date !== this.state().selectedDate) {
        return;
      }

      if (result.kind === 'success') {
        this.state.update((current) => ({
          ...current,
          data: result.data,
          loading: false,
          error: null,
          lastRefreshed: new Date(),
        }));
        return;
      }

      this.state.update((current) => ({
        ...current,
        loading: false,
        error: result.errorCode,
      }));
    });

  private autoRefreshHandle: ReturnType<typeof setInterval> | null = null;

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

  readonly data = computed(() => this.state().data);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly lastRefreshed = computed(() => this.state().lastRefreshed);
  readonly selectedDate = computed(() => this.state().selectedDate);
  readonly autoRefreshEnabled = computed(() => this.state().autoRefreshEnabled);

  /** All ten stat cards in display order. */
  readonly statCards = computed<DashboardStatCardDto[]>(() => {
    const d = this.state().data;
    if (!d) {
      return [];
    }
    return [
      d.todaySales,
      d.onlineSales,
      d.posSales,
      d.pendingOrders,
      d.lowStockProducts,
      d.expiringLots,
      d.todayTransactions,
      d.avgOrderValue,
      d.totalProducts,
      d.totalSuppliers,
    ];
  });

  /** Stat cards grouped in rows of 4 for the responsive grid. */
  readonly statCardRows = computed<DashboardStatCardDto[][]>(() => {
    const cards = this.statCards();
    const rows: DashboardStatCardDto[][] = [];
    for (let i = 0; i < cards.length; i += 4) {
      rows.push(cards.slice(i, i + 4));
    }
    return rows;
  });

  readonly topProducts = computed(() => this.state().data?.topProducts ?? []);
  readonly salesByHour = computed(() => this.state().data?.salesByHour ?? []);
  readonly salesByMethod = computed(() => this.state().data?.salesByMethod ?? []);

  readonly reportDate = computed(() => this.state().data?.reportDate ?? this.state().selectedDate);
  readonly branchName = computed(() => this.state().data?.branchName ?? null);

  /** Convenience: true when no stat card carries meaningful data. */
  readonly isEmpty = computed(() => {
    const cards = this.statCards();
    if (cards.length === 0) {
      return false;
    }
    return cards.every((c) => parseValueAsNumber(c.value) === 0);
  });

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * Loads the dashboard for the supplied date. When {@code date} is null the
   * server falls back to "today"; the store keeps the requested date in
   * state so a manual refresh re-uses it.
   */
  load(date?: string | null): void {
    const effectiveDate = date ?? this.state().selectedDate;
    this.state.update((current) => ({
      ...current,
      selectedDate: effectiveDate,
      loading: true,
      error: null,
    }));
    this.loadRequests.next(effectiveDate);
  }

  /** Forces a reload with the same filters as the last call. */
  refresh(): void {
    this.load(this.state().selectedDate);
  }

  /**
   * Updates the selected date and reloads. Useful when the user wants to
   * inspect a past day ("ver historico").
   */
  setDate(date: string): void {
    this.load(date);
  }

  /**
   * Starts the auto-refresh interval if it is not already running. Safe to
   * call multiple times; the second call is a no-op.
   */
  startAutoRefresh(): void {
    if (this.autoRefreshHandle !== null) {
      return;
    }
    this.state.update((current) => ({ ...current, autoRefreshEnabled: true }));
    this.autoRefreshHandle = setInterval(() => {
      this.refresh();
    }, this.state().refreshIntervalMs);
  }

  /** Stops the auto-refresh interval. Idempotent. */
  stopAutoRefresh(): void {
    if (this.autoRefreshHandle !== null) {
      clearInterval(this.autoRefreshHandle);
      this.autoRefreshHandle = null;
    }
    this.state.update((current) => ({ ...current, autoRefreshEnabled: false }));
  }

  /** Releases the page-scoped request stream and refresh timer. */
  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.loadRequests.complete();
    this.loadSubscription.unsubscribe();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a pre-formatted currency/number string back to a number for
 * comparison. Strips currency symbols, thousands separators and spaces.
 *
 * <p>The backend sends AR-style currency (e.g. {@code $ 45.230}). Parsing
 * here is best-effort: any failure falls back to {@code 0}.</p>
 */
function parseValueAsNumber(value: string): number {
  if (!value) {
    return 0;
  }
  const cleaned = value
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

