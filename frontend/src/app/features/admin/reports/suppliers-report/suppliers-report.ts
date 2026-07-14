import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { AppDatePicker } from '../../../../shared/components/app-date-picker/app-date-picker';
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
  ReportKpiDto,
  ReportSeriesPointDto,
  ReportTopRowDto,
  SuppliersReportDto,
} from '../../../../shared/models/reports';

/**
 * Suppliers report (Reportes / Proveedores). Surfaces purchases over
 * time, top suppliers by volume and a lead-time table.
 */
@Component({
  selector: 'app-suppliers-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppToast,
    AppDatePicker,
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
  templateUrl: './suppliers-report.html',
  styleUrl: './suppliers-report.css',
})
export class SuppliersReportPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly userService = inject(UserService);

  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  protected readonly branchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly branchOptions = computed(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<SuppliersReportDto | null>(null);

  protected readonly hasData = computed(() => {
    const data = this.data();
    if (!data) {
      return false;
    }
    return (
      data.purchasesByMonth.some((point) => point.value > 0 || (point.secondaryValue ?? 0) > 0) ||
      data.topByVolume.length > 0 ||
      data.leadTimeBySupplier.length > 0
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

  protected readonly purchaseLabels = computed(() =>
    this.data()?.purchasesByMonth.map((p: ReportSeriesPointDto) => p.label) ?? [],
  );
  protected readonly purchaseValues = computed(() =>
    this.data()?.purchasesByMonth.map((p: ReportSeriesPointDto) => p.value) ?? [],
  );
  protected readonly purchaseOrders = computed(() =>
    this.data()?.purchasesByMonth.map((p: ReportSeriesPointDto) => p.secondaryValue ?? 0) ?? [],
  );

  ngOnInit(): void {
    // Default to the trailing 90 days.
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 89);
    this.fromDate.set(from);
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
    const from = new Date(now);
    from.setDate(from.getDate() - 89);
    this.fromDate.set(from);
    this.toDate.set(now);
    this.branchId.set(null);
    this.load();
  }

  protected onRefresh(): void {
    this.load();
  }

  protected exportData(): ExportData {
    const report = this.data();
    return {
      filename: 'reporte_proveedores_recepciones',
      columns: [
        { key: 'month', label: 'Mes' },
        { key: 'branch', label: 'Sucursal' },
        { key: 'amount', label: 'Costo recibido' },
        { key: 'receipts', label: 'Recepciones' },
      ],
      rows: (report?.purchasesByMonth ?? []).map((point) => ({
        month: point.date,
        branch: report?.branchName ?? 'Todas',
        amount: point.value,
        receipts: point.secondaryValue ?? 0,
      })),
    };
  }

  protected topSuppliersExport(): ExportData {
    return {
      filename: 'proveedores_por_volumen',
      columns: [
        { key: 'supplier', label: 'Proveedor' },
        { key: 'amount', label: 'Costo recibido' },
        { key: 'receipts', label: 'Recepciones' },
      ],
      rows: (this.data()?.topByVolume ?? []).map((row) => ({
        supplier: row.primary,
        amount: row.metric,
        receipts: row.submetric ?? '',
      })),
    };
  }

  protected leadTimeExport(): ExportData {
    return {
      filename: 'proveedores_lead_time',
      columns: [
        { key: 'primary', label: 'Proveedor' },
        { key: 'secondary', label: 'Categoria' },
        { key: 'metric', label: 'Lead time' },
        { key: 'submetric', label: 'Ordenes' },
      ],
      rows: (this.data()?.leadTimeBySupplier ?? []).map((row: ReportTopRowDto) => ({
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
    this.reports
      .getSuppliersReport(toIsoDate(this.fromDate()), toIsoDate(this.toDate()), this.branchId())
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
          if (!data) {
            this.errorMessage.set(
              'El reporte de proveedores todavia no esta disponible. Intenta nuevamente en unos minutos.',
            );
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el reporte de proveedores.');
          this.loading.set(false);
        },
      });
  }
}

function toIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
