import { Component, computed, input, model, output } from '@angular/core';
import { Paginator } from 'primeng/paginator';

@Component({
  selector: 'app-pagination',
  imports: [Paginator],
  templateUrl: './app-pagination.html',
  styleUrl: './app-pagination.css',
})
export class AppPagination {
  readonly totalRecords = input.required<number>();
  readonly rows = input(10);
  readonly first = model(0);
  readonly rowsPerPageOptions = input<number[]>([10, 25, 50]);
  readonly showCurrentPageReport = input(true);
  readonly currentPageReportTemplate = input('{first}-{last} de {totalRecords}');

  readonly pageChange = output<{
    first: number;
    rows: number;
    page?: number;
    pageCount?: number;
  }>();

  /** Unwrapped first value for PrimeNG paginator (plain number, not model). */
  protected readonly firstValue = computed(() => this.first());

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
}
