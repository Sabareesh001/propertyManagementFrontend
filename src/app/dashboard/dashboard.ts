import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { ScrollTop } from 'primeng/scrolltop';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { PropertyCardComponent } from '../shared/property-card/property-card';
import { PropertyService, PropertyDetail, PropertyFilters } from '../core/services/property.service';
import { CityService, City } from '../core/services/city.service';
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
    SelectModule,
    MultiSelectModule,
    InputNumberModule,
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
  private cityService = inject(CityService);
  public compareService = inject(CompareService);
  private router = inject(Router);

  private searchChanged$ = new Subject<string>();

  /** Bound to the input directly so typing feels instant; the debounced `searchQuery` drives the actual request. */
  searchInput = signal('');
  searchQuery = signal('');
  cityIds = signal<number[]>([]);
  rentMin = signal<number | null>(null);
  rentMax = signal<number | null>(null);
  availabilityStatusId = signal<number | null>(null);
  sortBy = signal<string | null>(null);

  cities = signal<City[]>([]);
  cityOptions = computed(() => this.cities().map((c) => ({ label: c.name, value: c.id })));

  availabilityOptions = [
    { label: 'All statuses', value: null },
    { label: 'Available', value: 1 },
    { label: 'Occupied', value: 2 },
    { label: 'Unavailable', value: 3 },
  ];

  sortOptions = [
    { label: 'Newest first', value: null },
    { label: 'Rent: Low to High', value: 'monthlyRent:1' },
    { label: 'Rent: High to Low', value: 'monthlyRent:-1' },
    { label: 'Upfront: Low to High', value: 'upfrontPayment:1' },
    { label: 'Upfront: High to Low', value: 'upfrontPayment:-1' },
    { label: 'Security Deposit: Low to High', value: 'securityDeposit:1' },
    { label: 'Security Deposit: High to Low', value: 'securityDeposit:-1' },
  ];

  properties = signal<PropertyDetail[]>([]);
  loading = signal(true);
  error = signal(false);
  pageNumber = signal(1);
  pageSize = signal(20);
  totalRecords = signal(0);

  hasActiveFilters = computed(
    () =>
      !!this.searchInput().trim() ||
      this.cityIds().length > 0 ||
      this.rentMin() !== null ||
      this.rentMax() !== null ||
      this.availabilityStatusId() !== null ||
      this.sortBy() !== null,
  );

  ngOnInit(): void {
    this.cityService.getAll().subscribe((cities) => this.cities.set(cities));

    this.searchChanged$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
      this.searchQuery.set(q);
      this.pageNumber.set(1);
      this.load();
    });

    this.load();
  }

  private currentFilters(): PropertyFilters {
    const [sortField, sortOrder] = this.sortBy()?.split(':') ?? [];
    return {
      search: this.searchQuery().trim() || null,
      cityIds: this.cityIds(),
      minRent: this.rentMin(),
      maxRent: this.rentMax(),
      availabilityStatusId: this.availabilityStatusId(),
      sortField: sortField ?? null,
      sortOrder: sortOrder != null ? Number(sortOrder) : null,
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.propertyService.getAll(this.pageNumber(), this.pageSize(), this.currentFilters()).subscribe({
      next: (res) => {
        this.properties.set(res.items);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    this.searchChanged$.next(value);
  }

  setCities(value: number[]): void {
    this.cityIds.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  setRentMin(value: number | null): void {
    this.rentMin.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  setRentMax(value: number | null): void {
    this.rentMax.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  setAvailability(value: number | null): void {
    this.availabilityStatusId.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  setSort(value: string | null): void {
    this.sortBy.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  resetFilters(): void {
    this.searchInput.set('');
    this.searchQuery.set('');
    this.cityIds.set([]);
    this.rentMin.set(null);
    this.rentMax.set(null);
    this.availabilityStatusId.set(null);
    this.sortBy.set(null);
    this.pageNumber.set(1);
    this.load();
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
