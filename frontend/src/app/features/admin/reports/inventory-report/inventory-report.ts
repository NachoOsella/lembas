import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppReportFilterBar } from '@features/reports/ui/app-report-filter-bar/app-report-filter-bar';
import { AppReportGrid } from '@features/reports/ui/app-report-grid/app-report-grid';
import { AppReportPanel } from '@features/reports/ui/app-report-panel/app-report-panel';
import { DashboardStatCard } from '@features/dashboard/ui/dashboard-stat-card/dashboard-stat-card';
import { DashboardChart } from '@features/dashboard/ui/dashboard-chart/dashboard-chart';
import type { ExportData } from '@shared/components/data-export/data-export';
import { DataExport } from '@shared/components/data-export/data-export';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';

import { ReportsService } from '@features/reports/data-access/reports';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';
import type { DashboardStatCardDto } from '@features/dashboard/domain/dashboard';
import type {
  InventoryReportDto,
  ReportBreakdownDto,
  ReportKpiDto,
  ReportSeriesPointDto,
  ReportTopRowDto,
} from '@features/reports/domain/reports';

/**
 * Inventory report (Reportes / Inventario). Surfaces stock valuation,
 * rotation, low-stock and expiring-lot indicators.
 */
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
export class InventoryReportPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);

  protected readonly branchFilter = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly branchOptions = computed(() =>
    this.branches().map((b) => ({ label: b.name, value: b.id })),
  );

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<InventoryReportDto | null>(null);

  protected readonly hasData = computed(() => {
    const data = this.data();
    if (!data) {
      return false;
    }
    return data.kpis.length > 0 || data.stockByCategory.length > 0 || data.topByValue.length > 0;
  });

  /** Projects the backend KPIs into the shape the stat card expects. */
  protected readonly statCards = computed<DashboardStatCardDto[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return data.kpis.map((kpi: ReportKpiDto) => ({
      label: kpi.label,
      value: kpi.value,
      subtitle: kpi.subtitle ?? null,
      iconName: kpi.iconName,
      colorStyle: kpi.colorStyle,
      trend: kpi.trend ?? null,
      trendPercentage: kpi.trendPercentage ?? null,
    }));
  });

  /** Paginated client table definition for potentially long low-stock lists. */
  protected readonly lowStockColumns: ColumnDef[] = [
    { field: 'primary', header: 'Producto', sortable: true, width: '240px' },
    { field: 'secondary', header: 'Detalle', sortable: false, width: '280px' },
    { field: 'metric', header: 'Stock actual', sortable: true, width: '140px' },
    { field: 'submetric', header: 'Minimo', sortable: true, width: '120px' },
  ];

  /** Mutable view for the generic table, derived from the readonly API DTO. */
  protected readonly lowStockRows = computed(() => [...(this.data()?.lowStock ?? [])]);

  protected readonly stockLabels = computed(
    () => this.data()?.stockByCategory.map((c: ReportBreakdownDto) => c.label) ?? [],
  );
  protected readonly stockAmounts = computed(
    () => this.data()?.stockByCategory.map((c: ReportBreakdownDto) => c.amount) ?? [],
  );

  protected readonly expiringLabels = computed(
    () => this.data()?.expiringByMonth.map((p: ReportSeriesPointDto) => p.label) ?? [],
  );
  protected readonly expiringValues = computed(
    () => this.data()?.expiringByMonth.map((p: ReportSeriesPointDto) => p.value) ?? [],
  );
  protected readonly expiringUnits = computed(
    () =>
      this.data()?.expiringByMonth.map((p: ReportSeriesPointDto) => p.secondaryValue ?? 0) ?? [],
  );

  ngOnInit(): void {
    this.userService.listBranches().subscribe({
      next: (branches: Branch[]) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.load();
  }

  protected onBranchChange(value: number | null): void {
    this.branchFilter.set(value);
    this.load();
  }

  protected onRefresh(): void {
    this.load();
  }

  protected exportData(): ExportData {
    const report = this.data();
    return {
      filename: 'reporte_inventario_categorias',
      columns: [
        { key: 'branch', label: 'Sucursal' },
        { key: 'category', label: 'Categoria' },
        { key: 'value', label: 'Stock valorizado' },
        { key: 'units', label: 'Unidades' },
        { key: 'percentage', label: 'Participacion (%)' },
      ],
      rows: (report?.stockByCategory ?? []).map((category) => ({
        branch: report?.branchName ?? 'Todas',
        category: category.label,
        value: category.amount,
        units: category.count,
        percentage: category.percentage,
      })),
    };
  }

  protected topByValueExport(): ExportData {
    return {
      filename: 'inventario_top_valor',
      columns: [
        { key: 'primary', label: 'Producto' },
        { key: 'secondary', label: 'Categoria' },
        { key: 'metric', label: 'Valor' },
        { key: 'submetric', label: 'Stock' },
      ],
      rows: (this.data()?.topByValue ?? []).map((row: ReportTopRowDto) => ({
        primary: row.primary,
        secondary: row.secondary ?? '',
        metric: row.metric,
        submetric: row.submetric ?? '',
      })),
    };
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.reports.getInventoryReport(this.branchFilter()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
        if (!data) {
          this.errorMessage.set(
            'El reporte de inventario todavia no esta disponible. Intenta nuevamente en unos minutos.',
          );
        }
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el reporte de inventario.');
        this.loading.set(false);
      },
    });
  }
}
