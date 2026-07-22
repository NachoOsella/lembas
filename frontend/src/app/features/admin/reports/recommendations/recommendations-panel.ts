import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ErrorMappingService } from '@core/services/error-mapping';
import { AppBadge } from '@shared/components/app-badge/app-badge';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { DataExport } from '@shared/components/data-export/data-export';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';

import { RecommendationService } from '@features/reports/data-access/recommendation';
import { recommendationsExport } from '@features/reports/domain/report-export';
import {
  recommendationContext,
  recommendationTypeLabel,
  recommendationUrgencyLabel,
  recommendationUrgencyTone,
} from '@features/reports/public-api';
import type {
  RecommendationDto,
  RecommendationType,
  RecommendationUrgency,
} from '@features/reports/domain/recommendation';
import type { RecommendationBadgeTone } from '@features/reports/public-api';
import { ReportRequestState } from '@features/reports/public-api';
import { AppReportFilterBar } from '@features/reports/public-api';

interface FilterOption<T> {
  readonly label: string;
  readonly value: T | null;
}

/** Full recommendations page with page-scoped request state. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    LoadingSpinner,
  ],
  templateUrl: './recommendations-panel.html',
  styleUrl: './recommendations-panel.css',
})
export class RecommendationsPanelComponent implements OnInit, OnDestroy {
  private readonly recommendationService = inject(RecommendationService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly router = inject(Router);
  private readonly requestState = new ReportRequestState<RecommendationDto[]>();

  public readonly loading = this.requestState.loading;
  public readonly errorMessage = this.requestState.errorMessage;
  public readonly recommendations = computed(() => this.requestState.data() ?? []);
  public readonly typeFilter = signal<RecommendationType | null>(null);
  public readonly urgencyFilter = signal<RecommendationUrgency | null>(null);

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
    { label: 'Stock bajo', value: 'LOW_STOCK' },
    { label: 'Lotes por vencer', value: 'EXPIRING_SOON' },
    { label: 'Alta rotacion', value: 'HIGH_ROTATION' },
    { label: 'Sin movimiento', value: 'NO_MOVEMENT' },
  ];

  public readonly urgencyOptions: readonly FilterOption<RecommendationUrgency>[] = [
    { label: 'Todas las urgencias', value: null },
    { label: 'Alta', value: 'HIGH' },
    { label: 'Media', value: 'MEDIUM' },
    { label: 'Baja', value: 'LOW' },
  ];

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.requestState.destroy();
  }

  public onTypeChange(value: RecommendationType | null): void {
    this.typeFilter.set(value);
    this.load();
  }

  public onUrgencyChange(value: RecommendationUrgency | null): void {
    this.urgencyFilter.set(value);
    this.load();
  }

  public onClearFilters(): void {
    this.typeFilter.set(null);
    this.urgencyFilter.set(null);
    this.load();
  }

  public onRefresh(): void {
    this.requestState.retry();
  }

  public typeLabel(type: RecommendationType): string {
    return recommendationTypeLabel(type);
  }

  public urgencyLabel(urgency: RecommendationUrgency): string {
    return recommendationUrgencyLabel(urgency);
  }

  public urgencyTone(urgency: RecommendationUrgency): RecommendationBadgeTone {
    return recommendationUrgencyTone(urgency);
  }

  public context(recommendation: RecommendationDto): string {
    return recommendationContext(recommendation);
  }

  public openRecommendation(recommendation: RecommendationDto): void {
    if (/^https?:\/\//.test(recommendation.link)) {
      window.open(recommendation.link, '_blank', 'noopener,noreferrer');
      return;
    }
    void this.router.navigateByUrl(recommendation.link);
  }

  public exportData() {
    return recommendationsExport(this.recommendations());
  }

  private load(): void {
    this.requestState.load(
      () =>
        this.recommendationService.getRecommendations(
          null,
          this.urgencyFilter(),
          this.typeFilter(),
          null,
          null,
        ),
      this.errorMapping.getMessage('INTERNAL_ERROR'),
    );
  }
}
