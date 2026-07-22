import {
  Component,
  computed,
  effect,
  input,
  PLATFORM_ID,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UIChart } from 'primeng/chart';

import { Skeleton } from '@shared/components/skeleton/skeleton';
import { EmptyState } from '@shared/components/empty-state/empty-state';

/**
 * One slice of a bar or doughnut chart. The label is shown in tooltips and
 * the legend, the {@code value} is the raw numeric input (the component
 * normalises percentages, formats currencies and orders slices itself).
 */
export interface ChartSlice {
  readonly label: string;
  readonly value: number;
  /** Optional hex / CSS color override; otherwise the theme palette is used. */
  readonly color?: string;
}

interface ChartDatasetView {
  readonly data: number[];
  readonly label?: string;
  readonly yAxisID?: string;
  readonly [option: string]: unknown;
}

interface ChartDataView {
  readonly labels: string[];
  readonly datasets: ChartDatasetView[];
}

interface ChartOptionsView {
  readonly scales: {
    readonly x: { readonly stacked: boolean; readonly [option: string]: unknown };
    readonly [axis: string]: object;
  };
  readonly [option: string]: unknown;
}

/**
 * Lightweight chart wrapper using PrimeNG Chart (Chart.js) for the dashboard
 * and cash detail report.
 *
 * <p>Uses PrimeNG's p-chart component which provides built-in interactivity,
 * tooltips, legends, and responsive behavior out of the box.</p>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-chart',
  imports: [Skeleton, EmptyState, UIChart],
  templateUrl: './dashboard-chart.html',
  styleUrl: './dashboard-chart.css',
})
export class DashboardChart {
  readonly title = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);
  readonly type = input<'bar' | 'doughnut'>('bar');
  readonly labels = input.required<string[]>();
  readonly data = input.required<number[]>();
  /** Optional secondary bar series. */
  readonly secondaryData = input<number[] | null>(null);
  readonly primaryLabel = input('Valor');
  readonly secondaryLabel = input('Comparacion');
  readonly stacked = input(false);
  readonly secondaryAxis = input(false);
  readonly secondaryCurrency = input(false);
  /** Optional per-bar colors. When omitted the Lembas palette is used. */
  readonly colors = input<string[] | null>(null);
  readonly loading = input(false);
  readonly empty = input(false);
  readonly emptyMessage = input('Sin datos para mostrar.');
  readonly height = input<string>('280px');
  readonly currency = input(false);
  readonly centerLabel = input<string | null>(null);
  readonly centerSubLabel = input<string | null>(null);

  private readonly platformId = inject(PLATFORM_ID);

  /** Chart.js configuration consumed by PrimeNG's chart wrapper. */
  readonly chartData = signal<ChartDataView>({ labels: [], datasets: [] });
  readonly chartOptions = signal<ChartOptionsView>({ scales: { x: { stacked: false } } });

  /** Primary Lembas palette: Leaf Green first, Forest Green second, then warm accents. */
  private readonly palette = ['#2f8d72', '#f29d52', '#075f36', '#d7eadf', '#d9822b', '#e7dbc0'];

  constructor() {
    // Rebuild chart config when inputs change
    effect(() => {
      const type = this.type();
      const labels = this.labels();
      const data = this.data();
      const secondaryData = this.secondaryData();
      const colors = this.colors();
      const primaryLabel = this.primaryLabel();
      const secondaryLabel = this.secondaryLabel();
      const stacked = this.stacked();
      const secondaryAxis = this.secondaryAxis();
      const secondaryCurrency = this.secondaryCurrency();

      // Only build chart in browser (Chart.js requires DOM)
      if (isPlatformBrowser(this.platformId)) {
        this.buildChart(
          type,
          labels,
          data,
          secondaryData,
          colors,
          primaryLabel,
          secondaryLabel,
          stacked,
          secondaryAxis,
          secondaryCurrency,
        );
      }
    });
  }

  private buildChart(
    type: string,
    labels: string[],
    data: number[],
    secondaryData: number[] | null,
    colors: string[] | null,
    primaryLabel: string,
    secondaryLabel: string,
    stacked: boolean,
    secondaryAxis: boolean,
    secondaryCurrency: boolean,
  ): void {
    if (type === 'bar') {
      this.buildBarChart(
        labels,
        data,
        secondaryData,
        colors,
        primaryLabel,
        secondaryLabel,
        stacked,
        secondaryAxis,
        secondaryCurrency,
      );
    } else {
      this.buildDoughnutChart(labels, data, colors);
    }
  }

  private buildBarChart(
    labels: string[],
    data: number[],
    secondaryData: number[] | null,
    colors: string[] | null,
    primaryLabel: string,
    secondaryLabel: string,
    stacked: boolean,
    secondaryAxis: boolean,
    secondaryCurrency: boolean,
  ): void {
    const hourLabels = labels.map((label) => (/^\d{1,2}$/.test(label) ? `${label}h` : label));
    const datasets: ChartDatasetView[] = [
      {
        label: primaryLabel,
        data,
        yAxisID: 'y',
        backgroundColor: colors
          ? data.map((_, index) => colors[index % colors.length])
          : this.palette[0],
        borderColor: colors
          ? data.map((_, index) => colors[index % colors.length])
          : this.palette[0],
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ];

    if (secondaryData && secondaryData.length > 0) {
      datasets.push({
        label: secondaryLabel,
        data: secondaryData,
        yAxisID: secondaryAxis ? 'y1' : 'y',
        backgroundColor: this.palette[4],
        borderColor: this.palette[4],
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      });
    }

    this.chartData.set({ labels: hourLabels, datasets });
    this.chartOptions.set({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: Boolean(secondaryData?.length),
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: 'Plus Jakarta Sans, system-ui, sans-serif', size: 12, weight: '600' },
            color: 'rgba(0, 0, 0, 0.58)',
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(36, 58, 49, 0.95)',
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (context: {
              parsed: { y: number };
              datasetIndex: number;
              dataset: { label?: string };
            }) => {
              const value = context.parsed.y;
              const usesCurrency = context.datasetIndex === 0 ? this.currency() : secondaryCurrency;
              const formatted = usesCurrency
                ? new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    maximumFractionDigits: 0,
                  }).format(value)
                : value.toLocaleString('es-AR');
              return `${context.dataset.label ?? ''}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked,
          grid: { display: false },
          border: { display: false },
          ticks: { color: 'rgba(0, 0, 0, 0.45)' },
        },
        y: {
          stacked,
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.04)' },
          border: { display: false },
          ticks: {
            color: 'rgba(0, 0, 0, 0.45)',
            callback: (value: string | number) =>
              this.currency()
                ? new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    maximumFractionDigits: 0,
                  }).format(Number(value))
                : Number(value).toLocaleString('es-AR'),
          },
        },
        ...(secondaryAxis
          ? {
              y1: {
                beginAtZero: true,
                position: 'right',
                grid: { drawOnChartArea: false },
                border: { display: false },
                ticks: { color: 'rgba(0, 0, 0, 0.45)' },
              },
            }
          : {}),
      },
      animation: { duration: 600, easing: 'easeOutQuart' },
    });
  }

  private buildDoughnutChart(labels: string[], data: number[], colors: string[] | null): void {
    const backgroundColors = colors || this.palette.slice(0, data.length);

    this.chartData.set({
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        },
      ],
    });

    this.chartOptions.set({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          display: false, // We use custom legend in template
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(36, 58, 49, 0.95)',
          titleFont: {
            family: 'Plus Jakarta Sans, system-ui, sans-serif',
            size: 13,
            weight: '700',
          },
          bodyFont: {
            family: 'Plus Jakarta Sans, system-ui, sans-serif',
            size: 12,
            weight: '500',
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            label: (context: { parsed: number; dataset: { data: number[] } }) => {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              if (this.currency()) {
                return `$${value.toLocaleString('es-AR')} (${percentage}%)`;
              }
              return `${value.toLocaleString('es-AR')} (${percentage}%)`;
            },
          },
        },
      },
      scales: { x: { stacked: false } },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 800,
        easing: 'easeOutQuart',
      },
    });
  }

  /** Returns a human-readable value for the legend. */
  protected formatValue(value: number): string {
    if (this.currency()) {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('es-AR').format(value);
  }

  /** Compute legend items for doughnut chart */
  readonly legendItems = computed(() => {
    const labels = this.labels();
    const data = this.data();
    const colors = this.colors() || this.palette;
    const total = data.reduce((sum, v) => sum + v, 0);

    return labels.map((label, i) => ({
      label,
      value: data[i],
      color: colors[i % colors.length],
      percentage: total > 0 ? ((data[i] / total) * 100).toFixed(1) : '0',
    }));
  });
}
