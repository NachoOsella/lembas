import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import {
  AppDataTable,
  ColumnDef,
} from '../../../../shared/components/app-data-table/app-data-table';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { AppReportFilterBar } from '../../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';

import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { RecommendationService } from '../../../../core/services/recommendation';
import {
  RecommendationDto,
  RecommendationType,
  RecommendationUrgency,
} from '../../../../shared/models/recommendation';

interface FilterOption<T> {
  readonly label: string;
  readonly value: T | null;
}

type RecommendationBadgeTone = 'danger' | 'warning' | 'info';

const TYPE_LABELS: Record<RecommendationType, string> = {
  LOW_STOCK: 'Stock bajo',
  EXPIRING_SOON: 'Lotes por vencer',
  HIGH_ROTATION: 'Alta rotacion',
  NO_MOVEMENT: 'Sin movimiento',
};

const URGENCY_LABELS: Record<RecommendationUrgency, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

const URGENCY_TONES: Record<RecommendationUrgency, RecommendationBadgeTone> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

/** Full recommendations page with automatic initial loading and table-based results. */
@Component({
  selector: 'app-recommendations-panel',
  imports: [
    AppPageHeader,
    AppBadge,
    AppButton,
    AppDataTable,
    AppSelect,
    AppToast,
    AppReportFilterBar,
    DataExport,
    ErrorAlert,
  ],
  templateUrl: './recommendations-panel.html',
  styleUrl: './recommendations-panel.css',
})
export class RecommendationsPanelComponent implements OnInit, OnDestroy {
  private readonly recommendationService = inject(RecommendationService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly router = inject(Router);

  public readonly loading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly recommendations = signal<RecommendationDto[]>([]);
  public readonly typeFilter = signal<RecommendationType | null>(null);
  public readonly urgencyFilter = signal<RecommendationUrgency | null>(null);

  private loadSubscription: Subscription | null = null;

  public readonly columns: ColumnDef[] = [
    { field: 'type', header: 'Alerta', sortable: false, width: '150px' },
    { field: 'urgency', header: 'Urgencia', sortable: false, width: '120px' },
    { field: 'productName', header: 'Producto', sortable: false, width: '220px' },
    { field: 'description', header: 'Detalle', sortable: false, width: '300px' },
    { field: 'context', header: 'Datos', sortable: false, width: '160px' },
    { field: 'actions', header: 'Accion', sortable: false, width: '150px' },
  ];

  public readonly typeOptions: readonly FilterOption<RecommendationType>[] = [
    { label: 'Todos los tipos', value: null },
    { label: TYPE_LABELS.LOW_STOCK, value: 'LOW_STOCK' },
    { label: TYPE_LABELS.EXPIRING_SOON, value: 'EXPIRING_SOON' },
    { label: TYPE_LABELS.HIGH_ROTATION, value: 'HIGH_ROTATION' },
    { label: TYPE_LABELS.NO_MOVEMENT, value: 'NO_MOVEMENT' },
  ];

  public readonly urgencyOptions: readonly FilterOption<RecommendationUrgency>[] = [
    { label: 'Todas las urgencias', value: null },
    { label: URGENCY_LABELS.HIGH, value: 'HIGH' },
    { label: URGENCY_LABELS.MEDIUM, value: 'MEDIUM' },
    { label: URGENCY_LABELS.LOW, value: 'LOW' },
  ];

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  protected onTypeChange(value: RecommendationType | null): void {
    this.typeFilter.set(value);
    this.load();
  }

  protected onUrgencyChange(value: RecommendationUrgency | null): void {
    this.urgencyFilter.set(value);
    this.load();
  }

  protected onClearFilters(): void {
    this.typeFilter.set(null);
    this.urgencyFilter.set(null);
    this.load();
  }

  protected onRefresh(): void {
    this.load();
  }

  protected typeLabel(type: RecommendationType): string {
    return TYPE_LABELS[type];
  }

  protected urgencyLabel(urgency: RecommendationUrgency): string {
    return URGENCY_LABELS[urgency];
  }

  protected urgencyTone(urgency: RecommendationUrgency): RecommendationBadgeTone {
    return URGENCY_TONES[urgency];
  }

  /** Returns the most useful rule-specific detail without duplicating table columns. */
  protected context(rec: RecommendationDto): string {
    if (rec.currentStock != null && rec.minimumStock != null) {
      return `Stock: ${rec.currentStock} / minimo: ${rec.minimumStock}`;
    }
    if (rec.expirationDate) {
      return `Vence: ${new Intl.DateTimeFormat('es-AR').format(new Date(rec.expirationDate))}`;
    }
    if (rec.last7DaysSales != null) {
      return `Ventas ultimos 7 dias: ${rec.last7DaysSales}`;
    }
    if (rec.daysWithoutSales != null) {
      return `Sin ventas: ${rec.daysWithoutSales} dias`;
    }
    return 'Sin datos adicionales';
  }

  protected openRecommendation(rec: RecommendationDto): void {
    if (/^https?:\/\//.test(rec.link)) {
      window.open(rec.link, '_blank', 'noopener,noreferrer');
      return;
    }
    void this.router.navigateByUrl(rec.link);
  }

  protected exportData(): ExportData {
    return {
      filename: 'recomendaciones',
      columns: [
        { key: 'type', label: 'Tipo' },
        { key: 'urgency', label: 'Urgencia' },
        { key: 'productName', label: 'Producto' },
        { key: 'description', label: 'Detalle' },
        { key: 'context', label: 'Datos' },
        { key: 'actionLabel', label: 'Accion' },
      ],
      rows: this.recommendations().map((rec) => ({
        type: this.typeLabel(rec.type),
        urgency: this.urgencyLabel(rec.urgency),
        productName: rec.productName,
        description: rec.description,
        context: this.context(rec),
        actionLabel: rec.actionLabel,
      })),
    };
  }

  private load(): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.loadSubscription = this.recommendationService
      .getRecommendations(null, this.urgencyFilter(), this.typeFilter(), null, null)
      .subscribe({
        next: (recommendations) => {
          this.recommendations.set(recommendations);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(
            this.errorMapping.getMessage(
              extractApiCode(err) ?? 'INTERNAL_ERROR',
              extractMessage(err) ?? undefined,
            ),
          );
        },
      });
  }
}

function extractApiCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  return (err as { error?: { code?: string } | null }).error?.code ?? null;
}

function extractMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  const candidate = err as { error?: { message?: string } | null; message?: string };
  return candidate.error?.message ?? candidate.message ?? null;
}
