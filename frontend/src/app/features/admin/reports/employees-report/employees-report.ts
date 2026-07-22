import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
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
import { employeesExport } from '@features/reports/domain/report-export';
import {
  employeeRoleLabel,
  hasPositiveValue,
  mapEmployeeRevenueChart,
  mapReportKpis,
} from '@features/reports/public-api';
import type { EmployeePerformanceDto, EmployeeReportDto } from '@features/reports/domain/reports';
import { ReportRequestState } from '@features/reports/public-api';
import { AppReportFilterBar } from '@features/reports/public-api';
import { AppReportGrid } from '@features/reports/public-api';
import { AppReportPanel } from '@features/reports/public-api';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';

/** Employee performance report based on attributable POS and cash activity. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-employees-report',
  imports: [
    AppButton,
    AppDataTable,
    AppDatePicker,
    AppPageHeader,
    AppReportFilterBar,
    AppReportGrid,
    AppReportPanel,
    AppSelect,
    AppToast,
    CurrencyArPipe,
    DashboardChart,
    DashboardStatCard,
    DataExport,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
  ],
  templateUrl: './employees-report.html',
  styleUrl: './employees-report.css',
})
export class EmployeesReportPageComponent implements OnInit, OnDestroy {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);
  private readonly requestState = new ReportRequestState<EmployeeReportDto | null>();

  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  protected readonly branchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly loading = this.requestState.loading;
  protected readonly errorMessage = this.requestState.errorMessage;
  protected readonly data = this.requestState.data;
  protected readonly branchOptions = computed(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly rows = computed<EmployeePerformanceDto[]>(() => [
    ...(this.data()?.employees ?? []),
  ]);
  protected readonly hasData = computed(() => this.rows().length > 0);
  protected readonly revenueChart = computed(() => mapEmployeeRevenueChart(this.rows()));
  protected readonly salesValues = computed(() => this.rows().map((row) => row.posSalesCount));
  protected readonly differenceValues = computed(() =>
    this.rows().map((row) => row.cashDifferenceAbsolute),
  );
  protected readonly hasPerformanceData = computed(
    () => hasPositiveValue(this.revenueChart().values) || hasPositiveValue(this.salesValues()),
  );
  protected readonly hasCashDifferenceData = computed(() =>
    hasPositiveValue(this.differenceValues()),
  );
  protected readonly totalRevenue = computed(() =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(this.revenueChart().values.reduce((total, value) => total + value, 0)),
  );
  protected readonly statCards = computed(() => mapReportKpis(this.data()?.kpis ?? []));

  protected readonly columns: ColumnDef[] = [
    { field: 'employeeName', header: 'Operador', sortable: true },
    { field: 'role', header: 'Rol', sortable: true, width: '120px' },
    { field: 'posSalesCount', header: 'Ventas POS', sortable: true, width: '120px' },
    { field: 'posRevenue', header: 'Facturacion POS', sortable: true, width: '150px' },
    { field: 'averageTicket', header: 'Ticket promedio', sortable: true, width: '150px' },
    { field: 'cashSessionsOpened', header: 'Aperturas', sortable: true, width: '110px' },
    { field: 'cashSessionsClosed', header: 'Cierres', sortable: true, width: '100px' },
    { field: 'cashDifferenceAbsolute', header: 'Desvios abs.', sortable: true, width: '140px' },
  ];

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
    return employeesExport(this.rows());
  }

  protected roleLabel(role: string): string {
    return employeeRoleLabel(role);
  }

  private resetDateRange(): void {
    const range = currentMonthRange();
    this.fromDate.set(range.from);
    this.toDate.set(range.to);
  }

  private load(): void {
    this.requestState.load(
      () =>
        this.reports.getEmployeeReport(
          toReportIsoDate(this.fromDate()),
          toReportIsoDate(this.toDate()),
          this.branchId(),
        ),
      'No se pudo cargar el reporte de empleados.',
    );
  }
}
