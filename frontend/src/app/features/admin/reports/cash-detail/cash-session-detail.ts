import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import {
  AppDataTable,
  ColumnDef,
} from '../../../../shared/components/app-data-table/app-data-table';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { DashboardChart } from '../../../../shared/components/dashboard-chart/dashboard-chart';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

import { CurrencyArPipe } from '../../../../core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '../../../../core/pipes/short-date-ar.pipe';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { CashReportService } from '../../../../core/services/cash-report';
import { CashReportDto } from '../../../../shared/models/cash-report';
import { CashSessionStatus } from '../../../../shared/models/cash-session';

/** Cash session detail report (S4-US05). */
@Component({
  selector: 'app-cash-session-detail-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppBadge,
    AppDataTable,
    AppToast,
    DataExport,
    DashboardChart,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    CurrencyArPipe,
    ShortDateArPipe,
    NgClass,
  ],
  templateUrl: './cash-session-detail.html',
  styleUrl: './cash-session-detail.css',
})
export class CashSessionDetailReportPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cashReportService = inject(CashReportService);
  private readonly errorMapping = inject(ErrorMappingService);

  /** Page state. */
  public readonly loading = signal(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly report = signal<CashReportDto | null>(null);

  /** Computed chart data for the payment-method breakdown. */
  protected readonly methodLabels = computed(() => {
    const data = this.report();
    if (!data) {
      return [];
    }
    return Object.entries(data.totalsByMethod?.paymentsByMethod ?? {}).map(([key]) =>
      this.methodLabel(key),
    );
  });

  protected readonly methodAmounts = computed(() => {
    const data = this.report();
    if (!data) {
      return [];
    }
    return Object.values(data.totalsByMethod?.paymentsByMethod ?? {}).map((v) => Number(v));
  });

  protected readonly manualMovements = computed(() => this.report()?.manualMovements ?? []);

  protected readonly entries = computed(() => this.report()?.entries ?? []);

  /** Table columns for the manual movements. */
  protected readonly movementColumns: ColumnDef[] = [
    { field: 'type', header: 'Tipo', sortable: false, width: '90px' },
    { field: 'method', header: 'Metodo', sortable: false, width: '110px' },
    { field: 'amount', header: 'Monto', sortable: false, width: '140px' },
    { field: 'reason', header: 'Motivo', sortable: false },
    { field: 'createdByUserName', header: 'Operador', sortable: false, width: '180px' },
    { field: 'createdAt', header: 'Hora', sortable: false, width: '170px' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de sesion invalido.');
      return;
    }
    this.load(id);
  }

  protected goBack(): void {
    void this.router.navigate(['/admin/cash/history']);
  }

  public statusLabel(status: CashSessionStatus): string {
    return status === 'OPEN' ? 'Sesion abierta' : 'Sesion cerrada';
  }

  public statusTone(status: CashSessionStatus): 'success' | 'neutral' {
    return status === 'OPEN' ? 'success' : 'neutral';
  }

  public statusIcon(status: CashSessionStatus): string {
    return status === 'OPEN' ? 'pi pi-check-circle' : 'pi pi-lock';
  }

  /** Returns a CSS class for the cash difference cell. */
  public differenceClass(value: string | null | undefined): string {
    if (!value) {
      return 'cash-detail__cell--neutral';
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) {
      return 'cash-detail__cell--neutral';
    }
    return num > 0 ? 'cash-detail__cell--positive' : 'cash-detail__cell--negative';
  }

  /** True when the difference is a non-negative number (or zero). */
  protected isDifferenceNonNegative(value: string | null | undefined): boolean {
    if (!value) {
      return true;
    }
    const num = Number(value);
    return Number.isFinite(num) && num >= 0;
  }

  /** True when the difference is strictly negative. */
  protected isDifferenceNegative(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }
    const num = Number(value);
    return Number.isFinite(num) && num < 0;
  }

  /** Builds the CSV export payload for the full session report. */
  public exportData(): ExportData {
    const data = this.report();
    if (!data) {
      return { filename: 'reporte_cierre_caja', columns: [], rows: [] };
    }
    return {
      filename: `reporte_cierre_caja_${data.sessionId}`,
      columns: [
        { key: 'label', label: 'Concepto' },
        { key: 'value', label: 'Valor' },
      ],
      rows: [
        { label: 'Sucursal', value: data.branchName },
        { label: 'Abrio', value: data.openedByUserName ?? '—' },
        {
          label: 'Apertura',
          value: data.openedAt ? new Date(data.openedAt).toLocaleString('es-AR') : '—',
        },
        {
          label: 'Cerro',
          value: data.closedByUserName ?? '—',
        },
        {
          label: 'Cierre',
          value: data.closedAt ? new Date(data.closedAt).toLocaleString('es-AR') : '—',
        },
        { label: 'Estado', value: this.statusLabel(data.status) },
        { label: 'Monto apertura', value: data.openingCashAmount },
        { label: 'Esperado', value: data.expectedCashAmount ?? '—' },
        { label: 'Contado', value: data.countedCashAmount ?? '—' },
        { label: 'Diferencia', value: data.cashDifferenceAmount ?? '—' },
        { label: 'Motivo diferencia', value: data.cashDifferenceReason ?? '—' },
        { label: 'Transacciones', value: String(data.totalTransactions) },
        { label: 'Pedidos POS', value: String(data.posOrdersCount) },
        { label: 'Total POS', value: data.totalPosRevenue },
      ],
    };
  }

  private methodLabel(key: string): string {
    return (
      {
        CASH: 'Efectivo',
        QR: 'QR',
        TRANSFER: 'Transferencia',
        DEBIT_CARD: 'Debito',
        CREDIT_CARD: 'Credito',
        CHECKOUT_PRO: 'Mercado Pago',
        OTHER: 'Otros',
      }[key] ?? key
    );
  }

  private load(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashReportService.getCashReport(id).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const code = extractApiCode(err);
        this.errorMessage.set(
          this.errorMapping.getMessage(code ?? 'INTERNAL_ERROR', extractMessage(err) ?? undefined),
        );
      },
    });
  }
}

function extractApiCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  const e = err as { error?: { code?: string } | null };
  return e.error?.code ?? null;
}

function extractMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  const e = err as { error?: { message?: string } | null; message?: string };
  return e.error?.message ?? e.message ?? null;
}
