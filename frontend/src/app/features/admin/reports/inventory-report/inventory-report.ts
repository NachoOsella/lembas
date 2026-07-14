import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppReportFilterBar } from '../../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { AppReportSectionHead } from '../../../../shared/components/app-report-section-head/app-report-section-head';
import { DashboardStatCard } from '../../../../shared/components/dashboard-stat-card/dashboard-stat-card';
import { DashboardChart } from '../../../../shared/components/dashboard-chart/dashboard-chart';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

import { ReportsService } from '../../../../core/services/reports';
import { UserService } from '../../../../core/services/user';
import { Branch } from '../../../../shared/models/user';
import { DashboardStatCardDto } from '../../../../shared/models/dashboard';
import {
  InventoryReportDto,
  ReportBreakdownDto,
  ReportKpiDto,
  ReportSeriesPointDto,
  ReportTopRowDto,
} from '../../../../shared/models/reports';

/**
 * Inventory report (Reportes / Inventario). Surfaces stock valuation,
 * rotation, low-stock and expiring-lot indicators.
 */
@Component({
  selector: 'app-inventory-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppToast,
    AppSelect,
    AppReportFilterBar,
    AppReportSectionHead,
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
    return (
      data.kpis.length > 0 ||
      data.stockByCategory.length > 0 ||
      data.topByValue.length > 0
    );
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

  protected readonly stockLabels = computed(() =>
    this.data()?.stockByCategory.map((c: ReportBreakdownDto) => c.label) ?? [],
  );
  protected readonly stockAmounts = computed(() =>
    this.data()?.stockByCategory.map((c: ReportBreakdownDto) => c.amount) ?? [],
  );

  protected readonly expiringLabels = computed(() =>
    this.data()?.expiringByMonth.map((p: ReportSeriesPointDto) => p.label) ?? [],
  );
  protected readonly expiringValues = computed(() =>
    this.data()?.expiringByMonth.map((p: ReportSeriesPointDto) => p.value) ?? [],
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
    const kpis = this.data()?.kpis ?? [];
    return {
      filename: 'reporte_inventario',
      columns: [
        { key: 'kpi', label: 'Indicador' },
        { key: 'value', label: 'Valor' },
        { key: 'subtitle', label: 'Detalle' },
      ],
      rows: kpis.map((kpi: ReportKpiDto) => ({
        kpi: kpi.label,
        value: kpi.value,
        subtitle: kpi.subtitle ?? '',
      })),
    };
  }

  protected topByValueExport(): ExportData {
    return {
      filename: 'inventario_top_valor',
      columns: [
        { key: 'primary', label: 'Producto' },
        { key: 'secondary', label: 'Categoria' },
        { key: 'metric', label: 'Stock' },
        { key: 'submetric', label: 'Valor' },
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
