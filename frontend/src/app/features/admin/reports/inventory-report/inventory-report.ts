import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
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
import {
  inventoryCategoryExport,
  inventoryTopValueExport,
} from '@features/reports/domain/report-export';
import { mapBreakdownChart, mapReportKpis, mapSeriesChart } from '@features/reports/public-api';
import type { InventoryReportDto } from '@features/reports/domain/reports';
import { ReportRequestState } from '@features/reports/public-api';
import { AppReportFilterBar } from '@features/reports/public-api';
import { AppReportGrid } from '@features/reports/public-api';
import { AppReportPanel } from '@features/reports/public-api';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';

/** Inventory report with page-scoped branch selection and async state. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppDataTable,
    AppToast,
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
  templateUrl: './inventory-report.html',
  styleUrl: './inventory-report.css',
})
export class InventoryReportPageComponent implements OnInit, OnDestroy {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);
  private readonly requestState = new ReportRequestState<InventoryReportDto | null>();

  protected readonly branchFilter = signal<number | null>(null);
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
      (report.kpis.length > 0 || report.stockByCategory.length > 0 || report.topByValue.length > 0)
    );
  });
  protected readonly statCards = computed(() => mapReportKpis(this.data()?.kpis ?? []));
  protected readonly lowStockRows = computed(() => [...(this.data()?.lowStock ?? [])]);
  protected readonly stockChart = computed(() =>
    mapBreakdownChart(this.data()?.stockByCategory ?? []),
  );
  protected readonly expiringChart = computed(() =>
    mapSeriesChart(this.data()?.expiringByMonth ?? []),
  );
  protected readonly expiringUnits = computed(() =>
    (this.data()?.expiringByMonth ?? []).map((point) => point.secondaryValue ?? 0),
  );

  protected readonly lowStockColumns: ColumnDef[] = [
    { field: 'primary', header: 'Producto', sortable: true, width: '240px' },
    { field: 'secondary', header: 'Detalle', sortable: false, width: '280px' },
    { field: 'metric', header: 'Stock actual', sortable: true, width: '140px' },
    { field: 'submetric', header: 'Minimo', sortable: true, width: '120px' },
  ];

  ngOnInit(): void {
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.requestState.destroy();
  }

  protected onBranchChange(value: number | null): void {
    this.branchFilter.set(value);
    this.load();
  }

  protected onRefresh(): void {
    this.requestState.retry();
  }

  protected exportData() {
    return inventoryCategoryExport(this.data());
  }

  protected topByValueExport() {
    return inventoryTopValueExport(this.data());
  }

  private load(): void {
    this.requestState.load(
      () => this.reports.getInventoryReport(this.branchFilter()),
      'No se pudo cargar el reporte de inventario.',
    );
  }
}
