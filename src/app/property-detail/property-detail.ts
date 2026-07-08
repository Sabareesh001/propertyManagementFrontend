import { Component, OnInit, OnChanges, Input, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { Store } from '@ngrx/store';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PropertyService, PropertyDetail } from '../core/services/property.service';
import { PropertyImage } from '../shared/property-card/property-card';
import { RentRequestModalComponent } from '../shared/rent-request-modal/rent-request-modal';
import { ScheduleVisitModalComponent } from '../shared/schedule-visit-modal/schedule-visit-modal';
import { UserResponse } from '../core/services/auth.service';
import { selectCurrentUser, selectIsLoggedIn } from '../store/auth/auth.selectors';

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
    ToastModule,
    RentRequestModalComponent,
    ScheduleVisitModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './property-detail.html',
  styleUrl: './property-detail.css',
})
export class PropertyDetailComponent implements OnInit, OnChanges {
  @Input() propertyId: number | null = null;
  @Input() embedded = false;
  @Input() showDeedButton = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private propertyService = inject(PropertyService);
  private store = inject(Store);
  private messageService = inject(MessageService);

  property = signal<PropertyDetail | null>(null);
  notFound = signal(false);
  loading = signal(true);
  deedUrl = signal<string | null>(null);
  rentModalVisible = signal(false);
  scheduleVisitModalVisible = signal(false);

  currentUser = toSignal(this.store.select(selectCurrentUser));

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

  get canSeeRemarks(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const isAdmin = user.roles?.some(r => r.id === 3) ?? false;
    const isOwner = user.id === this.property()?.ownerId;
    return isAdmin || isOwner;
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

  openRentModal(): void {
    let isLoggedIn = false;
    const userRef: { value: UserResponse | null } = { value: null };
    this.store.select(selectIsLoggedIn).subscribe(v => isLoggedIn = v).unsubscribe();
    this.store.select(selectCurrentUser).subscribe(v => userRef.value = v).unsubscribe();
    const user = userRef.value;

    if (!isLoggedIn) {
      this.router.navigate(['/auth/login']);
      return;
    }
    if (user && user.verificationStatusId !== 3) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Verification Required',
        detail: 'You must complete identity verification before submitting a rental proposal.',
        life: 5000,
      });
      return;
    }
    this.rentModalVisible.set(true);
  }

  onProposalSubmitted(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Proposal Submitted',
      detail: 'Your rental proposal has been sent to the owner.',
      life: 5000,
    });
  }

  openScheduleVisitModal(): void {
    let isLoggedIn = false;
    const userRef: { value: UserResponse | null } = { value: null };
    this.store.select(selectIsLoggedIn).subscribe(v => isLoggedIn = v).unsubscribe();
    this.store.select(selectCurrentUser).subscribe(v => userRef.value = v).unsubscribe();
    const user = userRef.value;

    if (!isLoggedIn) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Check if the current user is not the owner
    if (user && user.id === this.property()?.ownerId) {
       this.messageService.add({
         severity: 'info',
         summary: 'Action not allowed',
         detail: 'You cannot schedule a visit for your own property.',
         life: 5000,
       });
       return;
    }
    
    this.scheduleVisitModalVisible.set(true);
  }

  onVisitScheduled(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Visit Scheduled',
      detail: 'Your site visit request has been sent to the owner.',
      life: 5000,
    });
  }

  goBack(): void {
    this.location.back();
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
