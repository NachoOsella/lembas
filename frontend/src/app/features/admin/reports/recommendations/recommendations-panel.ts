import { Component, OnDestroy, OnInit, computed, inject, model, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppPagination } from '../../../../shared/components/app-pagination/app-pagination';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { AppReportFilterBar } from '../../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { RecommendationCard } from '../../../../shared/components/recommendation-card/recommendation-card';

import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { RecommendationService } from '../../../../core/services/recommendation';
import {
  RecommendationDto,
  RecommendationType,
  RecommendationUrgency,
} from '../../../../shared/models/recommendation';

interface TypeFilterOption {
  readonly label: string;
  readonly value: RecommendationType | null;
}

interface UrgencyFilterOption {
  readonly label: string;
  readonly value: RecommendationUrgency | null;
}

interface RecommendationGroup {
  readonly type: RecommendationType;
  readonly label: string;
  /** Total items of this type in the full dataset. */
  readonly count: number;
  /** Items visible on the current page. */
  readonly items: RecommendationDto[];
}

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

const URGENCY_RANK: Record<RecommendationUrgency, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/** Full recommendations page (S4-US06) with client-side pagination. */
@Component({
  selector: 'app-recommendations-panel',
  imports: [
    AppPageHeader,
    AppButton,
    AppPagination,
    AppSelect,
    AppToast,
    AppReportFilterBar,
    DataExport,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    RecommendationCard,
  ],
  templateUrl: './recommendations-panel.html',
  styleUrl: './recommendations-panel.css',
})
export class RecommendationsPanelComponent implements OnInit, OnDestroy {
  private readonly recommendationService = inject(RecommendationService);
  private readonly errorMapping = inject(ErrorMappingService);

  public readonly loading = signal(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly recommendations = signal<RecommendationDto[]>([]);
  public readonly typeFilter = signal<RecommendationType | null>(null);
  public readonly urgencyFilter = signal<RecommendationUrgency | null>(null);

  /** Paginator state: index of the first visible item. */
  public readonly first = model(0);

  /** Page size (10 items per page, default from app-pagination). */
  protected readonly pageSize = 10;

  private loadSubscription: Subscription | null = null;

  /** All items sorted by urgency then name (same as backend order). */
  private readonly sortedItems = computed(() => {
    const all = this.recommendations();
    const types: RecommendationType[] = [
      'LOW_STOCK',
      'EXPIRING_SOON',
      'HIGH_ROTATION',
      'NO_MOVEMENT',
    ];
    const result: RecommendationDto[] = [];
    for (const type of types) {
      const typed = all
        .filter((rec) => rec.type === type)
        .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
      result.push(...typed);
    }
    return result;
  });

  /** Flat item count (for the paginator). */
  protected readonly flatItems = computed(() => this.sortedItems());

  /** Total pages. */
  protected readonly totalPages = computed(() => {
    const total = this.sortedItems().length;
    return total === 0 ? 1 : Math.ceil(total / this.pageSize);
  });

  /** Groups for the *current* page only. */
  protected readonly pagedGroups = computed<RecommendationGroup[]>(() => {
    const all = this.sortedItems();
    const page = Math.floor(this.first() / this.pageSize);
    const first = page * this.pageSize;
    const pageItems = all.slice(first, first + this.pageSize);

    const types: RecommendationType[] = [
      'LOW_STOCK',
      'EXPIRING_SOON',
      'HIGH_ROTATION',
      'NO_MOVEMENT',
    ];

    // Count totals per type for the full dataset.
    const totalCounts = new Map<RecommendationType, number>();
    for (const rec of all) {
      totalCounts.set(rec.type, (totalCounts.get(rec.type) ?? 0) + 1);
    }

    const groups: RecommendationGroup[] = [];
    for (const type of types) {
      const items = pageItems.filter((rec) => rec.type === type);
      if (items.length === 0) {
        continue;
      }
      groups.push({
        type,
        label: TYPE_LABELS[type],
        count: totalCounts.get(type) ?? 0,
        items,
      });
    }
    return groups;
  });

  public readonly typeOptions: readonly TypeFilterOption[] = [
    { label: 'Todos los tipos', value: null },
    { label: TYPE_LABELS.LOW_STOCK, value: 'LOW_STOCK' },
    { label: TYPE_LABELS.EXPIRING_SOON, value: 'EXPIRING_SOON' },
    { label: TYPE_LABELS.HIGH_ROTATION, value: 'HIGH_ROTATION' },
    { label: TYPE_LABELS.NO_MOVEMENT, value: 'NO_MOVEMENT' },
  ];

  public readonly urgencyOptions: readonly UrgencyFilterOption[] = [
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
    this.first.set(0);
    this.load();
  }

  protected onUrgencyChange(value: RecommendationUrgency | null): void {
    this.urgencyFilter.set(value);
    this.first.set(0);
    this.load();
  }

  protected onClearFilters(): void {
    this.typeFilter.set(null);
    this.urgencyFilter.set(null);
    this.first.set(0);
    this.load();
  }

  protected onRefresh(): void {
    this.first.set(0);
    this.load();
  }

  protected onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
  }

  protected exportData(): ExportData {
    return {
      filename: 'recomendaciones',
      columns: [
        { key: 'type', label: 'Tipo' },
        { key: 'urgency', label: 'Urgencia' },
        { key: 'productName', label: 'Producto' },
        { key: 'description', label: 'Detalle' },
        { key: 'actionLabel', label: 'Accion' },
        { key: 'link', label: 'Link' },
      ],
      rows: this.recommendations().map((rec) => ({
        type: TYPE_LABELS[rec.type],
        urgency: URGENCY_LABELS[rec.urgency],
        productName: rec.productName,
        description: rec.description,
        actionLabel: rec.actionLabel,
        link: rec.link,
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
        next: (recs) => {
          this.recommendations.set(recs);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const code = extractApiCode(err);
          this.errorMessage.set(
            this.errorMapping.getMessage(
              code ?? 'INTERNAL_ERROR',
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
  const e = err as { error?: { code?: string } | null };
  return e.error?.code ?? null;
}

function extractMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  const e = err as {
    error?: { message?: string } | null;
    message?: string;
  };
  return e.error?.message ?? e.message ?? null;
}
