import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SiteVisitService, SiteVisitResponseDto } from '../../core/services/site-visit.service';

import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-tenant-site-visits',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, ToastModule, TextareaModule],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="page-container">
      <div class="header">
        <h2>My Scheduled Site Visits</h2>
      </div>
      @if (loading()) {
        <p>Loading...</p>
      } @else {
        <div style="overflow-x: auto;">
        <p-table [value]="visits()" [paginator]="true" [rows]="10" styleClass="p-datatable-striped" [tableStyle]="{ 'min-width': '50rem' }">
          <ng-template pTemplate="header">
            <tr>
              <th>Property</th>
              <th>Visit Date & Time</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-visit>
            <tr>
              <td>
                <a [routerLink]="['/property', visit.propertyId]" style="text-decoration: none; font-weight: bold; color: var(--primary-color);">
                  {{ visit.property?.title }}
                </a>
              </td>
              <td>{{ visit.visitDate | date:'MMM d, y, h:mm a' }}</td>
              <td>
                <p-tag [value]="visit.statusName" [severity]="getSeverity(visit.statusId)"></p-tag>
              </td>
              <td>{{ visit.remarks || '-' }}</td>
              <td>
                @if (visit.statusId === 1 || visit.statusId === 2) {
                  <p-button icon="pi pi-times" styleClass="p-button-sm" severity="danger" [outlined]="true" [rounded]="true" label="Cancel" (onClick)="openCancelDialog(visit)"></p-button>
                } @else {
                  <span class="text-sm text-gray-500">-</span>
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" style="text-align: center;">No site visits scheduled.</td>
            </tr>
          </ng-template>
        </p-table>
        </div>
      }

      <p-dialog [(visible)]="dialogVisible" header="Cancel Site Visit" [modal]="true" [style]="{ width: '90vw', maxWidth: '400px' }">
        <div class="mt-3">
          <label for="remarks" style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Reason for Cancellation</label>
          <textarea id="remarks" pInputTextarea [(ngModel)]="cancelRemarks" rows="3" style="width: 100%; box-sizing: border-box; resize: vertical; border-radius: 6px;" placeholder="Please specify why you are cancelling..."></textarea>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Close" icon="pi pi-times" [text]="true" severity="secondary" (onClick)="dialogVisible = false"></p-button>
          <p-button label="Cancel Visit" icon="pi pi-check" severity="danger" (onClick)="submitCancel()" [disabled]="!cancelRemarks.trim()"></p-button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .header { margin-bottom: 2rem; }
    h2 { margin: 0; font-size: 1.8rem; }
  `]
})
export class TenantSiteVisitsComponent implements OnInit {
  private siteVisitService = inject(SiteVisitService);
  private messageService = inject(MessageService);
  
  visits = signal<SiteVisitResponseDto[]>([]);
  loading = signal(true);

  dialogVisible = false;
  selectedVisit: SiteVisitResponseDto | null = null;
  cancelRemarks = '';

  ngOnInit() {
    this.loadVisits();
  }

  loadVisits() {
    this.loading.set(true);
    this.siteVisitService.getMyRequests().subscribe({
      next: (data) => {
        this.visits.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openCancelDialog(visit: SiteVisitResponseDto) {
    this.selectedVisit = visit;
    this.cancelRemarks = '';
    this.dialogVisible = true;
  }

  submitCancel() {
    if (!this.selectedVisit) return;
    
    this.siteVisitService.cancelVisit(this.selectedVisit.id, this.cancelRemarks).subscribe({
      next: () => {
        this.dialogVisible = false;
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Site visit cancelled successfully.'});
        this.loadVisits();
      },
      error: (err) => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.detail || err.error?.message || 'Failed to cancel visit.'});
      }
    });
  }

  getSeverity(statusId: number): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    switch (statusId) {
      case 1: return 'warn'; // Pending
      case 2: return 'success'; // Approved
      case 3: return 'danger'; // Cancelled
      default: return 'info';
    }
  }
}
