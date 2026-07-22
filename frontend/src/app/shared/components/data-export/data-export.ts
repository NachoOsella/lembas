import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';

import { MessageService } from 'primeng/api';

import { AppButton } from '../app-button/app-button';

/**
 * Describes one column in a CSV export: a {@code key} matching the field on
 * the row object and a {@code label} used as the CSV header.
 */
export interface ExportColumn {
  readonly key: string;
  readonly label: string;
}

/**
 * Input payload for the data-export service. The component does not
 * download the CSV on its own: the parent provides the data and the column
 * definition; the user clicks the button to trigger the browser download.
 */
export interface ExportData {
  readonly filename: string;
  readonly columns: ExportColumn[];
  readonly rows: ReadonlyArray<Record<string, unknown>>;
}

/**
 * Pure-TS CSV export with a PrimeNG button wrapper. Adds the UTF-8 BOM so
 * Excel opens the file in the AR locale without mojibake, escapes commas,
 * quotes and newlines per RFC 4180, and produces a stable
 * {@code <filename>_<yyyy-MM-dd>.csv} download.
 *
 * <p>The component does not depend on Chart.js or any other charting
 * library, so it is safe to drop into any reporting flow.</p>
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-data-export',
  imports: [AppButton],
  template: `
    <app-button
      [variant]="'ghost'"
      [size]="'sm'"
      [icon]="'pi pi-download'"
      [disabled]="!canExport()"
      [ariaLabel]="'Exportar a CSV'"
      (click)="triggerExport()"
    >
      Exportar CSV
    </app-button>
  `,
})
export class DataExport {
  private readonly messageService = inject(MessageService);

  readonly data = input.required<ExportData>();
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('ghost');
  readonly size = input<'sm' | 'md' | 'lg'>('sm');

  /** True when there is at least one row to export. */
  protected readonly canExport = computed(() => this.data().rows.length > 0);

  /** Triggers the download and surfaces a toast on success or error. */
  protected triggerExport(): void {
    if (!this.canExport()) {
      return;
    }
    try {
      const csv = buildCsv(this.data());
      const filename = `${sanitize(this.data().filename)}_${todayIso()}.csv`;
      downloadCsv(csv, filename);
      this.messageService.add({
        severity: 'success',
        summary: 'Exportacion completa',
        detail: `Se descargaron ${this.data().rows.length} filas como ${filename}.`,
        life: 3500,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo exportar',
        detail: error instanceof Error ? error.message : 'Error desconocido.',
        life: 4000,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helpers — exported so the rest of the FE (tests included) can build
// CSV strings without going through the component.
// ---------------------------------------------------------------------------

/** Escapes a single field per RFC 4180. */
export function escapeCsv(value: string): string {
  if (value == null) {
    return '';
  }
  const needsQuoting = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

/** Returns the current local date in ISO format (yyyy-MM-dd). */
export function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Removes characters that are not safe in a filename. */
export function sanitize(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

/**
 * Builds the full CSV content (with UTF-8 BOM) from the input payload.
 * Each row is mapped to its column order; null/undefined values render as
 * empty cells.
 */
export function buildCsv(data: ExportData): string {
  const BOM = '\uFEFF';
  const header = data.columns.map((c) => escapeCsv(c.label)).join(',');
  const rows = data.rows.map((row) =>
    data.columns
      .map((col) => escapeCsv(row[col.key] == null ? '' : String(row[col.key])))
      .join(','),
  );
  return BOM + [header, ...rows].join('\n');
}

/** Triggers a browser download for the given CSV string. */
export function downloadCsv(content: string, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('CSV download requires a browser environment.');
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
