import { Component, input, model, output, TemplateRef, contentChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Skeleton } from 'primeng/skeleton';
import { EmptyState } from '../empty-state/empty-state';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

export interface ColumnDef {
  readonly field: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly width?: string;
}

/**
 * Lembas-styled data table wrapper over PrimeNG Table.
 * Provides consistent loading, empty, and error states with Lembas design tokens.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, TableModule, EmptyState, LoadingSpinner],
  templateUrl: './app-data-table.html',
  styleUrl: './app-data-table.css',
})
export class AppDataTable<T = unknown> {
  readonly data = input.required<T[]>();
  readonly columns = input.required<ColumnDef[]>();
  readonly loading = input(false);
  readonly sortable = input(true);
  readonly paginated = input(false);
  readonly lazy = input(false);
  readonly totalRecords = input<number | null>(null);
  readonly rows = input(10);
  readonly first = model(0);
  readonly rowsPerPageOptions = input<number[]>([10, 20, 50]);
  readonly emptyTitle = input('No hay resultados');
  readonly emptyDescription = input('Todavia no hay informacion para mostrar.');
  readonly emptyActionLabel = input<string | null>(null);

  readonly rowClick = output<T>();
  readonly pageChange = output<{ first: number; rows: number; page?: number; pageCount?: number }>();
  readonly emptyAction = output<void>();

  protected readonly bodyTemplate = contentChild<TemplateRef<unknown>>('body');
  protected readonly toolbarTemplate = contentChild<TemplateRef<unknown>>('toolbar');

  protected onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  protected onPageChange(event: {
    first?: number;
    rows?: number;
    page?: number;
    pageCount?: number;
  }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rows();
    this.first.set(first);
    this.pageChange.emit({ first, rows, page: event.page, pageCount: event.pageCount });
  }

  protected onEmptyAction(): void {
    this.emptyAction.emit();
  }
}
