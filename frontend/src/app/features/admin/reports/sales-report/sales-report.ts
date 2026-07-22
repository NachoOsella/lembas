import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { DataExport } from '@shared/components/data-export/data-export';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';

import { DashboardChart } from '@features/dashboard/public-api';
import { DashboardStatCard } from '@features/dashboard/public-api';
import { ReportsService } from '@features/reports/data-access/reports';
import { currentMonthRange, toReportIsoDate } from '@features/reports/domain/report-filters';
import { salesProductsExport, salesSeriesExport } from '@features/reports/domain/report-export';
import {
  hasPositiveValue,
  mapBreakdownChart,
  mapReportKpis,
  mapSeriesChart,
} from '@features/reports/public-api';
import type { SalesReportDto } from '@features/reports/domain/reports';
import { ReportRequestState } from '@features/reports/public-api';
import { AppReportFilterBar } from '@features/reports/public-api';
import { AppReportGrid } from '@features/reports/public-api';
import { AppReportPanel } from '@features/reports/public-api';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';

/** Sales report with page-scoped filters and request state. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppToast,
    AppDatePicker,
    AppSelect,
    AppReportFilterBar,
    AppReportGrid,
    AppReportPanel,
    DashboardStatCard,
    DashboardChart,
    DataExport,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
  ],
  templateUrl: './sales-report.html',
  styleUrl: './sales-report.css',
})
export class SalesReportPageComponent implements OnInit, OnDestroy {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);
  private readonly requestState = new ReportRequestState<SalesReportDto | null>();

  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  protected readonly branchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly branchOptions = computed(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );

  protected readonly loading = this.requestState.loading;
  protected readonly errorMessage = this.requestState.errorMessage;
  protected readonly data = this.requestState.data;
  protected readonly hasData = computed(() => {
    const report = this.data();
    return (
      !!report &&
      (report.kpis.length > 0 ||
        report.series.some((point) => point.value > 0) ||
        report.byMethod.length > 0 ||
        report.topProducts.length > 0)
    );
  });
  protected readonly statCards = computed(() => mapReportKpis(this.data()?.kpis ?? []));
  protected readonly seriesChart = computed(() => mapSeriesChart(this.data()?.series ?? []));
  protected readonly methodChart = computed(() => mapBreakdownChart(this.data()?.byMethod ?? []));
  protected readonly categoryChart = computed(() =>
    mapBreakdownChart(this.data()?.byCategory ?? []),
  );
  protected readonly seriesHasValues = computed(() => hasPositiveValue(this.seriesChart().values));
  protected readonly totalRevenue = computed(() => this.data()?.kpis[0]?.value ?? '$ 0');

  ngOnInit(): void {
    const range = currentMonthRange();
    this.fromDate.set(range.from);
    this.toDate.set(range.to);
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.requestState.destroy();
  }

  protected onFromChange(date: Date | null): void {
    this.fromDate.set(date);
    this.load();
  }

  protected onToChange(date: Date | null): void {
    this.toDate.set(date);
    this.load();
  }

  protected onBranchChange(branchId: number | null): void {
    this.branchId.set(branchId);
    this.load();
  }

  protected onClearFilters(): void {
    const range = currentMonthRange();
    this.fromDate.set(range.from);
    this.toDate.set(range.to);
    this.branchId.set(null);
    this.load();
  }

  protected onRefresh(): void {
    this.requestState.retry();
  }

  protected exportData() {
    return salesSeriesExport(this.data());
  }

  protected topProductsExport() {
    return salesProductsExport(this.data());
  }

  private load(): void {
    this.requestState.load(
      () =>
        this.reports.getSalesReport(
          toReportIsoDate(this.fromDate()),
          toReportIsoDate(this.toDate()),
          this.branchId(),
        ),
      'No se pudo cargar el reporte de ventas.',
    );
  }
}
