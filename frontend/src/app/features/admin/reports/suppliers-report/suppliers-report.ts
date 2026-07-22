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
import { toReportIsoDate, trailingDaysRange } from '@features/reports/domain/report-filters';
import {
  suppliersLeadTimeExport,
  suppliersPurchasesExport,
  suppliersTopExport,
} from '@features/reports/domain/report-export';
import { mapReportKpis, mapSeriesChart } from '@features/reports/public-api';
import type { SuppliersReportDto } from '@features/reports/domain/reports';
import { ReportRequestState } from '@features/reports/public-api';
import { AppReportFilterBar } from '@features/reports/public-api';
import { AppReportGrid } from '@features/reports/public-api';
import { AppReportPanel } from '@features/reports/public-api';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';

/** Supplier report with filters isolated from request and presentation state. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-suppliers-report',
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
  templateUrl: './suppliers-report.html',
  styleUrl: './suppliers-report.css',
})
export class SuppliersReportPageComponent implements OnInit, OnDestroy {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);
  private readonly requestState = new ReportRequestState<SuppliersReportDto | null>();

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
      (report.purchasesByMonth.some(
        (point) => point.value > 0 || (point.secondaryValue ?? 0) > 0,
      ) ||
        report.topByVolume.length > 0 ||
        report.leadTimeBySupplier.length > 0)
    );
  });
  protected readonly statCards = computed(() => mapReportKpis(this.data()?.kpis ?? []));
  protected readonly purchasesChart = computed(() =>
    mapSeriesChart(this.data()?.purchasesByMonth ?? []),
  );
  protected readonly purchaseOrders = computed(() =>
    (this.data()?.purchasesByMonth ?? []).map((point) => point.secondaryValue ?? 0),
  );

  ngOnInit(): void {
    this.resetDateRange();
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
    this.resetDateRange();
    this.branchId.set(null);
    this.load();
  }

  protected onRefresh(): void {
    this.requestState.retry();
  }

  protected exportData() {
    return suppliersPurchasesExport(this.data());
  }

  protected topSuppliersExport() {
    return suppliersTopExport(this.data());
  }

  protected leadTimeExport() {
    return suppliersLeadTimeExport(this.data());
  }

  private resetDateRange(): void {
    const range = trailingDaysRange(90);
    this.fromDate.set(range.from);
    this.toDate.set(range.to);
  }

  private load(): void {
    this.requestState.load(
      () =>
        this.reports.getSuppliersReport(
          toReportIsoDate(this.fromDate()),
          toReportIsoDate(this.toDate()),
          this.branchId(),
        ),
      'No se pudo cargar el reporte de proveedores.',
    );
  }
}
