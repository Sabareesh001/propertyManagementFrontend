import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

export interface PropertyImage {
  id: string;
  imageUrl: string;
  description: string | null;
  displayOrder: number;
}

export interface Property {
  id: number;
  ownerId: string;
  title: string;
  description: string | null;
  addressLine: string;
  cityId: number | null;
  monthlyRent: number;
  upfrontPayment: number;
  securityDeposit: number;
  thumbnailImgUrl: string | null;
  verificationStatusId: number | null;
  availabilityStatusId: number | null;
  createdAt: string | null;
  propertyImages: PropertyImage[];
  remarks?: string | null;
}

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './property-card.html',
  styleUrl: './property-card.css',
})
export class PropertyCardComponent {
  private router = inject(Router);

  @Input({ required: true }) property!: Property;

  /** Show the "Listed on" date in the stats row */
  @Input() showListedOn = false;
  /** Show the delete icon button */
  @Input() showDeleteAction = false;
  /** Show the edit icon button (only renders when property is editable) */
  @Input() showEditAction = false;
  /** Show the "Submit for Review" button (only renders when property is in draft/rejected) */
  @Input() showSubmitAction = false;
  /** Whether clicking the card navigates to the property detail page */
  @Input() clickable = true;
  /** Show the Draft verification chip (hidden by default for tenant/browse views) */
  @Input() showDraftStatus = false;

  @Output() editRequested = new EventEmitter<Property>();
  @Output() deleteRequested = new EventEmitter<Property>();
  @Output() submitRequested = new EventEmitter<Property>();

  get hasActions(): boolean {
    return this.showDeleteAction || this.showEditAction || this.showSubmitAction;
  }

  get canEdit(): boolean {
    const s = this.property.verificationStatusId;
    return s === 1 || s === 4;
  }

  get canSubmit(): boolean {
    const s = this.property.verificationStatusId;
    return s === 1 || s === 4;
  }

  handleCardClick(): void {
    if (this.clickable) {
      this.router.navigate(['/property', this.property.id]);
    }
  }

  get availabilityClass(): string {
    switch (this.property.availabilityStatusId) {
      case 1: return 'avail-available';
      case 2: return 'avail-occupied';
      case 3: return 'avail-unavailable';
      default: return 'avail-unknown';
    }
  }

  get availabilityLabel(): string {
    switch (this.property.availabilityStatusId) {
      case 1: return 'Available';
      case 2: return 'Occupied';
      case 3: return 'Unavailable';
      default: return 'Unknown';
    }
  }

  get showVerificationChip(): boolean {
    const id = this.property.verificationStatusId;
    if (id === null || id === undefined) return false;
    if (id === 1) return this.showDraftStatus;
    return true;
  }

  get verificationLabel(): string {
    switch (this.property.verificationStatusId) {
      case 1: return 'Draft';
      case 2: return 'Pending';
      case 3: return 'Verified';
      case 4: return 'Rejected';
      default: return '';
    }
  }

  get verificationIcon(): string {
    switch (this.property.verificationStatusId) {
      case 1: return 'pi pi-file-edit';
      case 2: return 'pi pi-clock';
      case 3: return 'pi pi-verified';
      case 4: return 'pi pi-times-circle';
      default: return '';
    }
  }

  get verifyChipClass(): string {
    switch (this.property.verificationStatusId) {
      case 1: return 'chip-draft';
      case 2: return 'chip-pending';
      case 3: return 'chip-verified';
      case 4: return 'chip-rejected';
      default: return '';
    }
  }

  get showRejectionBanner(): boolean {
    return this.property.verificationStatusId === 4 &&
      !!this.property.remarks;
  }

  get thumbnailUrl(): string {
    if (this.property.thumbnailImgUrl) return this.property.thumbnailImgUrl;
    const first = this.property.propertyImages?.[0];
    return first?.imageUrl ?? '';
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
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }
}
