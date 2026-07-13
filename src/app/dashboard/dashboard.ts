import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ScrollTop } from 'primeng/scrolltop';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { PropertyCardComponent } from '../shared/property-card/property-card';
import { PropertyService, PropertyDetail } from '../core/services/property.service';
import { CompareService } from '../core/services/compare.service';
import { Router } from '@angular/router';
import { PaginationControlsComponent, PageEvent } from '../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    PropertyCardComponent,
    FormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ScrollTop,
    ProgressSpinnerModule,
    ButtonModule,
    PaginationControlsComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private propertyService = inject(PropertyService);
  public compareService = inject(CompareService);
  private router = inject(Router);

  searchQuery = signal('');
  allProperties = signal<PropertyDetail[]>([]);
  loading = signal(true);
  error = signal(false);
  pageNumber = signal(1);
  pageSize = signal(20);
  totalRecords = signal(0);

  filteredProperties = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.allProperties();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.addressLine.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.propertyService.getAll(this.pageNumber(), this.pageSize()).subscribe({
      next: (res) => {
        this.allProperties.set(res.items);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  goToCompare(): void {
    this.router.navigate(['/compare']);
  }
  onPageChange(event: PageEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.load();
  }
}
