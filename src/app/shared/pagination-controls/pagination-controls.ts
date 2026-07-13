import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Paginator, PaginatorState } from 'primeng/paginator';

/** Emitted when the user changes page or page size — 1-based to match the backend's pageNumber contract. */
export interface PageEvent {
  pageNumber: number;
  pageSize: number;
}

/**
 * Thin wrapper around PrimeNG's p-paginator that speaks the backend's 1-based
 * pageNumber/pageSize contract instead of PrimeNG's 0-based first/rows, so
 * every list view driven by a PagedResultDto<T> can share one component.
 */
@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [Paginator],
  template: `
    @if (totalRecords > pageSize) {
      <p-paginator
        [rows]="pageSize"
        [totalRecords]="totalRecords"
        [first]="(pageNumber - 1) * pageSize"
        [rowsPerPageOptions]="rowsPerPageOptions"
        (onPageChange)="handlePageChange($event)"
      />
    }
  `,
})
export class PaginationControlsComponent {
  @Input({ required: true }) totalRecords = 0;
  @Input() pageNumber = 1;
  @Input() pageSize = 20;
  @Input() rowsPerPageOptions: number[] = [10, 20, 50, 100];

  @Output() pageChange = new EventEmitter<PageEvent>();

  handlePageChange(event: PaginatorState): void {
    const pageSize = event.rows ?? this.pageSize;
    const page = event.page ?? 0;
    this.pageChange.emit({ pageNumber: page + 1, pageSize });
  }
}
