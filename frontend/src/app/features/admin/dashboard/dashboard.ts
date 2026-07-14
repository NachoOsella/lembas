import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppToast } from '../../../shared/components/app-toast/app-toast';
import { AppDatePicker } from '../../../shared/components/app-date-picker/app-date-picker';
import { AppReportFilterBar } from '../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { AppReportSectionHead } from '../../../shared/components/app-report-section-head/app-report-section-head';
import { DashboardStatCard } from '../../../shared/components/dashboard-stat-card/dashboard-stat-card';
import { DashboardChart } from '../../../shared/components/dashboard-chart/dashboard-chart';
import { DataExport, ExportData } from '../../../shared/components/data-export/data-export';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { RecommendationCard } from '../../../shared/components/recommendation-card/recommendation-card';
import { TopProductsTable } from '../../../shared/components/top-products-table/top-products-table';

import { ErrorMappingService } from '../../../core/services/error-mapping';
import { DashboardStore } from '../../../core/stores/dashboard.store';
import { RecommendationService } from '../../../core/services/recommendation';
import { RecommendationDto } from '../../../shared/models/recommendation';
import { TopProductDto } from '../../../shared/models/dashboard';

/**
 * Operational dashboard page (S4-US04 + S4-US06 mini panel).
 *
 * <p>Composes the data from {@link DashboardStore} with the chart, top
 * products table, stat card grid and the recommendations mini panel. The
 * component is responsible for lifecycle (start/stop auto-refresh) and
 * delegates the data plumbing to the store.</p>
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    AppButton,
    AppPageHeader,
    AppToast,
    AppDatePicker,
    AppReportFilterBar,
    AppReportSectionHead,
    DashboardStatCard,
    DashboardChart,
    DataExport,
    ErrorAlert,
    LoadingSpinner,
    RecommendationCard,
    TopProductsTable,
    DatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly store = inject(DashboardStore);
  private readonly recommendationService = inject(RecommendationService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly router = inject(Router);
  // Dashboard data selectors (read-only accessors to the store signals).
  protected readonly data = this.store.data;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly lastRefreshed = this.store.lastRefreshed;
  protected readonly reportDate = this.store.reportDate;
  protected readonly branchName = this.store.branchName;

  /** The currently selected date as a {@code Date} object (for the picker). */
  protected readonly selectedDateAsDate = computed(() => {
    const iso = this.store.selectedDate();
    const [y, m, d] = iso.split('-').map((n) => Number(n));
    if (!y || !m || !d) {
      return new Date();
    }
    return new Date(y, m - 1, d);
  });

  /** Maximum date the user can pick (today). */
  protected readonly today = signal(new Date());

  /**
   * Pulses the "live" indicator dot while the dashboard is refreshing,
   * so the user can see at a glance when the data is current.
   */
  protected readonly liveRefresh = computed(() => this.loading());

  /**
   * Top 6 stat cards, skipping the less actionable ones (onlineSales,
   * posSales, totalProducts, totalSuppliers) so the dashboard stays
   * focused on daily-operational KPIs.
   */
  protected readonly compactCards = computed(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return [
      data.todaySales,
      data.todayTransactions,
      data.avgOrderValue,
      data.pendingOrders,
      data.lowStockProducts,
      data.expiringLots,
    ];
  });
  protected readonly topProducts = this.store.topProducts;
  protected readonly salesByHour = this.store.salesByHour;
  protected readonly salesByMethod = this.store.salesByMethod;

  // Local state for the recommendations mini panel.
  protected readonly dashboardRecommendations = signal<RecommendationDto[]>([]);
  protected readonly recommendationsLoading = signal(true);

  /** Whether there is any chart data to display. */
  protected readonly hasChartData = computed(() => {
    const hasHourData = this.hourRevenue().some((v) => v > 0);
    const hasMethodData = this.methodAmounts().length > 0;
    return hasHourData || hasMethodData;
  });

  /** Charts: pre-shaped series. */
  protected readonly hourLabels = computed(() => this.salesByHour().map((h) => String(h.hour)));
  protected readonly hourRevenue = computed(() => this.salesByHour().map((h) => h.totalRevenue));
  protected readonly hourOnlineOrders = computed(() =>
    this.salesByHour().map((h) => h.onlineOrders),
  );
  protected readonly hourPosOrders = computed(() => this.salesByHour().map((h) => h.posOrders));
  protected readonly methodLabels = computed(() => this.salesByMethod().map((m) => m.methodLabel));
  protected readonly methodAmounts = computed(() => this.salesByMethod().map((m) => m.totalAmount));

  ngOnInit(): void {
    this.store.load();
    this.store.startAutoRefresh();
    this.fetchRecommendations();
  }

  ngOnDestroy(): void {
    this.store.stopAutoRefresh();
  }

  protected onRefresh(): void {
    this.store.refresh();
    this.fetchRecommendations();
  }

  protected onGoToRecommendations(): void {
    void this.router.navigate(['/admin/recommendations']);
  }

  /** Forwards a Date change from the picker to the store as an ISO string. */
  protected onDateChange(date: Date | null): void {
    if (!date) {
      return;
    }
    this.store.setDate(toIsoDate(date));
    this.fetchRecommendations();
  }

  /** Jumps the date back to "today". */
  protected onGoToToday(): void {
    const now = new Date();
    this.today.set(now);
    this.store.setDate(toIsoDate(now));
    this.fetchRecommendations();
  }

  /** Builds the CSV export payload for the top products table. */
  protected topProductsExport(): ExportData {
    return {
      filename: 'productos_top',
      columns: [
        { key: 'position', label: '#' },
        { key: 'productId', label: 'ID' },
        { key: 'productName', label: 'Producto' },
        { key: 'barcode', label: 'Codigo' },
        { key: 'categoryName', label: 'Categoria' },
        { key: 'brandName', label: 'Marca' },
        { key: 'quantitySold', label: 'Cantidad' },
        { key: 'totalRevenue', label: 'Total' },
        { key: 'averagePrice', label: 'Precio prom.' },
      ],
      rows: this.topProducts().map((row: TopProductDto) => ({
        position: row.position,
        productId: row.productId,
        productName: row.productName,
        barcode: row.barcode ?? '',
        categoryName: row.categoryName ?? '',
        brandName: row.brandName ?? '',
        quantitySold: row.quantitySold,
        totalRevenue: row.totalRevenue.toFixed(2),
        averagePrice: row.averagePrice.toFixed(2),
      })),
    };
  }

  protected get friendlyError(): string {
    return this.error()
      ? this.errorMapping.getMessage('INTERNAL_ERROR', this.error() ?? undefined)
      : '';
  }

  private fetchRecommendations(): void {
    this.recommendationsLoading.set(true);
    this.recommendationService.getDashboardPanel().subscribe({
      next: (recs) => {
        this.dashboardRecommendations.set(recs);
        this.recommendationsLoading.set(false);
      },
      error: () => {
        this.dashboardRecommendations.set([]);
        this.recommendationsLoading.set(false);
      },
    });
  }
}

function toIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
