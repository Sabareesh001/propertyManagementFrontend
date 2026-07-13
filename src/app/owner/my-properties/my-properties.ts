import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PropertyCardComponent } from '../../shared/property-card/property-card';
import { Property, PropertyService, PropertyDetail } from '../../core/services/property.service';
import { extractApiError } from '../../core/api.config';

interface FilterOption {
  label: string;
  value: number | null;
}

@Component({
  selector: 'app-my-properties',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    SelectButtonModule,
    ProgressSpinnerModule,
    PropertyCardComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './my-properties.html',
  styleUrl: './my-properties.css',
})
export class MyPropertiesComponent implements OnInit {
  private propertyService = inject(PropertyService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  properties = signal<PropertyDetail[]>([]);
  loading = signal(true);
  error = signal(false);
  verificationFilter: number | null = null;

  verificationFilterOptions: FilterOption[] = [
    { label: 'All', value: null },
    { label: 'Draft', value: 1 },
    { label: 'Pending', value: 2 },
    { label: 'Verified', value: 3 },
    { label: 'Rejected', value: 4 },
  ];

  get filteredProperties(): PropertyDetail[] {
    const all = this.properties();
    if (this.verificationFilter === null) return all;
    return all.filter((p) => p.verificationStatusId === this.verificationFilter);
  }

  get stats() {
    const all = this.properties();
    return {
      total: all.length,
      verified: all.filter((p) => p.verificationStatusId === 3).length,
      available: all.filter((p) => p.availabilityStatusId === 1).length,
      pending: all.filter((p) => p.verificationStatusId === 2).length,
    };
  }

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.loading.set(true);
    this.error.set(false);
    // Owner's own properties — pageSize 100 keeps the whole list in view without a visible pager.
    this.propertyService.getMyProperties(1, 100).subscribe({
      next: (res) => {
        this.properties.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  addProperty(): void {
    this.router.navigate(['/owner/properties/new']);
  }

  editProperty(property: Property): void {
    this.router.navigate(['/owner/properties', property.id, 'edit']);
  }

  confirmDelete(property: Property): void {
    this.confirmationService.confirm({
      message: `Delete "<strong>${property.title}</strong>"? This cannot be undone.`,
      header: 'Delete Property',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.propertyService.delete(property.id).subscribe({
          next: () => {
            this.loadProperties();
            this.messageService.add({ severity: 'info', summary: 'Property deleted', life: 3000 });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Delete failed',
              detail: extractApiError(err),
              life: 4000,
            });
          },
        });
      },
    });
  }

  submitForVerification(property: Property): void {
    this.confirmationService.confirm({
      message: `Submit "<strong>${property.title}</strong>" for admin review? You won't be able to edit it while it's under review.`,
      header: 'Submit for Review',
      icon: 'pi pi-send',
      acceptLabel: 'Submit',
      rejectLabel: 'Cancel',
      accept: () => {
        this.propertyService.submitForVerification(property.id).subscribe({
          next: () => {
            this.loadProperties();
            this.messageService.add({ severity: 'success', summary: 'Submitted for review', life: 3000 });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Submission failed',
              detail: extractApiError(err),
              life: 4000,
            });
          },
        });
      },
    });
  }
}
