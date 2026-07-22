import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ErrorMappingService } from '@core/services/error-mapping';
import { AppButton } from '@shared/components/app-button/app-button';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppToast } from '@shared/components/app-toast/app-toast';

import { RecommendationService } from '@features/reports/data-access/recommendation';
import type { RecommendationDto } from '@features/reports/domain/recommendation';
import { ReportRequestState } from '@features/reports/public-api';

interface ReportCard {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  readonly status: 'available' | 'soon';
  /** Visual accent for the card top stripe. */
  readonly accent: 'leaf' | 'forest' | 'orange' | 'amber' | 'sage' | 'blue';
  /** Short tag shown above the title (e.g. "Diario", "Mensual"). */
  readonly cadence: string;
}

/**
 * Reports hub page (S4-US04 + S4-US05 navigation entry point).
 *
 * <p>Replaces the previous stub and surfaces the operational dashboard,
 * cash history plus the three new specific reports (sales, inventory,
 * suppliers). The specific report pages are intentionally NOT in the
 * sidebar nav: they are deep-linked sections that live behind this hub
 * so the navigation stays focused on the main admin views.</p>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reports',
  imports: [AppButton, AppPageHeader, AppToast, ErrorAlert, LoadingSpinner, RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly recommendationService = inject(RecommendationService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly requestState = new ReportRequestState<RecommendationDto[]>();

  public readonly highPriorityCount = computed(
    () =>
      this.requestState.data()?.filter((recommendation) => recommendation.urgency === 'HIGH')
        .length ?? 0,
  );
  protected readonly loading = this.requestState.loading;
  protected readonly errorMessage = this.requestState.errorMessage;

  public readonly cards: readonly ReportCard[] = [
    {
      title: 'Dashboard operativo',
      description: 'Resumen diario de ventas, stock y alertas en una sola vista.',
      icon: 'pi pi-chart-pie',
      route: '/admin/dashboard',
      status: 'available',
      accent: 'leaf',
      cadence: 'Diario',
    },
    {
      title: 'Reporte de cierres de caja',
      description: 'Conciliacion, diferencias, medios de pago y evolucion diaria de los cierres.',
      icon: 'pi pi-wallet',
      route: '/admin/reports/cash',
      status: 'available',
      accent: 'forest',
      cadence: 'Por periodo',
    },
    {
      title: 'Reporte de ventas',
      description: 'Facturacion, ticket promedio, medios de pago y productos mas vendidos.',
      icon: 'pi pi-chart-line',
      route: '/admin/reports/sales',
      status: 'available',
      accent: 'orange',
      cadence: 'Por periodo',
    },
    {
      title: 'Reporte de empleados',
      description: 'Ventas POS y actividad de caja atribuible a cada operador.',
      icon: 'pi pi-users',
      route: '/admin/reports/employees',
      status: 'available',
      accent: 'blue',
      cadence: 'Por periodo',
    },
    {
      title: 'Reporte de inventario',
      description: 'Stock valorizado, rotacion, cobertura y lotes por vencer.',
      icon: 'pi pi-warehouse',
      route: '/admin/reports/inventory',
      status: 'available',
      accent: 'sage',
      cadence: 'Al instante',
    },
    {
      title: 'Reporte de proveedores',
      description: 'Compras, lead time y desempeno de proveedores.',
      icon: 'pi pi-truck',
      route: '/admin/reports/suppliers',
      status: 'available',
      accent: 'amber',
      cadence: 'Por periodo',
    },
  ];

  /** Total number of report cards rendered by the reports hub. */
  protected readonly totalCount = computed(() => this.cards.length);

  ngOnInit(): void {
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.requestState.destroy();
  }

  protected onRefresh(): void {
    this.requestState.retry();
  }

  protected goTo(route: string): void {
    if (!route) {
      return;
    }
    void this.router.navigateByUrl(route);
  }

  private loadRecommendations(): void {
    this.requestState.load(
      () => this.recommendationService.getDashboardPanel(),
      this.errorMapping.getMessage('INTERNAL_ERROR'),
    );
  }
}
