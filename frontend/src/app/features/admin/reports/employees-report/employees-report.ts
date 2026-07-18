import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ReportsService } from '../../../../core/services/reports';
import { UserService } from '../../../../core/services/user';
import { CurrencyArPipe } from '../../../../core/pipes/currency-ar.pipe';
import { Branch } from '../../../../shared/models/user';
import {
  EmployeePerformanceDto,
  EmployeeReportDto,
  ReportKpiDto,
} from '../../../../shared/models/reports';
import { DashboardStatCardDto } from '../../../../shared/models/dashboard';

import { AppButton } from '../../../../shared/components/app-button/app-button';
import {
  AppDataTable,
  ColumnDef,
} from '../../../../shared/components/app-data-table/app-data-table';
import { AppDatePicker } from '../../../../shared/components/app-date-picker/app-date-picker';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppReportFilterBar } from '../../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { AppReportGrid } from '../../../../shared/components/app-report-grid/app-report-grid';
import { AppReportPanel } from '../../../../shared/components/app-report-panel/app-report-panel';
import { DashboardChart } from '../../../../shared/components/dashboard-chart/dashboard-chart';
import { DashboardStatCard } from '../../../../shared/components/dashboard-stat-card/dashboard-stat-card';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';

/** Employee performance report based on attributable POS and cash activity. */
@Component({
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
export class EmployeesReportPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);

  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  protected readonly branchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<EmployeeReportDto | null>(null);

  protected readonly branchOptions = computed(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly rows = computed<EmployeePerformanceDto[]>(() => [
    ...(this.data()?.employees ?? []),
  ]);
  protected readonly hasData = computed(() => this.rows().length > 0);
  protected readonly employeeLabels = computed(() => this.rows().map((row) => row.employeeName));
  protected readonly revenueValues = computed(() => this.rows().map((row) => row.posRevenue));
  protected readonly salesValues = computed(() => this.rows().map((row) => row.posSalesCount));
  protected readonly differenceValues = computed(() =>
    this.rows().map((row) => row.cashDifferenceAbsolute),
  );
  protected readonly hasPerformanceData = computed(
    () =>
      this.revenueValues().some((value) => value > 0) ||
      this.salesValues().some((value) => value > 0),
  );
  protected readonly hasCashDifferenceData = computed(() =>
    this.differenceValues().some((value) => value > 0),
  );
  protected readonly totalRevenue = computed(() =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(this.revenueValues().reduce((total, value) => total + value, 0)),
  );
  protected readonly statCards = computed<DashboardStatCardDto[]>(() =>
    (this.data()?.kpis ?? []).map((kpi: ReportKpiDto) => ({
      label: kpi.label,
      value: kpi.value,
      subtitle: kpi.subtitle ?? null,
      iconName: kpi.iconName,
      colorStyle: kpi.colorStyle,
      trend: kpi.trend ?? null,
      trendPercentage: kpi.trendPercentage ?? null,
    })),
  );

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
    const now = new Date();
    this.fromDate.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate.set(now);
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.load();
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
    const now = new Date();
    this.fromDate.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate.set(now);
    this.branchId.set(null);
    this.load();
  }

  protected onRefresh(): void {
    this.load();
  }

  protected exportData(): ExportData {
    return {
      filename: 'reporte_operativo_empleados',
      columns: [
        { key: 'employee', label: 'Operador' },
        { key: 'role', label: 'Rol' },
        { key: 'posSales', label: 'Ventas POS' },
        { key: 'posRevenue', label: 'Facturacion POS' },
        { key: 'averageTicket', label: 'Ticket promedio' },
        { key: 'opened', label: 'Aperturas de caja' },
        { key: 'closed', label: 'Cierres de caja' },
        { key: 'difference', label: 'Desvios absolutos' },
      ],
      rows: this.rows().map((row) => ({
        employee: row.employeeName,
        role: roleLabel(row.role),
        posSales: row.posSalesCount,
        posRevenue: row.posRevenue,
        averageTicket: row.averageTicket,
        opened: row.cashSessionsOpened,
        closed: row.cashSessionsClosed,
        difference: row.cashDifferenceAbsolute,
      })),
    };
  }

  protected roleLabel(role: string): string {
    return roleLabel(role);
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.reports
      .getEmployeeReport(toIsoDate(this.fromDate()), toIsoDate(this.toDate()), this.branchId())
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
          if (!data) {
            this.errorMessage.set('El reporte de empleados todavia no esta disponible.');
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el reporte de empleados.');
          this.loading.set(false);
        },
      });
  }
}

function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function roleLabel(role: string): string {
  return { ADMIN: 'Administrador', MANAGER: 'Gerente', EMPLOYEE: 'Empleado' }[role] ?? role;
}
