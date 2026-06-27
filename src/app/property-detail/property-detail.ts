import { Component, OnInit, OnChanges, Input, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { PropertyService, PropertyDetail } from '../core/services/property.service';
import { PropertyImage } from '../shared/property-card/property-card';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CarouselModule,
    ButtonModule,
    DividerModule,
    TagModule,
    SkeletonModule,
  ],
  templateUrl: './property-detail.html',
  styleUrl: './property-detail.css',
})
export class PropertyDetailComponent implements OnInit, OnChanges {
  @Input() propertyId: number | null = null;
  @Input() embedded = false;
  @Input() showDeedButton = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private propertyService = inject(PropertyService);

  property = signal<PropertyDetail | null>(null);
  notFound = signal(false);
  loading = signal(true);
  deedUrl = signal<string | null>(null);

  get images(): PropertyImage[] {
    const p = this.property();
    if (!p) return [];
    const sorted = [...(p.propertyImages ?? [])].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    if (sorted.length === 0 && p.thumbnailImgUrl) {
      return [{ id: 'thumb', imageUrl: p.thumbnailImgUrl, description: null, displayOrder: 0 }];
    }
    return sorted;
  }

  get availabilityLabel(): string {
    switch (this.property()?.availabilityStatusId) {
      case 1: return 'Available';
      case 2: return 'Occupied';
      case 3: return 'Unavailable';
      default: return 'Unknown';
    }
  }

  get availabilityClass(): string {
    switch (this.property()?.availabilityStatusId) {
      case 1: return 'badge-available';
      case 2: return 'badge-occupied';
      case 3: return 'badge-unavailable';
      default: return 'badge-unknown';
    }
  }

  get verificationLabel(): string {
    switch (this.property()?.verificationStatusId) {
      case 2: return 'Pending Review';
      case 3: return 'Verified';
      case 4: return 'Rejected';
      default: return '';
    }
  }

  get verificationClass(): string {
    switch (this.property()?.verificationStatusId) {
      case 2: return 'badge-pending';
      case 3: return 'badge-verified';
      case 4: return 'badge-rejected';
      default: return '';
    }
  }

  get verificationIcon(): string {
    switch (this.property()?.verificationStatusId) {
      case 2: return 'pi pi-clock';
      case 3: return 'pi pi-verified';
      case 4: return 'pi pi-times-circle';
      default: return '';
    }
  }

  get showVerification(): boolean {
    const id = this.property()?.verificationStatusId;
    return id !== null && id !== undefined && id !== 1;
  }

  get isAvailable(): boolean {
    return this.property()?.availabilityStatusId === 1;
  }

  ngOnInit(): void {
    this.loadProperty();
  }

  ngOnChanges(): void {
    if (this.propertyId !== null) {
      this.loadProperty();
    }
  }

  private loadProperty(): void {
    const id = this.propertyId ?? (() => {
      const param = this.route.snapshot.paramMap.get('id');
      return param ? parseInt(param, 10) : NaN;
    })();
    if (isNaN(id as number)) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.notFound.set(false);
    this.deedUrl.set(null);
    this.propertyService.getById(id as number).subscribe({
      next: (found) => {
        this.property.set(found);
        this.loading.set(false);
        if (this.showDeedButton) {
          this.propertyService.getDocuments(id as number).subscribe({
            next: (docs) => {
              const deed = docs.find((d) => d.documentTypeId === 2 && d.documentUrl);
              this.deedUrl.set(deed?.documentUrl ?? null);
            },
          });
        }
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  openDeed(): void {
    const url = this.deedUrl();
    if (url) window.open(url, '_blank', 'noopener');
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  }
}
